#!/usr/bin/env node
/**
 * Live reachability check: what a visitor on the open internet gets from the production domain.
 * Read-only: DNS lookups, one TLS handshake, GET requests, and three POSTs that the briefing route must reject
 * (no Origin, foreign Origin, our Origin with an empty body). Nothing is sent that could reach the webhook or the mailbox.
 * The site rate-limits each address on purpose; a 429 is waited out when short and otherwise reported as a warning, never as a failure.
 *
 *   node scripts/live-check.mjs [https://syncflow.agency]
 *
 * Exit code 1 on any FAIL; WARN does not fail (for example a missing www record). Use it after every deployment:
 * a successful build says nothing about the runtime (docs/adr/0013-app-moved-into-syncflow-web.md).
 */
import { Resolver } from 'node:dns/promises';
import tls from 'node:tls';

const BASE = (process.argv[2] ?? 'https://syncflow.agency').replace(/\/$/, '');
const { hostname: HOST, origin: ORIGIN } = new URL(BASE);
const results = [];
const say = (level, name, detail = '') => {
  results.push(level);
  console.log(`  ${level.padEnd(4)}  ${name}${detail ? `  ${detail}` : ''}`);
};
const section = (title) => console.log(`\n${title}`);

/* ── DNS: three resolvers, so a local cache or a filtering resolver is visible ─────────────────── */
section('DNS');
const resolvers = { 'Google 8.8.8.8': ['8.8.8.8'], 'Cloudflare 1.1.1.1': ['1.1.1.1'], 'this machine': undefined };
const apexAnswers = new Set();
for (const [label, servers] of Object.entries(resolvers)) {
  const r = new Resolver();
  if (servers) r.setServers(servers);
  try {
    const a = await r.resolve4(HOST);
    a.forEach((ip) => apexAnswers.add(ip));
    say('PASS', `${HOST} A via ${label}`, a.join(', '));
  } catch (e) {
    say('FAIL', `${HOST} A via ${label}`, e.code ?? String(e));
  }
}
if (apexAnswers.size > 1) say('WARN', 'resolvers disagree on the A record', [...apexAnswers].join(' vs '));
const www = new Resolver();
www.setServers(['8.8.8.8']);
let wwwOk = false;
for (const type of ['resolve4', 'resolveCname']) {
  try {
    const v = await www[type](`www.${HOST}`);
    wwwOk = true;
    say('PASS', `www.${HOST} ${type === 'resolve4' ? 'A' : 'CNAME'}`, v.join(', '));
    break;
  } catch { /* try the next type */ }
}
if (!wwwOk) say('WARN', `www.${HOST} does not resolve`, 'visitors typing www get "server not found" (add a CNAME www -> cname.vercel-dns.com and the domain in Vercel)');

/* ── TLS ────────────────────────────────────────────────────────────────────────────────────────── */
section('TLS');
await new Promise((resolve) => {
  const socket = tls.connect({ host: HOST, port: 443, servername: HOST, timeout: 15000 }, () => {
    const cert = socket.getPeerCertificate();
    const days = Math.floor((new Date(cert.valid_to).getTime() - Date.now()) / 86_400_000);
    const names = (cert.subjectaltname ?? '').replace(/DNS:/g, '').split(', ').filter(Boolean);
    say(socket.authorized ? 'PASS' : 'FAIL', `certificate ${socket.authorized ? 'verifies' : `rejected: ${socket.authorizationError}`}`, `${socket.getProtocol()}, issuer ${cert.issuer?.O ?? '?'} ${cert.issuer?.CN ?? ''}`);
    say(days > 21 ? 'PASS' : days > 0 ? 'WARN' : 'FAIL', `certificate valid for ${days} more days`, `until ${cert.valid_to}`);
    say(names.includes(HOST) ? 'PASS' : 'FAIL', 'certificate covers the host', names.join(', '));
    socket.end();
    resolve();
  });
  socket.on('error', (e) => { say('FAIL', 'TLS handshake', e.code ?? e.message); resolve(); });
  socket.on('timeout', () => { say('FAIL', 'TLS handshake', 'timed out'); socket.destroy(); resolve(); });
});

/* ── HTTP ───────────────────────────────────────────────────────────────────────────────────────── */
section('HTTP');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const rawGet = (path, init = {}) => fetch(BASE + path, { redirect: 'manual', signal: AbortSignal.timeout(20000), ...init }).catch((e) => ({ status: 0, error: e.cause?.code ?? e.message, headers: new Headers() }));
// The site rate-limits every address (30 API calls a minute, 5 briefing posts in 10 minutes). A run that sweeps the breakdowns in every language, or two runs
// in a row, can meet that limit, which is the site working as designed and says nothing about whether it is up. A short limit (Retry-After up to 65 s) is
// waited out and the request repeated; a long one is returned as it is and reported by the caller as what it is, not as a failure.
let waitedOutSeconds = 0;
const get = async (path, init = {}) => {
  let res = await rawGet(path, init);
  for (let attempt = 0; attempt < 2 && res.status === 429; attempt++) {
    const wait = Number(res.headers.get('retry-after') ?? 0);
    if (!(wait > 0 && wait <= 65)) break;
    waitedOutSeconds += wait;
    await sleep(wait * 1000 + 500);
    res = await rawGet(path, init);
  }
  return res;
};
const expect = async (name, path, status, extra) => {
  const res = await get(path);
  let ok = res.status === status;
  let detail = `-> ${res.status || res.error}`;
  if (ok && extra) { const more = await extra(res); ok = more.ok; detail += more.detail ? `  ${more.detail}` : ''; }
  say(ok ? 'PASS' : 'FAIL', `${path} is ${status}`, detail);
};
const plain = await fetch(`http://${HOST}/`, { redirect: 'manual', signal: AbortSignal.timeout(20000) }).catch((e) => ({ status: 0, error: e.message, headers: new Headers() }));
say([301, 302, 307, 308].includes(plain.status) && /^https:/.test(plain.headers.get('location') ?? '') ? 'PASS' : 'FAIL', 'http:// redirects to https://', `-> ${plain.status} ${plain.headers.get('location') ?? plain.error ?? ''}`);
await expect('home', '/', 200, async (r) => { const t = (await r.text()).match(/<title>([^<]*)/)?.[1] ?? ''; return { ok: t.length > 0, detail: `"${t}"` }; });
// The seven capital-centre languages (docs/adr/0018): each answers 200 with its own lang and dir and the entry gate's seven cards
// (this client is no crawler, so it gets the gate). A language that is not public must still answer 404: Japanese is dormant.
for (const [path, lang, dir] of [['/', 'en', 'ltr'], ['/tr', 'tr', 'ltr'], ['/ar', 'ar', 'rtl'], ['/de', 'de', 'ltr'], ['/fr', 'fr', 'ltr'], ['/es', 'es', 'ltr'], ['/zh', 'zh-Hans', 'ltr']]) {
  await expect(`${path === '/' ? 'en' : path.slice(1)} (lang ${lang}, dir ${dir}, seven gate cards)`, path, 200, async (r) => {
    const html = await r.text();
    const cards = (html.match(/data-market="/g) ?? []).length;
    return { ok: new RegExp(`<html[^>]*\\blang="${lang}"`).test(html) && new RegExp(`<html[^>]*\\bdir="${dir}"`).test(html) && cards === 7, detail: `${cards} cards` };
  });
}
// docs/adr/0023: React and Next start behind one small loader after the first paint. A document that still names the framework scripts itself is
// slower (mobile Lighthouse about 96, not 100), not broken: WARN. A loader, or a script it names, that does not exist would leave the page
// without JavaScript: FAIL.
{
  const res = await get('/?m=us');
  const html = res.status === 200 ? await res.text() : '';
  const srcs = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/g)].filter((m) => !/\bnomodule\b/i.test(m[0])).map((m) => m[1]);
  const loader = srcs.find((s) => /\/sf-boot\.[0-9a-f]{12}\.js(\?|$)/.test(s));
  if (!loader) {
    say('WARN', '/ asks for the framework scripts itself, not through the sf-boot loader', `${srcs.length} scripts in the document (mobile Lighthouse about 96 instead of about 100; docs/adr/0023)`);
  } else {
    const loaderResponse = await get(loader);
    const source = loaderResponse.status === 200 ? await loaderResponse.text() : '';
    const named = [...source.matchAll(/"(static\/[^"]+\.js)"/g)].map((m) => m[1]);
    const prefix = loader.slice(0, loader.indexOf('/_next/') + 7);
    const query = loader.includes('?') ? loader.slice(loader.indexOf('?')) : '';
    const statuses = await Promise.all(named.map(async (file) => (await get(prefix + file + query)).status));
    const missing = named.filter((_, i) => statuses[i] !== 200);
    say(srcs.length === 1 && named.length >= 6 && missing.length === 0 ? 'PASS' : 'FAIL', 'the document asks for one script, the sf-boot loader, and every script it names exists', `${srcs.length} in the document, ${named.length} behind the loader${missing.length ? `, MISSING ${missing.join(', ')}` : ''}`);
  }
}
for (const p of ['/privacy', '/imprint', '/robots.txt', '/sitemap.xml', '/.well-known/security.txt']) await expect(p, p, 200);
await expect('ja is dormant', '/ja', 404);
// Seven home pages and, since docs/adr/0020, four architectural breakdowns in each language: 7 + 28.
await expect('sitemap lists the seven languages and the 28 breakdowns', '/sitemap.xml', 200, async (r) => { const n = ((await r.text()).match(/<loc>/g) ?? []).length; return { ok: n === 35, detail: `${n} URLs` }; });

// The enterprise tier (docs/adr/0019): four showcase cards, the USD 50,000 floor with the three new bands and no USD 25,000 left, the two
// enterprise columns, and the new clip served as a real video. Read-only: plain GETs (the clip with a one-byte Range request).
{
  const res = await get('/?m=us');
  const html = res.status === 200 ? await res.text() : '';
  const text = html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
  const cards = [...html.matchAll(/<article[^>]*\bid="(show-[a-z]+)"/g)].map((m) => m[1]);
  say(cards.join(',') === 'show-estate,show-clinic,show-law,show-logistics' ? 'PASS' : 'FAIL', 'the showcase has the four cards (estate, clinic, law, logistics)', cards.join(', ') || `-> ${res.status || res.error}`);
  const floorOk = text.includes('$50,000 – $100,000') && text.includes('$100,000 – $250,000') && text.includes('$250,000 +') && !text.includes('$25,000');
  say(floorOk ? 'PASS' : 'FAIL', 'the briefing opens at $50,000 with the three new bands and no $25,000 left');
  say(/Fail-Safe Enterprise Automation/.test(text) && /Deep Enterprise Integrations/.test(text) ? 'PASS' : 'FAIL', 'the architecture section carries the two enterprise columns');
  for (const [ext, type] of [['mp4', 'video/mp4'], ['webm', 'video/webm'], ['webp', 'image/webp']]) {
    const clip = await get(`/media/clips/logistics.${ext}`, { headers: { range: 'bytes=0-0' } });
    say([200, 206].includes(clip.status) && (clip.headers.get('content-type') ?? '').startsWith(type) ? 'PASS' : 'FAIL', `/media/clips/logistics.${ext} is served as ${type}`, `-> ${clip.status || clip.error} ${clip.headers.get('content-type') ?? ''}`);
  }
}
// The case-study layer (docs/adr/0020): the Studio section, both simulators drawn idle, the four breakdown links, SVG flags (no emoji), the 28
// breakdown pages (one per specimen and language, each with its four parts and the specimen note) and the breakdown API. Read-only GETs;
// the API is limited to 30 requests a minute per address, so only 11 calls are made (4 specimens in English, the law one in every language).
{
  const res = await get('/?m=us');
  const html = res.status === 200 ? await res.text() : '';
  const markup = html.replace(/<script[\s\S]*?<\/script>/g, '');
  const text = markup.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
  say(markup.includes('id="studio"') && (markup.match(/<details class="note"/g) ?? []).length === 3 && /Zero defects, as a method/.test(text) ? 'PASS' : 'FAIL', 'the Studio section is there with its three engineering notes');
  say(markup.includes('data-sim="queue"') && markup.includes('data-sim="security"') ? 'PASS' : 'FAIL', 'both simulators are on the page (drawn idle; the live chunks load when a card comes near)');
  say((markup.match(/data-breakdown-link/g) ?? []).length === 8 && !/\sposter="/.test(markup) ? 'PASS' : 'FAIL', 'four cards lead to their breakdown (pill and hit area), and no video carries a poster attribute');
  say((markup.match(/data-flag=/g) ?? []).length >= 8 && !/[\u{1F1E6}-\u{1F1FF}]/u.test(markup) ? 'PASS' : 'FAIL', 'the language menu and footer carry SVG flags (no flag emoji)');
}
{
  const SLUGS = ['estate', 'clinic', 'law', 'logistics'];
  const LANGS = ['en', 'tr', 'ar', 'de', 'fr', 'es', 'zh'];
  const bad = [];
  for (const lang of LANGS) {
    for (const slug of SLUGS) {
      const res = await get(lang === 'en' ? `/showcase/${slug}` : `/${lang}/showcase/${slug}`);
      const html = res.status === 200 ? await res.text() : '';
      const parts = ['challenge', 'solution', 'integration', 'impact'].every((id) => html.includes(`id="bd-${id}"`));
      if (!(res.status === 200 && /<h1\b/.test(html) && parts && !/noindex/.test(html))) bad.push(`${lang}/${slug} (${res.status || res.error})`);
    }
  }
  say(bad.length === 0 ? 'PASS' : 'FAIL', 'all 28 breakdown pages (4 specimens x 7 languages) answer 200 with an h1 and the four parts', bad.slice(0, 3).join(', '));
  const en = await (await get('/showcase/law')).text();
  const plainText = en.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
  say(/Challenge[\s\S]*Architectural solution[\s\S]*Integration & security[\s\S]*Measured impact & ROI/.test(plainText) && /not client work/.test(plainText) && !/zero.latency|photo.?real/i.test(plainText) ? 'PASS' : 'FAIL', 'the English law breakdown has the four headings in order, says "not client work", and makes no zero-latency or photorealism claim');
  const apiBad = [];
  for (const slug of SLUGS) { const r = await get(`/api/breakdown?slug=${slug}&locale=en`); const j = r.status === 200 ? await r.json() : null; if (!(j?.ok && j.data?.parts?.length === 3 && j.data?.impact?.tiles?.length === 4)) apiBad.push(`en/${slug} ${r.status}`); }
  for (const lang of LANGS.filter((l) => l !== 'en')) { const r = await get(`/api/breakdown?slug=law&locale=${lang}`); const j = r.status === 200 ? await r.json() : null; if (!(j?.ok && j.data?.locale === lang)) apiBad.push(`${lang}/law ${r.status}`); }
  say(apiBad.length === 0 ? 'PASS' : 'FAIL', '/api/breakdown answers JSON for the four specimens and for every language', apiBad.join(', '));
  const notFound = [(await get('/showcase/saas')).status, (await get('/ja/showcase/estate')).status, (await get('/api/breakdown?slug=saas&locale=en')).status];
  say(notFound.every((n) => n === 404) ? 'PASS' : 'FAIL', 'an unknown specimen, a dormant language and a bad API request are all 404', notFound.join(', '));
  const sizes = [];
  for (const slug of SLUGS) for (const [ext, type, min] of [['mp4', 'video/mp4', 300_000], ['webm', 'video/webm', 200_000], ['webp', 'image/webp', 8_000]]) {
    const clip = await get(`/media/clips/${slug}.${ext}`, { headers: { range: 'bytes=0-0' } });
    const total = Number(/\/(\d+)$/.exec(clip.headers.get('content-range') ?? '')?.[1] ?? 0);
    if (!([200, 206].includes(clip.status) && (clip.headers.get('content-type') ?? '').startsWith(type) && total >= min)) sizes.push(`${slug}.${ext} ${clip.status} ${total}`);
  }
  say(sizes.length === 0 ? 'PASS' : 'FAIL', 'the four 1080p sector clips (mp4, webm, webp) are served with the right type and a 1080p-sized body', sizes.slice(0, 3).join(', '));
}
await expect('og', '/og?locale=en', 200, async (r) => { const b = Buffer.from(await r.arrayBuffer()); const png = b.subarray(1, 4).toString() === 'PNG'; return { ok: png && b.readUInt32BE(16) === 1200 && b.readUInt32BE(20) === 630, detail: png ? `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}` : 'not a PNG' }; });
const home = await get('/tr');
const h = (n) => home.headers.get(n);
say(h('strict-transport-security') ? 'PASS' : 'FAIL', 'Strict-Transport-Security present');
// docs/adr/0024: the policy is enforced. Report-only (CSP_MODE=report-only set on the platform) still protects nothing: WARN. No header at all: FAIL.
say(h('content-security-policy') ? 'PASS' : h('content-security-policy-report-only') ? 'WARN' : 'FAIL', 'the CSP is enforced (Content-Security-Policy, not Report-Only)', h('content-security-policy') ? 'enforcing' : h('content-security-policy-report-only') ? 'report-only: blocks nothing (CSP_MODE=report-only?)' : 'no CSP header');

/* ── Briefing route: it must answer, and reject what it must reject ─────────────────────────────── */
section('Briefing API (must not be 500; a 500 here was the jsdom/ERR_REQUIRE_ESM failure of 09.10.2026)');
await expect('GET /api/briefing', '/api/briefing', 405);
const post = (headers) => get('/api/briefing', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: '{}' });
for (const [name, headers, want] of [['POST without Origin', {}, 403], ['POST with a foreign Origin', { origin: 'https://evil.example' }, 403], ['POST with our Origin and an empty body', { origin: ORIGIN }, 422]]) {
  const r = await post(headers);
  if (r.status === 429) {
    // Not a failure: the limiter answered, so the route is up and protected. Say when this address can ask again.
    const minutes = Math.ceil(Number(r.headers.get('retry-after') ?? 0) / 60);
    say('WARN', `${name}: 429, this address has used its request limit`, `the rate limiter is working (5 briefing posts per 10 minutes per address); the ${want} check is skipped, run again in ${minutes || 10} min`);
    continue;
  }
  say(r.status === want ? 'PASS' : 'FAIL', `${name} is ${want}`, `-> ${r.status || r.error}`);
}

const fails = results.filter((l) => l === 'FAIL').length;
const warns = results.filter((l) => l === 'WARN').length;
console.log(`\n${results.length - fails - warns} passed, ${warns} warning(s), ${fails} failure(s) for ${BASE}${waitedOutSeconds ? ` (waited ${Math.round(waitedOutSeconds)} s out of the site's rate limit; that is by design)` : ''}`);
process.exit(fails ? 1 : 0);
