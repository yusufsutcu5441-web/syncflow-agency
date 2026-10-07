import { initHeaderState, initStickyCta } from './ui-state';

/**
 * Entry point for the small interface-state scripts. It is loaded as its own chunk, after first paint and idle time
 * (see components/Experience.tsx), so none of this code sits in the critical path or in the hydration work.
 * Each module is isolated: a failure in one never takes the others (or the page) down.
 *
 * There is no animation here on purpose. The earlier effects (scroll reveal, magnetic buttons, custom cursor, scroll
 * line, spotlight) were removed in Faz 2; motion returns in Faz 3 with `motion` and a desktop-only smooth scroll.
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
