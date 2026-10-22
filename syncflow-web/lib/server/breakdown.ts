import 'server-only';
import { getFormatter, getTranslations } from 'next-intl/server';
import { LOCALE_LABELS, type AppLocale } from '@/i18n/routing';
import { BREAKDOWN_PARTS, type BreakdownData, type BreakdownSlug } from '@/lib/breakdown';
import { withLocale } from '@/lib/i18n-paths';
import { formatMeasuredAt, METRICS } from '@/lib/metrics';
import { SECTION_IDS } from '@/lib/site';
import { closingCta } from './cta';

const ROMAN = ['I', 'II', 'III', 'IV'] as const;

/**
 * Everything a breakdown shows, resolved for one language: the strings, and the figures of the impact panel formatted in that language.
 * The only numbers in a breakdown are the ones measured on syncflow.agency (lib/metrics.ts, with their date and profile); the sector texts
 * carry no figure at all, and the last part names how impact would be established on an engagement (baseline, target, verification), never a result.
 * Used by the page (app/[locale]/showcase/[slug]/page.tsx) and by the API the dialog reads (app/api/breakdown/route.ts).
 */
export async function loadBreakdown(slug: BreakdownSlug, locale: AppLocale): Promise<BreakdownData> {
  const [t, show, hero, format] = await Promise.all([
    getTranslations({ locale, namespace: 'Breakdown' }),
    getTranslations({ locale, namespace: 'Showcase' }),
    getTranslations({ locale, namespace: 'Hero' }),
    getFormatter({ locale }),
  ]);

  const number = (n: number | null, digits = 0) => (n === null ? hero('pending') : format.number(n, { minimumFractionDigits: digits, maximumFractionDigits: digits }));
  const seconds = (ms: number | null) => (ms === null ? hero('pending') : `${number(ms / 1000, 1)} s`);
  const labels = LOCALE_LABELS[locale];

  const performance = METRICS.lighthousePerformance;

  return {
    slug,
    locale,
    dir: labels.dir,
    lang: labels.hreflang,
    kicker: t('kicker'),
    tag: show(`${slug}.tag`),
    title: show(`${slug}.title`),
    specimen: t('specimen'),
    briefLabel: t('briefLabel'),
    scenario: t(`${slug}.scenario`),
    navLabel: t('navLabel'),
    parts: [
      { id: 'challenge', index: ROMAN[0], heading: t('challengeTitle'), lead: t('challengeLead'), points: [t(`${slug}.c1`), t(`${slug}.c2`), t(`${slug}.c3`)] },
      { id: 'solution', index: ROMAN[1], heading: t('solutionTitle'), lead: t('solutionLead'), points: [t(`${slug}.s1`), t(`${slug}.s2`), t(`${slug}.s3`)] },
      {
        id: 'integration',
        index: ROMAN[2],
        heading: t('integrationTitle'),
        lead: t('integrationLead'),
        points: [t(`${slug}.i1`), t(`${slug}.i2`), t(`${slug}.i3`)],
        note: t('integrationNote'),
      },
    ],
    impact: {
      id: 'impact',
      index: ROMAN[3],
      heading: t('impactTitle'),
      lead: t('impactLead'),
      measuredTitle: t('measuredTitle'),
      measuredLead: t('measuredLead'),
      tiles: [
        {
          label: t('tilePerformance'),
          value: `${number(METRICS.lighthousePerformance.value)} · ${number(METRICS.lighthousePerformanceMobile.value)}`,
          detail: `${t('desktop')} · ${t('mobile')}`,
        },
        { label: t('tileLcp'), value: seconds(METRICS.lcpDesktop.value), detail: t('desktop') },
        { label: t('tileCls'), value: number(METRICS.cls.value, 2), detail: t('desktop') },
        {
          label: t('tileAudit'),
          value: `${number(METRICS.lighthouseAccessibility.value)} · ${number(METRICS.lighthouseBestPractices.value)} · ${number(METRICS.lighthouseSeo.value)}`,
          detail: t('desktop'),
        },
      ],
      caption: t('metricCaption', { tool: 'Lighthouse', profile: performance.profile, date: formatMeasuredAt(performance.measuredAt, locale) }),
      roiTitle: t('roiTitle'),
      roiText: t('roiText'),
      roiSteps: [
        { title: t('roi1Title'), text: t('roi1') },
        { title: t('roi2Title'), text: t('roi2') },
        { title: t('roi3Title'), text: t('roi3') },
      ],
      baselineLabel: t('baselineLabel'),
      baseline: [t(`${slug}.m1`), t(`${slug}.m2`), t(`${slug}.m3`)],
    },
    note: t(`${slug}.note`),
    how: { title: t('howTitle'), text: t('howText'), link: t('howLink'), href: withLocale('/#how-we-built-it', locale) },
    cta: {
      ...(await closingCta(locale)),
      back: t('back'),
      backHref: withLocale(`/#${SECTION_IDS.showcase}`, locale),
    },
  };
}

/** The title and description of a breakdown page, in the page's language. */
export async function breakdownMetadata(slug: BreakdownSlug, locale: AppLocale): Promise<{ title: string; description: string }> {
  const [t, show] = await Promise.all([getTranslations({ locale, namespace: 'Breakdown' }), getTranslations({ locale, namespace: 'Showcase' })]);
  return {
    title: t('metaTitle', { title: show(`${slug}.title`) }),
    description: t('metaDescription', { tag: show(`${slug}.tag`) }),
  };
}

/** The four parts in order, for tests and the sitemap-style checks that need the list without loading messages. */
export const PARTS = BREAKDOWN_PARTS;
