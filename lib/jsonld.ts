import { LOCALE_LABELS, routing, type AppLocale } from '@/i18n/routing';
import { DELIVERY_DAYS, PRICE_USD, SITE_URL } from '@/lib/site';
import { escapeLineSeparators } from '@/lib/text-safety';

type Input = {
  locale: AppLocale;
  siteName: string;
  description: string;
  offerName: string;
};

const pathFor = (locale: AppLocale) => (locale === routing.defaultLocale ? '/' : `/${locale}`);

/**
 * schema.org graph: Organization + WebSite + ProfessionalService with the flat-price Offer.
 * Deliberately absent: address, phone, ratings, reviews. We do not invent facts about the business;
 * add them here once they exist.
 */
export function buildJsonLd({ locale, siteName, description, offerName }: Input) {
  const orgId = `${SITE_URL}/#organization`;
  const siteId = `${SITE_URL}/#website`;
  const serviceId = `${SITE_URL}/#service`;
  const pageUrl = `${SITE_URL}${pathFor(locale) === '/' ? '' : pathFor(locale)}`;
  const languages = routing.locales.map((l) => LOCALE_LABELS[l].hreflang);

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': orgId,
        name: siteName,
        url: SITE_URL,
        logo: `${SITE_URL}/icon.svg`,
        description,
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
        image: `${SITE_URL}/icon.svg`,
        areaServed: 'Worldwide',
        availableLanguage: languages,
        inLanguage: LOCALE_LABELS[locale].hreflang,
        provider: { '@id': orgId },
        makesOffer: {
          '@type': 'Offer',
          name: offerName,
          price: String(PRICE_USD),
          priceCurrency: 'USD',
          url: `${pageUrl}#pricing`,
          availability: 'https://schema.org/InStock',
          eligibleDuration: { '@type': 'QuantitativeValue', value: DELIVERY_DAYS, unitCode: 'DAY' },
        },
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
