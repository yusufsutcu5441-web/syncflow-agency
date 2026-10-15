import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { BreakdownData } from '@/lib/breakdown';

/**
 * One architectural breakdown (docs/adr/0020-case-study-layer.md): the sector's brief, then the four parts every breakdown has, in this
 * order: Challenge, Architectural solution, Integration & security, Measured impact & ROI. A pure function of its data, so the same markup
 * is the page (server) and the dialog (browser). No client result appears in it: the sector is a studio specimen, the scenario a design
 * brief, and the figures are the ones measured on this site (lib/metrics.ts).
 *
 * variant "page": a document of its own (h1, an in-page navigation, real links). variant "dialog": inside the dialog over the home page
 * (h2 as the title; the links that lead back to the home page's own sections call `onAnchor` instead of navigating, so the dialog can close
 * first and the page behind it scrolls there).
 */
export function BreakdownView({ data, variant, onAnchor }: { data: BreakdownData; variant: 'page' | 'dialog'; onAnchor?: (hash: string) => void }) {
  const Title = variant === 'page' ? 'h1' : 'h2';
  const Heading = variant === 'page' ? 'h2' : 'h3';
  const hashOf = (href: string) => href.slice(href.indexOf('#') + 1);

  // In the dialog a link to a section of the home page closes the dialog and lets the page scroll there; on the page it is a plain link.
  const anchor = (href: string, className: string, children: ReactNode) =>
    variant === 'dialog' && onAnchor ? (
      <a
        href={`#${hashOf(href)}`}
        className={className}
        onClick={(event) => {
          event.preventDefault();
          onAnchor(hashOf(href));
        }}
      >
        {children}
      </a>
    ) : (
      <Link href={href} prefetch={false} className={className}>
        {children}
      </Link>
    );

  const { impact } = data;
  const nav = [...data.parts.map((part) => ({ id: part.id, index: part.index, label: part.heading })), { id: impact.id, index: impact.index, label: impact.heading }];

  return (
    <article className="bd" data-variant={variant} data-breakdown={data.slug}>
      <header className="bd-head">
        <p className="label">
          {data.kicker} — {data.tag}
        </p>
        <Title id="bd-title" className="bd-title">
          {data.title}
        </Title>
        <p className="chip bd-specimen normal-case">{data.specimen}</p>
        <div className="bd-brief">
          <p className="label">{data.briefLabel}</p>
          <p className="lead mt-3">{data.scenario}</p>
          <p className="bd-note mt-5">{data.note}</p>
        </div>
        {variant === 'page' ? (
          <nav className="bd-nav" aria-label={data.navLabel}>
            {nav.map((item) => (
              <a key={item.id} href={`#bd-${item.id}`} className="chip normal-case">
                <span aria-hidden="true">{item.index}</span>
                {item.label}
              </a>
            ))}
          </nav>
        ) : null}
      </header>

      {data.parts.map((part) => (
        <section key={part.id} id={`bd-${part.id}`} className="bd-section" aria-labelledby={`bd-${part.id}-h`}>
          <div className="bd-section-head">
            <p className="label">{part.index}</p>
            <Heading id={`bd-${part.id}-h`} className="bd-h">
              {part.heading}
            </Heading>
            <p className="body-muted bd-lead">{part.lead}</p>
          </div>
          <div>
            <ol className="bd-points">
              {part.points.map((text, i) => (
                <li key={text}>
                  <span className="label" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p>{text}</p>
                </li>
              ))}
            </ol>
            {part.note ? <p className="bd-note mt-5">{part.note}</p> : null}
          </div>
        </section>
      ))}

      <section id="bd-impact" className="bd-section" aria-labelledby="bd-impact-h">
        <div className="bd-section-head">
          <p className="label">{impact.index}</p>
          <Heading id="bd-impact-h" className="bd-h">
            {impact.heading}
          </Heading>
          <p className="body-muted bd-lead">{impact.lead}</p>
        </div>

        <div className="bd-impact">
          <div>
            <p className="label">{impact.measuredTitle}</p>
            <p className="body-muted mt-3 text-sm">{impact.measuredLead}</p>
            <dl className="bd-tiles">
              {impact.tiles.map((tile) => (
                <div key={tile.label} className="bd-tile">
                  <dt className="label">{tile.label}</dt>
                  <dd className="bd-tile-value" dir="ltr">
                    {tile.value}
                  </dd>
                  {tile.detail ? <dd className="bd-tile-detail">{tile.detail}</dd> : null}
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-faint">{impact.caption}</p>
          </div>

          <div>
            <p className="label">{impact.roiTitle}</p>
            <p className="body-muted mt-3 text-sm">{impact.roiText}</p>
            <ol className="bd-steps">
              {impact.roiSteps.map((step, i) => (
                <li key={step.title}>
                  <span className="label" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="bd-step-title">{step.title}</p>
                    <p className="body-muted mt-1 text-sm">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="label mt-7">{impact.baselineLabel}</p>
            <ul className="bd-baseline">
              {impact.baseline.map((item) => (
                <li key={item} className="chip normal-case">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <aside className="bd-how">
        <p className="label">{data.how.title}</p>
        <p className="body-muted mt-3 max-w-xl">{data.how.text}</p>
        {anchor(
          data.how.href,
          'footer-link mt-5 inline-flex items-center gap-1.5 text-sm',
          <>
            {data.how.link}
            <ArrowUpRight size={15} strokeWidth={1.75} aria-hidden="true" className="icon-dir" />
          </>,
        )}
      </aside>

      <footer className="bd-cta">
        <Heading className="bd-h">{data.cta.title}</Heading>
        <p className="body-muted mt-3 max-w-xl">{data.cta.text}</p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          {anchor(
            data.cta.href,
            'btn btn-primary',
            <>
              <span>{data.cta.label}</span>
              <ArrowUpRight size={18} strokeWidth={1.75} aria-hidden="true" className="icon-dir" />
            </>,
          )}
          {anchor(
            data.cta.backHref,
            'btn btn-ghost',
            <>
              <ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" className="icon-dir" />
              <span>{data.cta.back}</span>
            </>,
          )}
        </div>
      </footer>
    </article>
  );
}
