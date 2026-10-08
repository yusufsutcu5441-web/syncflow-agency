/**
 * A CSS cubic-bezier(x1, y1, x2, y2) curve as an easing function (time 0..1 -> progress 0..1).
 * Lenis wants a function, not a curve, and this keeps the scroll on the same curve as the CSS and Motion animations
 * (EASE_LUX in tokens.ts). Newton's method with a bisection fallback, the same approach browsers use.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (time: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const sampleX = (s: number) => ((ax * s + bx) * s + cx) * s;
  const sampleY = (s: number) => ((ay * s + by) * s + cy) * s;
  const slopeX = (s: number) => (3 * ax * s + 2 * bx) * s + cx;

  /** Finds the curve parameter s whose x equals the given time. */
  const solve = (x: number): number => {
    let s = x;
    for (let i = 0; i < 8; i++) {
      const error = sampleX(s) - x;
      if (Math.abs(error) < 1e-6) return s;
      const slope = slopeX(s);
      if (Math.abs(slope) < 1e-6) break;
      s -= error / slope;
    }
    let low = 0;
    let high = 1;
    s = x;
    for (let i = 0; i < 40; i++) {
      const value = sampleX(s);
      if (Math.abs(value - x) < 1e-6) break;
      if (x > value) low = s;
      else high = s;
      s = (high - low) / 2 + low;
    }
    return s;
  };

  return (time) => (time <= 0 ? 0 : time >= 1 ? 1 : sampleY(solve(time)));
}
