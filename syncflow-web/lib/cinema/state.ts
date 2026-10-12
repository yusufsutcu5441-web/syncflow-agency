/**
 * The one object the film section (lib/enhance/film.ts), the hero (lib/enhance/hero.ts) and the WebGL engine (lib/cinema/engine.ts)
 * share. The writers set targets; the engine eases its own copy towards them every frame, so a scroll jump never makes the picture jump.
 *
 * It lives in its own module so every chunk shares one instance, and so the page works without the engine: film.ts also drives the
 * CSS captions, which must keep working on phones and under prefers-reduced-motion where the engine never starts.
 */
export const cinemaState = {
  /** Which scene the film is in, 0..3 (cosmic matter, bio-mechanical, monolith, liquid metal), continuous: 1.5 blends 1 and 2. */
  scene: 3,
  /** 1 = only the ambient scene (liquid metal), 0 = only the film scenes. Eased in and out as the section enters and leaves. */
  amb: 1,
  /** Film progress 0..1. Drives each scene's camera. */
  local: 0,
  /** Picture strength from the film: low behind ordinary content so text keeps its contrast, full inside the film. */
  gain: 0.22,
  /** Picture strength from the hero: brighter at the top of the page, fading to nothing as the hero scrolls away. The engine uses the larger of the two. */
  heroGain: 0,
};

/** Behind ordinary content the scene is a faint movement in the dark (text contrast stays at the design values, see ADR 0014). */
export const AMBIENT_GAIN = 0.22;

/**
 * Whether the WebGL layer failed to start or shut itself down (no WebGL2, a slow machine, a lost context). The film then needs its
 * poster stills, which a capable desktop does not download otherwise (lib/enhance/film.ts listens for CINEMA_OFF_EVENT).
 */
export const cinemaStatus = { failed: false };
export const CINEMA_OFF_EVENT = 'cinema:off';

export function reportCinemaOff(): void {
  if (cinemaStatus.failed) return;
  cinemaStatus.failed = true;
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CINEMA_OFF_EVENT));
}
