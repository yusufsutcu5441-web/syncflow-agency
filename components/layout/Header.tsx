import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { CheckoutLink } from '@/components/ui/CheckoutLink';
import { Logo } from '@/components/ui/Logo';
import type { AppLocale } from '@/i18n/routing';
import { withLocale } from '@/lib/i18n-paths';
import { SECTION_IDS } from '@/lib/site';
import { LanguageSwitcher } from './LanguageSwitcher';

const NAV = ['showcase', 'compare', 'pricing', 'faq', 'contact'] as const;

export async function Header() {
  const [nav, a11y, t, locale] = await Promise.all([
    getTranslations('Nav'),
    getTranslations('A11y'),
    getTranslations('Header'),
    getLocale() as Promise<AppLocale>,
  ]);

  return (
    <header className="site-header" data-site-header="" data-scrolled="false">
      <div className="container-x flex h-[4.25rem] items-center justify-between gap-4 md:h-20">
        {/* prefetch={false}: these point at the page the visitor is already on; prefetching would only cost bytes and CPU. */}
        <Link href={withLocale('/', locale)} prefetch={false} aria-label={a11y('home')} className="text-platin">
          <Logo />
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
          {/* Hidden on phones: the hero and the sticky bottom bar already carry the call to action there. */}
          <CheckoutLink className="btn btn-primary btn-sm hidden sm:inline-flex">
            <span>{t('cta')}</span>
            <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" />
          </CheckoutLink>
        </div>
      </div>
    </header>
  );
}
