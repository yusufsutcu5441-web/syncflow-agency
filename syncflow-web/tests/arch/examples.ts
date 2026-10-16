import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SAMPLE_EVENTS } from '../../lib/arch/event';
import { importHmacKey, signEvent } from '../../lib/arch/envelope';
import { mapEvent, TARGET_SYSTEMS, TARGETS, type TargetSystem } from '../../lib/arch/mappers';
import { SCENARIOS } from '../../lib/arch/scenarios';
import { runScenario } from '../../lib/arch/simulate';

/**
 * Everything docs/architecture/ shows that comes from the code, computed from the code: the example files, the scenario table and the field
 * mapping tables. `npm run arch:examples` writes it; the contract tests compare the files and the marked blocks of the documents with this, so a
 * change to a mapper, a sample or the queue that is not reflected in the documentation fails the build of the evidence.
 */

/** A demonstration key. It is not a secret: it is published here so anyone can recompute the signature in the example. */
export const DEMO_KEY = 'syncflow-demo-key-not-a-secret';
export const DEMO_SIGNED_AT = Date.parse('2026-10-16T09:30:01.000Z');

const SYSTEM_FILES: Record<TargetSystem, string> = {
  salesforce: 'salesforce.lead.json',
  hubspot: 'hubspot.contact.json',
  sap: 'sap.sales-order.json',
  oracle: 'oracle.receivables-invoice.json',
};

const SYSTEM_NAMES: Record<TargetSystem, string> = { salesforce: 'Salesforce', hubspot: 'HubSpot', sap: 'SAP', oracle: 'Oracle' };

export async function computeExamples(): Promise<Record<string, unknown>> {
  const files: Record<string, unknown> = {};
  for (const type of Object.keys(SAMPLE_EVENTS) as Array<keyof typeof SAMPLE_EVENTS>) files[`canonical.${type}.json`] = SAMPLE_EVENTS[type];
  for (const system of TARGET_SYSTEMS) files[SYSTEM_FILES[system]] = mapEvent(system, SAMPLE_EVENTS[TARGETS[system].eventType]).payload;
  const key = await importHmacKey(DEMO_KEY);
  files['signed-envelope.lead.created.json'] = await signEvent(SAMPLE_EVENTS['lead.created'], key, DEMO_SIGNED_AT);
  files['scenarios.json'] = SCENARIOS.map((scenario) => runScenario(scenario));
  return files;
}

/** The scenario results as a Markdown table (the block between the `scenarios` markers of fail-safe-queue.md). */
export function scenarioTable(): string {
  const head = '| Scenario | Accepted | Applied once | Repeats dropped (receiver / queue) | Dead-lettered | Lost | Order | Circuit |\n|---|---:|---:|---:|---:|---:|:--|:--|';
  const rows = SCENARIOS.map((scenario) => {
    const r = runScenario(scenario);
    return `| ${r.name} | ${r.accepted} | ${r.appliedAtReceiver} | ${r.duplicatesDroppedAtReceiver} / ${r.duplicatesDroppedAtQueue} | ${r.deadLettered} | ${r.lost} | ${r.orderPreserved ? 'kept' : 'BROKEN'} | ${r.circuitOpened ? 'opened and closed' : 'never opened'} |`;
  });
  return [head, ...rows].join('\n');
}

/** The field tables and the example payloads of the four systems (the block between the `mappings` markers of integrations.md). */
export function mappingTables(): string {
  return TARGET_SYSTEMS.map((system) => {
    const target = TARGETS[system];
    const mapped = mapEvent(system, SAMPLE_EVENTS[target.eventType]);
    const rows = target.mappings.map((m) => `| ${m.from === null ? `*constant* \`${String(m.value)}\`` : `\`${m.from}\`${m.transform ? ` (${m.transform})` : ''}`} | \`${m.to}\` | ${m.note} |`);
    return [
      `### ${SYSTEM_NAMES[system]}: ${target.object}`,
      '',
      `Receives \`${target.eventType}\`. The event id (the idempotency key) travels in \`${target.idempotencyPath}\`. Example output: \`examples/${SYSTEM_FILES[system]}\`.`,
      '',
      '| From the canonical event | To the payload | What it is for |',
      '|---|---|---|',
      ...rows,
      '',
      '```json',
      JSON.stringify(mapped.payload, null, 2),
      '```',
    ].join('\n');
  }).join('\n\n');
}

/** Replaces what is between `<!-- name:start -->` and `<!-- name:end -->` in a document. */
export function withBlock(document: string, name: string, content: string): string {
  const start = `<!-- ${name}:start -->`;
  const end = `<!-- ${name}:end -->`;
  const from = document.indexOf(start);
  const to = document.indexOf(end);
  if (from === -1 || to === -1 || to < from) throw new Error(`the markers ${start} ... ${end} are missing`);
  return `${document.slice(0, from + start.length)}\n${content}\n${document.slice(to)}`;
}

export async function writeAll(root: string): Promise<void> {
  const docs = join(root, 'docs', 'architecture');
  const dir = join(docs, 'examples');
  mkdirSync(dir, { recursive: true });
  for (const [name, value] of Object.entries(await computeExamples())) writeFileSync(join(dir, name), `${JSON.stringify(value, null, 2)}\n`);
  const queueDoc = join(docs, 'fail-safe-queue.md');
  writeFileSync(queueDoc, withBlock(readFileSync(queueDoc, 'utf8'), 'scenarios', scenarioTable()));
  const integrationsDoc = join(docs, 'integrations.md');
  writeFileSync(integrationsDoc, withBlock(readFileSync(integrationsDoc, 'utf8'), 'mappings', mappingTables()));
}
