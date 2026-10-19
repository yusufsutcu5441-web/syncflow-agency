import type { BriefingPayload } from './deliver';
import type { Attempt } from './smtp';

/**
 * Optional instant notification of a briefing through the Telegram Bot API (docs/adr/0034-telegram-lead-alert.md). Free, no n8n, no mail account:
 * a bot token and the numeric id of a private chat with that bot. Nothing here runs unless TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are both set.
 *
 * Two jobs, chosen by lib/server/deliver.ts:
 * - ALERT ('summary'): the briefing was delivered by the signed webhook or by SMTP, and this only rings the phone: company, priority, answers, delivery id.
 *   No name, no e-mail address, no message text.
 * - DELIVERY ('full'): neither of those is set (or the one that is set failed), so the whole briefing goes to the chat. Telegram is then the way out.
 *
 * Every status line says only what is true at that moment. A form submission is never reported as a payment, a sent offer or a closed sale: this site
 * has no payment step, and a status that was not true would teach its reader to ignore the alert.
 *
 * Plain text only (no parse_mode, so nothing a visitor typed is ever read as formatting or as a link label), link previews off, the token is never
 * logged, redirects are refused. This file imports no other project module at run time (both imports above are types), so tests/delivery runs it as it
 * is. It is reached only from lib/server/deliver.ts and lib/server/delivery-status.ts, which carry `import 'server-only'`: no client component can pull
 * the token in.
 *
 * The bot token can send messages as that bot and read what is sent to it. It opens no mailbox and none of the owner's other chats.
 */

export type TelegramSettings = {
  token: string;
  /** A numeric chat id: a private chat with the bot (positive) or a group (negative). Never a @username, which could post a lead into a public channel. */
  chatId: string;
  /** https://api.telegram.org, another https address (a self-hosted Bot API server), or a loopback http address (the tests' fake). */
  apiBase: string;
};

/** The readable labels of the answers (the payload carries ids); resolved by the caller from the English copy and the pricing ladder. */
export type TelegramLabels = { project: string; budget: string; timeline: string; role: string; market: string };

export type TelegramDetail = { kind: 'full'; primaryFailed: boolean } | { kind: 'summary'; via: 'webhook' | 'smtp' };

const DEFAULT_BASE = 'https://api.telegram.org';
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);
/** Telegram's format: the bot's numeric id, a colon, then 35 characters of [A-Za-z0-9_-]. Looser on length, strict on alphabet. */
const TOKEN = /^\d{5,16}:[A-Za-z0-9_-]{30,64}$/;
const CHAT_ID = /^-?\d{1,20}$/;
/** Telegram accepts 4096 characters in one message. The briefing fields are far shorter (lib/briefing.ts LIMITS); this is a ceiling, counted in code points. */
const MAX_TEXT = 3500;
const TIER: Record<string, string> = { high: 'yüksek', medium: 'orta' };

/** One line of plain text: control characters (line breaks above all) and the Unicode line separators become spaces. */
const oneLine = (text: string) => text.replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ').replace(/ {2,}/g, ' ').trim();
/** Several lines: line breaks stay, every other control character goes, and runs of blank lines collapse. */
const manyLines = (text: string) =>
  text
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f\u2028\u2029]/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
/** Cut by code points, so a pair of surrogates (an emoji) is never split in the middle. */
const clip = (text: string, max: number) => {
  const chars = Array.from(text);
  return chars.length <= max ? text : `${chars.slice(0, max - 1).join('').trimEnd()}…`;
};

function apiBase(raw: string | undefined): string {
  if (!raw?.trim()) return DEFAULT_BASE;
  try {
    const url = new URL(raw.trim());
    const plainLoopback = url.protocol === 'http:' && LOOPBACK.has(url.hostname);
    if ((url.protocol !== 'https:' && !plainLoopback) || url.username || url.password || url.search || url.hash) return DEFAULT_BASE;
    return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
  } catch {
    return DEFAULT_BASE;
  }
}

/** null = the path is off: a missing, malformed or non-numeric setting disables it instead of sending somewhere wrong. */
export function telegramSettings(env: Record<string, string | undefined>): TelegramSettings | null {
  const token = env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId || !TOKEN.test(token) || !CHAT_ID.test(chatId)) return null;
  return { token, chatId, apiBase: apiBase(env.TELEGRAM_API_BASE) };
}

/**
 * The message. The first line follows the owner's alert format ("[SATIŞ ALARMI] - Müşteri: … | … | Durum: …"), and its status is what actually happened:
 * received, forwarded by webhook or SMTP, or received only here because the normal path failed.
 */
export function buildTelegramText(lead: BriefingPayload, id: string, receivedAt: string, labels: TelegramLabels, detail: TelegramDetail): string {
  const company = clip(oneLine(lead.company), 120);
  const tier = TIER[lead.tier] ?? clip(oneLine(String(lead.tier)), 20);
  const status =
    detail.kind === 'summary'
      ? `Başvuru ${detail.via === 'smtp' ? 'e-posta (SMTP) ile' : 'webhook ile'} iletildi, kişisel yanıt bekliyor`
      : detail.primaryFailed
        ? 'Normal teslim yolu başarısız oldu, başvuru yalnızca buradan geldi, kişisel yanıt bekliyor'
        : 'Başvuru alındı, kişisel yanıt bekliyor';
  const lines = [`🚨 [SATIŞ ALARMI] - Müşteri: ${company} | Sınıf: ${tier} | Yatırım: ${oneLine(labels.budget)} | Durum: ${status}`];
  if (detail.kind === 'full' && detail.primaryFailed) lines.push('⚠ Birincil teslim yolu (webhook ya da SMTP) başarısız oldu: ayarlarını ve n8n ile posta durumunu kontrol edin.');
  lines.push('');
  if (detail.kind === 'full') {
    lines.push(
      `Ad: ${clip(oneLine(lead.name), 80)}`,
      `E-posta: ${clip(oneLine(lead.email), 254)}`,
      `Rol: ${oneLine(labels.role)}`,
      `Proje: ${oneLine(labels.project)}`,
      `Zamanlama: ${oneLine(labels.timeline)}`,
      `Pazar: ${oneLine(labels.market)} (dil: ${clip(oneLine(lead.locale), 12)})`,
      '',
      'Mesaj:',
      clip(manyLines(lead.message), 600) || '(yok)',
      '',
      `Ref ${id} · ${receivedAt}`,
      'Sitede verilen söz: 24 saat içinde kişisel yanıt. Yanıtlamak için yukarıdaki adrese yazın.',
    );
  } else {
    lines.push(
      `Proje: ${oneLine(labels.project)}`,
      `Zamanlama: ${oneLine(labels.timeline)}`,
      `Pazar: ${oneLine(labels.market)} (dil: ${clip(oneLine(lead.locale), 12)})`,
      '',
      `Ref ${id} · ${receivedAt}`,
      'Ayrıntılar teslim kanalında; bu mesajda ad, e-posta ve mesaj metni yoktur.',
    );
  }
  return clip(lines.join('\n'), MAX_TEXT);
}

/**
 * One send. Telegram answers 200 {"ok":true,...} on success. A timeout, a refused connection, a 5xx, 408 or 429 (too many messages: Telegram asks for
 * about one per second per chat) is worth another try; any other answer (a wrong token, a chat that never wrote to the bot, a bad request) is final.
 * Telegram has no idempotency key: a retry after a timeout that had in fact delivered shows the message twice, with the same Ref.
 */
export async function sendTelegram(settings: TelegramSettings, text: string, options: { protect: boolean; timeoutMs: number }): Promise<Attempt> {
  try {
    const response = await fetch(`${settings.apiBase}/bot${settings.token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: settings.chatId,
        text,
        link_preview_options: { is_disabled: true },
        // The whole briefing is personal data: ask Telegram clients not to let it be forwarded or saved from the chat.
        ...(options.protect ? { protect_content: true } : {}),
      }),
      signal: AbortSignal.timeout(options.timeoutMs),
      cache: 'no-store',
      redirect: 'error',
    });
    if (response.ok) {
      const answer = (await response.json().catch(() => null)) as { ok?: unknown } | null;
      return answer?.ok === true ? 'ok' : 'final';
    }
    return response.status >= 500 || response.status === 408 || response.status === 429 ? 'retry' : 'final';
  } catch {
    // Never log the error: the request address contains the token.
    return 'retry';
  }
}
