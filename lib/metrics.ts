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

const DESKTOP = 'desktop preset, local production build, median of 3 runs';
// Re-measured on the 2B-1 build (obsidian palette, Instrument Sans, B1 logo, re-rendered clips): docs/perf/faz2b1.md.
const SOURCE = 'Lighthouse 13.5 (npm run perf), docs/perf/faz2b1.md';
const FRAME_PROFILE = '1280x800, headless Chrome, 60 Hz, no CPU throttling';
// The frame sampler was NOT re-run for 2B-1: its numbers belong to the Faz 4 build (the animations did not change, but the
// measurement is that build's), so the entries keep that source and date.
const FRAME_SOURCE = 'requestAnimationFrame sampler, docs/perf/faz4.md (Faz 4 build)';

export const METRICS = {
  lighthousePerformance: { value: 100, unit: 'score', measuredAt: '2026-10-08', profile: DESKTOP, source: SOURCE },
  lighthouseAccessibility: { value: 100, unit: 'score', measuredAt: '2026-10-08', profile: DESKTOP, source: SOURCE },
  lighthouseBestPractices: { value: 100, unit: 'score', measuredAt: '2026-10-08', profile: DESKTOP, source: SOURCE },
  lighthouseSeo: { value: 100, unit: 'score', measuredAt: '2026-10-08', profile: DESKTOP, source: SOURCE },
  // Not published until it is measured again on the 2B-1 build: the Faz 4 value (93, median of 7) belongs to the previous
  // build, and the three unfinished mobile runs taken on this one (69-73, TBT 800-1000 ms) came while the machine was busy,
  // so they neither confirm nor refute it. Run `npm run perf` on a quiet machine, then put the median here.
  lighthousePerformanceMobile: {
    value: null,
    unit: 'score',
    measuredAt: '',
    profile: 'mobile preset, simulated slow 4G, 4x CPU slowdown (not yet measured on the 2B-1 build)',
    source: 'Lighthouse 13.5 (npm run perf), docs/perf/faz2b1.md',
  },
  cls: { value: 0, unit: 'cls', measuredAt: '2026-10-08', profile: DESKTOP, source: SOURCE },
  lcpDesktop: { value: 682, unit: 'ms', measuredAt: '2026-10-08', profile: DESKTOP, source: SOURCE },
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
