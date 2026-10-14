import type { AppLocale } from '@/i18n/routing';
import type { Market } from '@/lib/market';

/**
 * The single source of the briefing's money (CLAUDE.md "Fiyat", docs/adr/0016-qualification-and-markets.md). The site publishes no
 * price list. It publishes ONE number per market: the minimum project budget the studio takes on, shown in the first step of the
 * briefing, and the three bands above it. Anything below the minimum is declined politely in the browser and refused by the server.
 *
 * The minimum is USD 25,000 (owner decision, 13.10.2026) and the other markets use the current-exchange equivalent, rounded to a
 * clean step. Rates change: the figures below are reviewed once a quarter and moved by hand, together with PRICING_AS_OF.
 *   Source of the rates: open.er-api.com, USD base, 12.10.2026 23:57 UTC:
 *     EUR 0.895156   (25,000 USD = 22,378.9 EUR  -> 22,500, nearest 500)
 *     AED 3.6725     (the official peg; 25,000 USD = 91,812.5 AED -> 92,000, nearest 1,000)
 *     TRY 49.355625  (25,000 USD = 1,233,890.6 TRY -> 1,225,000, nearest 25,000)
 * Next review: 12.01.2027, or earlier if a rate moves by more than 5 %.
 *
 * Plain module (no server-only code): the briefing in the browser formats it, the tests read it.
 */
export const PRICING_AS_OF = '2026-10-12';
export const PRICING_NEXT_REVIEW = '2027-01-12';

export type Currency = 'USD' | 'EUR' | 'AED' | 'TRY';

export const PRICING: Record<Market, { currency: Currency; floor: number }> = {
  us: { currency: 'USD', floor: 25_000 },
  eu: { currency: 'EUR', floor: 22_500 },
  me: { currency: 'AED', floor: 92_000 },
  tr: { currency: 'TRY', floor: 1_225_000 },
};

/** Band multiples of the minimum: t1 = [1x, 2x), t2 = [2x, 4x), t3 = 4x and above. */
const BANDS = [
  { id: 't1', from: 1, to: 2 },
  { id: 't2', from: 2, to: 4 },
  { id: 't3', from: 4, to: null },
] as const;

export type Band = { id: 't1' | 't2' | 't3'; from: number; to: number | null };

export function ladder(market: Market): Band[] {
  const { floor } = PRICING[market];
  return BANDS.map(({ id, from, to }) => ({ id, from: from * floor, to: to === null ? null : to * floor }));
}

/** "$25,000", "€22,500", "AED 92,000", "₺1,225,000" (Turkish page: "₺1.225.000"). No decimals; the narrow symbol where there is one. */
export function formatMoney(amount: number, currency: Currency, locale: AppLocale): string {
  return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', { style: 'currency', currency, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 }).format(amount);
}

/** "$25,000 – $50,000" for a closed band, "$100,000 +" for the open one. */
export function formatBand(band: Band, currency: Currency, locale: AppLocale): string {
  const from = formatMoney(band.from, currency, locale);
  return band.to === null ? `${from} +` : `${from} – ${formatMoney(band.to, currency, locale)}`;
}
