import { NextResponse, type NextRequest } from 'next/server';
import { isOpenLocale } from '@/i18n/launch';
import { isBreakdownSlug } from '@/lib/breakdown';
import { loadBreakdown } from '@/lib/server/breakdown';

/**
 * The content of one architectural breakdown as JSON (docs/adr/0020-case-study-layer.md), for the dialog over the home page. The same data
 * renders the standalone page /showcase/<slug>, so the two can never differ. Public, read-only, and whitelisted on both parameters: an
 * unknown slug or language is a plain 404 and nothing from the query string is echoed. The proxy rate-limits /api/* and marks it no-store.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug') ?? '';
  const locale = request.nextUrl.searchParams.get('locale') ?? '';
  if (!isBreakdownSlug(slug) || !isOpenLocale(locale)) {
    return NextResponse.json({ ok: false }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }
  const data = await loadBreakdown(slug, locale);
  return NextResponse.json({ ok: true, data }, { headers: { 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'" } });
}
