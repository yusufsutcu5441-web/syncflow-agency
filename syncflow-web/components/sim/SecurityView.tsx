import type { SecurityActions, SecurityLabels, SecurityState } from './types';
import { SECURITY_TAGS } from './types';

/**
 * The enterprise security flow as markup: five steps from the client to a business system, a readout of what each step produced, and the
 * controls. A pure function of its state (the server draws it idle, the browser chunk live). The readout shows REAL values computed with
 * Web Crypto when the visitor sends a message (components/sim/SecurityFlowSim.tsx): a keyed hash, a verification, an encryption.
 */
export function SecurityView({ labels, state, actions }: { labels: SecurityLabels; state: SecurityState; actions?: SecurityActions }) {
  const names = [labels.client, labels.sign, labels.verify, labels.encrypt, labels.deliver];
  const texts = [labels.clientText, labels.signText, labels.verifyText, labels.encryptText, labels.deliverText];

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
              {SECURITY_TAGS[index] || ' '}
            </span>
          </li>
        ))}
      </ol>

      <p className="s-text body-muted">{state.stage < 0 ? labels.statusIdle : texts[shown]}</p>

      <dl className="s-readout">
        <div>
          <dt className="label">{labels.payload}</dt>
          <dd className="metric-value" dir="ltr">
            {state.payload}
          </dd>
        </div>
        <div>
          <dt className="label">{labels.signature}</dt>
          <dd className="metric-value" dir="ltr">
            {state.signature}
          </dd>
        </div>
        <div>
          <dt className="label">{labels.check}</dt>
          <dd className="metric-value">{state.check}</dd>
        </div>
        <div>
          <dt className="label">{labels.cipher}</dt>
          <dd className="metric-value" dir="ltr">
            {state.cipher}
          </dd>
        </div>
      </dl>

      <p className="sim-status" role="status" aria-live="polite">
        {state.status}
      </p>

      <div className="sim-controls">
        {actions ? (
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={actions.send} disabled={state.running}>
              {labels.send}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={actions.replay} disabled={state.running || !actions.canReplay}>
              {labels.replay}
            </button>
            <label className="sim-switch">
              <input type="checkbox" role="switch" checked={state.tamper} onChange={(event) => actions.setTamper(event.target.checked)} />
              <span className="sim-switch-track" aria-hidden="true" />
              <span>{labels.tamper}</span>
            </label>
          </>
        ) : null}
      </div>

      <p className="sim-caption">{labels.caption}</p>
    </div>
  );
}
