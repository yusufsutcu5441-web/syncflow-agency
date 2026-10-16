import { LOCALE_LABELS, type AppLocale } from '@/i18n/routing';
import type { Market } from '@/lib/market';

/**
 * The single source of the briefing's money (CLAUDE.md "Fiyat", docs/adr/0016-qualification-and-markets.md, 0019-enterprise-tier.md).
 * The site publishes no price list. It publishes ONE number per market: the minimum project budget the studio takes on, shown in the
 * first step of the briefing, and the three bands above it. There is no option below the minimum, and the server refuses any other value.
 *
 * The minimum is USD 50,000 (owner decision, 14.10.2026; it was 25,000 from 13.10.2026) and the other currencies use the
 * current-exchange equivalent, rounded to a clean step. Seven markets share four currencies (docs/adr/0018): the dollar for the United
 * States, the Spanish-speaking wealth market and the Asian hubs; the euro for the German-speaking market and for France and Monaco;
 * the dirham for the Gulf; the lira for Türkiye. A currency has ONE floor, whatever the market (the audit checks it). Rates change:
 * the figures below are reviewed once a quarter and moved by hand, together with PRICING_AS_OF.
 *   Source of the rates: open.er-api.com, USD base, 14.10.2026 00:02 UTC:
 *     EUR 0.893421   (50,000 USD = 44,671.1 EUR    -> 45,000, nearest 1,000: the step doubled with the amount, it was 500)
 *     AED 3.6725     (the official peg; 50,000 USD = 183,625 AED -> 184,000, nearest 1,000)
 *     TRY 49.379871  (50,000 USD = 2,468,993.6 TRY -> 2,475,000, nearest 25,000)
 * Next review: 14.01.2027, or earlier if a rate moves by more than 5 %.
 * Open question for the owner: Switzerland is in the German-speaking market and is priced in euros as the gate specifies, although
 * its own currency is the franc; a Swiss visitor sees a euro figure. A franc row would be a new currency and a new floor.
 *
 * Plain module (no server-only code): the briefing in the browser formats it, the tests read it.
 */
export const PRICING_AS_OF = '2026-10-14';
export const PRICING_NEXT_REVIEW = '2027-01-14';

export type Currency = 'USD' | 'EUR' | 'AED' | 'TRY';

export const PRICING: Record<Market, { currency: Currency; floor: number }> = {
  us: { currency: 'USD', floor: 50_000 },
  tr: { currency: 'TRY', floor: 2_475_000 },
  me: { currency: 'AED', floor: 184_000 },
  dach: { currency: 'EUR', floor: 45_000 },
  fr: { currency: 'EUR', floor: 45_000 },
  wealth: { currency: 'USD', floor: 50_000 },
  asia: { currency: 'USD', floor: 50_000 },
};

/**
 * Band multiples of the minimum: t1 = [1x, 2x), t2 = [2x, 5x), t3 = 5x and above. In dollars: 50,000 to 100,000, 100,000 to 250,000 and
 * 250,000 and above (owner decision, 14.10.2026; the middle band reached 4x of a 25,000 minimum before).
 */
const BANDS = [
  { id: 't1', from: 1, to: 2 },
  { id: 't2', from: 2, to: 5 },
  { id: 't3', from: 5, to: null },
] as const;

export type Band = { id: 't1' | 't2' | 't3'; from: number; to: number | null };

export function ladder(market: Market): Band[] {
  const { floor } = PRICING[market];
  return BANDS.map(({ id, from, to }) => ({ id, from: from * floor, to: to === null ? null : to * floor }));
}

/**
 * The amount in the page's own number format (LOCALE_LABELS.intl), no decimals, the narrow symbol where there is one:
 * "$50,000" (en, es, zh), "₺2.475.000" (tr), "45.000 €" (de), "45 000 €" (fr). Arabic writes the ISO code ("184,000 AED", Latin
 * digits): the Arabic abbreviation of the dirham ends in a full stop, which doubles at the end of a sentence.
 */
/** Building an Intl.NumberFormat is the slow part of formatting a price, and the briefing formats seven on every render: one per language and currency. */
const moneyFormats = new Map<string, Intl.NumberFormat>();

export function formatMoney(amount: number, currency: Currency, locale: AppLocale): string {
  const key = `${locale}|${currency}`;
  let format = moneyFormats.get(key);
  if (!format) {
    const currencyDisplay = LOCALE_LABELS[locale].dir === 'rtl' ? 'code' : 'narrowSymbol';
    format = new Intl.NumberFormat(LOCALE_LABELS[locale].intl, { style: 'currency', currency, currencyDisplay, maximumFractionDigits: 0 });
    moneyFormats.set(key, format);
  }
  return format.format(amount);
}

/** "$50,000 – $100,000" for a closed band, "$250,000 +" for the open one. */
export function formatBand(band: Band, currency: Currency, locale: AppLocale): string {
  const from = formatMoney(band.from, currency, locale);
  return band.to === null ? `${from} +` : `${from} – ${formatMoney(band.to, currency, locale)}`;
}
