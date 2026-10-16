import { validateEvent } from './event';
import type { AcceptResult, CanonicalEvent, QueueItem, QueuePolicy, QueueStore, ReceiveResult, Transport } from './types';

/**
 * The fail-safe queue, as a reference implementation (docs/architecture/fail-safe-queue.md). It is a small state machine with no timers and no
 * I/O of its own: the caller says what time it is (`pump(now)`) and supplies the durable store and the channel, so the same code runs under a
 * deterministic simulation (tests/arch, simulate.ts), in the browser model on the Architecture section, and can be wired to a real store and a
 * real channel in a client project.
 *
 * What it guarantees, and what each guarantee costs:
 *   durability   `accept` writes to the store BEFORE it answers. An accepted event survives a restart (rebuild the queue from `store.snapshot()`).
 *   at least once  a failed or unacknowledged send is sent again, with the SAME event id.
 *   effectively once  the receiver (IdempotentReceiver) drops an id it has already applied, so at-least-once delivery has an at-most-once effect.
 *   order        with `strictOrder` the receiver applies events in the order they were accepted; a failing head blocks the events behind it
 *                (head-of-line blocking is the price of order; switch it off for independent events).
 *   bounded      an event is sent at most `maxAttempts` times while the channel is healthy, then dead-lettered (kept, never dropped, `redrive`
 *                puts it back); one that lives longer than `maxAgeMs` is dead-lettered as expired.
 *   outage       when the channel is down (consecutive failures AND a failed health probe) the circuit opens: nothing is sent, accepted events are
 *                parked in the durable store, and only a health probe every `probeMs` tests the channel. Probes cost no attempts, so an outage
 *                never kills an event; when a probe succeeds the circuit closes and the parked events drain in order, each with a fresh budget.
 *                A failing event on a HEALTHY channel (the probe passes) is a poison event: it is retried with backoff, then dead-lettered,
 *                and the circuit stays closed.
 */

export const DEFAULT_POLICY: QueuePolicy = {
  maxAttempts: 6,
  backoffMs: [200, 400, 800, 1600, 3200],
  openAfter: 3,
  probeMs: 1000,
  strictOrder: true,
};

/** Events older than this are dead-lettered as expired rather than retried forever (a day). */
export const MAX_AGE_MS = 24 * 60 * 60_000;

export class MemoryStore implements QueueStore {
  private readonly items = new Map<string, QueueItem>();

  put(item: QueueItem): void {
    this.items.set(item.event.id, { ...item });
  }

  get(id: string): QueueItem | undefined {
    const item = this.items.get(id);
    return item ? { ...item } : undefined;
  }

  list(): QueueItem[] {
    return [...this.items.values()].sort((a, b) => a.seq - b.seq).map((item) => ({ ...item }));
  }

  remove(id: string): void {
    this.items.delete(id);
  }

  snapshot(): QueueItem[] {
    return JSON.parse(JSON.stringify(this.list())) as QueueItem[];
  }

  /** A store rebuilt from a snapshot: what a process does when it starts again. */
  static restore(items: QueueItem[]): MemoryStore {
    const store = new MemoryStore();
    for (const item of items) store.put(item);
    return store;
  }
}

export interface PumpReport {
  delivered: string[];
  failed: Array<{ id: string; reason: string; state: QueueItem['state'] }>;
  circuit: 'closed' | 'open';
}

export class ReliableQueue {
  private seq: number;
  private streak = 0;
  private open = false;
  private lastProbeAt = Number.NEGATIVE_INFINITY;

  constructor(
    private readonly store: QueueStore,
    private readonly transport: Transport & { probe(now: number): boolean },
    private readonly policy: QueuePolicy = DEFAULT_POLICY,
    private readonly maxAgeMs: number = MAX_AGE_MS,
  ) {
    this.seq = store.list().reduce((max, item) => Math.max(max, item.seq), 0);
  }

  get circuit(): 'closed' | 'open' {
    return this.open ? 'open' : 'closed';
  }

  /** Takes an event in. The answer is only given after the event is in the store; a repeat of an id already seen is acknowledged, not queued twice. */
  accept(input: unknown, now: number): AcceptResult {
    const checked = validateEvent(input);
    if (!checked.ok) return { status: 'invalid', errors: checked.errors };
    if (this.store.get(checked.event.id)) return { status: 'duplicate' };
    this.seq += 1;
    this.store.put({ seq: this.seq, event: checked.event, acceptedAt: now, state: this.open ? 'parked' : 'pending', attempts: 0, nextAt: now });
    return { status: 'accepted', seq: this.seq };
  }

  /** One pass at time `now`: tries what is due, in order, and stops where order or the circuit says to. */
  pump(now: number): PumpReport {
    const report: PumpReport = { delivered: [], failed: [], circuit: this.circuit };
    const strict = this.policy.strictOrder;

    for (const listed of this.store.list()) {
      let item = listed;
      if (item.state === 'delivered' || item.state === 'dead') continue;

      if (now - item.acceptedAt > this.maxAgeMs) {
        this.store.put({ ...item, state: 'dead', reason: 'expired' });
        report.failed.push({ id: item.event.id, reason: 'expired', state: 'dead' });
        continue;
      }

      if (this.open) {
        if (now - this.lastProbeAt >= this.policy.probeMs) {
          this.lastProbeAt = now;
          if (this.transport.probe(now)) {
            this.open = false;
            this.streak = 0;
          }
        }
        if (this.open) {
          if (item.state !== 'parked') this.store.put({ ...item, state: 'parked' });
          if (strict) break;
          continue;
        }
      }
      // The channel is back (or never went away): an item that was parked leaves the parking lot with a fresh attempt budget.
      if (item.state === 'parked') {
        item = { ...item, state: 'pending', attempts: 0, nextAt: now };
        this.store.put(item);
      }

      if (item.nextAt > now) {
        if (strict) break;
        continue;
      }

      const result = this.transport.send(item.event, item.attempts + 1, now);
      const attempts = item.attempts + 1;
      if (result.ok) {
        this.streak = 0;
        this.store.put({ ...item, state: 'delivered', attempts, reason: undefined });
        report.delivered.push(item.event.id);
        continue;
      }

      this.streak += 1;
      const exhausted = !result.retryable || attempts >= this.policy.maxAttempts;
      const state: QueueItem['state'] = exhausted ? 'dead' : 'retry';
      const wait = this.policy.backoffMs[Math.min(attempts, this.policy.backoffMs.length) - 1] ?? 0;
      this.store.put({ ...item, state, attempts, reason: exhausted && result.retryable ? 'attempts-exhausted' : result.reason, nextAt: now + wait });
      report.failed.push({ id: item.event.id, reason: result.reason, state });

      // A streak of failures plus a failed health probe means the channel is down, not that this event is bad.
      if (!exhausted && this.streak >= this.policy.openAfter && !this.transport.probe(now)) {
        this.open = true;
        this.lastProbeAt = now;
        this.store.put({ ...item, state: 'parked', attempts, reason: result.reason, nextAt: now });
      }
      if (strict && state !== 'dead') break;
    }
    report.circuit = this.circuit;
    return report;
  }

  /** Puts dead-lettered events back in the line (one id, or all of them). Returns how many. */
  redrive(now: number, id?: string): number {
    let count = 0;
    for (const item of this.store.list()) {
      if (item.state !== 'dead' || (id !== undefined && item.event.id !== id)) continue;
      this.store.put({ ...item, state: 'pending', attempts: 0, nextAt: now, reason: undefined });
      count += 1;
    }
    return count;
  }

  stats(): { accepted: number; delivered: number; waiting: number; parked: number; dead: number; attempts: number } {
    const items = this.store.list();
    const count = (state: QueueItem['state']) => items.filter((item) => item.state === state).length;
    return {
      accepted: items.length,
      delivered: count('delivered'),
      waiting: count('pending') + count('retry'),
      parked: count('parked'),
      dead: count('dead'),
      attempts: items.reduce((sum, item) => sum + item.attempts, 0),
    };
  }
}

/**
 * The business system's side of the contract: apply an event once. An id it has already applied is acknowledged and dropped, which is what turns
 * the queue's at-least-once delivery into an at-most-once effect. `ttlMs` is how long ids are remembered: it must be longer than the longest time
 * the queue can keep retrying the same event.
 */
export class IdempotentReceiver {
  private readonly seen = new Map<string, number>();
  readonly applied: CanonicalEvent[] = [];
  duplicates = 0;

  constructor(private readonly ttlMs: number = 7 * 24 * 60 * 60_000) {}

  receive(event: CanonicalEvent, now: number): ReceiveResult {
    for (const [id, expires] of this.seen) if (expires <= now) this.seen.delete(id);
    if (this.seen.has(event.id)) {
      this.duplicates += 1;
      return 'duplicate';
    }
    this.seen.set(event.id, now + this.ttlMs);
    this.applied.push(event);
    return 'applied';
  }
}
