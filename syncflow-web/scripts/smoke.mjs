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
 *   EXPECT_LOCALES      languages that must be public (default "en,tr", in every environment: docs/adr/0035; the seven capital centres of
 *                       docs/adr/0018 are "en,tr,ar,de,fr,es,zh", "...,ja" only with NEXT_PUBLIC_PREVIEW_LOCALES=1). Every other language must answer 404.
 *   EXPECT_CSP_MODE     "report-only" to expect the report-only CSP header instead of the enforcing one (default: enforce, docs/adr/0024).
 *   STRESS=1            also fire 250 page requests from one address to prove the page-level limiter.
 *
 * Release switches (lib/flags.ts, docs/adr/0035-sales-ready-release.md). The server under test was BUILT with some values of these; run the smoke with
 * the same ones (NEXT_PUBLIC_ values are inlined at build time), or the checks below describe a different site:
 *   NEXT_PUBLIC_CONTACT_EMAIL, NEXT_PUBLIC_SHOW_PRICING, NEXT_PUBLIC_BRIEFING_ENABLED
 * Default (all unset): no price, no briefing form, /api/briefing answers 404, every call to action is a mail link to the configured address.
 * Both switches "true": the form, the bands, the long privacy notice and the API checks of the earlier releases (the full set, including the mock webhook).
 */
import { createHmac } from 'node:crypto';
import { createServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';

const BASE = (process.argv[2] ?? process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const ORIGIN = new URL(BASE).origin;
const ALL_LOCALES = ['en', 'tr', 'ar', 'de', 'fr', 'es', 'zh', 'ja'];
const OPEN = (process.env.EXPECT_LOCALES ?? 'en,tr').split(',').map((s) => s.trim()).filter(Boolean);
const CLOSED = ALL_LOCALES.filter((l) => !OPEN.includes(l));
// The release switches the server was built with (lib/flags.ts). The briefing's first step is the price question, so the form needs both.
const flagOn = (value) => value === 'true' || value === '1';
const PRICING_ON = flagOn(process.env.NEXT_PUBLIC_SHOW_PRICING);
const BRIEFING_ON = flagOn(process.env.NEXT_PUBLIC_BRIEFING_ENABLED) && PRICING_ON;
const CONTACT = (process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? '').trim();
// The capital centre (market) each language suggests, and the market's own gate link (components/gate/EntryGate.tsx).
const MARKET_OF = { en: 'us', tr: 'tr', ar: 'me', de: 'dach', fr: 'fr', es: 'wealth', zh: 'asia' };
const MARKET_LINK = { us: '/?m=us', tr: '/tr?m=tr', me: '/ar?m=me', dach: '/de?m=dach', fr: '/fr?m=fr', wealth: '/es?m=wealth', asia: '/zh?m=asia' };
// <html lang>, hreflang and JSON-LD carry the BCP 47 tag of the language (Simplified Chinese is zh-Hans).
const HTML_LANG = { zh: 'zh-Hans' };
const TAGS = OPEN.map((l) => HTML_LANG[l] ?? l);
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
  budget: 't1',
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
// docs/adr/0024-csp-enforced.md: the policy is enforced (Content-Security-Policy); a server started with CSP_MODE=report-only is checked with EXPECT_CSP_MODE=report-only.
const expectEnforce = process.env.EXPECT_CSP_MODE !== 'report-only';
const cspHeader = expectEnforce ? 'content-security-policy' : 'content-security-policy-report-only';
const otherCspHeader = expectEnforce ? 'content-security-policy-report-only' : 'content-security-policy';
const csp = home.headers.get(cspHeader) ?? '';
const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];

check('GET / returns 200 HTML', home.status === 200 && (home.headers.get('content-type') ?? '').includes('text/html'), `status ${home.status}`);
// docs/adr/0023: the document asks for ONE small loader and no framework script; React and Next start after the first contentful paint.
{
  const tags = [...html.matchAll(/<script\b[^>]*\bsrc="(\/_next\/static\/chunks\/[^"]+)"[^>]*>/g)].map((m) => ({ src: m[1], tag: m[0] }));
  const eager = tags.filter((t) => !/noModule/i.test(t.tag));
  const boot = eager.filter((t) => /\/sf-boot\.[0-9a-f]{12}\.js$/.test(t.src));
  check('the document asks for ONE script, the framework loader, and no React or Next chunk (docs/adr/0023)', boot.length === 1 && eager.length === 1, `${JSON.stringify(eager.map((t) => t.src))} (${tags.length} chunk tags, ${(html.match(/<script/g) ?? []).length} script tags, ${html.length} bytes)`);
  if (boot[0]) {
    const loader = await get(boot[0].src);
    const text = await loader.text();
    const named = [...new Set(text.match(/static\/chunks\/[\w.-]+\.js/g) ?? [])];
    check('the loader is immutable JavaScript, waits for the first contentful paint and names the scripts it starts', loader.status === 200 && /javascript/.test(loader.headers.get('content-type') ?? '') && /immutable/.test(loader.headers.get('cache-control') ?? '') && /first-contentful-paint/.test(text) && named.length >= 6, `${loader.status} ${named.length} scripts`);
    const missing = [];
    for (const name of named) if ((await get(`/_next/${name}`)).status !== 200) missing.push(name);
    check('every script the loader starts exists', missing.length === 0, missing.join(', '));
  }
}
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
check('the sections are there (architecture, showcase, studio) and the language section is gone', ['architecture', 'showcase', 'studio'].every((id) => new RegExp(`<section[^>]*id="${id}"`).test(html)) && !/<section[^>]*id="reach"/.test(html));
check(BRIEFING_ON ? 'the briefing section is there (the form is switched on)' : 'there is no briefing section and nothing links to #briefing (the form is switched off)', /<section[^>]*id="briefing"/.test(html) === BRIEFING_ON && (BRIEFING_ON || !/#briefing/.test(html)));
check('the showcase has exactly the four sectors (real estate, clinics, corporate law, logistics) and no SaaS', ['show-estate', 'show-clinic', 'show-law', 'show-logistics'].every((id) => html.includes(`id="${id}"`)) && !/show-saas|SaaS/.test(html));
// The words of a heading may sit in separate masked spans, so phrases are compared against the page's text with the tags removed.
const pageText = html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/\s+/g, ' ');
check('the showcase headline counts four industries and the footer links the logistics card', pageText.includes('Four industries.') && html.includes('href="/#show-logistics"'));
check('the architecture section carries the two enterprise columns (fail-safe automation, deep integrations) and the note that implies no partnership', pageText.includes('Fail-Safe Enterprise Automation') && pageText.includes('Deep Enterprise Integrations') && pageText.includes('Salesforce') && pageText.includes('SAP') && pageText.includes('HubSpot') && pageText.includes('Oracle') && pageText.includes('no partnership, certification or conformance is implied'));
// "High-ROI digital ecosystems" was a return promise nobody had measured; it is gone (docs/adr/0035, correction round), and no ROI wording replaces it.
check('the hero and the architecture intro carry the owner\u2019s phrases (enterprise scale, secure workflow automation) and promise no return (no "high-ROI", no ROI)', /enterprise scale/i.test(pageText) && /secure workflow automation/i.test(pageText) && !/high-ROI|\bROI\b|return on investment/i.test(pageText));
check('no invented enterprise credential in the page (no SLA, SOC 2, ISO 27001, uptime percentage or partner badge)', !/\bSLA\b|SOC ?2|ISO ?27001|99\.9+ ?%|uptime|certified partner/i.test(pageText));
check('the page makes no multi-language claim', !/seven languages|7 languages|every language|yedi dil|her dilde/i.test(html));
check('no Lemon Squeezy and no old offer anywhere in the page', !/lemonsqueezy|lemon\.js|\$2,500|\$2\.500|Start Project/i.test(html));
check(BRIEFING_ON ? 'the briefing panel is there and opts out of smooth scrolling (data-lenis-prevent)' : 'no form of any kind is on the page', BRIEFING_ON ? /<form[^>]*data-lenis-prevent/.test(html) : !/<form\b/.test(html));
// Every mail link is built from NEXT_PUBLIC_CONTACT_EMAIL (lib/contact.ts); the address is written nowhere in the code.
const mailLinks = (markup) =>
  [...markup.matchAll(/href="(mailto:[^"]+)"/g)].map((m) => {
    const raw = m[1].replace(/&amp;/g, '&');
    const url = new URL(raw);
    return { raw, to: decodeURIComponent(url.pathname), subject: url.searchParams.get('subject'), body: url.searchParams.get('body') };
  });
const AUDIT = { subject: 'Free site audit request', body: 'Website URL:\n\nWhat matters most (speed / SEO / mobile / redesign):\n' };
// The body travels with CRLF line breaks (RFC 6068, %0D%0A): compare it with the text's own LF.
const isAudit = (link) => link.to === CONTACT && link.subject === AUDIT.subject && link.body?.replace(/\r\n/g, '\n') === AUDIT.body;
// The exact tail of the audit link: subject and body percent-encoded, every line break %0D%0A (tests/delivery/mailto.test.mjs proves the encoder; this proves the page uses it).
const AUDIT_QUERY = '?subject=Free%20site%20audit%20request&body=Website%20URL%3A%0D%0A%0D%0AWhat%20matters%20most%20%28speed%20%2F%20SEO%20%2F%20mobile%20%2F%20redesign%29%3A%0D%0A';
if (CONTACT) {
  check(`the contact address comes from NEXT_PUBLIC_CONTACT_EMAIL and is published (mailto ${CONTACT})`, mailLinks(html).some((link) => link.to === CONTACT));
  const hero = /<section[^>]*id="top"[\s\S]*?<\/section>/.exec(html)?.[0] ?? '';
  const footer = /<footer[\s\S]*?<\/footer>/.exec(html)?.[0] ?? '';
  // While the form is on, the hero's primary action is the briefing (components/sections/Hero.tsx); the audit request is then in the footer.
  check(
    BRIEFING_ON ? 'the footer carries the free site audit request (the hero keeps the briefing as its primary action while the form is on)' : 'the hero and the footer carry the free site audit request: a mail with the subject "Free site audit request" and the two prompts in the body',
    (BRIEFING_ON || mailLinks(hero).some(isAudit)) && mailLinks(footer).some(isAudit),
    `hero ${mailLinks(hero).length} mail link(s), footer ${mailLinks(footer).length}`,
  );
  check('the audit link is percent-encoded to the letter and its line breaks are %0D%0A (a bare %0A never appears)', mailLinks(footer).filter(isAudit).every((link) => link.raw === `mailto:${CONTACT}${AUDIT_QUERY}`) && mailLinks(footer).some(isAudit), mailLinks(footer).find(isAudit)?.raw ?? 'no audit link in the footer');
  // The address is also plain text beside the main mail calls to action, for a visitor whose browser opens no mail program (hero while the form is off, footer always).
  const flat = (markup) => markup.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  check('the address is also plain text next to the call to action: in the hero (form off) and in the footer', (BRIEFING_ON || flat(hero).includes(CONTACT)) && flat(footer).includes(CONTACT), `hero ${flat(hero).includes(CONTACT)}, footer ${flat(footer).includes(CONTACT)}`);
  check('every mail link on the page goes to the configured address (no other address is written in the page)', mailLinks(html).every((link) => link.to === CONTACT), [...new Set(mailLinks(html).map((link) => link.to))].join(', '));
} else {
  check('NEXT_PUBLIC_CONTACT_EMAIL is not set: the page has no mail link at all (nothing is invented)', !/mailto:/.test(html));
}
check('no unverified claim in the HTML (locked 60 FPS, 120Hz, LCP < 1.2s, AV1, example percentages)', !/locked 60|60 FPS|120\s?Hz|LCP\s*&lt;|LCP\s*<|\bAV1\b|\+212|adaptive bitrate/i.test(html));

const alternates = [...html.matchAll(/<link[^>]+rel="alternate"[^>]*>/g)].map((m) => m[0]);
const hreflangs = alternates.map((a) => /hrefLang="([^"]+)"/i.exec(a)?.[1]).filter(Boolean);
check(`hreflang alternates: ${TAGS.join(' ')} + x-default, and no language that is not public`, [...TAGS, 'x-default'].every((l) => hreflangs.includes(l)) && !CLOSED.some((l) => hreflangs.includes(HTML_LANG[l] ?? l)), hreflangs.join(','));
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
check('JSON-LD lists only the public languages', JSON.stringify([...siteLangs].sort()) === JSON.stringify([...TAGS].sort()), siteLangs.join(','));

/* ── 1b. Entry gate, market and crawlers (docs/adr/0015-entry-gate-and-hero.md) ───────────────── */
section('Entry gate, market and crawlers (docs/adr/0015)');
const UA = {
  googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  bingbot: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
  facebook: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  // What Lighthouse and PageSpeed Insights send: they must get the gate, because they measure what a visitor gets.
  lighthouse: 'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse',
  browser: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',
};
const hasGate = (page) => /class="gate"/.test(page);
const pageAs = async (path, ua) => {
  const res = await get(path, ua ? { headers: { 'user-agent': ua } } : {});
  return { res, page: await res.text() };
};

const gateHome = await pageAs('/');
check('GET / without a market: the gate is in the HTML, open', hasGate(gateHome.page) && /data-state="open"/.test(gateHome.page));
const openMarkets = Object.entries(MARKET_OF).filter(([locale]) => OPEN.includes(locale)).map(([, market]) => market);
const closedMarkets = Object.entries(MARKET_OF).filter(([locale]) => !OPEN.includes(locale)).map(([, market]) => market);
check(`the public capital centres (${openMarkets.join(', ')}) are real links (the gate works without JavaScript), each to its own language, and no closed language has a card`, openMarkets.every((m) => gateHome.page.includes(`href="${MARKET_LINK[m]}"`) && new RegExp(`data-market="${m}"`).test(gateHome.page)) && closedMarkets.every((m) => !new RegExp(`data-market="${m}"`).test(gateHome.page)));
check('each card is headed by its language in its own script and direction', [['en', 'English', 'ltr'], ['tr', 'Türkçe', 'ltr'], ['ar', 'العربية', 'rtl'], ['de', 'Deutsch', 'ltr'], ['fr', 'Français', 'ltr'], ['es', 'Español', 'ltr'], ['zh-Hans', '中文', 'ltr']].filter(([l]) => OPEN.includes(l === 'zh-Hans' ? 'zh' : l)).every(([l, name, dir]) => gateHome.page.includes(`class="gate-market-name" lang="${l}" dir="${dir}">${name}`)));
// Text a visitor can read: no scripts (Next.js serialises its own data there), no styles, no tags.
const visibleText = (markup) => markup.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ');
if (PRICING_ON) {
  check('each card names its currency (USD, EUR, AED, TRY)', ['USD', 'EUR', 'AED', 'TRY'].filter((c) => openMarkets.some((m) => ({ us: 'USD', tr: 'TRY', me: 'AED', dach: 'EUR', fr: 'EUR', wealth: 'USD', asia: 'USD' })[m] === c)).every((c) => gateHome.page.includes(c)));
} else {
  check('prices are hidden: no card names a currency', !/gate-market-currency/.test(gateHome.page) && !/>\s*(USD|EUR|AED|TRY)\s*</.test(gateHome.page));
}
if (BRIEFING_ON) {
  check('the first step of the briefing names the minimum in dollars and offers the three bands above it (server-rendered, US default)', gateHome.page.includes('$50,000 – $100,000') && gateHome.page.includes('$100,000 – $250,000') && gateHome.page.includes('$250,000 +'));
  check('the old $25,000 floor is gone: no $25,000 option and no $25,000 – $50,000 band anywhere in the page', !/\$25,000/.test(gateHome.page));
  check('the three bands carry the enterprise descriptions (core architecture, enterprise infrastructure, custom ecosystems)', gateHome.page.includes('Core Architecture &amp; Workflow Automation') && gateHome.page.includes('Enterprise Infrastructure &amp; Multi-Region Ecosystem') && gateHome.page.includes('Custom Global Ecosystems'));
  check('the first step has exactly three options, all at or above the minimum: there is no "below" choice', (gateHome.page.match(/name="budget"/g) ?? []).length === 3 && !/Below \$|below the minimum/i.test(gateHome.page), `${(gateHome.page.match(/name="budget"/g) ?? []).length} budget options`);
  check('no old budget band (under $20k) is offered any more', !/\$5k|\$10k|\$20k|Let’s talk first|Let&#x27;s talk first/i.test(gateHome.page));
} else {
  // The raw HTML always carries "$" (React's flight data: $L1, $undefined); what a visitor reads must carry no amount, and the form's options must be absent.
  const shown = visibleText(gateHome.page);
  check('no price is shown: no currency sign or code next to a number in the text a visitor reads, and no budget option', !/[$€₺£]\s?\d|\d\s?[$€₺£]|\b\d[\d.,]*\s?(?:USD|EUR|AED|TRY)\b/.test(shown) && !/name="budget"/.test(gateHome.page) && !/₺/.test(gateHome.page), shown.match(/.{20}[$€₺£]\s?\d.{10}/)?.[0] ?? '');
}
check('the gate is a dialog with a heading, and the page behind it is still in the HTML', /role="dialog"/.test(gateHome.page) && /aria-modal="true"/.test(gateHome.page) && /id="gate-title"/.test(gateHome.page) && gateHome.page.includes('Built in the dark.'));
check('the gate offers only the public languages', (gateHome.page.match(/class="gate-lang"/g) ?? []).length === OPEN.length, `${(gateHome.page.match(/class="gate-lang"/g) ?? []).length} chips, ${OPEN.length} public languages`);
check('the gate sets no cookie (the choice lives in the address only)', gateHome.res.headers.get('set-cookie') === null);
for (const path of ['/?m=us', '/tr?m=tr', '/ar?m=me', '/de?m=dach', '/fr?m=fr', '/es?m=wealth', '/zh?m=asia', '/?m=int', '/?m=eu', '/de?m=fr']) {
  const prefix = path.startsWith('/?') ? 'en' : path.slice(1).split('?')[0];
  const passed = await pageAs(path);
  if (OPEN.includes(prefix)) check(`${path}: a valid market in the address means the gate is passed (no gate in the HTML)`, passed.res.status === 200 && !hasGate(passed.page));
  else check(`${path}: the language is not public, so the address is a 404 whatever the market says`, passed.res.status === 404, `status ${passed.res.status}`);
}
const unknown = await pageAs('/?m=ZZtopmarket');
// Next.js serialises the request URL (query included) into its own router payload, JSON-escaped, inside <script> elements: that is not
// markup. What must hold: the gate still shows, the value never reaches the document markup, and an HTML injection attempt is not reflected.
const markup = unknown.page.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
const injected = await pageAs('/?m=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E');
check('an unknown market is ignored (the gate shows) and never reaches the document markup', hasGate(unknown.page) && !markup.includes('ZZtopmarket') && !injected.page.includes('<img src=x onerror'));
const trGate = await pageAs('/tr');
check('/tr: the gate speaks Turkish', hasGate(trGate.page) && trGate.page.includes('Finans merkezinizi seçin.'));
if (BRIEFING_ON) check('/tr: the briefing names the minimum in lira and offers the lira bands', trGate.page.includes('₺2.475.000') && trGate.page.includes('₺4.950.000') && trGate.page.includes('₺12.375.000 +'));
else check('/tr: prices are hidden, so there is no lira amount anywhere in the page', !trGate.page.includes('₺') && !/\d\s?TRY\b/.test(visibleText(trGate.page)));
for (const [name, ua] of [['Googlebot', UA.googlebot], ['Bingbot', UA.bingbot], ['facebookexternalhit', UA.facebook]]) {
  const bot = await pageAs('/', ua);
  check(`${name} gets the page without the gate, with the same content (h1${BRIEFING_ON ? ', briefing section' : ''})`, bot.res.status === 200 && !hasGate(bot.page) && bot.page.includes('Built in the dark.') && /<section[^>]*id="briefing"/.test(bot.page) === BRIEFING_ON);
}
const botTr = await pageAs('/tr', UA.googlebot);
check('Googlebot on /tr gets no gate either', botTr.res.status === 200 && !hasGate(botTr.page) && /<html[^>]*lang="tr"/.test(botTr.page));
for (const [name, ua] of [['Lighthouse / PageSpeed', UA.lighthouse], ['an ordinary browser', UA.browser]]) {
  const visitor = await pageAs('/', ua);
  check(`${name} gets the gate (it must see what a visitor sees)`, hasGate(visitor.page));
}

/* ── 1c. Seven capital centres (docs/adr/0018-seven-capital-centres.md) ───────────────────────── */
section('Seven capital centres: each page speaks its language, names its currency (docs/adr/0018)');
const normalise = (text) => text.replace(/[\s\u00a0\u202f]+/g, ' ');
const CENTRES = [
  // [language, path, gate title, the briefing's floor as that page formats it, a word of the briefing in that language]
  ['en', '/', 'Choose your capital center.', '$50,000', 'Investment'],
  ['tr', '/tr', 'Finans merkezinizi seçin.', '₺2.475.000', 'Yatırım'],
  ['ar', '/ar', 'اختر مركزك المالي.', '184,000', 'الاستثمار'],
  ['de', '/de', 'Wählen Sie Ihren Finanzplatz.', '45.000 €', 'Investition'],
  ['fr', '/fr', 'Choisissez votre place financière.', '45 000 €', 'Investissement'],
  ['es', '/es', 'Elija su plaza financiera.', '$50,000', 'Inversión'],
  ['zh', '/zh', '选择您的金融中心。', '$50,000', '投资'],
];
for (const [code, path, title, floor, word] of CENTRES) {
  if (!OPEN.includes(code)) continue;
  const centre = await pageAs(path);
  const text = normalise(centre.page);
  check(
    BRIEFING_ON ? `${path}: the gate speaks ${code}, and the briefing opens at ${floor} in the page's own number format` : `${path}: the gate speaks ${code}, and the minimum (${floor}) is not shown anywhere (prices are hidden)`,
    centre.res.status === 200 && hasGate(centre.page) && centre.page.includes(title) && (BRIEFING_ON ? text.includes(floor) && centre.page.includes(word) : !text.includes(floor)),
    `status ${centre.res.status}`,
  );
}
if (OPEN.includes('ar')) {
  const ar = await pageAs('/ar');
  check('/ar is right-to-left, with the gate cards in the markup' + (BRIEFING_ON ? ' and the dirham figure (184,000 AED)' : ''), /<html[^>]*\bdir="rtl"/.test(ar.page) && (!BRIEFING_ON || normalise(ar.page).includes('184,000 AED')) && ar.page.includes('data-market="me"'));
}
if (OPEN.includes('zh')) {
  const zh = await pageAs('/zh');
  check('/zh is Simplified Chinese (lang zh-Hans) and the page names no web font it does not ship', /<html[^>]*\blang="zh-Hans"/.test(zh.page) && !/inter-display-latin/.test(zh.page.replace(/<script[\s\S]*?<\/script>/g, '')) );
}
if (OPEN.includes('de')) {
  const crossed = await pageAs('/de?m=wealth');
  check('the market and the language are independent: /de?m=wealth is German and the gate is passed', crossed.res.status === 200 && !hasGate(crossed.page) && /<html[^>]*\blang="de"/.test(crossed.page));
} else {
  const crossed = await pageAs('/tr?m=us');
  check('the market and the language are independent: /tr?m=us is Turkish and the gate is passed', crossed.res.status === 200 && !hasGate(crossed.page) && /<html[^>]*\blang="tr"/.test(crossed.page));
}


/* ── 2. Locales ──────────────────────────────────────────────────────────────────────────────── */
section('Locales');
const MARKERS = {
  // The second marker is the header's call to action: the briefing while the form is switched on, otherwise "write to us" (a mail link, so only with an address).
  tr: ['Karanlıkta inşa edilir.', ...(BRIEFING_ON ? ['Briefing Başlat'] : CONTACT ? ['Bize yazın'] : [])],
  ar: ['بُني في العتمة.', 'ينساب كالسائل.'],
  de: ['Im Dunkeln gebaut.', 'Bewegt sich wie Flüssigkeit.'],
  fr: ['Bâti dans l’ombre.', 'Glisse comme un liquide.'],
  es: ['Construido en la oscuridad.', 'Fluye como un líquido.'],
  zh: ['筑于暗处。', '流动如液。'],
  ja: ['闇の中で築く。', '液体のように動く。'],
};
for (const code of OPEN.filter((l) => l !== 'en')) {
  const res = await get(`/${code}`);
  const body = await res.text();
  const dir = code === 'ar' ? 'rtl' : 'ltr';
  const htmlLang = HTML_LANG[code] ?? code;
  check(`/${code} renders in ${code} (lang attr, dir="${dir}", translated hero)`, res.status === 200 && new RegExp(`<html[^>]*\\blang="${htmlLang}"`).test(body) && new RegExp(`<html[^>]*\\bdir="${dir}"`).test(body) && (MARKERS[code] ?? []).every((w) => body.includes(w)), `status ${res.status}`);
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
for (const [code, heading] of [['de', 'Datenschutzhinweis'], ['fr', 'Notice de confidentialité'], ['es', 'Aviso de privacidad'], ['ar', 'إشعار الخصوصية'], ['zh', '隐私声明']]) {
  if (!OPEN.includes(code)) continue;
  const legal = await get(`/${code}/privacy`);
  const body = await legal.text();
  if (BRIEFING_ON) check(`/${code}/privacy carries the draft legal text in its own language (no English fallback marker)`, legal.status === 200 && body.includes(heading) && !/class="chip mt-3 normal-case" lang="en"/.test(body), `status ${legal.status}`);
  // The short notices exist in English and Turkish only (components/sections/LegalNotice.tsx): any other language shows the English text, marked lang="en".
  else check(`/${code}/privacy shows the English notice, marked lang="en" (no translation of the short notice exists)`, legal.status === 200 && /lang="en"/.test(body) && body.includes('Privacy notice'), `status ${legal.status}`);
}
if (OPEN.includes('ja')) {
  const legal = await get('/ja/privacy');
  const body = await legal.text();
  check('the dormant Japanese draft shows the legal text in English, marked as such', legal.status === 200 && /lang="en"/.test(body) && /Who is responsible/.test(body), `status ${legal.status}`);
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
// `www` joins the apex permanently once the domain is added in Vercel and the DNS record exists (next.config.mjs redirects). The Host header is
// sent by hand, so this holds on any server, whatever its own name.
{
  // fetch() ignores a Host header; node:http does not.
  const www = await new Promise((resolve, reject) => {
    const target = new URL('/tr/showcase?m=tr&x=1', BASE);
    const send = target.protocol === 'https:' ? httpsRequest : httpRequest;
    send(target, { headers: { host: 'www.syncflow.agency' } }, (response) => {
      response.resume();
      resolve({ status: response.statusCode, location: response.headers.location });
    }).on('error', reject).end();
  });
  check('www.syncflow.agency answers 308 to the apex with path and query kept', www.status === 308 && www.location === 'https://syncflow.agency/tr/showcase?m=tr&x=1', `${www.status} ${www.location}`);
}
const sitemap = await (await get('/sitemap.xml')).text();
const SLUGS = ['estate', 'clinic', 'law', 'logistics'];
const breakdownPath = (locale, slug) => (locale === 'en' ? `/showcase/${slug}` : `/${locale}/showcase/${slug}`);
// The architectural R&D specimens (docs/adr/0032): two pages per language, each in the sitemap with its own alternates.
const SPEC_SLUGS = ['studio-site', 'fail-safe-queue'];
const specimenPath = (locale, slug) => (locale === 'en' ? `/specimens/${slug}` : `/${locale}/specimens/${slug}`);
check(`sitemap lists ${OPEN.length} locale URLs, ${OPEN.length * SLUGS.length} breakdown URLs and ${OPEN.length * SPEC_SLUGS.length} R&D specimen URLs with alternates (and no closed language)`, (sitemap.match(/<loc>/g) ?? []).length === OPEN.length * (1 + SLUGS.length + SPEC_SLUGS.length) && /hreflang="x-default"/.test(sitemap) && !CLOSED.some((l) => new RegExp(`hreflang="${l}"`).test(sitemap)), `${(sitemap.match(/<loc>/g) ?? []).length} entries`);
check('every public language and every specimen has its breakdown URL in the sitemap', OPEN.every((l) => SLUGS.every((slug) => sitemap.includes(`${breakdownPath(l, slug)}</loc>`))));
check('every public language has both R&D specimen URLs in the sitemap', OPEN.every((l) => SPEC_SLUGS.every((slug) => sitemap.includes(`${specimenPath(l, slug)}</loc>`))));
const robots = await (await get('/robots.txt')).text();
check('robots.txt disallows /api/ and links the sitemap', /Disallow: \/api\//.test(robots) && /Sitemap:/.test(robots));
check('manifest + icon served', (await get('/manifest.webmanifest')).status === 200 && (await get('/icon.svg')).status === 200);
const ogUrls = [...html.matchAll(/<meta[^>]+(?:property="og:image"|name="twitter:image")[^>]*content="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
check('og:image and twitter:image use the explicit, redirect-free /og?locale= URL', ogUrls.length >= 2 && ogUrls.every((u) => /\/og\?locale=en&v=4$/.test(u)), ogUrls.join(' '));
check('og:image:alt is localized', /property="og:image:alt"[^>]*content="syncflow\.agency: Built in the dark\. Moves like liquid\./.test(html));
{
  // The share preview (LinkedIn, X, Slack, WhatsApp) in every language: its own description line, the title, the card type, and the card's size.
  const fs = await import('node:fs');
  const unescape = (text) => text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const meta = (markup, attr, key) => {
    const found = markup.match(new RegExp(`<meta[^>]+${attr}="${key}"[^>]*content="([^"]*)"`));
    return found ? unescape(found[1]) : null;
  };
  const problems = [];
  for (const locale of OPEN) {
    const m = JSON.parse(fs.readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), 'utf8')).Meta;
    const page = await (await get(locale === 'en' ? '/' : `/${locale}`)).text();
    const expected = [
      ['og:description', meta(page, 'property', 'og:description'), m.ogDescription],
      ['twitter:description', meta(page, 'name', 'twitter:description'), m.ogDescription],
      ['og:title', meta(page, 'property', 'og:title'), m.ogTitle],
      ['twitter:title', meta(page, 'name', 'twitter:title'), m.ogTitle],
      ['description', meta(page, 'name', 'description'), m.description],
      ['twitter:card', meta(page, 'name', 'twitter:card'), 'summary_large_image'],
      ['og:type', meta(page, 'property', 'og:type'), 'website'],
      ['og:image:width', meta(page, 'property', 'og:image:width'), '1200'],
      ['og:image:height', meta(page, 'property', 'og:image:height'), '630'],
    ];
    for (const [name, got, want] of expected) if (got !== want) problems.push(`${locale} ${name}: ${JSON.stringify(got)?.slice(0, 60)} != ${JSON.stringify(want).slice(0, 60)}`);
  }
  check(`the share preview tags (og:/twitter: description, title, card, image size) are right in all ${OPEN.length} languages, with the preview's own description line`, problems.length === 0, problems.slice(0, 3).join(' | '));
}
const cards = new Map();
for (const loc of OPEN) {
  const r = await get(`/og?locale=${loc}&v=4`);
  const bytes = Buffer.from(await r.arrayBuffer());
  cards.set(loc, bytes);
  check(`/og?locale=${loc}: 200 image/png, 1200x630, > 10 KB`, r.status === 200 && r.headers.get('content-type') === 'image/png' && bytes.length > 10_000 && bytes.readUInt32BE(16) === 1200 && bytes.readUInt32BE(20) === 630, `${r.status} ${r.headers.get('content-type')} ${bytes.length}`);
}
// docs/adr/0026: the Arabic and Chinese cards carry their own language (they used to be the English card): every card differs from every other.
const distinct = new Set([...cards.values()].map((bytes) => bytes.toString('base64'))).size;
check(`each of the ${OPEN.length} share cards is its own picture (Arabic and Chinese are no longer the English card)`, distinct === OPEN.length, `${distinct} distinct of ${OPEN.length}`);
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
if (BRIEFING_ON) {
  // The form is offered: the long KVKK / GDPR draft that describes it (components/sections/LegalPage.tsx), still with its placeholders and its draft notice.
  for (const [path, edited, sections] of [['/privacy', /Last edited:/, 9], ['/tr/privacy', /Son düzenleme:/, 9], ['/imprint', /Last edited:/, 5], ['/tr/imprint', /Son düzenleme:/, 5]]) {
    const res = await get(path);
    const body = await res.text();
    const ids = [...body.matchAll(/<section[^>]*id="privacy-(p\d)"/g)].map((m) => m[1]);
    const count = path.endsWith('privacy') ? ids.length : (body.match(/<h2\b/g) ?? []).length;
    check(`${path}: ${sections} sections${path.endsWith('privacy') ? ' with ids' : ''}, a "last edited" line and the draft notice`, res.status === 200 && count === sections && edited.test(body) && /Draft:|Taslak:/.test(body), `status ${res.status}, ${count} sections`);
  }
  const privacyHtml = await (await get('/privacy')).text();
  check('privacy sections follow the notice order: responsible, briefing, collection, priority class, ...', JSON.stringify([...privacyHtml.matchAll(/<section[^>]*id="privacy-(p\d)"/g)].map((m) => m[1])) === JSON.stringify(['p1', 'p2', 'p8', 'p9', 'p3', 'p4', 'p5', 'p6', 'p7']));
  // The contact step is drawn in the browser, so the link is not a tag in the server HTML; its address travels in the component data.
  check('the briefing consent link is handed the section it consents to (/privacy#privacy-p2)', /\/privacy#privacy-p2/.test(html));
} else {
  // No form: the short, finished notices (components/sections/LegalNotice.tsx, docs/adr/0035). No placeholder, no draft banner, no mention of a lawyer.
  const DRAFT_TRACE = /\[|\bDraft\b|\bTaslak\b|lawyer|avukat|TODO|lorem/i;
  for (const [path, lead, must] of [
    ['/privacy', 'What this website does with data', ['Vercel', 'sets no cookies and runs no analytics', 'Last updated:']],
    ['/tr/privacy', 'Bu web sitesinin veriyle ne yaptığı', ['Vercel', 'çerez bırakmaz ve analitik çalıştırmaz', 'Son güncelleme:']],
    ['/imprint', 'SyncFlow is an independent digital engineering studio in its founding stage.', ['Registration details will be published once complete.', 'Last updated:']],
    ['/tr/imprint', 'SyncFlow, kuruluş aşamasında bağımsız bir dijital mühendislik stüdyosudur.', ['Kayıt bilgileri tamamlandığında yayımlanacaktır.', 'Son güncelleme:']],
  ]) {
    if (!OPEN.includes(path.startsWith('/tr') ? 'tr' : 'en')) continue;
    const res = await get(path);
    const body = await res.text();
    const shown = visibleText(body);
    const headings = (body.match(/<h2\b/g) ?? []).length;
    const wanted = (path.endsWith('privacy') ? 4 : 0) + (CONTACT ? 1 : 0);
    const trace = shown.match(DRAFT_TRACE)?.[0];
    check(
      `${path}: the short notice (${wanted} sections), finished: no placeholder, draft banner or lawyer note, and no brace left unfilled`,
      res.status === 200 && body.includes(lead) && must.every((piece) => body.includes(piece)) && headings === wanted && !trace && !/\{email\}/.test(body) && (!CONTACT || mailLinks(body).some((link) => link.to === CONTACT)),
      `status ${res.status}, ${headings} sections, trace ${JSON.stringify(trace)}`,
    );
  }
}

/* ── 3. Briefing API hardening ───────────────────────────────────────────────────────────────── */
section('Briefing API: validation, abuse defences');
if (!BRIEFING_ON) {
  // The form is switched off (lib/flags.ts, docs/adr/0035): the route does not exist for any method, and no check of it can be reached.
  const methods = await Promise.all(['GET', 'HEAD', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'].map(async (method) => [method, (await get('/api/briefing', { method })).status]));
  check('the briefing API does not exist while the form is switched off: GET, HEAD, OPTIONS, PUT, PATCH and DELETE answer 404', methods.every(([, status]) => status === 404), methods.map(([m, s]) => `${m} ${s}`).join(', '));
  check('POST /api/briefing answers 404 even from the same origin with a valid body (nothing is validated, verified or delivered)', (await post(valid())).status === 404);
  check('a malformed body, a foreign origin and a wrong content type are 404 too, not 400, 403 or 415', (await post('{"name":', { raw: true })).status === 404 && (await post(valid(), { headers: { origin: 'https://evil.example' } })).status === 404 && (await post('x=1', { raw: true, headers: { 'content-type': 'text/plain' } })).status === 404);
  check('the 404 is never cached and carries no body', (await get('/api/briefing')).headers.get('cache-control') === 'no-store');
} else {
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
    check('a briefing without a Turnstile token is refused (403 verification)', noToken.status === 403 && noTokenJson.code === 'verification', JSON.stringify(noTokenJson));
  } else if (TURNSTILE_MODE === 'unset') {
    const res = await post(valid());
    check('production without TURNSTILE_SECRET_KEY refuses the form (503)', res.status === 503, `status ${res.status}`);
  } else {
    check('development without TURNSTILE_SECRET_KEY skips the check (no token needed)', (await post(valid({ elapsedMs: 120 }))).status === 200);
  }
}
if (BRIEFING_ON && mock && TURNSTILE_MODE !== 'unset') {
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
    ['top band with a decision maker -> high', { budget: 't3', role: 'decider' }, 'high'],
    ['top band with the decision team -> high', { budget: 't3', role: 'team' }, 'high'],
    ['top band but only exploring -> medium', { budget: 't3', role: 'exploring' }, 'medium'],
    ['second band with a decision maker -> high', { budget: 't2', role: 'decider' }, 'high'],
    ['second band but only exploring -> medium', { budget: 't2', role: 'exploring' }, 'medium'],
    ['entry band (at the minimum) -> medium', { budget: 't1', role: 'decider' }, 'medium'],
  ];
  for (const [label, over, want] of tiers) {
    received.length = 0;
    const res = await post(valid(over));
    const got = received[0] ? JSON.parse(received[0].body).tier : undefined;
    check(`tier: ${label}`, res.status === 200 && got === want, `status ${res.status}, tier ${got}`);
  }
  check('a tier sent by the browser is rejected (strict schema)', (await post({ ...valid(), tier: 'high' })).status === 422);

  // The qualification (docs/adr/0016): nothing under the minimum is accepted. The old bands, "let us talk first" and any made-up code are refused and never delivered.
  received.length = 0;
  for (const budget of ['b5', 'b10', 'b20', 'talk', 'under', 'free', '']) {
    const res = await post(valid({ budget }));
    check(`budget "${budget}" is refused (422), it is not a band above the minimum`, res.status === 422, `status ${res.status}`);
  }
  check('none of the refused budgets reached the webhook', received.length === 0, `received ${received.length}`);

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

  // 5) The market chosen on the entry gate (docs/adr/0015) is an optional tag: whitelisted, delivered when present, absent otherwise.
  received.length = 0;
  const tagged = await post(valid({ market: 'tr' }));
  const taggedPayload = received[0] ? JSON.parse(received[0].body) : {};
  check('a briefing with a market tag is delivered with market "tr"', tagged.status === 200 && taggedPayload.market === 'tr', `status ${tagged.status}, market ${taggedPayload.market}`);
  for (const market of ['us', 'me', 'dach', 'fr', 'wealth', 'asia']) {
    received.length = 0;
    const res = await post(valid({ market }));
    check(`market "${market}" is accepted and delivered as a tag`, res.status === 200 && received[0] && JSON.parse(received[0].body).market === market, `status ${res.status}`);
  }
  received.length = 0;
  check('the retired markets "int" and "eu" are not API values (the browser maps them to "us" and "dach")', (await post(valid({ market: 'int' }))).status === 422 && (await post(valid({ market: 'eu' }))).status === 422 && received.length === 0);
  received.length = 0;
  check('every public language is accepted by the API as the page language', (await Promise.all(OPEN.map((locale) => post(valid({ locale }))))).every((res) => res.status === 200));
  received.length = 0;
  const moon = await post(valid({ market: 'moon' }));
  check('an unknown market is rejected (strict enum) and never delivered', moon.status === 422 && received.length === 0, `status ${moon.status}, received ${received.length}`);
}

section('Scene videos (docs/adr/0003, 0006)');
const mediaTypes = { mp4: 'video/mp4', webm: 'video/webm', webp: 'image/webp' };
let mediaOk = true;
let mediaDetail = '';
for (const name of ['monolith', 'estate', 'clinic', 'law', 'logistics']) {
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
check('all 15 scene files are served with the right content type (5 scenes x mp4/webm/webp)', mediaOk, mediaDetail);
const ranged = await get('/media/clips/estate.mp4', { headers: { range: 'bytes=0-99' } });
check('the mp4 answers byte-range requests (preload="none" needs it)', ranged.status === 206 && /^bytes 0-99\//.test(ranged.headers.get('content-range') ?? '') && ranged.headers.get('accept-ranges') === 'bytes', `${ranged.status} ${ranged.headers.get('content-range')} ${ranged.headers.get('accept-ranges')}`);
await ranged.arrayBuffer();
const cached = (await get('/media/clips/estate.webp')).headers.get('cache-control') ?? '';
check('scene files are cacheable for a week with background revalidation', /max-age=604800/.test(cached) && /stale-while-revalidate/.test(cached), cached);
check('the old architecture film is gone (404)', (await get('/media/showcase/architecture-en-wide.mp4')).status === 404);

/* ── Architectural breakdowns, Studio, simulators, flags (docs/adr/0020) ───────────────────────────────────────────────────── */
section('Case studies, Studio, simulators and flags (docs/adr/0020)');
const metricsSource = (await import('node:fs')).readFileSync(new URL('../lib/metrics.ts', import.meta.url), 'utf8');
const metric = (name) => Number(new RegExp(`${name}: \\{ value: ([0-9.]+)`).exec(metricsSource)?.[1]);
const perfDesktop = metric('lighthousePerformance');
const perfMobile = metric('lighthousePerformanceMobile');
const lcpSeconds = (metric('lcpDesktop') / 1000).toFixed(1);
const stripTags = (markup) => markup.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
const FORBIDDEN_IN_BREAKDOWN = /zero[- ]latency|sıfır gecikme|photo-?real|fotogerçek|SOC ?2|ISO ?27001|certified partner|sertifikalı ortak|\b99\.\d+ ?%|\b(?:uptime|SLA)\s*(?:of|:)\s*\d/i;
let breakdownFailures = [];
for (const locale of OPEN) {
  for (const slug of SLUGS) {
    const res = await get(breakdownPath(locale, slug));
    const body = await res.text();
    const text = normalise(stripTags(body));
    const ids = ['challenge', 'solution', 'integration', 'impact'].map((id) => body.includes(`id="bd-${id}"`));
    const canonical = new RegExp(`<link rel="canonical" href="[^"]*${breakdownPath(locale, slug).replace(/\//g, '\\/')}"`).test(body);
    const hreflangs = (body.match(/<link rel="alternate" hrefLang="/g) ?? body.match(/<link rel="alternate" hreflang="/g) ?? []).length;
    // Structured data: a WebPage that names its own address and a two-step BreadcrumbList (lib/jsonld.ts buildBreakdownJsonLd).
    let graph = [];
    try {
      graph = JSON.parse(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/.exec(body)?.[1] ?? '{}')['@graph'] ?? [];
    } catch {
      graph = [];
    }
    const page = graph.find((node) => node['@type'] === 'WebPage');
    const crumbs = graph.find((node) => node['@type'] === 'BreadcrumbList');
    const ld = Boolean(page) && page.url.endsWith(breakdownPath(locale, slug)) && crumbs?.itemListElement?.length === 2 && crumbs.itemListElement[1].item === page.url;
    const ok = res.status === 200 && /<h1\b/.test(body) && ids.every(Boolean) && canonical && ld && hreflangs >= OPEN.length + 1 && /noindex/.test(body) === false && !FORBIDDEN_IN_BREAKDOWN.test(text) && text.includes(`${perfDesktop} · ${perfMobile}`) && new RegExp(`${lcpSeconds.replace('.', '[.,]')}\\s?s\\b`).test(text) && /0[.,]00/.test(text);
    if (!ok) breakdownFailures.push(`${locale}/${slug}: status ${res.status}, parts ${ids.join('')}, canonical ${canonical}, structured data ${ld}, hreflang ${hreflangs}`);
  }
}
check(`all ${OPEN.length * SLUGS.length} breakdown pages (${SLUGS.length} specimens x ${OPEN.length} languages): 200, one h1, the four parts, canonical, structured data, hreflang, indexable, the published numbers and none of the forbidden claims`, breakdownFailures.length === 0, breakdownFailures.slice(0, 3).join(' | '));
/* ── The architectural R&D specimens (docs/adr/0032-rd-specimens.md): two pages in every language ─────────────────────────────────── */
{
  const fs = await import('node:fs');
  // What the reference queue does on its scenarios is read from the file the contract tests keep equal to the code (docs/architecture/examples/scenarios.json).
  const scenarios = JSON.parse(fs.readFileSync(new URL('../docs/architecture/examples/scenarios.json', import.meta.url), 'utf8'));
  const sum = (key) => scenarios.reduce((n, r) => n + r[key], 0);
  const queue = { n: scenarios.length, accepted: sum('accepted'), lost: sum('lost'), dead: sum('deadLettered'), dropped: sum('duplicatesDroppedAtReceiver') + sum('duplicatesDroppedAtQueue'), twice: scenarios.reduce((n, r) => n + (r.appliedAtReceiver - r.appliedDistinct), 0) };
  // No frame-budget figure the site has not measured: the measured cadence is 16.7 ms (60 Hz); "14 ms" would be a number nobody measured.
  const UNMEASURED = /\b14\s?ms\b|14\s?毫秒|14\s?مللي|14\s?milisegundos/i;
  const decode = (text) => text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  // A legal status, a certification or an availability percentage is a statement about law and contracts, not about code (mirrors the home-page check below).
  const UNBACKED_ON_PAGES = /SOC ?2|ISO ?27001|GDPR[- ](?:compliant|certified)|compliant with (?:the )?GDPR|DSGVO[- ]konform|conforme (?:au |al |con el )?(?:RGPD|GDPR)|符合\s?GDPR|GDPR\s?合规|\b99[.,]9\d?\s?%|\bSLA\s*(?:of|:)\s*\d|\buptime\s*(?:of|:)\s*\d/i;
  const problems = [];
  for (const locale of OPEN) {
    const m = JSON.parse(fs.readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), 'utf8')).Specimen;
    for (const [slug, key] of [['studio-site', 'studioSite'], ['fail-safe-queue', 'failSafeQueue']]) {
      const path = specimenPath(locale, slug);
      const res = await get(path);
      const body = await res.text();
      const text = normalise(decode(stripTags(body)));
      const ids = ['challenge', 'solution', 'integration', 'impact'].map((id) => body.includes(`id="bd-${id}"`));
      const canonical = new RegExp(`<link rel="canonical" href="[^"]*${path.replace(/\//g, '\\/')}"`).test(body);
      const hreflangs = (body.match(/<link rel="alternate" hrefLang="/g) ?? body.match(/<link rel="alternate" hreflang="/g) ?? []).length;
      let graph = [];
      try {
        graph = JSON.parse(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/.exec(body)?.[1] ?? '{}')['@graph'] ?? [];
      } catch {
        graph = [];
      }
      const page = graph.find((node) => node['@type'] === 'WebPage');
      const ld = Boolean(page) && page.url.endsWith(path);
      const words = [m.note, m[key].title, m[key].scenario, m[key].r1Title, m.p1Title, m.p2Title, m.p3Title, m.impactTitle].map((s) => normalise(s));
      const missing = words.filter((w) => !text.includes(w));
      const numbers =
        slug === 'studio-site'
          ? text.includes(`${perfDesktop} · ${perfMobile}`) && /16[.,]7 · 16[.,]9/.test(text) && /0[.,]00/.test(text)
          : new RegExp(`${queue.accepted}`).test(text) && text.includes(String(queue.n)) && new RegExp(`${queue.dropped}`).test(text) && new RegExp(`${queue.dead}\\s`).test(text);
      // While the briefing form is off, Specimen 01 (the pipeline of that form) is labelled a reference architecture, not a form a visitor can use (docs/adr/0035);
      // a language without the key shows the English label (lib/merge-messages.ts).
      const enSpecimen = JSON.parse(fs.readFileSync(new URL('../messages/en.json', import.meta.url), 'utf8')).Specimen;
      const labelled = BRIEFING_ON || slug !== 'studio-site' || text.includes(normalise(m.studioSite.tagReference ?? enSpecimen.studioSite.tagReference));
      const ok = res.status === 200 && /<h1\b/.test(body) && ids.every(Boolean) && canonical && ld && hreflangs >= OPEN.length + 1 && !/noindex/.test(body) && missing.length === 0 && labelled && numbers && !FORBIDDEN_IN_BREAKDOWN.test(text) && !UNMEASURED.test(text) && !UNBACKED_ON_PAGES.test(text);
      if (!ok) problems.push(`${locale}/${slug}: status ${res.status}, parts ${ids.join('')}, canonical ${canonical}, ld ${ld}, hreflang ${hreflangs}, missing ${missing.map((w) => w.slice(0, 20)).join('|')}, reference label ${labelled}, numbers ${numbers}`);
    }
  }
  check(`all ${OPEN.length * SPEC_SLUGS.length} R&D specimen pages (2 specimens x ${OPEN.length} languages): 200, one h1, the four parts, canonical, structured data, hreflang, indexable, their translated texts, the measured or computed figures, and no unmeasured frame budget, certification or SLA claim`, problems.length === 0, problems.slice(0, 3).join(' | '));
  const home = await (await get('/?m=us')).text();
  const cards = [...home.matchAll(/data-specimen="([a-z-]+)"/g)].map((x) => x[1]);
  check('the home page (Studio) links to both R&D specimens', SPEC_SLUGS.every((slug) => cards.includes(slug)) && SPEC_SLUGS.every((slug) => home.includes(`href="/specimens/${slug}"`)), cards.join(','));
  check('an unknown specimen and a dormant language are 404', (await get('/specimens/nope')).status === 404 && (await get('/ja/specimens/studio-site')).status === 404);
}
const enBreakdown = await (await get('/showcase/law')).text();
// The fourth heading was "Measured impact & ROI"; ROI promised a return nobody had measured, so the heading and its sub-heading no longer name one (docs/adr/0035, correction round).
check('the English law breakdown names its four headings in the required order, and names no ROI', /Challenge[\s\S]*Architectural solution[\s\S]*Integration &amp; security[\s\S]*Measured impact/.test(enBreakdown) && !/\bROI\b|Return on investment/.test(enBreakdown.replace(/<script[\s\S]*?<\/script>/g, ' ')));
if (CONTACT && !BRIEFING_ON) {
  // The closing action of a case page is a mail button; the address is also plain text under it (lib/server/cta.ts, components/sections/BreakdownView.tsx).
  const closingBlock = /<footer class="bd-cta">[\s\S]*?<\/footer>/.exec(enBreakdown)?.[0] ?? '';
  check('a case page ends with a mail button to the configured address and the address as plain text under it', mailLinks(closingBlock).some((link) => link.to === CONTACT) && closingBlock.replace(/<[^>]+>/g, ' ').includes(CONTACT), closingBlock.slice(0, 120));
}

/* ── Trust signals that are true, and no claim the studio cannot back (docs/adr/0025-honest-trust-signals.md) ───────────────────── */
{
  const fs = await import('node:fs');
  const decode = (text) => text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  // A legal status, a certification or an availability percentage is a statement about law and contracts, not about code (mirrors faz2-denetim.mjs).
  const UNBACKED = /SOC ?2|ISO ?27001|GDPR[- ](?:compliant|certified)|compliant with (?:the )?GDPR|DSGVO[- ]konform|conforme (?:au |al |con el )?(?:RGPD|GDPR)|符合\s?GDPR|GDPR\s?合规|\b99[.,]9\d?\s?%|\bSLA\s*(?:of|:)\s*\d|\buptime\s*(?:of|:)\s*\d/i;
  const missing = [];
  const claims = [];
  const drawing = [];
  const RATE_DRAWN = '5 req / 10 min';
  const BUDGET_DRAWN = '2 attempts, < 9.5 s';
  // A language without a key shows the English text (lib/merge-messages.ts).
  const enStudio = JSON.parse(fs.readFileSync(new URL('../messages/en.json', import.meta.url), 'utf8')).Studio;
  for (const locale of OPEN) {
    const messages = JSON.parse(fs.readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), 'utf8'));
    const page = await get(locale === 'en' ? '/' : `/${locale}`);
    const raw = await page.text();
    const text = normalise(decode(stripTags(raw)));
    // With the form off, Drawing 01 (its path) is a reference architecture and says so; with the form on it is the form's own path and carries no such label (docs/adr/0035).
    // The second fact names the bot check of the form only while the form exists.
    const reference = text.includes(normalise(`${messages.Studio.referenceLabel ?? enStudio.referenceLabel} — ${messages.Studio.drawingLabel}`));
    if (reference === BRIEFING_ON) drawing.push(`${locale}: the "reference architecture" label is ${reference ? 'shown' : 'missing'} while the form is ${BRIEFING_ON ? 'on' : 'off'}`);
    if (!text.includes(normalise(BRIEFING_ON ? messages.Studio.f2Text : (messages.Studio.f2TextNoForm ?? enStudio.f2TextNoForm)))) missing.push(`${locale}: the second fact (${BRIEFING_ON ? 'with' : 'without'} the form)`);
    if (!BRIEFING_ON && text.includes(normalise(messages.Studio.f2Text))) claims.push(`${locale}: the second fact still names the bot check of a form that is off`);
    // The founding statement (docs/adr/0031) and what each budget level typically includes (the form draws all of it, a level shown on a choice).
    // With the form off none of the form's strings is on the page. The chips about a mutual NDA and a 24-hour answer are never shown (docs/adr/0035).
    const scope = BRIEFING_ON ? ['scopeTitle', 'scopeNote', 't1s1', 't1s2', 't1s3', 't2s1', 't2s2', 't2s3', 't3s1', 't3s2', 't3s3'].map((key) => messages.Briefing.budget[key]) : [];
    const wanted = [...['manifestoTitle', 'm1Title', 'm3Title', 'm5Title', 'f1Name', 'f2Name', 'f3Name', 'foundingLabel', 'founding'].map((key) => messages.Studio[key]), ...(BRIEFING_ON ? [messages.Briefing.chipPrivacy] : []), ...scope];
    for (const line of wanted) if (!text.includes(normalise(line))) missing.push(`${locale}: ${line.slice(0, 30)}`);
    for (const key of ['chipNda', 'chipPerson']) if (text.includes(normalise(messages.Briefing[key]))) claims.push(`${locale}: ${key}`);
    if (UNBACKED.test(text)) claims.push(locale);
    // Drawing 01 (docs/adr/0028): its translated frame, both layouts named for assistive technology, and the annotations the sheet is made of.
    for (const key of ['drawingLabel', 'drawingTitle', 'drawingLead', 'drawingLegend']) if (!text.includes(normalise(messages.Studio[key]))) drawing.push(`${locale}: ${key}`);
    const named = decode(raw).split(`aria-label="${messages.Studio.drawingAlt}"`).length - 1;
    if (named !== 2) drawing.push(`${locale}: ${named} svg(s) carry the translated description (want 2: wide and narrow)`);
    for (const piece of ['ONE ROUTE · /api/briefing', 'FAILS CLOSED', RATE_DRAWN, BUDGET_DRAWN]) if (!text.includes(piece)) drawing.push(`${locale}: "${piece}" missing from the sheet`);
  }
  check(`the manifesto and the three checkable facts${BRIEFING_ON ? ', the briefing chip and its budget scope' : ''} are on the home page in all ${OPEN.length} languages`, missing.length === 0, missing.slice(0, 3).join(' | '));
  check('no home page carries a SOC 2, ISO 27001, GDPR-compliant, 99.9 % or SLA claim, a mutual NDA or a 24-hour answer (a studio cannot back them from code)', claims.length === 0, claims.join(', '));
  check(`Drawing 01 (the briefing path) is on the home page in all ${OPEN.length} languages: translated heading, legend and description on both layouts, English sheet annotations`, drawing.length === 0, drawing.slice(0, 3).join(' | '));
}
check('every breakdown says it is a specimen, not client work', (await Promise.all(SLUGS.map(async (slug) => (await (await get(breakdownPath('en', slug))).text()).includes('not client work')))).every(Boolean));
const clinicEn = normalise(stripTags(await (await get('/showcase/clinic')).text()));
check('the clinic breakdown keeps to the health-advertising rules (no price, no testimonial, no results gallery offered; it says so)', /no prices, discounts, galleries of results or patient testimonials/.test(clinicEn) && !/(?:from|only|starting at) [$€£]\s?\d/.test(clinicEn));
const lawEn = normalise(stripTags(await (await get('/showcase/law')).text()));
check('the law breakdown keeps to the advertising rules (it says no client is solicited; nothing is published without partner approval)', /no client is solicited/.test(lawEn) && /until a partner has approved/.test(lawEn));
check('the integration part names Salesforce, SAP and Oracle as examples, with the no-partnership note', /Salesforce[\s\S]*SAP[\s\S]*Oracle/.test(lawEn) && /no partnership or certification is implied/.test(lawEn));

const showcaseRedirect = await get('/showcase');
check('/showcase has no page of its own: it leads to the section (307 to /#showcase)', showcaseRedirect.status === 307 && /\/#showcase$/.test(showcaseRedirect.headers.get('location') ?? ''), `${showcaseRedirect.status} ${showcaseRedirect.headers.get('location')}`);
check('an unknown specimen is a 404', (await get('/showcase/saas')).status === 404);
for (const closed of CLOSED) check(`${closed}: a breakdown in a closed language is a 404`, (await get(`/${closed}/showcase/estate`)).status === 404);

const getFresh = (path) => get(path, { headers: { 'x-forwarded-for': uniqueIp() } });
let apiFailures = [];
for (const locale of OPEN) {
  for (const slug of SLUGS) {
    const res = await getFresh(`/api/breakdown?slug=${slug}&locale=${locale}`);
    const json = await res.json().catch(() => null);
    const good = res.status === 200 && json?.ok === true && json.data?.slug === slug && json.data?.locale === locale && json.data?.parts?.length === 3 && json.data?.impact?.tiles?.length === 4 && res.headers.get('cache-control') === 'no-store';
    if (!good) apiFailures.push(`${locale}/${slug}: ${res.status}`);
  }
}
check(`/api/breakdown answers JSON for all ${OPEN.length * SLUGS.length} specimens and languages (3 parts, 4 measured tiles, no-store)`, apiFailures.length === 0, apiFailures.slice(0, 3).join(' | '));
check('/api/breakdown whitelists both parameters (unknown slug, unknown or closed language, nothing: 404; nothing is echoed)', (await getFresh('/api/breakdown?slug=saas&locale=en')).status === 404 && (await getFresh('/api/breakdown?slug=law&locale=xx')).status === 404 && (await getFresh('/api/breakdown?slug=law&locale=ja')).status === 404 && (await getFresh('/api/breakdown')).status === 404 && !(await (await getFresh('/api/breakdown?slug=<script>&locale=en')).text()).includes('<script>'));
check('the breakdown API carries a locked-down CSP (default-src none)', (await getFresh('/api/breakdown?slug=law&locale=en')).headers.get('content-security-policy')?.includes("default-src 'none'") === true);

let homeFailures = [];
for (const locale of OPEN) {
  const page = (await pageAs(locale === 'en' ? '/?m=us' : `/${locale}?m=${{ tr: 'tr', ar: 'me', de: 'dach', fr: 'fr', es: 'wealth', zh: 'asia' }[locale]}`)).page.replace(/<script[\s\S]*?<\/script>/g, '');
  const nav = (page.match(/<nav[^>]*class="[^"]*lg:flex[^"]*"[\s\S]*?<\/nav>/) ?? [''])[0];
  const ok =
    page.includes('id="studio"') && page.includes('id="how-we-built-it"') && (page.match(/<details class="note"/g) ?? []).length === 3 &&
    page.includes('data-sim="queue"') && page.includes('data-sim="security"') && (page.match(/data-breakdown-link/g) ?? []).length === 8 &&
    nav.includes('#studio') && (page.match(/data-flag=/g) ?? []).length >= OPEN.length + 1 && !/[\u{1F1E6}-\u{1F1FF}]/u.test(page) &&
    !/\sposter="/.test(page) && (page.match(/<img[^>]+media\/clips[^>]+loading="lazy"/g) ?? []).length >= 5 &&
    !FORBIDDEN_IN_BREAKDOWN.test(normalise(stripTags(page)));
  if (!ok) homeFailures.push(locale);
}
check(`the home page, in every language: Studio with its three notes, both simulators drawn idle, 4 breakdown pills + 4 card hit areas, SVG flags (no emoji), a fourth nav link, lazy stills and no video poster attribute`, homeFailures.length === 0, `failing: ${homeFailures.join(', ')}`);
const enHome = normalise(stripTags((await pageAs('/?m=us')).page));
check('the Studio text states zero defects as a method, never as a guarantee, and promises no NDA and no answer time (docs/adr/0035)', /Zero defects, as a method/.test(enHome) && /never a promise we could sign/.test(enHome) && !/\bNDA\b/.test(enHome) && !/within 24 hours/i.test(enHome) && !/guarantee/i.test(enHome.slice(enHome.indexOf('Exact by habit'), enHome.indexOf('Exact by habit') + 6000)));
check('the Studio engineering notes state the real tolerances (pixel ratio 1.25, 24 ms, 1.2 s, 88 px, 16.7 ms)', ['1.25', '24 ms', '1.2 s', '88 px', '16.7 ms'].every((t) => enHome.includes(t)));
check('the old still failover schematic is gone: the card holds the live simulator instead', !enHome.includes('A schematic of the pattern, not a measurement') && enHome.includes('A model of the pattern, not a measurement of a real system'));
check('the security simulator says it uses throwaway keys, names no certification and no partnership', /throwaway keys/.test(enHome) && /no partnership with the products named is implied/.test(enHome));

section('Production performance and enterprise proof (docs/adr/0021)');
{
  const MARKET_OF = { en: 'us', tr: 'tr', ar: 'me', de: 'dach', fr: 'fr', es: 'wealth', zh: 'asia' };
  const INTEGRATION_TITLE = { en: 'One event, four systems', tr: 'Tek olay, dört sistem', ar: 'حدث واحد، أربعة أنظمة', de: 'Ein Ereignis, vier Systeme', fr: 'Un événement, quatre systèmes', es: 'Un evento, cuatro sistemas', zh: '一个事件，四个系统' };
  const SECTIONS = ['architecture', 'showcase', 'studio', ...(BRIEFING_ON ? ['briefing'] : []), 'closing', 'footer'];
  const bad = { skipped: [], complete: [], flags: [], integration: [], menu: [], ghosts: [] };
  for (const locale of OPEN) {
    const raw = (await pageAs(locale === 'en' ? '/?m=us' : `/${locale}?m=${MARKET_OF[locale]}`)).page;
    const cv = raw.match(/class="[^"]*\bcv\b[^"]*"/g) ?? [];
    // The six blocks below the film are skipped until near; the hero and the film are not (they are measured by script).
    if (!(cv.length === SECTIONS.length && SECTIONS.every((name) => raw.includes(`cv-${name}`)) && !/id="(top|film)"[^>]*\bcv\b/.test(raw))) bad.skipped.push(locale);
    // Nothing needs script to be visible: no section is streamed into a hidden block that a script reveals later.
    if (/<template id="B:|<div hidden id="S:|\$RC\(/.test(raw)) bad.complete.push(locale);
    // Flags: one empty element each, never an inline SVG.
    // One flag per public language in the footer, plus the one on the header's language trigger.
    if (!((raw.match(/<span class="flag" data-flag="/g) ?? []).length >= OPEN.length + 1 && !/<svg[^>]*data-flag/.test(raw))) bad.flags.push(locale);
    // The integration model: drawn for the first system on the server, in the page's language, with the first event id in its payload.
    if (!(raw.includes('data-sim="integration"') && raw.includes(INTEGRATION_TITLE[locale]) && raw.includes('SyncflowEventId__c') && raw.includes('3f2a9c1e-7b4d-4e0a-9d51-6c8b2a7e1f40') && (locale === 'en' || !raw.includes('One event, four systems')))) bad.integration.push(locale);
    // The language menu is built on first interest, so it is not in the server's page, and the trigger names no menu that does not exist yet.
    if (raw.includes('class="lang-menu"') || /class="lang-trigger"[^>]*aria-controls/.test(raw)) bad.menu.push(locale);
    // Every simulator line that changes keeps the room of its longest alternative: the invisible alternatives are out of the accessibility tree.
    const ghosts = raw.match(/<span class="reserve-ghost"[^>]*>/g) ?? [];
    if (!(ghosts.length >= 30 && ghosts.every((g) => g.includes('aria-hidden="true"')))) bad.ghosts.push(locale);
  }
  const all = (list) => (list.length === 0 ? '' : `failed in: ${list.join(', ')}`);
  check(`every language: the hero and the film are drawn at once, the ${SECTIONS.length} blocks below them (${SECTIONS.join(', ')}) are skipped until near`, bad.skipped.length === 0, all(bad.skipped));
  check('every language: the page is complete in the first response (no section streamed into a hidden block that a script reveals)', bad.complete.length === 0, all(bad.complete));
  check('every language: flags are one empty element each with a data-flag, none is an inline SVG', bad.flags.length === 0, all(bad.flags));
  check('every language: the integration model is drawn on the server for the first system, in that language, carrying the event id', bad.integration.length === 0, all(bad.integration));
  check('every language: the header language menu is not in the server page (built on first interest) and its trigger points at nothing yet', bad.menu.length === 0, all(bad.menu));
  check('every language: the simulators reserve the room of their longest line with invisible alternatives hidden from assistive technology', bad.ghosts.length === 0, all(bad.ghosts));

  const gate = (await pageAs('/')).page;
  check('the entry gate headline and lead only slide (no delay, no fade): they are the largest text of the first screen', /class="gate-title gate-slide"/.test(gate) && /class="lead gate-slide"/.test(gate) && !/class="gate-title gate-rise"/.test(gate));

  const home = (await pageAs('/?m=us')).page;
  const href = (home.match(/<link rel="stylesheet" href="([^"]+\.css)"/) ?? [])[1];
  const css = href ? await (await get(href)).text() : '';
  check('the stylesheet skips below-fold blocks (content-visibility: auto with a remembered size), lets anchors and deep links draw what they pass, and carries the eight flags', /content-visibility:auto/.test(css) && /contain-intrinsic-block-size:auto/.test(css) && /\.cv\[data-cv-prime\]/.test(css) && /:has\(:target\)/.test(css) && (css.match(/\.flag\[data-flag=/g) ?? []).length === 8, `stylesheet ${href}`);
  check('the media frame and the cards that hold it clip with overflow: clip (a scroll container counted its zoom as layout shift on right-to-left pages)', /\.frame\{[^}]*overflow:clip/.test(css) && /\.beam-card\{[^}]*overflow:clip/.test(css));
  const enHomeText = normalise(stripTags(home));
  check('the integration model says what it is: illustrative shapes, not generated from or validated against a vendor system, no partnership, certification or conformance', /Illustrative shapes/.test(enHomeText) && /not generated from, or validated against, a vendor system/.test(enHomeText) && /no partnership, certification or conformance is implied/.test(enHomeText));
  check('the integration model draws the first system: Salesforce lead, id carried in SyncflowEventId__c, the other three systems named in its tabs', /Salesforce/.test(enHomeText) && /HubSpot/.test(enHomeText) && /Receivables invoice/.test(enHomeText) && /Fields mapped: 10/.test(enHomeText));
}

/* ── Release hygiene (docs/adr/0035-sales-ready-release.md): what a visitor reads, in every public language ─────────────────────────── */
section('Release hygiene: no placeholder, no draft banner, no price, no promise the studio cannot keep, no call to action that leads nowhere');
{
  // The raw HTML always carries "$" and "[" (React's flight data, JavaScript arrays); what counts is the text a visitor reads, so scripts and styles are removed first.
  const PLACEHOLDER = /\[[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ ,.:/&'’-]{2,}\]/;
  const DRAFT_BANNER = /Draft:|Taslak:|have a lawyer review|avukata inceletin|\bTODO\b|lorem ipsum/i;
  const AMOUNT = /[$€₺£]\s?\d|\d\s?[$€₺£]|\b\d[\d.,]*\s?(?:USD|EUR|AED|TRY)\b/;
  const PROMISE = /within 24 hours|24 saat içinde|mutual NDA|karşılıklı (?:bir )?NDA|\binvoiced\b|faturalı|seven languages|7 languages|yedi dil/i;
  const DEAD_CTA = /Start a [Bb]riefing|Strategic Briefing|Briefing Başlat|Stratejik Briefing|Start with a briefing|Send the briefing/;
  // A return nobody has measured is a promise the studio cannot keep (docs/adr/0035, correction round). English and Turkish carry no ROI wording; the five dormant
  // languages keep their old files untouched, so they are outside this check.
  const RETURN_PROMISE = /high-ROI|\bROI\b|return on investment|yatırım getirisi|yüksek getirili|conversion (?:rate|increase|lift|uplift)|dönüşüm (?:oranı|artışı)/i;
  const pages = [];
  for (const locale of OPEN) {
    const prefix = locale === 'en' ? '' : `/${locale}`;
    for (const path of [`${prefix || '/'}?m=${MARKET_OF[locale]}`, `${prefix}/privacy`, `${prefix}/imprint`, `${prefix}/showcase/law`, `${prefix}/specimens/fail-safe-queue`]) pages.push({ path, locale });
  }
  const problems = [];
  for (const { path, locale } of pages) {
    const res = await get(path);
    const body = await res.text();
    const shown = visibleText(body);
    const found = [
      res.status !== 200 && `status ${res.status}`,
      (locale === 'en' || locale === 'tr') && RETURN_PROMISE.test(shown) && `return promise ${shown.match(RETURN_PROMISE)?.[0]}`,
      !BRIEFING_ON && PLACEHOLDER.test(shown) && `placeholder ${shown.match(PLACEHOLDER)?.[0]}`,
      !BRIEFING_ON && DRAFT_BANNER.test(shown) && `draft notice ${shown.match(DRAFT_BANNER)?.[0]}`,
      !PRICING_ON && AMOUNT.test(shown) && `amount ${shown.match(AMOUNT)?.[0]}`,
      PROMISE.test(shown) && `promise ${shown.match(PROMISE)?.[0]}`,
      !BRIEFING_ON && DEAD_CTA.test(shown) && `briefing call to action ${shown.match(DEAD_CTA)?.[0]}`,
      !BRIEFING_ON && /#briefing/.test(body) && 'a link to #briefing',
    ].filter(Boolean);
    if (found.length) problems.push(`${path}: ${found.join('; ')}`);
  }
  check(`${pages.length} pages (home, privacy, imprint, a breakdown and a specimen in ${OPEN.join(', ')}): the text carries none of them`, problems.length === 0, problems.slice(0, 4).join(' | '));
}

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
if (BRIEFING_ON) {
  const ip = uniqueIp();
  const statuses = [];
  for (let i = 0; i < 7; i++) statuses.push((await post(valid({ elapsedMs: 120 }), { ip })).status);
  const limited = await post(valid({ elapsedMs: 120 }), { ip });
  check(`briefing route: first 5 pass, then 429 (statuses ${statuses.join(',')})`, statuses.slice(0, 5).every((s) => s !== 429) && statuses[5] === 429 && limited.status === 429);
  check('429 carries Retry-After', Number(limited.headers.get('retry-after')) > 0, limited.headers.get('retry-after'));
  check('a different address is not affected', (await post(valid({ elapsedMs: 120 }), { ip: uniqueIp() })).status === 200);
}

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
