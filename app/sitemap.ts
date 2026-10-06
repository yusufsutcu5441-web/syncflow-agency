import type { MetadataRoute } from 'next';
import { LOCALE_LABELS, routing, type AppLocale } from '@/i18n/routing';
import { SITE_URL } from '@/lib/site';

const urlFor = (locale: AppLocale) => (locale === routing.defaultLocale ? `${SITE_URL}/` : `${SITE_URL}/${locale}`);

/** One entry per language, each listing all its translations (hreflang), plus x-default. Legal pages are noindex and left out. */
export default function sitemap(): MetadataRoute.Sitemap {
  const languages = {
    ...Object.fromEntries(routing.locales.map((locale) => [LOCALE_LABELS[locale].hreflang, urlFor(locale)])),
    'x-default': `${SITE_URL}/`,
  };

  return routing.locales.map((locale) => ({
    url: urlFor(locale),
    changeFrequency: 'monthly',
    priority: locale === routing.defaultLocale ? 1 : 0.8,
    alternates: { languages },
  }));
}
