/**
 * GLSL for the cinema layer (docs/adr/0014-cinematic-layer.md). Raw WebGL2, no three.js, so the whole engine stays a few KB.
 *
 * Two passes:
 *   1. SCENE  renders the active scene(s) at a fraction of the canvas resolution into a texture. Four scenes, each a function:
 *             cosmic matter (domain-warped nebula + dust), a bio-mechanical spine (raymarched vertebrae and ribs),
 *             an obsidian monolith (raymarched slab, floor, backlight shaft) and liquid metal (the ambient scene).
 *             Only scenes with a weight above zero are evaluated, so the page at rest costs one cheap scene.
 *   2. POST   draws that texture to the canvas at full resolution and adds the optics: chromatic aberration, a cheap bloom, an
 *             anamorphic lens flare with ghosts, a vignette, 24 fps 35 mm film grain, gate flicker, a glitch-slice burst (the language
 *             switch) and dither. Its last line clamps every pixel to the brand palette: the darkest value is obsidian #0D0D0E and
 *             the lightest is platin #E2E2E6, so the layer can never emit pure black or pure white (CLAUDE.md, the audit checks it).
 *
 * Colours are written as linear numbers in 0..1 of the sRGB values: OB 13/255, L2 26/255, PL 226/255, CH #D4C5A9.
 */

export const VERT = /* glsl */ `#version 300 es
void main() {
  // One oversized triangle from gl_VertexID: no buffers needed.
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const COMMON = /* glsl */ `
const vec3 OB = vec3(0.0510, 0.0510, 0.0549);
const vec3 L2 = vec3(0.1020, 0.1020, 0.1176);
const vec3 PL = vec3(0.8863, 0.8863, 0.9020);
const vec3 CH = vec3(0.8314, 0.7725, 0.6627);
float h11(float x) { return fract(sin(x * 127.1) * 43758.5453); }
float h21(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
`;

export const SCENE_FRAG = /* glsl */ `#version 300 es
precision highp float;
out vec4 o;
uniform vec2 uRes;
uniform float uTime;
uniform vec4 uW;      // scene weights: cosmic, bio-mechanical, monolith, liquid (sum 1)
uniform float uLocal; // film progress 0..1, drives the camera of each scene
uniform vec2 uMouse;  // 0..1, y up
uniform float uGain;  // 0 = flat obsidian, 1 = full scene
${COMMON}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.02 + vec2(17.0, 9.0); a *= 0.5; }
  return s;
}

/* ── light cascades and bokeh (docs/adr/0017-atmosphere.md) ─────────────────────────────────────────────────────────────────── */
/* Slow vertical curtains of platin that warm towards champagne in their cores, in two depth layers drifting at different speeds: the far
   layer is finer, dimmer and slower, and that parallax is the depth. Champagne lives only here, as warm light in the picture; it is never
   a surface colour and never on the logo. The final pass still clamps every pixel to the palette and holds the text column to 0.17. */
vec3 cascade(vec2 uv, float sway) {
  vec3 acc = vec3(0.0);
  for (int k = 0; k < 2; k++) {
    float fk = float(k);
    float depth = 1.0 + fk * 1.6;
    float x = uv.x * (1.3 * depth) + 0.18 * sin(uTime * 0.045 / depth + uv.y * 0.8 + fk * 2.3) + sway * (0.4 / depth) + fk * 4.1;
    float ray = pow(abs(sin(x * 3.1416 + uTime * 0.012 * depth)), 38.0 + fk * 30.0);
    float curtain = smoothstep(-0.9, 0.9, uv.y) * (0.45 + 0.55 * noise(vec2(x * 2.0, uTime * 0.03 + fk * 7.0)));
    vec3 tint = mix(PL, CH, 0.35 + 0.45 * noise(vec2(x * 1.3 + fk, uTime * 0.02)));
    acc += tint * ray * curtain * (0.20 / depth);
  }
  return acc;
}
/* A few soft discs far behind the surface, drifting slowly: the out-of-focus lights of a long lens. */
vec3 bokeh(vec2 uv) {
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    vec2 c = vec2(h11(fi * 3.7) * 3.2 - 1.6, h11(fi * 5.3) * 1.8 - 0.9) + vec2(0.06 * sin(uTime * 0.03 + fi * 2.0), 0.05 * cos(uTime * 0.025 + fi * 1.3));
    float r = 0.10 + 0.14 * h11(fi * 9.1);
    float d = length(uv - c);
    float disc = smoothstep(r, r * 0.6, d);
    float rim = smoothstep(r * 0.8, r, d) * smoothstep(r * 1.1, r, d);
    acc += mix(PL, CH, h11(fi * 2.9)) * (disc * 0.022 + rim * 0.03);
  }
  return acc;
}

/* ── 1. cosmic matter ───────────────────────────────────────────────────────────────────────── */
vec3 cosmic(vec2 uv, float p) {
  float t = uTime * 0.04;
  vec2 q = rot(0.25 * sin(t) + p * 0.7) * (uv * 1.15);
  vec2 w = vec2(fbm(q + vec2(0.0, t)), fbm(q + vec2(5.2, 1.3) - t));
  float n = fbm(q * 1.4 + 2.2 * w);
  float core = smoothstep(0.35, 0.95, n);
  vec3 col = mix(OB, L2 * 1.15, smoothstep(0.1, 0.7, n));
  col += PL * pow(core, 2.6) * 0.72;
  col += CH * pow(core, 4.5) * 0.3;
  float dust = 0.0;
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    vec2 pp = uv * (7.0 + fk * 9.0) + vec2(0.0, p * (1.0 + fk) * 2.5) + fk * 13.1;
    vec2 g = floor(pp), f = fract(pp);
    float h = h21(g);
    vec2 c = vec2(h21(g + 1.7), h21(g + 3.1));
    float tw = 0.55 + 0.45 * sin(uTime * (0.8 + h * 2.0) + h * 50.0);
    dust += smoothstep(0.07 / (1.0 + fk * 0.3), 0.0, length(f - c)) * step(0.86, h) * tw / (1.0 + fk * 0.6);
  }
  return col + PL * dust * 0.85 + cascade(uv, p) * 0.7;
}

/* ── 2. bio-mechanical spine ────────────────────────────────────────────────────────────────── */
float smin(float a, float b, float k) { float h = max(k - abs(a - b), 0.0) / k; return min(a, b) - h * h * k * 0.25; }
float sdTorus(vec3 p, vec2 t) { vec2 q = vec2(length(p.xz) - t.x, p.y); return length(q) - t.y; }
float sdCap(vec3 p, vec3 a, vec3 b, float r) { vec3 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h) - r; }
float mapBio(vec3 p, float t) {
  float bound = length(p * vec3(1.0, 0.55, 1.0)) - 2.15;
  if (bound > 0.35) return bound;
  float d = 1e3;
  vec3 prev = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    vec3 c = vec3(sin(t * 0.7 + fi * 0.62) * 0.32, (fi - 3.5) * 0.36, cos(t * 0.55 + fi * 0.5) * 0.2);
    vec3 q = p - c;
    q.xz = rot(fi * 0.35 + t * 0.1) * q.xz;
    float tor = sdTorus(q, vec2(0.36 + 0.05 * sin(fi * 1.3), 0.09));
    float spine = sdCap(q, vec3(0.0), vec3(0.0, 0.0, -0.62 - 0.06 * sin(fi * 2.1)), 0.035);
    float rib = sdCap(vec3(abs(q.x), q.y, q.z), vec3(0.28, 0.0, 0.0), vec3(0.82, -0.1, 0.12), 0.028);
    float v = smin(smin(tor, spine, 0.08), rib, 0.1);
    d = smin(d, v, 0.14);
    if (i > 0) d = smin(d, sdCap(p, prev, c, 0.075 + 0.015 * sin(fi * 3.0)), 0.12);
    prev = c;
  }
  return d + 0.008 * sin(p.y * 46.0 + t);
}
vec3 biomech(vec2 uv, float p) {
  float t = uTime * 0.25;
  float ang = 0.35 + t * 0.25 + p * 2.4;
  vec3 ro = vec3(sin(ang) * 3.3, 0.25 + 0.35 * sin(p * 3.0), cos(ang) * 3.3);
  vec3 ww = normalize(-ro), uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0))), vv = cross(uu, ww);
  vec3 rd = normalize(uv.x * uu + uv.y * vv + 1.9 * ww);
  float dist = 0.0;
  bool hit = false;
  vec3 pos = ro;
  for (int i = 0; i < 56; i++) {
    pos = ro + rd * dist;
    float d = mapBio(pos, t);
    if (d < 0.003) { hit = true; break; }
    dist += d * 0.8;
    if (dist > 7.0) break;
  }
  vec3 col = mix(OB, L2, smoothstep(-1.0, 1.0, uv.y)) * 0.6 + PL * exp(-length(uv - vec2(0.35, 0.25)) * 2.8) * 0.1;
  if (hit) {
    vec2 e = vec2(0.004, 0.0);
    vec3 n = normalize(vec3(mapBio(pos + e.xyy, t) - mapBio(pos - e.xyy, t), mapBio(pos + e.yxy, t) - mapBio(pos - e.yxy, t), mapBio(pos + e.yyx, t) - mapBio(pos - e.yyx, t)));
    vec3 l1 = normalize(vec3(-0.6, 0.7, -0.5)), l2 = normalize(vec3(0.7, -0.3, 0.5));
    float fre = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
    float spec = pow(max(dot(reflect(-l1, n), -rd), 0.0), 48.0);
    float ao = clamp(0.4 + 0.6 * smoothstep(0.0, 0.12, mapBio(pos + n * 0.12, t)), 0.0, 1.0);
    col = OB * 0.8 + L2 * max(dot(n, l1), 0.0) * 1.3 + CH * max(dot(n, l2), 0.0) * 0.2 + PL * spec * 1.1 + CH * fre * 0.75;
    col = mix(col * ao, OB, smoothstep(4.0, 6.5, dist) * 0.6);
  }
  return col;
}

/* ── 3. obsidian monolith ───────────────────────────────────────────────────────────────────── */
float sdBox(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }
float mapMono(vec3 p, float a) { p.xz = rot(a) * p.xz; return sdBox(p, vec3(0.5, 1.25, 0.11)) - 0.012; }
vec3 monolith(vec2 uv, float p) {
  float a = 0.45 + uTime * 0.05 + p * 1.6;
  vec3 ro = vec3(0.0, -0.1 + 0.2 * p, -4.2);
  vec3 rd = normalize(vec3(uv.x, uv.y + 0.14, 2.0));
  vec3 col = mix(OB, L2, smoothstep(-0.9, 0.6, uv.y)) * 0.55;
  // light behind the slab: a column and a low glow on the horizon
  col += (PL * 0.5 + CH * 0.5) * exp(-abs(uv.x) * 7.0) * smoothstep(-0.3, 0.9, uv.y) * 0.16;
  col += PL * exp(-abs(uv.y + 0.18) * 5.5) * exp(-abs(uv.x) * 0.9) * 0.1;
  // floor
  if (rd.y < -0.02) {
    float tf = (-1.25 - ro.y) / rd.y;
    vec3 fp = ro + rd * tf;
    col = mix(col, L2 * 0.45 + PL * exp(-length(fp.xz) * 0.9) * 0.07, smoothstep(-0.02, -0.2, rd.y) * exp(-tf * 0.12));
  }
  float dist = 0.0;
  bool hit = false;
  vec3 pos = ro;
  for (int i = 0; i < 44; i++) {
    pos = ro + rd * dist;
    float d = mapMono(pos, a);
    if (d < 0.002) { hit = true; break; }
    dist += d;
    if (dist > 9.0) break;
  }
  if (hit) {
    vec2 e = vec2(0.003, 0.0);
    vec3 n = normalize(vec3(mapMono(pos + e.xyy, a) - mapMono(pos - e.xyy, a), mapMono(pos + e.yxy, a) - mapMono(pos - e.yxy, a), mapMono(pos + e.yyx, a) - mapMono(pos - e.yyx, a)));
    float fre = pow(1.0 - abs(dot(n, rd)), 3.5);
    vec3 env = mix(L2 * 0.7, PL * 0.5, smoothstep(-0.1, 1.0, reflect(rd, n).y));
    vec3 lp = pos; lp.xz = rot(a) * lp.xz;
    float sheen = exp(-pow((lp.x - sin(uTime * 0.2) * 0.35) * 6.0, 2.0)) * 0.1;
    col = OB * 0.9 + env * (0.08 + 0.5 * fre) + PL * fre * 0.8 + PL * sheen;
  }
  return col;
}

/* ── 4. liquid metal (the ambient scene) ────────────────────────────────────────────────────── */
/* The liquid height: a warped, low-octave field plus a ripple that follows the cursor. The surface normal comes from finite
   differences of this function (three samples), not from dFdx/dFdy: screen-space derivatives work on 2x2 pixel quads and
   turned the surface into speckle at the low scene resolution. */
float liquidHeight(vec2 q, vec2 w, vec2 m, float p) {
  float h = 0.0, a = 0.5;
  vec2 s = q * 0.9 + 1.6 * w + p * 0.4;
  for (int i = 0; i < 3; i++) { h += a * noise(s); s = s * 2.03 + vec2(11.0, 7.0); a *= 0.5; }
  float md = length(q - m);
  return h + 0.06 * sin(md * 18.0 - uTime * 1.5) * exp(-md * 2.8);
}
vec3 liquid(vec2 uv, float p) {
  float t = uTime * 0.036;
  vec2 w = vec2(fbm(uv * 0.8 + vec2(t, 0.0)), fbm(uv * 0.8 + vec2(3.1, t * 1.3)));
  vec2 m = (uMouse * 2.0 - 1.0) * vec2(uRes.x / uRes.y, 1.0);
  float e = 0.02;
  float h = liquidHeight(uv, w, m, p);
  vec2 grad = vec2(liquidHeight(uv + vec2(e, 0.0), w, m, p) - h, liquidHeight(uv + vec2(0.0, e), w, m, p) - h) / e;
  vec3 n = normalize(vec3(-grad * 0.55, 1.0));
  vec3 L = normalize(vec3(-0.45, 0.55, 0.7));
  float spec = pow(max(dot(n, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0), 70.0);
  vec3 col = mix(OB, L2 * 1.2, smoothstep(0.15, 0.75, h)) + L2 * max(dot(n, L), 0.0) * 0.35;
  return col + PL * spec * 0.7 + CH * spec * spec * 0.25 + cascade(uv, m.x) + bokeh(uv);
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - uRes) / uRes.y;
  // The wide scenes hold their subject on the right so the chapter text on the left stays clear.
  vec2 suv = uv - vec2(0.42 * clamp(uRes.x / uRes.y - 1.3, 0.0, 0.6) / 0.6, 0.0);
  vec3 col = vec3(0.0);
  if (uW.x > 0.002) col += cosmic(uv, uLocal) * uW.x;
  if (uW.y > 0.002) col += biomech(suv, uLocal) * uW.y;
  if (uW.z > 0.002) col += monolith(suv, uLocal) * uW.z;
  if (uW.w > 0.002) col += liquid(uv, uLocal) * uW.w;
  o = vec4(OB + (col - OB) * uGain, 1.0);
}`;

export const POST_FRAG = /* glsl */ `#version 300 es
precision highp float;
out vec4 o;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform float uTime;
uniform float uAber;   // chromatic aberration amount
uniform float uGrain;  // film grain amplitude
uniform float uGlitch; // 0..1 glitch-slice burst (the language switch)
uniform vec3 uFlare;   // light position (xy, 0..1) and strength (z)
${COMMON}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  if (uGlitch > 0.001) {
    float band = floor(uv.y * 18.0 + floor(uTime * 30.0) * 2.7);
    if (h11(band) > 1.0 - 0.55 * uGlitch) uv.x += (h11(band + 4.1) - 0.5) * 0.16 * uGlitch;
  }
  vec2 dir = uv - 0.5;
  vec2 ad = dir * vec2(asp, 1.0);
  float ab = uAber * (0.55 + 1.6 * dot(ad, ad)) + uGlitch * 0.012;
  vec3 col = vec3(texture(uTex, uv - dir * ab).r, texture(uTex, uv).g, texture(uTex, uv + dir * ab).b);

  // cheap bloom: six taps around the pixel, only the bright part
  vec3 b = vec3(0.0);
  for (int i = 0; i < 6; i++) {
    float a = float(i) * 1.0472;
    b += texture(uTex, uv + vec2(cos(a) / asp, sin(a)) * 0.012).rgb;
  }
  b /= 6.0;
  col += b * smoothstep(0.35, 0.9, max(max(b.r, b.g), b.b)) * 0.28;

  // anamorphic lens flare: core, horizontal streak, three ghosts on the axis through the centre
  vec2 d = (uv - uFlare.xy) * vec2(asp, 1.0);
  vec3 flare = PL * exp(-length(d) * 16.0) * 0.55 + CH * exp(-abs(uv.y - uFlare.y) * 70.0) * exp(-abs(uv.x - uFlare.x) * 2.4) * 0.35;
  for (int k = 1; k < 4; k++) {
    vec2 gp = uFlare.xy + (vec2(0.5) - uFlare.xy) * float(k) * 0.62;
    float len = length((uv - gp) * vec2(asp, 1.0));
    float rr = 0.05 + 0.035 * float(k);
    flare += mix(CH, PL, 0.5) * smoothstep(rr * 0.55, rr, len) * (1.0 - smoothstep(rr, rr * 1.15, len)) * 0.1 / float(k);
  }
  col += flare * uFlare.z;

  // Text safety: the chapter text sits in the lower part of the screen. Highlights there are limited with a soft knee (platin text
  // keeps 3:1 or better over the brightest pixel, measured in the browser); the upper part, where the flare lives, is untouched.
  float cap = mix(0.42, 1.0, smoothstep(0.58, 0.82, uv.y));
  // The text column is on the left (hero copy, film captions) and the scenes keep their subject on the right. Small text (the
  // paragraphs, the soft-platin labels) needs 4.5:1, which on obsidian means a background no brighter than about 50/255: the left
  // part of the picture is held to 0.17 (43/255, plus grain) with no leak, and it opens up towards the right. Measured in
  // the browser with the debug hook (docs/perf/cinema.md "Kontrast"): before this, a bright wave behind the hero paragraph gave 2.7:1.
  float capX = mix(0.17, 1.0, smoothstep(0.52, 0.80, uv.x));
  float leak = 0.08 * smoothstep(0.52, 0.80, uv.x);
  cap = min(cap, capX);
  col = min(col, vec3(cap)) + max(col - cap, 0.0) * leak;

  col *= 1.0 - 0.55 * smoothstep(0.35, 1.05, length(ad));

  // 35 mm: grain re-rolled at 24 frames per second, stronger in the mid tones, plus a faint gate flicker
  float fr = floor(uTime * 24.0);
  float g = h21(gl_FragCoord.xy + fr * 37.2) + h21(gl_FragCoord.xy * 1.7 + fr * 11.9) - 1.0;
  col += g * uGrain * (1.0 - 0.55 * dot(col, vec3(0.299, 0.587, 0.114)));
  col *= 1.0 + 0.012 * (h11(fr) - 0.5);
  col += (h21(gl_FragCoord.xy + 0.5) - 0.5) / 255.0;

  // The brand palette is the limit: no pure black, no pure white, whatever the scene did.
  o = vec4(clamp(col, vec3(0.0510, 0.0510, 0.0549), vec3(0.8863, 0.8863, 0.9020)), 1.0);
}`;
