import { initFilm } from './film';
import { initHero } from './hero';
import { initMagnetic } from './magnetic';
import { initMaskFrame } from './mask-frame';
import { initReveal } from './reveal';
import { initRings } from './rings';
import { initSmoothScroll } from './smooth-scroll';
import { initSpotlight } from './spotlight';
import { initHeaderState, initPauseOffscreen, initStickyCta } from './ui-state';

/**
 * Entry point for the scripts that enhance the server-rendered page. It is loaded as its own chunk, after first paint and
 * idle time (see components/Experience.tsx), so none of this code sits in the critical path or in the hydration work.
 * Each module is isolated: a failure in one never takes the others (or the page) down.
 *
 *  - ui-state: header background after scrolling, mobile sticky CTA, off-screen animation pause (no animation engine).
 *  - spotlight, magnetic: the cursor-following light and the leaning primary button; fine pointers only.
 *  - film: scroll position -> the film section's CSS variable --p, chapter, timecode and the cinema state (lib/cinema).
 *  - hero: scroll position -> the hero's --hp (emblem depth, copy fade) and the cinema layer's hero brightness.
 *  - mask-frame: scroll position -> --mf on media frames, the shutter-like mask opening (CSS does the clip-path).
 *  - rings: the Lighthouse rings fill when they come into view.
 *  - reveal: masked entrance for text below the fold. Motion is fetched on the visitor's first interaction.
 *  - smooth-scroll: Lenis, desktop only; the library is a separate chunk that touch devices never request.
 * Nothing here is imported statically from `motion` or `lenis`: both are import()ed (faz2-denetim.mjs checks it).
 * Every module honours prefers-reduced-motion.
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
  run(initFilm);
  run(initHero);
  run(initMaskFrame);
  run(initSpotlight);
  run(initMagnetic);
  run(initRings);
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
