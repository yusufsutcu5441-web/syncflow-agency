import type { CSSProperties } from 'react';
import { mapEvent, sampleFor, TARGET_SYSTEMS, TARGETS, type TargetSystem } from '@/lib/arch/mappers';
import { Reserve } from './Reserve';
import { fillText, type IntegrationLabels } from './types';

/**
 * The integration model as markup (docs/adr/0021 §5, docs/architecture/integrations.md): the canonical event on the left, the shape one
 * system receives on the right, a line for every mapped field, and the payload as it would be sent. Everything shown is computed by the
 * reference mappers (lib/arch/mappers.ts), the same tables the documentation prints and the contract tests check. A pure function of the
 * chosen system, so the server draws it for Salesforce and the browser chunk makes the four tabs work, with exactly the same layout.
 *
 * Illustrative shapes only; the caption on the card says so. The stage is decorative (aria-hidden): the payload and the sentence under it carry
 * the same facts as text.
 */

/** Product names are not translated. */
export const SYSTEM_NAMES: Record<TargetSystem, string> = { salesforce: 'Salesforce', hubspot: 'HubSpot', sap: 'SAP', oracle: 'Oracle' };

const EVENT_KEY = { 'lead.created': 'lead', 'order.created': 'order', 'invoice.issued': 'invoice' } as const;
const EVENT_TYPES = Object.keys(EVENT_KEY) as Array<keyof typeof EVENT_KEY>;

/** Every system's stage has the same number of rows, so the card keeps its height whichever system is chosen. */
const ROWS = Math.max(...TARGET_SYSTEMS.map((system) => TARGETS[system].mappings.length));

const shortSource = (path: string) => path.replace(/^payload\./, '');
const shortTarget = (path: string) => path.replace(/^(fields|properties)\./, '');

interface Plan {
  left: string[];
  right: Array<{ label: string; constant: boolean; lines: number[] }>;
  lines: Array<{ index: number; from: number; to: number }>;
  json: string;
  count: number;
}

const PLANS = Object.fromEntries(
  TARGET_SYSTEMS.map((system): [TargetSystem, Plan] => {
    const target = TARGETS[system];
    const mapped = mapEvent(system, sampleFor(system));
    const left = [...new Set(target.mappings.flatMap((m) => (m.from === null ? [] : [m.from])))];
    const lines = target.mappings.flatMap((m, index) => (m.from === null ? [] : [{ index, from: left.indexOf(m.from), to: index }]));
    const right = target.mappings.map((m, index) => ({ label: shortTarget(m.to), constant: m.from === null, lines: lines.filter((line) => line.to === index).map((line) => line.index) }));
    return [system, { left, right, lines, json: JSON.stringify(mapped.payload, null, 2), count: mapped.applied.length }];
  }),
) as Record<TargetSystem, Plan>;

export function IntegrationView({ labels, system, onSelect }: { labels: IntegrationLabels; system: TargetSystem; onSelect?: (system: TargetSystem) => void }) {
  const target = TARGETS[system];
  const plan = PLANS[system];
  const eventKey = EVENT_KEY[target.eventType];
  // The field name is code: it is isolated (U+2066 ... U+2069) so that a right-to-left sentence does not reorder its dots and underscores.
  const status = (s: TargetSystem) => fillText(labels.status, { count: PLANS[s].count, object: labels.kind[s], field: `\u2066${TARGETS[s].idempotencyPath}\u2069` });

  return (
    <div className="sim-body">
      <p className="label">{labels.interactive}</p>
      <h4 className="sim-title">{labels.title}</h4>
      <p className="body-muted mt-2 max-w-xl text-sm">{labels.lead}</p>

      {/* Drawn from the first paint, inert and invisible until the live chunk arrives (the same buttons, so nothing moves when they do). */}
      <div className="map-tabs" role="group" aria-label={labels.tabsLabel} data-idle={onSelect ? undefined : ''} inert={!onSelect}>
        {TARGET_SYSTEMS.map((s) => (
          <button key={s} type="button" className="btn btn-ghost btn-sm" aria-pressed={s === system} onClick={onSelect ? () => onSelect(s) : undefined}>
            {SYSTEM_NAMES[s]}
          </button>
        ))}
      </div>

      <div className="map-head" aria-hidden="true">
        <div>
          <span className="label">{labels.canonical}</span>
          <Reserve as="span" className="map-sub metric-value" ghosts={EVENT_TYPES.filter((type) => type !== target.eventType)}>
            <span key={target.eventType}>
              <bdi dir="ltr">{target.eventType}</bdi>
            </span>
          </Reserve>
          <Reserve as="span" className="map-sub" ghosts={EVENT_TYPES.filter((type) => type !== target.eventType).map((type) => labels.event[EVENT_KEY[type]])}>
            <span key={eventKey}>{labels.event[eventKey]}</span>
          </Reserve>
        </div>
        <span />
        <div>
          <span className="label">{SYSTEM_NAMES[system]}</span>
          <Reserve as="span" className="map-sub" ghosts={TARGET_SYSTEMS.filter((s) => s !== system).map((s) => labels.kind[s])}>
            <span key={system}>{labels.kind[system]}</span>
          </Reserve>
        </div>
      </div>

      <div className="map-stage" aria-hidden="true" style={{ '--map-rows': ROWS } as CSSProperties}>
        <ul className="map-col">
          {plan.left.map((path) => (
            <li key={path} className="map-chip metric-value" dir="ltr" data-i={target.mappings.flatMap((m, i) => (m.from === path ? [i] : [])).join(' ')}>
              {shortSource(path)}
            </li>
          ))}
        </ul>
        <div className="map-mid">
          <svg className="map-lines" viewBox={`0 0 100 ${ROWS * 100}`} preserveAspectRatio="none" fill="none" key={system}>
            {plan.lines.map((line) => (
              <path key={line.index} className="map-line" data-i={line.index} d={`M0 ${line.from * 100 + 50} C50 ${line.from * 100 + 50} 50 ${line.to * 100 + 50} 100 ${line.to * 100 + 50}`} />
            ))}
          </svg>
        </div>
        <ul className="map-col">
          {plan.right.map((chip, index) => (
            <li key={chip.label} className="map-chip metric-value" dir="ltr" data-i={chip.lines.length ? chip.lines.join(' ') : String(index)} data-constant={chip.constant ? '' : undefined}>
              {chip.label}
            </li>
          ))}
        </ul>
      </div>

      <p className="label mt-5">{labels.payloadLabel}</p>
      <Reserve className="map-code" ghosts={TARGET_SYSTEMS.filter((s) => s !== system).map((s) => PLANS[s].json)}>
        {/* On a narrow screen the sample scrolls sideways: a keyboard user must be able to reach and scroll it (axe: scrollable-region-focusable). */}
        <pre key={system} className="metric-value" dir="ltr" tabIndex={0} role="region" aria-label={labels.payloadLabel}>
          {plan.json}
        </pre>
      </Reserve>

      <Reserve live className="sim-status" ghosts={TARGET_SYSTEMS.map(status)}>
        <p key={system}>{status(system)}</p>
      </Reserve>

      <p className="sim-caption">{labels.caption}</p>
    </div>
  );
}
