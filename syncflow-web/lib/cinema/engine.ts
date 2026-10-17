import type { CoreHandle, DebugSettings, EngineHost, EngineInput } from './core';
import type { FromWorker, ToWorker, WorkerStats } from './protocol';
import { cinemaState, reportCinemaOff } from './state';

/**
 * The cinema engine's page side (docs/adr/0014-cinematic-layer.md, docs/adr/0021 §2): it creates the fixed full-viewport canvas on <body>,
 * decides where the engine runs and keeps it informed.
 *
 * It is a separate chunk that components/cinema/CinemaStage.tsx imports only after the first paint, only on a desktop with a fine pointer,
 * no reduced-motion preference and no data saver. The picture itself is drawn by lib/cinema/core.ts, which runs
 *   - in a Web Worker on an OffscreenCanvas when the browser can (the default): creating the WebGL context, compiling the raymarching shader
 *     and drawing all stay off the main thread. In a headless desktop run `getContext` alone blocked the main thread for 14 to 146 ms and the
 *     compile queries for up to 224 ms; that is what kept Lighthouse's desktop score below 100 whenever the layer ran;
 *   - on the main thread otherwise (no OffscreenCanvas, no WebGL2 in workers, a worker that cannot start, `?cinema-worker=off`).
 * Either way it never throws into the page: every failure ends with `null`/`destroy()` and the CSS fallback stays.
 */
export type CinemaHandle = { destroy: () => void; glitch: (ms?: number, strength?: number) => void };

type DebugState = Partial<typeof cinemaState> & DebugSettings;
type DebugHook = { set: (patch: DebugState) => void; snap: () => void; stats: () => WorkerStats | null };

/** How long the worker gets to show its first frame before the page gives up on it and uses the main thread. */
const WORKER_START_TIMEOUT_MS = 25000;

/** The canvas size in device pixels: the pixel ratio is capped, the engine is soft by design. */
function viewportSize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
  return { width: Math.max(2, Math.round(window.innerWidth * dpr)), height: Math.max(2, Math.round(window.innerHeight * dpr)) };
}

function createCanvas(host: HTMLElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.className = 'cinema-canvas';
  // Pure decoration: out of the accessibility tree (and so out of axe's "content outside landmarks"), the page's meaning is in its text.
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);
  return canvas;
}

function queryFlag(name: string): string | null {
  return new URLSearchParams(window.location.search).get(name);
}

function installDebug(hook: DebugHook) {
  // Test and still-frame hook, only with ?cinema-debug in the address (used to render the fallback posters and in the tests).
  if (new URLSearchParams(window.location.search).has('cinema-debug')) (window as unknown as { __cinema: DebugHook }).__cinema = hook;
}

// ── main thread ─────────────────────────────────────────────────────────────────────────────────

async function startOnMainThread(host: HTMLElement): Promise<CinemaHandle | null> {
  // The core (and the shader text) is its own chunk, fetched only on this path: with the worker it is the worker's chunk that carries it.
  const { runEngine } = await import('./core');
  const canvas = createCanvas(host);
  const pointer = { x: 0.62, y: 0.55 };
  // The shared targets are read directly; scroll position and visibility are read when a frame asks.
  const input: EngineInput = {
    state: cinemaState,
    pointer,
    get scrollY() {
      return window.scrollY;
    },
    get hidden() {
      return document.hidden;
    },
  };
  let core: CoreHandle | null = null;

  const onPointer = (e: PointerEvent) => {
    pointer.x = e.clientX / window.innerWidth;
    pointer.y = 1 - e.clientY / window.innerHeight;
  };
  const onResize = () => core?.resize();
  const onGlitch = (e: Event) => {
    const detail = (e as CustomEvent<{ ms?: number; strength?: number }>).detail;
    core?.glitch(detail?.ms, detail?.strength);
  };
  const detach = () => {
    window.removeEventListener('pointermove', onPointer);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('cinema:glitch', onGlitch);
    canvas.remove();
  };

  const engineHost: EngineHost = {
    input,
    requestFrame: (callback) => requestAnimationFrame(callback),
    cancelFrame: (id) => cancelAnimationFrame(id),
    viewport: viewportSize,
    // The marker lives on the canvas, not on <html>: React resets <html>'s attributes when the language changes. CSS reads it with
    // :has() (body:has(> .cinema-canvas[data-live])).
    onLive: () => {
      canvas.dataset.live = '1';
    },
    // The canvas is gone, so the film's posters (and the CSS light) take over: tell the film to fetch them.
    onRetire: () => {
      detach();
      reportCinemaOff();
    },
  };

  core = await runEngine(canvas, engineHost);
  if (!core) {
    detach();
    return null;
  }
  const running = core;
  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('resize', onResize);
  window.addEventListener('cinema:glitch', onGlitch);
  installDebug({
    set: ({ time, grain, freeze, ...targets }) => {
      Object.assign(cinemaState, targets);
      running.debug({ time, grain, freeze });
    },
    snap: () => running.snap(),
    stats: () => running.stats(),
  });
  return { destroy: running.destroy, glitch: running.glitch };
}

// ── worker ──────────────────────────────────────────────────────────────────────────────────────

const canRunInWorker = () =>
  queryFlag('cinema-worker') !== 'off' && typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && 'transferControlToOffscreen' in HTMLCanvasElement.prototype;

/** Resolves with the handle once the worker's first frame is on the canvas, or `null` when the worker could not run the engine. */
function startInWorker(host: HTMLElement): Promise<CinemaHandle | null> {
  return new Promise((resolve) => {
    const canvas = createCanvas(host);
    let worker: Worker;
    try {
      worker = new Worker(new URL('./worker.ts', import.meta.url), { name: 'cinema' });
    } catch {
      canvas.remove();
      resolve(null);
      return;
    }
    let settled = false;
    let frame = 0;
    let stats: WorkerStats | null = null;
    // What the worker was last told, to send only changes: a quiet page costs nothing.
    const sent = new Float64Array(8).fill(NaN);
    const send = (message: ToWorker, transfer?: Transferable[]) => worker.postMessage(message, transfer ?? []);

    const flush = () => {
      const s = cinemaState;
      const y = window.scrollY;
      if (s.scene === sent[0] && s.amb === sent[1] && s.local === sent[2] && s.gain === sent[3] && s.heroGain === sent[4] && pointer.x === sent[5] && pointer.y === sent[6] && y === sent[7]) return;
      sent.set([s.scene, s.amb, s.local, s.gain, s.heroGain, pointer.x, pointer.y, y]);
      send({ type: 'input', state: { scene: s.scene, amb: s.amb, local: s.local, gain: s.gain, heroGain: s.heroGain }, pointer: { x: pointer.x, y: pointer.y }, scrollY: y });
    };
    const tick = () => {
      frame = requestAnimationFrame(tick);
      flush();
    };
    const pointer = { x: 0.62, y: 0.55 };
    const onPointer = (e: PointerEvent) => {
      pointer.x = e.clientX / window.innerWidth;
      pointer.y = 1 - e.clientY / window.innerHeight;
    };
    const onResize = () => send({ type: 'size', ...viewportSize() });
    const onVisibility = () => send({ type: 'hidden', hidden: document.hidden });
    const onGlitch = (e: Event) => {
      const detail = (e as CustomEvent<{ ms?: number; strength?: number }>).detail;
      send({ type: 'glitch', ms: detail?.ms, strength: detail?.strength });
    };
    const detach = () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('cinema:glitch', onGlitch);
      document.removeEventListener('visibilitychange', onVisibility);
      worker.terminate();
      canvas.remove();
    };
    const fail = () => {
      if (settled) return;
      settled = true;
      detach();
      resolve(null);
    };
    // Live and then too slow, the context lost or the worker crashed: same as the main-thread engine's destroy().
    const retire = () => {
      if (!settled) return fail();
      detach();
      reportCinemaOff();
    };
    const timer = window.setTimeout(fail, WORKER_START_TIMEOUT_MS);

    worker.onmessage = (event: MessageEvent<FromWorker>) => {
      const message = event.data;
      if (message.type === 'stats') stats = message.stats;
      else if (message.type === 'live' && !settled) {
        settled = true;
        window.clearTimeout(timer);
        canvas.dataset.live = '1';
        if (queryFlag('cinema-debug') !== null) (window as unknown as { __cinemaWorker: boolean }).__cinemaWorker = true;
        resolve({
          destroy: () => send({ type: 'stop' }),
          glitch: (ms, strength) => send({ type: 'glitch', ms, strength }),
        });
      } else if (message.type === 'failed') fail();
      else if (message.type === 'retire') retire();
    };
    worker.onerror = retire;
    worker.onmessageerror = retire;

    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('cinema:glitch', onGlitch);
    document.addEventListener('visibilitychange', onVisibility);

    installDebug({
      set: ({ time, grain, freeze, ...targets }) => {
        Object.assign(cinemaState, targets);
        flush();
        send({ type: 'debug', settings: { time, grain, freeze } });
      },
      snap: () => {
        flush();
        send({ type: 'snap' });
      },
      stats: () => stats,
    });

    let offscreen: OffscreenCanvas;
    try {
      offscreen = canvas.transferControlToOffscreen();
    } catch {
      fail();
      return;
    }
    const s = cinemaState;
    const size = viewportSize();
    send(
      {
        type: 'init',
        canvas: offscreen,
        input: { state: { scene: s.scene, amb: s.amb, local: s.local, gain: s.gain, heroGain: s.heroGain }, pointer: { x: pointer.x, y: pointer.y }, scrollY: window.scrollY },
        hidden: document.hidden,
        width: size.width,
        height: size.height,
        debug: queryFlag('cinema-debug') !== null,
      },
      [offscreen],
    );
    frame = requestAnimationFrame(tick);
  });
}

export async function startCinema(host: HTMLElement): Promise<CinemaHandle | null> {
  if (canRunInWorker()) {
    const handle = await startInWorker(host);
    if (handle) return handle;
    // The worker could not run the engine (and has been cleaned up, canvas included): the same engine on the main thread.
  }
  return startOnMainThread(host);
}
