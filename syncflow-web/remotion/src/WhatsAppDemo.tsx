import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { byId, colors, fonts, motion } from './data';
import type { Step } from './types';
import './fonts';

// Web px → video px (1080×1920 tuval). Site CSS'indeki ölçülerin birebir ölçeklenmişidir.
const S = 2.6;
const px = (n: number) => Math.round(n * S);

const ease = Easing.bezier(motion.ease[0], motion.ease[1], motion.ease[2], motion.ease[3]);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
// Deterministik ilerleme: aynı kare her zaman aynı görüntüyü üretir (CSS animasyonu / zamanlayıcı yok).
const progress = (t: number, at: number, dur: number) => interpolate(t, [at, at + dur], [0, 1], { ...clamp, easing: ease });

const Bubble: React.FC<{ kind: 'in' | 'out'; text: string; meta: string; p: number }> = ({ kind, text, meta, p }) => {
  const out = kind === 'out';
  return (
    <div
      style={{
        alignSelf: out ? 'flex-end' : 'flex-start',
        maxWidth: '88%',
        padding: `${px(10.4)}px ${px(13.6)}px`,
        borderRadius: px(16),
        borderTopLeftRadius: out ? px(16) : px(4.8),
        borderTopRightRadius: out ? px(4.8) : px(16),
        background: out ? colors.teal400 : colors.navy800,
        color: out ? colors.navy950 : colors.navy100,
        fontSize: px(13.4),
        lineHeight: 1.45,
        fontWeight: out ? 500 : 400,
        opacity: p,
        transform: `translateY(${(1 - p) * px(motion.bubble.y)}px) scale(${motion.bubble.scaleFrom + (1 - motion.bubble.scaleFrom) * p})`,
        transformOrigin: out ? 'right top' : 'left top',
      }}
    >
      {text}
      <div style={{ marginTop: px(5.6), fontSize: px(11.2), lineHeight: 1.3, fontWeight: out ? 600 : 400, color: out ? colors.navy800 : colors.navy300 }}>{meta}</div>
    </div>
  );
};

const Typing: React.FC<{ opacity: number; t: number }> = ({ opacity, t }) => (
  <div
    style={{
      position: 'absolute',
      top: 0,
      right: 0,
      display: 'inline-flex',
      alignItems: 'center',
      gap: px(4.5),
      padding: `${px(12.8)}px ${px(15.2)}px`,
      borderRadius: px(16),
      borderTopRightRadius: px(4.8),
      background: colors.teal400,
      opacity,
    }}
  >
    {[0, 1, 2].map((i) => {
      const wave = Math.sin(((t * 2 * Math.PI) / 1.1) - i * 0.9);
      return <i key={i} style={{ width: px(6.4), height: px(6.4), borderRadius: '50%', background: colors.navy950, opacity: 0.55 + 0.45 * Math.max(0, wave), transform: `translateY(${-Math.max(0, wave) * px(2)}px)` }} />;
    })}
  </div>
);

export const WhatsAppDemo: React.FC<{ scenarioId?: string }> = ({ scenarioId = 'genel' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const sc = byId(scenarioId);
  const step = <T extends Step['type']>(type: T) => sc.steps.find((s) => s.type === type) as Extract<Step, { type: T }>;
  const sIn = step('in');
  const sTyping = step('typing');
  const sOut = step('out');
  const sTag = step('tag');

  const fade = motion.typing.fade;
  const typingOpacity = interpolate(t, [sTyping.at, sTyping.at + fade, sTyping.at + sTyping.duration + fade - 0.0001, sTyping.at + sTyping.duration + 2 * fade], [0, 1, 1, 0], clamp);
  const phoneIn = progress(t, 0, 0.7);
  const tagP = progress(t, sTag.at, motion.tag.duration);

  return (
    <AbsoluteFill
      style={{
        fontFamily: fonts.sans,
        color: '#fff',
        background: `radial-gradient(${px(190)}px ${px(110)}px at 85% -5%, rgba(45,212,191,.22), transparent 62%), radial-gradient(${px(150)}px ${px(110)}px at -10% 15%, rgba(44,86,153,.4), transparent 62%), ${colors.navy950}`,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ position: 'absolute', top: px(34), left: 0, right: 0, textAlign: 'center', fontSize: px(11), fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: colors.teal300, opacity: phoneIn }}>
        {sc.id === 'genel' ? 'Örnek senaryo' : `Örnek senaryo · ${sc.sector}`}
      </div>

      <div
        style={{
          width: px(280),
          padding: px(9.6),
          borderRadius: px(40),
          background: `linear-gradient(160deg, ${colors.navy700}, ${colors.navy900})`,
          boxShadow: '0 0 0 2px rgba(255,255,255,.1), 0 0 220px -40px rgba(45,212,191,.35)',
          opacity: phoneIn,
          transform: `translateY(${(1 - phoneIn) * px(18)}px) scale(${0.97 + 0.03 * phoneIn})`,
        }}
      >
        <div style={{ height: px(432), overflow: 'hidden', borderRadius: px(31), background: colors.navy950, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: px(11), padding: `${px(17.6)}px ${px(17.6)}px ${px(14.4)}px`, borderBottom: '2px solid rgba(255,255,255,.07)' }}>
            <div style={{ width: px(36), height: px(36), borderRadius: '50%', background: colors.teal400, color: colors.navy950, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: px(14.4) }}>{sc.brand.initial}</div>
            <div>
              <div style={{ fontSize: px(14), fontWeight: 700, lineHeight: 1.2 }}>{sc.brand.name}</div>
              <div style={{ fontSize: px(11.5), color: colors.navy300 }}>{sc.brand.status}</div>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: px(11), padding: `${px(17.6)}px ${px(16)}px ${px(32)}px` }}>
            <Bubble kind="in" text={sIn.text} meta={sIn.meta} p={progress(t, sIn.at, motion.bubble.duration)} />
            <div style={{ position: 'relative', alignSelf: 'flex-end', maxWidth: '88%' }}>
              <Typing opacity={typingOpacity} t={t} />
              <Bubble kind="out" text={sOut.text} meta={sOut.meta} p={progress(t, sOut.at, motion.bubble.duration)} />
            </div>
            <div
              style={{
                alignSelf: 'center',
                marginTop: 'auto',
                padding: `${px(7.2)}px ${px(13.6)}px`,
                borderRadius: 999,
                border: '2px solid rgba(45,212,191,.3)',
                background: 'rgba(45,212,191,.12)',
                color: colors.teal300,
                fontSize: px(11.5),
                fontWeight: 700,
                opacity: tagP,
                transform: `translateY(${(1 - tagP) * px(motion.tag.y)}px) scale(${motion.tag.scaleFrom + (1 - motion.tag.scaleFrom) * tagP})`,
              }}
            >
              {sTag.text}
            </div>
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: px(34), left: 0, right: 0, textAlign: 'center', fontSize: px(17), fontWeight: 800, letterSpacing: '-0.02em', opacity: phoneIn }}>
        Sync<span style={{ color: colors.teal300 }}>Flow</span>
      </div>
    </AbsoluteFill>
  );
};
