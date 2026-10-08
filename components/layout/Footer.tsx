import { ArrowUp } from 'lucide-react';
import Link from 'next/link';
import { getLocale, getNow, getTranslations } from 'next-intl/server';
import { isDraftLocale, OPEN_LOCALES } from '@/i18n/launch';
import { LOCALE_LABELS, type AppLocale } from '@/i18n/routing';
import { withLocale } from '@/lib/i18n-paths';
import { Logo } from '@/components/ui/Logo';
import { SECTION_IDS } from '@/lib/site';

/**
 * Blueprint footer: four information columns (Studio, Showcase, Reach, Legal), a thin glass line with the legal row,
 * and the studio's drawn wordmark (brand/, B1/v2) set enormous at 6 % opacity across the page end. Reach lists only the languages that are
 * public (i18n/launch.ts), as plain crawlable links.
 */
export async function Footer() {
  const [t, a11y, locale, now] = await Promise.all([
    getTranslations('Footer'),
    getTranslations('A11y'),
    getLocale() as Promise<AppLocale>,
    getNow(),
  ]);

  const linkClass = 'footer-link';
  const here = (id: string) => withLocale(`/#${id}`, locale);

  return (
    <footer className="relative overflow-hidden pt-20 max-md:pb-20 md:pt-28">
      <div className="container-x">
        <nav aria-label={a11y('footerNav')} className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="label">{t('studio')}</p>
            <ul className="mt-5 grid gap-3">
              <li>
                <Link href={here(SECTION_IDS.architecture)} prefetch={false} className={linkClass}>
                  {t('architecture')}
                </Link>
              </li>
              <li>
                <Link href={here(SECTION_IDS.architecture)} prefetch={false} className={linkClass}>
                  {t('performance')}
                </Link>
              </li>
              <li>
                <Link href={here(SECTION_IDS.briefing)} prefetch={false} className={linkClass}>
                  {t('briefing')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="label">{t('showcase')}</p>
            <ul className="mt-5 grid gap-3">
              <li>
                <Link href={here('show-estate')} prefetch={false} className={linkClass}>
                  {t('realEstate')}
                </Link>
              </li>
              <li>
                <Link href={here('show-clinic')} prefetch={false} className={linkClass}>
                  {t('clinics')}
                </Link>
              </li>
              <li>
                <Link href={here('show-saas')} prefetch={false} className={linkClass}>
                  {t('saas')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="label">{t('reach')}</p>
            <ul className="mt-5 grid gap-3">
              {OPEN_LOCALES.map((code) => (
                <li key={code}>
                  {/* Plain crawlable links to every public translation: good for visitors and for hreflang discovery. */}
                  <a
                    href={withLocale('/', code)}
                    lang={LOCALE_LABELS[code].hreflang}
                    dir={LOCALE_LABELS[code].dir}
                    hrefLang={LOCALE_LABELS[code].hreflang}
                    className={linkClass}
                    aria-current={code === locale ? 'true' : undefined}
                  >
                    {LOCALE_LABELS[code].native}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="label">{t('legal')}</p>
            <ul className="mt-5 grid gap-3">
              <li>
                <Link href={withLocale('/privacy', locale)} prefetch={false} className={linkClass}>
                  {t('privacy')}
                </Link>
              </li>
              <li>
                <Link href={withLocale('/imprint', locale)} prefetch={false} className={linkClass}>
                  {t('imprint')}
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        {isDraftLocale(locale) ? <p className="chip mt-12 normal-case">{t('draft')}</p> : null}

        <div className="mt-16 flex flex-col gap-3 border-t border-hairline pt-6 pb-8 text-sm text-faint md:flex-row md:items-center md:justify-between">
          <p>
            {t('rights', { year: now.getFullYear() })}
            <span aria-hidden="true"> · </span>
            {t('measured')}
          </p>
          <a href="#top" className={`${linkClass} inline-flex items-center gap-2`}>
            <ArrowUp size={14} strokeWidth={1.75} aria-hidden="true" />
            {t('top')}
          </a>
        </div>
      </div>

      {/* Decorative: the official drawn wordmark (an SVG outline, so it is no text for a contrast audit to flag) at the
          Blueprint's 6 % opacity. It sits in the page column so the wordmark spans exactly the width of the content. */}
      <div aria-hidden="true" className="container-x pb-6 pt-8">
        <Logo part="wordmark" className="giant-wordmark" />
      </div>
    </footer>
  );
}
