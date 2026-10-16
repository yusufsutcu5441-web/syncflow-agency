#!/usr/bin/env node
/**
 * Starts React and Next after the first paint instead of with the HTML (docs/adr/0023-framework-after-first-paint.md).
 *
 * Why: Lighthouse (and a visitor on a slow connection) pays for every script the document asks for before the page can paint. The page here is
 * complete HTML and CSS: the framework (React DOM 71 KB, Next's client 45 KB, gzip) and the app's client chunks only add behaviour. Measured
 * through a rewriting proxy first: mobile LCP 2.75 s -> 1.51 s, Lighthouse mobile 96 -> 100, the full browser flow unchanged. This script makes
 * that permanent without touching Next's code: it only edits the data files Next reads when it renders a page, per page:
 *
 *   1. .next/server/app/<route>/page/build-manifest.json: `rootMainFiles` lists the scripts Next writes into <head> (the first is the bootstrap).
 *   2. .next/server/app/<route>/page_client-reference-manifest.js: `entryJSFiles` lists the app's own client chunks for the layouts and the page,
 *      which Next also writes into <head>; `moduleLoading` makes React's server renderer preload every client chunk it meets.
 *
 * Both lists are emptied (moduleLoading becomes null) and their files are handed to ONE small loader for the whole site, `sf-boot.<hash>.js`, which is
 * the only script left in the document (Next reads the global build-manifest.json for app pages, so one loader serves every route). The loader appends the original scripts, in the original order, after the first contentful paint (or at
 * the first touch, key press or scroll, or after 3.5 s, or at once in a hidden tab). It builds each address the way Next wrote its own: from the
 * src ATTRIBUTE of the loader (relative, `/_next/...`, as the Turbopack runtime expects to find a chunk's path, an absolute `.src` would not match),
 * with the same query string (Vercel's `?dpl=` skew-protection id) and the same nonce, so the scripts it adds are exactly what the document would
 * have asked for, in the same first wave: hydration is not made to wait for a second round of requests.
 *
 * Run by `npm run build` right after `next build`. It is idempotent, it checks what it did, and it fails loudly (so a deployment does not go
 * out half-transformed) if the manifests do not look as expected, for example after a Next upgrade. DEFER_FRAMEWORK=off skips it. It also writes
 * `.next/sf-defer.json` (the original lists per route) for the audit.
 *
 *   node scripts/defer-framework.mjs            apply
 *   node scripts/defer-framework.mjs --check    only verify that .next is transformed (exit 1 if not)
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const next = join(root, '.next');
const appDir = join(next, 'server', 'app');
const CHECK = process.argv.includes('--check');
const log = (message) => console.log(`defer-framework: ${message}`);
const fail = (message) => {
  console.error(`defer-framework: ${message}`);
  process.exit(1);
};

if (!CHECK && process.env.DEFER_FRAMEWORK === 'off') {
  log('skipped (DEFER_FRAMEWORK=off): the framework scripts stay in the document.');
  process.exit(0);
}
if (!existsSync(appDir)) fail('.next/server/app does not exist: run `next build` first.');

/** Every file under `dir` whose name matches, without descending into node_modules or the build cache. */
function walk(dir, test, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'cache') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, test, out);
    else if (test(name)) out.push(path);
  }
  return out;
}

const BOOT = /^static\/chunks\/sf-boot\.[0-9a-f]{12}\.js$/;
const CHUNK = /^static\/chunks\/[\w.-]+\.js$/;
// The file is one preamble line (`globalThis.__RSC_MANIFEST = ... || {};`) and then the assignment of this route's manifest.
const REFERENCE = /(globalThis\.__RSC_MANIFEST\["[^"]+"\]\s*=\s*)(\{[\s\S]*\})(;?\s*)$/;

/** Page build manifests that carry scripts: .../app/<route>/page/build-manifest.json (route handlers carry none). */
const pageManifests = walk(appDir, (name) => name === 'build-manifest.json').filter((path) => path.endsWith(`${sep}page${sep}build-manifest.json`));
if (pageManifests.length === 0) fail('no page build-manifest.json under .next/server/app: the build layout is not what this script knows.');

const routeOf = (manifestPath) => relative(appDir, dirname(dirname(manifestPath))).split(sep).join('/');
const referencePathOf = (route) => join(appDir, ...route.split('/'), 'page_client-reference-manifest.js');

function readReference(route) {
  const path = referencePathOf(route);
  if (!existsSync(path)) fail(`${route}: no page_client-reference-manifest.js next to the page.`);
  const match = REFERENCE.exec(readFileSync(path, 'utf8'));
  if (!match) fail(`${route}: the client reference manifest has a layout this script does not know.`);
  const text = readFileSync(path, 'utf8');
  return { path, before: text.slice(0, match.index), prefix: match[1], data: JSON.parse(match[2]), suffix: match[3] };
}

// ── verify only ─────────────────────────────────────────────────────────────────────────────────────────────────────
if (CHECK) {
  const problems = [];
  const globalList = JSON.parse(readFileSync(join(next, 'build-manifest.json'), 'utf8')).rootMainFiles ?? [];
  if (globalList.length !== 1 || !BOOT.test(globalList[0])) problems.push(`build-manifest.json: rootMainFiles = ${JSON.stringify(globalList)}`);
  for (const manifest of pageManifests) {
    const route = routeOf(manifest);
    const list = JSON.parse(readFileSync(manifest, 'utf8')).rootMainFiles ?? [];
    if (list.length !== 1 || !BOOT.test(list[0])) problems.push(`${route}: rootMainFiles = ${JSON.stringify(list)}`);
    const reference = readReference(route).data;
    if (reference.moduleLoading !== null) problems.push(`${route}: moduleLoading is not null`);
    if (Object.values(reference.entryJSFiles ?? {}).some((files) => files.length > 0)) problems.push(`${route}: entryJSFiles still lists scripts`);
  }
  if (problems.length) fail(`not transformed:\n  ${problems.slice(0, 8).join('\n  ')}`);
  log(`ok: the global manifest and ${pageManifests.length} page manifests name one loader, and no route preloads client chunks.`);
  process.exit(0);
}

// ── apply ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const chunksDir = join(next, 'static', 'chunks');
if (!existsSync(chunksDir)) fail('.next/static/chunks does not exist.');

function loaderFor(files) {
  return `(function(){var f=${JSON.stringify(files)},m=document.currentScript,u=m&&m.getAttribute('src')||'',i=u.indexOf('/_next/'),b=i>=0?u.slice(0,i+7):'/_next/',q=u.indexOf('?')>=0?u.slice(u.indexOf('?')):'',n=m&&(m.nonce||m.getAttribute('nonce'))||'',t=['pointerdown','keydown','touchstart','wheel'],s=false;function go(){if(s)return;s=true;for(var k=0;k<t.length;k++)removeEventListener(t[k],go,true);for(var j=0;j<f.length;j++){var e=document.createElement('script');e.src=b+f[j]+q;e.async=true;if(n)e.nonce=n;if(m&&m.crossOrigin)e.crossOrigin=m.crossOrigin;document.head.appendChild(e)}}function after(){setTimeout(go,0)}if(document.hidden){go();return}for(var k=0;k<t.length;k++)addEventListener(t[k],go,{capture:true,passive:true});try{new PerformanceObserver(function(l,o){for(var x=0;x<l.getEntries().length;x++)if(l.getEntries()[x].name==='first-contentful-paint'){o.disconnect();after();return}}).observe({type:'paint',buffered:true})}catch(e){addEventListener('load',after)}setTimeout(go,3500)})();\n`;
}

/** The app's own client chunks one route needs: the layouts above it and the page itself (error and not-found screens: all of theirs). */
function entryFilesFor(route, entryJSFiles) {
  const special = route.startsWith('_');
  const pageKey = `[project]/app/${route}/page`;
  const files = [];
  for (const [key, list] of Object.entries(entryJSFiles)) {
    if (special || key.endsWith('/layout') || key === pageKey) for (const file of list) if (!files.includes(file)) files.push(file);
  }
  return files;
}

// One loader for the whole site. Next reads the GLOBAL build-manifest.json for app pages (the per-page copies exist too and are kept in step), so a
// per-route loader would not be the one a page names. Its list is the root scripts plus the client chunks of every route's layouts and page: a few
// KB more than one page strictly needs, all of it fetched after the first paint, and nobody waits for a second round of requests.
const globalManifestPath = join(next, 'build-manifest.json');
if (!existsSync(globalManifestPath)) fail('.next/build-manifest.json does not exist.');
const manifestPaths = [globalManifestPath, ...pageManifests];
const rootsOf = (path) => JSON.parse(readFileSync(path, 'utf8')).rootMainFiles ?? [];
const done = (list) => list.length === 1 && BOOT.test(list[0]);

const pending = manifestPaths.filter((path) => rootsOf(path).length > 0 && !done(rootsOf(path)));
if (pending.length === 0) {
  log('nothing to do: .next is already transformed.');
} else {
  const roots = rootsOf(globalManifestPath);
  if (roots.length === 0 || !roots.every((file) => CHUNK.test(file))) fail(`unexpected rootMainFiles in the global manifest: ${JSON.stringify(roots)}`);
  for (const path of pending) if (JSON.stringify(rootsOf(path)) !== JSON.stringify(roots)) fail(`${relative(root, path)}: its rootMainFiles differ from the global manifest's, which this script does not expect.`);

  const references = pageManifests.map((manifestPath) => ({ route: routeOf(manifestPath), ...readReference(routeOf(manifestPath)) }));
  const entriesByRoute = {};
  const loaded = [...roots];
  for (const reference of references) {
    const entries = reference.data.entryJSFiles ?? {};
    if (typeof entries !== 'object' || !Object.values(entries).every((list) => Array.isArray(list) && list.every((file) => CHUNK.test(file)))) fail(`${reference.route}: unexpected entryJSFiles.`);
    entriesByRoute[reference.route] = entries;
    for (const file of entryFilesFor(reference.route, entries)) if (!loaded.includes(file)) loaded.push(file);
  }

  const source = loaderFor(loaded);
  const name = `sf-boot.${createHash('sha256').update(source).digest('hex').slice(0, 12)}.js`;
  writeFileSync(join(chunksDir, name), source);
  for (const path of pending) {
    const manifest = JSON.parse(readFileSync(path, 'utf8'));
    manifest.rootMainFiles = [`static/chunks/${name}`];
    writeFileSync(path, JSON.stringify(manifest));
  }
  for (const reference of references) {
    reference.data.moduleLoading = null;
    reference.data.entryJSFiles = {};
    writeFileSync(reference.path, `${reference.before}${reference.prefix}${JSON.stringify(reference.data)}${reference.suffix}`);
  }
  writeFileSync(join(next, 'sf-defer.json'), JSON.stringify({ loader: `static/chunks/${name}`, rootMainFiles: roots, entryJSFilesByRoute: entriesByRoute, loaded }, null, 1));
  log(`${pending.length} manifests now name one loader, ${name} (${loaded.length} scripts behind it: ${roots.length} framework, ${loaded.length - roots.length} app); the document asks for no framework script.`);
}

// self-check: what was written must read back as transformed
const verify = selfCheck();
function selfCheck() {
  if (!done(rootsOf(globalManifestPath))) return `build-manifest.json: rootMainFiles = ${JSON.stringify(rootsOf(globalManifestPath))}`;
  for (const manifestPath of pageManifests) {
    const list = JSON.parse(readFileSync(manifestPath, 'utf8')).rootMainFiles ?? [];
    if (list.length !== 1 || !BOOT.test(list[0])) return `${routeOf(manifestPath)}: rootMainFiles = ${JSON.stringify(list)}`;
    const reference = readReference(routeOf(manifestPath)).data;
    if (reference.moduleLoading !== null || Object.keys(reference.entryJSFiles ?? {}).length > 0) return `${routeOf(manifestPath)}: client reference manifest not rewritten`;
  }
  return '';
}
if (verify) fail(`self-check failed: ${verify}`);
