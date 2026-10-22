import { ArrowRight, Play } from 'lucide-react';
import Link from 'next/link';
import { getFormatter, getLocale, getTranslations } from 'next-intl/server';
import { Logo } from '@/components/ui/Logo';
import { MaskLines } from '@/components/ui/MaskText';
import type { AppLocale } from '@/i18n/routing';
import { auditHref } from '@/lib/contact';
import { BRIEFING_ENABLED } from '@/lib/flags';
import { withLocale } from '@/lib/i18n-paths';
import { formatMeasuredAt, METRICS } from '@/lib/metrics';
import { SECTION_IDS } from '@/lib/site';

/**
 * Hero (Blueprint section 1, cinematic since docs/adr/0015-entry-gate-and-hero.md): full viewport, obsidian, the B1 emblem at
 * monumental size behind a two-line headline that rises line by line through its masks (CSS only, from the first paint, or from
 * the moment the entry gate lifts), one primary action and a quiet second one, and a strip of three metrics. Everything above
 * the fold is plain server-rendered text, so the largest contentful paint is the headline or the lead as early as the browser
 * can draw it. The numbers come from lib/metrics.ts (measured, dated).
 *
 * On a desktop (fine pointer, tall enough, no reduced motion) the section is taller than the screen and its stage is sticky:
 * lib/enhance/hero.ts writes the scroll progress into --hp and CSS alone moves the emblem, fades the copy and the cinema layer
 * brightens, so scrolling feels like moving through the space. On phones and without JavaScript it is the plain one-screen hero.
 */
export async function Hero() {
  const [t, locale, format, contact] = await Promise.all([getTranslations('Hero'), getLocale() as Promise<AppLocale>, getFormatter(), getTranslations('Contact')]);
  // The primary action: the briefing while the form is offered, otherwise the free site audit request as a mail (lib/contact.ts).
  const audit = auditHref();

  const performance = METRICS.lighthousePerformance;
  const cls = METRICS.cls;
  const lcp = METRICS.lcpDesktop;
  // The note under the strip carries the date and profile of the numbers it shows. The score is "to be measured" (lib/metrics.ts),
  // so the note comes from a metric that is shown with a value.
  const measuredAt = lcp.measuredAt;
  const value = (n: number | null, digits = 0) => (n === null ? t('pending') : format.number(n, { minimumFractionDigits: digits, maximumFractionDigits: digits }));

  const strip = [
    [value(performance.value), t('metricPerformance')],
    [value(cls.value, 2), t('metricCls')],
    [lcp.value === null ? t('pending') : `${value(lcp.value / 1000, 1)} s`, t('metricLcp')],
  ] as const;

  return (
    <section id="top" className="hero" data-hero="" aria-labelledby="hero-title">
      <div className="hero-stage" data-spotlight="">
        <div className="spot" aria-hidden="true" />

        {/* The identity at scale: the B1 monogram, platin only (brand/README.md allows no second colour, glow, shadow or gradient). */}
        <div className="hero-monogram" aria-hidden="true">
          <Logo part="monogram" />
        </div>
        {/* The drawn wordmark across the stage's foot, platin at 6 % like the footer's: the identity is on the first screen in both parts. */}
        <div className="hero-wordmark" aria-hidden="true">
          <Logo part="wordmark" />
        </div>

        <div className="container-x relative hero-copy">
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
            {BRIEFING_ENABLED ? (
              <Link href={withLocale(`/#${SECTION_IDS.briefing}`, locale)} prefetch={false} className="btn btn-primary w-full sm:w-auto" data-magnetic="">
                <span>{t('ctaPrimary')}</span>
                <ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" className="icon-dir" />
              </Link>
            ) : audit ? (
              <a href={audit} className="btn btn-primary w-full sm:w-auto" data-magnetic="">
                <span>{contact('auditCta')}</span>
                <ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" className="icon-dir" />
              </a>
            ) : null}
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
              {t('measured', { date: formatMeasuredAt(measuredAt, locale), tool: 'Lighthouse', profile: lcp.profile })}
            </p>
          ) : null}
        </div>

        <div className="scroll-cue" aria-hidden="true" data-pause-offscreen="">
          <span className="rail" />
          <span className="label">{t('scroll')}</span>
        </div>
      </div>
    </section>
  );
}
