#!/usr/bin/env node
/**
 * Fetches Cabinet Grotesk (Indian Type Foundry, ITF Free Font License v2.0) into public/fonts at build time.
 *
 * Why it is not in the repository: the licence (section 02) forbids distributing the font files, explicitly "through any ...
 * repository ... publicly accessible servers", and forbids subsetting and format conversion without written consent. This
 * repository is public. Serving the unmodified official files from our own site with @font-face is allowed (section 01:
 * "self-hosting ... is permitted and recommended"), so the files are downloaded when the site is built or started and are
 * git-ignored (/public/fonts/cabinet-grotesk-*).
 *
 * The files come from Fontshare's own CSS API, untouched: no subsetting, no conversion, no renaming of internals.
 * This script never fails the build. If the download is impossible (offline, blocked, the API changed) the site falls back to
 * Instrument Sans through the font stack (--font-ui in app/globals.css) and says so here.
 *
 * Run by npm automatically before `npm run build` and `npm run dev` (prebuild, predev).
 */
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'fonts');
const WEIGHTS = [500];
const fileFor = (weight) => join(outDir, `cabinet-grotesk-${weight}.woff2`);
const API = `https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@${WEIGHTS.join(',')}&display=swap`;

/** A real WOFF2 of a plausible size (the official files are about 20 KB each). */
const valid = (path) => {
  try {
    const size = statSync(path).size;
    return size > 5_000 && size < 200_000 && readFileSync(path).subarray(0, 4).toString('latin1') === 'wOF2';
  } catch {
    return false;
  }
};

const missing = WEIGHTS.filter((w) => !valid(fileFor(w)));
if (missing.length === 0) {
  console.log('fonts: Cabinet Grotesk already present, nothing to fetch');
  process.exit(0);
}

try {
  mkdirSync(outDir, { recursive: true });
  const signal = () => AbortSignal.timeout(20_000);
  const cssRes = await fetch(API, { signal: signal() });
  if (!cssRes.ok) throw new Error(`Fontshare CSS API answered ${cssRes.status}`);
  const css = await cssRes.text();

  // One @font-face block per weight: take the first normal-style woff2 of each wanted weight.
  const blocks = css.match(/@font-face\s*\{[^}]*\}/g) ?? [];
  const urlByWeight = new Map();
  for (const block of blocks) {
    const weight = Number(block.match(/font-weight:\s*(\d+)/)?.[1]);
    const style = block.match(/font-style:\s*(\w+)/)?.[1] ?? 'normal';
    const url = block.match(/url\(['"]?((?:https?:)?\/\/[^'")\s]+\.woff2)['"]?\)/)?.[1];
    if (weight && url && style === 'normal' && !urlByWeight.has(weight)) urlByWeight.set(weight, url.startsWith('//') ? `https:${url}` : url);
  }

  for (const weight of missing) {
    const url = urlByWeight.get(weight);
    if (!url) throw new Error(`no woff2 for weight ${weight} in the Fontshare answer`);
    const res = await fetch(url, { signal: signal() });
    if (!res.ok) throw new Error(`weight ${weight}: ${res.status}`);
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.subarray(0, 4).toString('latin1') !== 'wOF2' || bytes.length < 5_000) throw new Error(`weight ${weight}: not a WOFF2 file`);
    writeFileSync(fileFor(weight), bytes);
    console.log(`fonts: Cabinet Grotesk ${weight} downloaded (${(bytes.length / 1024).toFixed(1)} KB)`);
  }
} catch (error) {
  console.warn(`fonts: Cabinet Grotesk could not be fetched (${error instanceof Error ? error.message : error}).`);
  console.warn('fonts: continuing; the interface falls back to Instrument Sans (docs/adr/0014-cinematic-layer.md).');
}
process.exit(0);
