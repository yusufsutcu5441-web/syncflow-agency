#!/usr/bin/env node
/**
 * Renders a scene video from the Remotion compositions (remotion/) into public/media/clips/ — on request only: a plain run renders nothing (see below).
 * For a scene it writes three files:
 *   <name>.mp4   H.264, played wherever the browser can decode it (smaller here, hardware-decoded on phones)
 *   <name>.webm  VP9, the fallback for browsers without H.264
 *   <name>.webp  poster: the scene fully composed (frame POSTER_FRAME in remotion/config.ts)
 * The scenes contain no readable marketing text (captions on the site are HTML over the video), so one render serves every
 * language. The site serves these as static files and ships no Remotion code (docs/adr/0003, 0006).
 * Since 25.11.2026 NONE of the shipped films is a bare render (docs/adr/0038 sections 21 and 22): the three sector films are concept-site
 * recordings and all five shipped files are warm-anthracite regrades under versioned names (estate-4.*, clinic-4.*, law-4.*, monolith-4.*,
 * logistics-2.*; lib/clips.ts). Rendering a scene writes bare-name files that nothing serves and the checks require to be absent; a render
 * that is meant to ship goes through the section-22 grade and a NEW versioned name first.
 *
 *   npm run film:render                    everything
 *   npm run film:render -- --posters       posters only (fast)
 *   npm run film:render -- --only=clinic   one scene
 *   npm run film:render -- --formats=mp4   only some formats (mp4, webm), e.g. to check a file size quickly
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
const CLIPS = ['monolith', 'estate', 'clinic', 'law', 'logistics'];
const POSTER_FRAME = { monolith: 36, estate: 120, clinic: 70, law: 90, logistics: 70 };
// The compositions are drawn at 1280 x 720; --scale renders them larger without touching a coordinate. Every scene is rendered at 1.5
// (1920 x 1080). The architecture monolith was the exception until 24.11.2026 (docs/adr/0038 section 15): it stayed at 1 and shipped at
// 1280 x 720, which made the site's "every scene at 1920 x 1080" sentence need a parenthesis. It renders at 1.5 now, like the rest.
const SCALE = { monolith: 1.5, estate: 1.5, clinic: 1.5, law: 1.5, logistics: 1.5 };

/** Frames go through PNG, not the default JPEG, so thin lines and small text reach the encoder undamaged. */
const COMMON = ['--muted', '--overwrite', '--image-format=png', '--log=error'];
/** Larger frames cost more bytes, so their constant-quality targets sit a little higher (a lower quality number per pixel is the same picture). */
const formats = (large) => [
  { ext: 'mp4', args: ['--codec=h264', `--crf=${large ? 26 : 23}`, '--x264-preset=slow', '--pixel-format=yuv420p'] },
  { ext: 'webm', args: ['--codec=vp9', `--crf=${large ? 35 : 32}`, '--pixel-format=yuv420p'] },
];

const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith('--only='))?.slice('--only='.length);
const postersOnly = args.includes('--posters');
const only_formats = args.find((a) => a.startsWith('--formats='))?.slice('--formats='.length).split(',');

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
// A plain run renders NOTHING since the warm-anthracite regrade (docs/adr/0038 section 22): every shipped film is a graded derivative under a
// versioned name (estate-4, clinic-4, law-4, monolith-4, logistics-2), and the checks require every bare scene name to be absent from the
// repository, so a default render would only write files that nothing serves. Render a scene on purpose with --only=<name> (the scenes are
// untouched in remotion/scenes; a fresh render then goes through the section-22 grade and a NEW versioned name before it can ship).
const NOT_SHIPPED = ['estate', 'clinic', 'law', 'monolith', 'logistics'];
const targets = CLIPS.filter((name) => (only ? name === only : !NOT_SHIPPED.includes(name)));
if (targets.length === 0 && only) {
  console.error(`No scene matches --only=${only}. Choose one of: ${CLIPS.join(', ')}`);
  process.exit(1);
}
if (targets.length === 0) {
  console.log('Nothing to render by default: every shipped film is a graded, versioned derivative (docs/adr/0038 section 22). Use --only=<scene>.');
  process.exit(0);
}

const sizes = [];
const started = Date.now();
for (const name of targets) {
  const id = `Clip-${name}`;
  const base = join(outDir, name);
  const scale = `--scale=${SCALE[name]}`;
  const jobs = [
    { label: 'poster', file: `${base}.webp`, parts: ['still', 'remotion/index.ts', id, `"${base}.webp"`, `--frame=${POSTER_FRAME[name]}`, scale, '--overwrite', '--log=error'] },
    ...(postersOnly
      ? []
      : formats(SCALE[name] > 1)
          .filter(({ ext }) => !only_formats || only_formats.includes(ext))
          .map(({ ext, args: encoder }) => ({ label: ext, file: `${base}.${ext}`, parts: ['render', 'remotion/index.ts', id, `"${base}.${ext}"`, ...encoder, scale, ...COMMON] }))),
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
