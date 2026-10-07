import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Easing, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { SCENE_FRAMES, SIZES, type CompositionProps, type Layout, type SceneLabels } from './config';

/**
 * The SyncFlow architecture film: three 5-second scenes (architecture, speed budget, 14-day plan).
 *
 * Everything is a pure function of the current frame (no timers, no Math.random, no Date), which is what makes it
 * identical in Remotion Studio and in `remotion render`. Text comes in through props, so every locale gets its
 * own words from the same composition. Only transform/opacity-style properties and SVG attributes animate.
 *
 * Render source only (see docs/adr/0003-showcase-film-static-render.md): the website plays the rendered files.
 * The look is the earlier one (glow, gradients, 22 px panels, semi-bold, uppercase labels) and is redesigned together
 * with the showcase in Faz 5; until then it is kept as is on purpose.
 */

const C = {
  bg: '#0d0d0e',
  snow: '#f4f4f5',
  muted: '#a1a1aa',
  subtle: '#8a8a93',
  glow: '#e2e8f0',
  line: 'rgba(255,255,255,0.14)',
  hair: 'rgba(255,255,255,0.08)',
} as const;

// Same family the site loads (app/globals.css). remotion/fonts.ts loads the site's Inter files into the Remotion browser;
// the system fonts after it are only the fallback.
const SANS = "'Inter', 'Inter Fallback', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const MONO = "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace";

type Metrics = { title: number; sub: number; mono: number; pad: number; big: number; value: number; code: number };
const METRICS: Record<Layout, Metrics> = {
  wide: { title: 26, sub: 16, mono: 13, pad: 64, big: 240, value: 30, code: 12 },
  tall: { title: 34, sub: 22, mono: 18, pad: 48, big: 250, value: 40, code: 22 },
};

type Pt = readonly [number, number];
type Box = { x: number; y: number; w: number; h: number };

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);
/** Eased 0→1 ramp between two frames. */
const ramp = (frame: number, from: number, to: number) => interpolate(frame, [from, to], [0, 1], { ...clamp, easing: ease });

function cubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
}

/* ── Building blocks ─────────────────────────────────────────────────────────────────────────── */

function SceneFrame({ children }: { children: ReactNode }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12, SCENE_FRAMES - 12, SCENE_FRAMES], [0, 1, 1, 0], clamp);
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
}

function Backdrop() {
  return (
    <AbsoluteFill
      style={{
        background: [
          'radial-gradient(70% 55% at 50% -5%, rgba(226,232,240,0.10), transparent 70%)',
          'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.07) 1px, transparent 1.4px) 0 0 / 36px 36px',
          C.bg,
        ].join(', '),
      }}
    />
  );
}

function Header({ label, m, index }: { label: string; m: Metrics; index: number }) {
  const frame = useCurrentFrame();
  const p = ramp(frame, 2, 24);
  return (
    <div style={{ position: 'absolute', left: m.pad, top: m.pad * 0.8, display: 'flex', alignItems: 'center', gap: 16, opacity: p }}>
      <span style={{ fontFamily: MONO, fontSize: m.mono, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.muted }}>
        {String(index).padStart(2, '0')} · {label}
      </span>
      <span style={{ width: 120 * p, height: 1, background: `linear-gradient(90deg, ${C.glow}, transparent)` }} />
    </div>
  );
}

function Caption({ text, m, y }: { text: string; m: Metrics; y: number }) {
  const frame = useCurrentFrame();
  const p = ramp(frame, 90, 112);
  return (
    <div style={{ position: 'absolute', left: m.pad, top: y, opacity: p, transform: `translateY(${(1 - p) * 10}px)`, fontSize: m.sub + 2, color: C.muted, letterSpacing: '-0.01em' }}>
      {text}
    </div>
  );
}

function Panel({ box, delay, children, style }: { box: Box; delay: number; children: ReactNode; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 200 }, durationInFrames: 28 });
  return (
    <div
      style={{
        position: 'absolute',
        left: box.x,
        top: box.y,
        width: box.w,
        height: box.h,
        opacity: p,
        transform: `translateY(${(1 - p) * 18}px) scale(${0.97 + 0.03 * p})`,
        borderRadius: 22,
        border: `1px solid ${C.line}`,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 30px 60px -30px rgba(0,0,0,0.9)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 26px',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** compact: slightly smaller type for the narrow output nodes of the portrait canvas, so long translations still fit. */
function NodeText({ tag, title, sub, m, compact = false }: { tag: string; title: string; sub: string; m: Metrics; compact?: boolean }) {
  return (
    <>
      <span style={{ fontFamily: MONO, fontSize: m.mono, color: C.subtle, letterSpacing: '0.14em' }}>{tag}</span>
      <span style={{ fontSize: compact ? m.title - 6 : m.title, fontWeight: 600, letterSpacing: '-0.03em', color: C.snow, lineHeight: 1.15, marginTop: 6 }}>{title}</span>
      <span style={{ fontSize: compact ? m.sub - 3 : m.sub, color: C.muted, marginTop: 4, letterSpacing: '-0.01em', lineHeight: 1.25 }}>{sub}</span>
    </>
  );
}

/** A curved connection that draws itself, then carries a light packet along it in a loop. */
function Connection({ from, to, mode, start, shift = 0 }: { from: Pt; to: Pt; mode: 'h' | 'v'; start: number; shift?: number }) {
  const frame = useCurrentFrame();
  const c1: Pt = mode === 'h' ? [(from[0] + to[0]) / 2, from[1]] : [from[0], (from[1] + to[1]) / 2];
  const c2: Pt = mode === 'h' ? [(from[0] + to[0]) / 2, to[1]] : [to[0], (from[1] + to[1]) / 2];
  const draw = ramp(frame, start, start + 26);

  const PERIOD = 54;
  const running = frame >= start + 30;
  const t = running ? (((frame - start - 30 + shift) % PERIOD) + PERIOD) % PERIOD / PERIOD : 0;
  const [px, py] = cubic(from, c1, c2, to, t);
  const fade = Math.sin(Math.PI * t);

  return (
    <g>
      <path
        d={`M ${from[0]} ${from[1]} C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${to[0]} ${to[1]}`}
        pathLength={1}
        fill="none"
        stroke="rgba(226,232,240,0.30)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={1}
        strokeDashoffset={1 - draw}
      />
      {running ? (
        <>
          <circle cx={px} cy={py} r={11} fill="rgba(226,232,240,0.14)" opacity={fade} />
          <circle cx={px} cy={py} r={4.5} fill={C.snow} opacity={fade} />
        </>
      ) : null}
    </g>
  );
}

/* ── Scene 1 · Architecture ──────────────────────────────────────────────────────────────────── */

const CODE_LINES = ['// page.tsx', 'export default function Page() {', '  const t = useTranslations();', "  return <Hero cta={t('cta')} />;", '}'];
const CODE_TOTAL = CODE_LINES.reduce((sum, line) => sum + line.length + 1, 0);
/** Characters typed before each line starts (each line counts its newline). */
const CODE_OFFSETS = CODE_LINES.map((_, i) => CODE_LINES.slice(0, i).reduce((sum, line) => sum + line.length + 1, 0));

type ArchGeometry = {
  visitor: Box;
  edge: Box;
  next: Box;
  remotion: Box;
  checkout: Box;
  locales: Box;
  links: ReadonlyArray<{ from: Pt; to: Pt; mode: 'h' | 'v' }>;
  captionY: number;
};

const ARCH: Record<Layout, ArchGeometry> = {
  wide: {
    // Small nodes are 112 high so a title that wraps to two lines (e.g. "Edge-Netzwerk") still fits.
    visitor: { x: 56, y: 292, w: 224, h: 112 },
    edge: { x: 330, y: 292, w: 232, h: 112 },
    next: { x: 606, y: 228, w: 310, h: 240 },
    remotion: { x: 996, y: 104, w: 228, h: 112 },
    checkout: { x: 996, y: 292, w: 228, h: 112 },
    locales: { x: 996, y: 480, w: 228, h: 112 },
    links: [
      { from: [280, 348], to: [330, 348], mode: 'h' },
      { from: [562, 348], to: [606, 348], mode: 'h' },
      { from: [916, 348], to: [996, 160], mode: 'h' },
      { from: [916, 348], to: [996, 348], mode: 'h' },
      { from: [916, 348], to: [996, 536], mode: 'h' },
    ],
    captionY: 640,
  },
  tall: {
    visitor: { x: 48, y: 116, w: 322, h: 124 },
    edge: { x: 430, y: 116, w: 322, h: 124 },
    next: { x: 48, y: 288, w: 704, h: 372 },
    remotion: { x: 48, y: 712, w: 224, h: 156 },
    checkout: { x: 288, y: 712, w: 224, h: 156 },
    locales: { x: 528, y: 712, w: 224, h: 156 },
    links: [
      { from: [370, 178], to: [430, 178], mode: 'h' },
      { from: [591, 240], to: [591, 288], mode: 'v' },
      { from: [160, 660], to: [160, 712], mode: 'v' },
      { from: [400, 660], to: [400, 712], mode: 'v' },
      { from: [640, 660], to: [640, 712], mode: 'v' },
    ],
    captionY: 904,
  },
};

function ArchitectureScene({ labels, layout }: { labels: SceneLabels['architecture']; layout: Layout }) {
  const frame = useCurrentFrame();
  const m = METRICS[layout];
  const g = ARCH[layout];
  const size = SIZES[layout];
  const compact = layout === 'tall';
  const typed = Math.floor(ramp(frame, 38, 116) * CODE_TOTAL);
  const cursorOn = Math.floor(frame / 8) % 2 === 0;

  const codeLines = CODE_LINES.map((line, i) => line.slice(0, Math.max(0, Math.min(line.length, typed - (CODE_OFFSETS[i] ?? 0)))));
  const activeLine = codeLines.findIndex((text, i) => text.length < (CODE_LINES[i]?.length ?? 0));
  const cursorLine = typed >= CODE_TOTAL ? CODE_LINES.length - 1 : Math.max(0, activeLine);

  return (
    <>
      <Header label={labels.title} m={m} index={1} />
      <svg width={size.width} height={size.height} style={{ position: 'absolute', inset: 0 }}>
        {g.links.map((link, i) => (
          <Connection key={i} from={link.from} to={link.to} mode={link.mode} start={14 + i * 7} shift={i * 11} />
        ))}
      </svg>

      <Panel box={g.visitor} delay={2}>
        <NodeText tag="01" title={labels.visitor} sub={labels.visitorSub} m={m} />
      </Panel>
      <Panel box={g.edge} delay={9}>
        <NodeText tag="02" title={labels.edge} sub={labels.edgeSub} m={m} />
      </Panel>
      <Panel box={g.next} delay={16} style={{ justifyContent: 'flex-start', paddingTop: layout === 'wide' ? 22 : 30, border: '1px solid rgba(226,232,240,0.32)' }}>
        <NodeText tag="03" title={labels.next} sub={labels.nextSub} m={m} />
        <div style={{ marginTop: layout === 'wide' ? 14 : 22, fontFamily: MONO, fontSize: m.code, lineHeight: 1.65, whiteSpace: 'pre', color: C.snow }}>
          {codeLines.map((text, i) => (
            <div key={i} style={{ color: i === 0 ? C.subtle : C.snow, minHeight: `${1.65 * m.code}px` }}>
              {text}
              {i === cursorLine && cursorOn ? <span style={{ color: C.glow }}>▍</span> : null}
            </div>
          ))}
        </div>
      </Panel>
      <Panel box={g.remotion} delay={24} style={compact ? { padding: '0 20px' } : undefined}>
        <NodeText tag="04" title={labels.remotion} sub={labels.remotionSub} m={m} compact={compact} />
      </Panel>
      <Panel box={g.checkout} delay={29} style={compact ? { padding: '0 20px' } : undefined}>
        <NodeText tag="05" title={labels.checkout} sub={labels.checkoutSub} m={m} compact={compact} />
      </Panel>
      <Panel box={g.locales} delay={34} style={compact ? { padding: '0 20px' } : undefined}>
        <NodeText tag="06" title={labels.locales} sub={labels.localesSub} m={m} compact={compact} />
      </Panel>

      <Caption text={labels.caption} m={m} y={g.captionY} />
    </>
  );
}

/* ── Scene 2 · Speed budget ──────────────────────────────────────────────────────────────────── */

// The metric names are English on every page, so where they are drawn in capitals they carry lang="en": Turkish casing rules
// would turn "Lighthouse" into "LİGHTHOUSE".
const GAUGES = [
  { key: 'lcp', name: 'LCP', prefix: '< ', value: 1.2, decimals: 1, suffix: ' s' },
  { key: 'cls', name: 'CLS', prefix: '< ', value: 0.01, decimals: 2, suffix: '' },
  { key: 'tbt', name: 'TBT', prefix: '< ', value: 100, decimals: 0, suffix: ' ms' },
  { key: 'lighthouse', name: 'Lighthouse', prefix: '', value: 95, decimals: 0, suffix: '+' },
] as const;

type GaugeBox = { box: Box; cx: number; cy: number; r: number };
const GAUGE_GEOMETRY: Record<Layout, { cards: GaugeBox[]; captionY: number; stroke: number }> = {
  wide: {
    cards: GAUGES.map((_, i) => {
      const box = { x: 80 + i * 286, y: 186, w: 262, h: 340 };
      return { box, cx: box.x + box.w / 2, cy: box.y + 158, r: 82 };
    }),
    captionY: 640,
    stroke: 7,
  },
  tall: {
    cards: GAUGES.map((_, i) => {
      const box = { x: 48 + (i % 2) * 360, y: 130 + Math.floor(i / 2) * 380, w: 344, h: 364 };
      return { box, cx: box.x + box.w / 2, cy: box.y + 178, r: 92 };
    }),
    captionY: 896,
    stroke: 8,
  },
};

function SpeedScene({ labels, layout }: { labels: SceneLabels['speed']; layout: Layout }) {
  const frame = useCurrentFrame();
  const m = METRICS[layout];
  const g = GAUGE_GEOMETRY[layout];

  return (
    <>
      <Header label={labels.title} m={m} index={2} />
      {GAUGES.map((gauge, i) => {
        const card = g.cards[i];
        if (!card) return null;
        const delay = 6 + i * 8;
        const p = ramp(frame, delay + 8, delay + 70);
        const circumference = 2 * Math.PI * card.r;
        const angle = p * Math.PI * 2 - Math.PI / 2;
        const tip: Pt = [card.cx + card.r * Math.cos(angle), card.cy + card.r * Math.sin(angle)];
        const shown = (gauge.value * p).toFixed(gauge.decimals);

        return (
          <div key={gauge.key}>
            <Panel box={card.box} delay={delay} style={{ padding: 0 }}>
              <span lang="en" style={{ position: 'absolute', top: 26, left: 26, fontFamily: MONO, fontSize: m.mono, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.muted }}>{gauge.name}</span>
              <span style={{ position: 'absolute', bottom: 28, left: 0, right: 0, textAlign: 'center', fontSize: m.title - 2, fontWeight: 600, letterSpacing: '-0.025em', color: C.snow }}>
                {labels[gauge.key]}
              </span>
            </Panel>
            <svg width={SIZES[layout].width} height={SIZES[layout].height} style={{ position: 'absolute', inset: 0, opacity: ramp(frame, delay, delay + 14) }}>
              <circle cx={card.cx} cy={card.cy} r={card.r} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={g.stroke} />
              <circle
                cx={card.cx}
                cy={card.cy}
                r={card.r}
                fill="none"
                stroke={C.glow}
                strokeWidth={g.stroke}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - p)}
                transform={`rotate(-90 ${card.cx} ${card.cy})`}
              />
              <circle cx={tip[0]} cy={tip[1]} r={g.stroke + 9} fill="rgba(226,232,240,0.14)" opacity={p > 0.02 ? 1 : 0} />
              <circle cx={tip[0]} cy={tip[1]} r={g.stroke * 0.6} fill={C.snow} opacity={p > 0.02 ? 1 : 0} />
            </svg>
            <div
              style={{
                position: 'absolute',
                left: card.box.x,
                width: card.box.w,
                top: card.cy - m.value * 0.62,
                textAlign: 'center',
                fontFamily: MONO,
                fontSize: m.value,
                fontWeight: 500,
                letterSpacing: '-0.04em',
                color: C.snow,
                opacity: ramp(frame, delay + 6, delay + 20),
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {gauge.prefix}
              {shown}
              {gauge.suffix}
            </div>
          </div>
        );
      })}
      <Caption text={labels.caption} m={m} y={g.captionY} />
    </>
  );
}

/* ── Scene 3 · 14-day plan ───────────────────────────────────────────────────────────────────── */

const MILESTONES = [
  { day: 1, key: 'd1' },
  { day: 5, key: 'd5' },
  { day: 10, key: 'd10' },
  { day: 14, key: 'd14' },
] as const;

const fractionOf = (day: number) => (day - 1) / 13;

function DeliveryScene({ labels, layout }: { labels: SceneLabels['delivery']; layout: Layout }) {
  const frame = useCurrentFrame();
  const m = METRICS[layout];
  const size = SIZES[layout];
  const wide = layout === 'wide';
  const progress = ramp(frame, 16, 118);
  const counted = Math.round(14 * ramp(frame, 6, 100));

  // Timeline axis: horizontal on the wide canvas, vertical on the tall one.
  const start: Pt = wide ? [470, 430] : [96, 450];
  const end: Pt = wide ? [1216, 430] : [96, 850];
  const at = (f: number): Pt => [start[0] + (end[0] - start[0]) * f, start[1] + (end[1] - start[1]) * f];
  const head = at(progress);

  return (
    <>
      <Header label={labels.title} m={m} index={3} />

      <div
        style={{
          position: 'absolute',
          left: wide ? 56 : 44,
          top: wide ? 176 : 70,
          fontSize: m.big,
          fontWeight: 600,
          letterSpacing: '-0.065em',
          lineHeight: 1,
          color: C.snow,
          fontVariantNumeric: 'tabular-nums',
          opacity: ramp(frame, 0, 14),
        }}
      >
        {counted}
      </div>
      <div style={{ position: 'absolute', left: wide ? 68 : 56, top: wide ? 436 : 330, fontSize: m.title + 2, color: C.muted, letterSpacing: '-0.02em', opacity: ramp(frame, 12, 30) }}>
        {labels.days}
      </div>

      <svg width={size.width} height={size.height} style={{ position: 'absolute', inset: 0 }}>
        <line x1={start[0]} y1={start[1]} x2={end[0]} y2={end[1]} stroke="rgba(255,255,255,0.12)" strokeWidth={2} />
        <line x1={start[0]} y1={start[1]} x2={head[0]} y2={head[1]} stroke={C.glow} strokeWidth={3} strokeLinecap="round" />
        {Array.from({ length: 14 }, (_, i) => {
          const f = i / 13;
          const [tx, ty] = at(f);
          const lit = progress >= f - 0.001;
          return wide ? (
            <line key={i} x1={tx} y1={ty + 16} x2={tx} y2={ty + 26} stroke={lit ? C.muted : 'rgba(255,255,255,0.16)'} strokeWidth={1.5} />
          ) : (
            <line key={i} x1={tx + 16} y1={ty} x2={tx + 26} y2={ty} stroke={lit ? C.muted : 'rgba(255,255,255,0.16)'} strokeWidth={1.5} />
          );
        })}
        {MILESTONES.map(({ day }) => {
          const f = fractionOf(day);
          const [mx, my] = at(f);
          const lit = progress >= f - 0.001;
          return (
            <g key={day}>
              {lit ? <circle cx={mx} cy={my} r={(wide ? 9 : 12) + 9} fill="rgba(226,232,240,0.14)" /> : null}
              <circle cx={mx} cy={my} r={wide ? 9 : 12} fill={lit ? C.snow : C.bg} stroke={lit ? C.snow : 'rgba(255,255,255,0.3)'} strokeWidth={2} />
            </g>
          );
        })}
        <circle cx={head[0]} cy={head[1]} r={wide ? 6 : 8} fill={C.glow} opacity={progress > 0.01 && progress < 0.995 ? 1 : 0} />
      </svg>

      {MILESTONES.map(({ day, key }, index) => {
        const f = fractionOf(day);
        const [mx, my] = at(f);
        const reveal = ramp(frame, 16 + f * 102 - 4, 16 + f * 102 + 16);
        const first = index === 0;
        const last = index === MILESTONES.length - 1;

        const box: CSSProperties = wide
          ? {
              position: 'absolute',
              width: 230,
              bottom: size.height - my + 30,
              left: first ? mx - 4 : last ? mx - 226 : mx - 115,
              textAlign: first ? 'left' : last ? 'right' : 'center',
            }
          : { position: 'absolute', left: mx + 52, width: 560, top: my - 46, textAlign: 'left' };

        return (
          <div key={key} style={{ ...box, opacity: reveal, transform: `translateY(${(1 - reveal) * 10}px)` }}>
            <div style={{ fontFamily: MONO, fontSize: m.mono, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.subtle }}>
              {labels.day} {day}
            </div>
            <div style={{ fontSize: m.title + 2, fontWeight: 600, letterSpacing: '-0.03em', color: C.snow, lineHeight: 1.2, marginTop: 6 }}>{labels[key]}</div>
            <div style={{ fontSize: m.sub, color: C.muted, marginTop: 4, letterSpacing: '-0.01em' }}>{labels[`${key}Sub` as `${typeof key}Sub`]}</div>
          </div>
        );
      })}

      <Caption text={labels.caption} m={m} y={wide ? 640 : 936} />
    </>
  );
}

/* ── Composition ─────────────────────────────────────────────────────────────────────────────── */

export function ArchitectureComposition({ labels, layout, lang }: CompositionProps) {
  return (
    // fontSynthesis: the site sets `font-synthesis: none` on body and only declares weights 400-500, so a request for 600 draws
    // at 500. The Remotion browser has no such rule and would fake a bold; this keeps the film identical to the page.
    // lang: on the site the film sat inside <html lang>, so `text-transform: uppercase` followed the language's casing rules.
    <AbsoluteFill lang={lang} style={{ background: C.bg, color: C.snow, fontFamily: SANS, fontSynthesis: 'none', overflow: 'hidden' }}>
      <Backdrop />
      <Sequence from={0} durationInFrames={SCENE_FRAMES} name="architecture">
        <SceneFrame>
          <ArchitectureScene labels={labels.architecture} layout={layout} />
        </SceneFrame>
      </Sequence>
      <Sequence from={SCENE_FRAMES} durationInFrames={SCENE_FRAMES} name="speed">
        <SceneFrame>
          <SpeedScene labels={labels.speed} layout={layout} />
        </SceneFrame>
      </Sequence>
      <Sequence from={SCENE_FRAMES * 2} durationInFrames={SCENE_FRAMES} name="delivery">
        <SceneFrame>
          <DeliveryScene labels={labels.delivery} layout={layout} />
        </SceneFrame>
      </Sequence>
    </AbsoluteFill>
  );
}
