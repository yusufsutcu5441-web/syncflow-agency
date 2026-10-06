import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import type { AppLocale } from '@/i18n/routing';
import { withLocale } from '@/lib/i18n-paths';

export default async function NotFound() {
  const [t, locale] = await Promise.all([getTranslations('NotFound'), getLocale() as Promise<AppLocale>]);

  return (
    <main id="main" className="grid min-h-[80dvh] place-items-center pb-24 pt-32">
      <div className="container-x">
        <p className="eyebrow">404</p>
        <h1 className="display mt-6 text-[clamp(2.4rem,6vw,4.5rem)]">{t('title')}</h1>
        <p className="lead mt-6 max-w-lg">{t('body')}</p>
        <Link href={withLocale('/', locale)} prefetch={false} className="btn btn-primary mt-10">
          {t('home')}
        </Link>
      </div>
    </main>
  );
}
