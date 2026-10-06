import type en from '@/messages/en.json';

/** Shared by the on-page Player and by any Remotion render of the same composition. */
export const FPS = 30;
export const SCENE_FRAMES = 150; // 5 s per scene
export const SCENE_COUNT = 3;
export const TOTAL_FRAMES = SCENE_FRAMES * SCENE_COUNT; // 15 s loop

/**
 * Two canvases. A 1280 px wide canvas shrinks to ~0.27x on a phone and its text becomes unreadable, so phones get
 * a portrait 4:5 canvas with larger type (scale ~0.43x). The Player picks one by viewport width.
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
};

/** First frame of each scene (used by the scene tabs). */
export const SCENE_STARTS = [0, SCENE_FRAMES, SCENE_FRAMES * 2] as const;
