'use client';

import { useEffect, useState, type ComponentType } from 'react';
import { useClientI18n } from '@/components/i18n/ClientI18n';
import type { BreakdownSlug } from '@/lib/breakdown';
import { isBreakdownSlug } from '@/lib/breakdown';
import type { DialogProps } from './BreakdownDialog';

/**
 * Opens an architectural breakdown in a dialog over the home page (docs/adr/0020-case-study-layer.md). The showcase cards carry a plain
 * link to the breakdown's own page (a[data-breakdown-link]: it works without JavaScript, can be opened in a new tab and is what crawlers
 * follow); this component, rendered once, upgrades a plain click on such a link into the dialog. The dialog's code is a separate chunk,
 * requested on the first hover, focus or click: nothing of it is in the first load.
 */
type Module = { default: ComponentType<DialogProps>; warm: (slug: BreakdownSlug, locale: string) => void };

let loading: Promise<Module> | null = null;
const loadDialog = (): Promise<Module> => (loading ??= import('./BreakdownDialog') as Promise<Module>);

const linkOf = (target: EventTarget | null): HTMLAnchorElement | null => (target instanceof Element ? target.closest<HTMLAnchorElement>('a[data-breakdown-link]') : null);

export function BreakdownHost() {
  const { locale, messages } = useClientI18n();
  const t = messages.Showcase;
  const [Dialog, setDialog] = useState<ComponentType<DialogProps> | null>(null);
  const [request, setRequest] = useState<{ slug: BreakdownSlug; href: string } | null>(null);

  useEffect(() => {
    const warm = (event: Event) => {
      const link = linkOf(event.target);
      const slug = link?.dataset.slug ?? '';
      if (!link || !isBreakdownSlug(slug)) return;
      void loadDialog().then((module) => module.warm(slug, locale));
    };

    const open = (event: MouseEvent) => {
      const link = linkOf(event.target);
      const slug = link?.dataset.slug ?? '';
      // Modified clicks (a new tab, a download) and everything that is not a primary click keep the link's own behaviour.
      if (!link || !isBreakdownSlug(slug) || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      // Take the click away from the browser and from Next's <Link>, which would otherwise navigate to the page (this listener runs in the
      // capture phase, before React's own handlers).
      event.preventDefault();
      event.stopPropagation();
      void loadDialog().then((module) => {
        setDialog(() => module.default);
        setRequest({ slug, href: link.getAttribute('href') ?? '' });
      });
    };

    document.addEventListener('click', open, true);
    document.addEventListener('pointerover', warm, { passive: true });
    document.addEventListener('focusin', warm);
    return () => {
      document.removeEventListener('click', open, true);
      document.removeEventListener('pointerover', warm);
      document.removeEventListener('focusin', warm);
    };
  }, [locale]);

  if (!Dialog || !request) return null;
  return (
    <Dialog
      request={request}
      locale={locale}
      labels={{ close: t.breakdownClose, loading: t.breakdownLoading, error: t.breakdownError, openPage: t.breakdownOpenPage }}
      onClose={() => setRequest(null)}
    />
  );
}
