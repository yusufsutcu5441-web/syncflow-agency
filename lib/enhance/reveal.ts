import { animate } from 'framer-motion/dom';

/**
 * Scroll reveal with real spring physics (Framer Motion's engine, driven directly on the DOM).
 *
 * Rules that keep the page fast and stable:
 *  - Only elements that start BELOW the fold are hidden. Everything the visitor sees first (the hero, the LCP text)
 *    is never touched, so it paints immediately and without animation.
 *  - Hiding happens after first paint and is JS-only, so with JavaScript off every section is simply visible.
 *  - No layout reads in script: where an element starts is taken from the IntersectionObserver's first report
 *    (computed by the browser during rendering), so there is no forced reflow (which cost ~190 ms on a throttled phone).
 *  - Only opacity and transform change (compositor properties): zero layout shift.
 *  - When a reveal finishes, the inline styles are removed, leaving the element exactly as the CSS defines it.
 *
 * Elements opt in with the data-reveal attribute. Elements that enter the viewport together are staggered.
 */

const DISTANCE = 28;
const STAGGER = 0.09;

export function initReveal(): () => void {
  const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
  if (targets.length === 0) return () => {};

  const classified = new Set<Element>();
  const hidden = new Set<HTMLElement>();
  const running = new Set<{ stop: () => void }>();

  const hide = (el: HTMLElement) => {
    el.style.opacity = '0';
    el.style.transform = `translate3d(0, ${DISTANCE}px, 0)`;
    hidden.add(el);
  };
  const clear = (el: HTMLElement) => {
    el.style.opacity = '';
    el.style.transform = '';
  };

  const play = (el: HTMLElement, delay: number) => {
    hidden.delete(el);
    const controls = animate(0, 1, {
      type: 'spring',
      stiffness: 90,
      damping: 18,
      mass: 0.9,
      delay,
      onUpdate: (progress) => {
        el.style.opacity = String(Math.min(1, Math.max(0, progress * 1.25)));
        el.style.transform = `translate3d(0, ${(1 - progress) * DISTANCE}px, 0)`;
      },
      onComplete: () => {
        clear(el);
        running.delete(controls);
      },
    });
    running.add(controls);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const entering: IntersectionObserverEntry[] = [];

      for (const entry of entries) {
        const el = entry.target as HTMLElement;

        if (!classified.has(el)) {
          // First report for this element: decide once where it starts.
          classified.add(el);
          const rootBottom = entry.rootBounds?.bottom ?? window.innerHeight;
          if (!entry.isIntersecting && entry.boundingClientRect.top > rootBottom) hide(el);
          else observer.unobserve(el); // already on screen, or above it: stays as rendered
          continue;
        }
        if (entry.isIntersecting && hidden.has(el)) entering.push(entry);
      }

      entering
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left)
        .forEach((entry, index) => {
          observer.unobserve(entry.target);
          play(entry.target as HTMLElement, index * STAGGER);
        });
    },
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
  );
  for (const el of targets) observer.observe(el);

  return () => {
    observer.disconnect();
    running.forEach((controls) => controls.stop());
    for (const el of targets) clear(el); // data-reveal elements carry no other inline opacity/transform
    hidden.clear();
  };
}
