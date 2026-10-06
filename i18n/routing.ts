import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'tr', 'de', 'fr', 'it'],
  defaultLocale: 'en',
  // English lives at "/", the others at "/tr", "/de", "/fr", "/it".
  localePrefix: 'as-needed',
  // The visitor's choice is remembered in a first-party functional cookie, so a returning visitor lands in their language.
  localeCookie: {
    name: 'NEXT_LOCALE',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  },
});

export type AppLocale = (typeof routing.locales)[number];

/** Endonyms, so every visitor can find their own language whatever language the page is currently in. */
export const LOCALE_LABELS: Record<AppLocale, { native: string; code: string; hreflang: string; ogLocale: string }> = {
  en: { native: 'English', code: 'EN', hreflang: 'en', ogLocale: 'en_US' },
  tr: { native: 'Türkçe', code: 'TR', hreflang: 'tr', ogLocale: 'tr_TR' },
  de: { native: 'Deutsch', code: 'DE', hreflang: 'de', ogLocale: 'de_DE' },
  fr: { native: 'Français', code: 'FR', hreflang: 'fr', ogLocale: 'fr_FR' },
  it: { native: 'Italiano', code: 'IT', hreflang: 'it', ogLocale: 'it_IT' },
};
