import 'server-only';
import en from '@/messages/en.json';
import type { Budget, ProjectType, Role, Tier, Timeline } from '@/lib/briefing';
import type { Market } from '@/lib/market';
import { formatBand, ladder, PRICING } from '@/lib/pricing';
import { CONTACT_EMAIL } from '@/lib/site';
import { buildBriefingMail, sendBriefingMail, smtpSettings, type Attempt, type MailLabels } from './smtp';

/**
 * Delivery of a validated, sanitised briefing to the operator's own system (n8n, Make, Zapier, a Slack workflow, a CRM).
 * The documented path is: signed webhook -> n8n -> Gmail -> contact@syncflow.agency (docs/n8n-briefing.md). Gmail
 * credentials never live in this app. The alternative, used only when no webhook is set and SMTP_USER and SMTP_PASSWORD are, is to send the
 * briefing as a plain-text e-mail from here (lib/server/smtp.ts, docs/adr/0027-optional-smtp-delivery.md): simpler, but a mail credential then
 * lives in this deployment's environment, which is why it is opt-in and the webhook stays the preferred path.
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
  /** Market chosen on the entry gate (docs/adr/0015-entry-gate-and-hero.md); absent when the visitor skipped it. */
  market?: Market;
};

export type DeliveryResult = { ok: true; via: 'webhook' | 'smtp' | 'dev-log'; attempts?: number } | { ok: false; reason: 'not_configured' | 'failed'; attempts?: number };

/** First try, pause, second try: 5.0 + 0.4 + at most 4.0 = under 9.5 s in the worst case. */
const FIRST_ATTEMPT_MS = 5_000;
const PAUSE_MS = 400;
const SECOND_ATTEMPT_MS = 4_000;
const BUDGET_MS = 9_500;

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

/** The answers as words, for a person reading an e-mail (the payload carries ids). English: the studio reads the briefing in English whatever the visitor's language. */
function mailLabels(lead: BriefingPayload): MailLabels {
  const market: Market = lead.market ?? 'us';
  const { currency } = PRICING[market];
  const band = ladder(market).find((candidate) => candidate.id === lead.budget);
  const copy = en.Briefing;
  return {
    project: copy.project[lead.projectType],
    budget: band ? formatBand(band, currency, 'en') : lead.budget,
    timeline: copy.timing[lead.timeline],
    role: copy.contact[lead.role],
    market,
  };
}

/** First try, a short pause, a second try inside the same budget (both carry the SAME delivery id); a final answer is never retried. */
async function withRetry(id: string, run: (timeoutMs: number) => Promise<Attempt>): Promise<{ outcome: Attempt; attempts: number }> {
  const started = Date.now();
  let outcome = await run(FIRST_ATTEMPT_MS);
  let attempts = 1;
  if (outcome === 'retry') {
    const left = BUDGET_MS - (Date.now() - started) - PAUSE_MS;
    if (left >= 1_000) {
      console.warn(`[briefing] delivery ${id}: first attempt failed, retrying once`);
      await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
      outcome = await run(Math.min(left, SECOND_ATTEMPT_MS));
      attempts = 2;
    }
  }
  return { outcome, attempts };
}

export async function deliverBriefing(lead: BriefingPayload): Promise<DeliveryResult> {
  const url = process.env.CONTACT_WEBHOOK_URL?.trim();
  const smtp = url ? null : smtpSettings(process.env, CONTACT_EMAIL);

  if (!url && !smtp) {
    if (process.env.NODE_ENV !== 'production') {
      // Development convenience only. Never log message bodies or addresses: they are personal data.
      console.info('[briefing] neither CONTACT_WEBHOOK_URL nor SMTP_USER and SMTP_PASSWORD are set; accepted a briefing locally without delivering it.');
      return { ok: true, via: 'dev-log' };
    }
    return { ok: false, reason: 'not_configured' };
  }

  const id = crypto.randomUUID();

  if (smtp) {
    // No webhook: the briefing goes out as a plain-text e-mail (lib/server/smtp.ts). The id is the Message-ID, so a retry after a timeout that
    // had in fact delivered is the same message, which a mailbox drops.
    const mail = buildBriefingMail(lead, id, smtp, new Date().toISOString(), mailLabels(lead));
    const { outcome, attempts } = await withRetry(id, (timeoutMs) => sendBriefingMail(smtp, mail, timeoutMs));
    if (outcome === 'ok') return { ok: true, via: 'smtp', attempts };
    console.error(`[briefing] delivery ${id} by SMTP failed after ${attempts} attempt(s)`);
    return { ok: false, reason: 'failed', attempts };
  }

  if (!url || !isAllowedWebhookUrl(url)) {
    console.error('[briefing] CONTACT_WEBHOOK_URL must be an https:// URL.');
    return { ok: false, reason: 'not_configured' };
  }

  // Ready-made subject for the mail node: "[Briefing][high] Company, Name". Both parts are already single-line plain text.
  const subject = `[Briefing][${lead.tier}] ${lead.company}, ${lead.name}`;
  const body = JSON.stringify({ type: 'syncflow.briefing', id, receivedAt: new Date().toISOString(), subject, ...lead });
  const headers: Record<string, string> = { 'content-type': 'application/json', 'idempotency-key': id };
  const secret = process.env.CONTACT_WEBHOOK_SECRET?.trim();
  if (secret) headers['x-syncflow-signature'] = `sha256=${await hmacHex(secret, body)}`;

  const { outcome, attempts } = await withRetry(id, (timeoutMs) => attempt(url, headers, body, timeoutMs));
  if (outcome === 'ok') return { ok: true, via: 'webhook', attempts };
  console.error(`[briefing] delivery ${id} failed after ${attempts} attempt(s)`);
  return { ok: false, reason: 'failed', attempts };
}
