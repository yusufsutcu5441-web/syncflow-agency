#!/usr/bin/env node
/**
 * Renders the Showcase film from the Remotion composition (remotion/) into public/media/showcase/.
 * For every launch language and both layouts it writes three files:
 *   architecture-<locale>-<layout>.mp4   H.264, played wherever the browser can decode it (smaller here, hardware-decoded on phones)
 *   architecture-<locale>-<layout>.webm  VP9, the fallback for browsers without H.264
 *   architecture-<locale>-<layout>.webp  poster: the architecture scene, fully drawn (frame 118)
 * The site serves these as static files and ships no Remotion code (docs/adr/0003-showcase-film-static-render.md).
 * Re-run it whenever the composition or messages/<locale>.json (Showcase.scene) changes, then commit the files.
 *
 *   npm run film:render                          everything (about 10 minutes)
 *   npm run film:render -- --posters             posters only (fast)
 *   npm run film:render -- --only=en-wide        one composition (<locale>-<layout>)
 *   npm run remotion:studio                      open Remotion Studio to edit the composition
 *
 * The Remotion CLI is fetched on demand with npx at the version of the installed `remotion` package, so nothing extra
 * lives in package.json. It prints a "zod version mismatch" warning: harmless, the composition defines no zod schema.
 * The launch languages below must match the MESSAGES list in remotion/Root.tsx.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'media', 'showcase');
const { version } = JSON.parse(readFileSync(join(root, 'node_modules', 'remotion', 'package.json'), 'utf8'));

const LOCALES = ['en', 'tr'];
const LAYOUTS = ['wide', 'tall'];
const POSTER_FRAME = 118;

/** Frames go through PNG, not the default JPEG, so thin lines and small text reach the encoder undamaged. */
const COMMON = ['--muted', '--overwrite', '--image-format=png', '--log=error'];
const FORMATS = [
  { ext: 'mp4', args: ['--codec=h264', '--crf=20', '--x264-preset=slow', '--pixel-format=yuv420p'] },
  { ext: 'webm', args: ['--codec=vp9', '--crf=28', '--pixel-format=yuv420p'] },
];

const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith('--only='))?.slice('--only='.length);
const postersOnly = args.includes('--posters');

const cli = (parts, { quiet = true } = {}) => {
  const command = ['npx', '--yes', '-p', `@remotion/cli@${version}`, 'remotion', ...parts].join(' ');
  const run = spawnSync(command, { cwd: root, shell: true, encoding: 'utf8', maxBuffer: 1 << 26, stdio: quiet ? 'pipe' : 'inherit' });
  if (!quiet) return run.status ?? 1;
  // Drop the harmless zod version-mismatch block; show anything else.
  const text = `${run.stdout ?? ''}${run.stderr ?? ''}`.replace(/-{5,}\s*\r?\nVersion mismatch:[\s\S]*?-{5,}\s*\r?\n/g, '').trim();
  if (run.status !== 0 || text) console.log(text);
  return run.status ?? 1;
};

if (args.includes('--studio')) process.exit(cli(['studio', 'remotion/index.ts'], { quiet: false }));

mkdirSync(outDir, { recursive: true });
const targets = LOCALES.flatMap((locale) => LAYOUTS.map((layout) => `${locale}-${layout}`)).filter((name) => !only || name === only);
if (targets.length === 0) {
  console.error(`No composition matches --only=${only}. Choose one of: ${LOCALES.flatMap((l) => LAYOUTS.map((y) => `${l}-${y}`)).join(', ')}`);
  process.exit(1);
}

const sizes = [];
const started = Date.now();
for (const name of targets) {
  const id = `Architecture-${name}`;
  const base = join(outDir, `architecture-${name}`);
  const jobs = [
    { label: 'poster', file: `${base}.webp`, parts: ['still', 'remotion/index.ts', id, `"${base}.webp"`, `--frame=${POSTER_FRAME}`, '--overwrite', '--log=error'] },
    ...(postersOnly ? [] : FORMATS.map(({ ext, args: encoder }) => ({ label: ext, file: `${base}.${ext}`, parts: ['render', 'remotion/index.ts', id, `"${base}.${ext}"`, ...encoder, ...COMMON] }))),
  ];
  for (const job of jobs) {
    const t0 = Date.now();
    process.stdout.write(`${id} ${job.label} ... `);
    if (cli(job.parts) !== 0) {
      console.error('FAILED');
      process.exit(1);
    }
    const kb = Math.round(statSync(job.file).size / 1024);
    sizes.push([`${id}.${job.label}`, kb]);
    console.log(`${kb} KB (${Math.round((Date.now() - t0) / 1000)} s)`);
  }
}

console.log(`\nDone in ${Math.round((Date.now() - started) / 1000)} s -> ${outDir}`);
const total = sizes.reduce((sum, [, kb]) => sum + kb, 0);
console.log(`${sizes.length} files, ${total} KB in total`);
