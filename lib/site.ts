/**
 * Site-wide constants. Everything here is public by nature (it ends up in the HTML anyway).
 * Secrets never belong in this file: see lib/server/ and .env.example.
 */

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://syncflow.agency').replace(/\/+$/, '');

/** Lemon Squeezy hosted checkout, opened as a dark-mode overlay by lemon.js (embed=1 & dark=1). */
export const CHECKOUT_URL =
  process.env.NEXT_PUBLIC_CHECKOUT_URL ??
  'https://syncflow.lemonsqueezy.com/checkout/buy/1c12f3f3-cf34-45bd-8ae6-2260b24d77c7?embed=1&dark=1';

export const LEMON_SCRIPT_SRC = 'https://assets.lemonsqueezy.com/lemon.js';

export const PRICE_USD = 2500;
/** The "typical agency" anchor used in the comparison grid. */
export const TYPICAL_AGENCY_USD = 20000;
export const DELIVERY_DAYS = 14;

/** Section anchors used by the header, footer and sticky bar. */
export const SECTION_IDS = {
  showcase: 'showcase',
  compare: 'compare',
  pricing: 'pricing',
  faq: 'faq',
  contact: 'contact',
} as const;
