import React from 'react';
import { Composition } from 'remotion';
import { byId, durationOf } from './data';
import { WhatsAppDemo } from './WhatsAppDemo';
import { SectorShowcase, showcaseDuration } from './SectorShowcase';

const FPS = 30;

// 1080×1920 (9:16): Reels / Shorts / WhatsApp durumu. Yatay (16:9) için width/height değiştirmek yeterli.
export const Root: React.FC = () => (
  <>
    <Composition
      id="WhatsAppDemo"
      component={WhatsAppDemo}
      durationInFrames={Math.ceil(durationOf(byId('genel')) * FPS)}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ scenarioId: 'genel' }}
      calculateMetadata={({ props }) => ({ durationInFrames: Math.ceil(durationOf(byId(String(props.scenarioId ?? 'genel'))) * FPS) })}
    />
    <Composition id="SectorShowcase" component={SectorShowcase} durationInFrames={showcaseDuration(FPS)} fps={FPS} width={1080} height={1920} />
  </>
);
