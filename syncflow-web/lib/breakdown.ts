import type { AppLocale } from '@/i18n/routing';

/**
 * The architectural breakdown of each showcase specimen (docs/adr/0020-case-study-layer.md): the same content as a page of its own
 * (/showcase/<slug>, indexable, works without JavaScript) and as a dialog over the home page (components/sections/BreakdownDialog.tsx),
 * which fetches it from /api/breakdown. Plain module with types only, shared by the server loader, the page, the API route and the
 * browser. Nothing in a breakdown is a client result: the sectors are studio specimens, the scenarios are design briefs, and the only
 * figures are the ones measured on syncflow.agency itself (lib/metrics.ts).
 */
export const BREAKDOWN_SLUGS = ['estate', 'clinic', 'law', 'logistics'] as const;
export type BreakdownSlug = (typeof BREAKDOWN_SLUGS)[number];

export const isBreakdownSlug = (value: string): value is BreakdownSlug => (BREAKDOWN_SLUGS as readonly string[]).includes(value);

/** The address of a breakdown page, before the locale prefix is added. */
export const breakdownPath = (slug: BreakdownSlug): string => `/showcase/${slug}`;

/** The four parts every breakdown has, in this order, with their roman index. */
export const BREAKDOWN_PARTS = ['challenge', 'solution', 'integration', 'impact'] as const;
export type BreakdownPart = (typeof BREAKDOWN_PARTS)[number];

export type BreakdownData = {
  slug: BreakdownSlug;
  locale: AppLocale;
  dir: 'ltr' | 'rtl';
  lang: string;
  kicker: string;
  /** The sector, as on its showcase card. */
  tag: string;
  title: string;
  /** "Architectural specimen: ... not client work." */
  specimen: string;
  briefLabel: string;
  scenario: string;
  navLabel: string;
  /** Challenge, solution and integration: a heading, a lead and three points each. */
  parts: Array<{ id: Exclude<BreakdownPart, 'impact'>; index: string; heading: string; lead: string; points: string[]; note?: string }>;
  impact: {
    id: 'impact';
    index: string;
    heading: string;
    lead: string;
    measuredTitle: string;
    measuredLead: string;
    tiles: Array<{ label: string; value: string; detail?: string }>;
    caption: string;
    roiTitle: string;
    roiText: string;
    roiSteps: Array<{ title: string; text: string }>;
    baselineLabel: string;
    baseline: string[];
  };
  note: string;
  how: { title: string; text: string; link: string; href: string };
  cta: { title: string; text: string; label: string; href: string; back: string; backHref: string };
};
