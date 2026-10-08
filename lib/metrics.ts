/**
 * Every number the site publishes about its own performance, in one place (CLAUDE.md: "yayındaki sayılar yalnızca
 * ölçülmüş olabilir"). Each entry carries what was measured, when, on which profile and by which tool. A `null`
 * value means "not measured yet": the page then says so instead of showing a number.
 *
 * Measured with `npm run perf` (Lighthouse 13.5, local production build, `next start`, canonical set to localhost) and with
 * the requestAnimationFrame sampler described in docs/perf/faz4.md, on 08.10.2026. Re-measure after every visual change and
 * update this file; `node faz2-denetim.mjs` checks that every entry has a date, a profile and a source.
 * Honest limits: a local server (HTTP/1.1, gzip), one machine, headless Chrome at 60 Hz. These are not field data.
 */
export type Metric = {
  value: number | null;
  unit: 'score' | 'ms' | 's' | 'cls' | 'fps';
  /** ISO date of the measurement. */
  measuredAt: string;
  /** Device and network profile the number belongs to. */
  profile: string;
  /** Tool and document that hold the raw runs. */
  source: string;
};

const DESKTOP = 'desktop preset, local production build';
const SOURCE = 'Lighthouse 13.5 (npm run perf), docs/perf/faz4.md';
const FRAME_PROFILE = '1280x800, headless Chrome, 60 Hz, no CPU throttling';
const FRAME_SOURCE = 'requestAnimationFrame sampler, docs/perf/faz4.md';

export const METRICS = {
  lighthousePerformance: { value: 100, unit: 'score', measuredAt: '2026-10-08', profile: DESKTOP, source: SOURCE },
  lighthouseAccessibility: { value: 100, unit: 'score', measuredAt: '2026-10-08', profile: DESKTOP, source: SOURCE },
  lighthouseBestPractices: { value: 100, unit: 'score', measuredAt: '2026-10-08', profile: DESKTOP, source: SOURCE },
  lighthouseSeo: { value: 100, unit: 'score', measuredAt: '2026-10-08', profile: DESKTOP, source: SOURCE },
  lighthousePerformanceMobile: {
    value: 93,
    unit: 'score',
    measuredAt: '2026-10-08',
    profile: 'mobile preset, simulated slow 4G, 4x CPU slowdown, median of 7 runs (range 90-95)',
    source: SOURCE,
  },
  cls: { value: 0, unit: 'cls', measuredAt: '2026-10-08', profile: DESKTOP, source: SOURCE },
  lcpDesktop: { value: 653, unit: 'ms', measuredAt: '2026-10-08', profile: DESKTOP, source: SOURCE },
  tbtDesktop: { value: 0, unit: 'ms', measuredAt: '2026-10-08', profile: DESKTOP, source: SOURCE },
  frameMedian: { value: 16.7, unit: 'ms', measuredAt: '2026-10-08', profile: FRAME_PROFILE, source: FRAME_SOURCE },
  frameP99: { value: 16.9, unit: 'ms', measuredAt: '2026-10-08', profile: FRAME_PROFILE, source: FRAME_SOURCE },
} as const satisfies Record<string, Metric>;

export type MetricId = keyof typeof METRICS;

/**
 * The recorded frame intervals (ms) behind the frame-time graph: 160 evenly spaced samples of one real scroll run of the
 * whole page (the median run of five), rounded to 0.1 ms. The graph draws exactly this line.
 */
export const FRAME_SERIES: readonly number[] = [
  16.4, 16.5, 16.8, 16.6, 16.6, 16.8, 16.6, 16.6, 16.7, 16.7, 16.8, 16.8, 16.7, 16.8, 16.9, 16.6, 16.9, 16.6, 16.5, 16.8, 16.7, 16.5, 16.7, 16.7, 16.7, 16.8,
  16.5, 16.7, 16.5, 16.8, 16.4, 16.7, 16.8, 16.7, 16.7, 16.8, 16.7, 16.9, 16.4, 16.7, 16.5, 16.7, 16.8, 16.8, 16.6, 16.6, 16.7, 16.8, 16.5, 16.8, 16.6, 16.7,
  16.7, 16.7, 16.6, 16.8, 16.6, 16.6, 16.7, 16.7, 16.8, 16.8, 16.6, 16.6, 16.5, 16.7, 16.6, 16.8, 16.7, 16.7, 16.3, 17, 16.6, 16.7, 16.7, 16.7, 16.6, 16.7,
  16.6, 16.6, 16.8, 16.7, 16.5, 16.6, 16.8, 16.8, 16.8, 16.7, 16.8, 16.7, 16.8, 16.7, 16.8, 16.4, 16.8, 16.5, 16.6, 16.7, 16.8, 16.5, 16.8, 16.7, 16.6, 16.7,
  16.9, 16.4, 16.6, 16.6, 16.8, 16.9, 16.6, 16.9, 16.8, 16.7, 16.7, 16.7, 16.8, 16.6, 16.6, 16.6, 16.7, 16.8, 16.7, 16.6, 16.5, 16.8, 16.6, 16.5, 16.9, 16.5,
  16.5, 16.6, 16.5, 16.4, 16.8, 16.9, 16.6, 16.7, 16.8, 16.7, 16.5, 16.7, 16.6, 16.8, 16.6, 16.7, 16.5, 16.6, 16.7, 16.8, 16.6, 16.7, 16.7, 16.6, 16.6, 16.8,
  16.4, 16.6, 16.7, 16.7,
];

/** "2026-10-08" -> "8 Oct 2026" in the page language; empty when the metric has no date yet. */
export function formatMeasuredAt(iso: string, locale: string): string {
  if (!iso) return '';
  const date = new Date(`${iso}T12:00:00Z`);
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
}
