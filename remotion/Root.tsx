import { Composition } from 'remotion';
import en from '../messages/en.json';
import tr from '../messages/tr.json';
import { ArchitectureComposition } from './ArchitectureComposition';
import { FPS, SIZES, TOTAL_FRAMES, type Layout } from './config';
import { loadFonts } from './fonts';

/**
 * The architecture film, registered for the Remotion CLI. It is NOT part of the website bundle: the site plays the
 * pre-rendered files in public/media/showcase (see scripts/render-film.mjs and docs/adr/0003-showcase-film-static-render.md).
 *
 *   Architecture-<locale>-wide   1280x720   (16:9, desktop)
 *   Architecture-<locale>-tall    800x1000  (4:5, phones)
 *
 * 2 launch languages x 2 aspect ratios = 4 compositions. Text comes from messages/<locale>.json (the website's own
 * translations), so the video and the site never drift apart.
 */
const MESSAGES = { en, tr } as const;
const LAYOUTS: Layout[] = ['wide', 'tall'];

loadFonts();

export const RemotionRoot = () => (
  <>
    {Object.entries(MESSAGES).flatMap(([locale, messages]) =>
      LAYOUTS.map((layout) => (
        <Composition
          key={`${locale}-${layout}`}
          id={`Architecture-${locale}-${layout}`}
          component={ArchitectureComposition}
          durationInFrames={TOTAL_FRAMES}
          fps={FPS}
          width={SIZES[layout].width}
          height={SIZES[layout].height}
          defaultProps={{ labels: messages.Showcase.scene, layout, lang: locale }}
        />
      )),
    )}
  </>
);
