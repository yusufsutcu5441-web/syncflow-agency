# Integrations: one event, four shapes

Reference implementation: `lib/arch/mappers.ts`. Verified by `tests/arch/mappers.test.ts`. The interactive model on the site (Architecture,
card V) draws exactly these tables: each line it shows is one row below.

## Read this first

The shapes below are **illustrative**. They follow the public naming conventions of each vendor's data model, so the idea is concrete, but they
were **not generated from, or validated against, a vendor sandbox, tenant or API reference**, and no conformance to any vendor API is claimed.
In a real project the connector is built and validated against the client's own system: custom fields, organisation codes, picklists and
authentication are always the client's. Product names belong to their owners; no partnership, certification or marketplace listing is implied.

What the mapping shows is the part that is the same everywhere:

- **One canonical event** in (`canonical-event.schema.json`), with an id that never changes.
- **A declarative table per system**: a source field, a target field, a note. The mapper, the model on the site, and this page all read the
  same table (`TARGETS` in `lib/arch/mappers.ts`); a test compares each with the others.
- **The idempotency key travels with the record** (the line above each table names the field), so a retry updates the same record or is
  refused by the system, instead of creating a second one.
- **A mapper never guesses**: it refuses an event of a type its system does not receive, and a missing source field is an error, not an empty value.

## The four mappings

Each system receives the event type that fits it in the reference: leads go to a CRM (Salesforce, HubSpot), an order to an ERP (SAP), an
invoice to a finance system (Oracle). Which system takes which event is the client's architecture.

<!-- mappings:start -->
### Salesforce: Lead

Receives `lead.created`. The event id (the idempotency key) travels in `fields.SyncflowEventId__c`. Example output: `examples/salesforce.lead.json`.

| From the canonical event | To the payload | What it is for |
|---|---|---|
| `id` | `fields.SyncflowEventId__c` | External id (custom field): an upsert on it updates the same Lead when the event is retried. |
| `payload.name` (first) | `fields.FirstName` | Given name. |
| `payload.name` (rest) | `fields.LastName` | Surname (required by the Lead object). |
| `payload.company` | `fields.Company` | Required by the Lead object. |
| `payload.email` | `fields.Email` | Contact address. |
| `payload.role` | `fields.Title` | The enquirer’s role. |
| `payload.message` | `fields.Description` | Free text from the briefing. |
| `source.market` | `fields.SyncflowMarket__c` | Capital-centre market chosen on the entry gate (custom field). |
| *constant* `Web` | `fields.LeadSource` | Constant: where the lead came from. |
| *constant* `Open - Not Contacted` | `fields.Status` | Constant: a standard starting status for a new Lead. |

```json
{
  "fields": {
    "SyncflowEventId__c": "3f2a9c1e-7b4d-4e0a-9d51-6c8b2a7e1f40",
    "FirstName": "Alex",
    "LastName": "Morgan",
    "Company": "Example Holdings",
    "Email": "alex.morgan@example.com",
    "Title": "principal",
    "Description": "Group-wide order portal, integrated with our ERP.",
    "SyncflowMarket__c": "us",
    "LeadSource": "Web",
    "Status": "Open - Not Contacted"
  }
}
```

### HubSpot: Contact

Receives `lead.created`. The event id (the idempotency key) travels in `properties.syncflow_event_id`. Example output: `examples/hubspot.contact.json`.

| From the canonical event | To the payload | What it is for |
|---|---|---|
| `id` | `properties.syncflow_event_id` | Custom property carrying the idempotency key; a search on it finds the contact before a second one is created. |
| `payload.email` | `properties.email` | HubSpot’s natural duplicate key for a contact. |
| `payload.name` (first) | `properties.firstname` | Given name. |
| `payload.name` (rest) | `properties.lastname` | Surname. |
| `payload.company` | `properties.company` | Company name. |
| `payload.role` | `properties.jobtitle` | Job title. |
| `payload.message` | `properties.message` | Free text from the briefing. |
| `source.market` | `properties.syncflow_market` | Market chosen on the entry gate (custom property). |
| *constant* `lead` | `properties.lifecyclestage` | Constant: lifecycle stage of a new enquiry. |
| *constant* `NEW` | `properties.hs_lead_status` | Constant: lead status of a new enquiry. |

```json
{
  "properties": {
    "syncflow_event_id": "3f2a9c1e-7b4d-4e0a-9d51-6c8b2a7e1f40",
    "email": "alex.morgan@example.com",
    "firstname": "Alex",
    "lastname": "Morgan",
    "company": "Example Holdings",
    "jobtitle": "principal",
    "message": "Group-wide order portal, integrated with our ERP.",
    "syncflow_market": "us",
    "lifecyclestage": "lead",
    "hs_lead_status": "NEW"
  }
}
```

### SAP: Sales order

Receives `order.created`. The event id (the idempotency key) travels in `YY1_SyncflowEventId_SDH`. Example output: `examples/sap.sales-order.json`.

| From the canonical event | To the payload | What it is for |
|---|---|---|
| `id` | `YY1_SyncflowEventId_SDH` | Customer-extension field carrying the idempotency key, checked before an order is created. |
| `payload.customer.id` | `SoldToParty` | The customer’s business-partner number. |
| `payload.orderNumber` | `PurchaseOrderByCustomer` | The customer’s own PO number: SAP’s usual duplicate-order check. |
| `payload.currency` | `TransactionCurrency` | ISO 4217 currency. |
| `payload.requestedDelivery` | `RequestedDeliveryDate` | Requested delivery date. |
| `payload.lines[0].sku` | `to_Item[0].Material` | One item per order line (the first is shown). |
| `payload.lines[0].quantity` (string) | `to_Item[0].RequestedQuantity` | Quantity as the system’s string decimal. |
| *constant* `OR` | `SalesOrderType` | Constant (placeholder): the order type is the client’s configuration. |
| *constant* `1010` | `SalesOrganization` | Constant (placeholder): the client’s organisation code. |
| *constant* `10` | `DistributionChannel` | Constant (placeholder): the client’s channel. |
| *constant* `EA` | `to_Item[0].RequestedQuantityUnit` | Constant: unit of measure (each). |

```json
{
  "YY1_SyncflowEventId_SDH": "8d1b6f42-2c9a-4a73-b0e5-1f7d3c9a5e28",
  "SoldToParty": "0010004711",
  "PurchaseOrderByCustomer": "PO-2026-004217",
  "TransactionCurrency": "EUR",
  "RequestedDeliveryDate": "2026-11-03",
  "to_Item": [
    {
      "Material": "PALLET-EUR-01",
      "RequestedQuantity": "24",
      "RequestedQuantityUnit": "EA"
    }
  ],
  "SalesOrderType": "OR",
  "SalesOrganization": "1010",
  "DistributionChannel": "10"
}
```

### Oracle: Receivables invoice

Receives `invoice.issued`. The event id (the idempotency key) travels in `attribute1`. Example output: `examples/oracle.receivables-invoice.json`.

| From the canonical event | To the payload | What it is for |
|---|---|---|
| `id` | `attribute1` | Flexfield carrying the idempotency key; the invoice number stays the business key. |
| `payload.invoiceNumber` | `InvoiceNumber` | The business key of the invoice. |
| `payload.customer.id` | `BillToCustomerNumber` | The customer account. |
| `payload.currency` | `InvoiceCurrencyCode` | ISO 4217 currency. |
| `payload.issuedOn` | `TransactionDate` | Invoice date. |
| `payload.lines[0].description` | `invoiceLines[0].Description` | One line per invoice line (the first is shown). |
| `payload.lines[0].amount` | `invoiceLines[0].UnitSellingPrice` | Line amount, quantity one. |
| *constant* `SYNCFLOW` | `TransactionSource` | Constant (placeholder): the client’s transaction source. |
| *constant* `Example BU` | `BusinessUnit` | Constant (placeholder): the client’s business unit. |
| *constant* `1` | `invoiceLines[0].Quantity` | Constant: quantity one per line. |

```json
{
  "attribute1": "c47e0a95-5d13-4b86-8e2f-a9b04d6c7f13",
  "InvoiceNumber": "INV-2026-018842",
  "BillToCustomerNumber": "0010004711",
  "InvoiceCurrencyCode": "EUR",
  "TransactionDate": "2026-11-04",
  "invoiceLines": [
    {
      "Description": "Freight, Rotterdam to Hamburg",
      "UnitSellingPrice": 4120,
      "Quantity": 1
    }
  ],
  "TransactionSource": "SYNCFLOW",
  "BusinessUnit": "Example BU"
}
```
<!-- mappings:end -->

## What a connector adds in a project

The mapper is the pure part. A project adds, per system: authentication, the client's field and picklist configuration, rate-limit handling,
error classification (which failures are retryable, which are the system refusing the data: that classification is what `Transport.send` returns
to the queue in `lib/arch/queue.ts`), and an upsert strategy on the idempotency field. None of that is claimed to exist here.
