import { runEngine, type CoreHandle, type EngineHost, type EngineInput } from './core';
import type { FromWorker, ToWorker } from './protocol';

/**
 * The cinema engine's worker (docs/adr/0021 §2): the same core (lib/cinema/core.ts) as the main-thread engine, driven by messages instead of the
 * window. The WebGL context, the shader compile and every draw call live here, so none of it can block the page's main thread.
 * Any trouble before the first frame is reported as `failed` and the page falls back to the main-thread engine.
 */
type Scope = {
  postMessage: (message: FromWorker) => void;
  addEventListener: (type: 'message', listener: (event: MessageEvent<ToWorker>) => void) => void;
  requestAnimationFrame?: (callback: (now: number) => void) => number;
  cancelAnimationFrame?: (id: number) => void;
};

const scope = self as unknown as Scope;
const post = (message: FromWorker) => scope.postMessage(message);

const input: EngineInput = {
  state: { scene: 3, amb: 1, local: 0, gain: 0.22, heroGain: 0 },
  pointer: { x: 0.62, y: 0.55 },
  scrollY: 0,
  hidden: false,
};
const size = { width: 2, height: 2 };
let handle: CoreHandle | null = null;
let live = false;
let statsTimer = 0;
let started = false;

const host: EngineHost = {
  input,
  requestFrame: (callback) => scope.requestAnimationFrame!(callback),
  cancelFrame: (id) => scope.cancelAnimationFrame?.(id),
  viewport: () => size,
  onLive: () => {
    live = true;
    post({ type: 'live' });
  },
  onRetire: () => {
    if (statsTimer) clearInterval(statsTimer);
    post({ type: live ? 'retire' : 'failed' });
  },
};

function apply(message: Extract<ToWorker, { type: 'input' | 'init' }>) {
  const next = message.type === 'init' ? message.input : message;
  Object.assign(input.state, next.state);
  input.pointer.x = next.pointer.x;
  input.pointer.y = next.pointer.y;
  input.scrollY = next.scrollY;
}

async function start(canvas: OffscreenCanvas, debug: boolean) {
  // A browser without requestAnimationFrame in workers cannot present frames from here: let the page use the main thread.
  if (typeof scope.requestAnimationFrame !== 'function') return post({ type: 'failed' });
  try {
    handle = await runEngine(canvas, host);
  } catch {
    handle = null;
  }
  if (!handle) return post({ type: 'failed' });
  if (debug) {
    const send = () => handle && post({ type: 'stats', stats: handle.stats() });
    send();
    statsTimer = setInterval(send, 400) as unknown as number;
  }
}

scope.addEventListener('message', (event) => {
  const message = event.data;
  switch (message.type) {
    case 'init':
      if (started) return;
      started = true;
      apply(message);
      input.hidden = message.hidden;
      size.width = message.width;
      size.height = message.height;
      void start(message.canvas, message.debug);
      break;
    case 'input':
      apply(message);
      break;
    case 'hidden':
      input.hidden = message.hidden;
      break;
    case 'size':
      size.width = message.width;
      size.height = message.height;
      handle?.resize();
      break;
    case 'glitch':
      handle?.glitch(message.ms, message.strength);
      break;
    case 'debug':
      handle?.debug(message.settings);
      break;
    case 'snap':
      handle?.snap();
      break;
    case 'stop':
      handle?.destroy();
      break;
  }
});
