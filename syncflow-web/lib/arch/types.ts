/**
 * Reference architecture of the enterprise layer (docs/architecture/, docs/adr/0021-production-performance-and-enterprise-proof.md §5).
 *
 * These interfaces are the contract between a website and the systems behind it: ONE canonical event, signed once, delivered at least once
 * through a redundant queue, applied at most once by an idempotent receiver, and mapped to whatever shape each system expects (mappers.ts).
 * They are plain TypeScript with no dependency, so they run in Node (the contract tests, `npm run arch:verify`), on the server and in the
 * browser (the interactive models on the Architecture section). They are a REFERENCE, not a product: see docs/architecture/README.md for what
 * is implemented in this repository, what is only specified here and verified by the tests, and what is never claimed.
 */

/** Every event type the reference knows. Adding one is a schema change: docs/architecture/canonical-event.schema.json lists the same names (a test compares them). */
export const EVENT_TYPES = ['lead.created', 'order.created', 'invoice.issued'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** Where an event came from: the site, the language the visitor read it in, the capital-centre market they chose. */
export interface EventSource {
  site: string;
  locale: string;
  market: string;
}

/** A qualified enquiry from the Strategic Briefing. */
export interface LeadPayload {
  name: string;
  company: string;
  email: string;
  role: string;
  projectType: string;
  budgetBand: string;
  timeline: string;
  message: string;
}

export interface OrderLine {
  sku: string;
  quantity: number;
  unitPrice: number;
}

/** A purchase order from a customer, as a logistics or commerce front end would raise it. */
export interface OrderPayload {
  orderNumber: string;
  customer: { id: string; name: string };
  currency: string;
  requestedDelivery: string;
  lines: OrderLine[];
}

export interface InvoiceLine {
  description: string;
  amount: number;
}

/** An invoice raised for a customer, the last event of an order-to-cash flow. */
export interface InvoicePayload {
  invoiceNumber: string;
  customer: { id: string; name: string };
  currency: string;
  issuedOn: string;
  dueOn: string;
  lines: InvoiceLine[];
}

export interface PayloadByType {
  'lead.created': LeadPayload;
  'order.created': OrderPayload;
  'invoice.issued': InvoicePayload;
}

/**
 * The canonical event. `id` is the idempotency key: it is created once, when the event is born, and it travels unchanged through every retry,
 * every queue hop and every mapper, so any receiver can recognise a copy it has already applied.
 */
export interface CanonicalEvent<T extends EventType = EventType> {
  schemaVersion: 1;
  id: string;
  type: T;
  /** ISO 8601, UTC, e.g. 2026-10-16T09:30:00.000Z */
  occurredAt: string;
  source: EventSource;
  payload: PayloadByType[T];
}

/** The exact bytes that were signed, the signature over them, and the moment the signature was made. */
export interface SignedEnvelope {
  body: string;
  signature: string;
  timestamp: string;
}

export type VerifyFailure = 'malformed' | 'bad-signature' | 'stale' | 'invalid-event';
export type VerifyResult = { ok: true; event: CanonicalEvent } | { ok: false; reason: VerifyFailure; detail?: string };

/** AES-256-GCM output: a 96-bit IV and the ciphertext with its authentication tag, both hexadecimal. */
export interface Sealed {
  iv: string;
  data: string;
}

/** The lifecycle of an item in the reliable queue. */
export type QueueState = 'pending' | 'retry' | 'parked' | 'delivered' | 'dead';

export interface QueueItem {
  /** Order of acceptance: the order the receiver must apply events in. */
  seq: number;
  event: CanonicalEvent;
  /** When the queue took the event in (the clock `accept` was given): events that wait longer than the policy allows expire. */
  acceptedAt: number;
  state: QueueState;
  attempts: number;
  /** Virtual or wall-clock milliseconds before which the item is not tried again. */
  nextAt: number;
  /** Why the item is dead, or the last failure of a retrying one. */
  reason?: string;
}

export type TransportResult = { ok: true } | { ok: false; retryable: boolean; reason: string };

/** The channel to the business system. `send` may fail, time out, or deliver and lose the acknowledgement (the case idempotency exists for). */
export interface Transport {
  send(event: CanonicalEvent, attempt: number, now: number): TransportResult;
}

/** The durable store behind the queue. A real deployment backs it with a database or a managed queue; the contract is only these five operations. */
export interface QueueStore {
  put(item: QueueItem): void;
  get(id: string): QueueItem | undefined;
  /** All items in acceptance order. */
  list(): QueueItem[];
  remove(id: string): void;
  /** A serialisable copy, to prove that a restart loses nothing. */
  snapshot(): QueueItem[];
}

export interface QueuePolicy {
  /** The most times one event is sent before it is dead-lettered. Bounds the work an unhealthy channel can cause. */
  maxAttempts: number;
  /** Wait before attempt n+1 (index n-1); the last value repeats. */
  backoffMs: readonly number[];
  /** Consecutive primary failures that open the circuit: items are parked and only one probe per `probeMs` tests the channel. */
  openAfter: number;
  probeMs: number;
  /** Deliver strictly in acceptance order: an item waits for every lower sequence number to be delivered or dead. */
  strictOrder: boolean;
}

export type AcceptResult = { status: 'accepted'; seq: number } | { status: 'duplicate' } | { status: 'invalid'; errors: string[] };
export type ReceiveResult = 'applied' | 'duplicate';
