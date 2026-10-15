'use client';

import { X } from 'lucide-react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { BreakdownData, BreakdownSlug } from '@/lib/breakdown';
import { MARKET_PARAM } from '@/lib/market';
import { BreakdownView } from './BreakdownView';

/**
 * The architectural breakdown as a dialog over the home page (docs/adr/0020-case-study-layer.md). A native <dialog> opened with
 * showModal(): the rest of the page is inert, focus stays inside, Escape closes it, and focus returns to the card that opened it.
 *  - The address changes to the breakdown's own page while it is open (history.pushState, which Next.js integrates with its router), so
 *    the browser's Back button closes the dialog and a copied address opens the page. The market (?m=) rides along. Closing restores the
 *    address by going back.
 *  - The content is the same data as the page, fetched from /api/breakdown and drawn by the same BreakdownView. It is cached per language
 *    and slug, and warmed when a card is hovered, so opening usually shows it at once.
 *  - The page behind stands still: the scroll lock is CSS (html:has(dialog[open])), and Lenis is told with a `scroll:lock` event
 *    (lib/enhance/smooth-scroll.ts). The panel scrolls natively (data-lenis-prevent).
 * Closing is never a trap: the close button, Escape, a click on the backdrop and Back all work, and a failed load offers the page itself.
 */
export type DialogProps = {
  request: { slug: BreakdownSlug; href: string };
  locale: string;
  labels: { close: string; loading: string; error: string; openPage: string };
  onClose: () => void;
};

const cache = new Map<string, Promise<BreakdownData>>();

function fetchBreakdown(slug: BreakdownSlug, locale: string): Promise<BreakdownData> {
  const key = `${locale}/${slug}`;
  let pending = cache.get(key);
  if (!pending) {
    pending = fetch(`/api/breakdown?slug=${slug}&locale=${locale}`, { headers: { accept: 'application/json' } })
      .then((response) => (response.ok ? (response.json() as Promise<{ ok: boolean; data: BreakdownData }>) : Promise.reject(new Error(String(response.status)))))
      .then((json) => json.data);
    // A failed request must not be remembered: the next try asks again.
    pending.catch(() => cache.delete(key));
    cache.set(key, pending);
  }
  return pending;
}

/** Starts the request early (hover, focus); the dialog then finds it in the cache. */
export function warm(slug: BreakdownSlug, locale: string): void {
  void fetchBreakdown(slug, locale).catch(() => undefined);
}

type Load = { status: 'loading' } | { status: 'ready'; data: BreakdownData } | { status: 'error' };

export default function BreakdownDialog({ request, locale, labels, onClose }: DialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  // The parent's callback changes identity on every render; an effect event always calls the latest one without restarting the effect.
  const closed = useEffectEvent(() => onClose());

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    let pushed = false;
    let done = false;

    // The address of the breakdown's page, with the market the visitor chose on the gate.
    const market = new URLSearchParams(window.location.search).get(MARKET_PARAM);
    const target = market ? `${request.href}${request.href.includes('?') ? '&' : '?'}${MARKET_PARAM}=${market}` : request.href;

    const lock = (locked: boolean) => window.dispatchEvent(new CustomEvent('scroll:lock', { detail: { locked } }));

    // Back (or forward) with the dialog open: the address has already changed, so only the dialog has to go.
    const onPop = () => {
      pushed = false;
      if (element.open) element.close();
    };
    const onCloseEvent = () => {
      if (done) return;
      done = true;
      window.removeEventListener('popstate', onPop);
      lock(false);
      // Escape, the close button and the backdrop leave the address on the breakdown: go back to where the visitor was.
      if (pushed) window.history.back();
      opener?.focus({ preventScroll: true });
      closed();
    };
    // A click on the dim area around the panel (the dialog element itself, not the panel) closes it.
    const onBackdrop = (event: MouseEvent) => {
      if (event.target === element) element.close();
    };

    try {
      element.showModal();
    } catch {
      /* already open */
    }
    lock(true);
    // Idempotent: a development double-mount must not stack two history entries (Next.js keeps our state object on the entry).
    if ((window.history.state as { breakdown?: string } | null)?.breakdown !== request.slug) window.history.pushState({ breakdown: request.slug }, '', target);
    pushed = true;
    window.addEventListener('popstate', onPop);
    element.addEventListener('close', onCloseEvent);
    element.addEventListener('click', onBackdrop);

    let live = true;
    fetchBreakdown(request.slug, locale).then(
      (data) => live && setLoad({ status: 'ready', data }),
      () => live && setLoad({ status: 'error' }),
    );

    return () => {
      live = false;
      window.removeEventListener('popstate', onPop);
      element.removeEventListener('close', onCloseEvent);
      element.removeEventListener('click', onBackdrop);
      if (!done) {
        done = true;
        lock(false);
        if (element.open) element.close();
      }
    };
  }, [request, locale]);

  const close = () => dialog.current?.close();

  // A link to one of the home page's sections: close first, then let the page behind scroll there.
  const goTo = (hash: string) => {
    close();
    window.setTimeout(() => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      document.getElementById(hash)?.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
    }, 60);
  };

  return (
    <dialog ref={dialog} className="bd-dialog" aria-labelledby="bd-title" aria-busy={load.status === 'loading'}>
      <div className="bd-panel" data-lenis-prevent="">
        <div className="bd-bar">
          <button type="button" className="bd-close" onClick={close} aria-label={labels.close}>
            <X size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
        <div className="bd-content">
          {load.status === 'ready' ? (
            <BreakdownView data={load.data} variant="dialog" onAnchor={goTo} />
          ) : (
            <div className="bd-state">
              <h2 id="bd-title" className="sr-only">
                {labels.loading}
              </h2>
              <p className="body-muted" role="status">
                {load.status === 'loading' ? labels.loading : labels.error}
              </p>
              {load.status === 'error' ? (
                <a href={request.href} className="btn btn-ghost btn-sm mt-5">
                  {labels.openPage}
                </a>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
