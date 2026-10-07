/**
 * Small state toggles that need no animation engine: header background after scrolling and the mobile sticky CTA.
 * All listeners are passive and rAF-throttled.
 */

export function initHeaderState(): () => void {
  const header = document.querySelector<HTMLElement>('[data-site-header]');
  if (!header) return () => {};

  let frame = 0;
  const update = () => {
    frame = 0;
    const scrolled = String(window.scrollY > 24);
    if (header.dataset.scrolled !== scrolled) header.dataset.scrolled = scrolled;
  };
  const onScroll = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => {
    window.removeEventListener('scroll', onScroll);
    cancelAnimationFrame(frame);
  };
}

/** The bottom CTA bar (mobile) appears once the hero CTA has scrolled away and hides again near other CTAs/the form. */
export function initStickyCta(): () => void {
  const bar = document.querySelector<HTMLElement>('[data-sticky-cta]');
  if (!bar) return () => {};

  const guards = Array.from(document.querySelectorAll<HTMLElement>('[data-sticky-guard]'));
  const onScreen = new Set<Element>();

  const update = () => {
    const show = window.scrollY > 320 && onScreen.size === 0;
    const value = String(show);
    if (bar.dataset.visible !== value) bar.dataset.visible = value;
  };

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) onScreen.add(entry.target);
      else onScreen.delete(entry.target);
    }
    update();
  });
  guards.forEach((el) => observer.observe(el));

  let frame = 0;
  const onScroll = () => {
    if (!frame) {
      frame = requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  update();

  return () => {
    observer.disconnect();
    window.removeEventListener('scroll', onScroll);
    cancelAnimationFrame(frame);
  };
}
