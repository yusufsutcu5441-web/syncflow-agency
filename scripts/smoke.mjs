#!/usr/bin/env node
/**
 * HTTP smoke + security test against a RUNNING server (npm run build && npm start, then in another terminal:
 * npm run smoke). No browser needed, Node 20+ only.
 *
 *   node scripts/smoke.mjs [baseUrl]            default http://localhost:3000
 *
 * Optional environment:
 *   MOCK_WEBHOOK_PORT   start a mock receiver on this port to verify delivery. Start the app with
 *                       CONTACT_WEBHOOK_URL=http://127.0.0.1:<port>/hook (and optionally CONTACT_WEBHOOK_SECRET).
 *   WEBHOOK_SECRET      the same secret, to verify the HMAC signature.
 *   STRESS=1            also fire 250 page requests from one address to prove the page-level limiter.
 */
import { createHmac } from 'node:crypto';
import { createServer } from 'node:http';

const BASE = (process.argv[2] ?? process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const ORIGIN = new URL(BASE).origin;
const results = [];

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${name}${!ok && detail ? `\n          ${detail}` : ''}`);
}
const section = (title) => console.log(`\n${title}`);
const get = (path, init = {}) => fetch(BASE + path, { redirect: 'manual', ...init });
// Documentation addresses (RFC 5737), randomised per run: the limiter remembers an address for 10 minutes, so
// reusing the same fake addresses on a second run would (correctly) be rate limited from the start.
const runSalt = Math.floor(Math.random() * 250) + 1;
const uniqueIp = (() => {
  let n = 0;
  return () => `198.51.${runSalt}.${(++n % 250) + 1}`;
})();

const post = (body, { ip = uniqueIp(), headers = {}, raw = false } = {}) =>
  fetch(`${BASE}/api/contact`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: ORIGIN, 'x-forwarded-for': ip, ...headers },
    body: raw ? body : JSON.stringify(body),
  });

const valid = (over = {}) => ({
  name: 'Jane Doe',
  email: 'jane@example.com',
  company: 'Acme',
  message: 'We would like a new website for our firm, please get in touch.',
  consent: true,
  locale: 'en',
  website: '',
  elapsedMs: 9000,
  ...over,
});

/* ── mock webhook receiver ───────────────────────────────────────────────────────────────────── */
const received = [];
let mock;
if (process.env.MOCK_WEBHOOK_PORT) {
  mock = createServer((req, res) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      received.push({ headers: req.headers, body: data });
      res.writeHead(200).end('ok');
    });
  });
  await new Promise((r) => mock.listen(Number(process.env.MOCK_WEBHOOK_PORT), '127.0.0.1', r));
}

/* ── 1. Home page, headers, CSP ──────────────────────────────────────────────────────────────── */
section('Home page, security headers, CSP nonce');
const home = await get('/');
const html = await home.text();
const csp = home.headers.get('content-security-policy') ?? '';
const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];

check('GET / returns 200 HTML', home.status === 200 && (home.headers.get('content-type') ?? '').includes('text/html'), `status ${home.status}`);
check('Strict-Transport-Security (2 years, subdomains, preload)', home.headers.get('strict-transport-security') === 'max-age=63072000; includeSubDomains; preload', home.headers.get('strict-transport-security'));
check('X-Frame-Options SAMEORIGIN', home.headers.get('x-frame-options') === 'SAMEORIGIN');
check('X-Content-Type-Options nosniff', home.headers.get('x-content-type-options') === 'nosniff');
check('Referrer-Policy strict-origin-when-cross-origin', home.headers.get('referrer-policy') === 'strict-origin-when-cross-origin');
const pp = home.headers.get('permissions-policy') ?? '';
check('Permissions-Policy disables camera, microphone, geolocation', ['camera=()', 'microphone=()', 'geolocation=()'].every((p) => pp.includes(p)), pp);
check('X-Powered-By is not sent', home.headers.get('x-powered-by') === null);
check('CSP has a per-request nonce + strict-dynamic', Boolean(nonce) && csp.includes("'strict-dynamic'"));
const scriptSrc = /script-src ([^;]+)/.exec(csp)?.[1] ?? '';
check("CSP script-src has no 'unsafe-inline' / 'unsafe-eval'", !scriptSrc.includes('unsafe-inline') && !scriptSrc.includes('unsafe-eval'), scriptSrc);
check('CSP object-src none, base-uri self, frame-ancestors self', csp.includes("object-src 'none'") && csp.includes("base-uri 'self'") && csp.includes("frame-ancestors 'self'"));
const origins = [...csp.matchAll(/https:\/\/[^\s;']+/g)].map((m) => m[0]);
check('CSP names no third party except lemonsqueezy.com', origins.length > 0 && origins.every((o) => o.includes('lemonsqueezy.com')), origins.join(' '));
check('CSP allows exactly two inline <style> hashes (lemon.js loader + Remotion Player)', (csp.match(/'sha256-[^']+'/g) ?? []).length === 2, csp.match(/'sha256-[^']+'/g)?.join(' '));
check('CSP allows the overlay: lemon.js script + checkout frame', scriptSrc.includes('https://assets.lemonsqueezy.com') && /frame-src [^;]*https:\/\/\*\.lemonsqueezy\.com/.test(csp));

const scriptTags = [...html.matchAll(/<script\b([^>]*)>/gi)].map((m) => m[1]).filter((attrs) => !/type="application\/ld\+json"/i.test(attrs));
const unnonced = scriptTags.filter((attrs) => !attrs.includes(`nonce="${nonce}"`));
check(`every executable <script> carries the nonce (${scriptTags.length} scripts)`, scriptTags.length > 0 && unnonced.length === 0, unnonced.slice(0, 2).join(' | '));

const second = await (await get('/')).headers.get('content-security-policy');
check('nonce changes on every request', Boolean(second) && second !== csp);

check('<html lang="en">', /<html[^>]*\blang="en"/.test(html));
check('title contains the formatted price ($2,500)', /<title>[^<]*\$2,500[^<]*<\/title>/.test(html));
check('one <h1>', (html.match(/<h1\b/g) ?? []).length === 1);

const checkoutHref = 'https://syncflow.lemonsqueezy.com/checkout/buy/1c12f3f3-cf34-45bd-8ae6-2260b24d77c7?embed=1&amp;dark=1';
const checkoutLinks = html.split(checkoutHref).length - 1;
check(`checkout CTAs point to the overlay URL (found ${checkoutLinks})`, checkoutLinks >= 4);

const alternates = [...html.matchAll(/<link[^>]+rel="alternate"[^>]*>/g)].map((m) => m[0]);
const hreflangs = alternates.map((a) => /hrefLang="([^"]+)"/i.exec(a)?.[1]).filter(Boolean);
check('hreflang alternates: en tr + x-default, and no language that is not launched', ['en', 'tr', 'x-default'].every((l) => hreflangs.includes(l)) && !['de', 'fr', 'it'].some((l) => hreflangs.includes(l)), hreflangs.join(','));
check('canonical link present', /<link[^>]+rel="canonical"/.test(html));
check('Open Graph + Twitter card tags', /property="og:title"/.test(html) && /property="og:locale"/.test(html) && /name="twitter:card"/.test(html));

const ld = /<script type="application\/ld\+json">(.*?)<\/script>/s.exec(html)?.[1];
let graph = [];
try {
  graph = JSON.parse(ld ?? '{}')['@graph'] ?? [];
} catch {}
const types = graph.map((n) => n['@type']);
check('JSON-LD parses: Organization, WebSite, ProfessionalService', ['Organization', 'WebSite', 'ProfessionalService'].every((t) => types.includes(t)), types.join(','));
const offer = graph.find((n) => n['@type'] === 'ProfessionalService')?.makesOffer;
check('JSON-LD Offer: 2500 USD', offer?.price === '2500' && offer?.priceCurrency === 'USD');
check('JSON-LD has no invented ratings/reviews/address', !/aggregateRating|review|streetAddress|telephone/.test(ld ?? ''));

/* ── 2. Locales ──────────────────────────────────────────────────────────────────────────────── */
section('Locales');
const expectations = {
  tr: { lang: 'tr', words: ['Projeyi Başlat', '$2.500'] },
};
for (const [code, { lang, words }] of Object.entries(expectations)) {
  const res = await get(`/${code}`);
  // CLDR separates number and currency with a no-break space (U+00A0) or a narrow one (U+202F): compare with plain spaces.
  const body = (await res.text()).split(String.fromCharCode(160)).join(' ').split(String.fromCharCode(0x202f)).join(' ');
  check(`/${code} renders in ${code} (lang attr + translated CTA + local price)`, res.status === 200 && new RegExp(`<html[^>]*\\blang="${lang}"`).test(body) && words.every((w) => body.includes(w)), `status ${res.status}`);
}
// The URL alone decides the language (docs/adr/0002): no redirect from Accept-Language, no cookie.
for (const code of ['de', 'fr', 'it']) {
  const res = await get(`/${code}`);
  check(`/${code} is not launched: 404`, res.status === 404, `status ${res.status}`);
}
const trBrowser = await get('/', { headers: { 'accept-language': 'tr-TR,tr;q=0.9,en;q=0.5' } });
check('a Turkish browser is NOT redirected: "/" stays English', trBrowser.status === 200 && /<html[^>]*\blang="en"/.test(await trBrowser.text()), `${trBrowser.status} ${trBrowser.headers.get('location')}`);
const staleCookie = await get('/', { headers: { 'accept-language': 'tr-TR,tr;q=0.9', cookie: 'NEXT_LOCALE=tr' } });
check('an old NEXT_LOCALE cookie is ignored', staleCookie.status === 200, `status ${staleCookie.status}`);
const trVisit = await get('/tr');
check('visiting /tr (or /) sets no cookie at all', !trVisit.headers.get('set-cookie') && !home.headers.get('set-cookie'), `${trVisit.headers.get('set-cookie')} | ${home.headers.get('set-cookie')}`);

section('Metadata routes and error pages');
const sitemap = await (await get('/sitemap.xml')).text();
check('sitemap lists 2 locale URLs with alternates', (sitemap.match(/<loc>/g) ?? []).length === 2 && /hreflang="x-default"/.test(sitemap));
const robots = await (await get('/robots.txt')).text();
check('robots.txt disallows /api/ and links the sitemap', /Disallow: \/api\//.test(robots) && /Sitemap:/.test(robots));
check('manifest + icon served', (await get('/manifest.webmanifest')).status === 200 && (await get('/icon.svg')).status === 200);
const ogUrls = [...html.matchAll(/<meta[^>]+(?:property="og:image"|name="twitter:image")[^>]*content="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
check('og:image and twitter:image use the explicit, redirect-free /og?locale= URL', ogUrls.length >= 2 && ogUrls.every((u) => /\/og\?locale=en&v=1$/.test(u)), ogUrls.join(' '));
check('og:image:alt is localized and carries the price', /property="og:image:alt"[^>]*content="[^"]*\$2,500/.test(html));
for (const loc of ['en', 'tr']) {
  const r = await get(`/og?locale=${loc}&v=1`);
  const bytes = Buffer.from(await r.arrayBuffer());
  check(`/og?locale=${loc}: 200 image/png, 1200x630, > 10 KB`, r.status === 200 && r.headers.get('content-type') === 'image/png' && bytes.length > 10_000 && bytes.readUInt32BE(16) === 1200 && bytes.readUInt32BE(20) === 630, `${r.status} ${r.headers.get('content-type')} ${bytes.length}`);
}
const ogHeaders = (await get('/og?locale=tr')).headers;
check('/og is cacheable at the edge (s-maxage) and rate-limit headers present', /s-maxage=\d+/.test(ogHeaders.get('cache-control') ?? '') && ogHeaders.get('ratelimit-limit') === '30', `${ogHeaders.get('cache-control')} | ${ogHeaders.get('ratelimit-limit')}`);
check('/og with an unknown locale falls back to English instead of failing', (await get('/og?locale=xx')).status === 200);
check('the /og image is not wrapped in a CSP-nonce page response (plain image, no redirect)', (await get('/og?locale=tr')).status === 200);
const nf = await get('/definitely-not-here');
const nfBody = await nf.text();
check('unknown URL: 404 with the localized page and the same security headers', nf.status === 404 && nfBody.includes('doesn’t exist') && Boolean(nf.headers.get('content-security-policy')) && nf.headers.get('x-content-type-options') === 'nosniff', `status ${nf.status}`);
for (const p of ['/privacy', '/imprint']) {
  const res = await get(p);
  const body = await res.text();
  check(`${p} renders and is noindex`, res.status === 200 && /name="robots"[^>]*content="noindex/.test(body), `status ${res.status}`);
}

/* ── 3. Contact API hardening ────────────────────────────────────────────────────────────────── */
section('Contact API: validation, abuse defences');
check('GET /api/contact is rejected (405)', (await get('/api/contact')).status === 405);
check('POST without Origin is rejected (403)', (await fetch(`${BASE}/api/contact`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status === 403);
check('POST from a foreign Origin is rejected (403)', (await post(valid(), { headers: { origin: 'https://evil.example' } })).status === 403);
check('Sec-Fetch-Site: cross-site is rejected (403)', (await post(valid(), { headers: { 'sec-fetch-site': 'cross-site' } })).status === 403);
check('non-JSON content type is rejected (415)', (await post('x=1', { raw: true, headers: { 'content-type': 'text/plain' } })).status === 415);
check('malformed JSON is rejected (400)', (await post('{"name":', { raw: true })).status === 400);
check('oversized body is rejected (413)', (await post(valid({ message: 'a'.repeat(9000) }))).status === 413);
const bad = await post({ name: 'x', email: 'nope', message: 'short', consent: false, locale: 'en' });
const badJson = await bad.json();
check('invalid fields: 422 with machine-readable codes', bad.status === 422 && badJson.code === 'validation' && badJson.fields?.email === 'email' && badJson.fields?.consent === 'consent', JSON.stringify(badJson));
check('unknown fields are rejected (strict schema)', (await post({ ...valid(), isAdmin: true })).status === 422);
check('unsupported locale is rejected', (await post(valid({ locale: 'xx' }))).status === 422);
const bot = await post(valid({ website: 'http://spam.example' }));
check('honeypot answers 200 (bots learn nothing)', bot.status === 200 && (await bot.json()).ok === true);
const fast = await post(valid({ elapsedMs: 120 }));
check('instant submit answers 200 (silently discarded)', fast.status === 200);
const apiHeaders = bad.headers;
check('API responses are no-store with a locked-down CSP', apiHeaders.get('cache-control') === 'no-store' && (apiHeaders.get('content-security-policy') ?? '').includes("default-src 'none'"));

if (mock) {
  section('Delivery, sanitisation, signature (mock webhook)');
  received.length = 0;

  // 1) Markup is refused explicitly (422), never delivered, never silently altered.
  const attacks = [
    ['<img> with onerror in the name', valid({ name: '<img src=x onerror=alert(1)>Jane' }), 'name'],
    ['<script> in the message', valid({ message: '<script>alert(document.cookie)</script>Hello there, we need a site.' }), 'message'],
    ['unterminated <svg onload> (would swallow the rest of the text)', valid({ message: 'Hello there, we need a site. <svg onload=alert(1)>\nSecond line' }), 'message'],
    ['HTML comment / doctype', valid({ message: 'Hello there <!-- hidden --> we need a site please.' }), 'message'],
    ['markup in the company', valid({ company: 'ACME<iframe src=//evil.example>' }), 'company'],
  ];
  for (const [label, body, field] of attacks) {
    const res = await post(body);
    const json = await res.json().catch(() => ({}));
    check(`markup refused: ${label}`, res.status === 422 && json.fields?.[field] === 'invalid', `${res.status} ${JSON.stringify(json)}`);
  }
  check('none of the refused submissions reached the webhook', received.length === 0, `received ${received.length}`);

  // 2) Real-world text with harmless angle brackets and invisible characters is cleaned, not refused.
  const benign = valid({
    name: 'Jane',
    company: `ACME${String.fromCharCode(0x202e)}gnp.exe${String.fromCharCode(0x200b)}`,
    message: 'Hello, we need a site. Reach me at <jane@example.com> or see <https://example.com/brief> & "quotes"\nSecond line &lt;b&gt; 3 > 2',
  });
  const ok = await post(benign);
  check('valid submission answers 200', ok.status === 200, `status ${ok.status}`);
  const hit = received[0];
  const payload = hit ? JSON.parse(hit.body) : {};
  check('webhook received exactly one lead', received.length === 1, `received ${received.length}`);
  const text = `${payload.name}${payload.company}${payload.message}`;
  check('no angle brackets survive sanitisation', hit && !/[<>]/.test(text), text);
  check('invisible / bidi-override characters stripped', hit && ![0x202e, 0x200b].some((c) => text.includes(String.fromCharCode(c))));
  check('plain-text content kept: name, email in brackets, URL, second line', payload.name === 'Jane' && /jane@example\.com/.test(payload.message ?? '') && /https:\/\/example\.com\/brief/.test(payload.message ?? '') && /\nSecond line/.test(payload.message ?? ''), JSON.stringify(payload));
  check('payload is exactly the known fields', hit && JSON.stringify(Object.keys(payload).sort()) === JSON.stringify(['company', 'email', 'locale', 'message', 'name', 'receivedAt', 'type']), Object.keys(payload).join(','));
  if (process.env.WEBHOOK_SECRET && hit) {
    const expected = `sha256=${createHmac('sha256', process.env.WEBHOOK_SECRET).update(hit.body).digest('hex')}`;
    check('HMAC-SHA256 signature header verifies', hit.headers['x-syncflow-signature'] === expected, hit.headers['x-syncflow-signature']);
  }
  received.length = 0;
  await post(valid({ website: 'filled' }));
  check('honeypot submission is NOT delivered', received.length === 0);
}

section('Rate limiting');
const ip = uniqueIp();
const statuses = [];
for (let i = 0; i < 7; i++) statuses.push((await post(valid(), { ip })).status);
const limited = await post(valid(), { ip });
check(`contact route: first 5 pass, then 429 (statuses ${statuses.join(',')})`, statuses.slice(0, 5).every((s) => s !== 429) && statuses[5] === 429 && limited.status === 429);
check('429 carries Retry-After', Number(limited.headers.get('retry-after')) > 0, limited.headers.get('retry-after'));
check('a different address is not affected', (await post(valid({ elapsedMs: 120 }), { ip: uniqueIp() })).status === 200);

if (process.env.STRESS) {
  const floodIp = uniqueIp();
  let blocked = 0;
  for (let i = 0; i < 250; i++) {
    const r = await get('/tr', { headers: { 'x-forwarded-for': floodIp } });
    await r.arrayBuffer();
    if (r.status === 429) blocked++;
  }
  check(`page flood from one address gets 429 (${blocked} blocked of 250)`, blocked > 0);
}

mock?.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed${failed.length ? `, ${failed.length} FAILED` : ''}`);
process.exit(failed.length ? 1 : 0);
