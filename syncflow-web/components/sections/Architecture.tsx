import type { CSSProperties } from 'react';
import { getFormatter, getLocale, getTranslations } from 'next-intl/server';
import { SceneVideo } from '@/components/media/SceneVideo';
import { IntegrationView } from '@/components/sim/IntegrationView';
import { LazyIntegrationSim, LazyQueueSim, LazySecuritySim } from '@/components/sim/LazySims';
import { QueueView } from '@/components/sim/QueueView';
import { SecurityView } from '@/components/sim/SecurityView';
import { IDLE_QUEUE, IDLE_SECURITY, type IntegrationLabels, type QueueLabels, type SecurityLabels } from '@/components/sim/types';
import { SectionHead } from '@/components/ui/SectionHead';
import type { AppLocale } from '@/i18n/routing';
import { formatMeasuredAt, FRAME_SERIES, METRICS } from '@/lib/metrics';
import { SECTION_IDS } from '@/lib/site';

type Formatter = Awaited<ReturnType<typeof getFormatter>>;

const RING_RADIUS = 38;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/**
 * Blueprint section 2: "Engineering, not decoration". A sticky headline on the left, six cards on the right: the front end (I to III,
 * each circled by a Border Beam) and, since docs/adr/0019, the enterprise layer (IV and V, the same shell without a beam: the page
 * keeps at most three). Every number on the cards is read from lib/metrics.ts (measured, dated, with its profile); a metric that has not
 * been measured shows "to be measured" instead of a figure. Cards IV and V carry capability statements, no figures. Since
 * docs/adr/0020 card IV holds the fail-safe queue simulator and card VI (the Zero-Trust Security Flow) the enterprise security flow:
 * two interactive MODELS of a pattern, drawn idle here on the server and brought to life in the browser by a lazily loaded chunk. Since
 * docs/adr/0021 card V holds the third: one canonical event mapped into the shape of four systems (lib/arch/mappers.ts), whose evidence is
 * in docs/architecture/.
 */
export async function Architecture() {
  const [t, locale, format] = await Promise.all([getTranslations('Architecture'), getLocale() as Promise<AppLocale>, getFormatter()]);
  const [h, sim] = await Promise.all([getTranslations('Hero'), getTranslations('Sim')]);

  const queueLabels: QueueLabels = {
    interactive: sim('interactive'),
    title: sim('queue.title'),
    lead: sim('queue.lead'),
    send: sim('queue.send'),
    block: sim('queue.block'),
    restore: sim('queue.restore'),
    reset: sim('queue.reset'),
    producer: sim('queue.producer'),
    primary: sim('queue.primary'),
    standby: sim('queue.standby'),
    consumer: sim('queue.consumer'),
    accepted: sim('queue.accepted'),
    delivered: sim('queue.delivered'),
    waiting: sim('queue.waiting'),
    lost: sim('queue.lost'),
    duplicates: sim('queue.duplicates'),
    statusIdle: sim('queue.statusIdle'),
    statusFlowing: sim('queue.statusFlowing'),
    // These two keep their {placeholders}: the browser fills them as the numbers change.
    statusBlocked: sim.raw('queue.statusBlocked') as string,
    statusDraining: sim('queue.statusDraining'),
    statusDone: sim.raw('queue.statusDone') as string,
    caption: sim('queue.caption'),
  };
  const securityLabels: SecurityLabels = {
    interactive: sim('interactive'),
    title: sim('security.title'),
    lead: sim('security.lead'),
    send: sim('security.send'),
    tamper: sim('security.tamper'),
    replay: sim('security.replay'),
    client: sim('security.client'),
    sign: sim('security.sign'),
    verify: sim('security.verify'),
    encrypt: sim('security.encrypt'),
    deliver: sim('security.deliver'),
    clientText: sim('security.clientText'),
    signText: sim('security.signText'),
    verifyText: sim('security.verifyText'),
    encryptText: sim('security.encryptText'),
    deliverText: sim('security.deliverText'),
    payload: sim('security.payload'),
    signature: sim('security.signature'),
    check: sim('security.check'),
    cipher: sim('security.cipher'),
    checkValid: sim('security.checkValid'),
    checkMismatch: sim('security.checkMismatch'),
    checkFresh: sim('security.checkFresh'),
    checkNew: sim('security.checkNew'),
    checkSeen: sim('security.checkSeen'),
    statusIdle: sim('security.statusIdle'),
    statusStep: sim.raw('security.statusStep') as string,
    outDelivered: sim('security.outDelivered'),
    outRejected: sim('security.outRejected'),
    outDuplicate: sim('security.outDuplicate'),
    outUnavailable: sim('security.outUnavailable'),
    caption: sim('security.caption'),
  };

  const integrationLabels: IntegrationLabels = {
    interactive: sim('interactive'),
    title: sim('integration.title'),
    lead: sim('integration.lead'),
    tabsLabel: sim('integration.tabsLabel'),
    canonical: sim('integration.canonical'),
    payloadLabel: sim('integration.payloadLabel'),
    kind: { salesforce: sim('integration.kind.salesforce'), hubspot: sim('integration.kind.hubspot'), sap: sim('integration.kind.sap'), oracle: sim('integration.kind.oracle') },
    event: { lead: sim('integration.event.lead'), order: sim('integration.event.order'), invoice: sim('integration.event.invoice') },
    // Keeps its {placeholders}: the view fills them for each system.
    status: sim.raw('integration.status') as string,
    caption: sim('integration.caption'),
  };

  const number = (n: number | null, digits = 0) => (n === null ? h('pending') : format.number(n, { minimumFractionDigits: digits, maximumFractionDigits: digits }));
  const date = (iso: string) => formatMeasuredAt(iso, locale);

  const rings = [
    [t('c3Performance'), METRICS.lighthousePerformance.value],
    [t('c3Accessibility'), METRICS.lighthouseAccessibility.value],
    [t('c3BestPractices'), METRICS.lighthouseBestPractices.value],
    [t('c3Seo'), METRICS.lighthouseSeo.value],
  ] as const;

  return (
    <section id={SECTION_IDS.architecture} className="section cv cv-architecture" aria-labelledby="architecture-title">
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

              <div className="mt-7 rounded-[14px] border border-hairline p-5 md:p-6">
                <LazyQueueSim labels={queueLabels}>
                  <QueueView labels={queueLabels} state={{ ...IDLE_QUEUE, status: queueLabels.statusIdle }} />
                </LazyQueueSim>
              </div>
            </div>
          </article>

          {/* V: deep enterprise integrations, as a live model. Named systems are examples of integration targets, never a partner list. */}
          <article className="beam-card" data-maskframe="">
            <div className="beam-body p-6 md:p-8">
              <p className="label">
                {t('c5Index')} — {t('c5Name')}
              </p>
              <h3 className="text-title mt-4">{t('c5Title')}</h3>
              <p className="body-muted mt-4">{t('c5Text')}</p>
              <p className="label mt-5">{t('c5Tags')}</p>

              <div className="mt-7 rounded-[14px] border border-hairline p-5 md:p-6">
                <LazyIntegrationSim labels={integrationLabels}>
                  <IntegrationView labels={integrationLabels} system="salesforce" />
                </LazyIntegrationSim>
              </div>
            </div>
          </article>

          {/* VI: the zero-trust security flow, live. Same shell, no beam. */}
          <article className="beam-card" data-maskframe="">
            <div className="beam-body p-6 md:p-8">
              <p className="label">
                {t('c6Index')} — {t('c6Name')}
              </p>
              <h3 className="text-title mt-4">{t('c6Title')}</h3>
              <p className="body-muted mt-4">{t('c6Text')}</p>
              <p className="label mt-5">{t('c6Tags')}</p>

              <div className="mt-7 rounded-[14px] border border-hairline p-5 md:p-6">
                <LazySecuritySim labels={securityLabels}>
                  <SecurityView labels={securityLabels} state={{ ...IDLE_SECURITY, status: securityLabels.statusIdle }} />
                </LazySecuritySim>
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
