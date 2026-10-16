import type { MetadataRoute } from 'next';
import { OPEN_LOCALES } from '@/i18n/launch';
import { LOCALE_LABELS, routing, type AppLocale } from '@/i18n/routing';
import { BREAKDOWN_SLUGS, breakdownPath } from '@/lib/breakdown';
import { withLocale } from '@/lib/i18n-paths';
import { SITE_URL } from '@/lib/site';

const urlFor = (locale: AppLocale) => (locale === routing.defaultLocale ? `${SITE_URL}/` : `${SITE_URL}/${locale}`);
const breakdownUrl = (slug: (typeof BREAKDOWN_SLUGS)[number], locale: AppLocale) => `${SITE_URL}${withLocale(breakdownPath(slug), locale)}`;

/**
 * One entry per PUBLIC language (i18n/launch.ts), each listing all public translations (hreflang), plus x-default; and, since
 * docs/adr/0020-case-study-layer.md, one entry per architectural breakdown and public language, each with its own hreflang set.
 * Languages that are still drafts never appear. Legal pages are noindex and left out.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const languages = {
    ...Object.fromEntries(OPEN_LOCALES.map((locale) => [LOCALE_LABELS[locale].hreflang, urlFor(locale)])),
    'x-default': `${SITE_URL}/`,
  };

  const home = OPEN_LOCALES.map((locale) => ({
    url: urlFor(locale),
    changeFrequency: 'monthly' as const,
    priority: locale === routing.defaultLocale ? 1 : 0.8,
    alternates: { languages },
  }));

  const breakdowns = BREAKDOWN_SLUGS.flatMap((slug) => {
    const alternates = {
      languages: {
        ...Object.fromEntries(OPEN_LOCALES.map((locale) => [LOCALE_LABELS[locale].hreflang, breakdownUrl(slug, locale)])),
        'x-default': breakdownUrl(slug, routing.defaultLocale),
      },
    };
    return OPEN_LOCALES.map((locale) => ({
      url: breakdownUrl(slug, locale),
      changeFrequency: 'monthly' as const,
      priority: locale === routing.defaultLocale ? 0.7 : 0.6,
      alternates,
    }));
  });

  return [...home, ...breakdowns];
}
