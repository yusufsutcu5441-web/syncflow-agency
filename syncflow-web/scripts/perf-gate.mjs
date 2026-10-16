#!/usr/bin/env node
/**
 * Main-thread budget gate (docs/adr/0021-production-performance-and-enterprise-proof.md §6). Lighthouse is the judge of the score, but it takes
 * minutes and its median moves by several points between runs of the same build; the cost it reacts to (layout, style recalculation, script,
 * long tasks, DOM size) can be counted directly, in seconds, and a regression shows up as a number that crossed a line.
 *
 * It loads the home page in a real Chrome under the same profile as Lighthouse's mobile run (412 x 823 at 1.75x, 4x CPU slowdown, simulated
 * slow 4G, cache off) and reports, as medians over several runs after one warm-up that is discarded:
 *   dom        elements in the document            layoutMs / styleMs   Chrome's own Layout and RecalcStyle durations
 *   scriptMs   Chrome's ScriptDuration             taskMs               everything the main thread did
 *   tbtMs      Total Blocking Time, estimated: the part over 50 ms of every long task that ended after the first paint
 *   longTasks  how many tasks after the first paint took over 200 ms     cls   layout shift, observed
 *
 *   npm run build && npm start                                         (or: npx next start -p 3100)
 *   npm run perf:gate                                                  budgets in scripts/perf-budget.json, http://localhost:3000
 *   npm run perf:gate -- http://localhost:3100 --runs=5
 *   npm run perf:gate -- http://localhost:3100 --baseline=http://localhost:3101
 *                                      an A/B against another build, interleaved: nothing may be worse than the baseline by more than 10 %
 *   npm run perf:gate -- --desktop                                     no throttling, a 1350 x 940 window (budgets: "desktop")
 *   npm run perf:gate -- --json=perf-out/gate.json                     also write the numbers
 *
 * The budgets are absolute numbers measured on one machine (see the "measuredOn" note in the file): another machine has other absolute numbers,
 * which is why --baseline exists. Exit code 1 when a budget or the baseline comparison fails.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const option = (name, fallback) => argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const target = (argv.find((a) => /^https?:/.test(a)) ?? process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const baseline = option('baseline')?.replace(/\/$/, '');
const runs = Number(option('runs', 3));
const path = option('path', '/?m=us');
const desktop = argv.includes('--desktop');
const jsonOut = option('json');

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

const budgets = JSON.parse(readFileSync(join(root, 'scripts', 'perf-budget.json'), 'utf8'));
const profile = desktop ? 'desktop' : 'mobile';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] });

async function measure(base) {
  const page = await browser.newPage();
  const cdp = await page.createCDPSession();
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  if (desktop) {
    await page.setViewport({ width: 1350, height: 940, deviceScaleFactor: 1 });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: (10 * 1024 * 1024) / 8, uploadThroughput: (10 * 1024 * 1024) / 8 });
  } else {
    await page.setViewport({ width: 412, height: 823, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }
  await cdp.send('Performance.enable');
  await page.evaluateOnNewDocument(() => {
    window.__gate = { fcp: 0, lcp: 0, cls: 0, long: [] };
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') window.__gate.fcp = e.startTime; }).observe({ type: 'paint', buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__gate.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__gate.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__gate.long.push([e.startTime, e.duration]); }).observe({ type: 'longtask', buffered: true });
  });
  await page.goto(base + path, { waitUntil: 'load', timeout: 120000 });
  await sleep(4500);
  const gate = await page.evaluate(() => ({ ...window.__gate, dom: document.getElementsByTagName('*').length }));
  const m = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
  await page.close();
  const after = gate.long.filter(([start, duration]) => start + duration > gate.fcp);
  return {
    dom: gate.dom,
    layoutMs: Math.round(m.LayoutDuration * 1000),
    styleMs: Math.round(m.RecalcStyleDuration * 1000),
    scriptMs: Math.round(m.ScriptDuration * 1000),
    taskMs: Math.round(m.TaskDuration * 1000),
    tbtMs: Math.round(after.reduce((sum, [, duration]) => sum + Math.max(0, duration - 50), 0)),
    longTasks: after.filter(([, duration]) => duration > 200).length,
    cls: Math.round(gate.cls * 1000) / 1000,
    fcpMs: Math.round(gate.fcp),
    lcpMs: Math.round(gate.lcp),
  };
}

const median = (list) => [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)];
const METRICS = ['dom', 'layoutMs', 'styleMs', 'scriptMs', 'taskMs', 'tbtMs', 'longTasks', 'cls'];
// Observed timings: budgeted for the first paint, shown for the largest one (it is the same element here).
const INFO = ['fcpMs', 'lcpMs'];

const targets = baseline ? [['new', target], ['baseline', baseline]] : [['new', target]];
const samples = Object.fromEntries(targets.map(([label]) => [label, []]));
for (const [, base] of targets) await measure(base); // one warm-up each (server caches, Chrome's first run), discarded
for (let i = 0; i < runs; i++) for (const [label, base] of targets) samples[label].push(await measure(base));

const med = Object.fromEntries(targets.map(([label]) => [label, Object.fromEntries([...METRICS, ...INFO].map((k) => [k, median(samples[label].map((s) => s[k]))]))]));

console.log(`Profile: ${profile} (${desktop ? '1350 x 940, no throttling, 10 Mbit/s' : '412 x 823 at 1.75x, 4x CPU slowdown, slow 4G, cache off'}); ${runs} runs after a warm-up; page ${path}`);
console.log(`\n${'metric'.padEnd(11)}${targets.map(([label]) => label.padStart(11)).join('')}${baseline ? '   change'.padStart(10) : ''}   budget`);
let failed = 0;
for (const key of [...METRICS, ...INFO]) {
  const limit = budgets[profile]?.[key];
  const value = med.new[key];
  const change = baseline ? (med.baseline[key] === 0 ? (value === 0 ? 0 : Infinity) : ((value - med.baseline[key]) / med.baseline[key]) * 100) : null;
  let note = '';
  if (limit !== undefined) {
    const ok = value <= limit;
    if (!ok) failed++;
    note = `${ok ? 'ok  ' : 'OVER'} <= ${limit}`;
  }
  if (baseline && key !== 'cls') {
    // 10 % worse than the baseline is a regression; a small absolute slack keeps tiny numbers from flapping.
    const slack = key === 'longTasks' ? 0 : key === 'dom' ? 5 : INFO.includes(key) ? 100 : 25;
    if (value > med.baseline[key] * 1.1 + slack) {
      failed++;
      note += `  WORSE THAN BASELINE`;
    }
  }
  if (baseline && key === 'cls' && value > Math.max(med.baseline[key], 0.005)) {
    failed++;
    note += `  WORSE THAN BASELINE`;
  }
  console.log(`${key.padEnd(11)}${targets.map(([label]) => String(med[label][key]).padStart(11)).join('')}${baseline ? `${change === null || !Number.isFinite(change) ? '' : `${change > 0 ? '+' : ''}${change.toFixed(0)} %`}`.padStart(10) : ''}   ${note}`);
}

if (jsonOut) {
  mkdirSync(dirname(join(process.cwd(), jsonOut)), { recursive: true });
  writeFileSync(join(process.cwd(), jsonOut), `${JSON.stringify({ profile, runs, path, medians: med, samples }, null, 2)}\n`);
  console.log(`\nwrote ${jsonOut}`);
}
await browser.close();
console.log(failed === 0 ? '\nperf gate: PASS' : `\nperf gate: ${failed} check(s) FAILED`);
process.exit(failed === 0 ? 0 : 1);
