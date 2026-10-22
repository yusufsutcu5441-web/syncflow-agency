import 'server-only';
import { getFormatter, getTranslations } from 'next-intl/server';
import { runScenario } from '@/lib/arch/simulate';
import { SCENARIOS } from '@/lib/arch/scenarios';
import { LOCALE_LABELS, type AppLocale } from '@/i18n/routing';
import type { BreakdownData } from '@/lib/breakdown';
import { BRIEFING_ENABLED } from '@/lib/flags';
import { withLocale } from '@/lib/i18n-paths';
import { formatMeasuredAt, METRICS } from '@/lib/metrics';
import { SPECIMEN_KEY, SPECIMEN_NUMBER, type SpecimenSlug } from '@/lib/specimens';
import { closingCta } from './cta';

const ROMAN = ['I', 'II', 'III', 'IV'] as const;

/**
 * What the reference queue does on the nine scenarios it is verified against (docs/architecture/fail-safe-queue.md), computed by running them:
 * the same scenarios and the same simulator the contract tests run (tests/arch/queue.test.ts asserts the invariants on each). The run is
 * deterministic (a virtual clock, a seeded generator, no timers, no network), so the figures are the same on every request; nothing here is typed in.
 */
function queueFigures() {
  const results = SCENARIOS.map(runScenario);
  return {
    scenarios: results.length,
    /** Scenarios on which every invariant held: nothing lost, nothing applied twice, order kept, every event accounted for. */
    held: results.filter((r) => r.lost === 0 && r.appliedAtReceiver === r.appliedDistinct && r.orderPreserved && r.accountedFor).length,
    accepted: results.reduce((n, r) => n + r.accepted, 0),
    lost: results.reduce((n, r) => n + r.lost, 0),
    appliedTwice: results.reduce((n, r) => n + (r.appliedAtReceiver - r.appliedDistinct), 0),
    repeatsDropped: results.reduce((n, r) => n + r.duplicatesDroppedAtReceiver + r.duplicatesDroppedAtQueue, 0),
    deadLettered: results.reduce((n, r) => n + r.deadLettered, 0),
  };
}
let cached: ReturnType<typeof queueFigures> | undefined;
const figures = () => (cached ??= queueFigures());

/**
 * Everything a specimen page shows, resolved for one language, in the shape of a breakdown (components/sections/BreakdownView.tsx): the four
 * parts are constraint and tolerance, architecture, verification, and the measured result with its limits. The figures are measured (the live
 * site, lib/metrics.ts, with date and profile) or computed (the reference queue, above); the texts carry no client, no client result and no
 * figure of their own.
 */
export async function loadSpecimen(slug: SpecimenSlug, locale: AppLocale): Promise<BreakdownData> {
  const key = SPECIMEN_KEY[slug];
  const [t, b, format] = await Promise.all([
    getTranslations({ locale, namespace: 'Specimen' }),
    getTranslations({ locale, namespace: 'Breakdown' }),
    getFormatter({ locale }),
  ]);
  const number = (n: number, digits = 0) => format.number(n, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const labels = LOCALE_LABELS[locale];
  /** The frame figures named in the constraint text of specimen 01 (ignored by the texts that do not carry the placeholders). */
  const frame = { median: number(METRICS.frameMedian.value, 1), p99: number(METRICS.frameP99.value, 1) };

  const tiles =
    slug === 'studio-site'
      ? [
          { label: b('tilePerformance'), value: `${number(METRICS.lighthousePerformance.value)} · ${number(METRICS.lighthousePerformanceMobile.value)}`, detail: `${b('desktop')} · ${b('mobile')}` },
          { label: b('tileLcp'), value: `${number(METRICS.lcpDesktop.value)} ms`, detail: b('desktop') },
          { label: b('tileCls'), value: number(METRICS.cls.value, 2), detail: b('desktop') },
          { label: t(`${key}.t4Label`), value: `${number(METRICS.frameMedian.value, 1)} · ${number(METRICS.frameP99.value, 1)}`, detail: `ms · ${t(`${key}.t4Detail`)}` },
        ]
      : (() => {
          const f = figures();
          return [
            { label: t('failSafeQueue.t1Label'), value: number(f.scenarios), detail: t('failSafeQueue.t1Detail', { ok: number(f.held), n: number(f.scenarios) }) },
            { label: t('failSafeQueue.t2Label'), value: number(f.accepted), detail: t('failSafeQueue.t2Detail') },
            { label: t('failSafeQueue.t3Label'), value: number(f.lost), detail: t('failSafeQueue.t3Detail') },
            { label: t('failSafeQueue.t4Label'), value: number(f.appliedTwice), detail: t('failSafeQueue.t4Detail', { dropped: number(f.repeatsDropped) }) },
          ];
        })();

  const caption =
    slug === 'studio-site'
      ? t(`${key}.caption`, {
          tool: 'Lighthouse',
          profile: METRICS.lighthousePerformance.profile,
          date: formatMeasuredAt(METRICS.lighthousePerformance.measuredAt, locale),
          frameDate: formatMeasuredAt(METRICS.frameMedian.measuredAt, locale),
        })
      : t(`${key}.caption`, { dead: number(figures().deadLettered) });

  return {
    slug,
    locale,
    dir: labels.dir,
    lang: labels.hreflang,
    kicker: `${t('kicker')} ${SPECIMEN_NUMBER[slug]}`,
    // Specimen 01 is the pipeline of the briefing form: while the form is switched off (lib/flags.ts) it is labelled a reference architecture (docs/adr/0035).
    tag: slug === 'studio-site' && !BRIEFING_ENABLED ? t('studioSite.tagReference') : t(`${key}.tag`),
    title: t(`${key}.title`),
    specimen: t('note'),
    briefLabel: t('briefLabel'),
    scenario: t(`${key}.scenario`),
    navLabel: b('navLabel'),
    parts: [
      { id: 'challenge', index: ROMAN[0], heading: t('p1Title'), lead: t(`${key}.p1Lead`), points: [t(`${key}.c1`), t(`${key}.c2`), t(`${key}.c3`, frame)] },
      { id: 'solution', index: ROMAN[1], heading: t('p2Title'), lead: t(`${key}.p2Lead`), points: [t(`${key}.s1`), t(`${key}.s2`), t(`${key}.s3`)] },
      { id: 'integration', index: ROMAN[2], heading: t('p3Title'), lead: t(`${key}.p3Lead`), points: [t(`${key}.v1`), t(`${key}.v2`), t(`${key}.v3`)], note: t(`${key}.p3Note`) },
    ],
    impact: {
      id: 'impact',
      index: ROMAN[3],
      heading: t('impactTitle'),
      lead: t(`${key}.impactLead`),
      measuredTitle: t('measuredTitle'),
      measuredLead: t(`${key}.measuredLead`),
      tiles,
      caption,
      roiTitle: t('tradeoffsTitle'),
      roiText: t(`${key}.tradeoffsText`),
      roiSteps: [
        { title: t(`${key}.r1Title`), text: t(`${key}.r1`) },
        { title: t(`${key}.r2Title`), text: t(`${key}.r2`) },
        { title: t(`${key}.r3Title`), text: t(`${key}.r3`) },
      ],
      baselineLabel: t('baselineLabel'),
      baseline: [t(`${key}.m1`), t(`${key}.m2`), t(`${key}.m3`)],
    },
    note: t(`${key}.note`),
    how: { title: b('howTitle'), text: b('howText'), link: b('howLink'), href: withLocale('/#how-we-built-it', locale) },
    cta: {
      ...(await closingCta(locale)),
      back: b('back'),
      backHref: withLocale('/#specimens', locale),
    },
  };
}

/** The title and description of a specimen page, in the page's language. */
export async function specimenMetadata(slug: SpecimenSlug, locale: AppLocale): Promise<{ title: string; description: string }> {
  const key = SPECIMEN_KEY[slug];
  const t = await getTranslations({ locale, namespace: 'Specimen' });
  return { title: t('metaTitle', { title: t(`${key}.title`) }), description: t(`${key}.metaDescription`) };
}
