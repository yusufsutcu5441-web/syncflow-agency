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
 *   TURNSTILE_MODE      how the server under test is configured (default "pass"):
 *                         pass   TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA (Cloudflare's always-pass test
 *                                secret): a missing token is refused, any token passes. Needs internet access.
 *                         off    no TURNSTILE_SECRET_KEY in development: the check is skipped.
 *                         unset  no TURNSTILE_SECRET_KEY in production: the form must answer 503.
 *   EXPECT_LOCALES      languages that must be public (default "en,tr", in every environment; "en,tr,de,fr,es,ar,ja" only
 *                       with NEXT_PUBLIC_PREVIEW_LOCALES=1). Every other language must answer 404.
 *   EXPECT_CSP_MODE     "enforce" to expect the enforcing CSP header instead of report-only.
 *   STRESS=1            also fire 250 page requests from one address to prove the page-level limiter.
 */
import { createHmac } from 'node:crypto';
import { createServer } from 'node:http';

const BASE = (process.argv[2] ?? process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const ORIGIN = new URL(BASE).origin;
const ALL_LOCALES = ['en', 'tr', 'de', 'fr', 'es', 'ar', 'ja'];
const OPEN = (process.env.EXPECT_LOCALES ?? 'en,tr').split(',').map((s) => s.trim()).filter(Boolean);
const CLOSED = ALL_LOCALES.filter((l) => !OPEN.includes(l));
const TURNSTILE_MODE = process.env.TURNSTILE_MODE ?? 'pass';
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
  fetch(`${BASE}/api/briefing`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: ORIGIN, 'x-forwarded-for': ip, ...headers },
    body: raw ? body : JSON.stringify(body),
  });

const valid = (over = {}) => ({
  projectType: 'showcase',
  budget: 'b10',
  timeline: 'w6',
  name: 'Jane Doe',
  company: 'Acme Holding, Chief Marketing Officer',
  email: 'jane@example.com',
  message: 'A cinematic site for our flagship residences.',
  role: 'decider',
  consent: true,
  locale: 'en',
  website: '',
  turnstileToken: TURNSTILE_MODE === 'pass' ? 'XXXX.DUMMY.TOKEN.XXXX' : undefined,
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
      // Test hooks for the retry rule (lib/server/deliver.ts): a company named FAILONCE answers 503 to the first try of a delivery
      // and 200 to the second; ALWAYSFAIL answers 503 to everything.
      let status = 200;
      try {
        const lead = JSON.parse(data);
        const tries = received.filter((r) => r.headers['idempotency-key'] === req.headers['idempotency-key']).length;
        if (/ALWAYSFAIL/.test(lead.company ?? '')) status = 503;
        else if (/FAILONCE/.test(lead.company ?? '') && tries === 1) status = 503;
      } catch {
        // not JSON: answer 200 like before
      }
      res.writeHead(status).end(status === 200 ? 'ok' : 'unavailable');
    });
  });
  await new Promise((r) => mock.listen(Number(process.env.MOCK_WEBHOOK_PORT), '127.0.0.1', r));
}

/* ── 1. Home page, headers, CSP ──────────────────────────────────────────────────────────────── */
section('Home page, security headers, CSP nonce');
const home = await get('/');
const html = await home.text();
// docs/adr/0001-csp-report-only.md: the policy is delivered as Content-Security-Policy-Report-Only until Faz 7.
const expectEnforce = process.env.EXPECT_CSP_MODE === 'enforce';
const cspHeader = expectEnforce ? 'content-security-policy' : 'content-security-policy-report-only';
const otherCspHeader = expectEnforce ? 'content-security-policy-report-only' : 'content-security-policy';
const csp = home.headers.get(cspHeader) ?? '';
const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];

check('GET / returns 200 HTML', home.status === 200 && (home.headers.get('content-type') ?? '').includes('text/html'), `status ${home.status}`);
check('Strict-Transport-Security (2 years, subdomains, preload)', home.headers.get('strict-transport-security') === 'max-age=63072000; includeSubDomains; preload', home.headers.get('strict-transport-security'));
check('X-Frame-Options SAMEORIGIN', home.headers.get('x-frame-options') === 'SAMEORIGIN');
check('X-Content-Type-Options nosniff', home.headers.get('x-content-type-options') === 'nosniff');
check('Referrer-Policy strict-origin-when-cross-origin', home.headers.get('referrer-policy') === 'strict-origin-when-cross-origin');
const pp = home.headers.get('permissions-policy') ?? '';
check('Permissions-Policy disables camera, microphone, geolocation', ['camera=()', 'microphone=()', 'geolocation=()'].every((p) => pp.includes(p)), pp);
check('X-Powered-By is not sent', home.headers.get('x-powered-by') === null);
check(`CSP is delivered as ${cspHeader}, and not as ${otherCspHeader}`, csp !== '' && home.headers.get(otherCspHeader) === null, `${cspHeader}: ${csp ? 'present' : 'missing'}, ${otherCspHeader}: ${home.headers.get(otherCspHeader) ? 'present' : 'absent'}`);
check('CSP reports violations to /api/csp-report', csp.includes('report-uri /api/csp-report'));
check('upgrade-insecure-requests is only sent when enforcing (browsers ignore it in report-only)', expectEnforce || !csp.includes('upgrade-insecure-requests'));
check('CSP has a per-request nonce + strict-dynamic', Boolean(nonce) && csp.includes("'strict-dynamic'"));
const scriptSrc = /script-src ([^;]+)/.exec(csp)?.[1] ?? '';
// A development server needs 'unsafe-eval' for hot reloading; the production policy must not have it.
const devServer = scriptSrc.includes('unsafe-eval');
check("CSP script-src has no 'unsafe-inline' (and no 'unsafe-eval' in production)", !scriptSrc.includes('unsafe-inline') && (devServer || !scriptSrc.includes('unsafe-eval')), scriptSrc);
check('CSP object-src none, base-uri self, frame-ancestors self', csp.includes("object-src 'none'") && csp.includes("base-uri 'self'") && csp.includes("frame-ancestors 'self'"));
const origins = [...csp.matchAll(/https:\/\/[^\s;']+/g)].map((m) => m[0]);
check('CSP names no third party except challenges.cloudflare.com (Turnstile)', origins.length > 0 && origins.every((o) => o === 'https://challenges.cloudflare.com'), origins.join(' '));
check('CSP allows no inline <style> hash (Lemon Squeezy is gone)', (csp.match(/'sha256-[^']+'/g) ?? []).length === 0, csp.match(/'sha256-[^']+'/g)?.join(' '));
check('CSP allows the Turnstile script and challenge frame', scriptSrc.includes('https://challenges.cloudflare.com') && /frame-src [^;]*https:\/\/challenges\.cloudflare\.com/.test(csp));

const scriptTags = [...html.matchAll(/<script\b([^>]*)>/gi)].map((m) => m[1]).filter((attrs) => !/type="application\/ld\+json"/i.test(attrs));
const unnonced = scriptTags.filter((attrs) => !attrs.includes(`nonce="${nonce}"`));
check(`every executable <script> carries the nonce (${scriptTags.length} scripts)`, scriptTags.length > 0 && unnonced.length === 0, unnonced.slice(0, 2).join(' | '));

const second = await (await get('/')).headers.get(cspHeader);
check('nonce changes on every request', Boolean(second) && second !== csp);

check('<html lang="en" dir="ltr">', /<html[^>]*\blang="en"/.test(html) && /<html[^>]*\bdir="ltr"/.test(html));
check('title is the studio title (no price)', /<title>syncflow\.agency \| Digital architecture studio<\/title>/.test(html));
check('one <h1> with the two hero lines', (html.match(/<h1\b/g) ?? []).length === 1 && html.includes('Built in the dark.') && html.includes('Moves like liquid.'));
check('the three sections are there (architecture, showcase, briefing) and the language section is gone', ['architecture', 'showcase', 'briefing'].every((id) => new RegExp(`<section[^>]*id="${id}"`).test(html)) && !/<section[^>]*id="reach"/.test(html));
check('the showcase has exactly the three sectors (real estate, clinics, corporate law) and no SaaS', ['show-estate', 'show-clinic', 'show-law'].every((id) => html.includes(`id="${id}"`)) && !/show-saas|SaaS/.test(html));
check('the page makes no multi-language claim', !/seven languages|7 languages|every language|yedi dil|her dilde/i.test(html));
check('no Lemon Squeezy and no old offer anywhere in the page', !/lemonsqueezy|lemon\.js|\$2,500|\$2\.500|Start Project/i.test(html));
check('the briefing panel is there and opts out of smooth scrolling (data-lenis-prevent)', /<form[^>]*data-lenis-prevent/.test(html));
check('the contact address is published (mailto contact@syncflow.agency)', /href="mailto:contact@syncflow\.agency"/.test(html));
check('no unverified claim in the HTML (locked 60 FPS, 120Hz, LCP < 1.2s, AV1, example percentages)', !/locked 60|60 FPS|120\s?Hz|LCP\s*&lt;|LCP\s*<|\bAV1\b|\+212|adaptive bitrate/i.test(html));

const alternates = [...html.matchAll(/<link[^>]+rel="alternate"[^>]*>/g)].map((m) => m[0]);
const hreflangs = alternates.map((a) => /hrefLang="([^"]+)"/i.exec(a)?.[1]).filter(Boolean);
check(`hreflang alternates: ${OPEN.join(' ')} + x-default, and no language that is not public`, [...OPEN, 'x-default'].every((l) => hreflangs.includes(l)) && !CLOSED.some((l) => hreflangs.includes(l)), hreflangs.join(','));
check('canonical link present', /<link[^>]+rel="canonical"/.test(html));
check('Open Graph + Twitter card tags', /property="og:title"/.test(html) && /property="og:locale"/.test(html) && /name="twitter:card"/.test(html));

const ld = /<script type="application\/ld\+json">(.*?)<\/script>/s.exec(html)?.[1];
let graph = [];
try {
  graph = JSON.parse(ld ?? '{}')['@graph'] ?? [];
} catch {}
const types = graph.map((n) => n['@type']);
check('JSON-LD parses: Organization, WebSite, ProfessionalService', ['Organization', 'WebSite', 'ProfessionalService'].every((t) => types.includes(t)), types.join(','));
check('JSON-LD has no offer, price, ratings, reviews or address', !/makesOffer|"price"|aggregateRating|review|streetAddress|telephone/.test(ld ?? ''));
const siteLangs = graph.find((n) => n['@type'] === 'WebSite')?.inLanguage ?? [];
check('JSON-LD lists only the public languages', JSON.stringify([...siteLangs].sort()) === JSON.stringify([...OPEN].sort()), siteLangs.join(','));

/* ── 2. Locales ──────────────────────────────────────────────────────────────────────────────── */
section('Locales');
const MARKERS = {
  tr: ['Karanlıkta inşa edilir.', 'Briefing Başlat'],
  de: ['Im Dunkeln gebaut.'],
  fr: ['Bâti dans l’obscurité.'],
  es: ['Construido en la oscuridad.'],
  ar: ['في الظلام', 'ويتحرّك كالسائل'],
  ja: ['闇の中で築く。', '液体のように動く。'],
};
for (const code of OPEN.filter((l) => l !== 'en')) {
  const res = await get(`/${code}`);
  const body = await res.text();
  const dir = code === 'ar' ? 'rtl' : 'ltr';
  check(`/${code} renders in ${code} (lang attr, dir="${dir}", translated hero)`, res.status === 200 && new RegExp(`<html[^>]*\\blang="${code}"`).test(body) && new RegExp(`<html[^>]*\\bdir="${dir}"`).test(body) && (MARKERS[code] ?? []).every((w) => body.includes(w)), `status ${res.status}`);
}
// The URL alone decides the language (docs/adr/0002): no redirect from Accept-Language, no cookie.
for (const code of [...CLOSED, 'it', 'pt']) {
  const res = await get(`/${code}`);
  check(`/${code} is not public: 404`, res.status === 404, `status ${res.status}`);
}
const trBrowser = await get('/', { headers: { 'accept-language': 'tr-TR,tr;q=0.9,en;q=0.5' } });
check('a Turkish browser is NOT redirected: "/" stays English', trBrowser.status === 200 && /<html[^>]*\blang="en"/.test(await trBrowser.text()), `${trBrowser.status} ${trBrowser.headers.get('location')}`);
const staleCookie = await get('/', { headers: { 'accept-language': 'tr-TR,tr;q=0.9', cookie: 'NEXT_LOCALE=tr' } });
check('an old NEXT_LOCALE cookie is ignored', staleCookie.status === 200, `status ${staleCookie.status}`);
const trVisit = await get('/tr');
check('visiting /tr (or /) sets no cookie at all', !trVisit.headers.get('set-cookie') && !home.headers.get('set-cookie'), `${trVisit.headers.get('set-cookie')} | ${home.headers.get('set-cookie')}`);
check('no Link: rel="alternate" header advertises a language that is not public', !CLOSED.some((l) => (home.headers.get('link') ?? '').includes(`hreflang="${l}"`)), home.headers.get('link') ?? '');
if (OPEN.includes('de')) {
  const legal = await get('/de/privacy');
  const body = await legal.text();
  check('draft languages show the legal text in English, marked as such', legal.status === 200 && /lang="en"/.test(body) && /Who is responsible/.test(body), `status ${legal.status}`);
}

section('security.txt (RFC 9116)');
{
  const res = await get('/.well-known/security.txt');
  const text = await res.text();
  const expires = /^Expires:\s*(\S+)/m.exec(text)?.[1];
  const days = expires ? (new Date(expires).getTime() - Date.now()) / 86_400_000 : NaN;
  check('/.well-known/security.txt is plain text with Contact, Expires and Canonical', res.status === 200 && (res.headers.get('content-type') ?? '').startsWith('text/plain') && /^Contact:\s*mailto:contact@syncflow\.agency$/m.test(text) && /^Canonical:\s*https:\/\/syncflow\.agency\/\.well-known\/security\.txt$/m.test(text), `status ${res.status}`);
  check('security.txt expires in the future, within a year (RFC 9116: renew before it lapses)', days > 0 && days <= 366, `${expires} (${Math.round(days)} days)`);
}

section('Metadata routes and error pages');
const sitemap = await (await get('/sitemap.xml')).text();
check(`sitemap lists ${OPEN.length} locale URLs with alternates (and no closed language)`, (sitemap.match(/<loc>/g) ?? []).length === OPEN.length && /hreflang="x-default"/.test(sitemap) && !CLOSED.some((l) => new RegExp(`hreflang="${l}"`).test(sitemap)));
const robots = await (await get('/robots.txt')).text();
check('robots.txt disallows /api/ and links the sitemap', /Disallow: \/api\//.test(robots) && /Sitemap:/.test(robots));
check('manifest + icon served', (await get('/manifest.webmanifest')).status === 200 && (await get('/icon.svg')).status === 200);
const ogUrls = [...html.matchAll(/<meta[^>]+(?:property="og:image"|name="twitter:image")[^>]*content="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
check('og:image and twitter:image use the explicit, redirect-free /og?locale= URL', ogUrls.length >= 2 && ogUrls.every((u) => /\/og\?locale=en&v=3$/.test(u)), ogUrls.join(' '));
check('og:image:alt is localized', /property="og:image:alt"[^>]*content="syncflow\.agency: Built in the dark\. Moves like liquid\./.test(html));
for (const loc of OPEN) {
  const r = await get(`/og?locale=${loc}&v=3`);
  const bytes = Buffer.from(await r.arrayBuffer());
  check(`/og?locale=${loc}: 200 image/png, 1200x630, > 10 KB`, r.status === 200 && r.headers.get('content-type') === 'image/png' && bytes.length > 10_000 && bytes.readUInt32BE(16) === 1200 && bytes.readUInt32BE(20) === 630, `${r.status} ${r.headers.get('content-type')} ${bytes.length}`);
}
const ogHeaders = (await get('/og?locale=tr')).headers;
check('/og is cacheable at the edge (s-maxage) and rate-limit headers present', /s-maxage=\d+/.test(ogHeaders.get('cache-control') ?? '') && ogHeaders.get('ratelimit-limit') === '30', `${ogHeaders.get('cache-control')} | ${ogHeaders.get('ratelimit-limit')}`);
check('/og with an unknown locale falls back to English instead of failing', (await get('/og?locale=xx')).status === 200);
const nf = await get('/definitely-not-here');
const nfBody = await nf.text();
check('unknown URL: 404 with the localized page and the same security headers', nf.status === 404 && nfBody.includes('doesn’t exist') && Boolean(nf.headers.get(cspHeader)) && nf.headers.get('x-content-type-options') === 'nosniff', `status ${nf.status}`);
for (const p of ['/privacy', '/imprint']) {
  const res = await get(p);
  const body = await res.text();
  check(`${p} renders and is noindex`, res.status === 200 && /name="robots"[^>]*content="noindex/.test(body), `status ${res.status}`);
}
check('the old contact endpoint is gone (404)', (await get('/api/contact')).status === 404);

/* ── 3. Briefing API hardening ───────────────────────────────────────────────────────────────── */
section('Briefing API: validation, abuse defences');
check('GET /api/briefing is rejected (405)', (await get('/api/briefing')).status === 405);
check('POST without Origin is rejected (403)', (await fetch(`${BASE}/api/briefing`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status === 403);
check('POST from a foreign Origin is rejected (403)', (await post(valid(), { headers: { origin: 'https://evil.example' } })).status === 403);
check('Sec-Fetch-Site: cross-site is rejected (403)', (await post(valid(), { headers: { 'sec-fetch-site': 'cross-site' } })).status === 403);
check('non-JSON content type is rejected (415)', (await post('x=1', { raw: true, headers: { 'content-type': 'text/plain' } })).status === 415);
check('malformed JSON is rejected (400)', (await post('{"name":', { raw: true })).status === 400);
check('oversized body is rejected (413)', (await post(valid({ message: 'a'.repeat(9000) }))).status === 413);
const bad = await post(valid({ name: 'x', company: '', email: 'nope', role: undefined, consent: false }));
const badJson = await bad.json();
check('invalid fields: 422 with machine-readable codes', bad.status === 422 && badJson.code === 'validation' && badJson.fields?.email === 'email' && badJson.fields?.consent === 'consent' && badJson.fields?.company === 'required' && badJson.fields?.role === 'required', JSON.stringify(badJson));
check('an unknown answer option is rejected (422)', (await post(valid({ budget: 'free' }))).status === 422);
check('unknown fields are rejected (strict schema)', (await post({ ...valid(), isAdmin: true })).status === 422);
check('unsupported locale is rejected', (await post(valid({ locale: 'xx' }))).status === 422);
check('a message over 300 characters is rejected (422)', (await post(valid({ message: 'a'.repeat(301) }))).status === 422);
const bot = await post(valid({ website: 'http://spam.example' }));
check('honeypot answers 200 (bots learn nothing)', bot.status === 200 && (await bot.json()).ok === true);
const fast = await post(valid({ elapsedMs: 120 }));
check('instant submit answers 200 (silently discarded)', fast.status === 200);
const apiHeaders = bad.headers;
check('API responses are no-store with a locked-down CSP', apiHeaders.get('cache-control') === 'no-store' && (apiHeaders.get('content-security-policy') ?? '').includes("default-src 'none'"));

section(`Turnstile (mode: ${TURNSTILE_MODE})`);
if (TURNSTILE_MODE === 'pass') {
  const noToken = await post(valid({ turnstileToken: undefined }));
  const noTokenJson = await noToken.json();
  check('a briefing without a Turnstile token is refused (400 verification)', noToken.status === 400 && noTokenJson.code === 'verification', JSON.stringify(noTokenJson));
} else if (TURNSTILE_MODE === 'unset') {
  const res = await post(valid());
  check('production without TURNSTILE_SECRET_KEY refuses the form (503)', res.status === 503, `status ${res.status}`);
} else {
  check('development without TURNSTILE_SECRET_KEY skips the check (no token needed)', (await post(valid({ elapsedMs: 120 }))).status === 200);
}

if (mock && TURNSTILE_MODE !== 'unset') {
  section('Delivery, sanitisation, classification, signature (mock webhook)');
  received.length = 0;

  // 1) Markup is refused explicitly (422), never delivered, never silently altered.
  const attacks = [
    ['<img> with onerror in the name', valid({ name: '<img src=x onerror=alert(1)>Jane' }), 'name'],
    ['<script> in the one-sentence description', valid({ message: '<script>alert(document.cookie)</script>Hello' }), 'message'],
    ['unterminated <svg onload> (would swallow the rest of the text)', valid({ message: 'Hello there. <svg onload=alert(1)>\nSecond line' }), 'message'],
    ['HTML comment / doctype', valid({ message: 'Hello there <!-- hidden --> we need a site.' }), 'message'],
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
    company: `ACME${String.fromCharCode(0x202e)}gnp.exe${String.fromCharCode(0x200b)}, CMO`,
    message: 'Reach me at <jane@example.com> or see <https://example.com/brief> & "quotes"',
  });
  const ok = await post(benign);
  check('valid submission answers 200', ok.status === 200, `status ${ok.status}`);
  const hit = received[0];
  const payload = hit ? JSON.parse(hit.body) : {};
  check('webhook received exactly one briefing', received.length === 1, `received ${received.length}`);
  const text = `${payload.name}${payload.company}${payload.message}`;
  check('no angle brackets survive sanitisation', hit && !/[<>]/.test(text), text);
  check('invisible / bidi-override characters stripped', hit && ![0x202e, 0x200b].some((c) => text.includes(String.fromCharCode(c))));
  check('plain-text content kept: name, email in brackets, URL', payload.name === 'Jane' && /jane@example\.com/.test(payload.message ?? '') && /https:\/\/example\.com\/brief/.test(payload.message ?? ''), JSON.stringify(payload));
  const keys = ['budget', 'company', 'email', 'id', 'locale', 'message', 'name', 'projectType', 'receivedAt', 'role', 'subject', 'tier', 'timeline', 'type'];
  check('payload is exactly the known fields', hit && JSON.stringify(Object.keys(payload).sort()) === JSON.stringify(keys), Object.keys(payload).join(','));
  check('payload carries a random delivery id (UUID v4), repeated as the Idempotency-Key header', /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(payload.id ?? '') && hit.headers['idempotency-key'] === payload.id, `${payload.id} / ${hit?.headers['idempotency-key']}`);
  check('payload type is syncflow.briefing and the subject is "[Briefing][tier] company, name"', payload.type === 'syncflow.briefing' && payload.subject === `[Briefing][${payload.tier}] ${payload.company}, ${payload.name}`, payload.subject);
  if (process.env.WEBHOOK_SECRET && hit) {
    const expected = `sha256=${createHmac('sha256', process.env.WEBHOOK_SECRET).update(hit.body).digest('hex')}`;
    check('HMAC-SHA256 signature header verifies', hit.headers['x-syncflow-signature'] === expected, hit.headers['x-syncflow-signature']);
  }

  // 3) The priority class is computed on the server, from the answers, never from anything the browser claims.
  const tiers = [
    ['$20k+ with a decision maker -> high', { budget: 'b20', role: 'decider' }, 'high'],
    ['$20k+ with the decision team -> high', { budget: 'b20', role: 'team' }, 'high'],
    ['$20k+ but only exploring -> medium', { budget: 'b20', role: 'exploring' }, 'medium'],
    ['$10k-$20k -> medium', { budget: 'b10', role: 'decider' }, 'medium'],
    ['"let us talk first" -> medium', { budget: 'talk', role: 'decider' }, 'medium'],
    ['$5k-$10k (below the $10,000 floor) -> low', { budget: 'b5', role: 'decider' }, 'low'],
  ];
  for (const [label, over, want] of tiers) {
    received.length = 0;
    const res = await post(valid(over));
    const got = received[0] ? JSON.parse(received[0].body).tier : undefined;
    check(`tier: ${label}`, res.status === 200 && got === want, `status ${res.status}, tier ${got}`);
  }
  check('a tier sent by the browser is rejected (strict schema)', (await post({ ...valid(), tier: 'high' })).status === 422);

  received.length = 0;
  await post(valid({ website: 'filled' }));
  check('honeypot submission is NOT delivered', received.length === 0);

  // 4) Delivery retry (lib/server/deliver.ts): one more try after a transient failure, with the SAME delivery id, inside 10 s.
  received.length = 0;
  const once = await post(valid({ company: 'FAILONCE Ltd, Partner' }));
  const ids = received.map((r) => r.headers['idempotency-key']);
  check('a transient 503 from the receiver is retried once and the briefing is delivered (200)', once.status === 200 && received.length === 2, `status ${once.status}, receiver saw ${received.length} request(s)`);
  check('both attempts carry the same delivery id, so the receiver can drop the duplicate', ids.length === 2 && ids[0] === ids[1] && /^[0-9a-f-]{36}$/.test(ids[0] ?? ''), ids.join(' | '));
  received.length = 0;
  const t0 = Date.now();
  const never = await post(valid({ company: 'ALWAYSFAIL Ltd, Partner' }));
  const took = Date.now() - t0;
  check('a receiver that keeps failing: two attempts, the form hears 502, inside the 10 s budget', never.status === 502 && received.length === 2 && took < 10_000, `status ${never.status}, ${received.length} attempts, ${took} ms`);
}

section('Scene videos (docs/adr/0003, 0006)');
const mediaTypes = { mp4: 'video/mp4', webm: 'video/webm', webp: 'image/webp' };
let mediaOk = true;
let mediaDetail = '';
for (const name of ['monolith', 'estate', 'clinic', 'law']) {
  for (const [ext, type] of Object.entries(mediaTypes)) {
    const res = await get(`/media/clips/${name}.${ext}`, { headers: { range: 'bytes=0-0' } });
    const good = [200, 206].includes(res.status) && (res.headers.get('content-type') ?? '').startsWith(type);
    if (!good) {
      mediaOk = false;
      mediaDetail += `${name}.${ext}: ${res.status} ${res.headers.get('content-type')}; `;
    }
    await res.arrayBuffer();
  }
}
check('all 12 scene files are served with the right content type (4 scenes x mp4/webm/webp)', mediaOk, mediaDetail);
const ranged = await get('/media/clips/estate.mp4', { headers: { range: 'bytes=0-99' } });
check('the mp4 answers byte-range requests (preload="none" needs it)', ranged.status === 206 && /^bytes 0-99\//.test(ranged.headers.get('content-range') ?? '') && ranged.headers.get('accept-ranges') === 'bytes', `${ranged.status} ${ranged.headers.get('content-range')} ${ranged.headers.get('accept-ranges')}`);
await ranged.arrayBuffer();
const cached = (await get('/media/clips/estate.webp')).headers.get('cache-control') ?? '';
check('scene files are cacheable for a week with background revalidation', /max-age=604800/.test(cached) && /stale-while-revalidate/.test(cached), cached);
check('the old architecture film is gone (404)', (await get('/media/showcase/architecture-en-wide.mp4')).status === 404);

section('CSP report endpoint');
const violation = {
  'csp-report': {
    'document-uri': 'https://example.test/page?token=SECRET#frag',
    'violated-directive': 'script-src-elem',
    'effective-directive': 'script-src-elem',
    'blocked-uri': 'https://evil.example/x.js?k=1',
    disposition: 'report',
  },
};
const sendReport = (body, { type = 'application/csp-report', raw = false } = {}) =>
  fetch(`${BASE}/api/csp-report`, { method: 'POST', headers: { 'content-type': type, 'x-forwarded-for': uniqueIp() }, body: raw ? body : JSON.stringify(body) });
const accepted = await sendReport(violation);
check('a violation report is accepted: 204 and no body', accepted.status === 204 && (await accepted.text()) === '', `status ${accepted.status}`);
check('a report with a foreign content type is rejected (415)', (await sendReport('x', { type: 'text/plain', raw: true })).status === 415);
check('malformed report JSON is rejected (400)', (await sendReport('{"csp-report":', { raw: true })).status === 400);
check('an oversized report is rejected (413)', (await sendReport({ pad: 'a'.repeat(9000) })).status === 413);
check('GET /api/csp-report is rejected (405)', (await get('/api/csp-report')).status === 405);

section('Rate limiting');
const ip = uniqueIp();
const statuses = [];
for (let i = 0; i < 7; i++) statuses.push((await post(valid({ elapsedMs: 120 }), { ip })).status);
const limited = await post(valid({ elapsedMs: 120 }), { ip });
check(`briefing route: first 5 pass, then 429 (statuses ${statuses.join(',')})`, statuses.slice(0, 5).every((s) => s !== 429) && statuses[5] === 429 && limited.status === 429);
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
