import type { AppLocale } from '@/i18n/routing';

/**
 * Market (docs/adr/0015-entry-gate-and-hero.md). A market is NOT a language and NOT a currency: it says which part of the world
 * a visitor writes from, so a briefing can be tagged with it. The language stays in the path (CLAUDE.md "i18n ve pazar"); the
 * market lives in the address too, as the query parameter `m`. There is no cookie and nothing is stored in the browser.
 *
 * Two markets exist because the owner decided two price floors (Türkiye, abroad) and launched two languages. Nothing else
 * (prices, legal wording, showcase) depends on the market yet: that is an open decision, not a default.
 *
 * Plain module, no server-only code: the gate (client), the page (server) and the briefing API (zod enum) all import it.
 */
export const MARKETS = ['tr', 'int'] as const;
export type Market = (typeof MARKETS)[number];

/** The address parameter that carries the market, and also marks the gate as passed: "/tr?m=tr". */
export const MARKET_PARAM = 'm';

/** Whitelist parse for anything that came from a URL. Unknown values are ignored, never echoed. */
export function parseMarket(value: unknown): Market | null {
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === 'string' && (MARKETS as readonly string[]).includes(first) ? (first as Market) : null;
}

/** The language a market suggests. Only a suggestion: the visitor chooses (and only launched languages are offered). */
export const MARKET_DEFAULT_LOCALE: Record<Market, AppLocale> = { tr: 'tr', int: 'en' };

/**
 * The market the visitor chose on the gate in this tab, kept in plain module memory (not storage) so a briefing sent after the
 * address lost its `m` (a visit to a legal page and back) is still tagged. Gone on reload; the address then carries it.
 */
let remembered: Market | null = null;
export const rememberMarket = (market: Market | null) => {
  remembered = market;
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
