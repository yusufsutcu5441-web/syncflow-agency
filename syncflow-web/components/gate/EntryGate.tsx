'use client';

import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type MouseEvent } from 'react';
import { useClientI18n } from '@/components/i18n/ClientI18n';
import { Flag } from '@/components/ui/Flag';
import { Logo } from '@/components/ui/Logo';
import { OPEN_LOCALES } from '@/i18n/launch';
import { LOCALE_LABELS, routing, type AppLocale } from '@/i18n/routing';
import { holdLayoutBefore, releaseAfterScroll } from '@/lib/cv';
import { withLocale } from '@/lib/i18n-paths';
import { MARKET_DEFAULT_LOCALE, MARKETS, rememberMarket, withMarket, type Market } from '@/lib/market';
import { PRICING } from '@/lib/pricing';

/**
 * The entry gate (docs/adr/0015-entry-gate-and-hero.md): a full-screen cinematic layer on the home page that asks for a market and a
 * language before the site opens. The B1 emblem stands in it at monumental size.
 *
 * Rules it follows (CLAUDE.md "i18n ve pazar"):
 *  - The choice lives in the ADDRESS, never in a cookie or in browser storage: "/tr?m=tr". The address with `m` is also what marks
 *    the gate as passed, so a reload or a shared link does not ask again. (`passed` below is plain module memory for the tab, so
 *    that following the logo back to "/" inside the site does not ask again either. It disappears with the tab.)
 *  - It is server-rendered OPEN with real links, so it works without JavaScript: each market is an <a> to the market's page.
 *    JavaScript only upgrades it (language choice, the curtain, focus, inert background). Without a market in the address the
 *    page behind it is still complete, crawlable markup.
 *  - Only launched languages are offered (i18n/launch.ts). No language is forced from an IP address or a browser setting.
 *  - Escape (or "continue without choosing") closes it without choosing: a gate must never be a trap.
 */

type Phase = 'open' | 'closing' | 'closed';

/** Matches the curtain's CSS transition (--gate-duration in globals.css). */
const CLOSE_MS = 1150;

let passed = false;
/** Set while a language change is in flight: the new page mounts under a closed gate and lifts the curtain itself. */
let revealPending = false;

const subscribeNever = () => () => {};

/**
 * Only the markets whose suggested language is public get a card (a closed language is never linked, i18n/launch.ts). With the seven
 * capital-centre languages open that is all seven; if the host closes one, its card goes with it.
 */
const markets: readonly Market[] = MARKETS.filter((code) => OPEN_LOCALES.includes(MARKET_DEFAULT_LOCALE[code]));

function marketHref(market: Market): string {
  const suggested = MARKET_DEFAULT_LOCALE[market];
  const locale = OPEN_LOCALES.includes(suggested) ? suggested : routing.defaultLocale;
  return withMarket(withLocale('/', locale), market);
}

export function EntryGate({ entered, market }: { entered: boolean; market: Market | null }) {
  const { locale, messages } = useClientI18n();
  const t = messages.Gate;
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(() => (revealPending ? 'open' : entered || passed ? 'closed' : 'open'));
  // false on the server and during hydration, true afterwards: the parts that need JavaScript stay hidden until then.
  const ready = useSyncExternalStore(subscribeNever, () => true, () => false);
  const [picked, setPicked] = useState<Market | null>(market);
  const [lang, setLang] = useState<AppLocale>(locale);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const wasOpen = useRef(phase === 'open');

  // A language change landed: the page behind is new, wait two frames so it paints under the curtain, then lift it.
  useEffect(() => {
    if (!revealPending || phase !== 'open') return;
    revealPending = false;
    passed = true;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setPhase('closing'));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [phase]);

  // While open the rest of the page is inert (no focus, no assistive-technology access) and Lenis stands still (smooth-scroll.ts
  // listens for gate:change). Scroll itself is locked in CSS with :has(.gate[data-state='open']).
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('gate:change', { detail: { open: phase === 'open' } }));
    if (phase !== 'open') return;
    const rest = Array.from(document.querySelectorAll<HTMLElement>('#site-root > :not(.gate)'));
    rest.forEach((element) => element.setAttribute('inert', ''));
    titleRef.current?.focus({ preventScroll: true });
    return () => rest.forEach((element) => element.removeAttribute('inert'));
  }, [phase]);

  useEffect(() => {
    if (phase !== 'closing') return;
    // A link that arrived with a section anchor ("/#briefing") could not scroll while the page was locked: go there now, behind the curtain.
    const id = decodeURIComponent(window.location.hash.slice(1));
    const anchor = document.getElementById(id);
    if (anchor) {
      // The sections above the anchor must be real before it is measured (lib/cv.ts, content-visibility: auto).
      releaseAfterScroll(holdLayoutBefore(anchor), 900);
      anchor.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
    const timer = window.setTimeout(() => setPhase('closed'), CLOSE_MS + 120);
    return () => window.clearTimeout(timer);
  }, [phase]);

  // After the curtain is gone, keyboard and screen-reader users start at the page's main content, as after a skip link.
  useEffect(() => {
    if (phase !== 'closed' || !wasOpen.current) return;
    wasOpen.current = false;
    const main = document.getElementById('main');
    if (!main) return;
    main.setAttribute('tabindex', '-1');
    main.focus({ preventScroll: true });
    main.addEventListener('blur', () => main.removeAttribute('tabindex'), { once: true });
  }, [phase]);

  if (phase === 'closed') return null;

  const finish = (choice: { market: Market | null; locale: AppLocale }) => {
    passed = true;
    rememberMarket(choice.market);
    const base = withLocale('/', choice.locale);
    const target = `${choice.market ? withMarket(base, choice.market) : base}${window.location.hash}`;
    if (choice.locale === locale) {
      // Same language: only the address changes (no navigation, no server round trip), so a reload does not ask again.
      if (choice.market) window.history.replaceState(window.history.state, '', target);
      setPhase('closing');
      return;
    }
    revealPending = true;
    router.replace(target, { scroll: false });
  };

  const choose = (event: MouseEvent<HTMLAnchorElement>, next: Market) => {
    // Modified clicks and no-JS keep the plain link behaviour.
    if (!ready || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setPicked(next);
    const suggested = MARKET_DEFAULT_LOCALE[next];
    setLang(OPEN_LOCALES.includes(suggested) ? suggested : locale);
  };

  const skip = () => finish({ market: null, locale });

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && phase === 'open') {
      event.stopPropagation();
      skip();
    }
  };

  return (
    <div
      className="gate"
      data-state={phase}
      data-ready={ready ? '' : undefined}
      data-picked={picked ? '' : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gate-title"
      aria-hidden={phase === 'closing' ? true : undefined}
      onKeyDown={onKeyDown}
    >
      <div className="gate-atmos" aria-hidden="true" />

      {/* The emblem and the wordmark are decorative here (the lockup in the top bar names the studio). Platin only: the brand
          pack forbids a second colour, a glow, a shadow or a gradient on the logo (brand/README.md). */}
      <div className="gate-emblem" aria-hidden="true">
        <Logo part="monogram" />
      </div>
      <div className="gate-wordmark" aria-hidden="true">
        <Logo part="wordmark" />
      </div>

      <div className="gate-top container-x">
        <Logo height={28} title="syncflow.agency" />
      </div>

      <div className="gate-body container-x">
        <p className="label gate-rise" style={{ '--g': 0 } as CSSProperties}>
          {t.eyebrow}
        </p>
        {/* The headline and the lead only slide (no fade, no delay): they are the largest text on the first screen, so they are what the
            browser measures as the largest contentful paint, and they are there from the first frame (ADR 0021). */}
        <h2 id="gate-title" ref={titleRef} tabIndex={-1} className="gate-title gate-slide">
          {t.title}
        </h2>
        <p className="lead gate-slide">{t.lead}</p>

        <div className="gate-group gate-rise" role="group" aria-labelledby="gate-market-label" style={{ '--g': 3 } as CSSProperties}>
          <p id="gate-market-label" className="label">
            {t.marketLabel}
          </p>
          <div className="gate-markets">
            {markets.map((code, index) => {
              const card = LOCALE_LABELS[MARKET_DEFAULT_LOCALE[code]];
              const { currency } = PRICING[code];
              return (
                <a
                  key={code}
                  href={marketHref(code)}
                  className="gate-market"
                  data-market={code}
                  // The card is named by its own language first (the visitor finds it whatever language the page is in), then the
                  // region in the page's language: "Deutsch, DACH and Switzerland, EUR".
                  hrefLang={card.hreflang}
                  aria-current={picked === code ? 'true' : undefined}
                  onClick={(event) => choose(event, code)}
                >
                  {/* Laid out as a grid (flag, index and currency on the first row), read in this order: language, region, currency. */}
                  <span className="gate-market-index" aria-hidden="true">
                    <Flag code={card.flag} />
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="gate-market-name" lang={card.hreflang} dir={card.dir}>
                    {card.native}
                  </span>
                  {/* The region is in the page's language. */}
                  <span className="gate-market-note">{t[code]}</span>
                  {/* The currency comes from the pricing config, so it needs no wording. */}
                  <span className="gate-market-currency" dir="ltr">
                    {currency}
                  </span>
                </a>
              );
            })}
          </div>
        </div>

        {/* Reserved from the first paint (hidden until JavaScript is ready and a market is picked), so nothing moves when it appears. */}
        <div className="gate-group gate-js gate-langs-group" role="group" aria-labelledby="gate-lang-label">
          <p id="gate-lang-label" className="label">
            {t.languageLabel}
          </p>
          <div className="gate-langs">
            {OPEN_LOCALES.map((code) => (
              <button key={code} type="button" className="gate-lang" lang={LOCALE_LABELS[code].hreflang} aria-pressed={lang === code} onClick={() => setLang(code)}>
                <Flag code={LOCALE_LABELS[code].flag} />
                {/* The direction belongs to the name only, so every chip reads flag first, name second. */}
                <span dir={LOCALE_LABELS[code].dir}>{LOCALE_LABELS[code].native}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="gate-actions gate-js">
          <button type="button" className="btn btn-primary" disabled={!picked} onClick={() => picked && finish({ market: picked, locale: lang })}>
            <span>{t.enter}</span>
            <ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" className="icon-dir" />
          </button>
          <button type="button" className="gate-skip" onClick={skip}>
            {t.skip}
          </button>
        </div>
      </div>
    </div>
  );
}
