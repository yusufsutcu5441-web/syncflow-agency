import { newEvent, SAMPLE_SOURCE } from './event';
import { IdempotentReceiver, MemoryStore, ReliableQueue, DEFAULT_POLICY } from './queue';
import type { CanonicalEvent, QueuePolicy, Transport, TransportResult } from './types';

/**
 * A deterministic harness for the reference queue (tests/arch and `npm run arch:verify -- --report`): a scripted channel (down windows, lost
 * acknowledgements, poison events), a seeded random generator and a virtual clock, so a scenario gives the same answer on every machine and
 * every run. Nothing here uses a timer or the network.
 */

/** A small seeded generator (mulberry32): the same seed always draws the same numbers. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ChannelScript {
  /** Windows [from, to) in virtual milliseconds when the channel is down (connection refused). */
  down: Array<[number, number]>;
  /** The business system applies the event but the acknowledgement is lost, so the sender sees a failure (the case idempotency exists for). */
  ackLossRate: number;
  /** Event ids the business system always refuses with a non-retryable error (a poison event). */
  poison: ReadonlySet<string>;
  /** Event ids the business system answers 503 to on a healthy channel (retryable, but only for this event). */
  stubborn: ReadonlySet<string>;
}

export class ScriptedChannel implements Transport {
  sends = 0;
  probes = 0;
  private readonly draw: () => number;

  constructor(
    private readonly script: ChannelScript,
    private readonly receiver: IdempotentReceiver,
    seed: number,
  ) {
    this.draw = rng(seed);
  }

  isDown(now: number): boolean {
    return this.script.down.some(([from, to]) => now >= from && now < to);
  }

  probe(now: number): boolean {
    this.probes += 1;
    return !this.isDown(now);
  }

  send(event: CanonicalEvent, _attempt: number, now: number): TransportResult {
    this.sends += 1;
    if (this.isDown(now)) return { ok: false, retryable: true, reason: 'connection-refused' };
    if (this.script.poison.has(event.id)) return { ok: false, retryable: false, reason: 'refused-422' };
    if (this.script.stubborn.has(event.id)) return { ok: false, retryable: true, reason: 'unavailable-503' };
    this.receiver.receive(event, now);
    if (this.draw() < this.script.ackLossRate) return { ok: false, retryable: true, reason: 'ack-timeout' };
    return { ok: true };
  }
}

/** The id of the n-th event (0-based) of a scenario: scripts name poison and stubborn events by it. */
export const scenarioEventId = (seed: number, index: number): string => `scn-${seed}-${String(index + 1).padStart(4, '0')}-${'0'.repeat(8)}`;

export interface ScenarioConfig {
  name: string;
  /** How many events, and the virtual time of each one's acceptance (every `spacingMs`). */
  events: number;
  spacingMs?: number;
  channel?: Partial<ChannelScript>;
  policy?: Partial<QueuePolicy>;
  seed?: number;
  /** Virtual time to run until, and the length of one tick. */
  untilMs?: number;
  tickMs?: number;
  /** Crash and restart (drop the queue, rebuild it from the store's snapshot) at these virtual times. */
  restartAt?: number[];
  /** Which events (by index) the producer sends twice, as a retrying producer does. */
  producerRetries?: number[];
}

export interface ScenarioResult {
  name: string;
  accepted: number;
  appliedAtReceiver: number;
  /** Distinct event ids the receiver applied: equal to `appliedAtReceiver` when nothing was applied twice. */
  appliedDistinct: number;
  duplicatesDroppedAtReceiver: number;
  duplicatesDroppedAtQueue: number;
  deadLettered: number;
  stillWaiting: number;
  maxAttempts: number;
  totalSends: number;
  probes: number;
  orderPreserved: boolean;
  lost: number;
  circuitOpened: boolean;
  /** Every accepted event is applied, dead-lettered or still queued: none has vanished. */
  accountedFor: boolean;
}

export function runScenario(config: ScenarioConfig): ScenarioResult {
  const policy: QueuePolicy = { ...DEFAULT_POLICY, ...config.policy };
  const spacing = config.spacingMs ?? 100;
  const tick = config.tickMs ?? 100;
  const until = config.untilMs ?? config.events * spacing + 120_000;
  const events: CanonicalEvent[] = Array.from({ length: config.events }, (_, i) =>
    newEvent(
      'lead.created',
      { name: `Lead ${i + 1}`, company: 'Example Holdings', email: `lead${i + 1}@example.com`, role: 'principal', projectType: 'enterprise-platform', budgetBand: 'band-2', timeline: 'this-quarter', message: '' },
      SAMPLE_SOURCE,
      { id: scenarioEventId(config.seed ?? 1, i), at: new Date(Date.UTC(2026, 9, 16, 9, 0, 0) + i * 1000) },
    ),
  );
  const script: ChannelScript = { down: [], ackLossRate: 0, poison: new Set(), stubborn: new Set(), ...config.channel };
  const receiver = new IdempotentReceiver();
  const channel = new ScriptedChannel(script, receiver, (config.seed ?? 1) + 7919);
  let store = new MemoryStore();
  let queue = new ReliableQueue(store, channel, policy);
  let circuitOpened = false;
  let duplicatesAtQueue = 0;
  const restarts = [...(config.restartAt ?? [])].sort((a, b) => a - b);
  const retries = new Set(config.producerRetries ?? []);

  let next = 0;
  for (let now = 0; now <= until; now += tick) {
    while (next < events.length && next * spacing <= now) {
      const event = events[next]!;
      const first = queue.accept(event, now);
      if (first.status === 'duplicate') duplicatesAtQueue += 1;
      if (retries.has(next) && queue.accept(event, now).status === 'duplicate') duplicatesAtQueue += 1;
      next += 1;
    }
    if (restarts.length && now >= restarts[0]!) {
      restarts.shift();
      store = MemoryStore.restore(store.snapshot());
      queue = new ReliableQueue(store, channel, policy);
    }
    queue.pump(now);
    if (queue.circuit === 'open') circuitOpened = true;
  }

  const stats = queue.stats();
  const items = store.list();
  const appliedIds = receiver.applied.map((event) => event.id);
  const order = events.map((event) => event.id).filter((id) => appliedIds.includes(id));
  const lost = events.length - stats.delivered - stats.dead - stats.waiting - stats.parked;
  return {
    name: config.name,
    accepted: stats.accepted,
    appliedAtReceiver: receiver.applied.length,
    appliedDistinct: new Set(appliedIds).size,
    duplicatesDroppedAtReceiver: receiver.duplicates,
    duplicatesDroppedAtQueue: duplicatesAtQueue,
    deadLettered: stats.dead,
    stillWaiting: stats.waiting + stats.parked,
    maxAttempts: items.reduce((max, item) => Math.max(max, item.attempts), 0),
    totalSends: channel.sends,
    probes: channel.probes,
    orderPreserved: appliedIds.every((id, index) => id === order[index]),
    lost,
    circuitOpened,
    accountedFor: lost === 0,
  };
}
