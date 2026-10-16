import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, Grain, rand, smooth, TAU, Vignette } from './fx';

type RGB = [number, number, number];
const mix = (a: RGB, b: RGB, p: number) => a.map((v, i) => Math.round(v + (b[i]! - v) * p)) as RGB;
const css = (c: RGB, alpha = 1) => `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;

/** Glass bays: x, y, width, height, how brightly the room burns. A few burn brighter, which reads as rooms rather than one lit slab. */
const BAYS: Array<[number, number, number, number, number]> = [
  [262, 438, 150, 98, 0.9],
  [418, 438, 150, 98, 0.5],
  [574, 438, 150, 98, 1],
  [730, 438, 150, 98, 0.65],
  [886, 438, 138, 98, 0.85],
  [392, 338, 168, 86, 0.55],
  [566, 338, 168, 86, 1],
  [740, 338, 168, 86, 0.7],
  [914, 338, 188, 86, 0.45],
];

const POOL = { x: 262, y: 548, w: 760, h: 62 };

/**
 * A glass-fronted villa on a headland over the water as the day turns to dusk and back (a cosine, so the 8-second loop is seamless):
 * the sky warms, a layer of real noise-built cloud takes the light on its underside, the stars come out, the far shore lights up, the
 * rooms glow, and the pool gives the house back, disturbed by a slow ripple. Depth comes from atmosphere and material rather than from
 * detail: haze at the horizon, bloom around the lit glass, shadow under the roof slabs, stone and timber, cypresses with a rim of dusk
 * light. Abstract on purpose: a concept render, not a photograph of a real property.
 */
export function Estate() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const loop = frame / durationInFrames;
  const p = 0.5 - 0.5 * Math.cos(loop * TAU); // 0 = day, 1 = dusk
  const zoom = 1 + 0.1 * p;
  const skyTop = mix([36, 50, 76], [9, 11, 22], p);
  const skyMid = mix([86, 108, 140], [54, 36, 48], p);
  const skyHorizon = mix([170, 188, 208], [222, 128, 74], p);
  const ground = mix([38, 44, 54], [7, 8, 12], p);
  const glow = 0.12 + 0.62 * p;
  const streak = 18 + 64 * (0.5 + 0.5 * Math.sin(loop * TAU));
  const glassSky = mix(skyMid, skyHorizon, 0.5);
  const cloudTint = mix([205, 214, 228], [255, 170, 118], p);
  // the cloud deck slides exactly one tile (1280 px) per loop, so the picture repeats
  const drift = -1280 * loop;
  const ripple = 7 + 3 * Math.sin(loop * TAU);

  const reflection = (
    <g>
      {BAYS.map(([x, y, w, h, k], i) => (
        <rect key={i} x={x} y={y} width={w - 4} height={h - 4} fill={css([255, 190, 120], glow * k)} />
      ))}
      <rect x="226" y="424" width="840" height="8" fill="rgba(226,226,230,0.55)" />
      <rect x="250" y="430" width="790" height="108" fill="rgba(11,12,16,0.5)" />
    </g>
  );

  return (
    <AbsoluteFill style={{ background: '#0D0D0E', overflow: 'hidden' }}>
      <svg width="1280" height="720" viewBox="0 0 1280 720">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={css(skyTop)} />
            <stop offset="0.42" stopColor={css(skyMid)} />
            <stop offset="0.76" stopColor={css(skyHorizon)} />
          </linearGradient>
          <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={css(mix(skyHorizon, ground, 0.3))} />
            <stop offset="1" stopColor={css(ground)} />
          </linearGradient>
          <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={css(mix(skyHorizon, ground, 0.62))} />
            <stop offset="0.3" stopColor={css(ground)} />
            <stop offset="1" stopColor="#060608" />
          </linearGradient>
          <linearGradient id="shore" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={css(mix([58, 64, 82], [26, 20, 28], p))} />
            <stop offset="1" stopColor={css(mix([74, 80, 98], [14, 12, 18], p))} />
          </linearGradient>
          <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={css(skyHorizon, 0)} />
            <stop offset="0.5" stopColor={css(skyHorizon, 0.34)} />
            <stop offset="1" stopColor={css(skyHorizon, 0)} />
          </linearGradient>
          <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="rgb(255,170,90)" stopOpacity={0.85 * p} />
            <stop offset="1" stopColor="rgb(255,170,90)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="streak" x1="0" y1="0" x2="1" y2="0.2">
            <stop offset={`${streak - 14}%`} stopColor="#E2E2E6" stopOpacity="0" />
            <stop offset={`${streak}%`} stopColor="#E2E2E6" stopOpacity="0.2" />
            <stop offset={`${streak + 14}%`} stopColor="#E2E2E6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={css(glassSky, 0.38)} />
            <stop offset="0.55" stopColor={css(glassSky, 0.08)} />
            <stop offset="1" stopColor={css(glassSky, 0)} />
          </linearGradient>
          <linearGradient id="room" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0a0b10" stopOpacity="0.85" />
            <stop offset="0.5" stopColor="#0a0b10" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="under" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#050608" stopOpacity="0.62" />
            <stop offset="1" stopColor="#050608" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="slab" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#E2E2E6" stopOpacity="0.95" />
            <stop offset="1" stopColor="#9a9ba3" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="plinth" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2c2d34" />
            <stop offset="1" stopColor="#14151a" />
          </linearGradient>
          <linearGradient id="tree" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#040507" />
            <stop offset="0.62" stopColor="#07090d" />
            <stop offset="1" stopColor={css(mix([46, 54, 68], [96, 54, 36], p))} />
          </linearGradient>
          <linearGradient id="spill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgb(255,190,120)" stopOpacity={0.34 * p} />
            <stop offset="1" stopColor="rgb(255,190,120)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="poolfade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#E2E2E6" stopOpacity="1" />
            <stop offset="1" stopColor="#E2E2E6" stopOpacity="0" />
          </linearGradient>
          <mask id="poolmask">
            <rect x={POOL.x} y={POOL.y} width={POOL.w} height={POOL.h} fill="url(#poolfade)" />
          </mask>
          <filter id="foliage" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.11 0.07" numOctaves="2" seed="5" result="f" />
            <feDisplacementMap in="SourceGraphic" in2="f" scale="9" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="bloom" x="-20%" y="-30%" width="140%" height="160%">
            <feGaussianBlur stdDeviation="16" />
          </filter>
          <filter id="water" x="0" y="0" width="1280" height="720" filterUnits="userSpaceOnUse">
            <feTurbulence type="fractalNoise" baseFrequency="0.004 0.22" numOctaves="2" seed="7" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={ripple} xChannelSelector="R" yChannelSelector="G" />
            <feGaussianBlur stdDeviation="0.8 1.4" />
          </filter>
          {/* Cloud: fractal noise turned into soft coverage. Tileable (stitchTiles), so sliding it by one tile per loop is seamless. */}
          <filter id="cloud-noise" x="0" y="0" width="1280" height="320" filterUnits="userSpaceOnUse">
            <feTurbulence type="fractalNoise" baseFrequency="0.0042 0.012" numOctaves="5" seed="3" stitchTiles="stitch" />
            <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 2.6 -0.92" />
          </filter>
          <linearGradient id="cloud-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#E2E2E6" stopOpacity="0.1" />
            <stop offset="0.35" stopColor="#E2E2E6" stopOpacity="1" />
            <stop offset="1" stopColor="#E2E2E6" stopOpacity="0" />
          </linearGradient>
          <mask id="cloud-mask">
            <rect x="0" y="0" width="1280" height="330" fill="url(#cloud-fade)" />
          </mask>
          <g id="refl">{reflection}</g>
        </defs>

        {/* sky, then a deck of real cloud that takes the light, then the stars of dusk */}
        <rect width="1280" height="720" fill="url(#sky)" />
        {Array.from({ length: 52 }, (_, i) => {
          const tw = 0.5 + 0.5 * Math.sin(loop * TAU * (1 + Math.floor(rand(i, 4) * 3)) + rand(i, 5) * TAU);
          return <circle key={i} cx={rand(i, 1) * 1280} cy={rand(i, 2) * 290} r={0.6 + rand(i, 3) * 1.1} fill="#E2E2E6" opacity={smooth((p - 0.5) / 0.4) * (0.25 + 0.55 * tw)} />;
        })}
        <ellipse cx="640" cy="528" rx="720" ry="180" fill="url(#sun)" />
        <g mask="url(#cloud-mask)" opacity={0.55 + 0.25 * p}>
          {[drift, drift + 1280].map((x, i) => (
            <g key={i} transform={`translate(${x.toFixed(2)} 0)`}>
              <rect x="0" y="0" width="1280" height="320" fill={css(cloudTint)} filter="url(#cloud-noise)" />
            </g>
          ))}
        </g>

        {/* the far shore with its lights, the water in front of it with the glitter of the dusk */}
        <path d="M0 524 L0 506 C120 494 210 500 330 504 C470 508 560 494 700 498 C860 502 980 492 1120 500 C1200 504 1250 502 1280 504 L1280 524 Z" fill="url(#shore)" />
        {Array.from({ length: 38 }, (_, i) => (
          <circle key={i} cx={16 + rand(i, 6) * 1250} cy={506 + rand(i, 7) * 14} r={0.9 + rand(i, 8) * 0.9} fill="rgb(255,196,130)" opacity={smooth((p - 0.45) / 0.4) * (0.4 + 0.5 * rand(i, 9))} />
        ))}
        <rect y="522" width="1280" height="70" fill="url(#sea)" />
        {Array.from({ length: 34 }, (_, i) => {
          const w = 24 + rand(i, 10) * 90;
          const sh = 0.5 + 0.5 * Math.sin(loop * TAU * (1 + (i % 3)) + rand(i, 11) * TAU);
          return <rect key={i} x={rand(i, 12) * 1280 - w / 2} y={526 + rand(i, 13) * 52} width={w} height={1.3} fill="rgb(255,196,130)" opacity={(0.05 + 0.4 * p) * sh} />;
        })}
        <rect y="480" width="1280" height="100" fill="url(#haze)" />
        <rect y="548" width="1280" height="172" fill="url(#ground)" />

        <g transform={`translate(640 440) scale(${zoom.toFixed(4)}) translate(-640 -440)`}>
          {/* cypresses: tall dark masses with a pointed crown and a ragged foliage edge, a rim of dusk light on the side that faces the water */}
          <g filter="url(#foliage)">
            {[
              [112, 560, 13, 96],
              [146, 566, 17, 124],
              [188, 558, 12, 84],
              [226, 562, 15, 108],
              [1098, 560, 14, 100],
              [1136, 566, 18, 130],
              [1178, 558, 12, 88],
              [1214, 563, 15, 112],
            ].map(([x, y, rx, ry], i) => {
              const cx = Number(x) + 1.3 * Math.sin(loop * TAU + i);
              const top = Number(y) - Number(ry) * 2 + 10;
              const base = Number(y) + 10;
              const r = Number(rx);
              return <path key={i} d={`M${cx} ${top} C${cx + r * 1.15} ${top + Number(ry) * 0.9} ${cx + r * 1.05} ${base - Number(ry) * 0.5} ${cx + r * 0.8} ${base} L${cx - r * 0.8} ${base} C${cx - r * 1.05} ${base - Number(ry) * 0.5} ${cx - r * 1.15} ${top + Number(ry) * 0.9} ${cx} ${top} Z`} fill="url(#tree)" />;
            })}
          </g>

          {/* the plinth the house stands on, and the light the rooms spill on it */}
          <rect x="236" y="536" width="818" height="12" fill="url(#plinth)" />
          <rect x="262" y="536" width="760" height="14" fill="url(#spill)" />

          {/* the pool in front, giving the house back through a slow ripple */}
          <rect x={POOL.x} y={POOL.y} width={POOL.w} height={POOL.h} fill="#06070b" />
          <g mask="url(#poolmask)" opacity={0.4 + 0.4 * p}>
            <g filter="url(#water)">
              <use href="#refl" transform="translate(0 1096) scale(1 -1)" />
            </g>
          </g>
          <rect x={POOL.x - 4} y={POOL.y - 2} width={POOL.w + 8} height="3" fill="rgba(226,226,230,0.5)" />

          {/* lower and upper volumes */}
          <rect x="250" y="430" width="790" height="112" fill="#0b0c10" />
          <rect x="380" y="330" width="740" height="100" fill="#0e0f14" />
          {/* a stone cheek at the end of the upper volume, and timber slats at the end of the lower one */}
          <rect x="1102" y="330" width="22" height="100" fill="#2b2b31" />
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={i} x="1102" y={336 + i * 12} width="22" height="1" fill="rgba(226,226,230,0.1)" />
          ))}
          <rect x="1024" y="438" width="16" height="98" fill="#2a1d16" />
          {Array.from({ length: 4 }, (_, i) => (
            <rect key={i} x={1026 + i * 4} y="438" width="1" height="98" fill="rgba(212,160,110,0.35)" />
          ))}

          {/* bloom around the lit glass, then the glass: dark room, sky reflected in it, the warm light, a sofa and a pendant in some rooms */}
          <g filter="url(#bloom)" opacity={0.2 + 0.6 * p}>
            {BAYS.map(([x, y, w, h, k], i) => (
              <rect key={i} x={x} y={y} width={w - 4} height={h - 4} fill={css([255, 180, 110], glow * k)} />
            ))}
          </g>
          {BAYS.map(([x, y, w, h, k], i) => (
            <g key={i}>
              <rect x={x} y={y} width={w - 4} height={h - 4} fill="rgba(180,200,220,0.08)" />
              <rect x={x} y={y} width={w - 4} height={h - 4} fill={css([255, 190, 120], glow * k)} />
              <rect x={x} y={y} width={w - 4} height={h - 4} fill="url(#room)" />
              <rect x={x} y={y + h - 14} width={w - 4} height="10" fill="rgba(11,12,16,0.45)" />
              {i % 2 === 0 ? <rect x={x + 16} y={y + h - 38} width={w - 62} height="22" rx="7" fill="rgba(8,9,13,0.5)" /> : null}
              {i % 3 === 1 ? <circle cx={x + (w - 4) / 2} cy={y + 18} r="5" fill="rgb(255,214,160)" opacity={0.2 + 0.7 * p} /> : null}
              <rect x={x} y={y} width={w - 4} height={h - 4} fill="url(#glass)" />
            </g>
          ))}
          <rect x="250" y="430" width="790" height="112" fill="url(#streak)" />
          <rect x="380" y="330" width="740" height="100" fill="url(#streak)" />

          {/* roof slabs, with the shadow they throw on the glass */}
          <rect x="250" y="432" width="790" height="16" fill="url(#under)" />
          <rect x="380" y="330" width="740" height="16" fill="url(#under)" />
          <rect x="336" y="320" width="820" height="10" fill="url(#slab)" />
          <rect x="336" y="319" width="820" height="1.5" fill="rgba(226,226,230,0.95)" />
          <rect x="226" y="424" width="840" height="8" fill="url(#slab)" opacity="0.85" />
          <rect x="250" y="540" width="790" height="6" fill="rgba(226,226,230,0.4)" />
        </g>

        <rect y={clamp(0, 0, 1)} width="1280" height="720" fill="none" />
      </svg>
      <Grain opacity={0.07} />
      <Vignette strength={0.62} inner={0.58} />
    </AbsoluteFill>
  );
}
