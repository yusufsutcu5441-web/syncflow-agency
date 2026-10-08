#!/usr/bin/env node
/**
 * Lighthouse runner for the phase gates (CLAUDE.md: "Her fazdan sonra: build, lint, production build üzerinde Lighthouse").
 * Runs Lighthouse several times against one or more RUNNING production servers and prints the medians. With several
 * targets the runs are interleaved (A, B, A, B ...), so slow drift of the machine hits every target equally. That is how
 * the Faz 2 baseline was taken, against the snapshot before the cleanup (docs/perf/faz2-baseline.md).
 *
 *   npm run build                                   (build with NEXT_PUBLIC_SITE_URL=http://localhost:3100, else the
 *   npx next start -p 3100                           canonical link points at the live domain and SEO drops)
 *   npm run perf -- new=http://localhost:3100                        one target
 *   npm run perf -- --runs=5 new=http://localhost:3100 old=http://localhost:3101      A/B against another build
 *
 * Options: --runs=<n> mobile runs per page (default 3) · --desktop=<n> desktop runs of "/" (default 2, 0 skips)
 *          --paths=/,/tr pages to measure (default "/,/tr") · --out=<dir> raw reports (default perf-out, git-ignored)
 * Lighthouse is fetched with npx at the pinned version (nothing is added to package.json). Mobile = Lighthouse's default
 * profile (Moto G Power emulation, simulated slow 4G, 4x CPU slowdown). Chrome: CHROME_PATH or a common install path.
 * Measure when nothing else heavy is running; report the raw numbers together with this profile.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LIGHTHOUSE = 'lighthouse@13.5.0';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const argv = process.argv.slice(2);
const option = (name, fallback) => argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const mobileRuns = Number(option('runs', 3));
const desktopRuns = Number(option('desktop', 2));
const paths = option('paths', '/,/tr').split(',');
const outDir = option('out', join(root, 'perf-out'));
const targets = argv.filter((a) => !a.startsWith('--')).map((a) => {
  const [label, base] = a.includes('=') ? a.split('=') : [new URL(a).port || 'target', a];
  return { label, base: base.replace(/\/$/, '') };
});
if (targets.length === 0) {
  console.error('Give at least one running server, e.g.  npm run perf -- new=http://localhost:3100');
  process.exit(1);
}

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
mkdirSync(outDir, { recursive: true });

const plan = [];
for (let i = 0; i < mobileRuns; i++) for (const path of paths) for (const target of targets) plan.push({ ...target, path, preset: 'mobile', i });
for (let i = 0; i < desktopRuns; i++) for (const target of targets) plan.push({ ...target, path: '/', preset: 'desktop', i });

const kb = (bytes) => Math.round(bytes / 1024);
const sumTransfer = (items) => items.reduce((total, item) => total + (item.transferSize ?? 0), 0);
const median = (values) => {
  const v = values.filter((x) => typeof x === 'number').sort((a, b) => a - b);
  return v.length === 0 ? NaN : v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
};

const rows = [];
let environment = null;
for (const [n, run] of plan.entries()) {
  const name = `lh-${run.label}-${run.preset}-${run.path === '/' ? 'root' : run.path.replace(/\W+/g, '')}-${run.i}`;
  const file = join(outDir, `${name}.json`);
  const command = [
    'npx', '--yes', LIGHTHOUSE, `${run.base}${run.path}`, '--output=json', `--output-path="${file}"`, '--quiet',
    '--chrome-flags="--headless=new --no-sandbox"', '--only-categories=performance,accessibility,best-practices,seo',
    ...(run.preset === 'desktop' ? ['--preset=desktop'] : []),
  ].join(' ');
  const result = spawnSync(command, { cwd: root, shell: true, encoding: 'utf8', env: { ...process.env, CHROME_PATH: chrome }, maxBuffer: 1 << 26 });
  if (result.status !== 0) {
    console.log(`run ${n + 1}/${plan.length} FAILED (${run.label} ${run.preset} ${run.path}): ${(result.stderr ?? '').slice(-300)}`);
    continue;
  }
  const lhr = JSON.parse(readFileSync(file, 'utf8'));
  const audit = (id) => lhr.audits[id]?.numericValue;
  const requests = lhr.audits['network-requests']?.details?.items ?? [];
  const scripts = requests.filter((r) => r.resourceType === 'Script');
  const score = (id) => Math.round((lhr.categories[id]?.score ?? 0) * 100);
  environment ??= {
    lighthouse: lhr.lighthouseVersion,
    chrome: lhr.environment.hostUserAgent,
    formFactor: lhr.configSettings.formFactor,
    throttlingMethod: lhr.configSettings.throttlingMethod,
    throttling: lhr.configSettings.throttling,
    screenEmulation: lhr.configSettings.screenEmulation,
  };
  const row = {
    ...run,
    performance: score('performance'), accessibility: score('accessibility'), bestPractices: score('best-practices'), seo: score('seo'),
    fcp: audit('first-contentful-paint'), lcp: audit('largest-contentful-paint'), tbt: audit('total-blocking-time'),
    cls: audit('cumulative-layout-shift'), speedIndex: audit('speed-index'), ttfb: audit('server-response-time'),
    totalBytes: audit('total-byte-weight'), scriptBytes: sumTransfer(scripts), scriptCount: scripts.length, requestCount: requests.length,
    media: requests.filter((r) => /\/media\//.test(r.url)).map((r) => `${r.url.split('/').pop()}:${r.transferSize}`),
  };
  rows.push(row);
  console.log(`run ${n + 1}/${plan.length} ${run.label} ${run.preset} ${run.path}  perf ${row.performance}  LCP ${Math.round(row.lcp)} ms  TBT ${Math.round(row.tbt)} ms  CLS ${row.cls?.toFixed(3)}  JS ${kb(row.scriptBytes)} KB`);
}

writeFileSync(join(outDir, 'summary.json'), JSON.stringify({ environment, rows }, null, 2));

console.log('\nMedians (n = runs behind each row). JS = transferred script bytes, as served (gzip).');
console.log('| profile | page | build | n | perf | a11y | best-pr | seo | FCP ms | LCP ms | TBT ms | CLS | SI ms | TTFB ms | JS KB (files) | total KB |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const preset of ['mobile', 'desktop']) {
  for (const path of paths) {
    for (const target of targets) {
      const group = rows.filter((r) => r.preset === preset && r.path === path && r.label === target.label);
      if (group.length === 0) continue;
      const m = (key) => median(group.map((r) => r[key]));
      console.log(
        `| ${preset} | ${path} | ${target.label} | ${group.length} | ${m('performance')} | ${m('accessibility')} | ${m('bestPractices')} | ${m('seo')} | ${Math.round(m('fcp'))} | ${Math.round(m('lcp'))} | ${Math.round(m('tbt'))} | ${m('cls').toFixed(3)} | ${Math.round(m('speedIndex'))} | ${Math.round(m('ttfb'))} | ${kb(m('scriptBytes'))} (${m('scriptCount')}) | ${kb(m('totalBytes'))} |`,
      );
    }
  }
}
console.log(`\nProfile: ${JSON.stringify(environment)}`);
console.log(`Raw reports: ${outDir}`);
