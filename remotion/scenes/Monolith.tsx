import type { CSSProperties } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';

const TAU = Math.PI * 2;

/**
 * A glass monolith turning slowly on black. The slab is symmetric, so turning it by 180 degrees ends exactly where it began:
 * the 8-second loop has no seam. Light slides across each face like liquid (a moving sheen), and a faint reflection
 * lies on the floor. Pure CSS 3D, deterministic.
 */
const W = 230;
const H = 470;
const D = 72;

function Slab({ angle, loop }: { angle: number; loop: number }) {
  const face = (offset: number, transform: string, width: number): CSSProperties => {
    const facing = Math.cos(((angle + offset) * Math.PI) / 180);
    const b = 0.22 + 0.78 * Math.max(0, facing);
    const sheen = 50 + 70 * Math.sin(loop * TAU + offset / 57.3);
    return {
      position: 'absolute',
      left: -width / 2,
      top: -H / 2,
      width,
      height: H,
      transform,
      backfaceVisibility: 'hidden',
      border: `1px solid rgba(255,255,255,${0.12 + 0.4 * b})`,
      background: `linear-gradient(112deg, rgba(255,255,255,${0.2 * b}) 0%, rgba(255,255,255,${0.045 * b}) 38%, rgba(255,255,255,0.015) 58%, rgba(255,255,255,${0.15 * b}) 100%),
        linear-gradient(100deg, transparent ${sheen - 14}%, rgba(255,255,255,${0.3 * b}) ${sheen}%, transparent ${sheen + 14}%)`,
      boxShadow: `inset 0 0 ${40 * b}px rgba(255,255,255,${0.08 * b})`,
    };
  };

  return (
    <div style={{ position: 'absolute', left: 0, top: 0, transformStyle: 'preserve-3d', transform: `rotateX(-7deg) rotateY(${angle}deg)` }}>
      <div style={face(0, `translateZ(${D / 2}px)`, W)} />
      <div style={face(180, `rotateY(180deg) translateZ(${D / 2}px)`, W)} />
      <div style={face(90, `rotateY(90deg) translateZ(${W / 2}px)`, D)} />
      <div style={face(-90, `rotateY(-90deg) translateZ(${W / 2}px)`, D)} />
    </div>
  );
}

export function Monolith() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const loop = frame / durationInFrames;
  const angle = 28 + loop * 180;
  const floor = 360 + H / 2;

  return (
    <AbsoluteFill style={{ background: '#000', overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: 'radial-gradient(60% 70% at 50% 45%, rgba(255,255,255,0.07), rgba(0,0,0,0) 72%)' }} />

      {/* floor glow under the slab */}
      <div style={{ position: 'absolute', left: 640 - 320, top: floor - 26, width: 640, height: 70, background: 'radial-gradient(closest-side, rgba(255,255,255,0.16), rgba(0,0,0,0))' }} />

      {/* reflection: the same slab mirrored, faded out downwards */}
      <div
        style={{
          position: 'absolute',
          left: 640,
          top: floor,
          width: 0,
          height: 0,
          perspective: 1500,
          transform: 'scaleY(-1)',
          opacity: 0.22,
          WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0) 46%)',
          maskImage: 'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0) 46%)',
        }}
      >
        <div style={{ position: 'absolute', left: 0, top: -H / 2 }}>
          <Slab angle={angle} loop={loop} />
        </div>
      </div>

      {/* the slab itself */}
      <div style={{ position: 'absolute', left: 640, top: 360, width: 0, height: 0, perspective: 1500 }}>
        <Slab angle={angle} loop={loop} />
      </div>
    </AbsoluteFill>
  );
}
