import type en from '@/messages/en.json';

// Keep this file free of `remotion` imports: the website imports it too (components/showcase/ShowcaseFilm.tsx), and the
// site must not pull Remotion into the browser bundle (docs/adr/0003-showcase-film-static-render.md).

/** Shared by the Remotion composition and by the on-page film controls (components/showcase), so the scene tabs seek to the right second. */
export const FPS = 30;
export const SCENE_FRAMES = 150; // 5 s per scene
export const SCENE_COUNT = 3;
export const TOTAL_FRAMES = SCENE_FRAMES * SCENE_COUNT; // 15 s loop

/**
 * Two canvases. A 1280 px wide canvas shrinks to ~0.27x on a phone and its text becomes unreadable, so phones get
 * a portrait 4:5 canvas with larger type (scale ~0.43x). The page picks one by viewport width.
 */
export type Layout = 'wide' | 'tall';
export const SIZES = {
  wide: { width: 1280, height: 720 },
  tall: { width: 800, height: 1000 },
} as const satisfies Record<Layout, { width: number; height: number }>;

export type SceneLabels = (typeof en)['Showcase']['scene'];

export type CompositionProps = {
  labels: SceneLabels;
  layout: Layout;
  /** Language of the labels. CSS `text-transform: uppercase` picks its casing rules from it (Turkish "mimari" is "MİMARİ", not "MIMARI"). */
  lang?: string;
};

/** First frame of each scene (used by the scene tabs). */
export const SCENE_STARTS = [0, SCENE_FRAMES, SCENE_FRAMES * 2] as const;
