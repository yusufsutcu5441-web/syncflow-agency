import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';

const TAU = Math.PI * 2;
const VP = { x: 640, y: 330 };
const HALF = { w: 560, h: 330 };
const FOCAL = 3.2;
const SPACING = 1;
const COUNT = 9;

/** Screen scale of something at world depth w (0 = the camera). */
const scale = (w: number) => FOCAL / (FOCAL + w);

/**
 * A pale clinic corridor in slow motion. The camera glides forward by exactly one door-to-door spacing over the 8 seconds, so
 * the set of doors and ceiling lights is identical at the start and at the end: a seamless loop. The light breathes very
 * slightly. Nothing in it is a photograph or a real clinic.
 */
export function Clinic() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const loop = frame / durationInFrames;
  const breath = 1 + 0.025 * Math.sin(loop * TAU);

  // World depths of the doors; the nearest one slides past the camera and the rest follow.
  const depths = Array.from({ length: COUNT }, (_, k) => (((k - loop) % COUNT) + COUNT) % COUNT * SPACING);
  const sorted = [...depths].sort((a, b) => b - a); // far to near, so near ones paint over far ones

  const rect = (w: number) => {
    const s = scale(w);
    return { l: VP.x - HALF.w * s, r: VP.x + HALF.w * s, t: VP.y - HALF.h * s, b: VP.y + HALF.h * s, s };
  };
  const far = rect(COUNT * SPACING);

  return (
    <AbsoluteFill style={{ background: '#d9dce1', overflow: 'hidden', filter: `brightness(${breath.toFixed(4)})` }}>
      <svg width="1280" height="720" viewBox="0 0 1280 720">
        <defs>
          <linearGradient id="ceiling" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f5f6f8" />
            <stop offset="1" stopColor="#e6e8ec" />
          </linearGradient>
          <linearGradient id="floor" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#9aa0aa" />
            <stop offset="1" stopColor="#cfd3da" />
          </linearGradient>
          <linearGradient id="wall" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#c6cbd3" />
            <stop offset="1" stopColor="#e9ebee" />
          </linearGradient>
          <radialGradient id="end" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#E2E2E6" stopOpacity="1" />
            <stop offset="1" stopColor="#E2E2E6" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* walls, ceiling, floor as trapezoids between the near frame and the far frame */}
        <polygon points={`0,0 1280,0 ${far.r},${far.t} ${far.l},${far.t}`} fill="url(#ceiling)" />
        <polygon points={`0,720 1280,720 ${far.r},${far.b} ${far.l},${far.b}`} fill="url(#floor)" />
        <polygon points={`0,0 0,720 ${far.l},${far.b} ${far.l},${far.t}`} fill="url(#wall)" />
        <polygon points={`1280,0 1280,720 ${far.r},${far.b} ${far.r},${far.t}`} fill="url(#wall)" style={{ transform: 'scaleX(1)' }} />
        <rect x={far.l} y={far.t} width={far.r - far.l} height={far.b - far.t} fill="#f4f5f7" />
        <ellipse cx={VP.x} cy={VP.y} rx="150" ry="110" fill="url(#end)" opacity="0.95" />

        {sorted.map((w) => {
          const door = rect(w);
          const lightW = (w + SPACING / 2) % (COUNT * SPACING);
          const light = rect(lightW);
          // Doors appear softly in the distance and dissolve as they pass the camera: the wrap-around is invisible.
          const fade = Math.min(1, Math.max(0, (COUNT * SPACING - w) / 2)) * Math.min(1, Math.max(0, w / 0.5));
          const doorWidth = 70 * door.s;
          return (
            <g key={w} opacity={fade}>
              {/* ceiling light bar */}
              <rect x={VP.x - 120 * light.s} y={light.t + 6 * light.s} width={240 * light.s} height={12 * light.s} rx={6 * light.s} fill="#E2E2E6" opacity="0.95" />
              {/* door frames on both side walls */}
              <rect x={door.l + 18 * door.s} y={door.t + 120 * door.s} width={doorWidth} height={(door.b - door.t) - 160 * door.s} fill="rgba(120,128,140,0.28)" />
              <rect x={door.r - 18 * door.s - doorWidth} y={door.t + 120 * door.s} width={doorWidth} height={(door.b - door.t) - 160 * door.s} fill="rgba(120,128,140,0.28)" />
              {/* floor reflection of the light bar */}
              <rect x={VP.x - 90 * light.s} y={light.b - 22 * light.s} width={180 * light.s} height={8 * light.s} rx={4 * light.s} fill="#E2E2E6" opacity="0.35" />
            </g>
          );
        })}

        <rect width="1280" height="720" fill="rgba(226,226,230,0.04)" />
      </svg>
    </AbsoluteFill>
  );
}
