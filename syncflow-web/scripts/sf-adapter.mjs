/**
 * Next.js build adapter (config `adapterPath`): runs scripts/defer-framework.mjs inside `next build`, then hands over to the platform's adapter.
 * Decision and reasons: docs/adr/0023-framework-after-first-paint.md section 4.
 *
 * Why an adapter and not a script after `next build`: on Vercel, `next build` ends by calling the platform's adapter (NEXT_ADAPTER_PATH, set by the
 * builder), which packs the deployment right there: it hashes every file of every function for upload, copies `.next/static` into the output and
 * records, per function, which files of `.next` it ships. A manifest edited afterwards carries a stale hash, and a new static file (the loader) is
 * in nobody's list, so the HTML would name a script that does not exist. The edit has to be made before Next computes those hashes and lists.
 *
 * Next reads `adapterMod.onBuildComplete` first, as `typeof ... === 'function'`, BEFORE it hashes and lists anything, and after every manifest
 * has been written. That read is the one moment that fits, so `onBuildComplete` is a getter: reading it applies the transform (synchronous,
 * idempotent: Next reads it a second time to call it). Two cases for what it returns:
 *   - on Vercel the platform's adapter is loaded from NEXT_ADAPTER_PATH and its hooks run as if this wrapper were not there (modifyConfig,
 *     onBuildComplete), so deployments are packed exactly as before, only from already-transformed files;
 *   - anywhere else (a local build, CI) there is no platform adapter: the getter returns undefined, and Next skips the adapter step altogether
 *     (it would otherwise trace and list every output for an adapter that does nothing).
 *
 * If the build layout is not the one defer-framework knows (a Next upgrade), nothing was written, so this warns loudly and ships the document with
 * its scripts: slower on mobile (Lighthouse ~96), never broken. DEFER_FRAMEWORK=strict turns that into a failed build, DEFER_FRAMEWORK=off skips
 * the transform. `defer-framework.mjs --check`, the smoke test and live-check.mjs all notice a build that was not transformed.
 */
import { existsSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { deferFramework, LayoutError } from './defer-framework.mjs';

const BUILD_PHASE = 'phase-production-build';
const here = fileURLToPath(import.meta.url);
const log = (message) => console.log(`   sf-adapter: ${message}`);

let projectDir = process.cwd();
let distDir = '.next';
let platform; // the platform's adapter module (or null), loaded once

async function platformAdapter() {
  if (platform !== undefined) return platform;
  const path = process.env.NEXT_ADAPTER_PATH;
  platform = null;
  if (path && resolve(path) !== here && existsSync(path)) {
    const loaded = await import(pathToFileURL(path).href);
    platform = loaded.default ?? loaded;
  }
  return platform;
}

let applied = false;
function transform() {
  if (applied) return;
  applied = true;
  const mode = process.env.DEFER_FRAMEWORK ?? 'on';
  if (mode === 'off') return log('DEFER_FRAMEWORK=off: the framework scripts stay in the document.');
  const dir = isAbsolute(distDir) ? distDir : join(projectDir, distDir);
  try {
    const result = deferFramework(dir);
    log(result.changed
      ? `framework scripts moved behind one loader (${result.loader.split('/').pop()}): ${result.roots.length} framework + ${result.loaded.length - result.roots.length} app scripts, ${result.pages} pages.`
      : 'already transformed.');
  } catch (error) {
    if (mode === 'strict' || !(error instanceof LayoutError)) throw error;
    console.warn(`\n   sf-adapter: WARNING the framework scripts were NOT moved behind the loader, so the page asks for them in the document (works, mobile Lighthouse ~96):\n   ${error.message}\n   Run \`node scripts/defer-framework.mjs --check\` after fixing; DEFER_FRAMEWORK=strict fails the build instead.\n`);
  }
}

const adapter = {
  name: 'SyncFlow (framework after first paint)',

  async modifyConfig(config, context) {
    if (context?.phase === BUILD_PHASE) {
      projectDir = context.projectDir ?? projectDir;
      distDir = config.distDir ?? distDir;
    }
    const inner = await platformAdapter();
    return inner && typeof inner.modifyConfig === 'function' ? inner.modifyConfig(config, context) : config;
  },

  get onBuildComplete() {
    transform();
    if (!process.env.NEXT_ADAPTER_PATH || resolve(process.env.NEXT_ADAPTER_PATH) === here) return undefined;
    return async (context) => {
      const inner = await platformAdapter();
      if (inner && typeof inner.onBuildComplete === 'function') await inner.onBuildComplete(context);
    };
  },
};

export default adapter;
