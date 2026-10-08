import type { CSSProperties } from 'react';
import { getLocale, getTranslations } from 'next-intl/server';
import { SectionHead } from '@/components/ui/SectionHead';
import { isOpenLocale } from '@/i18n/launch';
import { LOCALE_LABELS, routing, type AppLocale } from '@/i18n/routing';
import { withLocale } from '@/lib/i18n-paths';
import { buildGlobe, REACH_SENTENCES } from '@/lib/reach';
import { SECTION_IDS } from '@/lib/site';
import { ReachInteractive, type ReachLanguage } from './ReachInteractive';

/**
 * Blueprint section 3, "Global reach": a line-drawn globe whose seven city points glow in turn, seven language chips
 * around it, and one sentence that switches to the language of the chip you point at. Static markup plus one small client
 * component; no WebGL, no library, no rotation (docs/adr/0006: continuous spinning costs frames and five languages are drafts).
 */
export async function Reach() {
  const [t, locale] = await Promise.all([getTranslations('Reach'), getLocale() as Promise<AppLocale>]);
  const globe = buildGlobe();

  const languages: ReachLanguage[] = routing.locales.map((code) => ({
    code,
    native: LOCALE_LABELS[code].native,
    dir: LOCALE_LABELS[code].dir,
    sentence: REACH_SENTENCES[code],
    href: isOpenLocale(code) ? withLocale('/', code) : null,
  }));

  return (
    <section id={SECTION_IDS.reach} className="section bg-obsidian" aria-labelledby="reach-title">
      <div className="container-x">
        <SectionHead id="reach-title" label={t('label')} title={t('title')} subtitle={t('subtitle')} />

        <div className="mt-16 md:mt-20">
          <p className="label mb-8 text-center">{t('sentenceLabel')}</p>
          <ReachInteractive languages={languages} initial={locale} chipsLabel={t('chipsLabel')} draftLabel={t('draft')} openLabel={t('open')}>
            <svg viewBox={`0 0 ${globe.size} ${globe.size}`} role="img" aria-label={t('globeLabel')} fill="none">
              <circle cx={globe.center} cy={globe.center} r={globe.radius} stroke="rgb(255 255 255 / 0.22)" strokeWidth="1" />
              <path d={globe.d} stroke="rgb(255 255 255 / 0.1)" strokeWidth="0.75" />
              {globe.cities.map((city) => (
                <g key={city.id}>
                  <circle cx={city.x} cy={city.y} r="3" className="city-dot" data-pause-offscreen="" style={{ '--n': city.index } as CSSProperties} />
                  <text x={city.x + city.label.dx} y={city.y + city.label.dy} textAnchor={city.label.anchor} fontSize="9" fill="rgb(255 255 255 / 0.6)" fontFamily="ui-monospace, Menlo, Consolas, monospace" letterSpacing="0.5">
                    {t(`cities.${city.id}`)}
                  </text>
                </g>
              ))}
            </svg>
          </ReachInteractive>
          <p className="label mt-8 text-center">{t('tags')}</p>
        </div>
      </div>
    </section>
  );
}
