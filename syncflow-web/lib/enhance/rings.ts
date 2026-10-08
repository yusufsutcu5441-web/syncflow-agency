const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const COUNT_MS = 1200;
const STAGGER_MS = 150;

/**
 * The four Lighthouse rings fill from empty to their measured value, one after another, when they come into view
 * (Blueprint: 1.2 s, ease-out), and the number in each ring counts up with them. The server renders the final state, so
 * without script (or with reduced motion) the rings are simply full. Only rings that start below the fold are armed (set
 * empty) after the first paint; the ring itself is a CSS transition of stroke-dashoffset on four small circles.
 */
export function initRings(): () => void {
  const reduced = window.matchMedia(REDUCED_MOTION);
  if (reduced.matches) return () => {};

  const hosts = Array.from(document.querySelectorAll<HTMLElement>('[data-rings]'));
  if (hosts.length === 0) return () => {};

  const numberFormat = new Intl.NumberFormat(document.documentElement.lang || undefined);
  const frames = new Set<number>();

  const count = (element: HTMLElement, delay: number) => {
    const target = Number(element.dataset.count);
    if (!Number.isFinite(target)) return;
    const start = performance.now() + delay;
    const tick = (now: number) => {
      const progress = Math.min(1, Math.max(0, (now - start) / COUNT_MS));
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = numberFormat.format(Math.round(target * eased));
      if (progress < 1) frames.add(requestAnimationFrame(tick));
    };
    frames.add(requestAnimationFrame(tick));
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const host = entry.target as HTMLElement;
        observer.unobserve(host);
        if (host.dataset.armed !== 'true') continue;
        // Force a style flush so the empty state is the transition's starting point, then release the rings.
        void host.getBoundingClientRect();
        host.dataset.armed = 'false';
        host.querySelectorAll<HTMLElement>('[data-count]').forEach((element, index) => count(element, index * STAGGER_MS));
      }
    },
    { threshold: 0.4 },
  );

  for (const host of hosts) {
    // Anything already on screen at load stays as the server drew it.
    if (host.getBoundingClientRect().top < window.innerHeight) continue;
    host.dataset.armed = 'true';
    host.querySelectorAll<HTMLElement>('[data-count]').forEach((element) => {
      element.textContent = numberFormat.format(0);
    });
    observer.observe(host);
  }

  return () => {
    observer.disconnect();
    for (const frame of frames) cancelAnimationFrame(frame);
    for (const host of hosts) {
      if (host.dataset.armed === 'true') {
        delete host.dataset.armed;
        host.querySelectorAll<HTMLElement>('[data-count]').forEach((element) => {
          element.textContent = numberFormat.format(Number(element.dataset.count));
        });
      }
    }
  };
}
