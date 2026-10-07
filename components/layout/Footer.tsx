import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { getLocale, getNow, getTranslations } from 'next-intl/server';
import { Logo } from '@/components/ui/Logo';
import { LOCALE_LABELS, routing, type AppLocale } from '@/i18n/routing';
import { withLocale } from '@/lib/i18n-paths';
import { SECTION_IDS, SITE_URL } from '@/lib/site';

const NAV = ['showcase', 'compare', 'pricing', 'faq', 'contact'] as const;

export async function Footer() {
  const [t, nav, a11y, locale, now] = await Promise.all([
    getTranslations('Footer'),
    getTranslations('Nav'),
    getTranslations('A11y'),
    getLocale() as Promise<AppLocale>,
    getNow(),
  ]);

  const pagePath = locale === routing.defaultLocale ? '' : `/${locale}`;
  const pagespeed = `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(`${SITE_URL}${pagePath}`)}`;
  const linkClass = 'text-muted transition-colors duration-300 hover:text-platin';

  return (
    <footer className="relative border-t border-hairline pb-28 pt-16 md:pb-14 md:pt-20">
      <div className="container-x grid gap-12 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Link href={withLocale('/', locale)} prefetch={false} aria-label={a11y('home')} className="text-platin">
            <Logo />
          </Link>
          <p className="mt-5 max-w-xs text-muted">{t('tagline')}</p>
        </div>

        <nav aria-label={a11y('footerNav')}>
          <p className="eyebrow">{t('navigate')}</p>
          <ul className="mt-5 grid gap-3">
            {NAV.map((id) => (
              <li key={id}>
                <Link href={withLocale(`/#${SECTION_IDS[id]}`, locale)} prefetch={false} className={linkClass}>
                  {nav(id)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="eyebrow">{t('legal')}</p>
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
            <li>
              <a href={pagespeed} target="_blank" rel="noopener noreferrer" className={`${linkClass} inline-flex items-center gap-1.5`}>
                {t('pagespeed')}
                <ArrowUpRight size={14} strokeWidth={1.75} aria-hidden="true" />
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p className="eyebrow">{t('languages')}</p>
          <ul className="mt-5 grid gap-3">
            {routing.locales.map((code) => (
              <li key={code}>
                {/* Plain crawlable links to every translation: good for visitors and for hreflang discovery. */}
                <a
                  href={withLocale('/', code)}
                  lang={LOCALE_LABELS[code].hreflang}
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
      </div>

      <div className="container-x mt-16 border-t border-hairline pt-8 text-sm text-muted">
        <p>{t('rights', { year: now.getFullYear() })}</p>
      </div>
    </footer>
  );
}
