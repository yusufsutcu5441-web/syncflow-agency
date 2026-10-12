#!/usr/bin/env node
/**
 * Renders the film's fallback posters (public/film/scene-0..3.webp and scene-0..3-portrait.webp) from the SAME shaders the live engine uses
 * (lib/cinema/shaders.ts), so a phone, a reduced-motion visitor or a machine without WebGL2 sees the four scenes as stills
 * (docs/adr/0014-cinematic-layer.md). Headless Chrome with software WebGL (SwiftShader), so it needs no GPU and gives the same
 * pixels everywhere.
 *
 *   node scripts/render-posters.mjs [outDir]          default: public/film
 *
 * Needs Node >= 22.18 (it imports the TypeScript shader file with built-in type stripping) and puppeteer-core, which the
 * Lighthouse runner (`npm run perf`) already fetches into the npx cache; nothing is added to package.json. Chrome: CHROME_PATH or a
 * common install path. The output carries a little grain (dither against banding); the page adds its own on top.
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = process.argv[2] ?? join(root, 'public', 'film');

const chrome =
  process.env.CHROME_PATH ??
  ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((c) => existsSync(c));
if (!chrome) {
  console.error('Chrome not found. Set CHROME_PATH to the browser executable.');
  process.exit(1);
}

function loadPuppeteer() {
  try {
    return createRequire(join(root, 'x.js'))('puppeteer-core');
  } catch {
    /* not a dependency: look in the npx cache that `npm run perf` fills */
  }
  const home = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'npm-cache', '_npx') : join(process.env.HOME ?? '', '.npm', '_npx');
  const dir = existsSync(home) ? readdirSync(home).map((d) => join(home, d)).find((d) => existsSync(join(d, 'node_modules', 'puppeteer-core'))) : undefined;
  if (!dir) throw new Error('puppeteer-core not found. Run `npm run perf` once (or `npx -y lighthouse@13.5.0 --version`) to fetch it.');
  return createRequire(join(dir, 'x.js'))('puppeteer-core');
}

const { VERT, SCENE_FRAG, POST_FRAG } = await import('../lib/cinema/shaders.ts');
const puppeteer = loadPuppeteer();

// Landscape for desktops without WebGL, portrait for phones (a landscape still cropped to a phone is a magnified sliver and shows pixels).
const SIZES = [
  { suffix: '', W: 1280, H: 720 },
  { suffix: '-portrait', W: 720, H: 1280 },
];
// Weights are (cosmic, bio-mechanical, monolith, liquid); `local` is the film progress the camera reads; `flare` the lens-flare strength.
const SCENES = [
  { w: [1, 0, 0, 0], local: 0.12, time: 14, flare: 0.25 },
  { w: [0, 1, 0, 0], local: 0.37, time: 9, flare: 0.3 },
  { w: [0, 0, 1, 0], local: 0.62, time: 6, flare: 1 },
  { w: [0, 0, 0, 1], local: 0.88, time: 11, flare: 0.8 },
];

mkdirSync(outDir, { recursive: true });
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage();
  for (const { suffix, W, H } of SIZES) for (const [index, scene] of SCENES.entries()) {
    await page.setViewport({ width: W, height: H });
    await page.setContent(`<body style="margin:0"><canvas id="c" width="${W}" height="${H}"></canvas></body>`);
    const stats = await page.evaluate(
      ({ sources, scene, W, H }) => {
        const canvas = document.getElementById('c');
        const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: true });
        const make = (type, source) => {
          const shader = gl.createShader(type);
          gl.shaderSource(shader, source);
          gl.compileShader(shader);
          if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
          return shader;
        };
        const program = (fragment) => {
          const p = gl.createProgram();
          gl.attachShader(p, make(gl.VERTEX_SHADER, sources.VERT));
          gl.attachShader(p, make(gl.FRAGMENT_SHADER, fragment));
          gl.linkProgram(p);
          if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
          return p;
        };
        const A = program(sources.SCENE_FRAG);
        const B = program(sources.POST_FRAG);
        gl.bindVertexArray(gl.createVertexArray());
        // The scene pass runs at full resolution here (the live engine uses half to save the GPU); stills are made once.
        const sw = W;
        const sh = H;
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, sw, sh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        const u = (p, n) => gl.getUniformLocation(p, n);
        gl.viewport(0, 0, sw, sh);
        gl.useProgram(A);
        gl.uniform2f(u(A, 'uRes'), sw, sh);
        gl.uniform1f(u(A, 'uTime'), scene.time);
        gl.uniform4f(u(A, 'uW'), ...scene.w);
        gl.uniform1f(u(A, 'uLocal'), scene.local);
        gl.uniform2f(u(A, 'uMouse'), 0.62, 0.55);
        gl.uniform1f(u(A, 'uGain'), 1);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, W, H);
        gl.useProgram(B);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform1i(u(B, 'uTex'), 0);
        gl.uniform2f(u(B, 'uRes'), W, H);
        gl.uniform1f(u(B, 'uTime'), scene.time);
        gl.uniform1f(u(B, 'uAber'), 0.0016);
        gl.uniform1f(u(B, 'uGrain'), 0.02);
        gl.uniform1f(u(B, 'uGlitch'), 0);
        gl.uniform3f(u(B, 'uFlare'), 0.72, 0.74, scene.flare);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        const px = new Uint8Array(W * H * 4);
        gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
        let min = 255;
        let max = 0;
        for (let i = 0; i < px.length; i += 4) for (let c = 0; c < 3; c++) { min = Math.min(min, px[i + c]); max = Math.max(max, px[i + c]); }
        return { url: canvas.toDataURL('image/webp', 0.8), min, max };
      },
      { sources: { VERT, SCENE_FRAG, POST_FRAG }, scene, W, H },
    );
    const bytes = Buffer.from(stats.url.split(',')[1], 'base64');
    writeFileSync(join(outDir, `scene-${index}${suffix}.webp`), bytes);
    console.log(`scene-${index}${suffix}.webp  ${(bytes.length / 1024).toFixed(1)} KB  darkest ${stats.min}, lightest ${stats.max} (palette 13..230)`);
  }
} finally {
  await browser.close();
}
