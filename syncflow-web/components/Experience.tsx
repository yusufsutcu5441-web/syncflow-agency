'use client';

import { useEffect } from 'react';

/**
 * Starts the interface-state scripts (header background after scrolling, mobile sticky CTA) AFTER the first paint and
 * once the browser is idle. The code lives in its own chunk (lib/enhance), so it is never part of the hydration work
 * and cannot delay LCP, FCP or interactivity.
 */
export function Experience() {
  useEffect(() => {
    let cancelled = false;
    let teardown: (() => void) | undefined;
    let idleHandle = 0;
    let timeoutHandle = 0;

    const start = () => {
      import('@/lib/enhance')
        .then((module) => {
          if (!cancelled) teardown = module.initEnhancements();
        })
        .catch(() => {
          /* enhancements are optional */
        });
    };

    // rAF waits for the first frame, the timeout for that frame to actually be painted, idle for a quiet main thread.
    const frame = requestAnimationFrame(() => {
      timeoutHandle = window.setTimeout(() => {
        if ('requestIdleCallback' in window) idleHandle = window.requestIdleCallback(start, { timeout: 1500 });
        else start();
      }, 0);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(timeoutHandle);
      if (idleHandle && 'cancelIdleCallback' in window) window.cancelIdleCallback(idleHandle);
      teardown?.();
    };
  }, []);

  return null;
}
