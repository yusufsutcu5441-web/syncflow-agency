#!/usr/bin/env node
/**
 * Content-Security-Policy violations as a visitor would meet them (docs/adr/0024-csp-enforced.md). The policy is enforced, so anything it does not
 * allow is blocked: this drives a real Chrome (puppeteer-core) through the site and records every `securitypolicyviolation` event (the event fires
 * for an enforced and for a report-only policy alike) plus every console error and page error, while it loads each page, scrolls the whole page,
 * opens the language menu, a case study and the briefing form, and visits the other pages and languages.
 *
 *   npm run qa:csp                                   against http://localhost:3000 (or BASE_URL)
 *   npm run qa:csp -- https://syncflow.agency        the live site
 *
 * Read-only: nothing is submitted. Run it after any change that adds a script, frame, connection, font or image from somewhere new, and after
 * every deployment that touches the policy (lib/security/csp.ts). Exit code 1 on any violation or console error. Chrome: CHROME_PATH or a common
 * install path.
 */
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => /^https?:/.test(a)) ?? process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
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
const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 412, height: 823, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true };
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] });
const violations = new Map();
const problems = new Map();
let visits = 0;

async function visit(label, path, viewport, interact) {
  visits += 1;
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.evaluateOnNewDocument(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => {
      window.__csp.push(`${e.effectiveDirective} blocked ${String(e.blockedURI).slice(0, 120)} (${e.disposition}) at ${String(e.sourceFile || '').split('/').pop()}:${e.lineNumber}`);
    });
  });
  page.on('console', (m) => {
    // A resource that answers 404, 429 or 503 is not a policy problem (the briefing probe answers 503 until its delivery is configured).
    if (['error', 'warning'].includes(m.type()) && !/Failed to load resource.*(404|429|503)/.test(m.text())) problems.set(`${label}: ${m.type()} ${m.text().slice(0, 220)}`, 1);
  });
  page.on('pageerror', (e) => problems.set(`${label}: pageerror ${e.message.slice(0, 200)}`, 1));
  try {
    await page.goto(BASE + path, { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(1500);
    if (interact) await interact(page);
    await sleep(500);
  } catch (error) {
    problems.set(`${label}: navigation ${String(error.message).slice(0, 120)}`, 1);
  }
  for (const entry of await page.evaluate(() => window.__csp ?? []).catch(() => [])) violations.set(`${label}: ${entry}`, 1);
  await page.close();
}

const scrollAll = async (page) => {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 500) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
    await sleep(120);
  }
  await sleep(800);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
};

await visit('gate (desktop)', '/', DESKTOP, async (page) => {
  await page.hover('.gate-market a, .gate a').catch(() => undefined);
  await sleep(300);
});
await visit('gate (phone)', '/', PHONE);
await visit('home (desktop)', '/?m=us', DESKTOP, async (page) => {
  await scrollAll(page);
  // the language menu is built on first interest
  await page.hover('.lang-trigger').catch(() => undefined);
  await sleep(300);
  await page.click('.lang-trigger').catch(() => undefined);
  await sleep(400);
  await page.keyboard.press('Escape');
  // a case study opens as a dialog over the page
  const card = await page.$('a[href*="/showcase/"]');
  if (card) {
    await card.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await sleep(400);
    await card.click().catch(() => undefined);
    await sleep(1500);
    await page.keyboard.press('Escape');
  }
  // the briefing form: focus and type in a field (where the Turnstile script loads when a site key is configured)
  await page.evaluate(() => document.querySelector('#briefing')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await sleep(600);
  const field = await page.$('#briefing input, #briefing textarea, #briefing select');
  if (field) {
    await field.focus().catch(() => undefined);
    await field.type('x', { delay: 30 }).catch(() => undefined);
  }
  await sleep(1500);
});
await visit('home (phone)', '/?m=us', PHONE, scrollAll);
await visit('home, engine off', '/?m=us&cinema=off', DESKTOP, scrollAll);
for (const [label, path] of [
  ['case study page', '/showcase/estate?m=us'],
  ['privacy', '/privacy?m=us'],
  ['imprint', '/imprint?m=us'],
  ['tr', '/tr?m=tr'],
  ['ar (right to left)', '/ar?m=me'],
  ['de', '/de?m=dach'],
  ['zh', '/zh?m=asia'],
]) {
  await visit(label, path, DESKTOP, scrollAll);
}
await browser.close();

const clean = violations.size === 0 && problems.size === 0;
console.log(`\nContent-Security-Policy violations, console errors and page errors on ${BASE} (${visits} visits)`);
console.log(`  ${violations.size === 0 ? 'PASS' : 'FAIL'}  no CSP violation (${violations.size})`);
for (const key of violations.keys()) console.log(`          ${key}`);
console.log(`  ${problems.size === 0 ? 'PASS' : 'FAIL'}  no console error or page error (${problems.size})`);
for (const key of problems.keys()) console.log(`          ${key}`);
process.exit(clean ? 0 : 1);
