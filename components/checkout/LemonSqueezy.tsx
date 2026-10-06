'use client';

import Script from 'next/script';
import { useEffect } from 'react';
import { LEMON_SCRIPT_SRC } from '@/lib/site';

type LemonSqueezyApi = {
  Url: { Open: (url: string) => void; Close: () => void };
};

declare global {
  interface Window {
    createLemonSqueezy?: () => void;
    LemonSqueezy?: LemonSqueezyApi;
  }
}

const OVERLAY_FRAME = 'body > iframe[src*="lemonsqueezy.com"]';

/**
 * Lemon Squeezy checkout overlay.
 *
 * The script is loaded with next/script (strategy "lazyOnload": after the page has loaded and the browser is idle,
 * so it never touches LCP/TBT) and carries the request's CSP nonce.
 *
 * Every <a data-checkout> is a real link to the hosted checkout, so the button still works with JavaScript off or
 * before lemon.js has loaded. Once lemon.js is ready, a single delegated click handler opens the dark-mode overlay
 * instead. Delegation (rather than lemon.js's own per-element ".lemonsqueezy-button" binding) keeps working across
 * React re-renders and locale switches, and cannot double-bind.
 *
 * Accessibility: while the overlay is open the page behind it is made inert, focus moves into the overlay, and when
 * the overlay closes focus returns to the button that opened it.
 */
export function LemonSqueezy({ nonce }: { nonce?: string }) {
  useEffect(() => {
    const root = document.getElementById('site-root');
    let opener: HTMLElement | null = null;
    let watcher: MutationObserver | null = null;

    const restore = () => {
      watcher?.disconnect();
      watcher = null;
      root?.removeAttribute('inert');
      root?.removeAttribute('aria-hidden');
      document.body.classList.remove('lemonsqueezy-open');
      if (opener) {
        opener.focus({ preventScroll: true });
        opener = null;
      }
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[data-checkout]');
      const api = window.LemonSqueezy;
      // lemon.js not ready yet: let the browser follow the link to the hosted checkout page.
      if (!link || !api?.Url?.Open) return;

      event.preventDefault();
      opener = link;
      document.body.classList.add('lemonsqueezy-open');
      api.Url.Open(link.href);
      root?.setAttribute('inert', '');
      root?.setAttribute('aria-hidden', 'true');

      // lemon.js removes its iframe when the customer closes checkout (or after a completed purchase).
      watcher?.disconnect();
      watcher = new MutationObserver(() => {
        if (!document.querySelector(OVERLAY_FRAME)) restore();
      });
      watcher.observe(document.body, { childList: true });

      requestAnimationFrame(() => document.querySelector<HTMLIFrameElement>(OVERLAY_FRAME)?.focus());
    };

    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('click', onClick);
      restore();
    };
  }, []);

  return (
    <Script
      id="lemon-squeezy"
      src={LEMON_SCRIPT_SRC}
      strategy="lazyOnload"
      nonce={nonce}
      // lemon.js initialises itself on window "load", which has already fired by the time a lazy script runs.
      onLoad={() => window.createLemonSqueezy?.()}
    />
  );
}
