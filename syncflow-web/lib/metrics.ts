/**
 * Every number the site publishes about its own performance, in one place (CLAUDE.md: "yayındaki sayılar yalnızca
 * ölçülmüş olabilir"). Each entry carries what was measured, when, on which profile and by which tool. A `null`
 * value means "not measured yet": the page then says so instead of showing a number.
 *
 * The Lighthouse numbers come from `npm run perf` against the live site (see below); the frame times come from the
 * requestAnimationFrame sampler of docs/perf/faz4.md (08.10.2026). Re-measure after every visual change and update this
 * file; `node faz2-denetim.mjs` checks that every entry has a date, a profile and a source.
 * Honest limits: three runs, one machine, headless Chrome (lab data, not field data), the frame sampler at 60 Hz.
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

const FRAME_PROFILE = '1280x800, headless Chrome, 60 Hz, no CPU throttling';
// The frame sampler was NOT re-run for 2B-1: its numbers belong to the Faz 4 build (the animations did not change, but the
// measurement is that build's), so the entries keep that source and date.
const FRAME_SOURCE = 'requestAnimationFrame sampler, docs/perf/faz4.md (Faz 4 build)';

// The numbers below are the medians of three Lighthouse runs against the LIVE site (https://syncflow.agency, the deployment of
// 55190ec: the seven capital-centre languages and the enterprise tier on top of the cinema layer, the entry gate and the qualification
// step), taken on 14.10.2026. Raw runs and the spread: docs/perf/live-2026-10-14-enterprise.md. They are what was measured, not what was
// hoped for: the desktop score was 97-99 (median 97, no run reached 100), TBT 103-148 ms (median 145 ms), CLS 0 in every run; the mobile
// score was 83-97 (median 96). The measurement before the seven languages and the enterprise tier (91c009a) is docs/perf/live-2026-10-14.md.
// Re-measure after every visual change and put the new medians here.
const LIVE = 'Lighthouse 13.5 (npm run perf) against https://syncflow.agency, docs/perf/live-2026-10-14-enterprise.md';
const LIVE_DESKTOP = 'desktop preset, live production (syncflow.agency), median of 3 runs';
const LIVE_MOBILE = 'mobile preset (412×823), simulated slow 4G, 4x CPU slowdown, live production (syncflow.agency), median of 3 runs';

export const METRICS = {
  lighthousePerformance: { value: 97, unit: 'score', measuredAt: '2026-10-14', profile: LIVE_DESKTOP, source: LIVE },
  lighthouseAccessibility: { value: 100, unit: 'score', measuredAt: '2026-10-14', profile: LIVE_DESKTOP, source: LIVE },
  lighthouseBestPractices: { value: 100, unit: 'score', measuredAt: '2026-10-14', profile: LIVE_DESKTOP, source: LIVE },
  lighthouseSeo: { value: 100, unit: 'score', measuredAt: '2026-10-14', profile: LIVE_DESKTOP, source: LIVE },
  lighthousePerformanceMobile: { value: 96, unit: 'score', measuredAt: '2026-10-14', profile: LIVE_MOBILE, source: LIVE },
  cls: { value: 0, unit: 'cls', measuredAt: '2026-10-14', profile: LIVE_DESKTOP, source: LIVE },
  lcpDesktop: { value: 570, unit: 'ms', measuredAt: '2026-10-14', profile: LIVE_DESKTOP, source: LIVE },
  tbtDesktop: { value: 145, unit: 'ms', measuredAt: '2026-10-14', profile: LIVE_DESKTOP, source: LIVE },
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
