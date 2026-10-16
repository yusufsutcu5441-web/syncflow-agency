/**
 * Shared types of the two Architecture simulators (docs/adr/0020-case-study-layer.md §3): the fail-safe queue simulator and the
 * enterprise security flow. Both are MODELS of a pattern, labelled as such on the card: they are not measurements and they describe no
 * real system. The server renders each one in its idle state (components/sim/*View.tsx, plain markup, no JavaScript needed to read it);
 * the live version is a separate chunk that replaces it when the card comes near the screen, with exactly the same layout.
 */

import type { TargetSystem } from '@/lib/arch/mappers';

export type QueueLabels = {
  interactive: string;
  title: string;
  lead: string;
  send: string;
  block: string;
  restore: string;
  reset: string;
  producer: string;
  primary: string;
  standby: string;
  consumer: string;
  accepted: string;
  delivered: string;
  waiting: string;
  lost: string;
  duplicates: string;
  statusIdle: string;
  statusFlowing: string;
  statusBlocked: string;
  statusDraining: string;
  statusDone: string;
  caption: string;
};

export type QueueParcel = {
  id: number;
  /** Position along the stage, 0 to 100 (percent of its width). */
  x: number;
  /** 0 = the primary lane, 1 = the standby lane. */
  row: 0 | 1;
  phase: 'spawn' | 'hop1' | 'hop2' | 'standby' | 'drain' | 'arrived';
};

export type QueueState = {
  blocked: boolean;
  parcels: QueueParcel[];
  accepted: number;
  delivered: number;
  waiting: number;
  lost: number;
  duplicates: number;
  /** Already resolved into a sentence (placeholders filled). */
  status: string;
};

export type QueueActions = { send: () => void; toggle: () => void; reset: () => void; canSend: boolean };

export type SecurityLabels = {
  interactive: string;
  title: string;
  lead: string;
  send: string;
  tamper: string;
  replay: string;
  client: string;
  sign: string;
  verify: string;
  encrypt: string;
  deliver: string;
  clientText: string;
  signText: string;
  verifyText: string;
  encryptText: string;
  deliverText: string;
  payload: string;
  signature: string;
  check: string;
  cipher: string;
  checkValid: string;
  checkMismatch: string;
  checkFresh: string;
  checkNew: string;
  checkSeen: string;
  statusIdle: string;
  statusStep: string;
  outDelivered: string;
  outRejected: string;
  outDuplicate: string;
  outUnavailable: string;
  caption: string;
};

/** The integration model (docs/adr/0021 §5): one canonical event mapped into the shape each of four systems receives. */
export type IntegrationLabels = {
  interactive: string;
  title: string;
  lead: string;
  tabsLabel: string;
  canonical: string;
  payloadLabel: string;
  kind: Record<TargetSystem, string>;
  event: { lead: string; order: string; invoice: string };
  /** Keeps its {count}, {object} and {field} placeholders. */
  status: string;
  caption: string;
};

export type SecurityOutcome = 'delivered' | 'rejected' | 'duplicate' | 'unavailable' | null;

export type SecurityState = {
  /** -1 before a message is sent, otherwise the step (0 to 4) the message is at. */
  stage: number;
  running: boolean;
  outcome: SecurityOutcome;
  /** The step at which a message was stopped (rejected or recognised as a duplicate), if it was. */
  stoppedAt: number | null;
  payload: string;
  signature: string;
  check: string;
  cipher: string;
  /** Already resolved into a sentence. */
  status: string;
  tamper: boolean;
};

export type SecurityActions = { send: () => void; replay: () => void; setTamper: (value: boolean) => void; canReplay: boolean };

export const IDLE_QUEUE: Omit<QueueState, 'status'> = { blocked: false, parcels: [], accepted: 0, delivered: 0, waiting: 0, lost: 0, duplicates: 0 };

export const IDLE_SECURITY: Omit<SecurityState, 'status'> = {
  stage: -1,
  running: false,
  outcome: null,
  stoppedAt: null,
  payload: '—',
  signature: '—',
  check: '—',
  cipher: '—',
  tamper: false,
};

/** The payload row shows the start of the signed bytes, not all of them (a canonical event is about 400 characters): the live model and the idle drawing's reservation cut it the same way. */
export const PAYLOAD_PREVIEW = 96;
export const previewPayload = (body: string): string => (body.length > PAYLOAD_PREVIEW ? `${body.slice(0, PAYLOAD_PREVIEW)}…` : body);

/** The two technical identifiers that are language-neutral, drawn from code and not from the messages (like a currency code). */
export const SECURITY_TAGS = ['', 'HMAC-SHA256', 'Zero-trust', 'AES-256-GCM', 'Salesforce · SAP · Oracle'] as const;

/** "Step {step} of 5: {name}." and the like: plain {name} placeholders, filled in the browser with this helper or on the server with the same. */
export function fillText(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}
