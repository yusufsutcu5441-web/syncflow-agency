import nodemailer from 'nodemailer';
import type { BriefingPayload } from './deliver';

/**
 * Optional delivery of a briefing by SMTP (docs/adr/0027-optional-smtp-delivery.md): the briefing is sent as a plain-text e-mail from this site,
 * with no n8n in between. It is used only when CONTACT_WEBHOOK_URL is not set (the signed webhook stays the documented, preferred path) and
 * SMTP_USER and SMTP_PASSWORD are. Nothing here runs unless those are set.
 *
 * This file imports no other project module at run time (the BriefingPayload import is a type), so tests/delivery runs it as it is with Node.
 * It is reached only from lib/server/deliver.ts, which carries `import 'server-only'`: no client component can pull the credentials in.
 *
 * The credential is a secret that can send mail as that account. Gmail's app passwords also open the whole mailbox over IMAP, so the sender
 * should be a dedicated account that holds no other mail (docs/go-live-checklist.md), and SMTP_FROM / BRIEFING_INBOX route the briefing to the
 * real inbox. A send-only SMTP provider (the same variables, another SMTP_HOST) has a narrower key and is the safer choice when one is available.
 */

export type SmtpSettings = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  /** The From address: SMTP_FROM, else the login when that is an address. */
  from: string;
  /** Where the briefing lands: BRIEFING_INBOX, else the studio's contact address. */
  to: string;
};

/** The readable labels of the answers (the payload carries ids); resolved by the caller from the English copy and the pricing ladder. */
export type MailLabels = { project: string; budget: string; timeline: string; role: string; market: string };

export type Attempt = 'ok' | 'retry' | 'final';

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
const ADDRESS = /^[^\s@<>"',;:\\]+@[^\s@<>"',;:\\]+\.[^\s@<>"',;:\\]+$/;
/** Control characters (CR and LF above all) never reach a header or an address. */
const oneLine = (text: string) => text.replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ').trim();

export function smtpSettings(env: Record<string, string | undefined>, contactEmail: string): SmtpSettings | null {
  const user = env.SMTP_USER?.trim();
  // Google shows an app password as four groups of four letters with spaces; the spaces are not part of it.
  const password = env.SMTP_PASSWORD?.replace(/\s+/g, '');
  if (!user || !password) return null;
  const from = oneLine(env.SMTP_FROM ?? '') || (ADDRESS.test(user) ? user : '');
  if (!ADDRESS.test(from)) return null;
  const to = oneLine(env.BRIEFING_INBOX ?? '') || contactEmail;
  if (!ADDRESS.test(to)) return null;
  const port = Number(env.SMTP_PORT ?? 465);
  const validPort = Number.isInteger(port) && port > 0 && port < 65536 ? port : 465;
  const secure = env.SMTP_SECURE ? env.SMTP_SECURE !== 'false' : validPort === 465;
  return { host: env.SMTP_HOST?.trim() || 'smtp.gmail.com', port: validPort, secure, user, password, from, to };
}

/** The message: plain text only (no HTML to inject into), Reply-To is the visitor, and the delivery id is the Message-ID so a repeat is the same mail. */
export function buildBriefingMail(lead: BriefingPayload, id: string, settings: SmtpSettings, receivedAt: string, labels: MailLabels) {
  const subject = oneLine(`[Briefing][${lead.tier}] ${lead.company}, ${lead.name}`);
  const text = [
    `Strategic briefing, priority ${lead.tier}`,
    '',
    `Name: ${oneLine(lead.name)}`,
    `Company: ${oneLine(lead.company)}`,
    `Role: ${labels.role}`,
    `E-mail: ${oneLine(lead.email)}`,
    '',
    `Project: ${labels.project}`,
    `Investment: ${labels.budget}`,
    `Timing: ${labels.timeline}`,
    `Market: ${labels.market} (language: ${oneLine(lead.locale)})`,
    '',
    'Message:',
    lead.message.trim() || '(none)',
    '',
    '---',
    `Received ${receivedAt}. Delivery id ${id}. Reply to this e-mail to answer the sender (Reply-To is set to their address).`,
  ].join('\n');
  return {
    from: { name: 'syncflow.agency briefing', address: settings.from },
    to: settings.to,
    replyTo: { name: oneLine(lead.name).replace(/["\\]/g, ''), address: oneLine(lead.email) },
    subject,
    text,
    messageId: `<${id}@syncflow.agency>`,
    headers: { 'X-Briefing-Id': id, 'X-Briefing-Tier': lead.tier, 'Auto-Submitted': 'auto-generated' },
  };
}

/** One send. A 5xx answer (bad credentials, refused sender or recipient) is final; a timeout, a refused connection or a 4xx is worth another try. */
export async function sendBriefingMail(settings: SmtpSettings, mail: ReturnType<typeof buildBriefingMail>, timeoutMs: number): Promise<Attempt> {
  const loopback = LOOPBACK.has(settings.host);
  const transport = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    auth: { user: settings.user, pass: settings.password },
    connectionTimeout: timeoutMs,
    greetingTimeout: timeoutMs,
    socketTimeout: timeoutMs,
    // Mail is only ever sent over TLS, except to a loopback test server: without an implicit-TLS port, STARTTLS is mandatory.
    ...(loopback ? { ignoreTLS: true } : { requireTLS: true }),
  });
  try {
    await transport.sendMail(mail);
    return 'ok';
  } catch (error) {
    const code = (error as { responseCode?: number }).responseCode;
    return typeof code === 'number' && code >= 500 ? 'final' : 'retry';
  } finally {
    transport.close();
  }
}
