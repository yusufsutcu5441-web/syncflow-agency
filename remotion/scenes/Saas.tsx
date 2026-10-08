import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';

const clamp = (n: number) => Math.min(1, Math.max(0, n));
const win = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const ease = (x: number) => x * x * (3 - 2 * x);

const LINE = 'M0 120 C 40 110, 70 70, 110 84 S 180 40, 220 52 S 300 96, 340 60 S 420 20, 470 30 S 540 70, 600 24';
const LINE_LENGTH = 700;
const BARS = [0.42, 0.58, 0.5, 0.74, 0.62, 0.86, 0.7, 0.92, 0.8, 1];
const ROWS = [
  ['Atlas', 'Production', '99.99%'],
  ['Harbor', 'Production', '99.97%'],
  ['Meridian', 'Staging', '99.92%'],
  ['Quartz', 'Production', '99.98%'],
  ['Vertex', 'Staging', '99.90%'],
  ['Nimbus', 'Production', '99.99%'],
] as const;
const COMMANDS = ['Deploy to production', 'Open analytics', 'Invite a teammate', 'Switch workspace'];

/**
 * A dark product dashboard: charts draw in, numbers count up, table rows fill one after another, and a command palette
 * (the ⌘K of every modern tool) opens and closes. Every element returns to its starting state at the end of the 8 seconds, so the
 * loop has no seam. A mock-up for the concept card: the names and figures are invented and say nothing about any real product.
 */
export function Saas() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = frame / durationInFrames;
  const out = 1 - ease(win(p, 0.9, 1)); // fades the filled-in content away before the loop restarts
  const draw = ease(win(p, 0.02, 0.3));
  const bars = ease(win(p, 0.06, 0.34));
  const count = ease(win(p, 0.04, 0.28));
  const palette = ease(win(p, 0.5, 0.56)) * (1 - ease(win(p, 0.82, 0.88)));
  const typed = Math.floor(win(p, 0.57, 0.68) * 6);
  const active = Math.min(COMMANDS.length - 1, Math.floor(win(p, 0.66, 0.8) * COMMANDS.length));

  const kpis = [
    ['Revenue', 128400, '$'],
    ['Active users', 9312, ''],
    ['Uptime', 99.98, '%'],
  ] as const;

  return (
    <AbsoluteFill style={{ background: '#0D0D0E', fontFamily: 'Instrument Sans, system-ui, sans-serif', color: '#E2E2E6', overflow: 'hidden' }}>
      {/* sidebar */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 210, borderRight: '1px solid rgba(226,226,230,0.08)', padding: '28px 22px' }}>
        <div style={{ width: 92, height: 14, borderRadius: 7, background: 'rgba(226,226,230,0.9)' }} />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: i === 0 ? 46 : 20 }}>
            <div style={{ width: 18, height: 18, borderRadius: 5, border: '1px solid rgba(226,226,230,0.3)', background: i === 0 ? 'rgba(226,226,230,0.16)' : 'transparent' }} />
            <div style={{ width: 80 - i * 6, height: 8, borderRadius: 4, background: `rgba(226,226,230,${i === 0 ? 0.55 : 0.2})` }} />
          </div>
        ))}
      </div>

      {/* top bar */}
      <div style={{ position: 'absolute', left: 210, right: 0, top: 0, height: 64, borderBottom: '1px solid rgba(226,226,230,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 34px' }}>
        <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.01em' }}>Overview</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', border: '1px solid rgba(226,226,230,0.12)', borderRadius: 999, fontSize: 13, color: 'rgba(226,226,230,0.55)' }}>
          <span>Search</span>
          <span style={{ padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(226,226,230,0.18)', fontSize: 12, color: '#E2E2E6' }}>⌘K</span>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ position: 'absolute', left: 244, top: 96, right: 34, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        {kpis.map(([label, value, unit]) => {
          const v = value * count;
          const text = unit === '$' ? `$${Math.round(v).toLocaleString('en-US')}` : unit === '%' ? `${v.toFixed(2)}%` : Math.round(v).toLocaleString('en-US');
          return (
            <div key={label} style={{ padding: '20px 22px', borderRadius: 16, border: '1px solid rgba(226,226,230,0.1)', background: 'rgba(226,226,230,0.025)', opacity: 0.35 + 0.65 * out }}>
              <div style={{ fontSize: 13, color: 'rgba(226,226,230,0.5)' }}>{label}</div>
              <div style={{ marginTop: 10, fontSize: 32, fontWeight: 500, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{text}</div>
            </div>
          );
        })}
      </div>

      {/* line chart and bars */}
      <div style={{ position: 'absolute', left: 244, top: 264, width: 640, height: 190, borderRadius: 16, border: '1px solid rgba(226,226,230,0.1)', background: 'rgba(226,226,230,0.02)', padding: 18, opacity: 0.35 + 0.65 * out }}>
        <svg width="604" height="150" viewBox="0 0 604 150" fill="none">
          {[30, 70, 110].map((y) => (
            <line key={y} x1="0" x2="604" y1={y} y2={y} stroke="rgba(226,226,230,0.07)" />
          ))}
          <path d={LINE} stroke="#E2E2E6" strokeWidth="2" strokeLinecap="round" strokeDasharray={LINE_LENGTH} strokeDashoffset={LINE_LENGTH * (1 - draw)} />
        </svg>
      </div>
      <div style={{ position: 'absolute', left: 904, top: 264, right: 34, height: 190, borderRadius: 16, border: '1px solid rgba(226,226,230,0.1)', background: 'rgba(226,226,230,0.02)', padding: 18, display: 'flex', alignItems: 'flex-end', gap: 9, opacity: 0.35 + 0.65 * out }}>
        {BARS.map((h, i) => (
          <div key={i} style={{ flex: 1, height: `${(h * 100 * bars).toFixed(1)}%`, borderRadius: 4, background: `rgba(226,226,230,${0.25 + 0.5 * h})` }} />
        ))}
      </div>

      {/* table */}
      <div style={{ position: 'absolute', left: 244, right: 34, top: 482, borderRadius: 16, border: '1px solid rgba(226,226,230,0.1)', overflow: 'hidden' }}>
        {ROWS.map(([name, env, uptime], i) => {
          const a = ease(win(p, 0.3 + i * 0.045, 0.36 + i * 0.045)) * out;
          return (
            <div key={name} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', padding: '9px 22px', fontSize: 14, borderTop: i ? '1px solid rgba(226,226,230,0.06)' : 'none', opacity: a, transform: `translateY(${(1 - a) * 8}px)` }}>
              <span>{name}</span>
              <span style={{ color: 'rgba(226,226,230,0.55)' }}>{env}</span>
              <span style={{ color: 'rgba(226,226,230,0.8)', fontVariantNumeric: 'tabular-nums' }}>{uptime}</span>
            </div>
          );
        })}
      </div>

      {/* command palette */}
      <AbsoluteFill style={{ background: `rgba(13,13,14,${0.55 * palette})` }} />
      <div
        style={{
          position: 'absolute',
          left: 340,
          top: 150,
          width: 600,
          borderRadius: 18,
          border: '1px solid rgba(226,226,230,0.18)',
          background: '#141416',
          boxShadow: '0 30px 80px rgba(13,13,14,0.6)',
          opacity: palette,
          transform: `translateY(${(1 - palette) * 14}px) scale(${0.97 + 0.03 * palette})`,
        }}
      >
        <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(226,226,230,0.08)', fontSize: 18, display: 'flex', alignItems: 'center', gap: 2 }}>
          <span style={{ color: 'rgba(226,226,230,0.45)' }}>{typed === 0 ? 'Type a command' : ''}</span>
          <span>{'deploy'.slice(0, typed)}</span>
          <span style={{ width: 2, height: 22, background: '#E2E2E6', opacity: Math.floor(p * 60) % 2 }} />
        </div>
        {COMMANDS.map((command, i) => (
          <div key={command} style={{ padding: '13px 22px', fontSize: 15, background: i === active ? 'rgba(226,226,230,0.07)' : 'transparent', color: i === active ? '#E2E2E6' : 'rgba(226,226,230,0.62)' }}>
            {command}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}
