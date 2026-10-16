import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { computeExamples, mappingTables, scenarioTable, withBlock } from './examples';

const root = process.env.ARCH_ROOT ?? process.cwd();
const docs = join(root, 'docs', 'architecture');
// Line endings are not content: a Windows checkout with core.autocrlf turns the documents into CRLF, the generated tables are LF.
const read = (path: string) => readFileSync(join(docs, path), 'utf8').replace(/\r\n/g, '\n');

describe('documentation: the evidence in docs/architecture/ is what the code does today', () => {
  it('every example file equals what the code computes (npm run arch:examples rewrites them)', async () => {
    const computed = await computeExamples();
    for (const [name, value] of Object.entries(computed)) {
      const path = join(docs, 'examples', name);
      assert.ok(existsSync(path), `docs/architecture/examples/${name} exists`);
      assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')), JSON.parse(JSON.stringify(value)), `${name} is in sync with lib/arch`);
    }
    const onDisk = readdirSync(join(docs, 'examples')).filter((f) => f.endsWith('.json'));
    assert.deepEqual(onDisk.sort(), Object.keys(computed).sort(), 'no example file without code behind it');
  });

  it('the generated tables in the documents equal what the code produces', () => {
    const queueDoc = read('fail-safe-queue.md');
    assert.equal(withBlock(queueDoc, 'scenarios', scenarioTable()), queueDoc, 'the scenario table in fail-safe-queue.md is in sync (npm run arch:examples)');
    const integrations = read('integrations.md');
    assert.equal(withBlock(integrations, 'mappings', mappingTables()), integrations, 'the mapping tables in integrations.md are in sync (npm run arch:examples)');
  });

  it('the documents exist and say what is and is not claimed', () => {
    for (const file of ['README.md', 'fail-safe-queue.md', 'security-envelope.md', 'integrations.md', 'canonical-event.schema.json']) assert.ok(existsSync(join(docs, file)), file);
    const readme = read('README.md');
    for (const phrase of ['Implemented in this repository', 'Reference implementation, verified by tests', 'Not claimed', 'npm run arch:verify']) assert.ok(readme.includes(phrase), `README says "${phrase}"`);
  });

  it('the documents claim no guarantee, certification, uptime or vendor conformance', () => {
    const text = ['README.md', 'fail-safe-queue.md', 'security-envelope.md', 'integrations.md'].map(read).join('\n');
    // They may NAME these things in order to disclaim them; they may not assert them.
    assert.ok(!/\b(guarantee[sd]?|100 ?%|SLA of|certified|99\.\d+ ?%)\b/i.test(text.replace(/not (a |an )?(guarantee|certif\w+|SLA)/gi, '').replace(/no (guarantee|certif\w+|uptime|SLA)/gi, '')), 'no assertion of a guarantee, certification, SLA or uptime');
  });

  it('every file the documents point at exists', () => {
    const text = ['README.md', 'fail-safe-queue.md', 'security-envelope.md', 'integrations.md'].map(read).join('\n');
    const paths = new Set([...text.matchAll(/`((?:lib|docs|tests|scripts|components)\/[\w./-]+\.(?:ts|tsx|md|json|mjs))`/g)].map((m) => m[1]!));
    assert.ok(paths.size >= 10, `the documents reference at least ten files (${paths.size})`);
    for (const path of paths) assert.ok(existsSync(join(root, path)), `${path} exists`);
  });
});
