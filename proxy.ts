import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { buildCsp, createNonce } from '@/lib/security/csp';
import { clientIp, rateLimit, rateLimitHeaders, type RateResult } from '@/lib/security/rate-limit';

/**
 * Next.js 16 renamed "middleware" to "proxy". It runs before every matched request and does three jobs:
 *   1. Rate limiting (coarse, per client address). The contact route adds a much stricter limit of its own.
 *   2. A fresh CSP nonce per page request, passed to the renderer through request headers.
 *   3. next-intl locale routing (prefix, cookie, Accept-Language detection, hreflang Link header).
 *
 * Runtime: proxy always runs on Node.js in Next 16. Everything imported here uses Web APIs only, so it can also
 * move to the Edge runtime (middleware.ts + export const runtime = 'edge') without code changes.
 */

const handleI18nRouting = createIntlMiddleware(routing);
const isDev = process.env.NODE_ENV !== 'production';

const API_LIMIT = { limit: 30, windowMs: 60_000 };
const PAGE_LIMIT = { limit: 240, windowMs: 60_000 };

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

  const nonce = createNonce();
  const isHttps = request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';
  const csp = buildCsp({ nonce, isDev, isHttps });

  // Next.js reads the nonce from the *request* CSP header while rendering and stamps it on its own scripts.
  // x-nonce lets server components pass the same nonce to next/script. Both are internal request headers.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);

  const response = handleI18nRouting(new NextRequest(request, { headers: requestHeaders }));
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  // API routes + /og (rate limiting only) and every page. Static files (anything with a dot), _next and _vercel are skipped.
  matcher: ['/api/:path*', '/og', '/((?!api|og(?:/|$)|_next|_vercel|.*\\..*).*)'],
};
