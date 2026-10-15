import type { CSSProperties } from 'react';
import type { QueueActions, QueueLabels, QueueState } from './types';

/**
 * The fail-safe queue simulator as markup: a producer, a primary channel, a standby queue and a business system. A pure function of its
 * state, so the server draws it idle (no JavaScript, same layout) and the browser chunk draws it live. The stage is decorative
 * (aria-hidden): the controls are real buttons and the sentence under it is a live region that says what the picture shows.
 */
export function QueueView({ labels, state, actions }: { labels: QueueLabels; state: QueueState; actions?: QueueActions }) {
  const stats: Array<[string, number]> = [
    [labels.accepted, state.accepted],
    [labels.delivered, state.delivered],
    [labels.waiting, state.waiting],
    [labels.lost, state.lost],
    [labels.duplicates, state.duplicates],
  ];

  return (
    <div className="sim-body">
      <p className="label">{labels.interactive}</p>
      <h4 className="sim-title">{labels.title}</h4>
      <p className="body-muted mt-2 max-w-xl text-sm">{labels.lead}</p>

      <div className="q-stage" aria-hidden="true" data-blocked={state.blocked ? '' : undefined}>
        <span className="q-lane q-lane-primary" />
        <span className="q-lane q-lane-standby" />
        <span className="q-node q-producer">
          <i />
          <b className="label">{labels.producer}</b>
        </span>
        <span className="q-node q-channel">
          <i />
          <b className="label">{labels.primary}</b>
        </span>
        <span className="q-node q-queue">
          <i />
          <b className="label">{labels.standby}</b>
        </span>
        <span className="q-node q-consumer">
          <i />
          <b className="label">{labels.consumer}</b>
        </span>
        {state.parcels.map((parcel) => (
          <span key={parcel.id} className="q-parcel" data-phase={parcel.phase} style={{ '--x': parcel.x, '--row': parcel.row } as CSSProperties} />
        ))}
      </div>

      <dl className="q-stats">
        {stats.map(([label, value]) => (
          <div key={label}>
            <dt className="label">{label}</dt>
            <dd className="metric-value">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="sim-status" role="status" aria-live="polite">
        {state.status}
      </p>

      {/* The row is laid out from the first paint (its height is reserved), so the buttons arriving with the live chunk move nothing. */}
      <div className="sim-controls">
        {actions ? (
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={actions.send} disabled={!actions.canSend}>
              {labels.send}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={actions.toggle} aria-pressed={state.blocked}>
              {state.blocked ? labels.restore : labels.block}
            </button>
            <button type="button" className="sim-link" onClick={actions.reset}>
              {labels.reset}
            </button>
          </>
        ) : null}
      </div>

      <p className="sim-caption">{labels.caption}</p>
    </div>
  );
}
