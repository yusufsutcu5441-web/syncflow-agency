/**
 * Mask transition for media frames (docs/adr/0015-entry-gate-and-hero.md): a video or poster frame opens like a shutter as it
 * enters the screen, and the picture inside settles from a slight zoom. Elements opt in with `data-maskframe`.
 *
 * This module only measures: it writes the entering progress into `--mf` (0 = closed, 1 = fully open) while the frame is near the
 * screen, and CSS does the rest with clip-path, scale and nothing else (globals.css). The CSS falls back to `var(--mf, 1)`, so
 * without JavaScript, before this runs and under prefers-reduced-motion every frame is simply open: nothing is ever hidden by it.
 */
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (x: number) => x * x * (3 - 2 * x);

export function initMaskFrame(): () => void {
  const frames = Array.from(document.querySelectorAll<HTMLElement>('[data-maskframe]'));
  if (frames.length === 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  const live = new Set<HTMLElement>();
  let raf = 0;

  const update = () => {
    raf = 0;
    const vh = window.innerHeight || 1;
    for (const frame of live) {
      const { top } = frame.getBoundingClientRect();
      // Closed while its top edge is at the bottom of the screen, fully open once it has risen to about a third of the screen.
      const value = smooth(clamp((vh * 0.94 - top) / (vh * 0.62)));
      frame.style.setProperty('--mf', value.toFixed(3));
    }
  };
  const schedule = () => {
    if (!raf && live.size > 0) raf = requestAnimationFrame(update);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const frame = entry.target as HTMLElement;
        if (entry.isIntersecting) live.add(frame);
        else {
          live.delete(frame);
          // Left the screen: the frame above has been seen (open); the frame below is not on screen, so it does not matter.
          frame.style.removeProperty('--mf');
        }
      }
      schedule();
    },
    { rootMargin: '20% 0px 20% 0px' },
  );
  frames.forEach((frame) => observer.observe(frame));

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);

  return () => {
    observer.disconnect();
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    if (raf) cancelAnimationFrame(raf);
    frames.forEach((frame) => frame.style.removeProperty('--mf'));
  };
}
