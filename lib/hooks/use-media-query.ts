'use client';

import { useSyncExternalStore } from 'react';

/**
 * Subscribes to a CSS media query. During server rendering and hydration it returns `serverValue`, then switches to
 * the real value, so there is never a hydration mismatch.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', notify);
      return () => list.removeEventListener('change', notify);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}
