import { SAMPLE_EVENTS } from './event';
import type { CanonicalEvent, EventType } from './types';

/**
 * From the canonical event to the shape each system expects (docs/architecture/integrations/). One declarative table per system is the single
 * source of truth: the mapper builds the payload from it, the interactive model on the Architecture section draws its lines from it, the
 * documentation prints it, and tests/arch checks all three against each other.
 *
 * These are ILLUSTRATIVE shapes. They follow the public naming conventions of each vendor's data model so that the idea is concrete, but they were
 * not generated from, or validated against, a vendor sandbox or API reference: every real connector is built and validated per project against
 * the client's own system (custom fields, organisation codes and picklists are always the client's). Product names belong to their owners; no
 * partnership, certification or conformance is implied (docs/architecture/README.md, "What is not claimed").
 */

export const TARGET_SYSTEMS = ['salesforce', 'hubspot', 'sap', 'oracle'] as const;
export type TargetSystem = (typeof TARGET_SYSTEMS)[number];

export interface Mapping {
  /** Dotted path in the canonical event, or null for a constant. */
  from: string | null;
  /** Dotted path in the payload this system receives (`fields.LastName`, `to_Item[0].Material`). */
  to: string;
  /** A constant (when `from` is null) or a fallback. */
  value?: string | number;
  /** `first` and `rest` split a full name on its first space (Salesforce wants a surname; most CRMs also keep a given name). */
  transform?: 'first' | 'rest' | 'string';
  /** One line for the documentation: what the field is for. */
  note: string;
}

export interface Target {
  system: TargetSystem;
  /** The event type this system receives in the reference, and the kind of record it becomes there. */
  eventType: EventType;
  object: string;
  /** Where the event id (the idempotency key) is carried, so that a retry updates or is refused instead of creating a second record. */
  idempotencyPath: string;
  mappings: readonly Mapping[];
}

export const TARGETS: Record<TargetSystem, Target> = {
  salesforce: {
    system: 'salesforce',
    eventType: 'lead.created',
    object: 'Lead',
    idempotencyPath: 'fields.SyncflowEventId__c',
    mappings: [
      { from: 'id', to: 'fields.SyncflowEventId__c', note: 'External id (custom field): an upsert on it updates the same Lead when the event is retried.' },
      { from: 'payload.name', to: 'fields.FirstName', transform: 'first', note: 'Given name.' },
      { from: 'payload.name', to: 'fields.LastName', transform: 'rest', note: 'Surname (required by the Lead object).' },
      { from: 'payload.company', to: 'fields.Company', note: 'Required by the Lead object.' },
      { from: 'payload.email', to: 'fields.Email', note: 'Contact address.' },
      { from: 'payload.role', to: 'fields.Title', note: 'The enquirer’s role.' },
      { from: 'payload.message', to: 'fields.Description', note: 'Free text from the briefing.' },
      { from: 'source.market', to: 'fields.SyncflowMarket__c', note: 'Capital-centre market chosen on the entry gate (custom field).' },
      { from: null, value: 'Web', to: 'fields.LeadSource', note: 'Constant: where the lead came from.' },
      { from: null, value: 'Open - Not Contacted', to: 'fields.Status', note: 'Constant: a standard starting status for a new Lead.' },
    ],
  },
  hubspot: {
    system: 'hubspot',
    eventType: 'lead.created',
    object: 'Contact',
    idempotencyPath: 'properties.syncflow_event_id',
    mappings: [
      { from: 'id', to: 'properties.syncflow_event_id', note: 'Custom property carrying the idempotency key; a search on it finds the contact before a second one is created.' },
      { from: 'payload.email', to: 'properties.email', note: 'HubSpot’s natural duplicate key for a contact.' },
      { from: 'payload.name', to: 'properties.firstname', transform: 'first', note: 'Given name.' },
      { from: 'payload.name', to: 'properties.lastname', transform: 'rest', note: 'Surname.' },
      { from: 'payload.company', to: 'properties.company', note: 'Company name.' },
      { from: 'payload.role', to: 'properties.jobtitle', note: 'Job title.' },
      { from: 'payload.message', to: 'properties.message', note: 'Free text from the briefing.' },
      { from: 'source.market', to: 'properties.syncflow_market', note: 'Market chosen on the entry gate (custom property).' },
      { from: null, value: 'lead', to: 'properties.lifecyclestage', note: 'Constant: lifecycle stage of a new enquiry.' },
      { from: null, value: 'NEW', to: 'properties.hs_lead_status', note: 'Constant: lead status of a new enquiry.' },
    ],
  },
  sap: {
    system: 'sap',
    eventType: 'order.created',
    object: 'Sales order',
    idempotencyPath: 'YY1_SyncflowEventId_SDH',
    mappings: [
      { from: 'id', to: 'YY1_SyncflowEventId_SDH', note: 'Customer-extension field carrying the idempotency key, checked before an order is created.' },
      { from: 'payload.customer.id', to: 'SoldToParty', note: 'The customer’s business-partner number.' },
      { from: 'payload.orderNumber', to: 'PurchaseOrderByCustomer', note: 'The customer’s own PO number: SAP’s usual duplicate-order check.' },
      { from: 'payload.currency', to: 'TransactionCurrency', note: 'ISO 4217 currency.' },
      { from: 'payload.requestedDelivery', to: 'RequestedDeliveryDate', note: 'Requested delivery date.' },
      { from: 'payload.lines[0].sku', to: 'to_Item[0].Material', note: 'One item per order line (the first is shown).' },
      { from: 'payload.lines[0].quantity', to: 'to_Item[0].RequestedQuantity', transform: 'string', note: 'Quantity as the system’s string decimal.' },
      { from: null, value: 'OR', to: 'SalesOrderType', note: 'Constant (placeholder): the order type is the client’s configuration.' },
      { from: null, value: '1010', to: 'SalesOrganization', note: 'Constant (placeholder): the client’s organisation code.' },
      { from: null, value: '10', to: 'DistributionChannel', note: 'Constant (placeholder): the client’s channel.' },
      { from: null, value: 'EA', to: 'to_Item[0].RequestedQuantityUnit', note: 'Constant: unit of measure (each).' },
    ],
  },
  oracle: {
    system: 'oracle',
    eventType: 'invoice.issued',
    object: 'Receivables invoice',
    idempotencyPath: 'attribute1',
    mappings: [
      { from: 'id', to: 'attribute1', note: 'Flexfield carrying the idempotency key; the invoice number stays the business key.' },
      { from: 'payload.invoiceNumber', to: 'InvoiceNumber', note: 'The business key of the invoice.' },
      { from: 'payload.customer.id', to: 'BillToCustomerNumber', note: 'The customer account.' },
      { from: 'payload.currency', to: 'InvoiceCurrencyCode', note: 'ISO 4217 currency.' },
      { from: 'payload.issuedOn', to: 'TransactionDate', note: 'Invoice date.' },
      { from: 'payload.lines[0].description', to: 'invoiceLines[0].Description', note: 'One line per invoice line (the first is shown).' },
      { from: 'payload.lines[0].amount', to: 'invoiceLines[0].UnitSellingPrice', note: 'Line amount, quantity one.' },
      { from: null, value: 'SYNCFLOW', to: 'TransactionSource', note: 'Constant (placeholder): the client’s transaction source.' },
      { from: null, value: 'Example BU', to: 'BusinessUnit', note: 'Constant (placeholder): the client’s business unit.' },
      { from: null, value: 1, to: 'invoiceLines[0].Quantity', note: 'Constant: quantity one per line.' },
    ],
  },
};

/** Reads `payload.lines[0].sku` out of an object. */
export function read(source: unknown, path: string): unknown {
  let current: unknown = source;
  for (const part of path.split('.')) {
    if (current === null || typeof current !== 'object') return undefined;
    const match = /^(\w+)\[(\d+)\]$/.exec(part);
    current = match ? ((current as Record<string, unknown>)[match[1]!] as unknown[] | undefined)?.[Number(match[2])] : (current as Record<string, unknown>)[part];
  }
  return current;
}

/** Writes `to_Item[0].Material` into an object, creating the objects and arrays on the way. */
export function write(target: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current: Record<string, unknown> = target;
  parts.forEach((part, index) => {
    const match = /^(\w+)\[(\d+)\]$/.exec(part);
    const last = index === parts.length - 1;
    if (match) {
      const key = match[1]!;
      const at = Number(match[2]);
      const list = (current[key] ??= []) as unknown[];
      if (last) list[at] = value;
      else current = (list[at] ??= {}) as Record<string, unknown>;
    } else if (last) current[part] = value;
    else current = (current[part] ??= {}) as Record<string, unknown>;
  });
}

function transformed(value: unknown, transform: Mapping['transform']): unknown {
  if (transform === undefined || typeof value !== 'string') return transform === 'string' && value !== undefined ? String(value) : value;
  const space = value.indexOf(' ');
  if (transform === 'first') return space === -1 ? value : value.slice(0, space);
  if (transform === 'rest') return space === -1 ? value : value.slice(space + 1);
  return value;
}

export interface AppliedMapping {
  from: string | null;
  to: string;
  value: string;
  constant: boolean;
}

export interface Mapped {
  system: TargetSystem;
  object: string;
  payload: Record<string, unknown>;
  applied: AppliedMapping[];
}

/** Maps an event the target understands. Refuses an event of another type: a mapper never guesses. */
export function mapEvent(system: TargetSystem, event: CanonicalEvent): Mapped {
  const target = TARGETS[system];
  if (event.type !== target.eventType) throw new Error(`${system} receives ${target.eventType}, not ${event.type}`);
  const payload: Record<string, unknown> = {};
  const applied: AppliedMapping[] = [];
  for (const mapping of target.mappings) {
    const raw = mapping.from === null ? mapping.value : transformed(read(event, mapping.from), mapping.transform);
    if (raw === undefined) throw new Error(`${system}: ${mapping.from} is missing from the event`);
    write(payload, mapping.to, raw);
    applied.push({ from: mapping.from, to: mapping.to, value: String(raw), constant: mapping.from === null });
  }
  return { system, object: target.object, payload, applied };
}

/** The reference event each target is shown with (the same fixed examples the documentation uses). */
export const sampleFor = (system: TargetSystem): CanonicalEvent => SAMPLE_EVENTS[TARGETS[system].eventType];
