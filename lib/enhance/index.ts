import { initReveal } from './reveal';
import { initSmoothScroll } from './smooth-scroll';
import { initHeaderState, initPauseOffscreen, initStickyCta } from './ui-state';

/**
 * Entry point for the scripts that enhance the server-rendered page. It is loaded as its own chunk, after first paint and
 * idle time (see components/Experience.tsx), so none of this code sits in the critical path or in the hydration work.
 * Each module is isolated: a failure in one never takes the others (or the page) down.
 *
 *  - ui-state: header background after scrolling, mobile sticky CTA, off-screen animation pause (no animation engine).
 *  - reveal: masked entrance for text below the fold. Motion is fetched on the visitor's first interaction.
 *  - smooth-scroll: Lenis, desktop only; the library is a separate chunk that touch devices never request.
 * Nothing here is imported statically from `motion` or `lenis`: both are import()ed (scripts/faz2-denetim checks it).
 */
export function initEnhancements(): () => void {
  const cleanups: Array<() => void> = [];
  const run = (init: () => () => void) => {
    try {
      cleanups.push(init());
    } catch {
      /* decorative: stay silent */
    }
  };

  run(initHeaderState);
  run(initStickyCta);
  run(initPauseOffscreen);
  run(initReveal);
  run(initSmoothScroll);

  return () => {
    for (const cleanup of cleanups.splice(0).reverse()) {
      try {
        cleanup();
      } catch {
        /* ignore */
      }
    }
  };
}
