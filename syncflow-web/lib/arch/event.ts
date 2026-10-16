import type { CanonicalEvent, EventSource, EventType, InvoicePayload, LeadPayload, OrderPayload, PayloadByType } from './types';
import { EVENT_TYPES } from './types';

/**
 * The canonical event: validation and construction (docs/architecture/canonical-event.schema.json is the same contract as a JSON Schema,
 * and tests/arch compares the two). Dependency free and strict on purpose: a receiver that trusts nothing validates the shape before it
 * looks at a single value, and refuses with a code it can log without logging personal data.
 */

export type ValidationResult = { ok: true; event: CanonicalEvent } | { ok: false; errors: string[] };

const ID = /^[A-Za-z0-9._:-]{8,128}$/;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const CURRENCY = /^[A-Z]{3}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown, min = 1, max = 500): value is string => typeof value === 'string' && value.trim().length >= min && value.length <= max;
const isoDate = (value: unknown): value is string => typeof value === 'string' && DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const money = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

/** The schema says additionalProperties: false everywhere: a field nobody agreed on is refused, not carried along to a system. */
function unknownKeys(value: Record<string, unknown>, allowed: readonly string[], path: string, errors: string[]): void {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) errors.push(`${path}.${key}`);
}

function validateLead(p: Record<string, unknown>, errors: string[]): void {
  unknownKeys(p, ['name', 'company', 'email', 'role', 'projectType', 'budgetBand', 'timeline', 'message'], 'payload', errors);
  if (!text(p.name, 1, 200)) errors.push('payload.name');
  if (!text(p.company, 1, 200)) errors.push('payload.company');
  if (!(typeof p.email === 'string' && p.email.length <= 254 && EMAIL.test(p.email))) errors.push('payload.email');
  for (const key of ['role', 'projectType', 'budgetBand', 'timeline'] as const) if (!text(p[key], 1, 64)) errors.push(`payload.${key}`);
  if (typeof p.message !== 'string' || p.message.length > 2000) errors.push('payload.message');
}

function validateCustomer(p: Record<string, unknown>, errors: string[]): void {
  const customer = p.customer;
  if (!isObject(customer) || !text(customer.id, 1, 64) || !text(customer.name, 1, 200)) errors.push('payload.customer');
  else unknownKeys(customer, ['id', 'name'], 'payload.customer', errors);
}

function validateOrder(p: Record<string, unknown>, errors: string[]): void {
  unknownKeys(p, ['orderNumber', 'customer', 'currency', 'requestedDelivery', 'lines'], 'payload', errors);
  if (!text(p.orderNumber, 1, 64)) errors.push('payload.orderNumber');
  validateCustomer(p, errors);
  if (!(typeof p.currency === 'string' && CURRENCY.test(p.currency))) errors.push('payload.currency');
  if (!isoDate(p.requestedDelivery)) errors.push('payload.requestedDelivery');
  const lines = p.lines;
  if (!Array.isArray(lines) || lines.length < 1 || lines.length > 200) errors.push('payload.lines');
  else
    lines.forEach((line: unknown, index) => {
      if (!isObject(line) || !text(line.sku, 1, 64) || !(Number.isInteger(line.quantity) && (line.quantity as number) > 0) || !money(line.unitPrice) || Object.keys(line).some((k) => !['sku', 'quantity', 'unitPrice'].includes(k))) errors.push(`payload.lines[${index}]`);
    });
}

function validateInvoice(p: Record<string, unknown>, errors: string[]): void {
  unknownKeys(p, ['invoiceNumber', 'customer', 'currency', 'issuedOn', 'dueOn', 'lines'], 'payload', errors);
  if (!text(p.invoiceNumber, 1, 64)) errors.push('payload.invoiceNumber');
  validateCustomer(p, errors);
  if (!(typeof p.currency === 'string' && CURRENCY.test(p.currency))) errors.push('payload.currency');
  if (!isoDate(p.issuedOn)) errors.push('payload.issuedOn');
  if (!isoDate(p.dueOn)) errors.push('payload.dueOn');
  const lines = p.lines;
  if (!Array.isArray(lines) || lines.length < 1 || lines.length > 200) errors.push('payload.lines');
  else
    lines.forEach((line: unknown, index) => {
      if (!isObject(line) || !text(line.description, 1, 200) || !money(line.amount) || Object.keys(line).some((k) => !['description', 'amount'].includes(k))) errors.push(`payload.lines[${index}]`);
    });
}

/** Checks an unknown value against the contract. Returns the typed event, or every field path that is wrong (never the values). */
export function validateEvent(input: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isObject(input)) return { ok: false, errors: ['event'] };
  unknownKeys(input, ['schemaVersion', 'id', 'type', 'occurredAt', 'source', 'payload'], 'event', errors);
  if (input.schemaVersion !== 1) errors.push('schemaVersion');
  if (!(typeof input.id === 'string' && ID.test(input.id))) errors.push('id');
  if (!(typeof input.type === 'string' && (EVENT_TYPES as readonly string[]).includes(input.type))) errors.push('type');
  if (!(typeof input.occurredAt === 'string' && ISO_UTC.test(input.occurredAt) && !Number.isNaN(Date.parse(input.occurredAt)))) errors.push('occurredAt');
  const source = input.source;
  if (!isObject(source) || !text(source.site, 1, 100) || !text(source.locale, 2, 16) || !text(source.market, 1, 32)) errors.push('source');
  else unknownKeys(source, ['site', 'locale', 'market'], 'source', errors);
  if (!isObject(input.payload)) errors.push('payload');
  else if (input.type === 'lead.created') validateLead(input.payload, errors);
  else if (input.type === 'order.created') validateOrder(input.payload, errors);
  else if (input.type === 'invoice.issued') validateInvoice(input.payload, errors);
  return errors.length === 0 ? { ok: true, event: input as unknown as CanonicalEvent } : { ok: false, errors };
}

/** A fresh event. The id is the idempotency key: made here, once, and never changed by anything downstream. */
export function newEvent<T extends EventType>(type: T, payload: PayloadByType[T], source: EventSource, options: { id?: string; at?: Date } = {}): CanonicalEvent<T> {
  return {
    schemaVersion: 1,
    id: options.id ?? crypto.randomUUID(),
    type,
    occurredAt: (options.at ?? new Date()).toISOString(),
    source,
    payload,
  };
}

/** Fixed examples with placeholder data (no real company or person): the documentation, the tests and the interactive model all use these. */
export const SAMPLE_SOURCE: EventSource = { site: 'syncflow.agency', locale: 'en', market: 'us' };

const SAMPLE_LEAD: LeadPayload = {
  name: 'Alex Morgan',
  company: 'Example Holdings',
  email: 'alex.morgan@example.com',
  role: 'principal',
  projectType: 'enterprise-platform',
  budgetBand: 'band-2',
  timeline: 'this-quarter',
  message: 'Group-wide order portal, integrated with our ERP.',
};

const SAMPLE_ORDER: OrderPayload = {
  orderNumber: 'PO-2026-004217',
  customer: { id: '0010004711', name: 'Example Logistics GmbH' },
  currency: 'EUR',
  requestedDelivery: '2026-11-03',
  lines: [
    { sku: 'PALLET-EUR-01', quantity: 24, unitPrice: 18.5 },
    { sku: 'WRAP-FILM-50', quantity: 120, unitPrice: 3.2 },
  ],
};

const SAMPLE_INVOICE: InvoicePayload = {
  invoiceNumber: 'INV-2026-018842',
  customer: { id: '0010004711', name: 'Example Logistics GmbH' },
  currency: 'EUR',
  issuedOn: '2026-11-04',
  dueOn: '2026-12-04',
  lines: [
    { description: 'Freight, Rotterdam to Hamburg', amount: 4120 },
    { description: 'Dock handling', amount: 380 },
  ],
};

export const SAMPLE_EVENTS: { [T in EventType]: CanonicalEvent<T> } = {
  'lead.created': newEvent('lead.created', SAMPLE_LEAD, SAMPLE_SOURCE, { id: '3f2a9c1e-7b4d-4e0a-9d51-6c8b2a7e1f40', at: new Date('2026-10-16T09:30:00.000Z') }),
  'order.created': newEvent('order.created', SAMPLE_ORDER, { ...SAMPLE_SOURCE, market: 'dach', locale: 'de' }, { id: '8d1b6f42-2c9a-4a73-b0e5-1f7d3c9a5e28', at: new Date('2026-10-16T09:31:12.000Z') }),
  'invoice.issued': newEvent('invoice.issued', SAMPLE_INVOICE, { ...SAMPLE_SOURCE, market: 'dach', locale: 'de' }, { id: 'c47e0a95-5d13-4b86-8e2f-a9b04d6c7f13', at: new Date('2026-10-16T09:32:40.000Z') }),
};
