#!/usr/bin/env node
/**
 * Live reachability check: what a visitor on the open internet gets from the production domain.
 * Read-only: DNS lookups, one TLS handshake, GET requests, and two POSTs that the briefing route must reject
 * (no Origin, foreign Origin). Nothing is sent that could reach the webhook.
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
const get = (path, init = {}) => fetch(BASE + path, { redirect: 'manual', signal: AbortSignal.timeout(20000), ...init }).catch((e) => ({ status: 0, error: e.cause?.code ?? e.message, headers: new Headers() }));
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
for (const p of ['/privacy', '/imprint', '/robots.txt', '/sitemap.xml', '/.well-known/security.txt']) await expect(p, p, 200);
await expect('ja is dormant', '/ja', 404);
await expect('sitemap lists the seven languages', '/sitemap.xml', 200, async (r) => { const n = ((await r.text()).match(/<loc>/g) ?? []).length; return { ok: n === 7, detail: `${n} URLs` }; });
await expect('og', '/og?locale=en', 200, async (r) => { const b = Buffer.from(await r.arrayBuffer()); const png = b.subarray(1, 4).toString() === 'PNG'; return { ok: png && b.readUInt32BE(16) === 1200 && b.readUInt32BE(20) === 630, detail: png ? `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}` : 'not a PNG' }; });
const home = await get('/tr');
const h = (n) => home.headers.get(n);
say(h('strict-transport-security') ? 'PASS' : 'FAIL', 'Strict-Transport-Security present');
say(h('content-security-policy-report-only') || h('content-security-policy') ? 'PASS' : 'FAIL', 'a CSP header is present', h('content-security-policy') ? 'enforcing' : 'report-only');

/* ── Briefing route: it must answer, and reject what it must reject ─────────────────────────────── */
section('Briefing API (must not be 500; a 500 here was the jsdom/ERR_REQUIRE_ESM failure of 09.10.2026)');
await expect('GET /api/briefing', '/api/briefing', 405);
const post = (headers) => get('/api/briefing', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: '{}' });
for (const [name, headers, want] of [['POST without Origin', {}, 403], ['POST with a foreign Origin', { origin: 'https://evil.example' }, 403], ['POST with our Origin and an empty body', { origin: ORIGIN }, 422]]) {
  const r = await post(headers);
  say(r.status === want ? 'PASS' : 'FAIL', `${name} is ${want}`, `-> ${r.status || r.error}`);
}

const fails = results.filter((l) => l === 'FAIL').length;
const warns = results.filter((l) => l === 'WARN').length;
console.log(`\n${results.length - fails - warns} passed, ${warns} warning(s), ${fails} failure(s) for ${BASE}`);
process.exit(fails ? 1 : 0);
