// `next build` without moving the framework scripts behind the loader (DEFER_FRAMEWORK=off for scripts/sf-adapter.mjs): the A/B baseline for
// docs/adr/0023, and a way to ship while the transform is being repaired. A tiny wrapper because `VAR=x cmd` is not portable to Windows.
import { spawnSync } from 'node:child_process';

const run = spawnSync('next', ['build'], { stdio: 'inherit', shell: true, env: { ...process.env, DEFER_FRAMEWORK: 'off' } });
process.exit(run.status ?? 1);
