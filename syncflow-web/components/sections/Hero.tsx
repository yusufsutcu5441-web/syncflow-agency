import { ArrowRight, Play } from 'lucide-react';
import Link from 'next/link';
import { getFormatter, getLocale, getTranslations } from 'next-intl/server';
import { MaskLines } from '@/components/ui/MaskText';
import type { AppLocale } from '@/i18n/routing';
import { withLocale } from '@/lib/i18n-paths';
import { formatMeasuredAt, METRICS } from '@/lib/metrics';
import { SECTION_IDS } from '@/lib/site';

/**
 * Hero (Blueprint section 1): full viewport, obsidian, a cursor-following light, a two-line headline that rises
 * line by line through its masks (CSS only, from the first paint), one primary action and a quiet second one, and a strip
 * of three metrics. Everything above the fold is plain server-rendered text, so the largest contentful paint is the
 * headline or the lead as early as the browser can draw it. The numbers come from lib/metrics.ts (measured, dated).
 */
export async function Hero() {
  const [t, locale, format] = await Promise.all([getTranslations('Hero'), getLocale() as Promise<AppLocale>, getFormatter()]);

  const performance = METRICS.lighthousePerformance;
  const cls = METRICS.cls;
  const lcp = METRICS.lcpDesktop;
  const measuredAt = performance.measuredAt;
  const value = (n: number | null, digits = 0) => (n === null ? t('pending') : format.number(n, { minimumFractionDigits: digits, maximumFractionDigits: digits }));

  const strip = [
    [value(performance.value), t('metricPerformance')],
    [value(cls.value, 2), t('metricCls')],
    [lcp.value === null ? t('pending') : `${value(lcp.value / 1000, 1)} s`, t('metricLcp')],
  ] as const;

  return (
    <section id="top" className="hero" data-spotlight="" aria-labelledby="hero-title">
      <div className="spot" aria-hidden="true" />

      <div className="container-x relative">
        <p className="label flex items-center gap-3">
          <span className="live-dot" aria-hidden="true" data-pause-offscreen="" />
          {t('eyebrow')}
        </p>

        {/* data-mask="load": the lines rise through their masks from the first paint, in CSS alone (globals.css). */}
        <h1 id="hero-title" className="display text-hero mt-7 max-w-5xl" data-mask="load">
          <MaskLines lines={[t('title1'), <span key="2" className="dim">{t('title2')}</span>]} />
        </h1>

        <p className="lead mt-9 max-w-2xl">{t('subtitle')}</p>

        <div id="hero-cta" data-sticky-guard="" className="mt-10 flex flex-col gap-3.5 sm:flex-row sm:items-center">
          <Link href={withLocale(`/#${SECTION_IDS.briefing}`, locale)} prefetch={false} className="btn btn-primary w-full sm:w-auto" data-magnetic="">
            <span>{t('ctaPrimary')}</span>
            <ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" className="icon-dir" />
          </Link>
          <Link href={withLocale(`/#${SECTION_IDS.showcase}`, locale)} prefetch={false} className="btn btn-ghost w-full sm:w-auto">
            <Play size={14} strokeWidth={1.75} aria-hidden="true" className="icon-dir" />
            <span>{t('ctaSecondary')}</span>
          </Link>
        </div>

        <dl className="hero-strip">
          {strip.map(([metric, label]) => (
            <div key={label}>
              <dt className="metric-label">{label}</dt>
              <dd className="metric-value mt-1">{metric}</dd>
            </div>
          ))}
        </dl>
        {measuredAt ? (
          <p className="mt-4 text-xs text-faint">
            {t('measured', { date: formatMeasuredAt(measuredAt, locale), tool: 'Lighthouse', profile: performance.profile })}
          </p>
        ) : null}
      </div>

      <div className="scroll-cue" aria-hidden="true" data-pause-offscreen="">
        <span className="rail" />
        <span className="label">{t('scroll')}</span>
      </div>
    </section>
  );
}
