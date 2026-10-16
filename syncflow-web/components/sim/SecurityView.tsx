import { SAMPLE_EVENTS } from '@/lib/arch/event';
import { Reserve } from './Reserve';
import type { SecurityActions, SecurityLabels, SecurityState } from './types';
import { fillText, previewPayload, SECURITY_TAGS } from './types';

/**
 * The enterprise security flow as markup: five steps from the client to a business system, a readout of what each step produced, and the
 * controls. A pure function of its state (the server draws it idle, the browser chunk live). The readout shows REAL values computed with
 * Web Crypto when the visitor sends a message (components/sim/SecurityFlowSim.tsx): a keyed hash, a verification, an encryption.
 *
 * The layout never changes between the idle and the live version, nor between the live states (docs/adr/0021 §4): every line that changes
 * keeps the room of its longest possible content (the sample strings below have the exact shape and length of the real ones), and the
 * controls row is drawn from the first paint, inert and invisible until the browser chunk arrives.
 */

/** The shape and length of a real payload, signature and cipher (components/sim/SecurityFlowSim.tsx), for the room they take. */
const SAMPLE = {
  payload: previewPayload(JSON.stringify(SAMPLE_EVENTS['lead.created'])),
  signature: 'sha256=0123456789abcdef…01234567',
  cipher: '0123456789ab… 0123456789abcdef0123456789ab…',
} as const;

export function SecurityView({ labels, state, actions }: { labels: SecurityLabels; state: SecurityState; actions?: SecurityActions }) {
  const names = [labels.client, labels.sign, labels.verify, labels.encrypt, labels.deliver];
  const texts = [labels.clientText, labels.signText, labels.verifyText, labels.encryptText, labels.deliverText];
  const longestName = names.reduce((a, b) => (b.length > a.length ? b : a));
  const statuses = [
    labels.statusIdle,
    fillText(labels.statusStep, { step: 5, name: longestName }),
    labels.outDelivered,
    labels.outRejected,
    labels.outDuplicate,
    labels.outUnavailable,
  ];
  const checks = [`✓ ${labels.checkValid} · ✓ ${labels.checkFresh} · ✓ ${labels.checkNew}`, `✓ ${labels.checkValid} · ✓ ${labels.checkFresh} · ✕ ${labels.checkSeen}`, `✕ ${labels.checkMismatch}`];

  const nodeState = (index: number): 'idle' | 'active' | 'done' | 'stopped' | 'skipped' => {
    if (state.stoppedAt !== null) {
      if (index < state.stoppedAt) return 'done';
      if (index === state.stoppedAt) return 'stopped';
      return 'skipped';
    }
    if (state.stage < 0) return 'idle';
    if (state.running && index === state.stage) return 'active';
    return index <= state.stage ? 'done' : 'idle';
  };

  const shown = state.stage >= 0 ? Math.min(state.stage, 4) : 0;

  return (
    <div className="sim-body">
      <p className="label">{labels.interactive}</p>
      <h4 className="sim-title">{labels.title}</h4>
      <p className="body-muted mt-2 max-w-xl text-sm">{labels.lead}</p>

      <ol className="s-flow" aria-hidden="true">
        {names.map((name, index) => (
          <li key={name} className="s-node" data-state={nodeState(index)}>
            <span className="s-dot">{index + 1}</span>
            <span className="s-name">{name}</span>
            <span className="s-tag metric-value" dir="ltr">
              {SECURITY_TAGS[index] || ' '}
            </span>
          </li>
        ))}
      </ol>

      <Reserve className="s-text body-muted" ghosts={[labels.statusIdle, ...texts]}>
        <p key={state.stage < 0 ? -1 : shown}>{state.stage < 0 ? labels.statusIdle : texts[shown]}</p>
      </Reserve>

      <dl className="s-readout">
        <div>
          <dt className="label">{labels.payload}</dt>
          <Reserve as="dd" className="metric-value" ghosts={[SAMPLE.payload]}>
            <span key={state.payload} dir="ltr">
              {state.payload}
            </span>
          </Reserve>
        </div>
        <div>
          <dt className="label">{labels.signature}</dt>
          <Reserve as="dd" className="metric-value" ghosts={[SAMPLE.signature]}>
            <span key={state.signature} dir="ltr">
              {state.signature}
            </span>
          </Reserve>
        </div>
        <div>
          <dt className="label">{labels.check}</dt>
          <Reserve as="dd" className="metric-value" ghosts={checks}>
            <span key={state.check}>{state.check}</span>
          </Reserve>
        </div>
        <div>
          <dt className="label">{labels.cipher}</dt>
          <Reserve as="dd" className="metric-value" ghosts={[SAMPLE.cipher]}>
            <span key={state.cipher} dir="ltr">
              {state.cipher}
            </span>
          </Reserve>
        </div>
      </dl>

      <Reserve live className="sim-status" ghosts={statuses}>
        <p key={state.status}>{state.status}</p>
      </Reserve>

      {/* Drawn from the first paint with the real controls' size and wrapping, inert and invisible until the live chunk arrives. */}
      <div className="sim-controls" data-idle={actions ? undefined : ''} inert={!actions}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={actions?.send} disabled={!actions || state.running}>
          {labels.send}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={actions?.replay} disabled={!actions || state.running || !actions.canReplay}>
          {labels.replay}
        </button>
        <label className="sim-switch">
          {/* The idle drawing comes from the server, which cannot pass a handler: it is a read-only copy until the live version replaces it. */}
          <input type="checkbox" role="switch" checked={state.tamper} readOnly={!actions} onChange={actions ? (event) => actions.setTamper(event.target.checked) : undefined} />
          <span className="sim-switch-track" aria-hidden="true" />
          <span>{labels.tamper}</span>
        </label>
      </div>

      <p className="sim-caption">{labels.caption}</p>
    </div>
  );
}
