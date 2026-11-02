import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { ReplayTerminal } from '@/components/outbound/ReplayTerminal';
import { isOpenLocale } from '@/i18n/launch';
import { routing } from '@/i18n/routing';
import { reviewHref } from '@/lib/contact';
import { withLocale } from '@/lib/i18n-paths';
import { ARCHITECTURE, CLOSING, HERO, META, OUTBOUND_PATH, TERMINAL, TERMINAL_LINES, TRUTH } from '@/lib/outbound';
import { CONTACT_EMAIL } from '@/lib/site';
import './outbound.css';

type Props = { params: Promise<{ locale: string }> };

/**
 * /outbound: the outbound-infrastructure page (docs/adr/0036-outbound-route.md). English only: it answers for the default language and nothing else, so
 * /tr/outbound (and any other language) is a 404 whatever NEXT_PUBLIC_LAUNCHED_LOCALES says. Its text and facts are in lib/outbound.ts, not in messages/*.json.
 * It hides the studio's header, footer and cinema layer (outbound.css) and carries its own. The home page is untouched.
 *
 * Deliberately NO generateStaticParams: a page prerendered at build time cannot carry the per-request CSP nonce (proxy.ts, lib/security/csp.ts), so the browser
 * blocks every Next script on it and the page never hydrates (found on 02.11.2026: 12 CSP violations, React not attached, the replay never typed). Like the
 * legal pages and the case pages, it is rendered on request; the English-only rule is the notFound() below.
 */

export function generateMetadata(): Metadata {
  return {
    title: META.title,
    description: META.description,
    alternates: { canonical: OUTBOUND_PATH },
    openGraph: { type: 'website', url: OUTBOUND_PATH, title: META.title, description: META.description, locale: 'en_US' },
    twitter: { card: 'summary', title: META.title, description: META.description },
    robots: { index: true, follow: true },
  };
}

/** The lead sentence with its two key phrases in bold. */
function Emphasised({ text, words }: { text: string; words: readonly string[] }) {
  const pattern = new RegExp(`(${words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`);
  return <>{text.split(pattern).map((part, i) => (words.includes(part) ? <b key={i}>{part}</b> : part))}</>;
}

export default async function OutboundPage({ params }: Props) {
  const { locale } = await params;
  if (locale !== routing.defaultLocale || !isOpenLocale(locale)) notFound();
  setRequestLocale(locale);

  // With no contact address configured (lib/site.ts) there is no link to print: the call to action is left out, like everywhere else on the site.
  const review = reviewHref();

  return (
    <div className="ob" data-bare-page="">
      <div className="ob-wrap">
        <nav className="ob-nav" aria-label="Main">
          <div className="ob-brand">
            SyncFlow <span>Labs</span>
          </div>
          {review ? (
            <a className="ob-btn" href={review}>
              {HERO.cta}
            </a>
          ) : null}
        </nav>

        <main id="main">
          <header className="ob-hero">
            <div className="ob-eyebrow ob-mono">{HERO.eyebrow}</div>
            <h1 className="ob-h1">
              {HERO.title[0]} <em>{HERO.title[1]}</em>
            </h1>
            <p className="ob-lead">
              <Emphasised text={HERO.lead} words={HERO.leadStrong} />
            </p>
            <div className="ob-cta-row">
              {review ? (
                <a className="ob-btn ob-btn-primary" href={review}>
                  {HERO.cta}
                </a>
              ) : null}
              <a className="ob-btn" href="#architecture">
                {HERO.ctaSecondary}
              </a>
            </div>

            <ReplayTerminal lines={TERMINAL_LINES} label={TERMINAL.label} barTitle={TERMINAL.barTitle} tag={TERMINAL.tag} foot={TERMINAL.foot} replay={TERMINAL.replay} />
          </header>

          <section className="ob-block" id="architecture" aria-labelledby="ob-arch">
            <div className="ob-eyebrow ob-mono">{ARCHITECTURE.eyebrow}</div>
            <h2 className="ob-h2" id="ob-arch">
              {ARCHITECTURE.title}
            </h2>
            <p className="ob-sub">{ARCHITECTURE.sub}</p>
            <ol className="ob-grid">
              {ARCHITECTURE.steps.map((step) => (
                <li className="ob-card" key={step.n}>
                  <div className="ob-card-n ob-mono">{step.n}</div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                  <ul>
                    {step.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                  <div className="ob-stack ob-mono">{step.stack}</div>
                </li>
              ))}
            </ol>

            <div className="ob-truth">
              <h3>{TRUTH.title}</h3>
              <p>{TRUTH.body}</p>
            </div>
          </section>

          <section className="ob-closing" id="review" aria-labelledby="ob-review">
            <div className="ob-eyebrow ob-mono">{CLOSING.eyebrow}</div>
            <h2 className="ob-h2" id="ob-review">
              {CLOSING.title}
            </h2>
            <p className="ob-sub">{CLOSING.sub}</p>
            <div className="ob-cta-row">
              {review ? (
                <a className="ob-btn ob-btn-primary" href={review}>
                  {CLOSING.cta}
                </a>
              ) : null}
              {/* The address is also printed as text, for a visitor whose browser opens no mail program (lib/contact.ts). */}
              {CONTACT_EMAIL ? (
                <span className="ob-address">
                  {CLOSING.addressLead} {CONTACT_EMAIL}
                </span>
              ) : null}
            </div>
          </section>
        </main>

        <footer className="ob-foot">
          <span>SyncFlow Labs</span>
          <Link href={withLocale('/privacy', locale)}>Privacy</Link>
          <Link href={withLocale('/imprint', locale)}>Imprint</Link>
        </footer>
      </div>
    </div>
  );
}
