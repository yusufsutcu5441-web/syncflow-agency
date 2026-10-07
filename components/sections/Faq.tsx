import { Plus } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { SectionHead } from '@/components/ui/SectionHead';
import { USD_FORMAT } from '@/lib/format';
import { PRICE_USD, SECTION_IDS } from '@/lib/site';

const ITEMS = [1, 2, 3, 4, 5] as const;

/** Objection handling in the buyer's own words. Native <details>: works without JavaScript and is keyboard accessible. */
export async function Faq() {
  const t = await getTranslations('Faq');
  const format = await getFormatter();
  const price = format.number(PRICE_USD, USD_FORMAT);

  return (
    <section id={SECTION_IDS.faq} className="section" aria-labelledby="faq-title">
      <div className="container-x grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
        <SectionHead id="faq-title" stacked eyebrow={t('eyebrow')} title={t('title')} />

        <div className="faq">
          {ITEMS.map((n) => (
            <details key={n}>
              <summary>
                <span>{t(`q${n}`, { price })}</span>
                <Plus size={22} strokeWidth={1.5} aria-hidden="true" />
              </summary>
              <p className="answer">{t(`a${n}`)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
