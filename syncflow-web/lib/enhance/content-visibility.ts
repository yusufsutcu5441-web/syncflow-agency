import { holdLayoutBefore, releaseAfterScroll } from '@/lib/cv';

/**
 * The script half of `content-visibility: auto` (app/globals.css ".cv", docs/adr/0021 §1; the helpers are in lib/cv.ts).
 *
 *  - Same-page links ("#studio", "/#briefing" from the home page) are the visitor's way down the page, and a section that has not been
 *    drawn yet is only a placeholder height. This listener makes the sections above the target real BEFORE the browser (or Lenis, or
 *    Next's <Link>) works out where the target is, and lets them go when the scroll has come to rest. It runs in the capture phase,
 *    before all of them; Lenis (smooth-scroll.ts) holds again for the length of its own animation, which is harmless.
 *  - A page opened on a deep link ("/#studio") is laid out in full until this module marks the document ready (`data-cv-ready`,
 *    the `:target` rule in globals.css), so the browser's first scroll to the anchor is exact. From then on the sections are skipped
 *    and every section the visitor reaches is measured for good (`contain-intrinsic-size: auto`).
 */
export function initContentVisibility(): () => void {
  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href]');
    // A link inside a dialog belongs to the dialog (components/sections/BreakdownDialog.tsx holds the layout itself).
    if (!link || link.target === '_blank' || link.hasAttribute('download') || link.closest('dialog')) return;

    const url = new URL(link.href, window.location.href);
    const samePage = url.origin === window.location.origin && url.pathname.replace(/\/$/, '') === window.location.pathname.replace(/\/$/, '');
    if (!samePage || url.hash.length < 2) return;
    const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!target) return;
    releaseAfterScroll(holdLayoutBefore(target));
  };
  document.addEventListener('click', onClick, true);

  // Ready once the load is over and the browser has had two frames to settle its own scroll to a deep link.
  const root = document.documentElement;
  let frame = 0;
  const markReady = () => {
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => root.setAttribute('data-cv-ready', ''));
    });
  };
  if (document.readyState === 'complete') markReady();
  else window.addEventListener('load', markReady, { once: true });

  return () => {
    document.removeEventListener('click', onClick, true);
    window.removeEventListener('load', markReady);
    cancelAnimationFrame(frame);
  };
}
