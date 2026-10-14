import type { AppLocale } from '@/i18n/routing';

/**
 * Market (docs/adr/0015-entry-gate-and-hero.md, docs/adr/0016-qualification-and-markets.md). A market is NOT a language: it says
 * which part of the world a visitor writes from. It sets the currency and the minimum of the briefing (lib/pricing.ts) and
 * tags the briefing for the receiver. The language stays in the path (CLAUDE.md "i18n ve pazar"); the market lives in the address
 * too, as the query parameter `m`. There is no cookie and nothing is stored in the browser.
 *
 * Four markets: United States (USD), Europe (EUR), Middle East (AED), Türkiye (TRY). Only English and Turkish are public
 * languages, so the three international markets read English and Türkiye reads Turkish by default; the visitor can switch.
 * Nothing else (legal wording, showcase) depends on the market yet: that is an open decision, not a default.
 *
 * Plain module, no server-only code: the gate (client), the page (server) and the briefing API (zod enum) all import it.
 */
export const MARKETS = ['us', 'eu', 'me', 'tr'] as const;
export type Market = (typeof MARKETS)[number];

/** The address parameter that carries the market, and also marks the gate as passed: "/tr?m=tr". */
export const MARKET_PARAM = 'm';

/** "int" (International) was the second market of the first gate (12.10.2026). Links with it are still valid and mean the dollar market. */
const LEGACY: Record<string, Market> = { int: 'us' };

/** Whitelist parse for anything that came from a URL. Unknown values are ignored, never echoed. */
export function parseMarket(value: unknown): Market | null {
  const first = Array.isArray(value) ? value[0] : value;
  if (typeof first !== 'string') return null;
  if ((MARKETS as readonly string[]).includes(first)) return first as Market;
  return LEGACY[first] ?? null;
}

/** The language a market suggests. Only a suggestion: the visitor chooses (and only launched languages are offered). */
export const MARKET_DEFAULT_LOCALE: Record<Market, AppLocale> = { us: 'en', eu: 'en', me: 'en', tr: 'tr' };

/** The market whose currency and minimum apply when the visitor has not chosen one: Turkish pages the Turkish market, the rest the dollar market. */
export function defaultMarket(locale: AppLocale): Market {
  return locale === 'tr' ? 'tr' : 'us';
}

/** Fired on window when the gate chooses a market, so components that show market-dependent figures (the briefing) can update. */
export const MARKET_EVENT = 'market:change';

/**
 * The market the visitor chose on the gate in this tab, kept in plain module memory (not storage) so a briefing sent after the
 * address lost its `m` (a visit to a legal page and back) is still tagged. Gone on reload; the address then carries it.
 */
let remembered: Market | null = null;
export const rememberMarket = (market: Market | null) => {
  remembered = market;
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(MARKET_EVENT));
};

/** The market of this visit: the address first, then the gate's memory. Browser only (the server has no visit). */
export function currentMarket(): Market | null {
  if (typeof window === 'undefined') return remembered;
  return parseMarket(new URLSearchParams(window.location.search).get(MARKET_PARAM)) ?? remembered;
}

/** "/tr" + "tr" -> "/tr?m=tr". Keeps a hash the caller already appended. */
export function withMarket(path: string, market: Market): string {
  const [base = path, hash = ''] = path.split('#', 2);
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}${MARKET_PARAM}=${market}${hash ? `#${hash}` : ''}`;
}
