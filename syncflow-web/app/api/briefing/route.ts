import { NextResponse } from 'next/server';
import { classify, LIMITS } from '@/lib/briefing';
import { briefingSchema, toFieldErrors } from '@/lib/schemas/briefing';
import { clientIp, rateLimit, rateLimitHeaders } from '@/lib/security/rate-limit';
import { deliverBriefing } from '@/lib/server/deliver';
import { toPlainText } from '@/lib/server/sanitize';
import { verifyTurnstile } from '@/lib/server/turnstile';

// jsdom (DOMPurify) needs Node, and the answer must never be cached.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 8 * 1024;
/** The last step takes a person at least this long (name, company, e-mail, consent). Faster = a script. */
const MIN_FILL_MS = 2500;
const STRICT_LIMIT = { limit: 5, windowMs: 10 * 60_000 };

type ErrorCode = 'forbidden' | 'unsupported' | 'too_large' | 'bad_request' | 'validation' | 'rate_limited' | 'unavailable' | 'failed' | 'verification';

function reply(body: Record<string, unknown>, status: number, headers: Record<string, string> = {}) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      // This endpoint returns JSON only, so nothing may load or run in response to it.
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
      ...headers,
    },
  });
}

function fail(code: ErrorCode, status: number, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
  return reply({ ok: false, code, ...extra }, status, headers);
}

/** Browsers always send Origin on cross-origin and same-origin POSTs. Anything else is not our own form. */
function isSameOrigin(request: Request): boolean {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false;
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail('forbidden', 403);
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) return fail('unsupported', 415);

  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY_BYTES) return fail('too_large', 413);

  const ip = clientIp(request.headers);
  const limit = await rateLimit({ key: `briefing:${ip}`, ...STRICT_LIMIT });
  if (!limit.ok) {
    return fail('rate_limited', 429, {}, { ...rateLimitHeaders(limit), 'Retry-After': String(Math.max(1, Math.ceil(limit.resetMs / 1000))) });
  }

  // content-length can be absent or lie (chunked bodies), so the real size is checked again after reading.
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return fail('too_large', 413);

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return fail('bad_request', 400);
  }

  const parsed = briefingSchema.safeParse(json);
  if (!parsed.success) return fail('validation', 422, { fields: toFieldErrors(parsed.error, json) });
  const input = parsed.data;

  // Bots: a filled honeypot or an instant submit. Answer exactly like a success so they learn nothing.
  if (input.website !== '' || (input.elapsedMs !== undefined && input.elapsedMs < MIN_FILL_MS)) {
    return reply({ ok: true }, 200);
  }

  // Turnstile is verified on the server; an unverified submission never reaches the webhook.
  const human = await verifyTurnstile(input.turnstileToken, ip);
  if (human === 'not_configured') return fail('unavailable', 503);
  if (human === 'failed') return fail('verification', 400);

  const name = toPlainText(input.name);
  const company = toPlainText(input.company);
  const message = toPlainText(input.message, { multiline: true });

  // null = the field contained HTML-like markup: refused explicitly instead of silently altered (see sanitize.ts).
  // Sanitising can also shorten text (stray brackets, invisible characters), so the minimums are enforced once more.
  const invalid = {
    ...(name === null || name.length < LIMITS.name.min ? { name: 'invalid' } : {}),
    ...(company === null || company.length < LIMITS.company.min ? { company: 'invalid' } : {}),
    ...(message === null ? { message: 'invalid' } : {}),
  };
  if (Object.keys(invalid).length > 0 || name === null || company === null || message === null) {
    return fail('validation', 422, { fields: invalid });
  }

  const tier = classify({ budget: input.budget, role: input.role });
  const delivery = await deliverBriefing({
    projectType: input.projectType,
    budget: input.budget,
    timeline: input.timeline,
    role: input.role,
    tier,
    name,
    company,
    email: input.email,
    message,
    locale: input.locale,
  });
  if (!delivery.ok) {
    return delivery.reason === 'not_configured' ? fail('unavailable', 503) : fail('failed', 502);
  }
  // In development without a webhook the briefing is accepted locally only. Say so, so nobody mistakes it for a sent e-mail.
  return reply({ ok: true, ...(delivery.via === 'dev-log' ? { devOnly: true } : {}) }, 200);
}
