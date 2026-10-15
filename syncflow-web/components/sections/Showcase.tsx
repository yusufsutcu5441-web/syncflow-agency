import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { getLocale, getTranslations } from 'next-intl/server';
import { SceneVideo } from '@/components/media/SceneVideo';
import { SectionHead } from '@/components/ui/SectionHead';
import type { AppLocale } from '@/i18n/routing';
import { breakdownPath } from '@/lib/breakdown';
import { withLocale } from '@/lib/i18n-paths';
import { SECTION_IDS } from '@/lib/site';
import { BreakdownHost } from './BreakdownHost';
import { ShowcaseStrip } from './ShowcaseStrip';

const CARDS = [
  { key: 'estate', id: 'show-estate', overlay: 'start-4 top-4' },
  { key: 'clinic', id: 'show-clinic', overlay: 'start-4 bottom-4' },
  { key: 'law', id: 'show-law', overlay: 'start-4 bottom-4' },
  { key: 'logistics', id: 'show-logistics', overlay: 'start-4 bottom-4' },
] as const;

/**
 * Blueprint section 3, "Sectoral showcase": four wide cards (real estate, clinics, corporate law, and, since docs/adr/0019, logistics) in a native scroll-snap strip. A cursor-following light
 * appears inside the card under the pointer and its video plays; leaving pauses it. The videos are concept renders
 * (rendered ahead of time by npm run film:render), and the cards say so; no client results are claimed. Since docs/adr/0020 every card
 * leads to its architectural breakdown: a plain link to /showcase/<slug> (the whole card is the hit area, through an aria-hidden overlay,
 * and the visible pill is the accessible link), which BreakdownHost upgrades into a dialog over this page.
 */
export async function Showcase() {
  const [t, locale] = await Promise.all([getTranslations('Showcase'), getLocale() as Promise<AppLocale>]);

  return (
    <section id={SECTION_IDS.showcase} className="section" aria-labelledby="showcase-title">
      <div className="container-x">
        <SectionHead id="showcase-title" label={t('label')} title={t('title')} subtitle={t('subtitle')} />
      </div>

      <ShowcaseStrip>
        {CARDS.map(({ key, id, overlay }) => (
          <article key={key} id={id} className="show-card" data-video-host="" data-spotlight="" style={{ '--spot-size': '420px', '--spot-alpha': 0.07 } as CSSProperties}>
            <div className="spot" aria-hidden="true" />
            <div className="frame" data-maskframe="">
              <SceneVideo name={key} mode="hover" label={t(`${key}.videoLabel`)} />
              <span className="badge">{t('concept')}</span>
              <span className={`overlay-chip ${overlay}`} aria-hidden="true">
                {t(`${key}.overlay`)}
              </span>
            </div>
            <div className="p-6 md:p-8">
              <h3 className="text-title">{t(`${key}.title`)}</h3>
              <p className="body-muted mt-4 max-w-2xl">{t(`${key}.text`)}</p>
              <div className="mt-7 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-hairline pt-5">
                <span className="label">{t(`${key}.tag`)}</span>
                <div className="card-actions">
                  <Link
                    href={withLocale(breakdownPath(key), locale)}
                    prefetch={false}
                    data-breakdown-link=""
                    data-slug={key}
                    className="btn btn-ghost btn-sm"
                    aria-label={t('breakdownFor', { sector: t(`${key}.tag`) })}
                  >
                    <span>{t('breakdown')}</span>
                    <ArrowUpRight size={15} strokeWidth={1.75} aria-hidden="true" className="icon-dir" />
                  </Link>
                  <Link href={withLocale(`/#${SECTION_IDS.briefing}`, locale)} prefetch={false} className="footer-link inline-flex items-center gap-1.5 text-sm">
                    {t('cta')}
                    <ArrowUpRight size={15} strokeWidth={1.75} aria-hidden="true" className="icon-dir" />
                  </Link>
                </div>
              </div>
            </div>
            {/* The whole card is a hit area for the breakdown. Hidden from assistive technology and the tab order: the visible pill above is the link. */}
            <Link href={withLocale(breakdownPath(key), locale)} prefetch={false} data-breakdown-link="" data-slug={key} className="card-hit" aria-hidden="true" tabIndex={-1} />
          </article>
        ))}
      </ShowcaseStrip>

      <BreakdownHost />

      <p className="container-x mt-6 text-sm text-faint">{t('conceptNote')}</p>
    </section>
  );
}
