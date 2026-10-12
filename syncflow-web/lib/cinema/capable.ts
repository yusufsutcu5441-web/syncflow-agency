type NavigatorWithConnection = Navigator & { connection?: { saveData?: boolean } };

/**
 * Can this visitor carry the WebGL cinema layer? (docs/adr/0014-cinematic-layer.md)
 * A fine pointer (a desktop), no prefers-reduced-motion, no data saver, at least 900 px wide and four CPU threads.
 * Shared by the stage that starts the engine and by the film section that decides whether the fallback posters are needed.
 *
 * Address switches (support and tests): `?cinema=off` never starts the engine; `?cinema-force` skips the check.
 */
export function cinemaCapable(): boolean {
  const params = new URLSearchParams(window.location.search);
  if (params.get('cinema') === 'off') return false;
  if (params.has('cinema-force')) return true;
  const media = (query: string) => window.matchMedia(query).matches;
  return (
    media('(hover: hover) and (pointer: fine)') &&
    !media('(prefers-reduced-motion: reduce)') &&
    window.innerWidth >= 900 &&
    !(navigator as NavigatorWithConnection).connection?.saveData &&
    (navigator.hardwareConcurrency ?? 8) >= 4
  );
}
