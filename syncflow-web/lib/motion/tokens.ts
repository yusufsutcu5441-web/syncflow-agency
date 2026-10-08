/**
 * Motion tokens shared by the scripts in lib/enhance. The CSS side (app/globals.css) mirrors the mask values in
 * --mask-duration, --mask-stagger and --mask-delay, and the curve in --ease-lux: keep both sides in step.
 * Source of the numbers: CLAUDE.md "Motion" (Lenis duration 1.2, easing cubic-bezier(.16, 1, .3, 1); Blueprint: 80 ms per line).
 */

/** The one curve of the site: fast start, long calm landing. */
export const EASE_LUX = [0.16, 1, 0.3, 1] as const;

/** Desktop smooth scroll (Lenis). */
export const LENIS = { duration: 1.2 } as const;

/** Masked entrance. Seconds, except `distance` (percent of the word's own height; Arabic and Japanese use more, see --mask-dist). */
export const MASK = { duration: 1.1, stagger: 0.08, wordStagger: 0.045, delay: 0.08, distance: 110 } as const;
