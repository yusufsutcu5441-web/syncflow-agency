/**
 * Drawing 01 (docs/adr/0028-briefing-drawing-and-copy.md): the path of a briefing, drawn the way the studio says it draws before it builds.
 * It is a drawing of THIS site's own form, not of a client system, and every box is code in this repository (app/api/briefing/route.ts,
 * lib/server/*). The two figures that could drift, the rate limit and the delivery budget, are checked against the code by faz2-denetim.mjs.
 *
 * Plain server SVG, no JavaScript, monochrome on the page tokens. The annotations are English on purpose, as on an engineering sheet (they are
 * technical names, like the HMAC-SHA256 and AES-256-GCM strings elsewhere); the title, the description for assistive technology and the legend are
 * translated and live in HTML around it. Two layouts, one per width: a row of seven boxes from 1024 px up, a column below.
 */

/** The rate limit of app/api/briefing/route.ts (STRICT_LIMIT) and the delivery budget of lib/server/deliver.ts (BUDGET_MS), as drawn. */
const RATE_LIMIT = '5 req / 10 min';
const DELIVERY_BUDGET = '2 attempts, < 9.5 s';

type Box = { id: string; title: string; first: string; second: string; note?: string };

const BOXES: readonly Box[] = [
  { id: '01', title: 'BROWSER', first: '4-step form', second: 'Turnstile token' },
  { id: '02', title: 'ORIGIN', first: 'same origin only', second: RATE_LIMIT },
  { id: '03', title: 'SCHEMA', first: 'zod validation', second: 'honeypot + timing' },
  { id: '04', title: 'BOT CHECK', first: 'Turnstile verify', second: 'server-side only' },
  { id: '05', title: 'SANITISE', first: 'plain text only', second: 'priority class' },
  { id: '06', title: 'DELIVER', first: 'webhook (HMAC) or', second: 'SMTP over TLS', note: DELIVERY_BUDGET },
  { id: '07', title: 'INBOX', first: 'studio mailbox', second: 'Reply-To: visitor' },
];

/** First and last box that belong to the single server route (ORIGIN to DELIVER). */
const ROUTE = [1, 5] as const;

function Defs({ id }: { id: string }) {
  return (
    <defs>
      <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" className="dwg-arrow" />
      </marker>
    </defs>
  );
}

function TitleBlock({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={62} className="dwg-line" />
      <line x1={x} x2={x + w} y1={y + 22} y2={y + 22} className="dwg-line" />
      <text x={x + 10} y={y + 15} className="dwg-b">
        SYNCFLOW.AGENCY · SHEET 01 / 01
      </text>
      <text x={x + 10} y={y + 40} className="dwg-s">
        BRIEFING PATH · NOT TO SCALE
      </text>
      <text x={x + 10} y={y + 54} className="dwg-f">
        SOURCE app/api/briefing/route.ts
      </text>
    </g>
  );
}

/** From 1024 px: seven boxes in a row, a dimension line over them, the refusal path under them. */
function Wide({ label }: { label: string }) {
  const W = 148;
  const GAP = 22;
  const X0 = 16;
  const Y = 74;
  const H = 90;
  const x = (i: number) => X0 + i * (W + GAP);
  const cx = (i: number) => x(i) + W / 2;
  const routeFrom = x(ROUTE[0]);
  const routeTo = x(ROUTE[1]) + W;
  const railY = 232;
  const refuse = { x: 360, y: 272, w: 480, h: 66 };
  return (
    <svg viewBox="0 0 1200 380" className="dwg hidden max-w-[1200px] lg:block" role="img" aria-label={label} preserveAspectRatio="xMidYMid meet">
      <Defs id="dwg-arrow-w" />
      <rect x={4} y={4} width={1192} height={372} className="dwg-line dwg-frame" />

      {/* dimension line over the boxes */}
      {[
        { from: x(0), to: x(0) + W, text: 'CLIENT' },
        { from: routeFrom, to: routeTo, text: 'ONE ROUTE · /api/briefing' },
        { from: x(6), to: x(6) + W, text: 'OUT' },
      ].map(({ from, to, text }) => (
        <g key={text}>
          <line x1={from} x2={to} y1={52} y2={52} className="dwg-line" />
          <line x1={from} x2={from} y1={45} y2={59} className="dwg-line" />
          <line x1={to} x2={to} y1={45} y2={59} className="dwg-line" />
          <text x={(from + to) / 2} y={40} textAnchor="middle" className="dwg-s">
            {text}
          </text>
        </g>
      ))}

      {/* the path */}
      {BOXES.map((box, i) => (
        <g key={box.id}>
          <rect x={x(i)} y={Y} width={W} height={H} className="dwg-box" />
          <text x={x(i) + 12} y={Y + 20} className="dwg-f">
            {box.id}
          </text>
          <text x={x(i) + 12} y={Y + 42} className="dwg-t">
            {box.title}
          </text>
          <text x={x(i) + 12} y={Y + 62} className="dwg-s">
            {box.first}
          </text>
          <text x={x(i) + 12} y={Y + 78} className="dwg-s">
            {box.second}
          </text>
          {i < BOXES.length - 1 ? <line x1={x(i) + W} x2={x(i + 1) - 2} y1={Y + H / 2} y2={Y + H / 2} className="dwg-line" markerEnd="url(#dwg-arrow-w)" /> : null}
        </g>
      ))}
      {/* the delivery notes sit under the refusal rail, clear of the dashed drop lines, in the column of the box they describe */}
      <text x={x(5)} y={railY + 22} className="dwg-s">
        {DELIVERY_BUDGET}
      </text>
      <text x={x(5)} y={railY + 39} className="dwg-s">
        one id = Idempotency-Key / Message-ID
      </text>

      {/* the refusal path: every step of the route can end here, and the visitor gets an email draft */}
      {[1, 2, 3, 4, 5].map((i) => (
        <line key={i} x1={cx(i)} x2={cx(i)} y1={Y + H} y2={railY} className="dwg-line dwg-dash" />
      ))}
      <line x1={cx(1)} x2={cx(5)} y1={railY} y2={railY} className="dwg-line dwg-dash" />
      <line x1={600} x2={600} y1={railY} y2={refuse.y} className="dwg-line dwg-dash" markerEnd="url(#dwg-arrow-w)" />
      <rect x={refuse.x} y={refuse.y} width={refuse.w} height={refuse.h} className="dwg-box dwg-dash" />
      <text x={refuse.x + 14} y={refuse.y + 26} className="dwg-t">
        FAILS CLOSED
      </text>
      <text x={refuse.x + 14} y={refuse.y + 48} className="dwg-s">
        403 · 429 · 503, then an email draft for the visitor
      </text>
      <path d={`M${refuse.x} ${refuse.y + refuse.h / 2} H${cx(0)} V${Y + H + 2}`} className="dwg-line dwg-dash" fill="none" markerEnd="url(#dwg-arrow-w)" />

      <TitleBlock x={880} y={290} w={300} />
    </svg>
  );
}

/** Below 1024 px: the same seven boxes in a column, the dimension line on the left, the refusal rail on the right. */
function Narrow({ label }: { label: string }) {
  const X = 76;
  const W = 262;
  const GAP = 30;
  const heights = BOXES.map((box) => (box.note ? 82 : 66));
  const tops: number[] = [];
  let y = 22;
  for (const h of heights) {
    tops.push(y);
    y += h + GAP;
  }
  const end = y - GAP;
  const mid = (i: number) => tops[i]! + heights[i]! / 2;
  const routeTop = tops[ROUTE[0]]!;
  const routeBottom = tops[ROUTE[1]]! + heights[ROUTE[1]]!;
  const railX = 358;
  const refuseTop = end + 34;
  /** The title block sits 86 below the refusal box and is 62 high; the sheet leaves 14 under it. */
  const total = refuseTop + 86 + 62 + 14;
  const rails = [
    { from: tops[0]!, to: tops[0]! + heights[0]!, text: 'CLIENT' },
    { from: routeTop, to: routeBottom, text: 'ONE ROUTE · /api/briefing' },
    { from: tops[6]!, to: tops[6]! + heights[6]!, text: 'OUT' },
  ];
  return (
    <svg viewBox={`0 0 372 ${total}`} className="dwg max-w-[440px] lg:hidden" role="img" aria-label={label} preserveAspectRatio="xMidYMid meet">
      <Defs id="dwg-arrow-v" />
      <rect x={3} y={3} width={366} height={total - 6} className="dwg-line dwg-frame" />

      {rails.map(({ from, to, text }) => (
        <g key={text}>
          <line x1={52} x2={52} y1={from} y2={to} className="dwg-line" />
          <line x1={46} x2={58} y1={from} y2={from} className="dwg-line" />
          <line x1={46} x2={58} y1={to} y2={to} className="dwg-line" />
          <text transform={`translate(38 ${(from + to) / 2}) rotate(-90)`} textAnchor="middle" className="dwg-s">
            {text}
          </text>
        </g>
      ))}

      {BOXES.map((box, i) => (
        <g key={box.id}>
          <rect x={X} y={tops[i]} width={W} height={heights[i]} className="dwg-box" />
          <text x={X + 12} y={tops[i]! + 20} className="dwg-f">
            {box.id}
          </text>
          <text x={X + 38} y={tops[i]! + 20} className="dwg-t">
            {box.title}
          </text>
          <text x={X + 12} y={tops[i]! + 40} className="dwg-s">
            {box.first}
          </text>
          <text x={X + 12} y={tops[i]! + 56} className="dwg-s">
            {box.second}
          </text>
          {box.note ? (
            <text x={X + 12} y={tops[i]! + 72} className="dwg-s">
              {box.note}
            </text>
          ) : null}
          {i < BOXES.length - 1 ? (
            <line x1={X + W / 2} x2={X + W / 2} y1={tops[i]! + heights[i]!} y2={tops[i + 1]! - 2} className="dwg-line" markerEnd="url(#dwg-arrow-v)" />
          ) : null}
        </g>
      ))}

      {/* the refusal rail: from every step of the route to the box at the foot */}
      {[1, 2, 3, 4, 5].map((i) => (
        <line key={i} x1={X + W} x2={railX} y1={mid(i)} y2={mid(i)} className="dwg-line dwg-dash" />
      ))}
      <line x1={railX} x2={railX} y1={mid(1)} y2={refuseTop + 33} className="dwg-line dwg-dash" />
      <line x1={railX} x2={X + W + 2} y1={refuseTop + 33} y2={refuseTop + 33} className="dwg-line dwg-dash" markerEnd="url(#dwg-arrow-v)" />
      <rect x={X} y={refuseTop} width={W} height={66} className="dwg-box dwg-dash" />
      <text x={X + 12} y={refuseTop + 25} className="dwg-t">
        FAILS CLOSED
      </text>
      <text x={X + 12} y={refuseTop + 44} className="dwg-s">
        403 · 429 · 503, then an
      </text>
      <text x={X + 12} y={refuseTop + 59} className="dwg-s">
        email draft for the visitor
      </text>

      <TitleBlock x={X} y={refuseTop + 86} w={W} />
    </svg>
  );
}

export function BriefingDrawing({ label }: { label: string }) {
  return (
    <>
      <Wide label={label} />
      <Narrow label={label} />
    </>
  );
}
