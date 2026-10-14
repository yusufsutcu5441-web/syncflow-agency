import { routing, type AppLocale } from './routing';

/**
 * Which languages are PUBLIC. One list feeds the language switcher, the footer, hreflang, the sitemap, JSON-LD and the
 * 404 for everything else, so a closed language cannot leak anywhere (faz2-denetim.mjs checks that each of them uses it).
 *
 *   every environment   only NEXT_PUBLIC_LAUNCHED_LOCALES (default "en,tr,ar,de,fr,es,zh": the seven capital-centre languages,
 *                       docs/adr/0018); the default language is always open. Japanese is the one dormant draft.
 *   preview             NEXT_PUBLIC_PREVIEW_LOCALES=1 opens every routed language (in development and in production builds
 *                       alike), only to read the dormant draft translation in a browser. Nothing public links to it.
 *
 * Closing a language = remove its code from NEXT_PUBLIC_LAUNCHED_LOCALES (or set it on the host). Opening one = add it, after a
 * native translation and a legal review (docs/adr/0002-launch-locales-and-market.md). NEXT_PUBLIC_ variables are inlined at
 * build time: rebuild after changing it.
 */
const LAUNCHED = (process.env.NEXT_PUBLIC_LAUNCHED_LOCALES ?? 'en,tr,ar,de,fr,es,zh')
  .split(',')
  .map((code) => code.trim())
  .filter(Boolean);

const OPEN_ALL = process.env.NEXT_PUBLIC_PREVIEW_LOCALES === '1';

export const OPEN_LOCALES: readonly AppLocale[] = OPEN_ALL
  ? routing.locales
  : routing.locales.filter((locale) => locale === routing.defaultLocale || LAUNCHED.includes(locale));

export const isOpenLocale = (value: string): value is AppLocale => (OPEN_LOCALES as readonly string[]).includes(value);

/** True for a language that is visible only in preview: its translation is a dormant draft. */
export const isDraftLocale = (locale: AppLocale): boolean => locale !== routing.defaultLocale && !LAUNCHED.includes(locale);
