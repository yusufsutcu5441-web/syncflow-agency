/**
 * Every number the site publishes about its own performance, in one place (CLAUDE.md: "yayındaki sayılar yalnızca
 * ölçülmüş olabilir"). Each entry carries what was measured, when, on which profile and by which tool. A `null`
 * value means "not measured yet": the page then says so instead of showing a number.
 *
 * The Lighthouse numbers come from `npm run perf` against the live site (see below); the frame times come from the
 * requestAnimationFrame sampler of docs/perf/faz4.md (08.10.2026). Re-measure after every visual change and update this
 * file; `node faz2-denetim.mjs` checks that every entry has a date, a profile and a source.
 * Honest limits: one machine, one location, one session per seal (five desktop runs and nine mobile runs in the current
 * one), headless Chrome (lab data, not field data), the frame sampler at 60 Hz and not re-run since 08.10.2026.
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

// The seal of 17.10.2026 (replaced by the 22.11.2026 measurement further down, kept here as the record of that session): medians of Lighthouse
// runs against the LIVE site (https://syncflow.agency, the deployment of 6db4007: React and
// Next start after the first paint, on top of the case studies, the worker-driven cinema layer and the single text face Inter Display), taken
// on 17.10.2026. Raw runs and the spread: docs/perf/live-2026-10-17.md. They are what was measured, not what was hoped for. Desktop: eight runs,
// score 97-100 (median 100; the 97 is one run with a single 144 ms long task), TBT 0 ms in most runs, CLS 0 in every run. Mobile: four sessions on
// the same day. Two ran on a quiet machine (host CPU 2-12 %): 14 runs, score 99-100, median 100, TBT 24-48 ms, LCP 1.47-1.62 s; the latest of them
// (deployment c72a253, 7 runs) was 100 in every run. Two ran while the host CPU was at 42-91 % from other programs: 11 runs, 72-99, TBT up to 928 ms,
// because hydration now falls inside the TBT window (ADR 0023) and the lab's 4x slowdown is relative to a busy host. The seal is the quiet-machine
// median, and the profile below says how far the score moves under load; a run on a loaded machine is not published as 100. Accessibility, best
// practices and SEO were 100 in every run of both presets. The measurement before this one (94f3490) is docs/perf/live-2026-10-16.md (mobile 96,
// LCP 2.43 s). Re-measure after every visual change, on a quiet machine, and put the new medians here.
// 22.11.2026: both profiles were measured again against the live deployment of the studio-only site (docs/adr/0038 hid the enterprise sections,
// a visual change; deployment 7fda82e, same code as f8bdebe). Desktop, five runs of "/": performance 100 in every run, LCP 402, 392, 394, 387,
// 387 ms (median 392), TBT 0 ms (one run 1 ms), CLS 0 in every run; accessibility, best practices and SEO 100. Mobile, a second session on a
// quiet host (14 % CPU before, 9 % after), five runs each of "/" and "/tr": 93, 100, 100, 100, 100 and 100, 100, 100, 100, 100 (median 100;
// the 93 was the first run of the session, TBT 178 ms, the other nine 26-53 ms), LCP 1.55 s in every run. An earlier mobile session that day
// ran while other work loaded the host (one run 90 with TBT 227 ms) and is recorded but not sealed. Raw runs and the spread:
// docs/perf/live-2026-11-22.md; the previous seal (17.10.2026) is docs/perf/live-2026-10-17.md.
// 24.11.2026 (the owner's claim audit, docs/adr/0038 §13): measured again against the live deployment of 84b7e70, because the site had changed
// visually twice since the seal (the logistics card left the shipped page; the estate film became the photo-based estate-2, which changed what "/"
// downloads). Quiet machine (host CPU 1 % before the run), same tool and presets, five desktop runs of "/" and five mobile runs each of "/" and "/tr".
// Desktop: performance 100 in every run, accessibility, best practices and SEO 100 in every run, LCP 385, 388, 398, 390, 384 ms (median 388), TBT 0 ms
// in every run, CLS 0 in every run. Mobile: nine runs finished (one "/" run died in Lighthouse's own trace recorder, NO_NAVSTART) and scored
// 99, 99, 99, 99, 99, 100, 100, 100, 100 -> the median is 99, not the 100 that was sealed on 22.11; no run fell below 99 and TBT stayed between 38
// and 79 ms. The sealed mobile number is therefore 99 and the profile says the spread in words: the old profile's "(93-100)" sat next to a sealed
// "100" on the page and could be read as a contradiction, which is what the owner's audit asked about. Raw runs: docs/perf/live-2026-11-24.md.
// 25.11.2026 (docs/adr/0038 §19 and §21): the architecture monolith was graded for contrast and the three sector films became concept-site
// recordings, which together took public/media/clips from 16.5 to 8.8 MB. The seal was NOT re-taken, and does not need to be: every clip sits
// below the fold with preload="none" and a lazy still, and Lighthouse does not scroll, so none of them is part of what "/" downloads.
// 25.11.2026 evening (§22): the whole palette moved to the warm-anthracite family. That changes CSS values, not weight (same bytes within
// noise) and no contrast ratio below AA (the audit computes every token over every surface on each run), so the numbers these seals measure
// are not touched by it; per the rule above the live deployment is re-measured right after this ships, and this file is only ever updated
// from a real measurement.
const LIVE_NOV = 'Lighthouse 13.5 (npm run perf) against https://syncflow.agency, docs/perf/live-2026-11-24.md';
const LIVE_DESKTOP_NOV = 'desktop preset, live production (syncflow.agency), median of 5 runs, all five 100';
const LIVE_MOBILE_NOV = 'mobile preset (412×823), simulated slow 4G, 4x CPU slowdown, live production (syncflow.agency), median of 9 runs on two pages in one session on a quiet machine, every run 99 or 100';

export const METRICS = {
  lighthousePerformance: { value: 100, unit: 'score', measuredAt: '2026-11-24', profile: LIVE_DESKTOP_NOV, source: LIVE_NOV },
  lighthouseAccessibility: { value: 100, unit: 'score', measuredAt: '2026-11-24', profile: LIVE_DESKTOP_NOV, source: LIVE_NOV },
  lighthouseBestPractices: { value: 100, unit: 'score', measuredAt: '2026-11-24', profile: LIVE_DESKTOP_NOV, source: LIVE_NOV },
  lighthouseSeo: { value: 100, unit: 'score', measuredAt: '2026-11-24', profile: LIVE_DESKTOP_NOV, source: LIVE_NOV },
  lighthousePerformanceMobile: { value: 99, unit: 'score', measuredAt: '2026-11-24', profile: LIVE_MOBILE_NOV, source: LIVE_NOV },
  cls: { value: 0, unit: 'cls', measuredAt: '2026-11-24', profile: LIVE_DESKTOP_NOV, source: LIVE_NOV },
  lcpDesktop: { value: 388, unit: 'ms', measuredAt: '2026-11-24', profile: LIVE_DESKTOP_NOV, source: LIVE_NOV },
  tbtDesktop: { value: 0, unit: 'ms', measuredAt: '2026-11-24', profile: LIVE_DESKTOP_NOV, source: LIVE_NOV },
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
