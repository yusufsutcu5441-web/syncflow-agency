'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { generateSealKey, importHmacKey, open, seal, signEvent, verifyEnvelope } from '@/lib/arch/envelope';
import { newEvent, SAMPLE_EVENTS, SAMPLE_SOURCE } from '@/lib/arch/event';
import { IdempotentReceiver } from '@/lib/arch/queue';
import type { CanonicalEvent, SignedEnvelope } from '@/lib/arch/types';
import { SecurityView } from './SecurityView';
import { fillText, IDLE_SECURITY, previewPayload, type SecurityLabels, type SecurityState } from './types';

/**
 * The live enterprise security flow (docs/adr/0020-case-study-layer.md §3, docs/adr/0021 §5). The numbers on screen are REAL: when a message is
 * sent, the browser's own Web Crypto computes them, with throwaway keys that never leave the page. Since ADR 0021 every step is a call to the
 * reference modules that the contract tests verify (`npm run arch:verify`, docs/architecture/security-envelope.md), not a copy of them:
 *   1. client   builds a canonical event (lib/arch/event.ts) whose id is its idempotency key;
 *   2. sign     HMAC-SHA256 over the exact bytes (signEvent), in the same `sha256=<hex>` shape this site uses to sign its own briefings
 *               (lib/server/deliver.ts);
 *   3. verify   the receiver recomputes the signature over what it RECEIVED (one character altered when the switch is on), compares it in
 *               constant time, then checks the timestamp is fresh (5 minutes) and the shape valid (verifyEnvelope), and that the key has not been
 *               seen (IdempotentReceiver): a replay is acknowledged, not repeated;
 *   4. encrypt  AES-256-GCM with a fresh key and a random 96-bit IV (seal), so the ciphertext carries its own tamper check;
 *   5. deliver  the destination opens it (open) and compares the plaintext with what was sent.
 * It demonstrates a pattern. It describes, measures and certifies no production system, and the card says so.
 */
const DEMO_KEY = 'syncflow-demo-key-not-a-secret';
const STEP_MS = 520;
const STAGES = ['client', 'sign', 'verify', 'encrypt', 'deliver'] as const;

const short = (value: string) => (value.length > 26 ? `${value.slice(0, 16)}…${value.slice(-8)}` : value);
const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/** Changes one hexadecimal character inside the event's id, as a hand in the middle of the road would. */
function alter(body: string, id: string): string {
  const at = body.indexOf(id);
  const next = ((Number.parseInt(body[at] ?? '0', 16) + 1) % 16).toString(16);
  return `${body.slice(0, at)}${next}${body.slice(at + 1)}`;
}

type Message = { event: CanonicalEvent; envelope: SignedEnvelope };

export default function SecurityFlowSim({ labels }: { labels: SecurityLabels }) {
  const [state, setState] = useState<Omit<SecurityState, 'status'> & { status: string }>({ ...IDLE_SECURITY, status: labels.statusIdle });
  const [hasMessage, setHasMessage] = useState(false);
  const run = useRef(0);
  const last = useRef<Message | null>(null);
  const receiver = useRef(new IdempotentReceiver());
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

        // 1. the client builds the event (a replay sends the same bytes again)
        const key = await importHmacKey(DEMO_KEY);
        const event = replay && last.current ? last.current.event : newEvent('lead.created', SAMPLE_EVENTS['lead.created'].payload, SAMPLE_SOURCE);
        patch({ payload: previewPayload(JSON.stringify(event)) });
        await wait(delay);
        if (stale()) return;

        // 2. HMAC-SHA256 over the exact bytes
        patch({ stage: 1, status: step(2) });
        const envelope = replay && last.current ? last.current.envelope : await signEvent(event, key);
        last.current = { event, envelope };
        setHasMessage(true);
        patch({ signature: `sha256=${short(envelope.signature.slice('sha256='.length))}` });
        await wait(delay);
        if (stale()) return;

        // 3. the receiver trusts nothing and checks what it received
        patch({ stage: 2, status: step(3) });
        const received: SignedEnvelope = tamper.current ? { ...envelope, body: alter(envelope.body, event.id) } : envelope;
        const verdict = await verifyEnvelope(received, key);
        if (!verdict.ok) {
          const mismatch = verdict.reason === 'bad-signature';
          patch({ check: `✕ ${mismatch ? labels.checkMismatch : labels.checkFresh}`, running: false, outcome: 'rejected', stoppedAt: 2, status: labels.outRejected });
          return;
        }
        const known = receiver.current.receive(verdict.event, Date.now()) === 'duplicate';
        const check = [`✓ ${labels.checkValid}`, `✓ ${labels.checkFresh}`, known ? `✕ ${labels.checkSeen}` : `✓ ${labels.checkNew}`].join(' · ');
        if (known) {
          patch({ check, running: false, outcome: 'duplicate', stoppedAt: 2, status: labels.outDuplicate });
          return;
        }
        patch({ check });
        await wait(delay);
        if (stale()) return;

        // 4. AES-256-GCM with a fresh key and a random IV
        patch({ stage: 3, status: step(4) });
        const sealKey = await generateSealKey();
        const sealed = await seal(sealKey, received.body);
        patch({ cipher: `${sealed.iv.slice(0, 12)}… ${sealed.data.slice(0, 28)}…` });
        await wait(delay);
        if (stale()) return;

        // 5. delivery: the destination opens it and compares
        patch({ stage: 4, status: step(5) });
        const plain = await open(sealKey, sealed);
        await wait(delay);
        if (stale()) return;
        patch({ running: false, outcome: plain === received.body ? 'delivered' : 'rejected', status: plain === received.body ? labels.outDelivered : labels.outRejected });
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
