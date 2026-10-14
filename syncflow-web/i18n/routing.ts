import { defineRouting } from 'next-intl/routing';

/**
 * Eight languages are wired in: English (default, at "/"), Turkish, Arabic (right-to-left), German, French, Spanish and Simplified
 * Chinese, each at "/xx", plus Japanese, which stays a dormant draft. Which of them are PUBLIC is decided in i18n/launch.ts: the
 * seven capital-centre languages (en tr ar de fr es zh) answer by default, Japanese only in a preview. The seven are the owner's
 * decision of 14.10.2026 (docs/adr/0018-seven-capital-centres.md); the translations are drafts by the studio's tooling, without a
 * native-speaker or legal review, and the site says so where it matters (the legal pages, README).
 */
export const routing = defineRouting({
  locales: ['en', 'tr', 'ar', 'de', 'fr', 'es', 'zh', 'ja'],
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

/**
 * Endonyms, so every visitor can find their own language whatever language the page is currently in. `intl` is the BCP 47 tag the
 * page's numbers and dates are formatted with (lib/pricing.ts); Arabic uses Latin digits (`-u-nu-latn`), the usual choice in
 * Gulf business writing, so a budget reads the same in every script.
 */
export const LOCALE_LABELS: Record<
  AppLocale,
  { native: string; code: string; hreflang: string; ogLocale: string; dir: 'ltr' | 'rtl'; intl: string }
> = {
  en: { native: 'English', code: 'EN', hreflang: 'en', ogLocale: 'en_US', dir: 'ltr', intl: 'en-US' },
  tr: { native: 'Türkçe', code: 'TR', hreflang: 'tr', ogLocale: 'tr_TR', dir: 'ltr', intl: 'tr-TR' },
  ar: { native: 'العربية', code: 'AR', hreflang: 'ar', ogLocale: 'ar_AE', dir: 'rtl', intl: 'ar-AE-u-nu-latn' },
  de: { native: 'Deutsch', code: 'DE', hreflang: 'de', ogLocale: 'de_DE', dir: 'ltr', intl: 'de-DE' },
  fr: { native: 'Français', code: 'FR', hreflang: 'fr', ogLocale: 'fr_FR', dir: 'ltr', intl: 'fr-FR' },
  es: { native: 'Español', code: 'ES', hreflang: 'es', ogLocale: 'es_ES', dir: 'ltr', intl: 'es-US' },
  zh: { native: '中文', code: 'ZH', hreflang: 'zh-Hans', ogLocale: 'zh_CN', dir: 'ltr', intl: 'zh-CN' },
  ja: { native: '日本語', code: 'JA', hreflang: 'ja', ogLocale: 'ja_JP', dir: 'ltr', intl: 'ja-JP' },
};
