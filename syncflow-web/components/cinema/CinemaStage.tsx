'use client';

import { useEffect } from 'react';
import { cinemaCapable } from '@/lib/cinema/capable';
import { reportCinemaOff } from '@/lib/cinema/state';

/**
 * Starts the WebGL cinema layer (lib/cinema/engine.ts, docs/adr/0014-cinematic-layer.md) and renders its CSS fallback.
 *
 * The fallback (soft light, a drifting grain) is plain server-rendered HTML and CSS, so phones, reduced-motion visitors, data-saver
 * mode and machines without WebGL2 all keep a filmic dark background. The engine is only fetched when the device can carry it:
 * a fine pointer (a desktop), no prefers-reduced-motion, no data saver, at least 900 px wide and four CPU threads. It starts after
 * the first paint and a quiet main thread, like every other enhancement (components/Experience.tsx), so it cannot delay LCP.
 *
 * The engine is a module-level singleton and its canvas lives on <body>, outside React's tree: changing the language remounts
 * everything under [locale], and the picture must not restart (and recompile its shaders) while the page is dark for the switch.
 * `?cinema=off` never starts it, `?cinema-force` skips the capability check (lib/cinema/capable.ts).
 */
let started = false;

export function CinemaStage() {
  useEffect(() => {
    if (started || !cinemaCapable()) return;
    let cancelled = false;
    let idleHandle = 0;
    let timeoutHandle = 0;

    const start = () => {
      import('@/lib/cinema/engine')
        .then((module) => {
          if (cancelled || started) return;
          started = true;
          // The engine listens for `cinema:glitch` (the language switch) itself.
          return module.startCinema(document.body).then((handle) => {
            // No WebGL2, a shader that did not compile: the film must fetch its posters (lib/enhance/film.ts).
            if (!handle) reportCinemaOff();
          });
        })
        .catch(() => {
          /* decorative: the CSS fallback stays; the film falls back to its posters */
          reportCinemaOff();
        });
    };

    const frame = requestAnimationFrame(() => {
      timeoutHandle = window.setTimeout(() => {
        if ('requestIdleCallback' in window) idleHandle = window.requestIdleCallback(start, { timeout: 2000 });
        else start();
      }, 0);
    });

    return () => {
      // Not destroyed on unmount: the singleton outlives the remount a language change causes. Only the start is cancelled.
      cancelled = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(timeoutHandle);
      if (idleHandle && 'cancelIdleCallback' in window) window.cancelIdleCallback(idleHandle);
    };
  }, []);

  return (
    <div className="cinema" aria-hidden="true">
      <div className="cinema-fallback" />
    </div>
  );
}
