import { routing, type AppLocale } from './routing';

/**
 * Which languages are PUBLIC. One list feeds the language switcher, the footer, hreflang, the sitemap, JSON-LD and the
 * 404 for everything else, so a closed language cannot leak anywhere (faz2-denetim.mjs checks that each of them uses it).
 *
 *   production       only NEXT_PUBLIC_LAUNCHED_LOCALES (default "en,tr"); the default language is always open
 *   development      all seven, so every translation can be reviewed in the browser
 *   preview builds   NEXT_PUBLIC_PREVIEW_LOCALES=1 opens all seven in a production build too
 *
 * Launching a language = add its code to NEXT_PUBLIC_LAUNCHED_LOCALES after a native translation and a legal review
 * (docs/adr/0002-launch-locales-and-market.md). NEXT_PUBLIC_ variables are inlined at build time: rebuild after changing it.
 */
const LAUNCHED = (process.env.NEXT_PUBLIC_LAUNCHED_LOCALES ?? 'en,tr')
  .split(',')
  .map((code) => code.trim())
  .filter(Boolean);

const OPEN_ALL = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_PREVIEW_LOCALES === '1';

export const OPEN_LOCALES: readonly AppLocale[] = OPEN_ALL
  ? routing.locales
  : routing.locales.filter((locale) => locale === routing.defaultLocale || LAUNCHED.includes(locale));

export const isOpenLocale = (value: string): value is AppLocale => (OPEN_LOCALES as readonly string[]).includes(value);

/** True for a language that is visible only in development/preview: its translation is still a draft. */
export const isDraftLocale = (locale: AppLocale): boolean => locale !== routing.defaultLocale && !LAUNCHED.includes(locale);
