# The security envelope: sign, verify, seal

Reference implementation: `lib/arch/envelope.ts`. Verified by `tests/arch/envelope.test.ts`. The same functions run in the interactive model on
the site (Architecture, card VI: `components/sim/SecurityFlowSim.tsx`), with throwaway keys that never leave the page. This site's own briefing
delivery uses the same signature shape in production (`lib/server/deliver.ts`, header `x-syncflow-signature: sha256=<hex>`).

## The steps, in the order they run

| # | Step | What happens | What it refuses |
|---|---|---|---|
| 1 | **Create** | The event is built once. Its `id` is the idempotency key and never changes (`newEvent`, `lib/arch/event.ts`). | Nothing: the validator checks the shape here and again at the receiver. |
| 2 | **Sign** | The event is serialised **once**; HMAC-SHA256 is computed over those exact bytes (`signEvent`). What travels is the `body` string: nobody re-serialises it on the way, so the bytes signed are the bytes verified. Output: `sha256=<64 hex>`. | |
| 3 | **Verify (zero trust)** | The receiver recomputes the HMAC over the bytes it **received** and compares in constant time (`verifyEnvelope`). Only then does it look at the timestamp, then at the shape. | A changed body or signature (`bad-signature`), another key, a timestamp outside the freshness window (`stale`, 5 minutes by default, both directions), a body that is not JSON (`malformed`), a correctly signed body that is not a valid event (`invalid-event`). |
| 4 | **Deduplicate** | The receiver checks the event id against the ids it has applied (`IdempotentReceiver`, `lib/arch/queue.ts`). | A replay inside the freshness window: acknowledged, not applied twice. |
| 5 | **Seal** | Between systems, the message is sealed with AES-256-GCM using a fresh random 96-bit IV per message (`seal`, `open`). The authentication tag means a changed ciphertext, IV or key fails to open. | Any change to the ciphertext or IV in transit; the wrong key. |
| 6 | **Deliver** | The destination opens the message and applies it. | |

The order is the point. **Nothing in the body is read, let alone acted on, before the signature over the received bytes has been checked.**
A freshness window stops a captured request being replayed hours later; the idempotency check stops one replayed inside the window.

## What the tests prove

- The signature is standard HMAC-SHA256: the published RFC 4231 test vector (key `Jefe`, data `what do ya want for nothing?`) gives the expected
  digest, so any other implementation can verify it.
- One altered character in the body, or one in the signature, is refused as `bad-signature`.
- Another key is refused; a body that is not JSON is `malformed`; a valid signature over an invalid event is `invalid-event`.
- A message exactly at the edge of the freshness window is fresh, one millisecond past it is `stale`, in both directions.
- Sealing round-trips; a changed ciphertext, a changed IV and another key all fail to open; 1,000 messages sealed with one key draw 1,000
  different IVs (an IV must never repeat with the same key).
- `timingSafeEqual` compares every character of equal-length strings and refuses different lengths.

`examples/signed-envelope.lead.created.json` is a signed envelope computed with a published demonstration key (`syncflow-demo-key-not-a-secret`):
anyone can recompute its signature to check an implementation of their own.

## Out of scope, on purpose

Key generation, storage, rotation, revocation and access control belong to the client's environment and its policies. Transport security (TLS)
is assumed and is not replaced by any of this. No statement of compliance with a standard or a regulation is made here: the envelope is a
building block for a client's own security work, not a substitute for it.
