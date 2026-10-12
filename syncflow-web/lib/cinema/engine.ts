import { POST_FRAG, SCENE_FRAG, VERT } from './shaders';
import { cinemaState, reportCinemaOff } from './state';

/**
 * The cinema engine (docs/adr/0014-cinematic-layer.md): one fixed full-viewport canvas behind the page, raw WebGL2.
 *
 * It is a separate chunk that components/cinema/CinemaStage.tsx imports only after the first paint, only on a desktop with a fine
 * pointer, no reduced-motion preference and no data saver. It never throws into the page: every failure (no WebGL2, a shader that
 * does not compile, a lost context, a machine too slow) ends with `null`/`destroy()` and the CSS fallback stays.
 *
 * Cost control: the scene pass runs at a fraction of the canvas size (soft, which suits film) and that fraction drops when frames
 * run long; if even the smallest size is too slow the engine switches itself off. The ambient state runs at 30 fps, the film at
 * the display rate. Nothing renders while the tab is hidden.
 */
export type CinemaHandle = { destroy: () => void; glitch: (ms?: number, strength?: number) => void };

type Target = { fbo: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number };

const GRAIN = 0.035;
const MIN_SCENE_SCALE = 0.3;

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

type Job = { program: WebGLProgram; shaders: WebGLShader[] };

/**
 * Starts compiling and linking WITHOUT asking for the result. Asking (getShaderParameter, getProgramParameter) makes the main
 * thread wait for the GPU process, and the raymarching scene shader takes a while to compile: that wait showed up as blocking time.
 * With KHR_parallel_shader_compile the compile runs off the main thread and `ready()` polls for completion.
 */
function begin(gl: WebGL2RenderingContext, fragment: string): Job | null {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.shaderSource(vs, VERT);
  gl.compileShader(vs);
  gl.shaderSource(fs, fragment);
  gl.compileShader(fs);
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  return { program, shaders: [vs, fs] };
}

async function ready(gl: WebGL2RenderingContext, jobs: Job[]): Promise<void> {
  const ext = gl.getExtension('KHR_parallel_shader_compile');
  if (!ext) return;
  const since = performance.now();
  while (jobs.some((job) => !gl.getProgramParameter(job.program, ext.COMPLETION_STATUS_KHR)) && performance.now() - since < 15000) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

/** Reads the result (now cheap) and releases the shader objects. */
function finish(gl: WebGL2RenderingContext, job: Job): WebGLProgram | null {
  const linked = gl.getProgramParameter(job.program, gl.LINK_STATUS);
  if (!linked && process.env.NODE_ENV !== 'production') {
    for (const shader of job.shaders) console.warn('cinema shader:', gl.getShaderInfoLog(shader));
    console.warn('cinema link:', gl.getProgramInfoLog(job.program));
  }
  for (const shader of job.shaders) gl.deleteShader(shader);
  if (!linked) {
    gl.deleteProgram(job.program);
    return null;
  }
  return job.program;
}

function target(gl: WebGL2RenderingContext, w: number, h: number): Target | null {
  const tex = gl.createTexture();
  const fbo = gl.createFramebuffer();
  if (!tex || !fbo) return null;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (!ok) return null;
  return { fbo, tex, w, h };
}

export async function startCinema(host: HTMLElement): Promise<CinemaHandle | null> {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' });
  if (!context) return null;
  // An explicitly typed constant: the nested functions below see a non-null context.
  const gl: WebGL2RenderingContext = context;
  const sceneJob = begin(gl, SCENE_FRAG);
  const postJob = begin(gl, POST_FRAG);
  if (!sceneJob || !postJob) return null;
  await ready(gl, [sceneJob, postJob]);
  const scenePass = finish(gl, sceneJob);
  const postPass = finish(gl, postJob);
  if (!scenePass || !postPass) return null;

  const u = (p: WebGLProgram, name: string) => gl.getUniformLocation(p, name);
  const S = { res: u(scenePass, 'uRes'), time: u(scenePass, 'uTime'), w: u(scenePass, 'uW'), local: u(scenePass, 'uLocal'), mouse: u(scenePass, 'uMouse'), gain: u(scenePass, 'uGain') };
  const P = { tex: u(postPass, 'uTex'), res: u(postPass, 'uRes'), time: u(postPass, 'uTime'), aber: u(postPass, 'uAber'), grain: u(postPass, 'uGrain'), glitch: u(postPass, 'uGlitch'), flare: u(postPass, 'uFlare') };

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  canvas.className = 'cinema-canvas';
  host.appendChild(canvas);

  // ── mutable engine state ────────────────────────────────────────────────────────────────────
  const cur = { scene: cinemaState.scene, amb: cinemaState.amb, local: cinemaState.local, gain: cinemaState.gain };
  const mouse = { x: 0.62, y: 0.55, tx: 0.62, ty: 0.55, vel: 0 };
  let sceneScale = 0.5;
  let scene: Target | null = null;
  let width = 0;
  let height = 0;
  let raf = 0;
  let alive = true;
  let last = performance.now();
  const startAt = last;
  let frameCount = 0;
  let acc = 0;
  let slowWindows = 0;
  let glitchUntil = 0;
  let glitchMs = 1;
  let glitchStrength = 1;
  let lastScrollY = window.scrollY;
  let scrollVel = 0;
  let tick = 0;
  let frozen = false;
  let fixedTime = -1;
  let grainOverride = -1;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    width = Math.max(2, Math.round(window.innerWidth * dpr));
    height = Math.max(2, Math.round(window.innerHeight * dpr));
    canvas.width = width;
    canvas.height = height;
    const sw = Math.max(2, Math.round(width * sceneScale));
    const sh = Math.max(2, Math.round(height * sceneScale));
    if (scene) {
      gl.deleteTexture(scene.tex);
      gl.deleteFramebuffer(scene.fbo);
    }
    scene = target(gl, sw, sh);
  };
  resize();
  if (!scene) {
    canvas.remove();
    return null;
  }

  const onPointer = (e: PointerEvent) => {
    mouse.tx = e.clientX / window.innerWidth;
    mouse.ty = 1 - e.clientY / window.innerHeight;
  };
  const onResize = () => resize();
  const onLost = (e: Event) => {
    e.preventDefault();
    destroy();
  };
  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('resize', onResize);
  canvas.addEventListener('webglcontextlost', onLost);

  const onGlitch = (e: Event) => {
    const detail = (e as CustomEvent<{ ms?: number; strength?: number }>).detail;
    glitch(detail?.ms, detail?.strength);
  };
  window.addEventListener('cinema:glitch', onGlitch);

  // Test and still-frame hook, only with ?cinema-debug in the address (used to render the fallback posters and in the tests).
  if (new URLSearchParams(window.location.search).has('cinema-debug')) {
    (window as unknown as { __cinema: unknown }).__cinema = {
      set: (p: Partial<typeof cinemaState> & { time?: number; grain?: number; freeze?: boolean }) => {
        const { time, grain, freeze, ...rest } = p;
        Object.assign(cinemaState, rest);
        if (time !== undefined) fixedTime = time;
        if (grain !== undefined) grainOverride = grain;
        if (freeze !== undefined) frozen = freeze;
      },
      snap: () => Object.assign(cur, cinemaState),
      stats: () => ({ sceneScale, width, height, frames: frameCount }),
    };
  }

  function glitch(ms = 360, strength = 1) {
    glitchMs = ms;
    glitchStrength = strength;
    glitchUntil = performance.now() + ms;
  }

  function draw(now: number, dt: number) {
    if (!scene) return;
    const t = fixedTime >= 0 ? fixedTime : (now - startAt) / 1000;

    // ease the live values towards the targets (a critically damped feel, independent of frame rate)
    const k = 1 - Math.exp(-dt * 6);
    cur.scene = mix(cur.scene, cinemaState.scene, k);
    cur.amb = mix(cur.amb, cinemaState.amb, k);
    cur.local = mix(cur.local, cinemaState.local, k);
    // The film and the hero each ask for a picture strength; the stronger request wins.
    cur.gain = mix(cur.gain, Math.max(cinemaState.gain, cinemaState.heroGain), k);

    const mk = 1 - Math.exp(-dt * 7);
    const px = mouse.x;
    const py = mouse.y;
    mouse.x = mix(mouse.x, mouse.tx, mk);
    mouse.y = mix(mouse.y, mouse.ty, mk);
    mouse.vel = mix(mouse.vel, clamp(Math.hypot(mouse.x - px, mouse.y - py) / Math.max(dt, 0.001) * 0.12, 0, 1), 0.2);
    const sy = window.scrollY;
    scrollVel = mix(scrollVel, clamp(Math.abs(sy - lastScrollY) / Math.max(dt, 0.001) / 4000, 0, 1), 0.15);
    lastScrollY = sy;

    // scene weights: the film scenes blend by `scene`, the ambient scene takes over by `amb`
    const weight = (i: number) => Math.max(0, 1 - Math.abs(cur.scene - i)) * (1 - cur.amb);
    const w0 = weight(0);
    const w1 = weight(1);
    const w2 = weight(2);
    const w3 = weight(3) + cur.amb;

    // optics follow the content: more flare on the monolith and the light chapter, more aberration when things move
    const flareStrength = 0.14 + 0.86 * (1 - cur.amb) * clamp(w2 + w3 * 0.6, 0, 1);
    const aberration = 0.0011 + 0.0045 * Math.max(mouse.vel, scrollVel) + 0.0014 * (1 - cur.amb);
    const g = clamp((glitchUntil - now) / glitchMs, 0, 1);
    const glitchAmount = g > 0 ? Math.sin(g * Math.PI) * glitchStrength : 0;
    const flareX = 0.5 + 0.3 * Math.sin(t * 0.13 + cur.local * 3.0) + (mouse.x - 0.5) * 0.25;
    const flareY = 0.74 + 0.1 * Math.sin(t * 0.09 + 1.7) + (mouse.y - 0.5) * 0.15;

    gl.bindFramebuffer(gl.FRAMEBUFFER, scene.fbo);
    gl.viewport(0, 0, scene.w, scene.h);
    gl.useProgram(scenePass);
    gl.uniform2f(S.res, scene.w, scene.h);
    gl.uniform1f(S.time, t);
    gl.uniform4f(S.w, w0, w1, w2, w3);
    gl.uniform1f(S.local, cur.local);
    gl.uniform2f(S.mouse, mouse.x, mouse.y);
    gl.uniform1f(S.gain, cur.gain);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
    gl.useProgram(postPass);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, scene.tex);
    gl.uniform1i(P.tex, 0);
    gl.uniform2f(P.res, width, height);
    gl.uniform1f(P.time, t);
    gl.uniform1f(P.aber, aberration);
    gl.uniform1f(P.grain, grainOverride >= 0 ? grainOverride : GRAIN);
    gl.uniform1f(P.glitch, glitchAmount);
    gl.uniform3f(P.flare, flareX, flareY, flareStrength);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function frame(now: number) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    if (document.hidden || frozen) {
      last = now;
      return;
    }
    tick++;
    // Ambient only: 30 fps is plenty for a slow liquid and halves the idle GPU load.
    if (cur.amb > 0.98 && cinemaState.amb > 0.98 && glitchUntil < now && tick % 2 === 1) return;

    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    draw(now, dt);

    // quality control: judge the average frame time over 90 frames
    frameCount++;
    acc += dt;
    if (frameCount % 90 === 0) {
      const avg = acc / 90 / (cur.amb > 0.98 ? 2 : 1);
      acc = 0;
      if (avg > 0.024) {
        if (sceneScale > MIN_SCENE_SCALE + 0.001) {
          sceneScale = Math.max(MIN_SCENE_SCALE, sceneScale * 0.8);
          resize();
          slowWindows = 0;
        } else if (++slowWindows >= 2) destroy();
      } else slowWindows = 0;
    }
  }

  function destroy() {
    if (!alive) return;
    alive = false;
    cancelAnimationFrame(raf);
    window.removeEventListener('pointermove', onPointer);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('cinema:glitch', onGlitch);
    canvas.removeEventListener('webglcontextlost', onLost);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    canvas.remove();
    // The canvas is gone, so the film's posters (and the CSS light) take over: tell the film to fetch them.
    reportCinemaOff();
  }

  // show the canvas once the first frame is on it
  // The marker lives on the canvas, not on <html>: React resets <html>'s attributes when the language changes. CSS reads it with
  // :has() (body:has(> .cinema-canvas[data-live])).
  draw(performance.now(), 0.016);
  canvas.dataset.live = '1';
  raf = requestAnimationFrame(frame);
  return { destroy, glitch };
}
