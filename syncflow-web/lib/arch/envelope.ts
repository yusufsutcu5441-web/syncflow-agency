import { validateEvent } from './event';
import type { CanonicalEvent, Sealed, SignedEnvelope, VerifyResult } from './types';

/**
 * Signing, zero-trust verification and sealing, on Web Crypto (Node 20+, every current browser). The same functions run in the contract tests
 * (tests/arch), in the browser model on the Architecture section (components/sim/SecurityFlowSim.tsx) and, in the same `sha256=<hex>` shape,
 * in this site's own briefing delivery (lib/server/deliver.ts, header x-syncflow-signature).
 *
 * Signing: HMAC-SHA256 over the EXACT bytes that are sent. Verifying recomputes it over the bytes that ARRIVED, compares in constant time, and
 * only then looks at the contents: freshness (a captured request cannot be replayed hours later) and the idempotency key (a replay inside the
 * window is acknowledged, not applied twice: that is the receiver's job, queue.ts IdempotentReceiver). Sealing: AES-256-GCM with a fresh
 * random 96-bit IV per message, so the ciphertext carries its own tamper check. Key management (rotation, storage, who holds the secret) is
 * the client's and is deliberately out of scope here.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** The window in which a signed message is fresh. */
export const FRESH_MS = 5 * 60_000;

export const toHex = (bytes: ArrayBuffer | Uint8Array): string => Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');

export function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  if (hex.length % 2 !== 0 || /[^0-9a-f]/i.test(hex)) throw new Error('not hexadecimal');
  const out = new Uint8Array(new ArrayBuffer(hex.length / 2));
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** Compares two strings without stopping at the first difference (the time taken does not reveal how much of a signature was right). */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function importHmacKey(secret: string | Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const raw = typeof secret === 'string' ? encoder.encode(secret) : secret;
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

/** `sha256=<hex>` over the exact string given. */
export async function signBody(key: CryptoKey, body: string): Promise<string> {
  return `sha256=${toHex(await crypto.subtle.sign('HMAC', key, encoder.encode(body)))}`;
}

/** Serialises the event once and signs those exact bytes. What travels is `body`: nobody re-serialises it on the way. */
export async function signEvent(event: CanonicalEvent, key: CryptoKey, now: number = Date.now()): Promise<SignedEnvelope> {
  const body = JSON.stringify(event);
  return { body, signature: await signBody(key, body), timestamp: new Date(now).toISOString() };
}

/**
 * The receiver's side. Order matters and is the point: 1. the signature over the bytes received, in constant time; 2. the freshness of the
 * timestamp; 3. the shape of the event. Nothing in the body is looked at, let alone acted on, before the first step passes.
 */
export async function verifyEnvelope(envelope: SignedEnvelope, key: CryptoKey, options: { now?: number; maxAgeMs?: number } = {}): Promise<VerifyResult> {
  const now = options.now ?? Date.now();
  const maxAge = options.maxAgeMs ?? FRESH_MS;
  if (typeof envelope.body !== 'string' || typeof envelope.signature !== 'string' || typeof envelope.timestamp !== 'string') return { ok: false, reason: 'malformed' };
  const expected = await signBody(key, envelope.body);
  if (!timingSafeEqual(expected, envelope.signature)) return { ok: false, reason: 'bad-signature' };
  const stamp = Date.parse(envelope.timestamp);
  if (Number.isNaN(stamp) || Math.abs(now - stamp) > maxAge) return { ok: false, reason: 'stale' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(envelope.body);
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  const checked = validateEvent(parsed);
  return checked.ok ? { ok: true, event: checked.event } : { ok: false, reason: 'invalid-event', detail: checked.errors.join(',') };
}

export function generateSealKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

/** AES-256-GCM with a fresh random 96-bit IV. Never reuse an IV with the same key; here every call draws a new one. */
export async function seal(key: CryptoKey, plaintext: string): Promise<Sealed> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plaintext));
  return { iv: toHex(iv), data: toHex(data) };
}

/** Throws when the ciphertext, the IV or the key is not exactly what sealed it (the authentication tag does not match). */
export async function open(key: CryptoKey, sealed: Sealed): Promise<string> {
  return decoder.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromHex(sealed.iv) }, key, fromHex(sealed.data)));
}
