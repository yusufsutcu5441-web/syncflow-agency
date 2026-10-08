import { OPEN_LOCALES } from '@/i18n/launch';
import { LOCALE_LABELS, routing, type AppLocale } from '@/i18n/routing';
import { CONTACT_EMAIL, SITE_URL } from '@/lib/site';
import { escapeLineSeparators } from '@/lib/text-safety';

type Input = {
  locale: AppLocale;
  siteName: string;
  description: string;
};

const pathFor = (locale: AppLocale) => (locale === routing.defaultLocale ? '/' : `/${locale}`);

/**
 * schema.org graph: Organization + WebSite + ProfessionalService. Languages are the public ones only (i18n/launch.ts).
 * Deliberately absent: address, phone, ratings, reviews, prices. We do not invent facts about the business; add them
 * here once they exist.
 */
export function buildJsonLd({ locale, siteName, description }: Input) {
  const orgId = `${SITE_URL}/#organization`;
  const siteId = `${SITE_URL}/#website`;
  const serviceId = `${SITE_URL}/#service`;
  const pageUrl = `${SITE_URL}${pathFor(locale) === '/' ? '' : pathFor(locale)}`;
  const languages = OPEN_LOCALES.map((l) => LOCALE_LABELS[l].hreflang);

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': orgId,
        name: siteName,
        url: SITE_URL,
        // A raster logo: search engines do not read SVG here (scripts/build-brand.mjs writes it from the B1 monogram).
        logo: `${SITE_URL}/brand/logo-512.png`,
        description,
        email: CONTACT_EMAIL,
      },
      {
        '@type': 'WebSite',
        '@id': siteId,
        url: SITE_URL,
        name: siteName,
        inLanguage: languages,
        publisher: { '@id': orgId },
      },
      {
        '@type': 'ProfessionalService',
        '@id': serviceId,
        name: siteName,
        url: pageUrl,
        description,
        image: `${SITE_URL}/brand/logo-512.png`,
        areaServed: 'Worldwide',
        availableLanguage: languages,
        inLanguage: LOCALE_LABELS[locale].hreflang,
        provider: { '@id': orgId },
      },
    ],
  };
}

/**
 * JSON for an inline <script type="application/ld+json">. "<" is escaped so no string value can ever
 * close the script element early (the standard JSON-in-HTML injection vector).
 */
export function jsonLdString(data: unknown): string {
  return escapeLineSeparators(JSON.stringify(data).replace(/</g, '\\u003c'));
}
