import React from 'react';
import { Series, useVideoConfig } from 'remotion';
import { durationOf, scenarios } from './data';
import { WhatsAppDemo } from './WhatsAppDemo';

export const showcaseScenarios = scenarios.filter((s) => s.id !== 'genel');

export const showcaseDuration = (fps: number) => showcaseScenarios.reduce((sum, sc) => sum + Math.ceil(durationOf(sc) * fps), 0);

// Tüm sektör senaryolarını art arda oynatır. Series.Sequence içinde useCurrentFrame() sıfırdan başlar,
// bu yüzden WhatsAppDemo hiçbir değişiklik olmadan yeniden kullanılır.
export const SectorShowcase: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <Series>
      {showcaseScenarios.map((sc) => (
        <Series.Sequence key={sc.id} durationInFrames={Math.ceil(durationOf(sc) * fps)}>
          <WhatsAppDemo scenarioId={sc.id} />
        </Series.Sequence>
      ))}
    </Series>
  );
};
