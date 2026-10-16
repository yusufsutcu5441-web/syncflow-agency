import type { CSSProperties } from 'react';

/**
 * Shared finishing for the sector scenes (docs/adr/0020-case-study-layer.md): the small set of tools that give a procedural render its
 * material depth: a fixed-seed grain that also dithers the dark gradients (8-bit banding is the first thing that gives a dark render
 * away), a vignette, and drifting dust. Everything is a pure function of the loop position, so every scene stays a seamless loop.
 * Palette only: obsidian, platin and champagne; no pure black or white anywhere (the audit checks the scenes too).
 */
export const TAU = Math.PI * 2;
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (t: number) => {
  const c = clamp(t);
  return c * c * (3 - 2 * c);
};
export const fract = (v: number) => v - Math.floor(v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** A small deterministic pseudo-random number in [0, 1) for element `i` and stream `k`: the same picture on every render. */
export const rand = (i: number, k = 0) => fract(Math.sin(i * 127.1 + k * 311.7) * 43758.5453);

export const platin = (a: number) => `rgba(226,226,230,${a.toFixed(3)})`;
export const champagne = (a: number) => `rgba(212,197,169,${a.toFixed(3)})`;
export const obsidian = (a: number) => `rgba(13,13,14,${a.toFixed(3)})`;

/** Fractal noise, grey and opaque, as a still tile. The browser rasterises it once and reuses it on every frame. */
const GRAIN_TILE = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n' x='0' y='0' width='100%' height='100%'>" +
    "<feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' seed='11' stitchTiles='stitch'/>" +
    "<feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>",
)}")`;

/** Film grain and dither: grey noise laid over the picture with `overlay`, so it lifts the darks and tames the lights equally. */
export function Grain({ opacity = 0.07 }: { opacity?: number }) {
  const style: CSSProperties = { position: 'absolute', inset: 0, backgroundImage: GRAIN_TILE, backgroundSize: '240px 240px', opacity, mixBlendMode: 'overlay', pointerEvents: 'none' };
  return <div style={style} />;
}

/** Edges fall away to obsidian: `strength` is the opacity at the corners, `inner` where the fall-off starts (0..1 of the radius). */
export function Vignette({ strength = 0.7, inner = 0.55 }: { strength?: number; inner?: number }) {
  const style: CSSProperties = {
    position: 'absolute',
    inset: 0,
    background: `radial-gradient(ellipse 78% 82% at 50% 48%, rgba(13,13,14,0) ${Math.round(inner * 100)}%, rgba(13,13,14,${strength}) 100%)`,
    pointerEvents: 'none',
  };
  return <div style={style} />;
}

/**
 * Dust in a beam of light: `count` motes that drift along a slow closed loop (a whole number of laps per loop, so the picture repeats),
 * inside the rectangle [x, y, w, h]. Their brightness swells and fades so no mote pops in or out.
 */
export function Dust({ loop, count, area, color = champagne(1), size = 1.6, alpha = 0.5, seed = 1 }: { loop: number; count: number; area: [number, number, number, number]; color?: string; size?: number; alpha?: number; seed?: number }) {
  const [x, y, w, h] = area;
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const a = rand(i, seed);
        const b = rand(i, seed + 7);
        const c = rand(i, seed + 13);
        const phase = a * TAU;
        const px = x + w * fract(a + 0.06 * Math.sin(loop * TAU + phase) + 0.03 * Math.cos(2 * loop * TAU + b * TAU));
        const py = y + h * fract(b - loop + 0.04 * Math.sin(loop * TAU * 2 + phase)); // one full lap upward per loop
        const swell = Math.sin(fract(b - loop) * Math.PI); // 0 at both ends of the lap
        return <circle key={i} cx={px} cy={py} r={size * (0.5 + c)} fill={color} opacity={alpha * swell * (0.35 + 0.65 * c)} />;
      })}
    </g>
  );
}
