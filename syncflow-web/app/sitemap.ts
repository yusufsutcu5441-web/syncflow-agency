import type { MetadataRoute } from 'next';
import { OPEN_LOCALES } from '@/i18n/launch';
import { LOCALE_LABELS, routing, type AppLocale } from '@/i18n/routing';
import { SITE_URL } from '@/lib/site';

const urlFor = (locale: AppLocale) => (locale === routing.defaultLocale ? `${SITE_URL}/` : `${SITE_URL}/${locale}`);

/**
 * One entry per PUBLIC language (i18n/launch.ts), each listing all public translations (hreflang), plus x-default.
 * Languages that are still drafts never appear. Legal pages are noindex and left out.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const languages = {
    ...Object.fromEntries(OPEN_LOCALES.map((locale) => [LOCALE_LABELS[locale].hreflang, urlFor(locale)])),
    'x-default': `${SITE_URL}/`,
  };

  return OPEN_LOCALES.map((locale) => ({
    url: urlFor(locale),
    changeFrequency: 'monthly',
    priority: locale === routing.defaultLocale ? 1 : 0.8,
    alternates: { languages },
  }));
}
