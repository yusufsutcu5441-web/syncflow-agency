/**
 * The scene films of the site (public/media/clips), by scene name. Since 27.11.2026 (docs/adr/0038 section 23) the four dark films ship as the
 * owner-delivered "-5" versions, produced directly on the page's warm ground #1c1915 (no regrade step; encoded border measured within the in-page
 * <= 8/channel rule): the three sector films are recordings of the concept websites of three fictional firms scrolling on desktop and on a phone
 * (section 21 lineage), and the architecture monolith is a three.js render made outside the repo (headless Chromium, software WebGL; its scene
 * source is not in the repo — owner's delivery, docs/media-sources.md). The logistics scene stays the section-22 regrade of its Remotion render
 * (remotion/, docs/adr/0003, 0006): its bytes did not change, so its name did not either. The repo also ships three PORTRAIT recordings
 * (clinic-m-5, law-m-5, estate-m-5, 1080x1350) that no component references yet — they are staged for the phone showcase (section 23, stage 3).
 * Every replaced film enters under a NEW file name because /media is cached for a week (next.config.mjs): under the old name a returning browser
 * would have kept showing the old film. Nothing in the browser imports Remotion or three.js; this module only maps a scene name to its file name.
 */
export const SCENE_NAMES = ['monolith', 'estate', 'clinic', 'law', 'logistics'] as const;
export type SceneName = (typeof SCENE_NAMES)[number];

export const CLIP_FILE: Record<SceneName, string> = { monolith: 'monolith-5', estate: 'estate-5', clinic: 'clinic-5', law: 'law-5', logistics: 'logistics-2' };

export type ClipExt = 'mp4' | 'webm' | 'webp';

/** The address of one file of a scene: `/media/clips/<file>.<ext>`. */
export const clipSrc = (name: SceneName, ext: ClipExt): string => `/media/clips/${CLIP_FILE[name]}.${ext}`;
