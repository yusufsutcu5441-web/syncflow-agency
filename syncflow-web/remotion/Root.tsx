import { Composition } from 'remotion';
import { CLIP_FRAMES, CLIPS, FPS, SIZE, type ClipName } from './config';
import { loadFonts } from './fonts';
import { Clinic } from './scenes/Clinic';
import { Estate } from './scenes/Estate';
import { Law } from './scenes/Law';
import { Monolith } from './scenes/Monolith';

/**
 * The scene videos, registered for the Remotion CLI. They are NOT part of the website bundle: the site plays the
 * pre-rendered files in public/media/clips (see scripts/render-film.mjs and docs/adr/0003, 0006). No scene contains
 * readable marketing text, so one render serves every language; the captions on the site are HTML over the video.
 */
const SCENES: Record<ClipName, () => React.JSX.Element> = {
  monolith: Monolith,
  estate: Estate,
  clinic: Clinic,
  law: Law,
};

loadFonts();

export const RemotionRoot = () => (
  <>
    {CLIPS.map((name) => (
      <Composition key={name} id={`Clip-${name}`} component={SCENES[name]} durationInFrames={CLIP_FRAMES} fps={FPS} width={SIZE.width} height={SIZE.height} />
    ))}
  </>
);
