import 'server-only';

/**
 * Delivery of a validated, sanitised lead to the operator's own system (n8n, Make, Zapier, a Slack workflow, a CRM).
 *
 * - CONTACT_WEBHOOK_URL and CONTACT_WEBHOOK_SECRET are server-only: no NEXT_PUBLIC_ prefix, never imported by a
 *   client component (this file imports 'server-only', so the build fails if anyone tries).
 * - https:// only. Plain http is accepted solely for loopback hosts so the flow can be tested locally.
 * - Redirects are refused (redirect: 'error'), which closes the classic SSRF trick of bouncing to an internal address.
 * - An optional HMAC-SHA256 signature lets the receiver prove a request really came from this site.
 */

export type LeadPayload = {
  name: string;
  email: string;
  company: string;
  message: string;
  locale: string;
};

export type DeliveryResult = { ok: true; via: 'webhook' | 'dev-log' } | { ok: false; reason: 'not_configured' | 'failed' };

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

export async function deliverLead(lead: LeadPayload): Promise<DeliveryResult> {
  const url = process.env.CONTACT_WEBHOOK_URL?.trim();

  if (!url) {
    if (process.env.NODE_ENV !== 'production') {
      // Development convenience only. Never log message bodies or addresses: they are personal data.
      console.info('[contact] CONTACT_WEBHOOK_URL is not set; accepted a lead locally without delivering it.');
      return { ok: true, via: 'dev-log' };
    }
    return { ok: false, reason: 'not_configured' };
  }
  if (!isAllowedWebhookUrl(url)) {
    console.error('[contact] CONTACT_WEBHOOK_URL must be an https:// URL.');
    return { ok: false, reason: 'not_configured' };
  }

  const body = JSON.stringify({ type: 'syncflow.contact', receivedAt: new Date().toISOString(), ...lead });
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  const secret = process.env.CONTACT_WEBHOOK_SECRET?.trim();
  if (secret) headers['x-syncflow-signature'] = `sha256=${await hmacHex(secret, body)}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
      redirect: 'error',
    });
    return response.ok ? { ok: true, via: 'webhook' } : { ok: false, reason: 'failed' };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}
