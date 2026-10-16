import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SAMPLE_EVENTS } from '../../lib/arch/event';
import { mapEvent, read, sampleFor, TARGET_SYSTEMS, TARGETS, write } from '../../lib/arch/mappers';

describe('mappers: one declarative table per system', () => {
  for (const system of TARGET_SYSTEMS) {
    const target = TARGETS[system];

    it(`${system}: every source path exists in the reference event, every target path is unique, every constant has a value`, () => {
      const event = sampleFor(system);
      const seen = new Set<string>();
      for (const mapping of target.mappings) {
        assert.ok(!seen.has(mapping.to), `${mapping.to} is written once`);
        seen.add(mapping.to);
        if (mapping.from === null) assert.notEqual(mapping.value, undefined, `${mapping.to} is a constant with a value`);
        else assert.notEqual(read(event, mapping.from), undefined, `${mapping.from} exists in ${event.type}`);
      }
    });

    it(`${system}: carries the event id, unchanged, where its idempotency path says`, () => {
      const mapped = mapEvent(system, sampleFor(system));
      assert.equal(read(mapped.payload, target.idempotencyPath), sampleFor(system).id);
    });

    it(`${system}: the payload contains exactly the mapped fields and nothing else`, () => {
      const mapped = mapEvent(system, sampleFor(system));
      const probe: Record<string, unknown> = {};
      for (const a of mapped.applied) write(probe, a.to, read(mapped.payload, a.to));
      assert.deepEqual(probe, mapped.payload);
      assert.equal(mapped.applied.length, target.mappings.length);
    });

    it(`${system}: refuses an event of a type it does not receive`, () => {
      const other = Object.values(SAMPLE_EVENTS).find((e) => e.type !== target.eventType)!;
      assert.throws(() => mapEvent(system, other), /receives/);
    });
  }

  it('splits a full name on its first space for the systems that keep a given name and a surname', () => {
    const mapped = mapEvent('salesforce', SAMPLE_EVENTS['lead.created']);
    assert.equal(read(mapped.payload, 'fields.FirstName'), 'Alex');
    assert.equal(read(mapped.payload, 'fields.LastName'), 'Morgan');
    assert.equal(read(mapEvent('hubspot', SAMPLE_EVENTS['lead.created']).payload, 'properties.lastname'), 'Morgan');
  });

  it('writes numbers the way a system expects them (SAP quantity as a string, Oracle amount as a number)', () => {
    assert.equal(read(mapEvent('sap', SAMPLE_EVENTS['order.created']).payload, 'to_Item[0].RequestedQuantity'), '24');
    assert.equal(read(mapEvent('oracle', SAMPLE_EVENTS['invoice.issued']).payload, 'invoiceLines[0].UnitSellingPrice'), 4120);
  });

  it('read and write handle nested paths and array indexes', () => {
    const target: Record<string, unknown> = {};
    write(target, 'a.b[1].c', 'x');
    assert.equal(JSON.stringify(target), '{"a":{"b":[null,{"c":"x"}]}}');
    assert.equal(read(target, 'a.b[1].c'), 'x');
    assert.equal(read(target, 'a.b[0].c'), undefined);
    assert.equal(read(target, 'q.r'), undefined);
  });
});
