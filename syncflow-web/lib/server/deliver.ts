import 'server-only';
import type { Budget, ProjectType, Role, Tier, Timeline } from '@/lib/briefing';

/**
 * Delivery of a validated, sanitised briefing to the operator's own system (n8n, Make, Zapier, a Slack workflow, a CRM).
 * The documented path is: signed webhook -> n8n -> Gmail -> contact@syncflow.agency (docs/n8n-briefing.md). Gmail
 * credentials never live in this app.
 *
 * - CONTACT_WEBHOOK_URL and CONTACT_WEBHOOK_SECRET are server-only: no NEXT_PUBLIC_ prefix, never imported by a
 *   client component (this file imports 'server-only', so the build fails if anyone tries).
 * - https:// only. Plain http is accepted solely for loopback hosts so the flow can be tested locally.
 * - Redirects are refused (redirect: 'error'), which closes the classic SSRF trick of bouncing to an internal address.
 * - An optional HMAC-SHA256 signature lets the receiver prove a request really came from this site.
 * - Every briefing carries a random delivery `id` (also sent as the Idempotency-Key header). The site tries at most TWICE,
 *   inside a total budget under 10 seconds, and only after a timeout, a network error or a 5xx/408/429 answer: both attempts
 *   carry the SAME id, so the receiver can drop a duplicate (docs/n8n-briefing.md "Çift kayıt"). A 4xx answer (the receiver
 *   refused the request) is final and never retried.
 */

export type BriefingPayload = {
  projectType: ProjectType;
  budget: Budget;
  timeline: Timeline;
  role: Role;
  /** Priority class computed on the server (lib/briefing.ts classify). */
  tier: Tier;
  name: string;
  company: string;
  email: string;
  message: string;
  locale: string;
};

export type DeliveryResult = { ok: true; via: 'webhook' | 'dev-log'; attempts?: number } | { ok: false; reason: 'not_configured' | 'failed'; attempts?: number };

/** First try, pause, second try: 5.0 + 0.4 + at most 4.0 = under 9.5 s in the worst case. */
const FIRST_ATTEMPT_MS = 5_000;
const PAUSE_MS = 400;
const SECOND_ATTEMPT_MS = 4_000;
const BUDGET_MS = 9_500;

type Attempt = 'ok' | 'retry' | 'final';

/** One POST. A thrown error (timeout, refused connection, a redirect) and a transient status are worth another try. */
async function attempt(url: string, headers: Record<string, string>, body: string, timeoutMs: number): Promise<Attempt> {
  try {
    const response = await fetch(url, { method: 'POST', headers, body, signal: AbortSignal.timeout(timeoutMs), cache: 'no-store', redirect: 'error' });
    if (response.ok) return 'ok';
    return response.status >= 500 || response.status === 408 || response.status === 429 ? 'retry' : 'final';
  } catch {
    return 'retry';
  }
}

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

export function isAllowedWebhookUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol === 'https:') return true;
    return url.protocol === 'http:' && LOOPBACK.has(url.hostname);
  } catch {
    return false;
  }
}

async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function deliverBriefing(lead: BriefingPayload): Promise<DeliveryResult> {
  const url = process.env.CONTACT_WEBHOOK_URL?.trim();

  if (!url) {
    if (process.env.NODE_ENV !== 'production') {
      // Development convenience only. Never log message bodies or addresses: they are personal data.
      console.info('[briefing] CONTACT_WEBHOOK_URL is not set; accepted a briefing locally without delivering it.');
      return { ok: true, via: 'dev-log' };
    }
    return { ok: false, reason: 'not_configured' };
  }
  if (!isAllowedWebhookUrl(url)) {
    console.error('[briefing] CONTACT_WEBHOOK_URL must be an https:// URL.');
    return { ok: false, reason: 'not_configured' };
  }

  // Ready-made subject for the mail node: "[Briefing][high] Company, Name". Both parts are already single-line plain text.
  const subject = `[Briefing][${lead.tier}] ${lead.company}, ${lead.name}`;
  const id = crypto.randomUUID();
  const body = JSON.stringify({ type: 'syncflow.briefing', id, receivedAt: new Date().toISOString(), subject, ...lead });
  const headers: Record<string, string> = { 'content-type': 'application/json', 'idempotency-key': id };
  const secret = process.env.CONTACT_WEBHOOK_SECRET?.trim();
  if (secret) headers['x-syncflow-signature'] = `sha256=${await hmacHex(secret, body)}`;

  const started = Date.now();
  let outcome = await attempt(url, headers, body, FIRST_ATTEMPT_MS);
  let attempts = 1;
  if (outcome === 'retry') {
    const left = BUDGET_MS - (Date.now() - started) - PAUSE_MS;
    if (left >= 1_000) {
      console.warn(`[briefing] delivery ${id}: first attempt failed, retrying once`);
      await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
      outcome = await attempt(url, headers, body, Math.min(left, SECOND_ATTEMPT_MS));
      attempts = 2;
    }
  }
  if (outcome === 'ok') return { ok: true, via: 'webhook', attempts };
  console.error(`[briefing] delivery ${id} failed after ${attempts} attempt(s)`);
  return { ok: false, reason: 'failed', attempts };
}
