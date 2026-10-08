#!/usr/bin/env node
/**
 * Renders the four scene videos from the Remotion compositions (remotion/) into public/media/clips/.
 * For every scene it writes three files:
 *   <name>.mp4   H.264, played wherever the browser can decode it (smaller here, hardware-decoded on phones)
 *   <name>.webm  VP9, the fallback for browsers without H.264
 *   <name>.webp  poster: the scene fully composed (frame POSTER_FRAME in remotion/config.ts)
 * The scenes contain no readable marketing text (captions on the site are HTML over the video), so one render serves every
 * language. The site serves these as static files and ships no Remotion code (docs/adr/0003, 0006).
 * Re-run it whenever a scene in remotion/scenes changes, then commit the files.
 *
 *   npm run film:render                    everything
 *   npm run film:render -- --posters       posters only (fast)
 *   npm run film:render -- --only=estate   one scene
 *   npm run remotion:studio                open Remotion Studio to edit the scenes
 *
 * The Remotion CLI is fetched on demand with npx at the version of the installed `remotion` package, so nothing extra
 * lives in package.json. It prints a "zod version mismatch" warning: harmless, the compositions define no zod schema.
 * The scene list is CLIPS in remotion/config.ts.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'media', 'clips');
const { version } = JSON.parse(readFileSync(join(root, 'node_modules', 'remotion', 'package.json'), 'utf8'));

// Mirrors remotion/config.ts (kept in plain JS here so this script needs no TypeScript runtime).
const CLIPS = ['monolith', 'estate', 'clinic', 'saas'];
const POSTER_FRAME = { monolith: 36, estate: 120, clinic: 70, saas: 150 };

/** Frames go through PNG, not the default JPEG, so thin lines and small text reach the encoder undamaged. */
const COMMON = ['--muted', '--overwrite', '--image-format=png', '--log=error'];
const FORMATS = [
  { ext: 'mp4', args: ['--codec=h264', '--crf=23', '--x264-preset=slow', '--pixel-format=yuv420p'] },
  { ext: 'webm', args: ['--codec=vp9', '--crf=32', '--pixel-format=yuv420p'] },
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
const targets = CLIPS.filter((name) => !only || name === only);
if (targets.length === 0) {
  console.error(`No scene matches --only=${only}. Choose one of: ${CLIPS.join(', ')}`);
  process.exit(1);
}

const sizes = [];
const started = Date.now();
for (const name of targets) {
  const id = `Clip-${name}`;
  const base = join(outDir, name);
  const jobs = [
    { label: 'poster', file: `${base}.webp`, parts: ['still', 'remotion/index.ts', id, `"${base}.webp"`, `--frame=${POSTER_FRAME[name]}`, '--overwrite', '--log=error'] },
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
