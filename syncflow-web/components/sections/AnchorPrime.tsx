'use client';

import { useLayoutEffect } from 'react';
import { holdLayoutBefore, releaseAfterScroll } from '@/lib/cv';

/**
 * Renders nothing. When the home page is mounted by a client-side navigation that carries a section anchor (a footer link on the privacy
 * page: "/#briefing"), the sections below the film are skipped placeholders (content-visibility: auto, docs/adr/0021 §1), and Next.js
 * scrolls to the anchor right after this commit. A layout effect runs before that scroll, so the sections above the anchor are made real
 * in time (lib/cv.ts). A hard load of a deep link needs none of this: the stylesheet lays the page out in full until it is ready.
 */
export function AnchorPrime() {
  useLayoutEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    const target = id ? document.getElementById(id) : null;
    if (target) releaseAfterScroll(holdLayoutBefore(target), 2000);
  }, []);
  return null;
}
