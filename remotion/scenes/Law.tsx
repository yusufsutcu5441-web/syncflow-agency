import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';

const TAU = Math.PI * 2;
const VP = { x: 640, y: 340 };
const HALF = { w: 600, h: 340 };
const FOCAL = 3;
const SPACING = 1;
const COUNT = 9;

/** Screen scale of something at world depth w (0 = the camera). */
const scale = (w: number) => FOCAL / (FOCAL + w);

/**
 * A dark colonnade receding towards one lit doorway: the quiet entrance of a counsel's office. The camera glides forward by
 * exactly one column spacing over the 8 seconds, so the set of columns is identical at the start and at the end (a seamless
 * loop), and the light in the doorway breathes very slightly. Abstract on purpose: it is a concept render, not a photograph of
 * a real firm. Palette only: obsidian, the two layers, platin, and champagne for the doorway (the one warm highlight).
 */
export function Law() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const loop = frame / durationInFrames;
  const breath = 0.86 + 0.14 * (0.5 - 0.5 * Math.cos(loop * TAU * 2));

  const frameAt = (w: number) => {
    const s = scale(w);
    return { l: VP.x - HALF.w * s, r: VP.x + HALF.w * s, t: VP.y - HALF.h * s, b: VP.y + HALF.h * s, s };
  };
  const far = frameAt(COUNT * SPACING);

  // World depths of the columns; the nearest slides past the camera and the rest follow. Far to near, so near paints over far.
  const depths = Array.from({ length: COUNT }, (_, k) => ((((k - loop) % COUNT) + COUNT) % COUNT) * SPACING).sort((a, b) => b - a);

  return (
    <AbsoluteFill style={{ background: '#0D0D0E', overflow: 'hidden' }}>
      <svg width="1280" height="720" viewBox="0 0 1280 720">
        <defs>
          <linearGradient id="floor" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#141416" />
            <stop offset="1" stopColor="#1A1A1E" />
          </linearGradient>
          <linearGradient id="ceiling" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0D0D0E" />
            <stop offset="1" stopColor="#141416" />
          </linearGradient>
          <radialGradient id="door" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#D4C5A9" stopOpacity="0.95" />
            <stop offset="0.5" stopColor="#D4C5A9" stopOpacity="0.38" />
            <stop offset="1" stopColor="#D4C5A9" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="pool" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#D4C5A9" stopOpacity="0.34" />
            <stop offset="1" stopColor="#D4C5A9" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="vignette" cx="0.5" cy="0.48" r="0.75">
            <stop offset="0.55" stopColor="#0D0D0E" stopOpacity="0" />
            <stop offset="1" stopColor="#0D0D0E" stopOpacity="0.75" />
          </radialGradient>
        </defs>

        {/* ceiling, floor and the two walls, as trapezoids between the near frame and the far frame */}
        <polygon points={`0,0 1280,0 ${far.r},${far.t} ${far.l},${far.t}`} fill="url(#ceiling)" />
        <polygon points={`0,720 1280,720 ${far.r},${far.b} ${far.l},${far.b}`} fill="url(#floor)" />
        <polygon points={`0,0 0,720 ${far.l},${far.b} ${far.l},${far.t}`} fill="#0D0D0E" />
        <polygon points={`1280,0 1280,720 ${far.r},${far.b} ${far.r},${far.t}`} fill="#0D0D0E" />

        {/* the doorway at the end, and its light spilling down the floor */}
        <rect x={far.l} y={far.t} width={far.r - far.l} height={far.b - far.t} fill="#141416" />
        <ellipse cx={VP.x} cy={VP.y + 18} rx="230" ry="190" fill="url(#door)" opacity={breath} />
        <polygon points={`${VP.x - 60},${far.b - 70} ${VP.x + 60},${far.b - 70} ${VP.x + 440},720 ${VP.x - 440},720`} fill="url(#pool)" opacity={breath} />

        {depths.map((w) => {
          const c = frameAt(w);
          // columns surface softly in the distance and dissolve as they pass the camera: the wrap-around is invisible
          const fade = Math.min(1, Math.max(0, (COUNT * SPACING - w) / 2.5)) * Math.min(1, Math.max(0, w / 0.6));
          const colW = 96 * c.s;
          const inset = 14 * c.s;
          return (
            <g key={w} opacity={fade}>
              {/* floor joint and ceiling beam at this depth */}
              <line x1={c.l} x2={c.r} y1={c.b} y2={c.b} stroke="#E2E2E6" strokeOpacity="0.07" strokeWidth={Math.max(1, 2 * c.s)} />
              <line x1={c.l} x2={c.r} y1={c.t} y2={c.t} stroke="#E2E2E6" strokeOpacity="0.09" strokeWidth={Math.max(1, 2 * c.s)} />
              {/* the two columns: a body in the second layer, and a lit edge on the side that faces the corridor */}
              <rect x={c.l + inset} y={c.t} width={colW} height={c.b - c.t} fill="#1A1A1E" />
              <rect x={c.l + inset + colW - 3 * c.s} y={c.t} width={Math.max(1.2, 3 * c.s)} height={c.b - c.t} fill="#E2E2E6" opacity="0.4" />
              <rect x={c.r - inset - colW} y={c.t} width={colW} height={c.b - c.t} fill="#1A1A1E" />
              <rect x={c.r - inset - colW} y={c.t} width={Math.max(1.2, 3 * c.s)} height={c.b - c.t} fill="#E2E2E6" opacity="0.4" />
            </g>
          );
        })}

        <rect width="1280" height="720" fill="url(#vignette)" />
      </svg>
    </AbsoluteFill>
  );
}
