#!/usr/bin/env node
/**
 * Browser checks against a RUNNING production server (docs/adr/0021-production-performance-and-enterprise-proof.md §6). `npm run smoke` reads
 * the pages over HTTP; this drives a real Chrome (puppeteer-core, a dev dependency that downloads no browser) through what a visitor does and
 * measures what only a browser can show: where an anchor lands, whether anything shifts while scrolling, whether a simulator ever changes
 * height, whether the right-to-left page behaves, whether skipped sections look the same as drawn ones.
 *
 *   npm run build && npm start                       (or: npx next start -p 3100)
 *   npm run qa:browser                               the default set, about four minutes
 *   npm run qa:browser -- http://localhost:3100      another server
 *   npm run qa:browser -- --quick                    the fast set (anchors, shift, one simulator pass), about ninety seconds
 *   npm run qa:browser -- --only=anchors,cls         named groups: gate, anchors, deeplink, cls, sims, integration, type, casestudy, briefing, drawing, cta, scope, specimens, framework, cinema, parity
 *   npm run qa:browser -- --full                     every language and width for the simulators (about 20 minutes)
 *   npm run qa:browser -- --parity                   also compare every page with and without content-visibility, pixel by pixel
 *
 * Read-only: it only reads pages and clicks controls (the briefing form is never submitted). Chrome: CHROME_PATH or a common install path.
 * Exit code 1 when any check fails.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const option = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const BASE = (argv.find((a) => /^https?:/.test(a)) ?? process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const QUICK = flag('quick');
const FULL = flag('full');
const OUT = option('out') ?? join(process.cwd(), 'perf-out', 'browser-flow');
const ONLY = option('only')?.split(',');
const want = (group) => (ONLY ? ONLY.includes(group) : group === 'parity' ? flag('parity') : true);

const chrome =
  process.env.CHROME_PATH ??
  [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].find((candidate) => existsSync(candidate));
if (!chrome) {
  console.error('Chrome not found. Set CHROME_PATH to the browser executable.');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? `\n          ${detail}` : ''}`);
};
const group = (title) => console.log(`\n${title}`);

const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 1 };
const PHONE = { width: 412, height: 823, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true };
const MARKET = { en: 'us', tr: 'tr', ar: 'me', de: 'dach', fr: 'fr', es: 'wealth', zh: 'asia' };
const url = (lang, path = '') => `${BASE}${lang === 'en' ? '' : `/${lang}`}${path || '/'}${path.includes('?') ? '&' : '?'}m=${MARKET[lang]}`.replace('//?', '/?');

const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] });

/** Opens a page with a layout-shift recorder; `noCv` switches content-visibility off for the reference run. */
async function open(path, { viewport = DESKTOP, noCv = false, reduced = false } = {}) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && !/CSP|Content Security|csp-report|Failed to load resource.*(404|429)/.test(m.text()) && errors.push(`console: ${m.text()}`));
  if (reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.setViewport(viewport);
  await page.evaluateOnNewDocument(() => {
    window.__cls = 0;
    // What moved, kept for the failure message: the value, when, and the elements that shifted.
    window.__shiftLog = [];
    const name = (n) => (n ? `${n.nodeName.toLowerCase()}${n.id ? '#' + n.id : ''}${typeof n.className === 'string' && n.className ? '.' + n.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}` : '?');
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.hadRecentInput) continue;
        window.__cls += e.value;
        window.__shiftLog.push(`${Math.round(e.startTime)}ms ${e.value.toFixed(4)} ${e.sources.map((x) => name(x.node?.nodeType === 3 ? x.node.parentElement : x.node)).join(' | ')}`);
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  if (noCv) {
    // The policy is enforced (docs/adr/0024): an inline <style> without the page's nonce is blocked, which silently made the reference run identical to
    // the normal one (the cls and parity comparisons passed without comparing anything). Only the injection is exempted; qa:csp checks the policy itself.
    await page.setBypassCSP(true);
    await page.evaluateOnNewDocument(() => {
      document.addEventListener('DOMContentLoaded', () => {
        const style = document.createElement('style');
        style.textContent = '.cv{content-visibility:visible !important}';
        document.head.appendChild(style);
      });
    });
  }
  await page.goto(path.startsWith('http') ? path : BASE + path, { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(1500);
  return { page, errors };
}

// Scrolling has settled when scrollY has not moved for three consecutive samples (about 360 ms): one equal pair is not enough, the easing of a long
// smooth scroll has plateaus (its first and last frames barely move), and under load a single pair declared "arrived" while the page was still on its way.
const settle = async (page) => {
  await sleep(300);
  let still = 0;
  let last = await page.evaluate(() => scrollY);
  for (let i = 0; i < 80 && still < 3; i++) {
    await sleep(120);
    const now = await page.evaluate(() => scrollY);
    still = now === last ? still + 1 : 0;
    last = now;
  }
  await sleep(250);
};
const topOf = (page, selector) => page.evaluate((s) => Math.round(document.querySelector(s).getBoundingClientRect().top), selector);
const SCROLL_PADDING = 88; // html { scroll-padding-top } in app/globals.css

// ── gate, flags, the language menu ──────────────────────────────────────────────────────────────────────────────────────────────
if (want('gate')) {
  group('The gate, the flags and the language menu');
  const { page, errors } = await open('/');
  await page.waitForSelector('.gate[data-ready]', { timeout: 15000 });
  const gate = await page.evaluate(() => ({
    cards: document.querySelectorAll('.gate-market .flag[data-flag]').length,
    chips: document.querySelectorAll('.gate-lang .flag[data-flag]').length,
    codes: [...document.querySelectorAll('.gate-market .flag[data-flag]')].map((s) => s.dataset.flag).join(','),
    flagsAreSvg: document.querySelectorAll('svg[data-flag]').length,
    emoji: /[\u{1F1E6}-\u{1F1FF}]/u.test(document.body.innerText),
  }));
  check('seven market cards and seven language chips carry a flag, in order, none is an inline SVG or an emoji', gate.cards === 7 && gate.chips === 7 && gate.codes === 'us,tr,ae,de,fr,es,cn' && gate.flagsAreSvg === 0 && !gate.emoji, JSON.stringify(gate));
  const slide = await page.evaluate(() => ({ title: document.querySelector('#gate-title')?.classList.contains('gate-slide'), lead: document.querySelector('.gate-body .lead')?.classList.contains('gate-slide'), leadOpacity: getComputedStyle(document.querySelector('.gate-body .lead')).opacity }));
  check('the gate headline and lead are visible from the first frame (they slide, they do not fade in)', slide.title && slide.lead && slide.leadOpacity === '1', JSON.stringify(slide));
  await page.keyboard.press('Escape');
  await sleep(1500);
  const before = await page.evaluate(() => document.querySelectorAll('.lang-menu').length);
  await page.hover('.lang-trigger');
  await sleep(300);
  const built = await page.evaluate(() => document.querySelectorAll('.lang-menu .lang-item .flag[data-flag]').length);
  check('the header language menu is not in the page until the visitor shows interest, then it lists seven flags', before === 0 && built === 7, `before ${before}, after ${built}`);
  await page.click('.lang-trigger');
  await sleep(500);
  const open_ = await page.evaluate(() => ({ expanded: document.querySelector('.lang-trigger')?.getAttribute('aria-expanded'), controls: document.querySelector('.lang-trigger')?.getAttribute('aria-controls') === document.querySelector('.lang-menu')?.id, current: document.querySelector('.lang-trigger .flag')?.dataset.flag }));
  check('it opens, names its menu for assistive technology, and the trigger shows the current flag', open_.expanded === 'true' && open_.controls && open_.current === 'us', JSON.stringify(open_));
  check('no page or console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await page.close();
}

// ── anchors with content-visibility ──────────────────────────────────────────────────────────────────────────────────────────────
if (want('anchors')) {
  group('Links to a section land on it, with sections below the film skipped until near (docs/adr/0021 §1)');
  const profiles = QUICK ? [['desktop', DESKTOP]] : [['desktop', DESKTOP], ['phone', PHONE]];
  for (const [label, viewport] of profiles) {
    for (const target of QUICK ? ['studio', 'briefing'] : ['architecture', 'showcase', 'studio', 'briefing']) {
      const { page } = await open('/?m=us', { viewport });
      // Any link to the section, wherever it is (the header on a desktop, the footer or the call to action on a phone): it is scrolled to first, which
      // draws a skipped section, then clicked in the page (a click event, which is what the handlers listen for).
      const found = await page.evaluate((t) => {
        const links = [...document.querySelectorAll(`a[href$="#${t}"]`)];
        const pick = links.find((a) => a.closest('header') && a.getClientRects().length > 0) ?? links.find((a) => a.closest('#hero-cta, .sticky-cta') && a.getClientRects().length > 0) ?? links.find((a) => a.closest('footer')) ?? links[0];
        if (!pick) return false;
        pick.setAttribute('data-qa-link', '');
        pick.scrollIntoView({ block: 'center', behavior: 'instant' });
        return true;
      }, target);
      if (!found) {
        check(`${label}: a link to #${target} exists`, false);
        await page.close();
        continue;
      }
      await sleep(500);
      await page.evaluate(() => document.querySelector('[data-qa-link]').click());
      // A link from /?m=us to /#section is a soft navigation (a round trip for the page's RSC payload) and only then the scroll: on a remote server that
      // is a few hundred ms in which scrollY does not move, which `settle` would take for "arrived". Wait for the address to change first.
      await page.waitForFunction((t) => location.hash === `#${t}`, { timeout: 10000 }, target).catch(() => undefined);
      await settle(page);
      const top = await topOf(page, `#${target}`);
      const held = await page.evaluate(() => document.querySelectorAll('.cv[data-cv-prime]').length);
      check(`${label}: the link to #${target} lands at the top of the section (scroll-padding ${SCROLL_PADDING} px), and lets go of the sections it held`, Math.abs(top - SCROLL_PADDING) <= 3 && held === 0, `top ${top}px, still held ${held}`);
      await page.close();
    }
  }
}

if (want('deeplink')) {
  group('A page opened on an address with a section (a deep link), and a soft navigation to one');
  for (const [label, viewport] of QUICK ? [['desktop', DESKTOP]] : [['desktop', DESKTOP], ['phone', PHONE]]) {
    for (const target of ['studio', 'briefing']) {
      const { page } = await open(`/?m=us#${target}`, { viewport });
      await settle(page);
      const top = await topOf(page, `#${target}`);
      const ready = await page.evaluate(() => document.documentElement.hasAttribute('data-cv-ready'));
      check(`${label}: opening /?m=us#${target} lands on the section and the page then marks itself ready`, Math.abs(top - SCROLL_PADDING) <= 3 && ready, `top ${top}px, ready ${ready}`);
      await page.close();
    }
  }
  const { page } = await open('/privacy?m=us');
  const has = await page.evaluate(() => {
    const link = [...document.querySelectorAll('footer a')].find((a) => (a.getAttribute('href') ?? '').endsWith('#briefing'));
    link?.setAttribute('data-qa-link', '');
    link?.scrollIntoView({ block: 'center', behavior: 'instant' });
    return !!link;
  });
  if (has) {
    await sleep(400);
    await page.evaluate(() => document.querySelector('[data-qa-link]').click());
    await sleep(2500);
    await settle(page);
    const top = await page.evaluate(() => (document.querySelector('#briefing') ? Math.round(document.querySelector('#briefing').getBoundingClientRect().top) : null));
    check('a footer link on the privacy page (a soft navigation) lands on the briefing', top !== null && Math.abs(top - SCROLL_PADDING) <= 3, `top ${top}px`);
  } else check('the privacy page has a footer link to #briefing', false);
  await page.close();
}

// ── layout shift while scrolling ─────────────────────────────────────────────────────────────────────────────────────────────────
if (want('cls')) {
  group('Nothing shifts while the page is scrolled top to bottom and back (including right to left)');
  const runs = QUICK
    ? [['ar', 'phone', PHONE]]
    : [['en', 'desktop', DESKTOP], ['en', 'phone', PHONE], ['ar', 'desktop', DESKTOP], ['ar', 'phone', PHONE], ['de', 'phone', PHONE]];
  for (const [lang, label, viewport] of runs) {
    const scrollThrough = async (noCv) => {
      const { page } = await open(url(lang), { viewport, noCv });
      const before = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < before + 2500; y += viewport.isMobile ? 360 : 500) {
        await page.evaluate((v) => window.scrollTo({ top: v, behavior: 'instant' }), y);
        await sleep(110);
      }
      await sleep(700);
      const after = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = after; y > 0; y -= viewport.isMobile ? 700 : 900) {
        await page.evaluate((v) => window.scrollTo({ top: v, behavior: 'instant' }), y);
        await sleep(90);
      }
      await sleep(500);
      const cls = await page.evaluate(() => window.__cls);
      const log = await page.evaluate(() => window.__shiftLog.slice(0, 6));
      const finalHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      await page.close();
      return { cls, before, finalHeight, log };
    };
    const on = await scrollThrough(false);
    const off = await scrollThrough(true);
    check(`${lang} ${label}: layout shift while scrolling is 0.00`, on.cls < 0.005, `CLS ${on.cls.toFixed(4)} (without content-visibility ${off.cls.toFixed(4)})${on.log.length ? `
          shifts: ${on.log.join(' ;; ')}` : ''}`);
    check(`${lang} ${label}: after the scroll the page is as long as the fully drawn page, and the placeholders were within 15 %`, Math.abs(on.finalHeight - off.finalHeight) <= 4 && Math.abs(on.before - off.finalHeight) / off.finalHeight < 0.15, `before ${on.before}px, after ${on.finalHeight}px, fully drawn ${off.finalHeight}px`);
  }
}

// ── the simulators: height, behaviour, right to left ─────────────────────────────────────────────────────────────────────────────
if (want('sims')) {
  group('The simulators keep one height through every state, and do what they say (docs/adr/0021 §4)');
  const combos = FULL
    ? ['en', 'tr', 'ar', 'de', 'fr', 'es', 'zh'].flatMap((lang) => [360, 412, 600, 820, 1024, 1440].map((width) => [lang, width]))
    : QUICK
      ? [['ar', 412]]
      : [['en', 412], ['ar', 412], ['de', 360], ['en', 1440], ['ar', 820]];
  for (const [lang, width] of combos) {
    const mobile = width < 700;
    const { page, errors } = await open(url(lang), { viewport: { width, height: mobile ? 800 : 900, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile } });
    const heights = { queue: [], security: [] };
    const sample = async () => {
      const h = await page.evaluate(() => ({ queue: document.querySelector('.sim[data-sim="queue"]').getBoundingClientRect().height, security: document.querySelector('.sim[data-sim="security"]').getBoundingClientRect().height }));
      heights.queue.push(h.queue);
      heights.security.push(h.security);
    };
    const watch = async (ms) => {
      const t0 = Date.now();
      while (Date.now() - t0 < ms) {
        await sample();
        await sleep(70);
      }
    };
    await sample();
    // A press scrolls the control to the middle of the screen and clicks it in the page: on a phone the sticky call to action covers the bottom edge,
    // where an automatic scroll would leave the button, and this checks the simulator, not where a finger lands.
    const press = (kind, index) =>
      page.evaluate(
        (k, i) => {
          const el = document.querySelectorAll(`.sim[data-sim="${k}"] .sim-controls button`)[i];
          el.scrollIntoView({ block: 'center', behavior: 'instant' });
          el.click();
        },
        kind,
        index,
      );
    await page.evaluate(() => document.querySelector('.sim[data-sim="queue"]').scrollIntoView({ block: 'center', behavior: 'instant' }));
    await watch(1500);
    await press('queue', 0);
    await watch(1800);
    await press('queue', 1);
    await watch(2800);
    const blocked = await page.evaluate(() => ({ parked: document.querySelectorAll('.sim[data-sim="queue"] .q-parcel[data-phase="standby"]').length, flag: document.querySelector('.sim[data-sim="queue"] .q-stage').hasAttribute('data-blocked'), status: document.querySelector('.sim[data-sim="queue"] .sim-status p').textContent }));
    await press('queue', 1);
    // The drain takes about five seconds; wait for it rather than for a fixed time (a busy machine is slower), and keep measuring the height.
    for (let t0 = Date.now(); Date.now() - t0 < 14000; ) {
      await watch(400);
      if ((await page.evaluate(() => Number(document.querySelectorAll('.sim[data-sim="queue"] .q-stats dd')[1]?.textContent))) === 5) break;
    }
    await watch(500);
    const done = await page.evaluate(() => [...document.querySelectorAll('.sim[data-sim="queue"] .q-stats dd')].map((d) => Number(d.textContent)));
    await page.evaluate(() => document.querySelector('.sim[data-sim="security"]').scrollIntoView({ block: 'center', behavior: 'instant' }));
    await watch(1500);
    await press('security', 0);
    await watch(3800);
    const sent = await page.evaluate(() => ({ rows: [...document.querySelectorAll('.sim[data-sim="security"] .s-readout dd > :first-child')].map((d) => d.textContent), nodes: [...document.querySelectorAll('.sim[data-sim="security"] .s-node')].map((n) => n.dataset.state).join(',') }));
    await press('security', 1);
    await watch(2800);
    const replay = await page.evaluate(() => ({ sig: document.querySelectorAll('.sim[data-sim="security"] .s-readout dd > :first-child')[1].textContent, nodes: [...document.querySelectorAll('.sim[data-sim="security"] .s-node')].map((n) => n.dataset.state).join(',') }));
    await page.evaluate(() => document.querySelector('.sim[data-sim="security"] .sim-switch').click());
    await press('security', 0);
    await watch(3200);
    const tampered = await page.evaluate(() => ({ cipher: document.querySelectorAll('.sim[data-sim="security"] .s-readout dd > :first-child')[3].textContent, nodes: [...document.querySelectorAll('.sim[data-sim="security"] .s-node')].map((n) => n.dataset.state).join(',') }));
    const cls = await page.evaluate(() => window.__cls);
    const spread = (list) => Math.round((Math.max(...list) - Math.min(...list)) * 10) / 10;
    const tag = `${lang} ${width}px`;
    check(`${tag}: queue and security simulators keep the same height from idle through every state (${spread(heights.queue)} and ${spread(heights.security)} px)`, spread(heights.queue) <= 1 && spread(heights.security) <= 1, `queue ${Math.round(heights.queue[0])}px, security ${Math.round(heights.security[0])}px`);
    check(`${tag}: no layout shift during the whole run`, cls < 0.005, `CLS ${cls.toFixed(4)}`);
    check(`${tag}: blocking the channel parks events in the standby queue; restoring it delivers all five once, none lost`, blocked.flag && blocked.parked >= 1 && done[0] === 5 && done[1] === 5 && done[2] === 0 && done[3] === 0, JSON.stringify({ blocked, done }));
    check(`${tag}: a message is signed, verified, sealed and delivered; a replay stops at the zero-trust step with the same signature; one altered character is rejected and never sealed`, /^sha256=[0-9a-f]{16}…[0-9a-f]{8}$/.test(sent.rows[1]) && sent.nodes === 'done,done,done,done,done' && replay.sig === sent.rows[1] && replay.nodes.startsWith('done,done,stopped') && tampered.cipher === '—' && tampered.nodes === 'done,done,stopped,skipped,skipped', JSON.stringify({ sent, replay, tampered }));
    check(`${tag}: no page errors`, errors.length === 0, errors.slice(0, 2).join(' | '));
    await page.close();
  }
}

// ── the integration model ────────────────────────────────────────────────────────────────────────────────────────────────────────
if (want('integration')) {
  group('The integration model: four systems, the payload the reference mappers produce, one height (docs/architecture/integrations.md)');
  const EXPECT = { Salesforce: ['fields', 'SyncflowEventId__c', 'LastName'], HubSpot: ['properties', 'syncflow_event_id', 'lastname'], SAP: ['YY1_SyncflowEventId_SDH', 'SoldToParty'], Oracle: ['attribute1', 'InvoiceNumber'] };
  for (const [lang, width] of QUICK ? [['en', 1440]] : [['en', 1440], ['ar', 820], ['de', 412]]) {
    const mobile = width < 700;
    const { page, errors } = await open(url(lang), { viewport: { width, height: mobile ? 823 : 900, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile } });
    const idle = await page.evaluate(() => {
      const el = document.querySelector('.sim[data-sim="integration"]');
      return { live: el.hasAttribute('data-live'), tabs: el.querySelectorAll('.map-tabs button').length, inert: el.querySelector('.map-tabs').hasAttribute('inert'), lines: el.querySelectorAll('.map-line').length };
    });
    check(`${lang} ${width}px: drawn on the server for the first system, tabs reserved but inert`, !idle.live && idle.tabs === 4 && idle.inert && idle.lines >= 8, JSON.stringify(idle));
    await page.evaluate(() => document.querySelector('.sim[data-sim="integration"]').scrollIntoView({ block: 'center', behavior: 'instant' }));
    await sleep(1800);
    const heights = [];
    const sample = async () => heights.push(await page.evaluate(() => document.querySelector('.sim[data-sim="integration"]').getBoundingClientRect().height));
    await sample();
    for (const name of Object.keys(EXPECT)) {
      await page.evaluate((n) => [...document.querySelectorAll('.sim[data-sim="integration"] .map-tabs button')].find((x) => x.textContent === n).click(), name);
      for (let i = 0; i < 8; i++) {
        await sleep(80);
        await sample();
      }
      const shown = await page.evaluate(() => {
        const sim = document.querySelector('.sim[data-sim="integration"]');
        return { json: sim.querySelector('.map-code pre').textContent, status: sim.querySelector('.sim-status p').textContent, pressed: [...sim.querySelectorAll('.map-tabs button[aria-pressed="true"]')].map((x) => x.textContent) };
      });
      let parsed = null;
      try {
        parsed = JSON.parse(shown.json);
      } catch {
        /* reported below */
      }
      check(`${lang} ${width}px: ${name} shows a valid payload carrying the event id in ${EXPECT[name].at(-2) ?? EXPECT[name][0]}, the tab is marked, the sentence has no placeholder left`, parsed !== null && EXPECT[name].every((key) => shown.json.includes(key)) && shown.pressed.length === 1 && shown.pressed[0] === name && !/[{}]/.test(shown.status), JSON.stringify(shown).slice(0, 300));
    }
    const spread = Math.max(...heights) - Math.min(...heights);
    const cls = await page.evaluate(() => window.__cls);
    check(`${lang} ${width}px: the card keeps exactly one height idle, live and on every tab, and nothing shifts`, spread <= 0.5 && cls < 0.005, `spread ${spread.toFixed(1)} px, CLS ${cls.toFixed(4)}`);
    check(`${lang} ${width}px: no page errors`, errors.length === 0, errors.slice(0, 2).join(' | '));
    await page.close();
  }
}

// ── skipped sections look the same as drawn ones ─────────────────────────────────────────────────────────────────────────────────
if (want('parity')) {
  group('Pages look the same with and without content-visibility (every viewport step, one CSS pixel of tolerance)');
  mkdirSync(OUT, { recursive: true });
  const diffPage = await browser.newPage();
  const configs = [['en', DESKTOP], ['en', PHONE], ['ar', DESKTOP], ['de', { width: 820, height: 1180, deviceScaleFactor: 1 }], ['zh', PHONE]];
  for (const [lang, viewport] of configs) {
    const walk = async (noCv) => {
      const { page } = await open(url(lang), { viewport, noCv, reduced: true });
      const total = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < total; y += Math.round(viewport.height * 0.8)) {
        await page.evaluate((v) => window.scrollTo({ top: v, behavior: 'instant' }), y);
        await sleep(150);
      }
      const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      const shots = [];
      for (let y = 0; y <= max + viewport.height; y += viewport.height) {
        const at = Math.min(y, max);
        await page.evaluate((v) => window.scrollTo({ top: v, behavior: 'instant' }), at);
        await sleep(450);
        shots.push({ y: at, png: await page.screenshot({ type: 'png' }) });
        if (at === max) break;
      }
      await page.close();
      return shots;
    };
    const on = await walk(false);
    const off = await walk(true);
    let bad = 0;
    let worst = 0;
    for (let i = 0; i < Math.min(on.length, off.length); i++) {
      const pct = await diffPage.evaluate(
        async (a, b, radius) => {
          const load = (src) => new Promise((resolve) => { const img = new Image(); img.onload = () => resolve(img); img.src = `data:image/png;base64,${src}`; });
          const [ia, ib] = await Promise.all([load(a), load(b)]);
          const w = Math.min(ia.width, ib.width);
          const h = Math.min(ia.height, ib.height);
          const grab = (img) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0); return ctx.getImageData(0, 0, w, h).data; };
          const da = grab(ia);
          const db = grab(ib);
          let diff = 0;
          for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
              const k = (y * w + x) * 4;
              let best = 1e9;
              for (let dy = -radius; dy <= radius && best > 60; dy++) for (let dx = -radius; dx <= radius; dx++) { const m = ((y + dy) * w + x + dx) * 4; const d = Math.abs(da[k] - db[m]) + Math.abs(da[k + 1] - db[m + 1]) + Math.abs(da[k + 2] - db[m + 2]); if (d < best) best = d; }
              if (best > 60) diff++;
            }
          }
          return (diff / (w * h)) * 100;
        },
        on[i].png.toString('base64'),
        off[i].png.toString('base64'),
        // One CSS pixel of rounding is Math.ceil(device pixel ratio) device pixels: a phone at 1.75x snaps a text line by up to two.
        Math.ceil(viewport.deviceScaleFactor),
      );
      worst = Math.max(worst, pct);
      // A missing, clipped or moved block is several percent of a screen; text lines that snap to another device pixel are a few tenths at most:
      // with Inter Display's fractional line heights the German 820 px page sits one device pixel lower below one section (0.327 %, checked by eye:
      // identical layout, text edges anti-aliased at another sub-pixel offset), so the line is 0.5 %, still about ten times below the smallest real defect.
      if (pct > 0.5) {
        bad++;
        writeFileSync(join(OUT, `${lang}-${viewport.width}-${on[i].y}-on.png`), on[i].png);
        writeFileSync(join(OUT, `${lang}-${viewport.width}-${on[i].y}-off.png`), off[i].png);
      }
    }
    check(`${lang} ${viewport.width}px: ${on.length} viewport steps, none differs beyond rounding (the largest difference is ${worst.toFixed(3)} % of a screen)${bad ? `; ${bad} differ, saved in ${OUT}` : ''}`, bad === 0 && on.length === off.length);
  }
  await diffPage.close();
}

// ── typography: one face, nothing runs off the screen, the hero stays on two lines, only the fonts the page needs are fetched ─────────
if (want('type')) {
  group('Typography: one text face (Inter Display), headlines on their lines in every language, nothing wider than the screen (docs/adr/0022)');
  const widths = [412, 820, 1440];
  for (const lang of ['en', 'tr', 'de', 'fr', 'es', 'ar', 'zh']) {
    const latin = !['ar', 'zh'].includes(lang);
    const problems = [];
    let fonts = null;
    for (const width of widths) {
      const viewport = width < 700 ? PHONE : { width, height: 900, deviceScaleFactor: 1 };
      const { page } = await open(url(lang), { viewport: width < 700 ? { ...PHONE, width } : viewport });
      const r = await page.evaluate(() => {
        const vw = innerWidth;
        const hero = document.querySelector('.text-hero');
        const lh = hero ? parseFloat(getComputedStyle(hero).lineHeight) : 0;
        const wide = [...document.querySelectorAll('h1,h2,.text-hero,.text-headline,.gate-title,.chapter-line,.how-title,.bd-title')].filter((el) => {
          const b = el.getBoundingClientRect();
          return b.width > 0 && (b.right > vw + 1 || b.left < -1 || el.scrollWidth > el.clientWidth + 1);
        }).map((el) => (el.textContent || '').trim().slice(0, 30));
        const resources = performance.getEntriesByType('resource').filter((e) => /\.woff2/.test(e.name)).map((e) => ({ file: e.name.split('/').pop(), kb: Math.round(e.transferSize / 1024) }));
        return {
          sideways: document.documentElement.scrollWidth > vw,
          heroLines: hero && lh ? Math.round(hero.getBoundingClientRect().height / lh) : 0,
          wide,
          cls: window.__cls,
          resources,
          loaded: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, '')),
          family: getComputedStyle(hero ?? document.body).fontFamily.split(',')[0].replace(/"/g, ''),
        };
      });
      fonts = r;
      if (r.sideways) problems.push(`${width}px scrolls sideways`);
      if (r.wide.length) problems.push(`${width}px: ${r.wide.slice(0, 2).join(' | ')} runs past the screen`);
      if (width >= 820 && r.heroLines > 2) problems.push(`${width}px: the hero takes ${r.heroLines} lines`);
      if (r.cls >= 0.005) problems.push(`${width}px: layout shift ${r.cls.toFixed(4)}`);
      await page.close();
    }
    check(`${lang}: no headline runs past the screen at 412, 820 and 1440 px, the hero is two lines from 820 px up, no layout shift`, problems.length === 0, problems.join(' ; '));
    if (latin) {
      const want_ = lang === 'tr' ? ['inter-display-latin-v1.woff2', 'inter-display-turkish-v1.woff2'] : ['inter-display-latin-v1.woff2'];
      // Syne (the film's chapter words) is fetched later, when the film is near: not text, not on the critical path.
      const got = fonts.resources.map((x) => x.file).filter((f) => !f.startsWith('syne-')).sort();
      check(`${lang}: the text face is exactly ${want_.join(' + ')} (no second text face) and the page is set in Inter Display`, JSON.stringify(got) === JSON.stringify([...want_].sort()) && fonts.family === 'Inter Display' && fonts.loaded.includes('Inter Display'), JSON.stringify({ got, family: fonts.family, loaded: fonts.loaded }));
    } else {
      check(`${lang}: system font stack, no web font is fetched`, fonts.resources.length === 0 && fonts.family !== 'Inter Display', JSON.stringify({ resources: fonts.resources, family: fonts.family }));
    }
  }
}

// ── the case studies: reachable from the showcase cards, in a dialog and as pages, in the languages that read differently ─────────────
if (want('casestudy')) {
  group('The case studies open from the showcase cards (dialog), stand alone as pages, and keep their four headings (docs/adr/0020)');
  for (const lang of ['en', 'tr', 'ar']) {
    const { page, errors } = await open(url(lang));
    await page.evaluate(() => document.querySelector('#showcase')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await sleep(1200);
    const home = new URL(page.url()).pathname;
    const slugs = await page.$$eval('a[data-breakdown-link].btn', (links) => links.map((a) => a.dataset.slug));
    check(`${lang}: four showcase cards, each with a breakdown link`, slugs.length === 4 && new Set(slugs).size === 4, JSON.stringify(slugs));
    // A visitor's click focuses the link first; a scripted click() does not, and the dialog returns focus to what had it.
    await page.evaluate(() => {
      const link = document.querySelector('a[data-breakdown-link].btn');
      link?.focus();
      link?.click();
    });
    // The content arrives from /api/breakdown after the dialog opens (it shows "Loading..." with the same title id until then).
    const opened = await page.waitForFunction(() => document.querySelectorAll('dialog[open] .bd-h').length >= 4, { timeout: 15000 }).then(() => true, () => false);
    const dialog = await page.evaluate(() => ({
      title: document.querySelector('dialog[open] #bd-title')?.textContent?.trim() ?? '',
      headings: document.querySelectorAll('dialog[open] .bd-h').length,
      path: location.pathname,
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    check(`${lang}: a click opens the breakdown in a dialog over the page, with a title, four headings and its own address`, opened && dialog.title.length > 4 && dialog.headings >= 4 && /\/showcase\/[a-z]+$/.test(dialog.path) && !dialog.overflow, JSON.stringify(dialog));
    await page.keyboard.press('Escape');
    const closed = await page.waitForFunction(() => !document.querySelector('dialog[open]'), { timeout: 5000 }).then(() => true, () => false);
    await sleep(400);
    const back = await page.evaluate(() => ({ path: location.pathname, focus: document.activeElement?.matches?.('a[data-breakdown-link]') ?? false }));
    check(`${lang}: Escape closes it, the address returns to the page and focus goes back to the card's link`, closed && back.path === home && back.focus, JSON.stringify({ closed, home, ...back }));
    check(`${lang}: no page or console errors on the home page`, errors.length === 0, errors.slice(0, 3).join(' | '));
    await page.close();
  }
  for (const [lang, slug] of [['en', 'estate'], ['tr', 'clinic'], ['de', 'law'], ['ar', 'logistics']]) {
    const { page, errors } = await open(url(lang, `/showcase/${slug}`));
    const view = await page.evaluate(() => ({
      title: document.querySelector('#bd-title')?.textContent?.trim() ?? '',
      headings: document.querySelectorAll('.bd-h').length,
      overflow: document.documentElement.scrollWidth > innerWidth,
      cls: window.__cls,
    }));
    check(`${lang} /showcase/${slug}: the page stands alone with a title and four headings, no sideways scroll, no layout shift`, view.title.length > 4 && view.headings >= 4 && !view.overflow && view.cls < 0.005, JSON.stringify(view));
    check(`${lang} /showcase/${slug}: no page or console errors`, errors.length === 0, errors.slice(0, 3).join(' | '));
    await page.close();
  }
}

// ── the briefing while delivery is not connected (docs/adr/0025) ──────────────────────────────────────────────────────────────────
// Without the Turnstile and webhook settings the API refuses (503), so the page does not post: the last step composes an email draft from the
// answers and says so, and nothing is claimed as received. Where delivery IS connected the form must not be in that mode (nothing to walk through here).
if (want('briefing')) {
  group('The briefing: an email draft while delivery is not connected, never a pretended success');
  const { page, errors } = await open('/?m=us', { viewport: DESKTOP });
  await page.evaluate(() => document.querySelector('#briefing')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await sleep(600);
  const direct = await page.evaluate(() => Boolean(document.querySelector('#briefing form[data-direct]')));
  if (!direct) {
    const posts = await page.evaluate(() => !document.querySelector('#briefing form[data-direct]') && !document.body.innerText.includes('email draft to our founding team'));
    check('delivery is connected on this server, so the briefing posts and does not show the email-draft note', posts);
  } else {
    const note = await page.evaluate(() => document.querySelector('#briefing form[data-direct] p.text-muted')?.textContent ?? '');
    check('the panel says up front that the answers open as an email draft the visitor sends themselves', /email draft/i.test(note) && /nothing is sent from this page/i.test(note), note.slice(0, 120));
    // The page scrolls smoothly and the panel enters under a mask (the new step slides in), so an element's position is stale and a point on it hits the
    // form itself for a moment: bring it to the middle instantly, wait until the point on it really belongs to it (a stuck overlay fails here, as it
    // would for a visitor), then click it.
    const tap = async (selector) => {
      await page.$eval(selector, (el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await page.waitForFunction(
        (css) => {
          const el = document.querySelector(css);
          if (!el) return false;
          const r = el.getBoundingClientRect();
          const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return Boolean(hit) && (hit === el || el.contains(hit));
        },
        { timeout: 6000 },
        selector,
      );
      await page.click(selector);
    };
    // Each step: choose the first option (retrying until the panel has taken it), continue, and wait for the next step to be the one on screen.
    for (const step of [1, 2, 3]) {
      for (let tries = 0; tries < 8; tries++) {
        await tap('#briefing .opt');
        if (await page.evaluate(() => document.querySelectorAll('#briefing .opt input:checked').length === 1)) break;
        await sleep(500);
      }
      await tap('#briefing button.btn-primary');
      await page.waitForFunction((n) => new RegExp(`Step ${n} of`).test(document.querySelector('#briefing form p.label')?.textContent ?? ''), { timeout: 8000 }, step + 1);
    }
    await page.waitForSelector('#briefing input[autocomplete="name"]', { timeout: 8000 });
    for (const [selector, text] of [['#briefing input[autocomplete="name"]', 'Test Person'], ['#briefing input[autocomplete="organization-title"]', 'Test Company'], ['#briefing input[type="email"]', 'person@example.com']]) {
      await tap(selector);
      await page.keyboard.type(text);
    }
    await tap('#briefing .role-chip');
    await tap('#briefing input.field-check');
    const label = await page.evaluate(() => document.querySelector('#briefing button.btn-primary')?.textContent?.trim() ?? '');
    check('the last button is the draft button, not "send"', /open the email draft/i.test(label), label);
    const posted = [];
    page.on('request', (request) => request.url().includes('/api/briefing') && posted.push(request.method()));
    await tap('#briefing button.btn-primary');
    await sleep(900);
    const drafted = await page.evaluate(() => {
      const box = document.querySelector('#briefing [data-drafted]');
      const link = box?.querySelector('a');
      return { shown: Boolean(box), href: link?.getAttribute('href') ?? '', text: box?.textContent ?? '', received: Boolean(document.querySelector('#briefing .panel-done')) };
    });
    check('the draft link carries the answers (address, subject, the typed name and email)', drafted.shown && /^mailto:contact@syncflow\.agency\?subject=/.test(drafted.href) && /Test%20Person/.test(drafted.href) && /person%40example\.com/.test(drafted.href), JSON.stringify({ shown: drafted.shown, href: drafted.href.slice(0, 160) }));
    check('nothing was posted to the API and nothing was announced as received', posted.length === 0 && !drafted.received, JSON.stringify({ posted, text: drafted.text.slice(0, 80) }));

    // ── the copy button for a visitor whose browser opens no mail app (docs/adr/0028) ────────────────────────────────────────────────
    // The clipboard itself is the browser's; what is tested is OUR part: what text is handed to it, what the visitor is told, and the manual
    // fallback when the browser refuses. writeText is replaced by a recorder (a headless page has no focus, which a real clipboard needs).
    const copyButton = '#briefing [data-drafted] button';
    check('the draft notice offers a "Copy briefing text" button', (await page.$(copyButton)) !== null);
    await page.evaluate(() => {
      window.__clip = null;
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text) => void (window.__clip = text) } });
    });
    await tap(copyButton);
    await sleep(400);
    const copied = await page.evaluate(() => ({ clip: window.__clip, note: document.querySelector('#briefing [data-copied]')?.textContent ?? '', failed: Boolean(document.querySelector('#briefing [data-copy-failed]')) }));
    check('it hands the whole briefing to the clipboard (address, subject, the answers) as plain text', typeof copied.clip === 'string' && /^To: contact@syncflow\.agency\nSubject: .+\n\n/.test(copied.clip) && /Test Person/.test(copied.clip) && /Test Company/.test(copied.clip) && /person@example\.com/.test(copied.clip) && !/[<>]/.test(copied.clip), JSON.stringify(copied.clip?.slice(0, 220)));
    check('and tells the visitor, naming the address to paste it to', /Copied/.test(copied.note) && /contact@syncflow\.agency/.test(copied.note) && !copied.failed, copied.note);
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => Promise.reject(new Error('blocked')) } });
      document.execCommand = () => false;
    });
    await tap(copyButton);
    await sleep(400);
    const refused = await page.evaluate(() => {
      const box = document.querySelector('#briefing [data-copy-failed]');
      const area = box?.querySelector('textarea');
      return { shown: Boolean(box), readOnly: area?.readOnly ?? false, value: area?.value ?? '', stillCopied: Boolean(document.querySelector('#briefing [data-copied]')) };
    });
    check('when the browser refuses, the text is shown ready to select (read-only) and the false "copied" note is gone', refused.shown && refused.readOnly && /^To: contact@syncflow\.agency\n/.test(refused.value) && /Test Person/.test(refused.value) && !refused.stillCopied, JSON.stringify(refused).slice(0, 220));
  }
  check('no page or console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await page.close();
}

// ── Drawing 01 and the call to action that stays within reach (docs/adr/0028) ──────────────────────────────────────────────────
if (want('drawing')) {
  group('Drawing 01 (the briefing path): the right layout per width, nothing clipped, nothing overflowing');
  // English and Arabic: the page direction flips for /ar (dir="rtl"), the sheet must not (it reads left to right whatever the page does).
  for (const [label, viewport, layout, path] of [['desktop 1440', DESKTOP, 'wide', '/?m=us'], ['phone 412', PHONE, 'narrow', '/?m=us'], ['ar desktop 1440', DESKTOP, 'wide', '/ar?m=me'], ['ar phone 412', PHONE, 'narrow', '/ar?m=me']]) {
    const { page, errors } = await open(path, { viewport });
    await page.evaluate(() => document.querySelector('figure.drawing')?.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await sleep(500);
    const info = await page.evaluate(() => {
      const svgs = [...document.querySelectorAll('figure.drawing svg.dwg')];
      const shown = svgs.filter((s) => getComputedStyle(s).display !== 'none');
      const svg = shown[0];
      const vb = svg?.viewBox.baseVal;
      const clipped = [];
      const outside = [];
      if (svg) {
        for (const g of svg.querySelectorAll(':scope > g')) {
          const box = g.querySelector(':scope > rect.dwg-box');
          if (!box) continue;
          const r = box.getBBox();
          for (const text of g.querySelectorAll(':scope > text')) {
            const b = text.getBBox();
            if (b.x < r.x + 2 || b.x + b.width > r.x + r.width - 2 || b.y < r.y || b.y + b.height > r.y + r.height) clipped.push(`${text.textContent} [${[b.x, b.width, r.x, r.width].map(Math.round).join('/')}]`);
          }
        }
        for (const text of svg.querySelectorAll('text')) {
          const b = text.getBBox();
          if (text.getAttribute('transform')) continue;
          if (b.x < 0 || b.y < 0 || b.x + b.width > vb.width || b.y + b.height > vb.height) outside.push(text.textContent);
        }
      }
      const rect = svg?.getBoundingClientRect();
      const fontPx = svg ? parseFloat(getComputedStyle(svg.querySelector('.dwg-s')).fontSize) * (rect.width / vb.width) : 0;
      const figure = document.querySelector('figure.drawing');
      return {
        total: svgs.length,
        shown: shown.length,
        label: svg?.getAttribute('aria-label') ?? '',
        classes: svg?.getAttribute('class') ?? '',
        boxes: svg?.querySelectorAll('rect.dwg-box').length ?? 0,
        clipped,
        outside,
        fontPx: Math.round(fontPx * 10) / 10,
        width: Math.round(rect?.width ?? 0),
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        figureInside: figure ? figure.getBoundingClientRect().right <= document.documentElement.clientWidth + 1 : false,
        heading: document.querySelector('#drawing-title')?.textContent ?? '',
        pageDir: document.documentElement.dir,
        sheetDir: svg ? getComputedStyle(svg).direction : '',
        // Centred in its figure: the space on both sides is the same (a sheet that hugged one edge would show a direction leak).
        centred: svg && figure ? Math.abs(svg.getBoundingClientRect().left - figure.getBoundingClientRect().left - (figure.getBoundingClientRect().right - svg.getBoundingClientRect().right)) <= 2 : false,
      };
    });
    check(`${label}: the page direction is ${path.startsWith('/ar') ? 'rtl' : 'ltr'} while the sheet itself stays left to right and centred in its figure`, info.pageDir === (path.startsWith('/ar') ? 'rtl' : 'ltr') && info.sheetDir === 'ltr' && info.centred, JSON.stringify({ pageDir: info.pageDir, sheetDir: info.sheetDir, centred: info.centred }));
    check(`${label}: exactly one of the two layouts is shown (the ${layout} one) and it is named for assistive technology`, info.total === 2 && info.shown === 1 && info.classes.includes(layout === 'wide' ? 'lg:block' : 'lg:hidden') && info.label.length > 120, JSON.stringify({ total: info.total, shown: info.shown, label: info.label.slice(0, 40) }));
    check(`${label}: seven boxes plus the refusal box, no text outside its box or the sheet`, info.boxes === 8 && info.clipped.length === 0 && info.outside.length === 0, JSON.stringify({ boxes: info.boxes, clipped: info.clipped, outside: info.outside }));
    check(`${label}: the annotations stay legible once scaled (>= 9.5 px) and the page does not scroll sideways`, info.fontPx >= 9.5 && info.overflowX <= 0 && info.figureInside, JSON.stringify({ fontPx: info.fontPx, width: info.width, overflowX: info.overflowX }));
    check(`${label}: the figure has its translated heading`, info.heading.length > 10, info.heading);
    check(`${label}: no page or console errors`, errors.length === 0, errors.slice(0, 3).join(' | '));
    await page.close();
  }
}

if (want('cta')) {
  group('"Start a briefing" stays within reach while scrolling, and one click lands on the form');
  // Phones get the thumb-zone bar, which hides on purpose while the hero button or the briefing is on screen, so the first sample is below the hero there.
  for (const [label, viewport, selector, fractions] of [['desktop', DESKTOP, 'header .btn', [0.15, 0.4, 0.7]], ['phone', PHONE, '[data-sticky-cta] a', [0.4, 0.7]]]) {
    const { page, errors } = await open('/?m=us', { viewport });
    const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    const seen = [];
    for (const fraction of fractions) {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), Math.round(total * fraction));
      await sleep(900);
      seen.push(
        await page.evaluate((css) => {
          const el = [...document.querySelectorAll(css)].find((candidate) => /briefing/i.test(candidate.getAttribute('href') ?? '') || /briefing/i.test(candidate.textContent ?? ''));
          if (!el) return { found: false };
          const r = el.getBoundingClientRect();
          const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          const holder = el.closest('[data-sticky-cta]');
          return { found: true, visible: r.width > 0 && r.top >= 0 && r.bottom <= innerHeight, reachable: Boolean(hit) && (hit === el || el.contains(hit)), shown: holder ? holder.getAttribute('data-visible') === 'true' : true, href: el.getAttribute('href') };
        }, selector),
      );
    }
    check(`${label}: the button is on screen and clickable at ${fractions.map((f) => `${Math.round(f * 100)} %`).join(', ')} of the page`, seen.every((s) => s.found && s.visible && s.reachable && s.shown), JSON.stringify(seen));
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), Math.round(total * 0.4));
    await sleep(700);
    await page.evaluate((css) => [...document.querySelectorAll(css)].find((candidate) => /briefing/i.test(candidate.getAttribute('href') ?? '') || /briefing/i.test(candidate.textContent ?? ''))?.click(), selector);
    await settle(page);
    const landed = await page.evaluate(() => ({ hash: location.hash, top: Math.round(document.querySelector('#briefing').getBoundingClientRect().top) }));
    check(`${label}: one click lands on the briefing (hash #briefing, section top within 3 px of the header)`, landed.hash === '#briefing' && Math.abs(landed.top - SCROLL_PADDING) <= 3, JSON.stringify(landed));
    check(`${label}: no page or console errors`, errors.length === 0, errors.slice(0, 3).join(' | '));
    await page.close();
  }
}

// ── the founding statement and the scope block of the budget step (docs/adr/0031) ────────────────────────────────────────────────
if (want('scope')) {
  group('Founding statement (Studio) and the budget step\'s scope block: right text, in the right language, and nothing below it ever moves');
  const profiles = QUICK ? [['desktop', DESKTOP, ['en', 'ar']]] : [['desktop', DESKTOP, ['en', 'tr', 'ar', 'de', 'fr', 'es', 'zh']], ['phone', PHONE, ['en', 'ar', 'de', 'fr']]];
  for (const [label, viewport, langs] of profiles) {
    for (const lang of langs) {
      const messages = JSON.parse(readFileSync(new URL(`../messages/${lang}.json`, import.meta.url), 'utf8'));
      const budgetCopy = messages.Briefing.budget;
      const { page, errors } = await open(`${lang === 'en' ? '' : `/${lang}`}/?m=${MARKET[lang]}`, { viewport });
      const tag = `${label} ${lang}`;

      // The founding statement is in the Studio section, whole, inside the page.
      const founding = await page.evaluate(() => {
        const el = document.querySelector('.founding-text');
        const box = el?.getBoundingClientRect();
        return { text: el?.textContent?.trim() ?? '', label: document.querySelector('.founding .label')?.textContent?.trim() ?? '', inside: box ? box.left >= 0 && box.right <= document.documentElement.clientWidth + 1 : false, inStudio: Boolean(el?.closest('#studio')) };
      });
      check(`${tag}: the founding statement is in the Studio section, as written, and inside the page`, founding.text === messages.Studio.founding && founding.label === messages.Studio.foundingLabel && founding.inside && founding.inStudio, JSON.stringify({ text: founding.text.slice(0, 50), inside: founding.inside, inStudio: founding.inStudio }));

      // The budget step: before a choice the prompt shows; then each level in turn, and back; the geometry below the options must never change.
      await page.evaluate(() => document.querySelector('#briefing')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
      await sleep(900);
      // Positions are taken from the top of the panel that holds the step, not from the document: choosing a level moves focus, the page scrolls to the
      // radio, and the panel itself carries a slight scroll-linked transform, none of which is a change of layout. What must not change is where everything
      // sits relative to the panel, and the heights of the block, the panel and the section. (The height of the whole page is left out on purpose: the sections
      // below the form are drawn on demand and settle to their real height when the scroll brings them near, a few pixels either way, whatever the form does.)
      const geometry = () =>
        page.evaluate(() => {
          const panel = document.querySelector('#briefing .panel');
          const base = panel.getBoundingClientRect().top;
          const below = (css) => {
            const el = document.querySelector(css);
            return el ? Math.round((el.getBoundingClientRect().top - base) * 10) / 10 : null;
          };
          const height = (css) => Math.round((document.querySelector(css)?.getBoundingClientRect().height ?? 0) * 10) / 10;
          return { scope: below('#briefing .scope'), stack: height('#briefing .scope-stack'), note: below('#briefing .scope-note'), foot: below('#briefing fieldset > p.text-faint'), button: below('#briefing button.btn-primary'), panel: height('#briefing .panel'), section: document.querySelector('#briefing')?.offsetHeight ?? 0 };
        });
      const live = () => page.evaluate(() => document.querySelector('#briefing .scope-live')?.textContent?.trim() ?? '');
      const hasBlock = await page.evaluate(() => Boolean(document.querySelector('#briefing .scope')));
      check(`${tag}: the budget step carries the scope block, its invisible layer is hidden from assistive technology and the visible one is a polite status region`, hasBlock && (await page.evaluate(() => document.querySelector('#briefing .scope-ghost')?.getAttribute('aria-hidden') === 'true' && getComputedStyle(document.querySelector('#briefing .scope-ghost')).visibility === 'hidden' && document.querySelector('#briefing .scope-live')?.getAttribute('role') === 'status')));
      const idle = await live();
      const reference = await geometry();
      check(`${tag}: before a choice the prompt is shown`, idle === budgetCopy.scopeIdle, idle.slice(0, 60));
      const shiftBefore = await page.evaluate(() => window.__cls);
      const moved = [];
      const wrong = [];
      for (const [i, level] of [[0, 't1'], [1, 't2'], [2, 't3'], [1, 't2'], [0, 't1']]) {
        await page.evaluate((index) => {
          const label = document.querySelectorAll('#briefing .opt')[index];
          label.scrollIntoView({ block: 'center', behavior: 'instant' });
        }, i);
        await sleep(150);
        await page.evaluate((index) => document.querySelectorAll('#briefing .opt')[index].click(), i);
        await sleep(350);
        const text = await live();
        for (const n of [1, 2, 3]) if (!text.includes(budgetCopy[`${level}s${n}`])) wrong.push(`${level}s${n}`);
        const now = await geometry();
        for (const key of Object.keys(reference)) if (Math.abs((now[key] ?? 0) - (reference[key] ?? 0)) > 0.5) moved.push(`${level}:${key} ${reference[key]}->${now[key]}`);
      }
      check(`${tag}: each level shows its three lines, in this language, and changing level switches them`, wrong.length === 0, wrong.join(', '));
      check(`${tag}: choosing and changing the level moves nothing (the block, the note, the footnote, the button, the panel and the section keep their position and height)`, moved.length === 0, moved.slice(0, 4).join(' | '));
      const shiftAfter = await page.evaluate(() => window.__cls);
      check(`${tag}: the layout-shift score of those changes is 0`, shiftAfter - shiftBefore < 0.0001, `${(shiftAfter - shiftBefore).toFixed(5)}`);
      check(`${tag}: no sideways scroll and no page or console errors`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0 && errors.length === 0, errors.slice(0, 3).join(' | '));
      await page.close();
    }
  }
}

// ── the architectural R&D specimens (docs/adr/0032): two pages in every language ──────────────────────────────────────────────────────
if (want('specimens')) {
  group('Architectural R&D specimens: layout shift 0, the right direction, nothing clipped, the in-page navigation lands, the Studio cards lead there');
  const profiles = QUICK ? [['desktop', DESKTOP, ['en', 'ar']]] : [['desktop', DESKTOP, ['en', 'tr', 'ar', 'de', 'fr', 'es', 'zh']], ['phone', PHONE, ['en', 'ar', 'de', 'zh']]];
  for (const [label, viewport, langs] of profiles) {
    for (const lang of langs) {
      const messages = JSON.parse(readFileSync(new URL(`../messages/${lang}.json`, import.meta.url), 'utf8'));
      for (const [slug, key] of [['studio-site', 'studioSite'], ['fail-safe-queue', 'failSafeQueue']]) {
        const { page, errors } = await open(`${lang === 'en' ? '' : `/${lang}`}/specimens/${slug}`, { viewport });
        const tag = `${label} ${lang} ${slug}`;
        // Read the whole page the way a visitor does, then count what moved.
        const height = await page.evaluate(() => document.documentElement.scrollHeight);
        for (let y = 0; y < height; y += Math.round(viewport.height * 0.8)) {
          await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
          await sleep(100);
        }
        await sleep(400);
        const info = await page.evaluate(() => {
          const tiles = [...document.querySelectorAll('.bd-tile-value')];
          return {
            cls: window.__cls,
            h1: document.querySelectorAll('h1').length,
            title: document.querySelector('h1')?.textContent?.trim() ?? '',
            dir: document.documentElement.dir,
            sections: ['challenge', 'solution', 'integration', 'impact'].filter((id) => document.getElementById(`bd-${id}`)).length,
            tiles: tiles.map((el) => el.textContent.trim()),
            clippedTiles: tiles.filter((el) => el.scrollWidth > el.clientWidth + 1).length,
            overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            robots: document.querySelector('meta[name="robots"]')?.content ?? '',
          };
        });
        check(`${tag}: one h1 with the translated title, four parts, ${info.dir}, indexable`, info.h1 === 1 && info.title === messages.Specimen[key].title && info.sections === 4 && info.dir === (lang === 'ar' ? 'rtl' : 'ltr') && !/noindex/.test(info.robots), JSON.stringify({ h1: info.h1, title: info.title.slice(0, 30), sections: info.sections, dir: info.dir, robots: info.robots }));
        check(`${tag}: four measured or computed tiles, none clipped, no sideways scroll`, info.tiles.length === 4 && info.tiles.every((t) => t.length > 0) && info.clippedTiles === 0 && info.overflowX <= 0, JSON.stringify({ tiles: info.tiles, clipped: info.clippedTiles, overflowX: info.overflowX }));
        check(`${tag}: layout-shift score 0 and no page or console errors`, info.cls < 0.0001 && errors.length === 0, `${info.cls} ${errors.slice(0, 2).join(' | ')}`);
        if (lang === 'en' || lang === 'ar') {
          // The in-page navigation: a chip leads to its part, which lands under the header.
          await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
          await sleep(300);
          await page.evaluate(() => document.querySelector('.bd-nav a[href="#bd-integration"]')?.click());
          await settle(page);
          const landed = await page.evaluate(() => ({ hash: location.hash, top: Math.round(document.getElementById('bd-integration').getBoundingClientRect().top) }));
          check(`${tag}: the in-page link to part III lands on it, below the header (hash and position)`, landed.hash === '#bd-integration' && landed.top >= 72 && landed.top <= 220, JSON.stringify(landed));
        }
        await page.close();
      }
    }
  }
  // From the home page: the Studio section carries both cards, and a click leads to the specimen page.
  for (const [label, viewport] of QUICK ? [['desktop', DESKTOP]] : [['desktop', DESKTOP], ['phone', PHONE]]) {
    const { page, errors } = await open('/?m=us', { viewport });
    const cards = await page.evaluate(() => [...document.querySelectorAll('#specimens .spec-card')].map((a) => ({ slug: a.getAttribute('data-specimen'), href: a.getAttribute('href') })));
    check(`${label}: the Studio section lists both specimens as cards that link to their pages`, cards.length === 2 && cards.every((c) => c.href === `/specimens/${c.slug}`), JSON.stringify(cards));
    await page.evaluate(() => document.querySelector('#specimens .spec-card')?.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await sleep(500);
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => undefined), page.evaluate(() => document.querySelector('#specimens .spec-card')?.click())]);
    check(`${label}: a click on a card opens its specimen page`, page.url().includes('/specimens/studio-site') && (await page.evaluate(() => document.querySelector('[data-breakdown="studio-site"]') !== null)), page.url());
    check(`${label}: no page or console errors on the way`, errors.length === 0, errors.slice(0, 2).join(' | '));
    await page.close();
  }
}

// ── the framework starts after the first paint (docs/adr/0023) ────────────────────────────────────────────────────────────────────
if (want('framework')) {
  group('React and Next start after the first contentful paint, at the first touch or key, or after 3.5 s, and the page still comes alive');
  const chunkScripts = () =>
    performance
      .getEntriesByType('resource')
      .filter((e) => e.initiatorType === 'script' || e.initiatorType === 'other' || /\/_next\/static\/(?:immutable\/)?chunks\/.+\.js/.test(e.name))
      .filter((e) => /\/_next\/static\/(?:immutable\/)?chunks\/[^/]+\.js/.test(e.name) && !/sf-boot\./.test(e.name))
      .map((e) => ({ name: e.name.split('/').pop(), start: e.startTime }));
  const fresh = async (neuterPaint) => {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    await page.setViewport(DESKTOP);
    if (neuterPaint) {
      // The first-paint path is switched off, so only the early-interaction and the timeout paths can start the framework.
      await page.evaluateOnNewDocument(() => {
        const Original = window.PerformanceObserver;
        window.PerformanceObserver = class extends Original {
          observe(options) {
            if (options && options.type === 'paint') return undefined;
            return super.observe(options);
          }
        };
      });
    }
    return { page, errors };
  };

  // 1. The normal path: nothing before the first contentful paint, everything right after, and the gate (a client component) wakes up.
  {
    const { page, errors } = await fresh(false);
    await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 60000 });
    const awake = await page.waitForSelector('.gate[data-ready]', { timeout: 15000 }).then(() => true, () => false);
    const timing = await page.evaluate(() => {
      const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? -1;
      const scripts = performance
        .getEntriesByType('resource')
        .filter((e) => /\/_next\/static\/(?:immutable\/)?chunks\/[^/]+\.js/.test(e.name) && !/sf-boot\./.test(e.name))
        .map((e) => e.startTime);
      return { fcp, count: scripts.length, earliest: scripts.length ? Math.min(...scripts) : -1 };
    });
    check(`no framework script is requested before the first contentful paint (paint at ${timing.fcp.toFixed(0)} ms, first request at ${timing.earliest.toFixed(0)} ms)`, timing.fcp > 0 && timing.count >= 8 && timing.earliest >= timing.fcp - 1, JSON.stringify(timing));
    check('and the page wakes up: the entry gate (a client component) is hydrated and ready', awake);
    check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
    await page.close();
  }

  // 2. The first touch or key press starts it at once, even if the paint path never fires.
  {
    const { page } = await fresh(true);
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(900);
    const before = await page.evaluate(chunkScripts);
    await page.keyboard.press('Tab');
    await sleep(1500);
    const after = await page.evaluate(chunkScripts);
    check('before any input (and with the paint path off) no framework script is requested; one key press starts all of them', before.length === 0 && after.length >= 8, JSON.stringify({ before: before.length, after: after.length }));
    await page.close();
  }

  // 3. With no input and no paint path, the 3.5 s timer starts it.
  {
    const { page } = await fresh(true);
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(2500);
    const early = await page.evaluate(chunkScripts);
    await sleep(2500);
    const late = await page.evaluate(chunkScripts);
    check('with no input at all the framework still starts, on the 3.5 s timer (nothing at 2.5 s, everything by 5 s)', early.length === 0 && late.length >= 8, JSON.stringify({ at25: early.length, at5: late.length }));
    await page.close();
  }
}

// ── the cinema layer: off the main thread, same picture, a fallback that works ──────────────────────────────────────────────────
if (want('cinema')) {
  group('The cinema layer runs in a worker (WebGL stays off the main thread), draws the same picture, and falls back to the main thread');
  const still = async (query, { blockWorker = false } = {}) => {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => m.type() === 'error' && !/CSP|Content Security|csp-report|Failed to load resource.*(404|429)/.test(m.text()) && errors.push(`console: ${m.text()}`));
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
    await page.evaluateOnNewDocument((block) => {
      // A browser whose workers cannot start: constructing one throws, the engine must carry on on the main thread.
      if (block) window.Worker = class { constructor() { throw new Error('workers are not available'); } };
      // How often the page's own thread asked for a WebGL context: with the worker this must stay at zero.
      window.__webglOnMain = 0;
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        if (type === 'webgl2' || type === 'webgl') window.__webglOnMain++;
        return original.call(this, type, ...rest);
      };
    }, blockWorker);
    await page.goto(`${BASE}/?m=us&cinema-force&cinema-debug${query}`, { waitUntil: 'load', timeout: 60000 });
    const live = await page.waitForSelector('.cinema-canvas[data-live]', { timeout: 30000 }).then(() => true, () => false);
    // The canvas fades in over 1.4 s: wait it out so no frame is captured mid-fade.
    await sleep(1800);
    let png = null;
    let stats = null;
    if (live) {
      // Through the CSSOM, not a <style> tag: an enforcing CSP blocks injected style elements, and this must work against either mode.
      await page.evaluate(() => {
        for (const el of document.querySelectorAll('#site-root,.skip-link,.cinema-fallback')) el.style.setProperty('visibility', 'hidden', 'important');
        document.body.style.setProperty('background', 'transparent', 'important');
      });
      await page.evaluate(() => {
        window.__cinema.set({ scene: 2, amb: 0, local: 0.5, gain: 1, heroGain: 0, time: 2.5, grain: 0, freeze: false });
        window.__cinema.snap();
      });
      await sleep(700);
      await page.evaluate(() => window.__cinema.set({ freeze: true }));
      await sleep(900);
      png = await page.screenshot({ type: 'png' });
      stats = await page.evaluate(() => window.__cinema.stats());
    }
    const facts = await page.evaluate(() => ({ worker: !!window.__cinemaWorker, webglOnMain: window.__webglOnMain }));
    await page.close();
    return { live, png, stats, errors, ...facts };
  };
  const viaWorker = await still('');
  const viaMain = await still('&cinema-worker=off');
  const noWorker = await still('', { blockWorker: true });
  check('default: the canvas goes live, drawn by the worker, and the page thread never created a WebGL context', viaWorker.live && viaWorker.worker && viaWorker.webglOnMain === 0, JSON.stringify({ live: viaWorker.live, worker: viaWorker.worker, webglOnMain: viaWorker.webglOnMain }));
  check('the worker reports frames and a scene scale from its side', !!viaWorker.stats && viaWorker.stats.frames > 0 && viaWorker.stats.sceneScale > 0 && viaWorker.stats.width > 2, JSON.stringify(viaWorker.stats));
  check('?cinema-worker=off: the same engine runs on the main thread and goes live', viaMain.live && !viaMain.worker && viaMain.webglOnMain === 1, JSON.stringify({ live: viaMain.live, worker: viaMain.worker, webglOnMain: viaMain.webglOnMain }));
  check('workers unavailable (constructing one throws): the engine still goes live, on the main thread, without errors', noWorker.live && !noWorker.worker && noWorker.webglOnMain === 1 && noWorker.errors.length === 0, JSON.stringify({ live: noWorker.live, worker: noWorker.worker, webglOnMain: noWorker.webglOnMain, errors: noWorker.errors.slice(0, 2) }));
  if (viaWorker.png && viaMain.png) {
    const diffPage = await browser.newPage();
    const result = await diffPage.evaluate(
      async (a, b) => {
        const load = (src) => new Promise((resolve) => { const img = new Image(); img.onload = () => resolve(img); img.src = `data:image/png;base64,${src}`; });
        const [ia, ib] = await Promise.all([load(a), load(b)]);
        const w = Math.min(ia.width, ib.width);
        const h = Math.min(ia.height, ib.height);
        const grab = (img) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0); return ctx.getImageData(0, 0, w, h).data; };
        const da = grab(ia);
        const db = grab(ib);
        let diff = 0;
        let light = 0;
        for (let i = 0; i < da.length; i += 4) {
          if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 6) diff++;
          light += da[i] + da[i + 1] + da[i + 2];
        }
        return { pct: (diff / (w * h)) * 100, brightness: light / (w * h * 3) };
      },
      viaWorker.png.toString('base64'),
      viaMain.png.toString('base64'),
    );
    await diffPage.close();
    check(`a fixed monolith frame from the worker and from the main thread differ in ${result.pct.toFixed(3)} % of pixels (limit 0.05 %) and are not blank (mean brightness ${result.brightness.toFixed(1)} / 255)`, result.pct <= 0.05 && result.brightness > 8, JSON.stringify({ ...result, sceneScale: [viaWorker.stats?.sceneScale, viaMain.stats?.sceneScale] }));
  } else check('both modes produced a frame to compare', false, JSON.stringify({ worker: !!viaWorker.png, main: !!viaMain.png }));
  check('no page or console errors in either mode', viaWorker.errors.length === 0 && viaMain.errors.length === 0, [...viaWorker.errors, ...viaMain.errors].slice(0, 3).join(' | '));
}

await browser.close();
console.log(`\n${results.filter(Boolean).length}/${results.length} browser checks passed${results.every(Boolean) ? '' : `, ${results.filter((r) => !r).length} FAILED`}`);
process.exit(results.every(Boolean) ? 0 : 1);
