import { defineRouting } from 'next-intl/routing';

/**
 * Launch languages: English (default, at "/") and Turkish (at "/tr"). Nothing else is routed.
 * Further languages (DE, FR, ES, AR, JA ...) are opened one at a time, each only after a native translation and a legal
 * review: add the messages file and a LOCALE_LABELS entry here (docs/adr/0002-launch-locales-and-market.md).
 */
export const routing = defineRouting({
  locales: ['en', 'tr'],
  defaultLocale: 'en',
  // English lives at "/", Turkish at "/tr".
  localePrefix: 'as-needed',
  // The language is chosen by the URL alone: no cookie, and no redirect based on the browser's Accept-Language header.
  // (Without a cookie, detection would bounce a Turkish browser from "/" back to "/tr" even after the visitor picked English.)
  localeCookie: false,
  localeDetection: false,
});

export type AppLocale = (typeof routing.locales)[number];

/** Endonyms, so every visitor can find their own language whatever language the page is currently in. */
export const LOCALE_LABELS: Record<AppLocale, { native: string; code: string; hreflang: string; ogLocale: string }> = {
  en: { native: 'English', code: 'EN', hreflang: 'en', ogLocale: 'en_US' },
  tr: { native: 'Türkçe', code: 'TR', hreflang: 'tr', ogLocale: 'tr_TR' },
};
