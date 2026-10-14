import type { CSSProperties } from 'react';
import { getFormatter, getLocale, getTranslations } from 'next-intl/server';
import { SceneVideo } from '@/components/media/SceneVideo';
import { SectionHead } from '@/components/ui/SectionHead';
import type { AppLocale } from '@/i18n/routing';
import { formatMeasuredAt, FRAME_SERIES, METRICS } from '@/lib/metrics';
import { SECTION_IDS } from '@/lib/site';

type Formatter = Awaited<ReturnType<typeof getFormatter>>;

const RING_RADIUS = 38;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/**
 * Blueprint section 2: "Engineering, not decoration". A sticky headline on the left, five cards on the right: the front end (I to III,
 * each circled by a Border Beam) and, since docs/adr/0019, the enterprise layer (IV and V, the same shell without a beam: the page
 * keeps at most three). Every number on the cards is read from lib/metrics.ts (measured, dated, with its profile); a metric that has not
 * been measured shows "to be measured" instead of a figure. Cards IV and V carry capability statements and still schematics, no figures.
 */
export async function Architecture() {
  const [t, locale, format] = await Promise.all([getTranslations('Architecture'), getLocale() as Promise<AppLocale>, getFormatter()]);
  const h = await getTranslations('Hero');

  const number = (n: number | null, digits = 0) => (n === null ? h('pending') : format.number(n, { minimumFractionDigits: digits, maximumFractionDigits: digits }));
  const date = (iso: string) => formatMeasuredAt(iso, locale);

  const rings = [
    [t('c3Performance'), METRICS.lighthousePerformance.value],
    [t('c3Accessibility'), METRICS.lighthouseAccessibility.value],
    [t('c3BestPractices'), METRICS.lighthouseBestPractices.value],
    [t('c3Seo'), METRICS.lighthouseSeo.value],
  ] as const;

  return (
    <section id={SECTION_IDS.architecture} className="section" aria-labelledby="architecture-title">
      <div className="container-x grid gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <SectionHead id="architecture-title" label={t('label')} title={t('title')} subtitle={t('intro')} />
        </div>

        <div className="grid gap-6">
          {/* I: native video */}
          <article className="beam-card" data-maskframe="">
            <span className="beam" aria-hidden="true" data-pause-offscreen="" />
            <div className="beam-body p-6 md:p-8">
              <p className="label">{t('c1Index')}</p>
              <h3 className="text-title mt-4">{t('c1Title')}</h3>
              <p className="body-muted mt-4">{t('c1Text')}</p>
              <p className="label mt-5">{t('c1Tags')}</p>
              <div className="frame mt-7" data-video-host="" data-maskframe="">
                <SceneVideo name="monolith" mode="visible" label={t('c1VideoLabel')} />
                <span className="badge">{t('c1Badge')}</span>
              </div>
            </div>
          </article>

          {/* II: frame time */}
          <article className="beam-card" data-maskframe="">
            <span className="beam" aria-hidden="true" data-pause-offscreen="" />
            <div className="beam-body p-6 md:p-8">
              <p className="label">{t('c2Index')}</p>
              <h3 className="text-title mt-4">{t('c2Title')}</h3>
              <p className="body-muted mt-4">{t('c2Text')}</p>
              <p className="label mt-5">{t('c2Tags')}</p>

              <div className="mt-7 rounded-[14px] border border-hairline p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3">
                  <p className="label">{t('c2GraphLabel')}</p>
                  <dl className="flex gap-8">
                    <div>
                      <dt className="text-xs text-faint">{t('c2Median')}</dt>
                      <dd className="metric-value mt-1 text-base">{METRICS.frameMedian.value === null ? h('pending') : `${number(METRICS.frameMedian.value, 1)} ms`}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-faint">{t('c2P99')}</dt>
                      <dd className="metric-value mt-1 text-base">{METRICS.frameP99.value === null ? h('pending') : `${number(METRICS.frameP99.value, 1)} ms`}</dd>
                    </div>
                  </dl>
                </div>
                <FrameGraph alt={t('c2GraphAlt')} median={METRICS.frameMedian.value} />
                {METRICS.frameMedian.measuredAt ? (
                  <p className="mt-3 text-xs text-faint">{t('c2Caption', { profile: METRICS.frameMedian.profile, date: date(METRICS.frameMedian.measuredAt) })}</p>
                ) : null}
              </div>
            </div>
          </article>

          {/* III: Lighthouse rings */}
          <article className="beam-card" data-maskframe="">
            <span className="beam" aria-hidden="true" data-pause-offscreen="" />
            <div className="beam-body p-6 md:p-8">
              <p className="label">{t('c3Index')}</p>
              <h3 className="text-title mt-4">{t('c3Title')}</h3>
              <p className="body-muted mt-4">{t('c3Text')}</p>
              <p className="label mt-5">{t('c3Tags')}</p>

              <div className="mt-7 rounded-[14px] border border-hairline p-5">
                <div className="grid grid-cols-2 gap-6 sm:grid-cols-4" data-rings="" style={{ '--ring-len': RING_LENGTH.toFixed(2) } as CSSProperties}>
                  {rings.map(([label, value], index) => (
                    <Ring key={label} label={label} value={value} delay={index * 0.15} pending={h('pending')} format={format} />
                  ))}
                </div>
                <p className="mt-6 text-sm text-muted">
                  {t('c3Detail', {
                    cls: number(METRICS.cls.value, 2),
                    lcp: METRICS.lcpDesktop.value === null ? h('pending') : `${number(METRICS.lcpDesktop.value / 1000, 1)} s`,
                    tbt: METRICS.tbtDesktop.value === null ? h('pending') : `${number(METRICS.tbtDesktop.value)} ms`,
                    mobile: METRICS.lighthousePerformanceMobile.value === null ? h('pending') : number(METRICS.lighthousePerformanceMobile.value),
                  })}
                </p>
                {METRICS.lighthouseAccessibility.measuredAt ? (
                  <p className="mt-2 text-xs text-faint">
                    {t('c3Caption', { tool: 'Lighthouse', profile: METRICS.lighthouseAccessibility.profile, date: date(METRICS.lighthouseAccessibility.measuredAt) })}
                  </p>
                ) : null}
              </div>
            </div>
          </article>

          {/* IV: fail-safe enterprise automation. The same card shell as I to III but without the Border Beam: the page keeps at most three. */}
          <article className="beam-card" data-maskframe="">
            <div className="beam-body p-6 md:p-8">
              <p className="label">
                {t('c4Index')} — {t('c4Name')}
              </p>
              <h3 className="text-title mt-4">{t('c4Title')}</h3>
              <p className="body-muted mt-4">{t('c4Text')}</p>
              <p className="label mt-5">{t('c4Tags')}</p>

              <div className="mt-7 rounded-[14px] border border-hairline p-5">
                <FailoverSchematic alt={t('c4DiagramAlt')} />
                <p className="mt-3 text-xs text-faint">{t('c4Caption')}</p>
              </div>
            </div>
          </article>

          {/* V: deep enterprise integrations. Named systems are examples of integration targets, never a partner list. */}
          <article className="beam-card" data-maskframe="">
            <div className="beam-body p-6 md:p-8">
              <p className="label">
                {t('c5Index')} — {t('c5Name')}
              </p>
              <h3 className="text-title mt-4">{t('c5Title')}</h3>
              <p className="body-muted mt-4">{t('c5Text')}</p>
              <p className="label mt-5">{t('c5Tags')}</p>

              <div className="mt-7 rounded-[14px] border border-hairline p-5">
                <HubSchematic alt={t('c5DiagramAlt')} />
                <p className="mt-3 text-xs text-faint">{t('c5Note')}</p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function Ring({ label, value, delay, pending, format }: { label: string; value: number | null; delay: number; pending: string; format: Formatter }) {
  const offset = RING_LENGTH * (1 - (value ?? 0) / 100);
  return (
    <div className="text-center">
      <div className="relative mx-auto size-24">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true" fill="none" strokeWidth="3">
          <circle cx="50" cy="50" r={RING_RADIUS} className="ring-track" />
          <circle
            cx="50"
            cy="50"
            r={RING_RADIUS}
            className="ring-fill"
            strokeDasharray={RING_LENGTH.toFixed(2)}
            strokeDashoffset={offset.toFixed(2)}
            style={{ '--ring-delay': `${delay}s` } as CSSProperties}
          />
        </svg>
        <span className="metric-value absolute inset-0 grid place-items-center text-xl tabular-nums" data-count={value ?? undefined}>
          {value === null ? '—' : format.number(value)}
        </span>
        {value === null ? <span className="sr-only">{pending}</span> : null}
      </div>
      <p className="mt-3 text-xs text-muted">{label}</p>
    </div>
  );
}

/**
 * The failover pattern as a still schematic (no motion, no numbers): a primary lane with one interrupted node and the standby lane that
 * carries the load around it. Platin on the card's own layer colour only, like the frame-time graph; it describes a pattern, it measures
 * nothing, and the caption under it says so.
 */
function FailoverSchematic({ alt }: { alt: string }) {
  const lane = 'rgb(226 226 230 / 0.3)';
  const parcel = (x: number, y: number, key: string) => <rect key={key} x={x - 7} y={y - 3.5} width="14" height="7" rx="2" fill="#E2E2E6" fillOpacity="0.9" />;
  return (
    <svg viewBox="0 0 560 124" className="h-auto w-full" role="img" aria-label={alt} fill="none">
      {/* the primary lane, with a gap where the node went quiet; the standby lane below, dashed until it takes over */}
      <path d="M16 38 H238 M322 38 H544" stroke={lane} strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
      <path d="M16 90 H544" stroke="rgb(226 226 230 / 0.16)" strokeWidth="1.25" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
      {/* the detour, the one bright line */}
      <path d="M206 38 C 244 38 246 90 280 90 C 314 90 316 38 354 38" stroke="#E2E2E6" strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {/* healthy nodes, and the interrupted one (a broken ring, dim) */}
      {[84, 154, 406, 476].map((x) => (
        <circle key={x} cx={x} cy="38" r="4.5" fill="#141416" stroke="#E2E2E6" strokeOpacity="0.8" strokeWidth="1.25" />
      ))}
      <circle cx="280" cy="38" r="9" fill="#141416" stroke="#E2E2E6" strokeOpacity="0.3" strokeWidth="1.25" strokeDasharray="4 5" />
      {/* parcels: two upstream, one on the standby lane, two downstream */}
      {parcel(46, 38, 'p1')}
      {parcel(120, 38, 'p2')}
      {parcel(280, 90, 'p3')}
      {parcel(442, 38, 'p4')}
      {parcel(516, 38, 'p5')}
    </svg>
  );
}

/** A central hub joined to four systems, still and unlabeled (the names are in the card's text): the shape of an integration, not a partner list. */
function HubSchematic({ alt }: { alt: string }) {
  const satellites = [
    [96, 30],
    [464, 30],
    [96, 110],
    [464, 110],
  ] as const;
  return (
    <svg viewBox="0 0 560 140" className="h-auto w-full" role="img" aria-label={alt} fill="none">
      {satellites.map(([x, y]) => (
        <path key={`l-${x}-${y}`} d={`M280 70 L${x} ${y}`} stroke="rgb(226 226 230 / 0.3)" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
      ))}
      {satellites.map(([x, y]) => (
        <g key={`n-${x}-${y}`}>
          <circle cx={(280 + x) / 2} cy={(70 + y) / 2} r="2.5" fill="#E2E2E6" fillOpacity="0.9" />
          <circle cx={x} cy={y} r="9" fill="#141416" stroke="#E2E2E6" strokeOpacity="0.75" strokeWidth="1.25" />
          <circle cx={x} cy={y} r="2.5" fill="#E2E2E6" fillOpacity="0.85" />
        </g>
      ))}
      <circle cx="280" cy="70" r="17" fill="#141416" stroke="#E2E2E6" strokeWidth="1.5" />
      <circle cx="280" cy="70" r="4.5" fill="#E2E2E6" />
    </svg>
  );
}

/** Frame intervals as a thin line. Drawn from the recorded series when there is one, from the median alone otherwise. */
function FrameGraph({ alt, median }: { alt: string; median: number | null }) {
  const W = 400;
  const H = 120;
  const y = (ms: number) => H - 10 - (ms / 40) * (H - 20);
  const series = FRAME_SERIES.length > 1 ? FRAME_SERIES : median === null ? [] : [median, median];
  const points = series.map((ms, i) => `${((i / (series.length - 1)) * W).toFixed(1)},${y(Math.min(ms, 40)).toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 h-28 w-full" role="img" aria-label={alt} preserveAspectRatio="none">
      <line x1="0" x2={W} y1={y(33.3)} y2={y(33.3)} stroke="rgb(226 226 230 / 0.10)" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
      <line x1="0" x2={W} y1={y(16.7)} y2={y(16.7)} stroke="rgb(226 226 230 / 0.18)" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
      {points ? <polyline points={points} fill="none" stroke="#E2E2E6" strokeWidth="1.25" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /> : null}
    </svg>
  );
}
