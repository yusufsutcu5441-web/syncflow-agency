import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { champagne, clamp, Dust, Grain, platin, rand, TAU, Vignette } from './fx';

const VP = { x: 640, y: 330 };
const HALF = { w: 560, h: 330 };
const FOCAL = 3.2;
const SPACING = 1;
const COUNT = 9;

/** Screen scale of something at world depth w (0 = the camera). */
const scale = (w: number) => FOCAL / (FOCAL + w);

// Tones of the pale register (the clinic is the one light scene of the four): graphite for shade, a warm stone for the walls, platin for light.
const shade = (a: number) => `rgba(60,64,74,${a.toFixed(3)})`;
const stone = (a: number) => `rgba(206,204,198,${a.toFixed(3)})`;

/**
 * A pale clinic corridor in slow motion. The camera glides forward by exactly one door-to-door spacing over the 8 seconds, so
 * the set of doors and ceiling lights is identical at the start and at the end: a seamless loop. The light breathes very
 * slightly. Depth and material come from the way the light behaves: a daylit end that blooms, a wash of light on the walls under each
 * ceiling bar, a polished floor that gives the lights back, a handrail and a skirting that run to the vanishing point, door leaves with
 * a champagne lever, and the nearest doors going soft as they pass the lens. Nothing in it is a photograph or a real clinic.
 */
export function Clinic() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const loop = frame / durationInFrames;
  const breath = 1 + 0.025 * Math.sin(loop * TAU);

  const frameAt = (w: number) => {
    const s = scale(w);
    return { l: VP.x - HALF.w * s, r: VP.x + HALF.w * s, t: VP.y - HALF.h * s, b: VP.y + HALF.h * s, s };
  };
  const far = frameAt(COUNT * SPACING);

  // Doors keep their identity k (so each leaf keeps its own small difference); far to near, so near paints over far.
  const doors = Array.from({ length: COUNT }, (_, k) => ({ k, w: ((((k - loop) % COUNT) + COUNT) % COUNT) * SPACING })).sort((a, b) => b.w - a.w);

  // Lines that run along both walls to the vanishing point: cove at the ceiling, handrail, skirting.
  const wallLine = (f: number, side: 'l' | 'r') => {
    const near = f * 720;
    const toFar = far.t + f * (far.b - far.t);
    return { x1: side === 'l' ? 0 : 1280, y1: near, x2: side === 'l' ? far.l : far.r, y2: toFar };
  };
  const lines = [
    { f: 0.045, stroke: platin(0.55), width: 3 },
    { f: 0.6, stroke: stone(0.5), width: 2.4 },
    { f: 0.605, stroke: platin(0.55), width: 1 },
    { f: 0.93, stroke: shade(0.38), width: 3 },
  ];

  return (
    <AbsoluteFill style={{ background: '#d9dce1', overflow: 'hidden', filter: `brightness(${breath.toFixed(4)}) contrast(1.12)` }}>
      <svg width="1280" height="720" viewBox="0 0 1280 720">
        <defs>
          <linearGradient id="ceiling" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#dedfe3" />
            <stop offset="1" stopColor="#c4c7ce" />
          </linearGradient>
          <linearGradient id="floor" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#5d626d" />
            <stop offset="0.55" stopColor="#9a9ea8" />
            <stop offset="1" stopColor="#c6c9d0" />
          </linearGradient>
          <linearGradient id="wall-l" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#8f8a83" />
            <stop offset="0.6" stopColor="#bdb8af" />
            <stop offset="1" stopColor="#dcd7ce" />
          </linearGradient>
          <linearGradient id="wall-r" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0" stopColor="#8f8a83" />
            <stop offset="0.6" stopColor="#bdb8af" />
            <stop offset="1" stopColor="#dcd7ce" />
          </linearGradient>
          <radialGradient id="end" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#f6f7fa" stopOpacity="1" />
            <stop offset="0.5" stopColor="#eef0f4" stopOpacity="0.55" />
            <stop offset="1" stopColor="#E2E2E6" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="wash" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#f8f8fa" stopOpacity="0.5" />
            <stop offset="1" stopColor="#f8f8fa" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="bar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f8f8fa" />
            <stop offset="1" stopColor="#E2E2E6" />
          </linearGradient>
          <linearGradient id="leaf" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#5e4f40" stopOpacity="0.86" />
            <stop offset="0.5" stopColor="#7a6a58" stopOpacity="0.8" />
            <stop offset="1" stopColor="#5e4f40" stopOpacity="0.86" />
          </linearGradient>
          <linearGradient id="refl" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f6f7fa" stopOpacity="0.62" />
            <stop offset="1" stopColor="#f6f7fa" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f6f7fa" stopOpacity="0.45" />
            <stop offset="1" stopColor="#f6f7fa" stopOpacity="0" />
          </linearGradient>
          <filter id="bloom" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="26" />
          </filter>
          <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <filter id="feather" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>

        {/* ceiling, floor and the two walls, as trapezoids between the near frame and the far frame */}
        <polygon points={`0,0 1280,0 ${far.r},${far.t} ${far.l},${far.t}`} fill="url(#ceiling)" />
        <polygon points={`0,720 1280,720 ${far.r},${far.b} ${far.l},${far.b}`} fill="url(#floor)" />
        <polygon points={`0,0 0,720 ${far.l},${far.b} ${far.l},${far.t}`} fill="url(#wall-l)" />
        <polygon points={`1280,0 1280,720 ${far.r},${far.b} ${far.r},${far.t}`} fill="url(#wall-r)" />
        {lines.map(({ f, stroke, width }) =>
          (['l', 'r'] as const).map((side) => {
            const { x1, y1, x2, y2 } = wallLine(f, side);
            return <line key={`${f}-${side}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={width} />;
          }),
        )}

        {/* the daylit end of the corridor, blooming, and the light it lays down the floor */}
        <rect x={far.l} y={far.t} width={far.r - far.l} height={far.b - far.t} fill="#ebecf0" filter="url(#feather)" />
        <ellipse cx={VP.x} cy={VP.y} rx="260" ry="190" fill="url(#end)" opacity="0.6" filter="url(#bloom)" />
        <ellipse cx={VP.x} cy={VP.y} rx="150" ry="110" fill="url(#end)" opacity="0.8" />
        <polygon points={`${VP.x - 60},${far.b - 4} ${VP.x + 60},${far.b - 4} ${VP.x + 420},720 ${VP.x - 420},720`} fill="url(#beam)" filter="url(#feather)" />

        {doors.map(({ k, w }) => {
          const door = frameAt(w);
          const lw = (w + SPACING / 2) % (COUNT * SPACING);
          const light = frameAt(lw);
          // Doors appear softly in the distance and dissolve as they pass the camera: the wrap-around is invisible.
          const fade = Math.min(1, Math.max(0, (COUNT * SPACING - w) / 2)) * Math.min(1, Math.max(0, w / 0.5));
          const lightFade = Math.min(1, Math.max(0, (COUNT * SPACING - lw) / 2)) * Math.min(1, Math.max(0, lw / 0.5));
          const doorW = 70 * door.s;
          const doorTop = door.t + 112 * door.s;
          const doorH = door.b - door.t - 150 * door.s;
          const blur = clamp((1.1 - w) * 5, 0, 4.5);
          const handleY = doorTop + doorH * 0.55;
          const inset = 18 * door.s;
          // each leaf is a hair different in tone, so the row does not read as a copy
          const tone = 0.85 + 0.3 * rand(k, 2);
          return (
            <g key={k}>
              {/* the ceiling bar between this door and the next: a glow behind it, the bar, its reflection in the floor, and a wash on both walls */}
              <g opacity={lightFade}>
                <ellipse cx={light.l + 60 * light.s} cy={VP.y - 0.15 * HALF.h * light.s} rx={150 * light.s} ry={190 * light.s} fill="url(#wash)" />
                <ellipse cx={light.r - 60 * light.s} cy={VP.y - 0.15 * HALF.h * light.s} rx={150 * light.s} ry={190 * light.s} fill="url(#wash)" />
                <rect x={VP.x - 130 * light.s} y={light.t + 2 * light.s} width={260 * light.s} height={26 * light.s} rx={13 * light.s} fill="#f8f8fa" opacity="0.55" filter="url(#soft)" />
                <rect x={VP.x - 120 * light.s} y={light.t + 6 * light.s} width={240 * light.s} height={12 * light.s} rx={6 * light.s} fill="url(#bar)" />
                <ellipse cx={VP.x} cy={light.b - 12 * light.s} rx={118 * light.s} ry={13 * light.s} fill="url(#refl)" filter="url(#feather)" />
              </g>
              {/* the door leaves on both side walls, with a jamb, a dark gap at the floor, and a lever in champagne */}
              <g opacity={fade} style={blur > 0.25 ? { filter: `blur(${blur.toFixed(2)}px)` } : undefined}>
                <line x1={door.l} x2={door.l} y1={door.t} y2={door.b} stroke={shade(0.22)} strokeWidth={Math.max(1, 1.4 * door.s)} />
                <line x1={door.r} x2={door.r} y1={door.t} y2={door.b} stroke={shade(0.22)} strokeWidth={Math.max(1, 1.4 * door.s)} />
                {([door.l + inset, door.r - inset - doorW] as const).map((x, side) => (
                  <g key={side}>
                    <rect x={x - 4 * door.s} y={doorTop - 4 * door.s} width={doorW + 8 * door.s} height={doorH + 4 * door.s} fill={champagne(0.62 * tone)} />
                    <rect x={x} y={doorTop} width={doorW} height={doorH} fill="url(#leaf)" />
                    <rect x={x} y={doorTop} width={doorW} height={Math.max(1, 2 * door.s)} fill={shade(0.3)} />
                    <rect x={x} y={doorTop + doorH - 2 * door.s} width={doorW} height={Math.max(1, 3 * door.s)} fill={shade(0.55)} />
                    <rect x={x + (side === 0 ? doorW * 0.78 : doorW * 0.1)} y={handleY} width={doorW * 0.12} height={Math.max(1.5, 5 * door.s)} rx={2 * door.s} fill={champagne(0.95)} />
                  </g>
                ))}
              </g>
            </g>
          );
        })}

        {/* motes turning slowly in the daylight at the end of the corridor */}
        <Dust loop={loop} count={40} area={[420, 150, 440, 420]} color={platin(1)} size={1.4} alpha={0.5} seed={9} />
      </svg>
      <Grain opacity={0.06} />
      <Vignette strength={0.72} inner={0.5} />
    </AbsoluteFill>
  );
}
