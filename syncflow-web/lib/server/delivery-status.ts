import 'server-only';

/**
 * Whether the briefing can be delivered by this deployment (docs/adr/0025-honest-trust-signals.md, docs/adr/0027-optional-smtp-delivery.md).
 *
 * Delivery needs the Cloudflare Turnstile secret and site key (the bot check) and one way out: either the signed webhook (CONTACT_WEBHOOK_URL and
 * CONTACT_WEBHOOK_SECRET, to n8n) or an SMTP login (SMTP_USER and SMTP_PASSWORD, used only when no webhook is set). Without them the API refuses in
 * production (503, "fail closed": it never answers "received" for a message nobody got). The page used to find that out only after a visitor had
 * answered all four steps. It now asks here first, on the server, and when delivery is not connected it presents the briefing as what it then
 * honestly is: an email draft to the founding team, composed from the answers, that the visitor reads and sends from their own mailbox.
 *
 * Development always counts as connected: the API accepts a briefing locally there and says so (lib/server/deliver.ts).
 */
export function briefingDeliveryConnected(): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  const set = (name: string) => Boolean(process.env[name]?.trim());
  const bot = set('TURNSTILE_SECRET_KEY') && set('NEXT_PUBLIC_TURNSTILE_SITE_KEY');
  const webhook = set('CONTACT_WEBHOOK_URL') && set('CONTACT_WEBHOOK_SECRET');
  const smtp = set('SMTP_USER') && set('SMTP_PASSWORD');
  return bot && (webhook || smtp);
}
