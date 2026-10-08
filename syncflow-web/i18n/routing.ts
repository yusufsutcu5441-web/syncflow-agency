import { defineRouting } from 'next-intl/routing';

/**
 * Seven languages are wired in: English (default, at "/"), Turkish, German, French, Spanish, Arabic (right-to-left) and
 * Japanese, each at "/xx". Which of them are PUBLIC is decided in i18n/launch.ts: in production only the launched ones
 * answer (default en, tr); in development and previews all seven do. German, French, Spanish, Arabic and Japanese are
 * draft translations until a native speaker and a legal review have signed them off (docs/adr/0002, 0006).
 */
export const routing = defineRouting({
  locales: ['en', 'tr', 'de', 'fr', 'es', 'ar', 'ja'],
  defaultLocale: 'en',
  // English lives at "/", every other language at "/xx".
  localePrefix: 'as-needed',
  // The language is chosen by the URL alone: no cookie, and no redirect based on the browser's Accept-Language header.
  // (Without a cookie, detection would bounce a Turkish browser from "/" back to "/tr" even after the visitor picked English.)
  localeCookie: false,
  localeDetection: false,
  // hreflang is written into the page's <head> from the launched list (app/[locale]/layout.tsx), not as a Link header
  // listing every routed language, including the ones that are not public.
  alternateLinks: false,
});

export type AppLocale = (typeof routing.locales)[number];

/** Endonyms, so every visitor can find their own language whatever language the page is currently in. */
export const LOCALE_LABELS: Record<AppLocale, { native: string; code: string; hreflang: string; ogLocale: string; dir: 'ltr' | 'rtl' }> = {
  en: { native: 'English', code: 'EN', hreflang: 'en', ogLocale: 'en_US', dir: 'ltr' },
  tr: { native: 'Türkçe', code: 'TR', hreflang: 'tr', ogLocale: 'tr_TR', dir: 'ltr' },
  de: { native: 'Deutsch', code: 'DE', hreflang: 'de', ogLocale: 'de_DE', dir: 'ltr' },
  fr: { native: 'Français', code: 'FR', hreflang: 'fr', ogLocale: 'fr_FR', dir: 'ltr' },
  es: { native: 'Español', code: 'ES', hreflang: 'es', ogLocale: 'es_ES', dir: 'ltr' },
  ar: { native: 'العربية', code: 'AR', hreflang: 'ar', ogLocale: 'ar_AE', dir: 'rtl' },
  ja: { native: '日本語', code: 'JA', hreflang: 'ja', ogLocale: 'ja_JP', dir: 'ltr' },
};
