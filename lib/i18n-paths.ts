import { routing, type AppLocale } from '@/i18n/routing';

/**
 * Locale-aware paths without any next-intl code, so they can be used in server AND client components while keeping
 * next-intl's client runtime out of the browser bundle. The rules mirror routing.ts (localePrefix "as-needed"):
 * the default locale has no prefix ("/"), every other locale does ("/tr", "/tr/privacy").
 */

const PREFIXED = routing.locales.filter((locale) => locale !== routing.defaultLocale);

/** "/tr/privacy" -> "/privacy", "/tr" -> "/", "/privacy" -> "/privacy". The query string / hash are not part of a pathname. */
export function stripLocale(pathname: string): string {
  for (const locale of PREFIXED) {
    if (pathname === `/${locale}`) return '/';
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1);
  }
  return pathname;
}

/** "/privacy" + "tr" -> "/tr/privacy"; "/#pricing" + "tr" -> "/tr#pricing"; "/" + "en" -> "/". */
export function withLocale(path: string, locale: AppLocale): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (locale === routing.defaultLocale) return clean;
  const [, pathname = '/', suffix = ''] = /^([^?#]*)(.*)$/.exec(clean) ?? [];
  return `${pathname === '/' ? `/${locale}` : `/${locale}${pathname}`}${suffix}`;
}
