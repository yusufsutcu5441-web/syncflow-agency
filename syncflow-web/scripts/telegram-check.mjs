#!/usr/bin/env node
/**
 * The owner's check of the Telegram path (docs/adr/0034-telegram-lead-alert.md, docs/go-live-checklist.md path C). It reads TELEGRAM_BOT_TOKEN and
 * TELEGRAM_CHAT_ID from the environment of THIS shell, never from a file, and never prints either of them.
 *
 *   npm run telegram:check                    who the bot is (getMe), and whether the two settings are valid in form
 *   npm run telegram:check -- --find-chat     the chats that have written to the bot, with type and name (no message text): send the bot "hi" first
 *   npm run telegram:check -- --dry-run       print the two messages for a made-up lead; sends nothing
 *   npm run telegram:check -- --send          send both to TELEGRAM_CHAT_ID: a real message on your phone, from a made-up lead labelled TEST
 *
 *   PowerShell:  $env:TELEGRAM_BOT_TOKEN = '<token from @BotFather>'; npm run telegram:check -- --find-chat
 *   Bash:        TELEGRAM_BOT_TOKEN='<token>' npm run telegram:check -- --find-chat
 *
 * The messages are built by the same module the site uses (lib/server/telegram.ts), compiled in memory here so that this runs on Node 20.19 as well.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));

const source = ts.transpileModule(readFileSync(join(root, 'lib', 'server', 'telegram.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, verbatimModuleSyntax: false },
  fileName: 'telegram.ts',
}).outputText;
const { buildTelegramText, sendTelegram, telegramSettings } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
if (!token) {
  console.error('TELEGRAM_BOT_TOKEN is not set in this shell. Create a bot with @BotFather (docs/go-live-checklist.md, path C), then set it for this command only.');
  process.exit(1);
}
// A chat id is not needed to ask who the bot is or which chats wrote to it; "0" is only a placeholder that passes the format check.
const settings = telegramSettings({ ...process.env, TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID?.trim() || '0' });
if (!settings) {
  console.error('TELEGRAM_BOT_TOKEN (or TELEGRAM_CHAT_ID) does not have the right shape. A token looks like 123456789:AAH… and a chat id is a number (a private chat is positive).');
  process.exit(1);
}
const haveChat = Boolean(process.env.TELEGRAM_CHAT_ID?.trim());

/** One Bot API call. Only Telegram's own description is ever printed, never the address (it contains the token). */
async function call(method, query = '') {
  try {
    const response = await fetch(`${settings.apiBase}/bot${settings.token}/${method}${query}`, { signal: AbortSignal.timeout(10_000), cache: 'no-store', redirect: 'error' });
    const body = await response.json().catch(() => null);
    return { status: response.status, body };
  } catch {
    return { status: 0, body: null };
  }
}

const explain = ({ status, body }) => (status === 0 ? 'no answer (network problem?)' : `HTTP ${status}${body?.description ? `: ${body.description}` : ''}`);

const sample = {
  projectType: 'platform',
  budget: 't2',
  timeline: 'w6',
  role: 'decider',
  tier: 'high',
  name: 'Test Person',
  company: 'TEST, not a real briefing',
  email: 'test@example.com',
  message: 'This is a test message from npm run telegram:check.',
  locale: 'en',
  market: 'us',
};
const labels = { project: 'A platform and automation', budget: '$100,000 – $250,000', timeline: 'Within six weeks', role: 'I decide', market: 'us' };
const messages = [
  ['alert (what you get when the webhook or SMTP delivered the briefing)', buildTelegramText(sample, 'test-0000', new Date().toISOString(), labels, { kind: 'summary', via: 'webhook' }), false],
  ['whole briefing (what you get when Telegram is the way out)', buildTelegramText(sample, 'test-0001', new Date().toISOString(), labels, { kind: 'full', primaryFailed: false }), true],
];

let failed = false;

if (args.has('--find-chat')) {
  const result = await call('getUpdates', '?limit=100&timeout=0');
  if (result.status !== 200 || !result.body?.ok) {
    console.error(`getUpdates failed: ${explain(result)}`);
    process.exit(1);
  }
  const chats = new Map();
  for (const update of result.body.result ?? []) {
    const chat = update.message?.chat ?? update.my_chat_member?.chat ?? update.channel_post?.chat;
    if (chat) chats.set(chat.id, chat);
  }
  if (chats.size === 0) {
    console.log('No chat has written to this bot yet. Open the bot in Telegram, press Start, send "hi", and run this again.');
  } else {
    for (const chat of chats.values()) {
      const name = chat.title ?? ([chat.first_name, chat.last_name].filter(Boolean).join(' ') || chat.username || '');
      console.log(`chat id ${chat.id}  (${chat.type}${name ? `, ${name}` : ''})`);
    }
    console.log('Use the id of your own PRIVATE chat as TELEGRAM_CHAT_ID. A group id (negative) shows every briefing to every member of the group.');
  }
} else if (args.has('--dry-run')) {
  for (const [label, text] of messages) console.log(`--- ${label} ---\n${text}\n`);
} else if (args.has('--send')) {
  if (!haveChat) {
    console.error('--send needs TELEGRAM_CHAT_ID in this shell too (find it with --find-chat).');
    process.exit(1);
  }
  for (const [label, text, protect] of messages) {
    const outcome = await sendTelegram(settings, text, { protect, timeoutMs: 8000 });
    const note = { ok: 'delivered: look at your phone', final: 'refused by Telegram: wrong token or chat id, or you never pressed Start on the bot', retry: 'no answer or Telegram is busy: try again' }[outcome];
    console.log(`${outcome === 'ok' ? 'PASS' : 'FAIL'}  ${label}: ${note}`);
    if (outcome !== 'ok') failed = true;
  }
} else {
  const me = await call('getMe');
  if (me.status === 200 && me.body?.ok) {
    console.log(`PASS  the token is valid: the bot is @${me.body.result.username} (id ${me.body.result.id})`);
    console.log(`      TELEGRAM_CHAT_ID is ${haveChat ? 'set in this shell' : 'NOT set in this shell'}. Next: --find-chat, then --dry-run, then --send.`);
  } else {
    console.error(`FAIL  getMe: ${explain(me)}${me.status === 401 ? ' (the token is wrong or was revoked)' : ''}`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
