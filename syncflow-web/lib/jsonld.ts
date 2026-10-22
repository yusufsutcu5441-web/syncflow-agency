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
        // The address comes from the environment (lib/site.ts); with none configured the property is left out.
        ...(CONTACT_EMAIL ? { email: CONTACT_EMAIL } : {}),
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
        availableLanguage: languages,
        inLanguage: LOCALE_LABELS[locale].hreflang,
        provider: { '@id': orgId },
      },
    ],
  };
}

type BreakdownInput = {
  locale: AppLocale;
  siteName: string;
  /** The page's own title and description, as in its metadata. */
  title: string;
  description: string;
  /** The page's path with the language prefix, e.g. "/tr/showcase/law". */
  path: string;
};

/**
 * schema.org graph of an architectural breakdown page (docs/adr/0020): a WebPage that belongs to the site and its publisher (the ids the home page
 * defines) and a two-step BreadcrumbList, home then this page. Nothing the page does not say: no author, no dates, no ratings (the specimens are
 * concept work, not client work, and the page says so).
 */
export function buildBreakdownJsonLd({ locale, siteName, title, description, path }: BreakdownInput) {
  const pageUrl = `${SITE_URL}${path}`;
  const homeUrl = `${SITE_URL}${pathFor(locale) === '/' ? '' : pathFor(locale)}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: title,
        description,
        inLanguage: LOCALE_LABELS[locale].hreflang,
        isPartOf: { '@id': `${SITE_URL}/#website` },
        publisher: { '@id': `${SITE_URL}/#organization` },
        breadcrumb: { '@id': `${pageUrl}#breadcrumb` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${pageUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: siteName, item: homeUrl },
          { '@type': 'ListItem', position: 2, name: title, item: pageUrl },
        ],
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
