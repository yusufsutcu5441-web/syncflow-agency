import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';

const TAU = Math.PI * 2;

const mix = (a: [number, number, number], b: [number, number, number], p: number) => a.map((v, i) => Math.round(v + (b[i]! - v) * p)) as [number, number, number];
const css = (c: [number, number, number], alpha = 1) => `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;

/**
 * A glass-fronted villa from the air as the day turns to dusk and back (a cosine, so the 8-second loop is seamless): the sky
 * warms at the horizon, the interior lights come up, the camera drifts slowly in and out. Abstract on purpose: it is a
 * concept render, not a photograph of a real property.
 */
export function Estate() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const loop = frame / durationInFrames;
  const p = 0.5 - 0.5 * Math.cos(loop * TAU); // 0 = day, 1 = dusk
  const zoom = 1 + 0.12 * p;
  const skyTop = mix([42, 56, 80], [8, 10, 20], p);
  const skyHorizon = mix([168, 186, 205], [214, 122, 70], p);
  const ground = mix([40, 46, 56], [6, 7, 11], p);
  const glow = 0.1 + 0.6 * p;
  const streak = 20 + 60 * (0.5 + 0.5 * Math.sin(loop * TAU));

  // Glass bays: x, y, width, height. A few bays burn a little brighter, which reads as rooms rather than one lit slab.
  const bays: Array<[number, number, number, number, number]> = [
    [262, 438, 150, 98, 0.9],
    [418, 438, 150, 98, 0.55],
    [574, 438, 150, 98, 1],
    [730, 438, 150, 98, 0.7],
    [886, 438, 138, 98, 0.85],
    [392, 338, 168, 86, 0.6],
    [566, 338, 168, 86, 1],
    [740, 338, 168, 86, 0.75],
    [914, 338, 188, 86, 0.5],
  ];

  return (
    <AbsoluteFill style={{ background: '#0D0D0E', overflow: 'hidden' }}>
      <svg width="1280" height="720" viewBox="0 0 1280 720">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={css(skyTop)} />
            <stop offset="0.72" stopColor={css(skyHorizon)} />
          </linearGradient>
          <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={css(mix(skyHorizon, ground, 0.55))} />
            <stop offset="0.5" stopColor={css(ground)} />
            <stop offset="1" stopColor="#030304" />
          </linearGradient>
          <linearGradient id="reflect" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#E2E2E6" stopOpacity="0.5" />
            <stop offset="1" stopColor="#E2E2E6" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="rgb(255,170,90)" stopOpacity={0.75 * p} />
            <stop offset="1" stopColor="rgb(255,170,90)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="streak" x1="0" y1="0" x2="1" y2="0.2">
            <stop offset={`${streak - 14}%`} stopColor="#E2E2E6" stopOpacity="0" />
            <stop offset={`${streak}%`} stopColor="#E2E2E6" stopOpacity="0.2" />
            <stop offset={`${streak + 14}%`} stopColor="#E2E2E6" stopOpacity="0" />
          </linearGradient>
        </defs>

        <rect width="1280" height="720" fill="url(#sky)" />
        <ellipse cx="640" cy="528" rx="640" ry="150" fill="url(#sun)" />
        <rect y="528" width="1280" height="192" fill="url(#ground)" />

        <g transform={`translate(640 440) scale(${zoom.toFixed(4)}) translate(-640 -440)`}>
          {/* trees: soft dark masses */}
          <ellipse cx="170" cy="500" rx="150" ry="70" fill="#050608" opacity="0.9" />
          <ellipse cx="1130" cy="504" rx="170" ry="76" fill="#050608" opacity="0.9" />

          {/* the pool in front, mirroring the house */}
          <rect x="262" y="548" width="760" height="64" fill="#06070b" />
          <g opacity={0.25 + 0.25 * p} transform="translate(0 1100) scale(1 -1)">
            {bays.map(([x, y, w, h, k], i) => (
              <rect key={i} x={x} y={y} width={w - 4} height={h - 4} fill={css([255, 190, 120], glow * k)} />
            ))}
          </g>
          <rect x="262" y="548" width="760" height="64" fill="url(#reflect)" opacity="0.08" />

          {/* lower and upper volumes */}
          <rect x="250" y="430" width="790" height="112" fill="#0b0c10" />
          <rect x="380" y="330" width="740" height="100" fill="#0e0f14" />
          {bays.map(([x, y, w, h, k], i) => (
            <g key={i}>
              <rect x={x} y={y} width={w - 4} height={h - 4} fill="rgba(180,200,220,0.10)" />
              <rect x={x} y={y} width={w - 4} height={h - 4} fill={css([255, 190, 120], glow * k)} />
            </g>
          ))}
          <rect x="250" y="430" width="790" height="112" fill="url(#streak)" />
          <rect x="380" y="330" width="740" height="100" fill="url(#streak)" />

          {/* roof slabs */}
          <rect x="336" y="320" width="820" height="10" fill="rgba(235,238,242,0.88)" />
          <rect x="226" y="424" width="840" height="8" fill="rgba(235,238,242,0.72)" />
          <rect x="250" y="540" width="790" height="6" fill="rgba(235,238,242,0.4)" />
        </g>
      </svg>
    </AbsoluteFill>
  );
}
