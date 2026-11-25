/**
 * The scene films of the site (public/media/clips), by scene name. Two are still Remotion renders (remotion/, npm run film:render; docs/adr/0003, 0006):
 * the architecture monolith and the logistics scene. The three sector films are, since 25.11.2026 (docs/adr/0038 section 21), recordings of the concept
 * websites of three fictional firms scrolling on desktop and on a phone; the owner delivered them, and docs/media-sources.md records what is in each.
 * Every replaced film enters under a NEW file name because /media is cached for a week (next.config.mjs): under the old name a returning browser would
 * have kept showing the old film. That is why the sector films are "-3" (they replaced the photo-based "-2" files of sections 12 and 14), and why the
 * architecture monolith is monolith-3: it is rendered at 1920 x 1080 like every other scene (section 15) and graded for contrast rather than exposure
 * (section 19: its blacks sit on obsidian and its highlight stops at platin).
 * Nothing in the browser imports Remotion; this module only maps a scene name to its file name.
 */
export const SCENE_NAMES = ['monolith', 'estate', 'clinic', 'law', 'logistics'] as const;
export type SceneName = (typeof SCENE_NAMES)[number];

export const CLIP_FILE: Record<SceneName, string> = { monolith: 'monolith-3', estate: 'estate-3', clinic: 'clinic-3', law: 'law-3', logistics: 'logistics' };

export type ClipExt = 'mp4' | 'webm' | 'webp';

/** The address of one file of a scene: `/media/clips/<file>.<ext>`. */
export const clipSrc = (name: SceneName, ext: ClipExt): string => `/media/clips/${CLIP_FILE[name]}.${ext}`;
