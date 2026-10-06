import { ArrowUpRight } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { CheckoutLink } from '@/components/ui/CheckoutLink';
import { USD_FORMAT } from '@/lib/format';
import { PRICE_USD } from '@/lib/site';

/**
 * Thumb-zone call to action for phones. Hidden while the hero, pricing card or contact form is on screen
 * (so it never duplicates or covers a primary action) and shown the rest of the time. Visibility is toggled by
 * lib/enhance/ui-state.ts; while hidden it is visibility:hidden, so it cannot be tabbed to.
 */
export async function StickyCta() {
  const t = await getTranslations('Hero');
  const format = await getFormatter();
  const price = format.number(PRICE_USD, USD_FORMAT);

  return (
    <div className="sticky-cta md:hidden" data-sticky-cta="" data-visible="false">
      <CheckoutLink className="btn btn-primary w-full">
        <span>{t('cta', { price })}</span>
        <ArrowUpRight size={18} strokeWidth={2} aria-hidden="true" />
      </CheckoutLink>
    </div>
  );
}
