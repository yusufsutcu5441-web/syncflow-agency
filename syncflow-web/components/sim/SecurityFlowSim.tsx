'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SecurityView } from './SecurityView';
import { fillText, IDLE_SECURITY, type SecurityLabels, type SecurityState } from './types';

/**
 * The live enterprise security flow (docs/adr/0020-case-study-layer.md §3). The numbers on screen are REAL: when a message is sent, the
 * browser's own Web Crypto computes them, with throwaway keys that never leave the page.
 *   1. client   builds the message {id, at, lead} and a unique key (the id);
 *   2. sign     HMAC-SHA256 over the exact bytes, in the same `sha256=<hex>` shape this site uses to sign its own briefings (lib/server/deliver.ts);
 *   3. verify   the receiver recomputes the signature over what it RECEIVED (one character altered when the switch is on), compares it in
 *               constant time, checks the timestamp is fresh (5 minutes) and the key has not been seen (a replay is acknowledged, not repeated);
 *   4. encrypt  AES-256-GCM with a fresh key and a random 96-bit IV, so the ciphertext carries its own tamper check;
 *   5. deliver  the destination decrypts and compares the plaintext with what was sent.
 * It demonstrates a pattern. It describes, measures and certifies no production system, and the card says so.
 */
const DEMO_KEY = 'syncflow-demo-key-not-a-secret';
const FRESH_MS = 5 * 60_000;
const STEP_MS = 520;
const STAGES = ['client', 'sign', 'verify', 'encrypt', 'deliver'] as const;

type Message = { id: string; at: string; lead: string };

const encoder = new TextEncoder();
const hex = (bytes: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
const short = (value: string) => (value.length > 26 ? `${value.slice(0, 16)}…${value.slice(-8)}` : value);
const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/** Compares two equal-purpose strings without stopping at the first difference. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Changes one hexadecimal character inside the message's key, as a hand in the middle of the road would. */
function alter(body: string): string {
  const at = 9;
  const next = ((parseInt(body[at] ?? '0', 16) + 1) % 16).toString(16);
  return `${body.slice(0, at)}${next}${body.slice(at + 1)}`;
}

async function hmacHex(key: CryptoKey, data: string): Promise<string> {
  return hex(await crypto.subtle.sign('HMAC', key, encoder.encode(data)));
}

export default function SecurityFlowSim({ labels }: { labels: SecurityLabels }) {
  const [state, setState] = useState<Omit<SecurityState, 'status'> & { status: string }>({ ...IDLE_SECURITY, status: labels.statusIdle });
  const [hasMessage, setHasMessage] = useState(false);
  const run = useRef(0);
  const last = useRef<Message | null>(null);
  const seen = useRef(new Set<string>());
  const tamper = useRef(false);

  const patch = useCallback((next: Partial<SecurityState>) => setState((current) => ({ ...current, ...next })), []);

  useEffect(() => {
    return () => {
      run.current = -1;
    };
  }, []);

  const execute = useCallback(
    async (replay: boolean) => {
      run.current += 1;
      const mine = run.current;
      const stale = () => run.current !== mine;
      const step = (n: number) => fillText(labels.statusStep, { step: n, name: labels[STAGES[n - 1]!] });
      const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : STEP_MS;

      if (typeof crypto === 'undefined' || !crypto.subtle) {
        patch({ outcome: 'unavailable', status: labels.outUnavailable });
        return;
      }

      try {
        patch({ running: true, outcome: null, stoppedAt: null, stage: 0, signature: '—', check: '—', cipher: '—', status: step(1) });

        // 1. the client builds the message
        const message: Message = replay && last.current ? last.current : { id: crypto.randomUUID(), at: new Date().toISOString(), lead: 'Example Holdings, enterprise enquiry' };
        last.current = message;
        setHasMessage(true);
        const body = JSON.stringify(message);
        patch({ payload: body });
        await wait(delay);
        if (stale()) return;

        // 2. HMAC-SHA256 over the exact bytes
        patch({ stage: 1, status: step(2) });
        const key = await crypto.subtle.importKey('raw', encoder.encode(DEMO_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        const signature = await hmacHex(key, body);
        patch({ signature: `sha256=${short(signature)}` });
        await wait(delay);
        if (stale()) return;

        // 3. the receiver trusts nothing and recomputes over what it received
        patch({ stage: 2, status: step(3) });
        const received = tamper.current ? alter(body) : body;
        const valid = timingSafeEqual(await hmacHex(key, received), signature);
        if (!valid) {
          patch({ check: `✕ ${labels.checkMismatch}`, running: false, outcome: 'rejected', stoppedAt: 2, status: labels.outRejected });
          return;
        }
        const fresh = Math.abs(Date.now() - Date.parse(message.at)) <= FRESH_MS;
        const known = seen.current.has(message.id);
        const check = [`✓ ${labels.checkValid}`, `${fresh ? '✓' : '✕'} ${labels.checkFresh}`, known ? `✕ ${labels.checkSeen}` : `✓ ${labels.checkNew}`].join(' · ');
        if (known || !fresh) {
          patch({ check, running: false, outcome: known ? 'duplicate' : 'rejected', stoppedAt: 2, status: known ? labels.outDuplicate : labels.outRejected });
          return;
        }
        seen.current.add(message.id);
        patch({ check });
        await wait(delay);
        if (stale()) return;

        // 4. AES-256-GCM with a fresh key and a random IV
        patch({ stage: 3, status: step(4) });
        const aes = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const sealed = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aes, encoder.encode(received));
        patch({ cipher: `${hex(iv).slice(0, 12)}… ${hex(sealed).slice(0, 28)}…` });
        await wait(delay);
        if (stale()) return;

        // 5. delivery: the destination decrypts and compares
        patch({ stage: 4, status: step(5) });
        const plain = new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aes, sealed));
        await wait(delay);
        if (stale()) return;
        patch({ running: false, outcome: plain === received ? 'delivered' : 'rejected', status: plain === received ? labels.outDelivered : labels.outRejected });
      } catch {
        if (!stale()) patch({ running: false, outcome: 'unavailable', status: labels.outUnavailable });
      }
    },
    [labels, patch],
  );

  const view: SecurityState = { ...state };
  return (
    <SecurityView
      labels={labels}
      state={view}
      actions={{
        send: () => void execute(false),
        replay: () => void execute(true),
        setTamper: (value) => {
          tamper.current = value;
          patch({ tamper: value });
        },
        canReplay: hasMessage,
      }}
    />
  );
}
