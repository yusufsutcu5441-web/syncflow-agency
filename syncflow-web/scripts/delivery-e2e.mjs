#!/usr/bin/env node
/**
 * End-to-end check of the briefing delivery on a PRODUCTION build, against fakes on loopback (docs/adr/0034-telegram-lead-alert.md section 4).
 * The signed-webhook receiver and the Telegram Bot API are two small servers in this file; nothing real is contacted except Cloudflare, which verifies
 * its own always-pass Turnstile test secret (so the network is needed). Run `npm run build` first.
 *
 *   npm run delivery:e2e
 *
 * `next start` runs on :3195, four times with a different environment, and a briefing is posted to /api/briefing each time:
 *   1 webhook + Telegram   a delivered briefing rings the phone with NO personal data; a failing webhook hands the whole briefing to Telegram;
 *                          a failing Telegram changes nothing for the visitor; both failing is a 502
 *   2 Telegram only        the whole briefing goes to the chat; a refused token is a 502, never a false "received"
 *   3 a malformed token    treated as not set: the form answers 503 (fail closed)
 *   4 nothing set          503
 * Not tested here: whether Telegram itself accepts a message (needs the owner's bot: npm run telegram:check -- --send), and Gmail or n8n.
 */
import { spawn } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { existsSync } from 'node:fs';
import http from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 3195;
const BASE = `http://127.0.0.1:${PORT}`;
const TOKEN = '123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw';
const CHAT = '987654321';
const SECRET = 'e2e-shared-secret';
const TURNSTILE_TEST_SECRET = '1x0000000000000000000000000000000AA';

if (!existsSync(join(root, '.next', 'BUILD_ID'))) {
  console.error('There is no production build in .next: run `npm run build` first.');
  process.exit(2);
}

const outcomes = [];
const check = (name, ok, detail = '') => {
  outcomes.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : `  (${detail})`}`);
};

// The server sees none of this machine's delivery variables, whatever its shell has set.
const CLEAN = { ...process.env };
for (const name of ['NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_FROM', 'BRIEFING_INBOX', 'CONTACT_WEBHOOK_URL', 'CONTACT_WEBHOOK_SECRET', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'TELEGRAM_API_BASE', 'CSP_MODE', 'DEFER_FRAMEWORK']) delete CLEAN[name];

function fake(handler) {
  const hits = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      hits.push({ url: req.url, headers: req.headers, body });
      handler(req, res, body);
    });
  });
  return new Promise((resolveListen) => server.listen(0, '127.0.0.1', () => resolveListen({ server, hits, port: server.address().port })));
}
const json = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};

const behaviour = { webhook: 'ok', telegram: 'ok' };
const webhook = await fake((req, res) => (behaviour.webhook === 'ok' ? json(res, 200, { ok: true }) : json(res, 500, { ok: false })));
const telegram = await fake((req, res) => {
  if (req.url !== `/bot${TOKEN}/sendMessage`) return json(res, 404, { ok: false, description: 'Not Found' });
  if (behaviour.telegram === 'ok') return json(res, 200, { ok: true, result: { message_id: 1 } });
  if (behaviour.telegram === 'unauthorized') return json(res, 401, { ok: false, error_code: 401, description: 'Unauthorized' });
  return json(res, 500, { ok: false });
});
const reset = (webhookMode, telegramMode) => {
  behaviour.webhook = webhookMode;
  behaviour.telegram = telegramMode;
  webhook.hits.length = 0;
  telegram.hits.length = 0;
};
const sent = () => telegram.hits.map((hit) => JSON.parse(hit.body));

let requestNumber = 0;
async function post() {
  requestNumber += 1;
  const response = await fetch(`${BASE}/api/briefing`, {
    method: 'POST',
    // A different client address each time keeps this clear of the limiter (5 briefings in 10 minutes per address).
    headers: { 'content-type': 'application/json', origin: BASE, 'x-real-ip': `10.9.8.${requestNumber}` },
    body: JSON.stringify({
      projectType: 'platform',
      budget: 't2',
      timeline: 'w6',
      role: 'decider',
      name: 'Jane Doe',
      company: 'Acme Holding, Chief Marketing Officer',
      email: 'jane@acme.com',
      message: 'We need the platform live before the autumn.',
      consent: true,
      locale: 'en',
      market: 'us',
      turnstileToken: 'XXXX.DUMMY.TOKEN.XXXX',
      website: '',
      elapsedMs: 6000,
    }),
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

async function withServer(env, run) {
  const child = spawn(process.execPath, [join(root, 'node_modules', 'next', 'dist', 'bin', 'next'), 'start', '-p', String(PORT)], { cwd: root, env: { ...CLEAN, ...env }, stdio: 'ignore' });
  const exited = new Promise((resolveExit) => child.once('exit', resolveExit));
  try {
    const until = Date.now() + 60_000;
    let up = false;
    while (!up && Date.now() < until) {
      try {
        up = (await fetch(`${BASE}/robots.txt`)).ok;
      } catch {
        await new Promise((resolveWait) => setTimeout(resolveWait, 400));
      }
    }
    if (!up) {
      check('the production server came up', false, 'not up after 60 s');
      return;
    }
    await run();
  } finally {
    child.kill();
    await exited;
  }
}

const turnstile = { TURNSTILE_SECRET_KEY: TURNSTILE_TEST_SECRET };
const telegramEnv = { TELEGRAM_BOT_TOKEN: TOKEN, TELEGRAM_CHAT_ID: CHAT, TELEGRAM_API_BASE: `http://127.0.0.1:${telegram.port}` };
const webhookEnv = { CONTACT_WEBHOOK_URL: `http://127.0.0.1:${webhook.port}/lead`, CONTACT_WEBHOOK_SECRET: SECRET };

try {
  console.log('\n1 webhook + Telegram');
  await withServer({ ...turnstile, ...webhookEnv, ...telegramEnv }, async () => {
    reset('ok', 'ok');
    let answer = await post();
    if (answer.status === 403) console.log('  (403 verification: Cloudflare could not be reached to check the Turnstile test secret; this check needs the network)');
    check('delivered: 200 {ok:true}', answer.status === 200 && answer.body?.ok === true, `${answer.status} ${JSON.stringify(answer.body)}`);
    const received = webhook.hits[0] ? JSON.parse(webhook.hits[0].body) : null;
    check('the webhook got one signed briefing with the whole content', webhook.hits.length === 1 && received?.email === 'jane@acme.com' && webhook.hits[0].headers['x-syncflow-signature'] === `sha256=${createHmac('sha256', SECRET).update(webhook.hits[0].body).digest('hex')}`);
    const alert = sent()[0];
    check('Telegram got exactly one ALERT', telegram.hits.length === 1 && alert?.chat_id === CHAT);
    check('the alert follows the owner format and names the delivery', alert?.text.startsWith('🚨 [SATIŞ ALARMI] - Müşteri: Acme Holding, Chief Marketing Officer | Sınıf: yüksek | Yatırım:') && alert.text.includes('Durum: Başvuru webhook ile iletildi, kişisel yanıt bekliyor') && alert.text.includes(`Ref ${received?.id}`));
    check('the alert carries no name, no e-mail address and no message', !/Jane Doe|jane@acme\.com|We need the platform/.test(alert?.text ?? 'x'));
    check('the alert is plain text, previews off, nothing about payment', !('parse_mode' in (alert ?? {})) && alert?.link_preview_options?.is_disabled === true && !/ödeme|payment|kasa/i.test(alert?.text ?? ''));

    reset('fail', 'ok');
    answer = await post();
    check('webhook failing, Telegram up: still 200 (the briefing reached the owner)', answer.status === 200 && answer.body?.ok === true, `${answer.status}`);
    check('the webhook was tried twice with the same delivery id', webhook.hits.length === 2 && JSON.parse(webhook.hits[0].body).id === JSON.parse(webhook.hits[1].body).id, `${webhook.hits.length} hits`);
    const rescue = sent()[0];
    check('Telegram got the WHOLE briefing, protected, with the fault named', telegram.hits.length === 1 && /jane@acme\.com/.test(rescue?.text ?? '') && /We need the platform live/.test(rescue?.text ?? '') && /⚠ Birincil teslim yolu/.test(rescue?.text ?? '') && rescue?.protect_content === true);

    reset('ok', 'fail');
    answer = await post();
    check('delivered but Telegram down: the visitor still gets 200', answer.status === 200 && answer.body?.ok === true && webhook.hits.length === 1, `${answer.status}`);
    check('the alert is one attempt, not a retry loop', telegram.hits.length === 1, `${telegram.hits.length} hits`);

    reset('fail', 'fail');
    answer = await post();
    check('everything failing is a 502, not a false "received"', answer.status === 502 && answer.body?.code === 'failed', `${answer.status} ${JSON.stringify(answer.body)}`);
  });

  console.log('\n2 Telegram only');
  await withServer({ ...turnstile, ...telegramEnv }, async () => {
    reset('ok', 'ok');
    let answer = await post();
    check('accepted: 200 {ok:true}', answer.status === 200 && answer.body?.ok === true, `${answer.status} ${JSON.stringify(answer.body)}`);
    const whole = sent()[0];
    check('the whole briefing is in one message, protected, with an honest status', telegram.hits.length === 1 && /Ad: Jane Doe/.test(whole?.text ?? '') && /E-posta: jane@acme\.com/.test(whole?.text ?? '') && /We need the platform live/.test(whole?.text ?? '') && / Durum: Başvuru alındı, kişisel yanıt bekliyor/.test(whole?.text ?? '') && !/⚠/.test(whole?.text ?? '') && whole?.protect_content === true);

    reset('ok', 'unauthorized');
    answer = await post();
    check('a refused token is a 502 and is not retried', answer.status === 502 && answer.body?.code === 'failed' && telegram.hits.length === 1, `${answer.status}, ${telegram.hits.length} hits`);

    reset('ok', 'fail');
    answer = await post();
    check('Telegram down: two attempts, then a 502', answer.status === 502 && telegram.hits.length === 2, `${answer.status}, ${telegram.hits.length} hits`);
  });

  console.log('\n3 a malformed token');
  await withServer({ ...turnstile, TELEGRAM_BOT_TOKEN: 'not-a-token', TELEGRAM_CHAT_ID: CHAT, TELEGRAM_API_BASE: telegramEnv.TELEGRAM_API_BASE }, async () => {
    reset('ok', 'ok');
    const answer = await post();
    check('treated as not set: 503 unavailable, nothing sent', answer.status === 503 && answer.body?.code === 'unavailable' && telegram.hits.length === 0, `${answer.status}`);
  });

  console.log('\n4 nothing set');
  await withServer({ ...turnstile }, async () => {
    reset('ok', 'ok');
    const answer = await post();
    check('503 unavailable (fail closed)', answer.status === 503 && answer.body?.code === 'unavailable', `${answer.status}`);
  });
} finally {
  webhook.server.closeAllConnections?.();
  telegram.server.closeAllConnections?.();
  webhook.server.close();
  telegram.server.close();
}

const failed = outcomes.filter((ok) => !ok).length;
console.log(`\ndelivery e2e: ${outcomes.length - failed} of ${outcomes.length} checks passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
