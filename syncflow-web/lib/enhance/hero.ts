import { cinemaState } from '@/lib/cinema/state';

/**
 * Hero depth (docs/adr/0015-entry-gate-and-hero.md). Turns the scroll position over the hero into
 *   - the CSS variable `--hp` (0..1) on `[data-hero]`: CSS alone moves the monumental emblem, fades the copy and the scroll cue
 *     (transform and opacity only). On the desktop layout the hero is taller than the screen with a sticky stage, so `--hp` runs over
 *     that extra scroll; on every other layout it runs over the first screen and only the emblem uses it.
 *   - `cinemaState.heroGain`: the WebGL layer is brighter at the top of the page and settles to its ambient strength as the hero
 *     scrolls away (the film's own gain takes over after that; the engine uses the larger of the two).
 * It reads one rect per animation frame at most and writes a custom property only when it changed by a visible step. Without
 * JavaScript, under prefers-reduced-motion and before this runs, `--hp` is 0: a still, complete hero.
 */
const HERO_GAIN = 0.46;

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (x: number) => x * x * (3 - 2 * x);

export function initHero(): () => void {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!hero) return () => {};
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches) return () => {};

  let raf = 0;
  let last = -1;

  const update = () => {
    raf = 0;
    const rect = hero.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const tall = rect.height > vh * 1.2;
    const p = clamp(-rect.top / Math.max(1, tall ? rect.height - vh : vh));
    const step = Math.round(p * 500) / 500;
    if (step !== last) {
      last = step;
      hero.style.setProperty('--hp', step.toFixed(3));
    }
    cinemaState.heroGain = HERO_GAIN * (1 - smooth(p));
  };
  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(update);
  };

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  update();

  return () => {
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    if (raf) cancelAnimationFrame(raf);
    hero.style.removeProperty('--hp');
    cinemaState.heroGain = 0;
  };
}
