import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { newEvent, SAMPLE_EVENTS, SAMPLE_SOURCE, validateEvent } from '../../lib/arch/event';
import { EVENT_TYPES } from '../../lib/arch/types';
import { validateSchema } from './schema';

const root = process.env.ARCH_ROOT ?? process.cwd();
const schema = JSON.parse(readFileSync(join(root, 'docs', 'architecture', 'canonical-event.schema.json'), 'utf8')) as Record<string, unknown>;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

describe('canonical event: validation', () => {
  it('accepts the three reference events', () => {
    for (const type of EVENT_TYPES) assert.equal(validateEvent(SAMPLE_EVENTS[type]).ok, true, type);
  });

  it('refuses what is not an event, naming the field and never the value', () => {
    assert.deepEqual(validateEvent(null), { ok: false, errors: ['event'] });
    assert.deepEqual(validateEvent('lead'), { ok: false, errors: ['event'] });
    const bad = clone(SAMPLE_EVENTS['lead.created']) as unknown as Record<string, unknown>;
    bad.id = 'short';
    bad.occurredAt = '2026-10-16 09:30';
    bad.type = 'lead.deleted';
    const result = validateEvent(bad);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.errors.includes('id') && result.errors.includes('occurredAt') && result.errors.includes('type'));
      assert.ok(result.errors.every((error) => !/Alex|example\.com/.test(error)), 'no personal data in an error');
    }
  });

  it('refuses each broken payload with the path of the broken field', () => {
    const lead = clone(SAMPLE_EVENTS['lead.created']);
    lead.payload.email = 'not-an-address';
    assert.deepEqual((validateEvent(lead) as { errors: string[] }).errors, ['payload.email']);

    const order = clone(SAMPLE_EVENTS['order.created']);
    order.payload.lines[1]!.quantity = 0;
    order.payload.currency = 'euro';
    assert.deepEqual((validateEvent(order) as { errors: string[] }).errors.sort(), ['payload.currency', 'payload.lines[1]']);

    const invoice = clone(SAMPLE_EVENTS['invoice.issued']);
    invoice.payload.dueOn = '2026-02-31x';
    invoice.payload.lines = [];
    assert.deepEqual((validateEvent(invoice) as { errors: string[] }).errors.sort(), ['payload.dueOn', 'payload.lines']);
  });

  it('refuses a schema version it does not know and whitespace-only text', () => {
    const future = clone(SAMPLE_EVENTS['lead.created']) as unknown as Record<string, unknown>;
    future.schemaVersion = 2;
    assert.equal(validateEvent(future).ok, false);
    const blank = clone(SAMPLE_EVENTS['lead.created']);
    blank.payload.company = '   ';
    assert.deepEqual((validateEvent(blank) as { errors: string[] }).errors, ['payload.company']);
  });

  it('newEvent makes the id once and the time in UTC', () => {
    const a = newEvent('lead.created', SAMPLE_EVENTS['lead.created'].payload, SAMPLE_SOURCE);
    const b = newEvent('lead.created', SAMPLE_EVENTS['lead.created'].payload, SAMPLE_SOURCE);
    assert.notEqual(a.id, b.id);
    assert.match(a.occurredAt, /Z$/);
    assert.equal(validateEvent(a).ok, true);
  });
});

describe('canonical event: the JSON Schema in the documentation and the validator agree', () => {
  it('lists the same event types and the same required envelope fields', () => {
    const properties = schema.properties as Record<string, { enum?: string[] }>;
    assert.deepEqual(properties.type?.enum, [...EVENT_TYPES]);
    assert.deepEqual(schema.required, ['schemaVersion', 'id', 'type', 'occurredAt', 'source', 'payload']);
  });

  it('accepts every reference event, as the validator does', () => {
    for (const type of EVENT_TYPES) assert.deepEqual(validateSchema(schema, SAMPLE_EVENTS[type]), [], type);
  });

  it('refuses what the validator refuses (the validator may be stricter, never looser)', () => {
    const variants: Array<[string, (e: Record<string, unknown>) => void, string]> = [
      ['missing id', (e) => delete e.id, 'lead.created'],
      ['short id', (e) => (e.id = 'x'), 'lead.created'],
      ['unknown type', (e) => (e.type = 'lead.deleted'), 'lead.created'],
      ['bad time', (e) => (e.occurredAt = 'yesterday'), 'order.created'],
      ['extra field', (e) => (e.extra = true), 'invoice.issued'],
      ['wrong version', (e) => (e.schemaVersion = 2), 'invoice.issued'],
    ];
    for (const [label, mutate, type] of variants) {
      const event = clone(SAMPLE_EVENTS[type as keyof typeof SAMPLE_EVENTS]) as unknown as Record<string, unknown>;
      mutate(event);
      assert.notDeepEqual(validateSchema(schema, event), [], `schema should refuse: ${label}`);
      assert.equal(validateEvent(event).ok, false, `validator should refuse: ${label}`);
    }
    const order = clone(SAMPLE_EVENTS['order.created']);
    order.payload.lines[0]!.quantity = -3;
    assert.notDeepEqual(validateSchema(schema, order), []);
    assert.equal(validateEvent(order).ok, false);
    const lead = clone(SAMPLE_EVENTS['lead.created']);
    lead.payload.email = 'nope';
    assert.notDeepEqual(validateSchema(schema, lead), []);
    assert.equal(validateEvent(lead).ok, false);
  });
});
