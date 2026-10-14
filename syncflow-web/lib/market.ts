import type { AppLocale } from '@/i18n/routing';

/**
 * Market (docs/adr/0015-entry-gate-and-hero.md, 0016-qualification-and-markets.md, 0018-seven-capital-centres.md). A market is NOT a
 * language: it says which part of the world a visitor writes from. It sets the currency and the minimum of the briefing
 * (lib/pricing.ts) and tags the briefing for the receiver. The language stays in the path (CLAUDE.md "i18n ve pazar"); the market
 * lives in the address too, as the query parameter `m`. There is no cookie and nothing is stored in the browser.
 *
 * Seven markets, the seven capital centres of the entry gate, each with the language it suggests:
 *   us      United States / Global          English   USD
 *   tr      Türkiye                         Türkçe    TRY
 *   me      Middle East (Dubai and the Gulf) العربية   AED
 *   dach    Germany, Austria, Switzerland   Deutsch   EUR
 *   fr      Monaco and France               Français  EUR
 *   wealth  Global wealth (Spanish-speaking) Español   USD
 *   asia    Asia hubs                       中文       USD
 * The pairing is only a suggestion: the visitor can read any market in any public language.
 *
 * Plain module, no server-only code: the gate (client), the page (server) and the briefing API (zod enum) all import it.
 */
export const MARKETS = ['us', 'tr', 'me', 'dach', 'fr', 'wealth', 'asia'] as const;
export type Market = (typeof MARKETS)[number];

/** The address parameter that carries the market, and also marks the gate as passed: "/tr?m=tr". */
export const MARKET_PARAM = 'm';

/**
 * Values of earlier gates that are still valid in old links: "int" (International, 12.10.2026) meant the dollar market, and "eu"
 * (Europe, English, 13.10.2026) the euro market, which became the German-speaking one when France split from it.
 */
const LEGACY: Record<string, Market> = { int: 'us', eu: 'dach' };

/** Whitelist parse for anything that came from a URL. Unknown values are ignored, never echoed. */
export function parseMarket(value: unknown): Market | null {
  const first = Array.isArray(value) ? value[0] : value;
  if (typeof first !== 'string') return null;
  if ((MARKETS as readonly string[]).includes(first)) return first as Market;
  return LEGACY[first] ?? null;
}

/** The language a market suggests. Only a suggestion: the visitor chooses (and only public languages are offered). */
export const MARKET_DEFAULT_LOCALE: Record<Market, AppLocale> = { us: 'en', tr: 'tr', me: 'ar', dach: 'de', fr: 'fr', wealth: 'es', asia: 'zh' };

/** The market whose currency and minimum apply when the visitor has not chosen one: the one a page's language belongs to (Japanese, still a draft, reads the Asian one). */
const LOCALE_MARKET: Record<AppLocale, Market> = { en: 'us', tr: 'tr', ar: 'me', de: 'dach', fr: 'fr', es: 'wealth', zh: 'asia', ja: 'asia' };
export const defaultMarket = (locale: AppLocale): Market => LOCALE_MARKET[locale];

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
