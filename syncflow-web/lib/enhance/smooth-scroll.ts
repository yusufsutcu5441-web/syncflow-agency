import type Lenis from 'lenis';
import { holdLayoutBefore } from '@/lib/cv';
import { cubicBezier } from '@/lib/motion/ease';
import { EASE_LUX, LENIS } from '@/lib/motion/tokens';

const FINE_POINTER = '(hover: hover) and (pointer: fine)';
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/**
 * Desktop smooth scroll with Lenis (CLAUDE.md "Motion"). It exists only where it costs nothing and cannot hurt:
 *  - a mouse-like pointer: touch devices keep their native, compositor-driven scrolling and never fetch the library;
 *  - no prefers-reduced-motion. Both conditions are watched, so a hybrid laptop or a changed setting switches it on or off.
 * Lenis is loaded with import(), so it is a separate chunk that is requested only after the conditions hold. It is never
 * part of the initial load (docs/adr/0004-motion-and-smooth-scroll.md).
 *
 * Same-page links ("/#briefing", "#showcase") are scrolled to by Lenis on the same curve, leaving room for the fixed
 * header (Lenis honours the page's own scroll-padding-top), and the address and focus end up where a native jump would
 * leave them.
 * The briefing panel carries data-lenis-prevent, so the application flow scrolls natively (CLAUDE.md: no smooth scroll there).
 */
export function initSmoothScroll(): () => void {
  const finePointer = window.matchMedia(FINE_POINTER);
  const reducedMotion = window.matchMedia(REDUCED_MOTION);
  const easing = cubicBezier(...EASE_LUX);

  let instance: Lenis | null = null;
  let detach: (() => void) | null = null;
  let loading = false;
  let disposed = false;

  const wanted = () => finePointer.matches && !reducedMotion.matches;

  // While the entry gate is open the page behind it must not scroll: Lenis moves the viewport with scrollTo, which the CSS scroll
  // lock (overflow: hidden) does not stop. The gate announces itself with gate:change (components/gate/EntryGate.tsx).
  const gateOpen = () => document.querySelector('.gate[data-state="open"]') !== null;
  const onGate = (event: Event) => {
    if ((event as CustomEvent<{ open?: boolean }>).detail?.open) instance?.stop();
    else instance?.start();
  };

  // The same for a dialog over the page (components/sections/BreakdownDialog.tsx): it announces itself with scroll:lock, and its panel
  // scrolls natively (data-lenis-prevent).
  const onLock = (event: Event) => {
    if ((event as CustomEvent<{ locked?: boolean }>).detail?.locked) instance?.stop();
    else if (!gateOpen()) instance?.start();
  };

  const attach = (lenis: Lenis): (() => void) => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href]');
      // A link inside a dialog belongs to the dialog (the breakdown's call to action closes it first, then scrolls the page itself).
      if (!link || link.target === '_blank' || link.hasAttribute('download') || link.closest('dialog')) return;

      const url = new URL(link.href, window.location.href);
      const samePage = url.origin === window.location.origin && url.pathname.replace(/\/$/, '') === window.location.pathname.replace(/\/$/, '');
      if (!samePage || url.hash.length < 2) return;
      const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!target) return;

      // Take the click away from the browser and from Next's <Link>, which would jump there instantly. No offset is
      // passed: Lenis already subtracts the target's scroll-margin-top and the page's scroll-padding-top (the header).
      event.preventDefault();
      event.stopPropagation();
      // The sections above the target must be real before Lenis measures it (lib/cv.ts, content-visibility: auto).
      const release = holdLayoutBefore(target);
      lenis.scrollTo(target, {
        duration: LENIS.duration,
        easing,
        onComplete: () => {
          release();
          focusSection(target);
        },
      });
      if (window.location.hash !== url.hash) window.history.pushState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    };

    // Capture phase on the document: runs before React's click handlers (and Next's <Link>).
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
    };
  };

  const start = async () => {
    if (instance || loading) return;
    loading = true;
    try {
      const { default: LenisClass } = await import('lenis');
      if (disposed || !wanted()) return;
      instance = new LenisClass({ duration: LENIS.duration, easing, autoRaf: true });
      if (gateOpen()) instance.stop();
      detach = attach(instance);
    } catch {
      /* smooth scroll is optional: native scrolling stays */
    } finally {
      loading = false;
    }
  };

  const stop = () => {
    detach?.();
    detach = null;
    instance?.destroy();
    instance = null;
  };

  const sync = () => {
    if (wanted()) void start();
    else stop();
  };

  finePointer.addEventListener('change', sync);
  reducedMotion.addEventListener('change', sync);
  window.addEventListener('gate:change', onGate);
  window.addEventListener('scroll:lock', onLock);
  sync();

  return () => {
    disposed = true;
    finePointer.removeEventListener('change', sync);
    reducedMotion.removeEventListener('change', sync);
    window.removeEventListener('gate:change', onGate);
    window.removeEventListener('scroll:lock', onLock);
    stop();
  };
}

/** After a link jump the section becomes the keyboard and screen-reader starting point, as with a native anchor. */
function focusSection(element: HTMLElement): void {
  const hadTabindex = element.hasAttribute('tabindex');
  if (!hadTabindex) element.setAttribute('tabindex', '-1');
  element.focus({ preventScroll: true });
  if (!hadTabindex) element.addEventListener('blur', () => element.removeAttribute('tabindex'), { once: true });
}
