const FINE_POINTER = '(hover: hover) and (pointer: fine)';
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/** How far (in button sizes) from a button the pull starts, how much of the distance it follows, and the limit in px. */
const REACH = 0.9;
const STRENGTH = 0.28;
const LIMIT = 12;

/**
 * Magnetic primary button (Blueprint): the button leans a few pixels towards the pointer while the pointer is near it
 * and settles back when it leaves. Only the `translate` of the element moves (CSS variables --mx/--my, globals.css), so
 * nothing is laid out. One passive, rAF-throttled listener serves every [data-magnetic] element. Fine pointers only and
 * never with reduced motion.
 */
export function initMagnetic(): () => void {
  const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-magnetic]'));
  if (targets.length === 0) return () => {};

  const fine = window.matchMedia(FINE_POINTER);
  const reduced = window.matchMedia(REDUCED_MOTION);
  let frame = 0;
  let last: PointerEvent | null = null;
  let listening = false;

  const reset = (element: HTMLElement) => {
    element.style.removeProperty('--mx');
    element.style.removeProperty('--my');
    delete element.dataset.magnetActive;
  };

  const update = () => {
    frame = 0;
    const event = last;
    if (!event) return;
    for (const element of targets) {
      const box = element.getBoundingClientRect();
      const dx = event.clientX - (box.left + box.width / 2);
      const dy = event.clientY - (box.top + box.height / 2);
      const near = Math.hypot(dx, dy) < Math.max(box.width, box.height) * REACH;
      if (!near) {
        if (element.dataset.magnetActive) reset(element);
        continue;
      }
      const clamp = (value: number) => Math.max(-LIMIT, Math.min(LIMIT, value * STRENGTH));
      element.dataset.magnetActive = 'true';
      element.style.setProperty('--mx', `${clamp(dx).toFixed(1)}px`);
      element.style.setProperty('--my', `${clamp(dy).toFixed(1)}px`);
    }
  };

  const onMove = (event: PointerEvent) => {
    last = event;
    if (!frame) frame = requestAnimationFrame(update);
  };
  const onLeave = () => {
    last = null;
    for (const element of targets) reset(element);
  };

  const sync = () => {
    const wanted = fine.matches && !reduced.matches;
    if (wanted && !listening) {
      window.addEventListener('pointermove', onMove, { passive: true });
      document.documentElement.addEventListener('pointerleave', onLeave);
      listening = true;
    } else if (!wanted && listening) {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      listening = false;
      onLeave();
    }
  };

  sync();
  fine.addEventListener('change', sync);
  reduced.addEventListener('change', sync);

  return () => {
    window.removeEventListener('pointermove', onMove);
    document.documentElement.removeEventListener('pointerleave', onLeave);
    fine.removeEventListener('change', sync);
    reduced.removeEventListener('change', sync);
    cancelAnimationFrame(frame);
    onLeave();
  };
}
