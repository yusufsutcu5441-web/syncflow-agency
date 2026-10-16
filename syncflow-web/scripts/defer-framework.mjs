#!/usr/bin/env node
/**
 * Starts React and Next after the first paint instead of with the HTML (docs/adr/0023-framework-after-first-paint.md).
 *
 * Why: Lighthouse (and a visitor on a slow connection) pays for every script the document asks for before the page can paint. The page here is
 * complete HTML and CSS: the framework (React DOM 71 KB, Next's client 45 KB, gzip) and the app's client chunks only add behaviour. Measured
 * through a rewriting proxy first: mobile LCP 2.75 s -> 1.51 s, Lighthouse mobile 96 -> 100, the full browser flow unchanged. This module makes
 * that permanent without touching Next's code: it only edits the data files Next reads when it renders a page, per page:
 *
 *   1. .next/server/app/<route>/page/build-manifest.json: `rootMainFiles` lists the scripts Next writes into <head> (the first is the bootstrap).
 *   2. .next/server/app/<route>/page_client-reference-manifest.js: `entryJSFiles` lists the app's own client chunks for the layouts and the page,
 *      which Next also writes into <head>; `moduleLoading` makes React's server renderer preload every client chunk it meets.
 *
 * Both lists are emptied (moduleLoading becomes null) and their files are handed to ONE small loader for the whole site, `sf-boot.<hash>.js`, which is
 * the only script left in the document (Next reads the global build-manifest.json for app pages, so one loader serves every route). The loader appends
 * the original scripts, in the original order, after the first contentful paint (or at the first touch, key press or scroll, or after 3.5 s, or at once
 * in a hidden tab). It builds each address the way Next wrote its own: from the src ATTRIBUTE of the loader (relative, `/_next/...`, as the Turbopack
 * runtime expects to find a chunk's path, an absolute `.src` would not match), with the same query string (the `?dpl=` skew-protection id, when there
 * is one) and the same nonce, so the scripts it adds are exactly what the document would have asked for, in the same first wave.
 *
 * WHEN it runs matters. On Vercel the platform's adapter packs the build INSIDE `next build` (it hashes every file for upload, copies the static
 * files and points each function at the files of `.next`), so an edit made after `next build` has stale hashes and no copy of the new loader.
 * scripts/sf-adapter.mjs therefore calls this module from the adapter hook, before Next computes those hashes (docs/adr/0023 section 4).
 * Locally the same adapter runs it inside `next build`, so one code path serves both.
 *
 * Layouts: a plain build keeps chunks in `static/chunks/`, Vercel's adapter (supportsImmutableAssets) in `static/immutable/chunks/`; the loader goes
 * next to the framework's own chunks, whichever it is.
 *
 * Everything is validated before anything is written, so an unexpected layout (a Next upgrade) leaves `.next` untouched and the document keeps its
 * scripts (the caller decides whether that is fatal). Idempotent. DEFER_FRAMEWORK=off skips it. `.next/sf-defer.json` records the original lists.
 *
 *   node scripts/defer-framework.mjs            apply to ./.next (rarely needed: `next build` does it)
 *   node scripts/defer-framework.mjs --check    only verify that .next is transformed (exit 1 if not)
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The build layout is not the one this module knows: nothing was written. */
export class LayoutError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LayoutError';
  }
}

const CHUNK_DIR = String.raw`static/(?:immutable/)?chunks`;
const BOOT = new RegExp(String.raw`^${CHUNK_DIR}/sf-boot\.[0-9a-f]{12}\.js$`);
const CHUNK = new RegExp(String.raw`^${CHUNK_DIR}/[\w.-]+\.js$`);
// The file is one preamble line (`globalThis.__RSC_MANIFEST = ... || {};`) and then the assignment of this route's manifest.
const REFERENCE = /(globalThis\.__RSC_MANIFEST\["[^"]+"\]\s*=\s*)(\{[\s\S]*\})(;?\s*)$/;

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

/** Everything about a build directory this module reads, validated; throws LayoutError when it is not what it knows. */
function inspect(distDir) {
  const appDir = join(distDir, 'server', 'app');
  if (!existsSync(appDir)) throw new LayoutError(`${distDir}/server/app does not exist: run \`next build\` first.`);
  const globalManifestPath = join(distDir, 'build-manifest.json');
  if (!existsSync(globalManifestPath)) throw new LayoutError(`${distDir}/build-manifest.json does not exist.`);

  // Page build manifests that carry scripts: .../app/<route>/page/build-manifest.json (route handlers carry none).
  const pageManifests = walk(appDir, (name) => name === 'build-manifest.json').filter((path) => path.endsWith(`${sep}page${sep}build-manifest.json`));
  if (pageManifests.length === 0) throw new LayoutError(`no page build-manifest.json under ${distDir}/server/app: the build layout is not what this module knows.`);

  const routeOf = (manifestPath) => relative(appDir, dirname(dirname(manifestPath))).split(sep).join('/');
  const readReference = (route) => {
    const path = join(appDir, ...route.split('/'), 'page_client-reference-manifest.js');
    if (!existsSync(path)) throw new LayoutError(`${route}: no page_client-reference-manifest.js next to the page.`);
    const text = readFileSync(path, 'utf8');
    const match = REFERENCE.exec(text);
    if (!match) throw new LayoutError(`${route}: the client reference manifest has a layout this module does not know.`);
    return { path, before: text.slice(0, match.index), prefix: match[1], data: JSON.parse(match[2]), suffix: match[3] };
  };
  const rootsOf = (path) => JSON.parse(readFileSync(path, 'utf8')).rootMainFiles ?? [];
  return { globalManifestPath, pageManifests, routeOf, readReference, rootsOf };
}

/**
 * The file-trace lists (`<entry>.nft.json`) that Next hands to an adapter carry a content hash per traced file, taken when the bundler wrote the
 * file, i.e. before this module edited it. A platform that trusts that hash (Vercel's upload dedupes on it) would treat the edited manifest as the
 * unedited one it may already hold. An empty hash means "not recorded": the platform hashes the file itself. `forget` clears the hash of the
 * client reference manifests (the only traced files edited here), `stale` lists the ones that still carry a hash.
 */
function traceHashes(distDir, forget) {
  const stale = [];
  const serverDir = join(distDir, 'server');
  for (const nft of walk(serverDir, (name) => name.endsWith('.nft.json'))) {
    let trace;
    try {
      trace = JSON.parse(readFileSync(nft, 'utf8'));
    } catch {
      continue;
    }
    if (!Array.isArray(trace.files) || !Array.isArray(trace.fileHashes)) continue;
    let touched = false;
    trace.files.forEach((file, i) => {
      if (!/(^|[\\/])page_client-reference-manifest\.js$/.test(file) || !trace.fileHashes[i]) return;
      if (forget) {
        trace.fileHashes[i] = '';
        touched = true;
      } else stale.push(`${relative(distDir, nft)}: ${file}`);
    });
    if (touched) writeFileSync(nft, JSON.stringify(trace));
  }
  return stale;
}

/** What is wrong with a build directory that should be transformed ('' when nothing). */
export function problemsIn(distDir) {
  const { globalManifestPath, pageManifests, routeOf, readReference, rootsOf } = inspect(distDir);
  const problems = [];
  const globalList = rootsOf(globalManifestPath);
  if (globalList.length !== 1 || !BOOT.test(globalList[0])) problems.push(`build-manifest.json: rootMainFiles = ${JSON.stringify(globalList)}`);
  else if (!existsSync(join(distDir, ...globalList[0].split('/')))) problems.push(`the loader ${globalList[0]} is not on disk`);
  for (const manifest of pageManifests) {
    const route = routeOf(manifest);
    const list = rootsOf(manifest);
    if (list.length !== 1 || !BOOT.test(list[0])) problems.push(`${route}: rootMainFiles = ${JSON.stringify(list)}`);
    const reference = readReference(route).data;
    if (reference.moduleLoading !== null) problems.push(`${route}: moduleLoading is not null`);
    if (Object.values(reference.entryJSFiles ?? {}).some((files) => files.length > 0)) problems.push(`${route}: entryJSFiles still lists scripts`);
  }
  for (const entry of traceHashes(distDir, false)) problems.push(`stale content hash of an edited manifest in the file trace ${entry}`);
  return { problems, pages: pageManifests.length };
}

/**
 * Transform a build directory. Returns { changed, loader, loaded, roots, pages }; throws LayoutError (nothing written) when the layout is unknown.
 * `distDir` is the absolute path of `.next`.
 */
export function deferFramework(distDir) {
  const { globalManifestPath, pageManifests, routeOf, readReference, rootsOf } = inspect(distDir);
  const manifestPaths = [globalManifestPath, ...pageManifests];
  const done = (list) => list.length === 1 && BOOT.test(list[0]);
  const pending = manifestPaths.filter((path) => rootsOf(path).length > 0 && !done(rootsOf(path)));
  if (pending.length === 0) {
    const sidecar = join(distDir, 'sf-defer.json');
    const info = existsSync(sidecar) ? JSON.parse(readFileSync(sidecar, 'utf8')) : {};
    return { changed: false, loader: info.loader ?? rootsOf(globalManifestPath)[0], loaded: info.loaded ?? [], roots: info.rootMainFiles ?? [], pages: pageManifests.length };
  }

  // ── validate everything first: nothing is written until the whole build has been understood ──
  const roots = rootsOf(globalManifestPath);
  if (roots.length === 0 || !roots.every((file) => CHUNK.test(file))) throw new LayoutError(`unexpected rootMainFiles in the global manifest: ${JSON.stringify(roots)}`);
  const chunkDir = posix.dirname(roots[0]);
  if (!roots.every((file) => posix.dirname(file) === chunkDir)) throw new LayoutError(`the framework scripts are not in one directory: ${JSON.stringify(roots)}`);
  if (!existsSync(join(distDir, ...chunkDir.split('/')))) throw new LayoutError(`${distDir}/${chunkDir} does not exist.`);
  for (const path of pending) {
    if (JSON.stringify(rootsOf(path)) !== JSON.stringify(roots)) throw new LayoutError(`${relative(distDir, path)}: its rootMainFiles differ from the global manifest's, which this module does not expect.`);
  }
  const references = pageManifests.map((manifestPath) => ({ route: routeOf(manifestPath), ...readReference(routeOf(manifestPath)) }));
  const entriesByRoute = {};
  const loaded = [...roots];
  for (const reference of references) {
    const entries = reference.data.entryJSFiles ?? {};
    if (typeof entries !== 'object' || !Object.values(entries).every((list) => Array.isArray(list) && list.every((file) => CHUNK.test(file)))) throw new LayoutError(`${reference.route}: unexpected entryJSFiles.`);
    entriesByRoute[reference.route] = entries;
    for (const file of entryFilesFor(reference.route, entries)) if (!loaded.includes(file)) loaded.push(file);
  }
  for (const file of loaded) if (!existsSync(join(distDir, ...file.split('/')))) throw new LayoutError(`${file} is named by a manifest but is not on disk.`);

  // ── write ──
  // One loader for the whole site. Next reads the GLOBAL build-manifest.json for app pages (the per-page copies exist too and are kept in step), so a
  // per-route loader would not be the one a page names. Its list is the root scripts plus the client chunks of every route's layouts and page: a few
  // KB more than one page strictly needs, all of it fetched after the first paint, and nobody waits for a second round of requests.
  const source = loaderFor(loaded);
  const name = `sf-boot.${createHash('sha256').update(source).digest('hex').slice(0, 12)}.js`;
  const loader = `${chunkDir}/${name}`;
  writeFileSync(join(distDir, ...loader.split('/')), source);
  for (const path of pending) {
    const manifest = JSON.parse(readFileSync(path, 'utf8'));
    manifest.rootMainFiles = [loader];
    writeFileSync(path, JSON.stringify(manifest));
  }
  for (const reference of references) {
    reference.data.moduleLoading = null;
    reference.data.entryJSFiles = {};
    writeFileSync(reference.path, `${reference.before}${reference.prefix}${JSON.stringify(reference.data)}${reference.suffix}`);
  }
  traceHashes(distDir, true);
  writeFileSync(join(distDir, 'sf-defer.json'), JSON.stringify({ loader, rootMainFiles: roots, entryJSFilesByRoute: entriesByRoute, loaded }, null, 1));

  // self-check: what was written must read back as transformed
  const { problems } = problemsIn(distDir);
  if (problems.length) throw new Error(`self-check failed after writing: ${problems.slice(0, 3).join('; ')}`);
  return { changed: true, loader, loaded, roots, pages: pageManifests.length };
}

// ── command line ───────────────────────────────────────────────────────────────────────────────────────────────────────
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const distDir = join(dirname(fileURLToPath(import.meta.url)), '..', '.next');
  const log = (message) => console.log(`defer-framework: ${message}`);
  try {
    if (process.argv.includes('--check')) {
      const { problems, pages } = problemsIn(distDir);
      if (problems.length) {
        console.error(`defer-framework: not transformed:\n  ${problems.slice(0, 8).join('\n  ')}`);
        process.exit(1);
      }
      log(`ok: the global manifest and ${pages} page manifests name one loader, and no route preloads client chunks.`);
    } else if (process.env.DEFER_FRAMEWORK === 'off') {
      log('skipped (DEFER_FRAMEWORK=off): the framework scripts stay in the document.');
    } else {
      const result = deferFramework(distDir);
      log(result.changed
        ? `${result.pages + 1} manifests now name one loader, ${posix.basename(result.loader)} (${result.loaded.length} scripts behind it: ${result.roots.length} framework, ${result.loaded.length - result.roots.length} app).`
        : 'nothing to do: .next is already transformed.');
    }
  } catch (error) {
    console.error(`defer-framework: ${error.message}`);
    process.exit(1);
  }
}
