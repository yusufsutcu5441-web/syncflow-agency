import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { Logo } from '@/components/ui/Logo';
import type { AppLocale } from '@/i18n/routing';
import { withLocale } from '@/lib/i18n-paths';
import { SECTION_IDS } from '@/lib/site';
import { LanguageSwitcher } from './LanguageSwitcher';

const NAV = ['architecture', 'showcase', 'briefing'] as const;

/** Blueprint navigation: the B1 logo lockup left, three section links in the middle, language selector and the briefing pill on the right. */
export async function Header() {
  const [nav, a11y, t, locale] = await Promise.all([
    getTranslations('Nav'),
    getTranslations('A11y'),
    getTranslations('Header'),
    getLocale() as Promise<AppLocale>,
  ]);

  return (
    <header className="site-header" data-site-header="" data-scrolled="false">
      <div className="container-x flex h-full items-center justify-between gap-4">
        {/* prefetch={false}: these point at the page the visitor is already on; prefetching would only cost bytes and CPU. */}
        <Link href={withLocale('/', locale)} prefetch={false} aria-label={a11y('home')}>
          <Logo height={28} />
        </Link>

        <nav aria-label={a11y('mainNav')} className="hidden items-center gap-9 lg:flex">
          {NAV.map((id) => (
            <Link key={id} href={withLocale(`/#${SECTION_IDS[id]}`, locale)} prefetch={false} className="nav-link">
              {nav(id)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <LanguageSwitcher />
          <Link href={withLocale(`/#${SECTION_IDS.briefing}`, locale)} prefetch={false} className="btn btn-ghost btn-sm hidden sm:inline-flex">
            <span>{t('cta')}</span>
            <ArrowUpRight size={15} strokeWidth={1.75} aria-hidden="true" className="icon-dir" />
          </Link>
        </div>
      </div>
    </header>
  );
}
