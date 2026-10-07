import { ArrowUpRight, Check, Lock, MessageCircle, ShieldCheck } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { CheckoutLink } from '@/components/ui/CheckoutLink';
import { SectionHead } from '@/components/ui/SectionHead';
import { USD_FORMAT } from '@/lib/format';
import { PRICE_USD, SECTION_IDS, TYPICAL_AGENCY_USD } from '@/lib/site';

const INCLUDES = ['i1', 'i2', 'i3', 'i4', 'i5', 'i6'] as const;

/**
 * One tier, one price, one button. The price is shown large (anchoring), the typical agency quote sits right next
 * to it, and the risk-reversal line is placed directly under the call to action.
 */
export async function Pricing() {
  const t = await getTranslations('Pricing');
  const format = await getFormatter();
  const price = format.number(PRICE_USD, USD_FORMAT);
  const oldPrice = format.number(TYPICAL_AGENCY_USD, USD_FORMAT);

  return (
    <section id={SECTION_IDS.pricing} className="section" aria-labelledby="pricing-title">
      <div className="container-x grid gap-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start lg:gap-20">
        <div className="lg:sticky lg:top-32">
          <SectionHead
            id="pricing-title"
            stacked
            eyebrow={t('eyebrow')}
            title={t.rich('title', { dim: (chunks) => <span className="dim">{chunks}</span> })}
            subtitle={t('subtitle')}
          />
          <p className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted" data-reveal="block">
            <MessageCircle size={18} strokeWidth={1.5} aria-hidden="true" />
            <span>{t('ask')}</span>
            <a href={`#${SECTION_IDS.contact}`} className="text-platin underline decoration-platin/30 underline-offset-4 transition-colors hover:decoration-platin">
              {t('askLink')}
            </a>
          </p>
        </div>

        <div data-sticky-guard="" className="glass p-7 sm:p-10 md:p-12">
          <p className="eyebrow">{t('planName')}</p>

          <div className="mt-7 flex flex-wrap items-end gap-x-6 gap-y-3">
            <span className="text-display tabular-nums">{price}</span>
            <div className="pb-2 text-sm leading-relaxed text-muted">
              <p>{t('planNote')}</p>
              <p>{t('anchor', { oldPrice })}</p>
            </div>
          </div>

          <div className="mt-10 border-t border-hairline pt-8">
            <p className="eyebrow">{t('includesTitle')}</p>
            <ul className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {INCLUDES.map((key) => (
                <li key={key} className="flex items-start gap-3 text-[0.97rem] leading-snug text-platin">
                  <Check size={18} strokeWidth={2} className="mt-px shrink-0 text-platin" aria-hidden="true" />
                  <span>{t(key)}</span>
                </li>
              ))}
            </ul>
          </div>

          <CheckoutLink className="btn btn-primary mt-10 w-full !h-14 text-base">
            <span>{t('cta', { price })}</span>
            <ArrowUpRight size={19} strokeWidth={2} aria-hidden="true" />
          </CheckoutLink>

          <p className="mt-6 flex items-start gap-2.5 text-sm text-platin">
            <ShieldCheck size={17} strokeWidth={1.6} className="mt-px shrink-0 text-platin" aria-hidden="true" />
            <span>{t('risk')}</span>
          </p>
          <p className="mt-2.5 flex items-start gap-2.5 text-sm text-muted">
            <Lock size={15} strokeWidth={1.75} className="mt-px shrink-0" aria-hidden="true" />
            <span>{t('secure')}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
