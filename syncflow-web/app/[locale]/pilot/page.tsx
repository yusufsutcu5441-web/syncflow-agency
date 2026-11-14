import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isOpenLocale, OPEN_LOCALES } from '@/i18n/launch';
import { LOCALE_LABELS, type AppLocale } from '@/i18n/routing';
import { pilotHref } from '@/lib/contact';
import { withLocale } from '@/lib/i18n-paths';
import { isPilotLocale, PILOT_LOCALES, PILOT_PATH, pilotCopy, type PilotLocale } from '@/lib/pilot';
import { CONTACT_EMAIL } from '@/lib/site';
import '../outbound/outbound.css';
import './pilot.css';

type Props = { params: Promise<{ locale: string }> };

/**
 * /pilot: the page behind the cold e-mail's offer (docs/adr/0037-pilot-page.md). The e-mails sell a 30-day outbound pilot, paid only if it delivers conversations; the
 * studio's home page sells something else, so a person who read the mail and opened the site met a page that had nothing to do with it. This page states the offer of the
 * mail, in the words of the mail (lib/pilot.ts), and the home page and the footer link to it. English and Turkish only, by hand: any other language answers 404.
 *
 * It uses the visual frame of /outbound (its stylesheet hides the studio's header, footer, mobile bar and cinema layer while it is on screen) and, like /outbound, has NO
 * generateStaticParams: a page prerendered at build time cannot carry the per-request CSP nonce, so the browser would block every Next script on it.
 */

const allowed = (locale: string): locale is PilotLocale & AppLocale => isPilotLocale(locale) && isOpenLocale(locale);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!allowed(locale)) return {};
  const copy = pilotCopy(locale);
  const path = withLocale(PILOT_PATH, locale);
  // hreflang only for the pilot languages that are public (i18n/launch.ts).
  const open = PILOT_LOCALES.filter((code) => OPEN_LOCALES.includes(code));
  const languages = { ...Object.fromEntries(open.map((code) => [LOCALE_LABELS[code].hreflang, withLocale(PILOT_PATH, code)])), 'x-default': PILOT_PATH };
  return {
    title: copy.meta.title,
    description: copy.meta.description,
    alternates: { canonical: path, languages },
    openGraph: { type: 'website', url: path, title: copy.meta.title, description: copy.meta.description, locale: LOCALE_LABELS[locale].ogLocale },
    twitter: { card: 'summary', title: copy.meta.title, description: copy.meta.description },
    robots: { index: true, follow: true },
  };
}

/** The lead sentence with its key phrases in bold. */
function Emphasised({ text, words }: { text: string; words: readonly string[] }) {
  const pattern = new RegExp(`(${words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`);
  return <>{text.split(pattern).map((part, i) => (words.includes(part) ? <b key={i}>{part}</b> : part))}</>;
}

export default async function PilotPage({ params }: Props) {
  const { locale } = await params;
  if (!allowed(locale)) notFound();
  setRequestLocale(locale);

  const c = pilotCopy(locale);
  // The other language of this page, if it is public: a plain link in the nav.
  const other: PilotLocale = locale === 'tr' ? 'en' : 'tr';
  const otherOpen = OPEN_LOCALES.includes(other);
  // With no contact address configured (lib/site.ts) there is no link to print: the calls to action are left out, like everywhere else on the site.
  const mail = pilotHref();

  return (
    <div className="ob pilot" data-bare-page="">
      <div className="ob-wrap">
        <nav className="ob-nav" aria-label={locale === 'tr' ? 'Ana' : 'Main'}>
          <div className="ob-brand">
            SyncFlow <span>Labs</span>
          </div>
          <div className="pilot-nav-links">
            <Link className="pilot-link" href={withLocale('/', locale)}>
              {c.nav.studio}
            </Link>
            {otherOpen ? (
              <a className="pilot-link" href={withLocale(PILOT_PATH, other)} lang={other} hrefLang={other} aria-label={c.nav.langLabel}>
                {c.nav.language}
              </a>
            ) : null}
            {mail ? (
              <a className="ob-btn ob-btn-sm" href={mail}>
                {c.nav.cta}
              </a>
            ) : null}
          </div>
        </nav>

        <main id="main">
          <header className="ob-hero">
            <div className="ob-eyebrow ob-mono">{c.hero.eyebrow}</div>
            <h1 className="ob-h1 pilot-h1">
              {c.hero.title[0]} <em>{c.hero.title[1]}</em>
            </h1>
            <p className="ob-lead">
              <Emphasised text={c.hero.lead} words={c.hero.leadStrong} />
            </p>
            <div className="ob-cta-row">
              {mail ? (
                <a className="ob-btn ob-btn-primary" href={mail}>
                  {c.hero.cta}
                </a>
              ) : null}
              <a className="ob-btn" href="#terms">
                {c.hero.ctaSecondary}
              </a>
            </div>
            <ul className="pilot-facts">
              {c.hero.facts.map((fact) => (
                <li className="pilot-fact" key={fact.value}>
                  <b>{fact.value}</b>
                  <span>{fact.label}</span>
                </li>
              ))}
            </ul>
          </header>

          <section className="ob-block" id="terms" aria-labelledby="pilot-terms">
            <div className="ob-eyebrow ob-mono">{c.terms.eyebrow}</div>
            <h2 className="ob-h2" id="pilot-terms">
              {c.terms.title}
            </h2>
            <p className="ob-sub">{c.terms.sub}</p>
            <ol className="ob-grid">
              {c.terms.cards.map((card) => (
                <li className="ob-card" key={card.n}>
                  <div className="ob-card-n ob-mono">{card.n}</div>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="ob-block" id="qualified" aria-labelledby="pilot-qualified">
            <div className="ob-eyebrow ob-mono">{c.qualified.eyebrow}</div>
            <h2 className="ob-h2" id="pilot-qualified">
              {c.qualified.title}
            </h2>
            <div className="pilot-prose">
              <p>{c.qualified.body}</p>
              <p className="pilot-muted">{c.qualified.notCounted}</p>
              <p>{c.qualified.paid}</p>
            </div>
            <div className="ob-truth">
              <h3>{c.promise.title}</h3>
              <p>{c.promise.body}</p>
            </div>
            <div className="ob-truth pilot-stands">
              <h3>{c.stands.title}</h3>
              <p>{c.stands.body}</p>
            </div>
          </section>

          <section className="ob-block" id="start" aria-labelledby="pilot-start">
            <div className="ob-eyebrow ob-mono">{c.start.eyebrow}</div>
            <h2 className="ob-h2" id="pilot-start">
              {c.start.title}
            </h2>
            <ol className="pilot-steps">
              {c.start.steps.map((step, i) => (
                <li key={step.title}>
                  <span className="pilot-step-n ob-mono" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="ob-closing" id="pilot-contact" aria-labelledby="pilot-closing">
            <div className="ob-eyebrow ob-mono">{c.closing.eyebrow}</div>
            <h2 className="ob-h2" id="pilot-closing">
              {c.closing.title}
            </h2>
            <p className="ob-sub">{c.closing.sub}</p>
            <div className="ob-cta-row">
              {mail ? (
                <a className="ob-btn ob-btn-primary" href={mail}>
                  {c.closing.cta}
                </a>
              ) : null}
              {/* The address is also printed as text, for a visitor whose browser opens no mail program (lib/contact.ts). */}
              {CONTACT_EMAIL ? (
                <span className="ob-address">
                  {c.closing.addressLead}{' '}
                  <bdi dir="ltr" className="pilot-address">
                    {CONTACT_EMAIL}
                  </bdi>
                </span>
              ) : null}
            </div>
          </section>
        </main>

        <footer className="ob-foot">
          <span>SyncFlow Labs</span>
          <Link href={withLocale('/privacy', locale)}>{c.foot.privacy}</Link>
          <Link href={withLocale('/imprint', locale)}>{c.foot.imprint}</Link>
        </footer>
      </div>
    </div>
  );
}
