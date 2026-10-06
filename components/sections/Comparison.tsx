import { Check, X } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { SectionHead } from '@/components/ui/SectionHead';
import { USD_FORMAT } from '@/lib/format';
import { PRICE_USD, SECTION_IDS, TYPICAL_AGENCY_USD } from '@/lib/site';

const ROWS = [
  ['rowPrice', 'priceOld', 'priceNew'],
  ['rowTime', 'timeOld', 'timeNew'],
  ['rowStack', 'stackOld', 'stackNew'],
  ['rowContract', 'contractOld', 'contractNew'],
] as const;

const GRID = 'md:grid md:grid-cols-[minmax(0,0.55fr)_minmax(0,1.2fr)_minmax(0,1.2fr)]';

/**
 * The SyncFlow Contrast Grid: the same four decisions, side by side. Loss framing on the left (muted, struck-through
 * icon), clarity on the right (bright, lit column). Built as an ARIA table, so assistive technology reads it as one,
 * and it collapses to stacked cards on phones. The disclaimer keeps the comparison honest.
 */
export async function Comparison() {
  const t = await getTranslations('Comparison');
  const format = await getFormatter();
  const price = format.number(PRICE_USD, USD_FORMAT);
  const oldPrice = format.number(TYPICAL_AGENCY_USD, USD_FORMAT);

  return (
    <section id={SECTION_IDS.compare} className="section" aria-labelledby="compare-title">
      <div className="container-x">
        <SectionHead
          id="compare-title"
          eyebrow={t('eyebrow')}
          title={t.rich('title', { dim: (chunks) => <span className="dim">{chunks}</span> })}
          subtitle={t('subtitle')}
        />

        <div role="table" aria-label={t('tableCaption')} className="mt-14 md:mt-20">
          <div role="row" className={`hidden ${GRID} md:items-end`}>
            {/* The empty first column needs a real grid cell. An sr-only element is absolutely positioned and would
                be skipped by the grid, shifting both headers one column to the left. */}
            <span role="columnheader">
              <span className="sr-only">{t('tableCaption')}</span>
            </span>
            <span role="columnheader" className="eyebrow px-8 pb-6">
              {t('colTraditional')}
            </span>
            <span
              role="columnheader"
              className="rounded-t-3xl border border-b-0 border-white/15 bg-white/[0.045] px-8 pb-6 pt-7 text-lg font-semibold tracking-tight"
            >
              {t('colSyncflow')}
            </span>
          </div>

          {ROWS.map(([labelKey, oldKey, newKey], index) => {
            const last = index === ROWS.length - 1;
            return (
              <div key={labelKey} role="row" className={`grid gap-4 border-t border-white/10 py-7 ${GRID} md:gap-0 md:py-0`} data-reveal="">
                <div role="rowheader" className="eyebrow md:py-9">
                  {t(labelKey)}
                </div>

                <div role="cell" className="flex items-start gap-3.5 text-muted md:px-8 md:py-9">
                  <X size={20} strokeWidth={1.5} className="mt-0.5 shrink-0 text-subtle" aria-hidden="true" />
                  <div>
                    <span className="eyebrow mb-2 block md:hidden">{t('colTraditional')}</span>
                    <span className="text-lg tracking-tight">{t(oldKey, { oldPrice })}</span>
                  </div>
                </div>

                <div
                  role="cell"
                  className={`flex items-start gap-3.5 text-snow md:border-x md:border-white/15 md:bg-white/[0.045] md:px-8 md:py-9 ${
                    last ? 'md:rounded-b-3xl md:border-b' : ''
                  }`}
                >
                  <Check size={20} strokeWidth={2} className="mt-0.5 shrink-0 text-glow" aria-hidden="true" />
                  <div>
                    <span className="eyebrow mb-2 block md:hidden">{t('colSyncflow')}</span>
                    <span className="text-lg font-medium tracking-tight">{t(newKey, { price })}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-6 max-w-2xl text-sm text-subtle" data-reveal="">
          {t('disclaimer')}
        </p>
      </div>
    </section>
  );
}
