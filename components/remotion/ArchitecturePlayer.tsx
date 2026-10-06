'use client';

import { Player, type PlayerRef } from '@remotion/player';
import type { Ref } from 'react';
import { ArchitectureComposition } from './ArchitectureComposition';
import { FPS, SIZES, TOTAL_FRAMES, type CompositionProps } from './config';

type Props = CompositionProps & {
  playerRef: Ref<PlayerRef>;
  initialFrame: number;
};

/**
 * The Remotion Player for the architecture film. It is imported with next/dynamic (ssr: false) from ShowcasePlayer,
 * so the Remotion runtime is a separate chunk that is only fetched when the section is about to scroll into view.
 * Controls are rendered by ShowcasePlayer (accessible, translated, on-brand), not by the Player.
 */
export default function ArchitecturePlayer({ labels, layout, playerRef, initialFrame }: Props) {
  const size = SIZES[layout];

  return (
    <Player
      ref={playerRef}
      component={ArchitectureComposition}
      inputProps={{ labels, layout }}
      durationInFrames={TOTAL_FRAMES}
      compositionWidth={size.width}
      compositionHeight={size.height}
      fps={FPS}
      loop
      controls={false}
      clickToPlay={false}
      doubleClickToFullscreen={false}
      spaceKeyToPlayOrPause={false}
      initialFrame={initialFrame}
      numberOfSharedAudioTags={0}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
