import { motionValue, springValue, styleEffect } from 'framer-motion/dom';

/**
 * Custom cursor: a precise dot plus a ring that trails it on a spring and swells over anything clickable.
 * The native cursor is NOT hidden, so nothing is lost for low-vision users or when this script is slow to start.
 * Created only for mouse/pen, never on touch screens, never with prefers-reduced-motion.
 */

const INTERACTIVE = 'a[href], button, summary, [role="button"], [role="tab"], input, textarea, select, label[for], [data-cursor]';

export function initCursor(): () => void {
  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  ring.setAttribute('aria-hidden', 'true');
  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  dot.setAttribute('aria-hidden', 'true');
  document.body.append(ring, dot);

  const x = motionValue(-200);
  const y = motionValue(-200);
  const stopRing = styleEffect(ring, {
    x: springValue(x, { stiffness: 430, damping: 36, mass: 0.6 }),
    y: springValue(y, { stiffness: 430, damping: 36, mass: 0.6 }),
  });
  const stopDot = styleEffect(dot, { x, y });

  const setState = (visible: boolean) => {
    const value = visible ? 'visible' : 'hidden';
    if (ring.dataset.state !== value) {
      ring.dataset.state = value;
      dot.dataset.state = value;
    }
  };

  const onMove = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    x.set(event.clientX);
    y.set(event.clientY);
    setState(true);
    const hovering = String(Boolean((event.target as Element | null)?.closest?.(INTERACTIVE)));
    if (ring.dataset.hover !== hovering) ring.dataset.hover = hovering;
  };
  const onDown = () => (ring.dataset.down = 'true');
  const onUp = () => (ring.dataset.down = 'false');
  const onLeave = () => setState(false);

  document.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerdown', onDown, { passive: true });
  document.addEventListener('pointerup', onUp, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);

  return () => {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerdown', onDown);
    document.removeEventListener('pointerup', onUp);
    document.documentElement.removeEventListener('pointerleave', onLeave);
    stopRing();
    stopDot();
    ring.remove();
    dot.remove();
  };
}
