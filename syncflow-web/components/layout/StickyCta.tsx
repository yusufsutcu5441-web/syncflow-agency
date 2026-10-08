import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import type { AppLocale } from '@/i18n/routing';
import { withLocale } from '@/lib/i18n-paths';
import { SECTION_IDS } from '@/lib/site';

/**
 * Thumb-zone call to action for phones. Hidden while the hero button or the briefing itself is on screen (so it never
 * duplicates or covers a primary action) and shown the rest of the time. Visibility is toggled by
 * lib/enhance/ui-state.ts; while hidden it is visibility:hidden, so it cannot be tabbed to.
 */
export async function StickyCta() {
  const [t, locale] = await Promise.all([getTranslations('Hero'), getLocale() as Promise<AppLocale>]);

  return (
    <div className="sticky-cta md:hidden" data-sticky-cta="" data-visible="false">
      <Link href={withLocale(`/#${SECTION_IDS.briefing}`, locale)} prefetch={false} className="btn btn-primary w-full">
        <span>{t('ctaPrimary')}</span>
        <ArrowUpRight size={18} strokeWidth={1.75} aria-hidden="true" className="icon-dir" />
      </Link>
    </div>
  );
}
