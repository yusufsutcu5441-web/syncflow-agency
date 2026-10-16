import { initContentVisibility } from './content-visibility';
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
 *  - content-visibility: anchor jumps make the sections above their target real first; marks the document ready (lib/cv.ts).
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
 *
 * The modules start in four groups, each in its own task (docs/adr/0021 §1): eleven starts in one task were a single long task of
 * their own (listeners, observers and the first geometry reads), and Total Blocking Time counts a task by what it takes beyond 50 ms,
 * so the same work in four short tasks counts for nothing. The browser can paint and answer input between the groups.
 */
type Init = () => () => void;

const GROUPS: readonly (readonly Init[])[] = [
  [initContentVisibility, initHeaderState, initStickyCta, initPauseOffscreen],
  [initFilm, initHero],
  [initMaskFrame, initRings, initReveal],
  [initSpotlight, initMagnetic, initSmoothScroll],
];

/** Gives the main thread back to the browser: `scheduler.yield()` where it exists (it keeps the task's priority), a zero timeout otherwise. */
function yieldToMain(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  if (typeof scheduler?.yield === 'function') return scheduler.yield();
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export function initEnhancements(): () => void {
  const cleanups: Array<() => void> = [];
  let cancelled = false;
  const run = (init: Init) => {
    try {
      cleanups.push(init());
    } catch {
      /* decorative: stay silent */
    }
  };

  void (async () => {
    for (const group of GROUPS) {
      if (cancelled) return;
      for (const init of group) run(init);
      await yieldToMain();
    }
  })();

  return () => {
    cancelled = true;
    for (const cleanup of cleanups.splice(0).reverse()) {
      try {
        cleanup();
      } catch {
        /* ignore */
      }
    }
  };
}
