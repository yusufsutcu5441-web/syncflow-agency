import { initCursor } from './cursor';
import { initMagnetic } from './magnetic';
import { initReveal } from './reveal';
import { initScrollLine } from './scroll-line';
import { initHeaderState, initSpotlight, initStickyCta } from './ui-state';

/**
 * Entry point for every progressive enhancement. It is loaded as its own chunk, after first paint and idle time
 * (see components/Experience.tsx), so none of this code sits in the critical path or in the hydration work.
 * Each module is isolated: a failure in one never takes the others (or the page) down.
 */
export function initEnhancements(): () => void {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const wide = window.matchMedia('(min-width: 768px)').matches;

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
  if (finePointer) run(initSpotlight);

  if (!reduceMotion) {
    run(initReveal);
    if (finePointer) {
      run(initMagnetic);
      run(initCursor);
    }
    if (wide) run(initScrollLine);
  }

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
