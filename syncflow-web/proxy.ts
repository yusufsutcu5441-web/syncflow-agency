import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { isOpenLocale, OPEN_LOCALES } from '@/i18n/launch';
import { LOCALE_LABELS, routing, type AppLocale } from '@/i18n/routing';
import { isCrawler } from '@/lib/crawlers';
import { MARKET_PARAM } from '@/lib/market';
import { buildCsp, createNonce, CSP_HEADER } from '@/lib/security/csp';
import { clientIp, rateLimit, rateLimitHeaders, type RateResult } from '@/lib/security/rate-limit';

/**
 * Next.js 16 renamed "middleware" to "proxy". It runs before every matched request and does four jobs:
 *   1. Rate limiting (coarse, per client address). The contact route adds a much stricter limit of its own.
 *   2. A fresh CSP nonce per page request, passed to the renderer through request headers. The policy is enforced
 *      (Content-Security-Policy; CSP_MODE=report-only reverts to Report-Only, lib/security/csp.ts).
 *   3. On the root address alone, the browser's own language (see below).
 *   4. next-intl locale routing (prefix, cookie, Accept-Language detection, hreflang Link header).
 *
 * Runtime: proxy always runs on Node.js in Next 16. Everything imported here uses Web APIs only, so it can also
 * move to the Edge runtime (middleware.ts + export const runtime = 'edge') without code changes.
 */

const handleI18nRouting = createIntlMiddleware(routing);
const isDev = process.env.NODE_ENV !== 'production';

const API_LIMIT = { limit: 30, windowMs: 60_000 };
const PAGE_LIMIT = { limit: 240, windowMs: 60_000 };

/**
 * The root address and the browser's language (docs/adr/0038 section 16). The language gate is gone, so "/" is the one address a
 * visitor can arrive at without having said which language they want; there, and only there, Accept-Language decides. A header that
 * names a public language (i18n/launch.ts) is honoured; a header that names only languages this site does not speak falls back to
 * Turkish, the studio's own language; English, the language of "/", means no redirect at all.
 *
 * What it must never do:
 *   - redirect a search-engine or link-preview crawler (lib/crawlers.ts): "/" stays the English page for the index, the canonical
 *     tag and x-default, so hreflang keeps describing the same set of addresses it always did;
 *   - redirect a navigation from inside the site (Sec-Fetch-Site: same-origin), or the header's language switcher could never send a
 *     Turkish browser to the English page. Nothing is stored to remember that choice: this site sets no cookie;
 *   - redirect an address that already says what it is: every "/xx" path, and "/" with a market in the query ("/?m=tr"), are the
 *     visitor's own words.
 * Every answer on "/" carries Vary: Accept-Language, so no cache may hand one browser's language to another.
 */
const ROOT_FALLBACK: AppLocale = 'tr';

function preferredLocale(header: string | null): AppLocale | null {
  if (!header?.trim()) return null;
  const ranked = header
    .split(',')
    .map((part) => {
      const [tag = '', ...params] = part.trim().split(';');
      const q = Number(params.find((p) => p.trim().startsWith('q='))?.split('=')[1] ?? '1');
      return { tag: tag.trim().toLowerCase(), q: Number.isFinite(q) ? q : 0 };
    })
    .filter((entry) => entry.tag && entry.q > 0)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    // "*" is "any language will do": the page a visitor asked for is the one they get.
    if (tag === '*') return null;
    const base = tag.split('-')[0];
    const match = OPEN_LOCALES.find((locale) => locale === base || LOCALE_LABELS[locale].hreflang.toLowerCase() === tag);
    if (match) return match;
  }
  // A real preference, none of it ours: the studio's own language, if it is public in this build.
  return isOpenLocale(ROOT_FALLBACK) ? ROOT_FALLBACK : null;
}

/** The language "/" should answer in for this request, or null to answer as it is. */
function rootLanguage(request: NextRequest): AppLocale | null {
  if (request.nextUrl.searchParams.has(MARKET_PARAM)) return null;
  if (request.headers.get('sec-fetch-site') === 'same-origin') return null;
  if (isCrawler(request.headers.get('user-agent'))) return null;
  const wanted = preferredLocale(request.headers.get('accept-language'));
  return wanted && wanted !== routing.defaultLocale ? wanted : null;
}

function tooManyRequests(result: RateResult, asJson: boolean): NextResponse {
  const headers: Record<string, string> = {
    ...rateLimitHeaders(result),
    'Retry-After': String(Math.max(1, Math.ceil(result.resetMs / 1000))),
    'Cache-Control': 'no-store',
    'Content-Type': asJson ? 'application/json' : 'text/plain; charset=utf-8',
  };
  const body = asJson ? JSON.stringify({ ok: false, code: 'rate_limited' }) : 'Too many requests. Please slow down.';
  return new NextResponse(body, { status: 429, headers });
}

export default async function proxy(request: NextRequest) {
  const ip = clientIp(request.headers);
  const { pathname } = request.nextUrl;

  // API routes and the image generator (/og) are rate limited only: no locale routing, no CSP nonce (they return JSON/PNG).
  if (pathname.startsWith('/api/') || pathname === '/og') {
    const result = await rateLimit({ key: `api:${ip}`, ...API_LIMIT });
    if (!result.ok) return tooManyRequests(result, true);

    const response = NextResponse.next();
    for (const [name, value] of Object.entries(rateLimitHeaders(result))) response.headers.set(name, value);
    if (pathname.startsWith('/api/')) response.headers.set('Cache-Control', 'no-store');
    return response;
  }

  const result = await rateLimit({ key: `page:${ip}`, ...PAGE_LIMIT });
  if (!result.ok) return tooManyRequests(result, false);

  // The root address answers in the browser's language (see rootLanguage above). Vary is set on the redirect and on the page alike.
  if (pathname === '/') {
    const language = rootLanguage(request);
    if (language) {
      const target = new URL(`/${language}`, request.nextUrl);
      target.search = request.nextUrl.search;
      const redirect = NextResponse.redirect(target, 307);
      redirect.headers.set('Vary', 'Accept-Language, Sec-Fetch-Site');
      return redirect;
    }
  }

  const nonce = createNonce();
  const isHttps = request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';
  const csp = buildCsp({ nonce, isDev, isHttps });

  // Next.js reads the nonce from the *request* CSP header while rendering and stamps it on its own scripts; it accepts
  // the enforcing and the report-only header name alike (next/dist/server/app-render/app-render.js). x-nonce lets server
  // components pass the same nonce to next/script. Both are internal request headers.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set(CSP_HEADER.toLowerCase(), csp);

  // Enforcing since 17.10.2026 (docs/adr/0024-csp-enforced.md): CSP_HEADER is the one place the mode is decided.
  const response = handleI18nRouting(new NextRequest(request, { headers: requestHeaders }));
  response.headers.set(CSP_HEADER, csp);
  // The answer on "/" depends on the browser's language and on where the visitor came from, so it says so to every cache in between.
  if (pathname === '/') {
    const vary = response.headers.get('Vary');
    const parts = new Set([...(vary ? vary.split(',').map((v) => v.trim()).filter(Boolean) : []), 'Accept-Language', 'Sec-Fetch-Site']);
    response.headers.set('Vary', [...parts].join(', '));
  }
  return response;
}

export const config = {
  // API routes + /og (rate limiting only) and every page. Static files (anything with a dot), _next and _vercel are skipped.
  matcher: ['/api/:path*', '/og', '/((?!api|og(?:/|$)|_next|_vercel|.*\\..*).*)'],
};
