import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, Dust, Grain } from './fx';

const TAU = Math.PI * 2;

/** Pinhole camera over a dark floor: a point at lateral x, height y and depth z (world units; z grows away from the camera). */
const CX = 640;
const HORIZON = -70;
const FOCAL = 860;
const CAMERA_HEIGHT = 1.0;
const proj = (x: number, y: number, z: number): [number, number] => [CX + (FOCAL * x) / z, HORIZON + (FOCAL * (CAMERA_HEIGHT - y)) / z];

/** Palette only: obsidian, the two layers, platin, and champagne as the one warm light (the standby lane). */
const platin = (a: number) => `rgba(226,226,230,${a.toFixed(3)})`;
const champagne = (a: number) => `rgba(212,197,169,${a.toFixed(3)})`;

const Z_FAR = 9;
const Z_NEAR = 1.2;
/** Parcels per lane, and how many of them pass any depth in one loop: they move by exactly M/N of the corridor per loop, so the picture repeats. */
const N = 14;
const M = 6;

// Four lanes: two on the left and one on the right are primary, the one between them is the standby lane.
const LANES = [-1.35, -0.45, 0.45, 1.35] as const;
const STANDBY = 2;
const GUARDED = [1, 3] as const; // the primary lanes whose gate fails, one after the other, and hands over to the standby lane

/** Where a diverted parcel leaves its lane, rides the standby lane beside the gate, and comes back. */
const CURVE = { out: 3.9, outLen: 0.8, back: 2.5, backLen: 0.7, gate: 2.9 } as const;

const smooth = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};
const fract = (v: number) => v - Math.floor(v);

/** 0..1 bump that starts at loop position `a`, rises over `rise`, holds for `len` and falls over `fall`; wraps around the loop. */
const win = (u: number, a: number, len: number, rise: number, fall: number) => {
  const s = fract(u - a);
  return smooth(s / rise) * (1 - smooth((s - len) / fall));
};
/** Is loop position u inside [a, a + len] (modulo 1)? */
const inside = (u: number, a: number, len: number) => fract(u - a) <= len;

/** How far a lane's x is pulled towards the standby lane at depth z (0 = on its own lane, 1 = on the standby lane). */
const pull = (z: number) => smooth((CURVE.out - z) / CURVE.outLen) * (1 - smooth((CURVE.back - z) / CURVE.backLen));

/** The failure of each guarded lane (index into GUARDED), as loop positions. Staggered by half a loop. */
const FAILURE = [
  { fail: { a: 0.06, len: 0.28 }, divert: { a: 0.96, len: 0.34 }, lit: { a: 0.04, len: 0.38 } },
  { fail: { a: 0.56, len: 0.28 }, divert: { a: 0.46, len: 0.34 }, lit: { a: 0.54, len: 0.34 } },
] as const;

const zAtProgress = (p: number) => Z_FAR - p * (Z_FAR - Z_NEAR);
const progressAtZ = (z: number) => (Z_FAR - z) / (Z_FAR - Z_NEAR);

type Item = { z: number; node: React.ReactNode };

/**
 * A freight corridor at night: parallel lanes recede to a pale horizon, parcels flow towards the viewer and a gate stands over each
 * lane. Twice in the 8 seconds a gate goes quiet; the lane beside it, the standby lane, lights up in champagne, the parcels that
 * would have met the failure ride it around the gate and rejoin their own lane, and the flow does not stop. Everything is a function
 * of the loop position, so the loop has no seam. Abstract on purpose and without text: a concept render of redundant queue
 * architectures, not a picture of a real operation.
 */
export function Logistics() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const u = frame / durationInFrames;

  const fails = FAILURE.map((f) => win(u, f.fail.a, f.fail.len, 0.04, 0.05));
  const lits = FAILURE.map((f) => win(u, f.lit.a, f.lit.len, 0.06, 0.1));
  const lit = Math.max(...lits);

  const items: Item[] = [];

  // Gates: a decorative row far away on every lane, and the guarded gate of each lane at CURVE.gate.
  const gate = (x: number, z: number, strength: number, key: string) => {
    const half = 0.17;
    const top = 0.27;
    const [l0x, l0y] = proj(x - half, 0, z);
    const [l1x, l1y] = proj(x - half, top, z);
    const [r0x, r0y] = proj(x + half, 0, z);
    const [r1x, r1y] = proj(x + half, top, z);
    const w = 1 + 2.2 / z;
    const fade = Math.min(1, Math.max(0, (Z_FAR - z) / 2.2));
    const a = strength * fade;
    const [m1x, m1y] = proj(x - half, -top, z);
    const [m2x, m2y] = proj(x + half, -top, z);
    const [px, py] = proj(x, 0, z);
    const poolRx = (FOCAL * 0.62) / z;
    return (
      <g key={key} opacity={a}>
        <ellipse cx={px} cy={py + 1} rx={poolRx} ry={poolRx * 0.13} fill="url(#pool)" />
        <path d={`M${l0x},${l0y} L${m1x},${m1y} L${m2x},${m2y} L${r0x},${r0y}`} fill="none" stroke={platin(0.7)} strokeWidth={w} strokeLinejoin="round" strokeLinecap="round" opacity={0.2} />
        <polygon points={`${l1x},${l1y} ${r1x},${r1y} ${r0x},${r0y} ${l0x},${l0y}`} fill="url(#gate-light)" opacity={0.55} />
        <path d={`M${l0x},${l0y} L${l1x},${l1y} L${r1x},${r1y} L${r0x},${r0y}`} fill="none" stroke={platin(0.7)} strokeWidth={w} strokeLinejoin="round" strokeLinecap="round" />
      </g>
    );
  };
  LANES.forEach((x, lane) => {
    if (lane === STANDBY) return;
    items.push({ z: 6.2, node: gate(x, 6.2, 0.5, `far-${lane}`) });
    const guard = GUARDED.indexOf(lane as (typeof GUARDED)[number]);
    const fail = guard >= 0 ? fails[guard]! : 0;
    // while it fails the gate flickers and goes dark (a deterministic flicker: a whole number of cycles per loop)
    const flicker = 1 - 0.55 * fail * (0.5 + 0.5 * Math.sin(u * TAU * 36));
    items.push({ z: CURVE.gate, node: gate(x, CURVE.gate, (1 - 0.86 * fail) * flicker, `gate-${lane}`) });
  });

  // Parcels: three lanes of N, evenly spread; a parcel on a guarded lane that reaches the curve while the failure is on rides the standby lane.
  const pc = progressAtZ(CURVE.out);
  LANES.forEach((laneX, lane) => {
    if (lane === STANDBY) return;
    const guard = GUARDED.indexOf(lane as (typeof GUARDED)[number]);
    for (let k = 0; k < N; k++) {
      const p = fract(k / N + (M / N) * u);
      const z = zAtProgress(p);
      let x = laneX;
      if (guard >= 0) {
        // the loop position at which this parcel is (or was) at the curve, modulo one loop
        const reachesCurveAt = fract(u + (pc - p) * (N / M));
        const f = FAILURE[guard]!;
        if (inside(reachesCurveAt, f.divert.a, f.divert.len)) x = laneX + (LANES[STANDBY] - laneX) * pull(z);
      }
      const fade = Math.min(1, (Z_FAR - z) / 1.6) * Math.min(1, (z - Z_NEAR) / 0.45);
      if (fade <= 0.01) continue;
      const w = 0.12;
      const h = 0.05;
      const d = 0.24;
      const [a0x, a0y] = proj(x - w / 2, 0, z);
      const [a1x, a1y] = proj(x + w / 2, 0, z);
      const [b1x, b1y] = proj(x + w / 2, h, z);
      const [b0x, b0y] = proj(x - w / 2, h, z);
      const [c1x, c1y] = proj(x + w / 2, h, z + d);
      const [c0x, c0y] = proj(x - w / 2, h, z + d);
      const [sx, sy] = proj(x, 0, z);
      const [s0x, s0y] = proj(x - w / 2, 0, z + d);
      const [s1x, s1y] = proj(x + w / 2, 0, z + d);
      const [s2x, s2y] = proj(x + w / 2, 0, z + d + 0.9);
      const [s3x, s3y] = proj(x - w / 2, 0, z + d + 0.9);
      const [r2x, r2y] = proj(x + w / 2, -h, z);
      const [r3x, r3y] = proj(x - w / 2, -h, z);
      // tape across the lid (between 42 % and 58 % of its depth) and a label on the face
      const at = (ax: number, ay: number, bx: number, by: number, t: number): [number, number] => [ax + (bx - ax) * t, ay + (by - ay) * t];
      const [t0x, t0y] = at(b0x, b0y, c0x, c0y, 0.42);
      const [t1x, t1y] = at(b1x, b1y, c1x, c1y, 0.42);
      const [t2x, t2y] = at(b1x, b1y, c1x, c1y, 0.58);
      const [t3x, t3y] = at(b0x, b0y, c0x, c0y, 0.58);
      const [f0x, f0y] = proj(x - w * 0.34, h * 0.28, z);
      const [f1x, f1y] = proj(x + w * 0.08, h * 0.28, z);
      const [f2x, f2y] = proj(x + w * 0.08, h * 0.68, z);
      const [f3x, f3y] = proj(x - w * 0.34, h * 0.68, z);
      const soft = clamp((2.0 - z) * 2.4, 0, 3.6);
      items.push({
        z,
        node: (
          <g key={`p-${lane}-${k}`} opacity={fade} style={soft > 0.3 ? { filter: `blur(${soft.toFixed(2)}px)` } : undefined}>
            {/* a short soft trail behind the parcel (towards the horizon) */}
            <polygon points={`${s0x},${s0y} ${s1x},${s1y} ${s2x},${s2y} ${s3x},${s3y}`} fill="url(#trail)" opacity={0.7} />
            <ellipse cx={sx} cy={sy + 1.5 / z} rx={((a1x - a0x) / 2) * 1.25} ry={1.6 + 3 / z} fill="rgba(13,13,14,0.55)" />
            <polygon points={`${b0x},${b0y} ${b1x},${b1y} ${c1x},${c1y} ${c0x},${c0y}`} fill={platin(0.9)} />
            <polygon points={`${a0x},${a0y} ${a1x},${a1y} ${b1x},${b1y} ${b0x},${b0y}`} fill={platin(0.46)} />
            <polygon points={`${a0x},${a0y} ${a1x},${a1y} ${r2x},${r2y} ${r3x},${r3y}`} fill="url(#reflect)" />
            <polygon points={`${t0x},${t0y} ${t1x},${t1y} ${t2x},${t2y} ${t3x},${t3y}`} fill="rgba(13,13,14,0.22)" />
            <polygon points={`${f0x},${f0y} ${f1x},${f1y} ${f2x},${f2y} ${f3x},${f3y}`} fill="rgba(13,13,14,0.28)" />
            <line x1={b0x} y1={b0y} x2={b1x} y2={b1y} stroke={platin(0.95)} strokeWidth={Math.max(0.8, 1.4 / z)} />
          </g>
        ),
      });
    }
  });

  // Rails: two hairlines per lane; the standby lane is dashed and dim until it takes over.
  const railPath = (x: number, extra: (z: number) => number) => {
    const pts: string[] = [];
    for (let i = 0; i <= 90; i++) {
      const z = Z_NEAR - 0.35 + ((Z_FAR + 2.5 - (Z_NEAR - 0.35)) * i) / 90;
      pts.push(proj(x + extra(z), 0, z).map((n) => n.toFixed(1)).join(','));
    }
    return pts.join(' ');
  };

  const connectors = GUARDED.map((lane, i) => {
    const laneX = LANES[lane];
    const pts: string[] = [];
    for (let s = 0; s <= 40; s++) {
      const z = 4.2 - (2.3 * s) / 40;
      pts.push(proj(laneX + (LANES[STANDBY] - laneX) * pull(z), 0, z).map((n) => n.toFixed(1)).join(','));
    }
    return { pts: pts.join(' '), lit: lits[i]! };
  });

  items.sort((p, q) => q.z - p.z);

  const standbyGlow = proj(LANES[STANDBY], 0, 2.7);

  return (
    <AbsoluteFill style={{ background: '#0D0D0E', overflow: 'hidden' }}>
      <svg width="1280" height="720" viewBox="0 0 1280 720">
        <defs>
          <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0D0D0E" />
            <stop offset="0.5" stopColor="#141416" />
            <stop offset="1" stopColor="#1A1A1E" />
          </linearGradient>
          <radialGradient id="horizon" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#E2E2E6" stopOpacity="0.2" />
            <stop offset="0.45" stopColor="#E2E2E6" stopOpacity="0.06" />
            <stop offset="1" stopColor="#E2E2E6" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#D4C5A9" stopOpacity="0.55" />
            <stop offset="0.5" stopColor="#D4C5A9" stopOpacity="0.16" />
            <stop offset="1" stopColor="#D4C5A9" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="gate-light" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#E2E2E6" stopOpacity="0.26" />
            <stop offset="1" stopColor="#E2E2E6" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="pool" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#E2E2E6" stopOpacity="0.2" />
            <stop offset="1" stopColor="#E2E2E6" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="reflect" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#E2E2E6" stopOpacity="0.24" />
            <stop offset="1" stopColor="#E2E2E6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="trail" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#E2E2E6" stopOpacity="0.32" />
            <stop offset="1" stopColor="#E2E2E6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0D0D0E" stopOpacity="0.9" />
            <stop offset="1" stopColor="#0D0D0E" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75">
            <stop offset="0.55" stopColor="#0D0D0E" stopOpacity="0" />
            <stop offset="1" stopColor="#0D0D0E" stopOpacity="0.82" />
          </radialGradient>
        </defs>

        {/* the pale horizon, and the floor that runs up to it */}
        <ellipse cx={CX} cy="10" rx="560" ry="170" fill="url(#horizon)" />
        <rect x="0" y="0" width="1280" height="720" fill="url(#floor)" />

        {/* cross lines on the floor, one per depth unit */}
        {Array.from({ length: 16 }, (_, i) => {
          const z = 1.4 + i * 0.5;
          const [x0, y] = proj(-4, 0, z);
          const [x1] = proj(4, 0, z);
          return <line key={`g-${i}`} x1={x0} x2={x1} y1={y} y2={y} stroke={platin(0.055 * (1 - z / 11))} strokeWidth="1" />;
        })}

        {/* rails */}
        {LANES.map((x, lane) =>
          lane === STANDBY ? (
            <g key={`r-${lane}`}>
              <polyline points={railPath(x - 0.05, () => 0)} fill="none" stroke={platin(0.1)} strokeWidth="1" strokeDasharray="6 7" />
              <polyline points={railPath(x + 0.05, () => 0)} fill="none" stroke={platin(0.1)} strokeWidth="1" strokeDasharray="6 7" />
            </g>
          ) : (
            <g key={`r-${lane}`}>
              <polyline points={railPath(x - 0.05, () => 0)} fill="none" stroke={platin(0.22)} strokeWidth="1" />
              <polyline points={railPath(x + 0.05, () => 0)} fill="none" stroke={platin(0.22)} strokeWidth="1" />
            </g>
          ),
        )}

        {/* the two bypass curves between a guarded lane and the standby lane: hairlines, champagne while they carry the flow */}
        {connectors.map((c, i) => (
          <g key={`c-${i}`}>
            <polyline points={c.pts} fill="none" stroke={platin(0.1)} strokeWidth="1" />
            <polyline points={c.pts} fill="none" stroke={champagne(0.16 * c.lit)} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points={c.pts} fill="none" stroke={champagne(0.9 * c.lit)} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        ))}

        {/* the warm light the standby lane gives to the floor around it */}
        <ellipse cx={standbyGlow[0]} cy={standbyGlow[1]} rx="330" ry="120" fill="url(#glow)" opacity={lit} />

        {/* gates and parcels, far to near */}
        {items.map((it) => it.node)}

        {/* dust hanging in the air of the corridor */}
        <Dust loop={u} count={44} area={[240, 110, 800, 520]} color={platin(1)} size={1.3} alpha={0.42} seed={5} />

        {/* depth haze at the horizon, and the vignette */}
        <rect x="0" y="0" width="1280" height="190" fill="url(#haze)" />
        <rect x="0" y="0" width="1280" height="720" fill="url(#vignette)" />
      </svg>
      <Grain opacity={0.07} />
    </AbsoluteFill>
  );
}
