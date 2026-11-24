import type { MetadataRoute } from 'next';
import { OPEN_LOCALES } from '@/i18n/launch';
import { LOCALE_LABELS, routing, type AppLocale } from '@/i18n/routing';
import { type BreakdownSlug, breakdownPath, SHOWN_BREAKDOWN_SLUGS } from '@/lib/breakdown';
import { SHOW_ENTERPRISE } from '@/lib/flags';
import { withLocale } from '@/lib/i18n-paths';
import { OUTBOUND_PATH } from '@/lib/outbound';
import { PILOT_LOCALES, PILOT_PATH } from '@/lib/pilot';
import { SITE_URL } from '@/lib/site';
import { SPECIMEN_SLUGS, specimenPath } from '@/lib/specimens';

const urlFor = (locale: AppLocale) => (locale === routing.defaultLocale ? `${SITE_URL}/` : `${SITE_URL}/${locale}`);
const breakdownUrl = (slug: BreakdownSlug, locale: AppLocale) => `${SITE_URL}${withLocale(breakdownPath(slug), locale)}`;
const specimenUrl = (slug: (typeof SPECIMEN_SLUGS)[number], locale: AppLocale) => `${SITE_URL}${withLocale(specimenPath(slug), locale)}`;

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

  // The breakdowns of this build (lib/breakdown.ts): since docs/adr/0038 section 12 the logistics one is listed only while SHOW_ENTERPRISE is on (off, next.config.mjs
  // answers its addresses with a 301 to the showcase).
  const breakdowns = SHOWN_BREAKDOWN_SLUGS.flatMap((slug) => {
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

  // Since docs/adr/0032: the architectural R&D specimens, one entry per specimen and public language, each with its own hreflang set.
  // Since docs/adr/0038 /outbound, /pilot and the fail-safe-queue specimen belong to the enterprise layer: they are listed only while SHOW_ENTERPRISE is on (off, next.config.mjs
  // answers them with a 301 to the home page). The studio-site specimen is the Lighthouse evidence of the performance claim and is listed in both modes.
  const specimenSlugs = SHOW_ENTERPRISE ? SPECIMEN_SLUGS : SPECIMEN_SLUGS.filter((slug) => slug === 'studio-site');
  const specimens = specimenSlugs.flatMap((slug) => {
    const alternates = {
      languages: {
        ...Object.fromEntries(OPEN_LOCALES.map((locale) => [LOCALE_LABELS[locale].hreflang, specimenUrl(slug, locale)])),
        'x-default': specimenUrl(slug, routing.defaultLocale),
      },
    };
    return OPEN_LOCALES.map((locale) => ({
      url: specimenUrl(slug, locale),
      changeFrequency: 'monthly' as const,
      priority: locale === routing.defaultLocale ? 0.7 : 0.6,
      alternates,
    }));
  });

  // Since docs/adr/0036: the English-only outbound page. One entry, no hreflang: no other language has it.
  const outbound = !SHOW_ENTERPRISE ? [] : [{ url: `${SITE_URL}${OUTBOUND_PATH}`, changeFrequency: 'monthly' as const, priority: 0.7 }];

  // Since docs/adr/0037: the pilot page, in English and Turkish only (the pilot languages that are public), each entry listing the other as its hreflang.
  const pilotOpen = PILOT_LOCALES.filter((locale) => OPEN_LOCALES.includes(locale));
  const pilotUrl = (locale: AppLocale) => `${SITE_URL}${withLocale(PILOT_PATH, locale)}`;
  const pilotAlternates = { languages: { ...Object.fromEntries(pilotOpen.map((locale) => [LOCALE_LABELS[locale].hreflang, pilotUrl(locale)])), 'x-default': pilotUrl(routing.defaultLocale) } };
  const pilot = !SHOW_ENTERPRISE ? [] : pilotOpen.map((locale) => ({ url: pilotUrl(locale), changeFrequency: 'monthly' as const, priority: locale === routing.defaultLocale ? 0.8 : 0.7, alternates: pilotAlternates }));

  return [...home, ...breakdowns, ...specimens, ...outbound, ...pilot];
}
