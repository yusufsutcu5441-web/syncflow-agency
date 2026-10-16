const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const COUNT_MS = 1200;
const STAGGER_MS = 150;

/**
 * The four Lighthouse rings fill from empty to their measured value, one after another, when they come into view
 * (Blueprint: 1.2 s, ease-out), and the number in each ring counts up with them. The server renders the final state, so
 * without script (or with reduced motion) the rings are simply full. Only rings that start below the fold are armed (set
 * empty), and only once they are within one screen of it; the ring itself is a CSS transition of stroke-dashoffset on four small circles.
 *
 * No rectangle is read at load. The rings sit in a block that the renderer skips until it is near (content-visibility: auto,
 * docs/adr/0021 §1), and a geometry read there would make the browser lay the whole block out inside this task, which is the cost the
 * skipping saves. Observers answer without it.
 */
export function initRings(): () => void {
  const reduced = window.matchMedia(REDUCED_MOTION);
  if (reduced.matches) return () => {};

  const hosts = Array.from(document.querySelectorAll<HTMLElement>('[data-rings]'));
  if (hosts.length === 0) return () => {};

  // Latin digits in every language, as the server draws them (an Arabic page would otherwise count in Arabic-Indic digits and end in Latin ones).
  const numberFormat = new Intl.NumberFormat(`${document.documentElement.lang || 'en'}-u-nu-latn`);
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

  // Plays the rings of an armed host once 40 % of it is on screen.
  const playObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const host = entry.target as HTMLElement;
        playObserver.unobserve(host);
        if (host.dataset.armed !== 'true') continue;
        // Force a style flush so the empty state is the transition's starting point, then release the rings.
        void host.getBoundingClientRect();
        host.dataset.armed = 'false';
        host.querySelectorAll<HTMLElement>('[data-count]').forEach((element, index) => count(element, index * STAGGER_MS));
      }
    },
    { threshold: 0.4 },
  );

  // Arms a host when it comes within one screen below the fold. Anything already in view at that first report (a reload in the middle of the
  // page, a jump to the anchor) stays exactly as the server drew it.
  const armObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const host = entry.target as HTMLElement;
        armObserver.unobserve(host);
        if (entry.boundingClientRect.top < window.innerHeight) continue;
        host.dataset.armed = 'true';
        host.querySelectorAll<HTMLElement>('[data-count]').forEach((element) => {
          element.textContent = numberFormat.format(0);
        });
        playObserver.observe(host);
      }
    },
    { rootMargin: '0px 0px 100% 0px' },
  );
  for (const host of hosts) armObserver.observe(host);

  return () => {
    armObserver.disconnect();
    playObserver.disconnect();
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
