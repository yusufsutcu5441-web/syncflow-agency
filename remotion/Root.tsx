import { Composition } from 'remotion';
import { ArchitectureComposition } from '../components/remotion/ArchitectureComposition';
import { FPS, SIZES, TOTAL_FRAMES, type Layout } from '../components/remotion/config';
import de from '../messages/de.json';
import en from '../messages/en.json';
import fr from '../messages/fr.json';
import it from '../messages/it.json';
import tr from '../messages/tr.json';

/**
 * The same composition that plays on the website, registered for the Remotion CLI so it can be rendered to video or
 * stills (LinkedIn clips, sales decks, ads) in every language: 5 languages x 2 aspect ratios = 10 compositions.
 *
 *   Architecture-<locale>-wide   1280x720   (16:9, desktop / YouTube)
 *   Architecture-<locale>-tall    800x1000  (4:5, LinkedIn / Instagram feed)
 *
 * Text comes from messages/<locale>.json (the website's own translations), so website and video never drift apart.
 */
const MESSAGES = { en, tr, de, fr, it } as const;
const LAYOUTS: Layout[] = ['wide', 'tall'];

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
          defaultProps={{ labels: messages.Showcase.scene, layout }}
        />
      )),
    )}
  </>
);
