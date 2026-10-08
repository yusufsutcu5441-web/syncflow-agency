// Keep this file free of `remotion` imports: scripts and tooling read it too, and the site must not pull Remotion into
// the browser bundle (docs/adr/0003-showcase-film-static-render.md).

/** Four scenes, each a seamless 8-second loop at 30 frames per second, 1280 x 720 (16:9). */
export const FPS = 30;
export const CLIP_FRAMES = 240;
export const SIZE = { width: 1280, height: 720 } as const;

export const CLIPS = ['monolith', 'estate', 'clinic', 'law'] as const;
export type ClipName = (typeof CLIPS)[number];

/** The frame used as the poster (WebP still) of each clip: the scene fully composed. */
export const POSTER_FRAME: Record<ClipName, number> = {
  monolith: 36,
  estate: 120,
  clinic: 70,
  law: 90,
};
