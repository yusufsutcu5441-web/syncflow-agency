import { ArrowUpRight, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { getFormatter, getLocale, getTranslations } from 'next-intl/server';
import { SectionHead } from '@/components/ui/SectionHead';
import type { AppLocale } from '@/i18n/routing';
import { withLocale } from '@/lib/i18n-paths';
import { formatMeasuredAt, METRICS } from '@/lib/metrics';
import { SECTION_IDS } from '@/lib/site';

/**
 * Section 03, "Studio" (docs/adr/0020-case-study-layer.md): who we are and how we work, with the engineering written out.
 *  - Three principles, each pointing to where it can be checked on this very page: zero defects as a METHOD (never a promise: the
 *    contract forbids absolutes), confidentiality (a mutual NDA is the owner's statement; the no-cookie, no-analytics part is true of
 *    this site), and engineering down to the hardware.
 *  - "How we built it": three technical notes (hardware-decoded video and the GPU cinema layer, frame discipline with
 *    requestAnimationFrame, Lenis smooth-scroll tolerances). Every constant in them is a constant in the code (faz2-denetim.mjs checks
 *    the ones that can drift), and the one measurement in them (the frame time) is read from lib/metrics.ts.
 * Plain server markup: native <details> panels, so everything is readable and crawlable without JavaScript.
 */
export async function Studio() {
  const [t, locale, format, hero] = await Promise.all([getTranslations('Studio'), getLocale() as Promise<AppLocale>, getFormatter(), getTranslations('Hero')]);

  const ms = (value: number | null) => (value === null ? hero('pending') : `${format.number(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ms`);

  const principles = [
    { index: 'I', title: t('p1Title'), text: t('p1Text'), link: t('p1Link'), href: `/#${SECTION_IDS.architecture}` },
    { index: 'II', title: t('p2Title'), text: t('p2Text'), link: t('p2Link'), href: '/privacy' },
    { index: 'III', title: t('p3Title'), text: t('p3Text'), link: t('p3Link'), href: '/#how-we-built-it' },
  ];

  // The manifesto is a set of working rules, each one something this page or its repository does (docs/adr/0025-honest-trust-signals.md); it names
  // no client, no result and no headcount. The facts beneath it are the ones a visitor can check in their own browser.
  const manifesto = ([1, 2, 3, 4, 5] as const).map((n) => ({ title: t(`m${n}Title`), text: t(`m${n}Text`) }));
  const facts = ([1, 2, 3] as const).map((n) => ({ name: t(`f${n}Name`), text: t(`f${n}Text`) }));

  const notes = [
    {
      index: 'I',
      title: t('n1Title'),
      summary: t('n1Summary'),
      tolerances: t('n1Tolerances'),
      steps: [
        { title: t('n1s1t'), text: t('n1s1') },
        { title: t('n1s2t'), text: t('n1s2') },
        { title: t('n1s3t'), text: t('n1s3') },
        { title: t('n1s4t'), text: t('n1s4') },
      ],
    },
    {
      index: 'II',
      title: t('n2Title'),
      summary: t('n2Summary'),
      tolerances: t('n2Tolerances'),
      steps: [
        { title: t('n2s1t'), text: t('n2s1') },
        { title: t('n2s2t'), text: t('n2s2') },
        { title: t('n2s3t'), text: t('n2s3') },
        {
          title: t('n2s4t'),
          text: t('n2s4', {
            median: ms(METRICS.frameMedian.value),
            p99: ms(METRICS.frameP99.value),
            profile: METRICS.frameMedian.profile,
            date: formatMeasuredAt(METRICS.frameMedian.measuredAt, locale),
          }),
        },
      ],
    },
    {
      index: 'III',
      title: t('n3Title'),
      summary: t('n3Summary'),
      tolerances: t('n3Tolerances'),
      steps: [
        { title: t('n3s1t'), text: t('n3s1') },
        { title: t('n3s2t'), text: t('n3s2') },
        { title: t('n3s3t'), text: t('n3s3') },
        { title: t('n3s4t'), text: t('n3s4') },
      ],
    },
  ];

  return (
    <section id={SECTION_IDS.studio} className="section cv cv-studio" aria-labelledby="studio-title">
      <div className="container-x">
        <SectionHead id="studio-title" label={t('label')} title={t('title')} subtitle={t('lead')} />

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {principles.map(({ index, title, text, link, href }) => (
            <article key={index} className="beam-card" data-maskframe="">
              <div className="beam-body flex h-full flex-col p-6 md:p-8">
                <p className="label">{index}</p>
                <h3 className="text-title mt-4">{title}</h3>
                <p className="body-muted mt-4 flex-1">{text}</p>
                <Link href={withLocale(href, locale)} prefetch={false} className="footer-link mt-7 inline-flex items-center gap-1.5 self-start text-sm">
                  {link}
                  <ArrowUpRight size={15} strokeWidth={1.75} aria-hidden="true" className="icon-dir" />
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div id="manifesto" className="mt-24 scroll-mt-28 md:mt-32">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
            <div className="lg:sticky lg:top-32 lg:self-start">
              <p className="label">{t('manifestoLabel')}</p>
              <h3 className="display mt-5 how-title">{t('manifestoTitle')}</h3>
              <p className="body-muted mt-5 max-w-md">{t('manifestoLead')}</p>
            </div>
            <ol className="note-steps">
              {manifesto.map(({ title, text }, i) => (
                <li key={title}>
                  <span className="label note-step-index" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="note-step-title">{title}</p>
                    <p className="body-muted mt-1.5">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-14">
            <p className="label">{t('factsLabel')}</p>
            <ul className="facts mt-5">
              {facts.map(({ name, text }) => (
                <li key={name} className="fact">
                  <p className="fact-name metric-value" dir="ltr">
                    {name}
                  </p>
                  <p className="body-muted mt-2">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div id="how-we-built-it" className="mt-24 scroll-mt-28 md:mt-32">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
            <div className="lg:sticky lg:top-32 lg:self-start">
              <p className="label">{t('howLabel')}</p>
              <h3 className="display mt-5 how-title">{t('howTitle')}</h3>
              <p className="body-muted mt-5 max-w-md">{t('howLead')}</p>
            </div>

            <div className="grid gap-3">
              {notes.map(({ index, title, summary, tolerances, steps }, position) => (
                <details key={index} className="note" open={position === 0}>
                  <summary className="note-summary">
                    <span className="label note-index">{index}</span>
                    <span className="note-head">
                      <span className="note-title text-title">{title}</span>
                      <span className="body-muted note-lead">{summary}</span>
                    </span>
                    <ChevronDown size={18} strokeWidth={1.5} aria-hidden="true" className="note-chevron" />
                  </summary>
                  <div className="note-body">
                    <ol className="note-steps">
                      {steps.map((step, i) => (
                        <li key={step.title}>
                          <span className="label note-step-index" aria-hidden="true">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <div>
                            <p className="note-step-title">{step.title}</p>
                            <p className="body-muted mt-1.5">{step.text}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                    <p className="note-tolerances">
                      <span className="label">{t('tolerances')}</span>
                      <span className="metric-value" dir="ltr">
                        {tolerances}
                      </span>
                    </p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
