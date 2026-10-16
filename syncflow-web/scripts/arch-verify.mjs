#!/usr/bin/env node
/**
 * Contract tests of the reference architecture (docs/architecture/, docs/adr/0021-production-performance-and-enterprise-proof.md §5).
 *
 *   npm run arch:verify                 run tests/arch against lib/arch (Node's built-in test runner, nothing to install)
 *   npm run arch:verify -- --report     also print what each queue scenario does, as a table
 *   npm run arch:examples               rewrite docs/architecture/examples/ from the code (the tests fail when the files and the code disagree)
 *
 * The code under test is TypeScript with the same imports as the rest of the app, so it is compiled with the TypeScript API into a temporary
 * folder first (types stripped, relative imports given their extension), and that folder is removed at the end. Nothing is added to the
 * project and nothing outside the temporary folder is written, except docs/architecture/examples/ with --write-examples.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const report = args.includes('--report');
const writeExamples = args.includes('--write-examples');

const sources = [];
for (const dir of ['lib/arch', 'tests/arch']) {
  const full = join(root, dir);
  if (!existsSync(full)) continue;
  for (const name of readdirSync(full)) if (name.endsWith('.ts')) sources.push(join(full, name));
}

const out = mkdtempSync(join(tmpdir(), 'syncflow-arch-'));
const resolveImport = (from, spec) => {
  const base = resolve(dirname(from), spec);
  if (existsSync(`${base}.ts`)) return `${spec}.js`;
  if (existsSync(base) && statSync(base).isDirectory() && existsSync(join(base, 'index.ts'))) return `${spec}/index.js`;
  return spec;
};

try {
  for (const file of sources) {
    const code = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, verbatimModuleSyntax: false },
      fileName: file,
    }).outputText.replace(/(from\s+['"])(\.{1,2}\/[^'"]+)(['"])/g, (_, a, spec, c) => `${a}${resolveImport(file, spec)}${c}`);
    const target = join(out, relative(root, file)).replace(/\.ts$/, '.js');
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, code);
  }
  writeFileSync(join(out, 'package.json'), '{"type":"module"}');

  const env = { ...process.env, ARCH_ROOT: root, ARCH_BUILD: out, ARCH_WRITE_EXAMPLES: writeExamples ? '1' : '' };

  if (writeExamples) {
    // Regenerate the documentation's examples from the code, then run the tests (which now agree with the files by construction).
    const { writeAll } = await import(pathToFileURL(join(out, 'tests/arch/examples.js')).href);
    await writeAll(root);
    console.log('docs/architecture/examples/ rewritten from lib/arch');
  }

  const tests = sources.filter((f) => f.includes(`${join('tests', 'arch')}`) && f.endsWith('.test.ts')).map((f) => join(out, relative(root, f)).replace(/\.ts$/, '.js'));
  const run = spawnSync(process.execPath, ['--test', '--test-reporter=spec', ...tests], { cwd: root, env, stdio: 'inherit' });

  if (report && run.status === 0) {
    const { SCENARIOS } = await import(pathToFileURL(join(out, 'lib/arch/scenarios.js')).href);
    const { runScenario } = await import(pathToFileURL(join(out, 'lib/arch/simulate.js')).href);
    const rows = SCENARIOS.map((s) => runScenario(s));
    const col = (v, w) => String(v).padEnd(w);
    console.log(`\n${col('scenario', 62)}${col('accepted', 9)}${col('applied', 8)}${col('dup@recv', 9)}${col('dup@queue', 10)}${col('dead', 5)}${col('waiting', 8)}${col('lost', 5)}${col('order', 6)}${col('circuit', 8)}`);
    for (const r of rows)
      console.log(`${col(r.name, 62)}${col(r.accepted, 9)}${col(r.appliedAtReceiver, 8)}${col(r.duplicatesDroppedAtReceiver, 9)}${col(r.duplicatesDroppedAtQueue, 10)}${col(r.deadLettered, 5)}${col(r.stillWaiting, 8)}${col(r.lost, 5)}${col(r.orderPreserved ? 'kept' : 'BROKEN', 6)}${col(r.circuitOpened ? 'opened' : '-', 8)}`);
  }
  process.exitCode = run.status ?? 1;
} finally {
  rmSync(out, { recursive: true, force: true });
}
