const FINE_POINTER = '(hover: hover) and (pointer: fine)';
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/**
 * Cursor-following light (Blueprint: a 600 px radial spotlight in the hero, a smaller one inside each showcase card).
 * A host element carries data-spotlight and has a child `.spot` (a fixed-size radial gradient, see globals.css). While the
 * pointer moves over the host, ONLY the child's transform changes, so the browser composites it on the GPU and nothing is
 * repainted or laid out. Fine pointers only (no spotlight on touch) and never with reduced motion; both settings are
 * watched, so changing them while the page is open takes effect at once. The listeners are passive and rAF-throttled.
 */
export function initSpotlight(): () => void {
  const hosts = Array.from(document.querySelectorAll<HTMLElement>('[data-spotlight]'));
  if (hosts.length === 0) return () => {};

  const fine = window.matchMedia(FINE_POINTER);
  const reduced = window.matchMedia(REDUCED_MOTION);
  let detach: Array<() => void> = [];

  const clear = () => {
    for (const undo of detach) undo();
    detach = [];
  };

  const attach = () => {
    clear();
    if (!fine.matches || reduced.matches) return;

    for (const host of hosts) {
      const spot = host.querySelector<HTMLElement>(':scope > .spot');
      if (!spot) continue;
      let frame = 0;
      let x = 0;
      let y = 0;

      const onMove = (event: PointerEvent) => {
        const box = host.getBoundingClientRect();
        x = event.clientX - box.left;
        y = event.clientY - box.top;
        if (host.dataset.spotOn !== 'true') host.dataset.spotOn = 'true';
        if (!frame) {
          frame = requestAnimationFrame(() => {
            frame = 0;
            spot.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
          });
        }
      };
      const onLeave = () => {
        host.dataset.spotOn = 'false';
      };

      host.addEventListener('pointermove', onMove, { passive: true });
      host.addEventListener('pointerleave', onLeave);
      detach.push(() => {
        host.removeEventListener('pointermove', onMove);
        host.removeEventListener('pointerleave', onLeave);
        cancelAnimationFrame(frame);
        delete host.dataset.spotOn;
        spot.style.removeProperty('transform');
      });
    }
  };

  attach();
  fine.addEventListener('change', attach);
  reduced.addEventListener('change', attach);

  return () => {
    clear();
    fine.removeEventListener('change', attach);
    reduced.removeEventListener('change', attach);
  };
}
