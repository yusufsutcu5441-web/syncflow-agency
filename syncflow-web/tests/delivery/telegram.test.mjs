// Contract tests of the optional Telegram path (lib/server/telegram.ts, docs/adr/0034-telegram-lead-alert.md).
//   npm run delivery:verify
// A small HTTP server on loopback takes the place of api.telegram.org (the module accepts a loopback http address for exactly this), so the real
// request is tested: the path with the token, the JSON body, the answers sorted into done / worth another try / final, a redirect, a silent server,
// an unreachable one. The formatting tests check what the alert may and may not carry. Whether Telegram itself accepts a message is not tested here:
// that needs the owner's bot (npm run telegram:check -- --send).
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

// scripts/delivery-verify.mjs compiles lib/server/*.ts into a temporary folder (DELIVERY_LIB), so this runs on Node 20.19 too; started by hand on
// Node 22.18 or newer, the TypeScript source is loaded as it is.
const load = (name) => import(process.env.DELIVERY_LIB ? pathToFileURL(`${process.env.DELIVERY_LIB}/${name}.js`).href : new URL(`../../lib/server/${name}.ts`, import.meta.url).href);
const { buildTelegramText, sendTelegram, telegramSettings } = await load('telegram');

// Shaped like a real token and a real chat id; neither belongs to anything.
const TOKEN = '123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw';
const CHAT = '987654321';
const ID = '3f0c6c1e-0a5b-4d3e-9b53-2d1e8e5f7a10';
const AT = '2026-10-19T10:00:00.000Z';
const LEAD = {
  projectType: 'platform',
  budget: 't2',
  timeline: 'w6',
  role: 'decider',
  tier: 'high',
  name: 'Jane Doe',
  company: 'Acme Holding, Chief Marketing Officer',
  email: 'jane@acme.com',
  message: 'We need the platform live before the autumn.',
  locale: 'en',
  market: 'us',
};
const LABELS = { project: 'A platform and automation', budget: '$100,000 – $250,000', timeline: 'Within six weeks', role: 'I decide', market: 'us' };

/** A fake Bot API. `handler(req, res)` answers; every request is recorded. */
function fakeTelegram(handler) {
  const requests = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      requests.push({ method: req.method, url: req.url, headers: req.headers, body });
      handler(req, res);
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, base: `http://127.0.0.1:${server.address().port}`, requests })));
}
const answer = (res, status, json) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(typeof json === 'string' ? json : JSON.stringify(json));
};
const stop = (...servers) => servers.forEach((server) => (server.closeAllConnections?.(), server.close()));
const settingsFor = (base) => telegramSettings({ TELEGRAM_BOT_TOKEN: TOKEN, TELEGRAM_CHAT_ID: CHAT, TELEGRAM_API_BASE: base });
const SEND = { protect: false, timeoutMs: 3000 };

test('without a valid token and a numeric chat id nothing is configured, and the base address can only be https or loopback', () => {
  assert.equal(telegramSettings({}), null);
  assert.equal(telegramSettings({ TELEGRAM_BOT_TOKEN: TOKEN }), null);
  assert.equal(telegramSettings({ TELEGRAM_CHAT_ID: CHAT }), null);
  assert.equal(telegramSettings({ TELEGRAM_BOT_TOKEN: 'not-a-token', TELEGRAM_CHAT_ID: CHAT }), null);
  assert.equal(telegramSettings({ TELEGRAM_BOT_TOKEN: TOKEN, TELEGRAM_CHAT_ID: '@somechannel' }), null, 'a @username could post a lead into a public channel');
  assert.equal(telegramSettings({ TELEGRAM_BOT_TOKEN: TOKEN, TELEGRAM_CHAT_ID: '12 34' }), null);
  assert.deepEqual(telegramSettings({ TELEGRAM_BOT_TOKEN: ` ${TOKEN} `, TELEGRAM_CHAT_ID: ' -1001234567890 ' }), { token: TOKEN, chatId: '-1001234567890', apiBase: 'https://api.telegram.org' });

  const base = (value) => telegramSettings({ TELEGRAM_BOT_TOKEN: TOKEN, TELEGRAM_CHAT_ID: CHAT, TELEGRAM_API_BASE: value }).apiBase;
  assert.equal(base('http://127.0.0.1:8081/'), 'http://127.0.0.1:8081');
  assert.equal(base('https://bot-api.example.com/'), 'https://bot-api.example.com');
  for (const bad of ['http://api.telegram.org', 'http://evil.example.com', 'ftp://x.example.com', 'https://user:pw@x.example.com', 'https://x.example.com/?a=1', 'not a url', '']) {
    assert.equal(base(bad), 'https://api.telegram.org', `"${bad}" falls back to the real Bot API instead of being used`);
  }
});

test('the alert follows the owner format and says only what is true: delivered by webhook, no name, no address, no message, no payment', () => {
  const text = buildTelegramText(LEAD, ID, AT, LABELS, { kind: 'summary', via: 'webhook' });
  assert.equal(
    text.split('\n')[0],
    '🚨 [SATIŞ ALARMI] - Müşteri: Acme Holding, Chief Marketing Officer | Sınıf: yüksek | Yatırım: $100,000 – $250,000 | Durum: Başvuru webhook ile iletildi, kişisel yanıt bekliyor',
  );
  for (const forbidden of ['Jane Doe', 'jane@acme.com', 'We need the platform live before the autumn.', 'I decide']) assert.ok(!text.includes(forbidden), `the alert must not carry "${forbidden}"`);
  for (const piece of [ID, AT, 'A platform and automation', 'Within six weeks']) assert.ok(text.includes(piece), `the alert carries ${piece}`);
  assert.doesNotMatch(text, /ödeme|payment|kasa|\$5,000|link gönderildi/i, 'a form submission is never reported as a payment or a sent offer');
  assert.match(buildTelegramText(LEAD, ID, AT, LABELS, { kind: 'summary', via: 'smtp' }).split('\n')[0], /Durum: Başvuru e-posta \(SMTP\) ile iletildi/);
});

test('the whole briefing goes out only when Telegram is the way out, and the message names the fault when the normal path failed', () => {
  const only = buildTelegramText(LEAD, ID, AT, LABELS, { kind: 'full', primaryFailed: false });
  assert.match(only.split('\n')[0], /Durum: Başvuru alındı, kişisel yanıt bekliyor$/);
  for (const piece of ['Ad: Jane Doe', 'E-posta: jane@acme.com', 'Rol: I decide', 'Proje: A platform and automation', 'Zamanlama: Within six weeks', 'We need the platform live before the autumn.', ID]) {
    assert.ok(only.includes(piece), `the full briefing carries ${piece}`);
  }
  assert.doesNotMatch(only, /⚠/);
  const fallback = buildTelegramText(LEAD, ID, AT, LABELS, { kind: 'full', primaryFailed: true });
  assert.match(fallback.split('\n')[0], /Durum: Normal teslim yolu başarısız oldu, başvuru yalnızca buradan geldi/);
  assert.match(fallback, /⚠ Birincil teslim yolu/);
  assert.match(buildTelegramText({ ...LEAD, message: '' }, ID, AT, LABELS, { kind: 'full', primaryFailed: false }), /Mesaj:\n\(yok\)/);
});

test('what a visitor typed stays plain text: control characters, line breaks in one-line fields, a very long message, an emoji at the cut', () => {
  const hostile = {
    ...LEAD,
    name: 'Jane\r\nBot: /start\u0000',
    company: 'Acme | Holding\n🚨 [SATIŞ ALARMI] - Müşteri: fake',
    message: `<b>bold</b> [x](http://evil.example) @everyone\n\n\n\n${'x'.repeat(5000)}🚀`,
  };
  const text = buildTelegramText(hostile, ID, AT, LABELS, { kind: 'full', primaryFailed: false });
  assert.ok(Array.from(text).length <= 3500, 'inside the ceiling (Telegram takes 4096)');
  assert.equal(text.split('\n').filter((line) => line.startsWith('🚨')).length, 1, 'a line break in the company cannot start a second alert line');
  assert.doesNotMatch(text, /[\u0000-\u0009\u000b-\u001f\u007f]/, 'no control character is left');
  assert.ok(text.split('\n').includes('Ad: Jane Bot: /start'), 'the name stays on one line');
  assert.ok(text.includes('<b>bold</b> [x](http://evil.example) @everyone'), 'markup is kept as the plain text it is (the request carries no parse_mode)');
  assert.doesNotMatch(text, /\n{3,}/, 'runs of blank lines collapse');
  assert.doesNotMatch(text, /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/, 'a pair of surrogates is never split');
});

test('a message is posted to the Bot API as plain text with previews off, the chat id as a string, and the whole briefing protected', async () => {
  const { server, base, requests } = await fakeTelegram((req, res) => answer(res, 200, { ok: true, result: { message_id: 7 } }));
  try {
    const settings = settingsFor(base);
    assert.equal(await sendTelegram(settings, 'hello', { protect: true, timeoutMs: 3000 }), 'ok');
    assert.equal(requests.length, 1);
    assert.equal(requests[0].method, 'POST');
    assert.equal(requests[0].url, `/bot${TOKEN}/sendMessage`);
    assert.match(requests[0].headers['content-type'], /^application\/json/);
    const body = JSON.parse(requests[0].body);
    assert.deepEqual(body, { chat_id: CHAT, text: 'hello', link_preview_options: { is_disabled: true }, protect_content: true });
    assert.ok(!('parse_mode' in body), 'no parse_mode: nothing a visitor typed is read as formatting');

    assert.equal(await sendTelegram(settings, 'alert', SEND), 'ok');
    assert.ok(!('protect_content' in JSON.parse(requests[1].body)), 'the alert carries no personal data and is not protected');
  } finally {
    stop(server);
  }
});

test('Telegram answers are sorted into done, worth another try, and final', async () => {
  const cases = [
    [200, { ok: true, result: {} }, 'ok'],
    [200, { ok: false, description: 'odd' }, 'final'],
    [200, 'not json', 'final'],
    [400, { ok: false, error_code: 400, description: 'Bad Request: chat not found' }, 'final'],
    [401, { ok: false, error_code: 401, description: 'Unauthorized' }, 'final'],
    [403, { ok: false, error_code: 403, description: 'Forbidden: bot was blocked by the user' }, 'final'],
    [404, { ok: false, error_code: 404, description: 'Not Found' }, 'final'],
    [408, { ok: false }, 'retry'],
    [429, { ok: false, error_code: 429, description: 'Too Many Requests: retry after 1', parameters: { retry_after: 1 } }, 'retry'],
    [500, { ok: false }, 'retry'],
    [502, { ok: false }, 'retry'],
  ];
  for (const [status, json, expected] of cases) {
    const { server, base } = await fakeTelegram((req, res) => answer(res, status, json));
    try {
      assert.equal(await sendTelegram(settingsFor(base), 'x', SEND), expected, `HTTP ${status}`);
    } finally {
      stop(server);
    }
  }
});

test('a refused connection and a server that never answers are worth another try; the time limit is kept', async () => {
  const closedPort = await new Promise((resolve) => {
    const probe = net.createServer().listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
  assert.equal(await sendTelegram(settingsFor(`http://127.0.0.1:${closedPort}`), 'x', { protect: false, timeoutMs: 1500 }), 'retry');

  const { server, base } = await fakeTelegram(() => undefined);
  try {
    const started = Date.now();
    assert.equal(await sendTelegram(settingsFor(base), 'x', { protect: false, timeoutMs: 400 }), 'retry');
    assert.ok(Date.now() - started < 2500, 'gave up after the time limit, not after the server');
  } finally {
    stop(server);
  }
});

test('a redirect is refused and never followed', async () => {
  const target = await fakeTelegram((req, res) => answer(res, 200, { ok: true }));
  const { server, base } = await fakeTelegram((req, res) => {
    res.writeHead(302, { location: `${target.base}/stolen` });
    res.end();
  });
  try {
    assert.equal(await sendTelegram(settingsFor(base), 'x', SEND), 'retry');
    assert.equal(target.requests.length, 0, 'the redirect target was never contacted');
  } finally {
    stop(server, target.server);
  }
});

test('a failed send prints nothing and returns no text: the request address holds the token', async () => {
  const printed = [];
  const originals = {};
  for (const method of ['log', 'info', 'warn', 'error', 'debug']) {
    originals[method] = console[method];
    console[method] = (...args) => printed.push(args.join(' '));
  }
  let result;
  try {
    result = await sendTelegram(settingsFor('http://127.0.0.1:9'), 'x', { protect: false, timeoutMs: 500 });
  } finally {
    Object.assign(console, originals);
  }
  assert.equal(result, 'retry');
  assert.deepEqual(printed, []);
});
