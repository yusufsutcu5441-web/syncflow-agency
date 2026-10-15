import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { champagne, clamp, Dust, Grain, obsidian, platin, rand, TAU, Vignette } from './fx';

const VP = { x: 640, y: 340 };
const HALF = { w: 600, h: 340 };
const FOCAL = 3;
const SPACING = 1;
const COUNT = 9;

/** Screen scale of something at world depth w (0 = the camera). */
const scale = (w: number) => FOCAL / (FOCAL + w);

/**
 * A dark stone colonnade receding towards one lit doorway: the quiet entrance of a counsel's office. The camera glides forward by
 * exactly one column spacing over the 8 seconds, so the set of columns is identical at the start and at the end (a seamless loop),
 * and the light in the doorway breathes very slightly. Depth comes from light and material, not from detail: a volume of light with
 * dust in it, polished stone that reflects the columns, stone coursing on the walls, veining on the shafts, and the nearest columns
 * going soft as they pass the lens. Abstract on purpose: it is a concept render, not a photograph of a real firm. Palette only:
 * obsidian, the two layers, platin, and champagne for the doorway (the one warm highlight).
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

  // Columns keep their identity k (so the veining stays put on each shaft); far to near, so near paints over far.
  const columns = Array.from({ length: COUNT }, (_, k) => ({ k, w: ((((k - loop) % COUNT) + COUNT) % COUNT) * SPACING })).sort((a, b) => b.w - a.w);

  // Stone coursing on both walls: horizontal joints converging on the vanishing point.
  const courses = Array.from({ length: 9 }, (_, i) => (i + 1) / 10);

  return (
    <AbsoluteFill style={{ background: '#0D0D0E', overflow: 'hidden' }}>
      <svg width="1280" height="720" viewBox="0 0 1280 720">
        <defs>
          <linearGradient id="floor" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#0f0f11" />
            <stop offset="0.55" stopColor="#17171a" />
            <stop offset="1" stopColor="#1f1f24" />
          </linearGradient>
          <linearGradient id="ceiling" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0D0D0E" />
            <stop offset="1" stopColor="#151518" />
          </linearGradient>
          <linearGradient id="wall-l" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#0D0D0E" />
            <stop offset="1" stopColor="#18181c" />
          </linearGradient>
          <linearGradient id="wall-r" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0" stopColor="#0D0D0E" />
            <stop offset="1" stopColor="#18181c" />
          </linearGradient>
          <radialGradient id="door" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#D4C5A9" stopOpacity="0.98" />
            <stop offset="0.45" stopColor="#D4C5A9" stopOpacity="0.4" />
            <stop offset="1" stopColor="#D4C5A9" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="pool" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#D4C5A9" stopOpacity="0.42" />
            <stop offset="0.6" stopColor="#D4C5A9" stopOpacity="0.1" />
            <stop offset="1" stopColor="#D4C5A9" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="cone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#D4C5A9" stopOpacity="0.2" />
            <stop offset="0.7" stopColor="#D4C5A9" stopOpacity="0.05" />
            <stop offset="1" stopColor="#D4C5A9" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="shaft" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#141416" />
            <stop offset="0.55" stopColor="#202025" />
            <stop offset="1" stopColor="#2a2a30" />
          </linearGradient>
          <linearGradient id="shaft-r" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0" stopColor="#141416" />
            <stop offset="0.55" stopColor="#202025" />
            <stop offset="1" stopColor="#2a2a30" />
          </linearGradient>
          <linearGradient id="mirror" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#E2E2E6" stopOpacity="0.11" />
            <stop offset="1" stopColor="#E2E2E6" stopOpacity="0" />
          </linearGradient>
          <filter id="bloom" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="30" />
          </filter>
          <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="12" />
          </filter>
          <filter id="feather" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>

        {/* ceiling, floor and the two walls, as trapezoids between the near frame and the far frame */}
        <polygon points={`0,0 1280,0 ${far.r},${far.t} ${far.l},${far.t}`} fill="url(#ceiling)" />
        <polygon points={`0,720 1280,720 ${far.r},${far.b} ${far.l},${far.b}`} fill="url(#floor)" />
        <polygon points={`0,0 0,720 ${far.l},${far.b} ${far.l},${far.t}`} fill="url(#wall-l)" />
        <polygon points={`1280,0 1280,720 ${far.r},${far.b} ${far.r},${far.t}`} fill="url(#wall-r)" />
        {courses.map((f) => {
          const near = f * 720;
          const toFar = far.t + f * (far.b - far.t);
          return (
            <g key={f} stroke={platin(0.045)} strokeWidth="1">
              <line x1="0" y1={near} x2={far.l} y2={toFar} />
              <line x1="1280" y1={near} x2={far.r} y2={toFar} />
            </g>
          );
        })}

        {/* the doorway at the end, the light spilling down the floor, and the volume of light in the air */}
        <rect x={far.l} y={far.t} width={far.r - far.l} height={far.b - far.t} fill="#1c1b19" />
        <ellipse cx={VP.x} cy={VP.y + 14} rx="300" ry="230" fill="url(#door)" opacity={breath * 0.55} filter="url(#bloom)" />
        <ellipse cx={VP.x} cy={VP.y + 18} rx="230" ry="190" fill="url(#door)" opacity={breath} />
        <polygon points={`${far.l + 30},${far.t + 24} ${far.r - 30},${far.t + 24} 1010,720 270,720`} fill="url(#cone)" opacity={breath} filter="url(#soft)" />
        <polygon points={`${VP.x - 70},${far.b - 60} ${VP.x + 70},${far.b - 60} ${VP.x + 460},720 ${VP.x - 460},720`} fill="url(#pool)" opacity={breath} filter="url(#feather)" />

        {/* columns, far to near */}
        {columns.map(({ k, w }) => {
          const c = frameAt(w);
          // columns surface softly in the distance and dissolve as they pass the camera: the wrap-around is invisible
          const fade = Math.min(1, Math.max(0, (COUNT * SPACING - w) / 2.5)) * Math.min(1, Math.max(0, w / 0.6));
          const colW = 96 * c.s;
          const inset = 14 * c.s;
          const hgt = c.b - c.t;
          // the nearest columns drift out of focus as they pass the lens
          const blur = clamp((1.2 - w) * 5, 0, 5);
          const lx = c.l + inset;
          const rx = c.r - inset - colW;
          const hair = Math.max(1, 1.2 * c.s);
          return (
            <g key={k} opacity={fade} style={blur > 0.25 ? { filter: `blur(${blur.toFixed(2)}px)` } : undefined}>
              {/* floor joint and ceiling beam at this depth */}
              <line x1={c.l} x2={c.r} y1={c.b} y2={c.b} stroke={platin(0.08)} strokeWidth={Math.max(1, 2 * c.s)} />
              <line x1={c.l} x2={c.r} y1={c.t} y2={c.t} stroke={platin(0.1)} strokeWidth={Math.max(1, 2 * c.s)} />
              {/* the polished floor gives the columns back, faintly */}
              <rect x={lx} y={c.b} width={colW} height={hgt * 0.2} fill="url(#mirror)" />
              <rect x={rx} y={c.b} width={colW} height={hgt * 0.2} fill="url(#mirror)" />
              {/* shafts: lit on the side that faces the doorway, veined, with a plinth and a capital */}
              <rect x={lx} y={c.t} width={colW} height={hgt} fill="url(#shaft)" />
              <rect x={rx} y={c.t} width={colW} height={hgt} fill="url(#shaft-r)" />
              {[0, 1, 2].map((v) => {
                const f = 0.18 + 0.64 * rand(k, v + 1);
                return (
                  <g key={v} stroke={platin(0.05)} strokeWidth={hair}>
                    <line x1={lx + colW * f} x2={lx + colW * (f + 0.05)} y1={c.t} y2={c.b} />
                    <line x1={rx + colW * (1 - f)} x2={rx + colW * (0.95 - f)} y1={c.t} y2={c.b} />
                  </g>
                );
              })}
              <rect x={lx - 5 * c.s} y={c.b - 20 * c.s} width={colW + 10 * c.s} height={20 * c.s} fill="#26262b" />
              <rect x={rx - 5 * c.s} y={c.b - 20 * c.s} width={colW + 10 * c.s} height={20 * c.s} fill="#26262b" />
              <rect x={lx - 5 * c.s} y={c.t} width={colW + 10 * c.s} height={16 * c.s} fill="#26262b" />
              <rect x={rx - 5 * c.s} y={c.t} width={colW + 10 * c.s} height={16 * c.s} fill="#26262b" />
              <rect x={lx + colW - 3 * c.s} y={c.t} width={Math.max(1.2, 3 * c.s)} height={hgt} fill={platin(0.42)} />
              <rect x={rx} y={c.t} width={Math.max(1.2, 3 * c.s)} height={hgt} fill={platin(0.42)} />
            </g>
          );
        })}

        {/* dust turning slowly in the light */}
        <Dust loop={loop} count={46} area={[300, 120, 680, 560]} color={champagne(1)} size={1.5} alpha={0.55} seed={3} />
        <rect width="1280" height="720" fill={obsidian(0)} />
      </svg>
      <Grain opacity={0.075} />
      <Vignette strength={0.78} inner={0.5} />
    </AbsoluteFill>
  );
}
