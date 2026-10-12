import type { CSSProperties } from 'react';
import { getTranslations } from 'next-intl/server';

/**
 * The film (docs/adr/0014-cinematic-layer.md): four chapters on a tall section with a sticky stage. Scrolling plays it like a
 * timeline: lib/enhance/film.ts writes the scroll position into --p, and CSS alone fades the chapters and posters in and out.
 * With WebGL (a desktop) the cinema canvas behind the page draws the scenes (cosmic matter, a bio-mechanical spine, an obsidian
 * monolith, liquid metal) and the posters are hidden; everywhere else the same four scenes show as pre-rendered stills
 * (public/film/scene-N.webp and scene-N-portrait.webp, rendered from the same shaders by scripts/render-posters.mjs).
 *
 * Every chapter is real text in the document in reading order, so a screen reader gets all four without any scroll.
 */
const POSTERS = [0, 1, 2, 3] as const;

export async function Film() {
  const t = await getTranslations('Film');
  const chapters = [
    { word: t('c1Word'), line: t('c1Line'), text: t('c1Text') },
    { word: t('c2Word'), line: t('c2Line'), text: t('c2Text') },
    { word: t('c3Word'), line: t('c3Line'), text: t('c3Text') },
    { word: t('c4Word'), line: t('c4Line'), text: t('c4Text') },
  ];

  return (
    <section id="film" className="film" data-film="" data-chapter="0" aria-label={t('label')}>
      <div className="film-stage">
        <div className="film-posters" aria-hidden="true">
          {POSTERS.map((i) => (
            // Plain <img>: decorative stills, lazy, hidden while the WebGL canvas is live (globals.css). A phone in portrait gets
            // the portrait render; a landscape still cropped to a phone is a magnified sliver and shows its pixels.
            // The files are named in data-* and only set when the section is close and the WebGL layer is not going to draw the film
            // (lib/enhance/film.ts): a phone fetches them as the film approaches, a desktop never does.
            <picture key={i}>
              <source media="(max-aspect-ratio: 1/1)" data-srcset={`/film/scene-${i}-portrait.webp`} width={720} height={1280} />
              <img className="film-poster" style={{ '--i': i } as CSSProperties} data-src={`/film/scene-${i}.webp`} alt="" width={1280} height={720} decoding="async" />
            </picture>
          ))}
        </div>
        <div className="film-scrim" aria-hidden="true" />

        <div className="container-x film-chapters">
          {chapters.map((chapter, i) => (
            <article key={i} className="chapter" style={{ '--i': i, '--chars': [...chapter.word].length } as CSSProperties} aria-labelledby={`chapter-${i}`}>
              <p className="label">
                {String(i + 1).padStart(2, '0')} / {String(chapters.length).padStart(2, '0')}
              </p>
              <h2 id={`chapter-${i}`} className="chapter-word">
                {chapter.word}
              </h2>
              <p className="chapter-line">{chapter.line}</p>
              <p className="lead chapter-text">{chapter.text}</p>
            </article>
          ))}
          <p className="label film-cue" aria-hidden="true">
            {t('cue')}
          </p>
        </div>

        <div className="film-hud" aria-hidden="true">
          <span className="film-tc" data-film-tc="">
            00:00:00:00
          </span>
          <span className="film-rail" />
        </div>
      </div>
    </section>
  );
}
