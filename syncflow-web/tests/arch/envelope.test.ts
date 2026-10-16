import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { FRESH_MS, fromHex, generateSealKey, importHmacKey, open, seal, signBody, signEvent, timingSafeEqual, toHex, verifyEnvelope } from '../../lib/arch/envelope';
import { SAMPLE_EVENTS } from '../../lib/arch/event';
import type { SignedEnvelope } from '../../lib/arch/types';

const NOW = Date.parse('2026-10-16T09:30:00.000Z');

describe('envelope: signing and zero-trust verification', () => {
  it('signs the exact bytes: sha256=<64 hex>, and a verifier recomputes the same value', async () => {
    const key = await importHmacKey('a-test-secret');
    const envelope = await signEvent(SAMPLE_EVENTS['lead.created'], key, NOW);
    assert.match(envelope.signature, /^sha256=[0-9a-f]{64}$/);
    assert.equal(envelope.signature, await signBody(key, envelope.body));
    assert.equal(envelope.body, JSON.stringify(SAMPLE_EVENTS['lead.created']));
    const result = await verifyEnvelope(envelope, key, { now: NOW });
    assert.equal(result.ok, true);
    if (result.ok) assert.deepEqual(result.event, SAMPLE_EVENTS['lead.created']);
  });

  it('the signature is the standard HMAC-SHA256 (a published test vector, RFC 4231 case 2)', async () => {
    const key = await importHmacKey('Jefe');
    assert.equal(await signBody(key, 'what do ya want for nothing?'), 'sha256=5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843');
  });

  it('refuses one altered character, in the body or in the signature, before reading the body', async () => {
    const key = await importHmacKey('a-test-secret');
    const good = await signEvent(SAMPLE_EVENTS['order.created'], key, NOW);
    const at = good.body.indexOf('PALLET');
    const body = `${good.body.slice(0, at)}PALLEX${good.body.slice(at + 6)}`;
    assert.deepEqual(await verifyEnvelope({ ...good, body }, key, { now: NOW }), { ok: false, reason: 'bad-signature' });
    const last = good.signature.at(-1) === '0' ? '1' : '0';
    assert.deepEqual(await verifyEnvelope({ ...good, signature: good.signature.slice(0, -1) + last }, key, { now: NOW }), { ok: false, reason: 'bad-signature' });
  });

  it('refuses another key, and a body that is not even JSON', async () => {
    const key = await importHmacKey('a-test-secret');
    const other = await importHmacKey('another-secret');
    const good = await signEvent(SAMPLE_EVENTS['lead.created'], key, NOW);
    assert.equal((await verifyEnvelope(good, other, { now: NOW })).ok, false);
    const garbage: SignedEnvelope = { body: '{not json', signature: await signBody(key, '{not json'), timestamp: good.timestamp };
    assert.deepEqual(await verifyEnvelope(garbage, key, { now: NOW }), { ok: false, reason: 'malformed' });
  });

  it('refuses a correctly signed message that is too old or from the future (replay window)', async () => {
    const key = await importHmacKey('a-test-secret');
    const good = await signEvent(SAMPLE_EVENTS['lead.created'], key, NOW);
    assert.equal((await verifyEnvelope(good, key, { now: NOW + FRESH_MS })).ok, true, 'the edge of the window is fresh');
    assert.deepEqual(await verifyEnvelope(good, key, { now: NOW + FRESH_MS + 1 }), { ok: false, reason: 'stale' });
    assert.deepEqual(await verifyEnvelope(good, key, { now: NOW - FRESH_MS - 1 }), { ok: false, reason: 'stale' });
  });

  it('refuses a correctly signed body that is not a valid event (it never reaches a mapper)', async () => {
    const key = await importHmacKey('a-test-secret');
    const body = JSON.stringify({ ...SAMPLE_EVENTS['lead.created'], id: 'x' });
    const result = await verifyEnvelope({ body, signature: await signBody(key, body), timestamp: new Date(NOW).toISOString() }, key, { now: NOW });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'invalid-event');
  });

  it('compares in constant time: equal length strings are compared in full, different lengths are refused', () => {
    assert.equal(timingSafeEqual('abcdef', 'abcdef'), true);
    assert.equal(timingSafeEqual('abcdef', 'abcdeg'), false);
    assert.equal(timingSafeEqual('abc', 'abcd'), false);
  });

  it('hex helpers round-trip and refuse what is not hex', () => {
    const bytes = new Uint8Array([0, 1, 15, 16, 255]);
    assert.equal(toHex(bytes), '00010f10ff');
    assert.deepEqual([...fromHex('00010f10ff')], [...bytes]);
    assert.throws(() => fromHex('zz'));
    assert.throws(() => fromHex('abc'));
  });
});

describe('envelope: sealing with AES-256-GCM', () => {
  it('opens what it sealed, and a ciphertext is not the plaintext', async () => {
    const key = await generateSealKey();
    const sealed = await seal(key, 'a message for the business system');
    assert.match(sealed.iv, /^[0-9a-f]{24}$/, '96-bit IV');
    assert.ok(!sealed.data.includes(toHex(new TextEncoder().encode('message'))));
    assert.equal(await open(key, sealed), 'a message for the business system');
  });

  it('detects a changed ciphertext, a changed IV and another key (the tag does not match)', async () => {
    const key = await generateSealKey();
    const sealed = await seal(key, 'payload');
    const flip = (hex: string) => (hex[0] === '0' ? '1' : '0') + hex.slice(1);
    await assert.rejects(open(key, { ...sealed, data: flip(sealed.data) }));
    await assert.rejects(open(key, { ...sealed, iv: flip(sealed.iv) }));
    await assert.rejects(open(await generateSealKey(), sealed));
  });

  it('draws a fresh IV for every message (1,000 messages, no repeat)', async () => {
    const key = await generateSealKey();
    const ivs = new Set<string>();
    for (let i = 0; i < 1000; i++) ivs.add((await seal(key, 'same text')).iv);
    assert.equal(ivs.size, 1000);
  });
});
