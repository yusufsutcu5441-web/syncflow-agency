#!/usr/bin/env node
/**
 * Contract tests of the briefing delivery channels (tests/delivery): the SMTP conversation (lib/server/smtp.ts) and the Telegram Bot API
 * (lib/server/telegram.ts), each against a fake server on loopback, and the encoder of every mail link on the site (lib/mailto.ts: percent-encoding,
 * %0D%0A line breaks, the free site audit request; docs/adr/0035-sales-ready-release.md).
 *
 *   npm run delivery:verify
 *
 * The modules under test are TypeScript. Node loads .ts files directly only from 22.18 (type stripping), so `node --test` on them failed on the
 * Node 20.19 that package.json allows (ERR_UNKNOWN_FILE_EXTENSION, seen on 20.19.0 at release-2026-10-19b, which made step 3 of the release gate fail there).
 * So, like scripts/arch-verify.mjs, they are compiled with the TypeScript API into a temporary folder first (types stripped) and the tests import them from
 * there (DELIVERY_LIB). The folder sits inside node_modules/.cache so that the bare import of nodemailer resolves, and it is removed at the end.
 * On Node 22.18 or newer the tests also run on the sources directly: node --test tests/delivery/*.test.mjs
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// [folder, module]: each is compiled to <name>.js in the temporary folder.
const MODULES = [['lib/server', 'smtp'], ['lib/server', 'telegram'], ['lib', 'mailto']];
const TESTS = MODULES.map(([, name]) => join('tests', 'delivery', `${name}.test.mjs`));

const cache = join(root, 'node_modules', '.cache');
mkdirSync(cache, { recursive: true });
const out = mkdtempSync(join(cache, 'syncflow-delivery-'));

try {
  for (const [dir, name] of MODULES) {
    const file = join(root, dir, `${name}.ts`);
    const code = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, verbatimModuleSyntax: false },
      fileName: file,
    }).outputText;
    writeFileSync(join(out, `${name}.js`), code);
  }
  writeFileSync(join(out, 'package.json'), '{"type":"module"}');
  const run = spawnSync(process.execPath, ['--test', '--test-reporter=spec', ...TESTS], { cwd: root, env: { ...process.env, DELIVERY_LIB: out }, stdio: 'inherit' });
  process.exitCode = run.status ?? 1;
} finally {
  rmSync(out, { recursive: true, force: true });
}
