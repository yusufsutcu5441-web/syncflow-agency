import { ArrowDown, ArrowUpRight, Lock, ShieldCheck } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { CheckoutLink } from '@/components/ui/CheckoutLink';
import { Magnetic } from '@/components/ui/Magnetic';
import { USD_FORMAT } from '@/lib/format';
import { PRICE_USD, SECTION_IDS } from '@/lib/site';

/**
 * Hero. Everything above the fold is plain server-rendered text: no entrance animation on the headline, so the
 * largest contentful paint is the headline itself, as early as the browser can draw it.
 *
 * Persuasion structure: status + revenue headline (System 1) -> risk-reversal badge right next to the action ->
 * the offer reduced to four facts (System 2 can verify it at a glance).
 */
export async function Hero() {
  const t = await getTranslations('Hero');
  const format = await getFormatter();
  const price = format.number(PRICE_USD, USD_FORMAT);

  // Longer translations (German: 57 characters vs 35 in English) get a slightly smaller headline so the call to
  // action and the risk-reversal badge stay in the first screen in every language.
  const titleLength = String(t.raw('title')).replace(/<[^>]+>/g, '').length;
  const titleSize = titleLength > 50 ? 'text-[clamp(2.4rem,5.2vw,4.7rem)]' : 'text-[clamp(2.85rem,6.4vw,5.6rem)]';

  const spec = [
    [t('specPrice'), t('specPriceValue', { price })],
    [t('specDelivery'), t('specDeliveryValue')],
    [t('specStack'), t('specStackValue')],
    [t('specRetainer'), t('specRetainerValue')],
  ] as const;

  return (
    <section className="relative isolate overflow-hidden pb-24 pt-32 md:pb-32 md:pt-40" aria-labelledby="hero-title">
      <div className="hero-glow" aria-hidden="true" />
      <div className="grid-lines" aria-hidden="true" />

      <div className="container-x grid gap-16 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,0.55fr)] lg:items-end lg:gap-12">
        <div>
          <p className="eyebrow flex items-center gap-3">
            <span className="live-dot" aria-hidden="true" />
            {t('eyebrow')}
          </p>

          <h1 id="hero-title" className={`display mt-6 ${titleSize}`}>
            {t.rich('title', { dim: (chunks) => <span className="dim">{chunks}</span> })}
          </h1>

          <div className="draw-line mt-8 max-w-md" aria-hidden="true" />

          <p className="lead mt-7 max-w-[35rem]">{t('subtitle', { price })}</p>

          <div id="hero-cta" data-sticky-guard="" className="mt-9 flex flex-col gap-3.5 sm:flex-row sm:items-center">
            <Magnetic className="w-full sm:w-auto">
              <CheckoutLink className="btn btn-primary w-full sm:w-auto">
                <span>{t('cta', { price })}</span>
                <ArrowUpRight size={18} strokeWidth={2} aria-hidden="true" />
              </CheckoutLink>
            </Magnetic>
            <a href={`#${SECTION_IDS.showcase}`} className="btn btn-ghost w-full sm:w-auto">
              <span>{t('ctaSecondary')}</span>
              <ArrowDown size={17} strokeWidth={1.75} aria-hidden="true" />
            </a>
          </div>

          <p className="mt-5 flex items-center gap-2 text-sm text-subtle">
            <Lock size={14} strokeWidth={1.75} aria-hidden="true" />
            {t('secure')}
          </p>

          <p className="chip mt-7">
            <ShieldCheck size={17} strokeWidth={1.6} className="shrink-0 text-glow" aria-hidden="true" />
            <span>{t('badge')}</span>
          </p>
        </div>

        <aside data-spotlight="" className="glass p-7 md:p-9" aria-label={t('specTitle')}>
          <p className="eyebrow">{t('specTitle')}</p>
          <dl className="mt-7 divide-y divide-white/10">
            {spec.map(([term, value]) => (
              <div key={term} className="flex items-baseline justify-between gap-6 py-4 first:pt-0 last:pb-0">
                <dt className="text-sm text-muted">{term}</dt>
                <dd className="text-right text-lg font-medium tracking-tight tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </section>
  );
}
