// Keep this file free of `remotion` imports: scripts and tooling read it too, and the site must not pull Remotion into
// the browser bundle (docs/adr/0003-showcase-film-static-render.md).

/**
 * Five scenes, each a seamless 8-second loop at 30 frames per second, drawn on a 1280 x 720 (16:9) canvas. The four sector scenes are
 * rendered at 1.5x (1920 x 1080) by scripts/render-film.mjs; the architecture monolith at 1x.
 */
export const FPS = 30;
export const CLIP_FRAMES = 240;
export const SIZE = { width: 1280, height: 720 } as const;

export const CLIPS = ['monolith', 'estate', 'clinic', 'law', 'logistics'] as const;
export type ClipName = (typeof CLIPS)[number];

/** The frame used as the poster (WebP still) of each clip: the scene fully composed. */
export const POSTER_FRAME: Record<ClipName, number> = {
  monolith: 36,
  estate: 120,
  clinic: 70,
  law: 90,
  logistics: 70,
};
