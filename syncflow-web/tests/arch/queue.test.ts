import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { newEvent, SAMPLE_EVENTS, SAMPLE_SOURCE } from '../../lib/arch/event';
import { DEFAULT_POLICY, IdempotentReceiver, MemoryStore, ReliableQueue } from '../../lib/arch/queue';
import { SCENARIOS } from '../../lib/arch/scenarios';
import { runScenario, ScriptedChannel, scenarioEventId } from '../../lib/arch/simulate';

const scenario = (name: string) => {
  const config = SCENARIOS.find((s) => s.name.startsWith(name));
  assert.ok(config, `scenario "${name}" exists`);
  return { config, result: runScenario(config) };
};

describe('fail-safe queue: invariants hold in every scenario', () => {
  for (const config of SCENARIOS) {
    it(config.name, () => {
      const r = runScenario(config);
      // 1. nothing vanishes: every accepted event is applied, dead-lettered or still queued
      assert.equal(r.lost, 0, 'no accepted event is lost');
      assert.equal(r.accountedFor, true);
      // 2. effectively once: the receiver applied each id at most once, however often it was sent
      assert.equal(r.appliedAtReceiver, r.appliedDistinct, 'no event applied twice');
      // 3. order: what the receiver applied is in the order the events were accepted
      assert.equal(r.orderPreserved, true, 'order preserved');
      // 4. bounded: no event is sent more than the policy allows while the channel is healthy
      assert.ok(r.maxAttempts <= DEFAULT_POLICY.maxAttempts, `attempts per event <= ${DEFAULT_POLICY.maxAttempts}`);
      // 5. accounted: applied + dead + waiting covers every distinct accepted event
      assert.equal(r.appliedAtReceiver + r.deadLettered + r.stillWaiting, r.accepted);
    });
  }
});

describe('fail-safe queue: what each scenario proves', () => {
  it('a healthy channel delivers everything once, in order, with nothing parked or duplicated', () => {
    const { result: r } = scenario('healthy');
    assert.equal(r.appliedAtReceiver, 50);
    assert.equal(r.duplicatesDroppedAtReceiver, 0);
    assert.equal(r.deadLettered, 0);
    assert.equal(r.circuitOpened, false);
    assert.equal(r.totalSends, 50, 'one send per event');
  });

  it('an outage parks events and loses none: the circuit opens, probes cost no attempts, everything drains in order afterwards', () => {
    const { result: r } = scenario('channel down for 20 s');
    assert.equal(r.circuitOpened, true);
    assert.equal(r.appliedAtReceiver, 40, 'all 40 delivered after the channel returned');
    assert.equal(r.deadLettered, 0, 'an outage never kills an event');
    assert.ok(r.probes >= 10, `the channel was probed while it was down (${r.probes})`);
    assert.ok(r.totalSends < 40 * 6, 'it did not hammer a dead channel');
  });

  it('a flapping channel still delivers everything exactly once', () => {
    const { result: r } = scenario('flapping');
    assert.equal(r.appliedAtReceiver, 40);
    assert.equal(r.deadLettered, 0);
    assert.equal(r.circuitOpened, true);
  });

  it('lost acknowledgements are re-sent and the receiver drops the repeats: at least once becomes effectively once', () => {
    const { result: r } = scenario('acknowledgements lost');
    assert.equal(r.appliedAtReceiver, 60);
    assert.ok(r.duplicatesDroppedAtReceiver > 5, `repeats reached the receiver and were dropped (${r.duplicatesDroppedAtReceiver})`);
    assert.equal(r.deadLettered, 0);
  });

  it('a poison event is dead-lettered at once and does not block the others; nothing else is lost', () => {
    const { result: r } = scenario('one poison event');
    assert.equal(r.deadLettered, 1);
    assert.equal(r.appliedAtReceiver, 19);
    assert.equal(r.circuitOpened, false, 'a bad event is not a dead channel');
  });

  it('a stubborn event on a healthy channel is retried with backoff, then dead-lettered after the bounded number of attempts; the circuit stays closed', () => {
    const { result: r } = scenario('one stubborn event');
    assert.equal(r.deadLettered, 1);
    assert.equal(r.appliedAtReceiver, 19);
    assert.equal(r.maxAttempts, DEFAULT_POLICY.maxAttempts);
    assert.equal(r.circuitOpened, false);
  });

  it('a restart in the middle of an outage loses nothing (the queue is rebuilt from the store)', () => {
    const { result: r } = scenario('process restarts');
    assert.equal(r.appliedAtReceiver, 30);
    assert.equal(r.lost, 0);
  });

  it('a producer that sends an event twice does not make it happen twice (the queue acknowledges the repeat)', () => {
    const { result: r } = scenario('the producer sends');
    assert.equal(r.accepted, 30);
    assert.equal(r.duplicatesDroppedAtQueue, 6);
    assert.equal(r.appliedAtReceiver, 30);
  });
});

describe('fail-safe queue: the parts', () => {
  const build = (down: Array<[number, number]> = []) => {
    const receiver = new IdempotentReceiver();
    const channel = new ScriptedChannel({ down, ackLossRate: 0, poison: new Set(), stubborn: new Set() }, receiver, 1);
    const store = new MemoryStore();
    return { receiver, channel, store, queue: new ReliableQueue(store, channel) };
  };
  const lead = (i: number) => newEvent('lead.created', SAMPLE_EVENTS['lead.created'].payload, SAMPLE_SOURCE, { id: scenarioEventId(99, i) });

  it('accept writes to the store before it answers, refuses what is not an event, and acknowledges a repeat without queueing it twice', () => {
    const { queue, store } = build();
    const event = lead(0);
    assert.deepEqual(queue.accept(event, 0), { status: 'accepted', seq: 1 });
    assert.equal(store.get(event.id)?.state, 'pending', 'already in the store when accept returned');
    assert.deepEqual(queue.accept(event, 5), { status: 'duplicate' });
    assert.equal(store.list().length, 1);
    const refused = queue.accept({ id: 'x' }, 0);
    assert.equal(refused.status, 'invalid');
    assert.equal(store.list().length, 1);
  });

  it('redrive puts a dead-lettered event back in the line with a fresh budget', () => {
    const receiver = new IdempotentReceiver();
    const poison = lead(1);
    const channel = new ScriptedChannel({ down: [], ackLossRate: 0, poison: new Set([poison.id]), stubborn: new Set() }, receiver, 1);
    const store = new MemoryStore();
    const queue = new ReliableQueue(store, channel);
    queue.accept(poison, 0);
    queue.pump(0);
    assert.equal(store.get(poison.id)?.state, 'dead');
    assert.equal(queue.stats().dead, 1);
    assert.equal(queue.redrive(10), 1);
    assert.equal(store.get(poison.id)?.state, 'pending');
    assert.equal(store.get(poison.id)?.attempts, 0);
    assert.equal(queue.redrive(10), 0);
  });

  it('an event that waits longer than the policy allows expires into the dead letters, it is not dropped', () => {
    const receiver = new IdempotentReceiver();
    const channel = new ScriptedChannel({ down: [[0, 10_000_000]], ackLossRate: 0, poison: new Set(), stubborn: new Set() }, receiver, 1);
    const store = new MemoryStore();
    const queue = new ReliableQueue(store, channel, DEFAULT_POLICY, 60_000);
    const event = lead(2);
    queue.accept(event, 0);
    for (let t = 0; t <= 59_000; t += 1_000) queue.pump(t);
    assert.equal(store.get(event.id)?.state, 'parked');
    queue.pump(61_000);
    assert.deepEqual([store.get(event.id)?.state, store.get(event.id)?.reason], ['dead', 'expired']);
  });

  it('the store snapshot is serialisable and a queue rebuilt from it carries on with the same order', () => {
    const { queue, store, channel, receiver } = build([[0, 5_000]]);
    for (let i = 0; i < 5; i++) queue.accept(lead(10 + i), i);
    for (let t = 0; t < 4_000; t += 100) queue.pump(t);
    const revived = new ReliableQueue(MemoryStore.restore(JSON.parse(JSON.stringify(store.snapshot()))), channel);
    for (let t = 4_000; t < 30_000; t += 100) revived.pump(t);
    assert.deepEqual(
      receiver.applied.map((event) => event.id),
      [10, 11, 12, 13, 14].map((i) => scenarioEventId(99, i)),
    );
  });

  it('the receiver forgets an id only after its time-to-live', () => {
    const receiver = new IdempotentReceiver(1_000);
    const event = lead(20);
    assert.equal(receiver.receive(event, 0), 'applied');
    assert.equal(receiver.receive(event, 500), 'duplicate');
    assert.equal(receiver.receive(event, 1_500), 'applied', 'after the ttl the id is no longer remembered, which is why the ttl must outlast every retry');
    assert.equal(receiver.applied.length, 2);
  });
});
