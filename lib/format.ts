/** Whole-dollar amounts, always "$" (narrow symbol), grouped the way the visitor's locale expects: $2,500 · 2.500 $ · 2 500 $. */
export const USD_FORMAT = {
  style: 'currency',
  currency: 'USD',
  currencyDisplay: 'narrowSymbol',
  maximumFractionDigits: 0,
} as const;
