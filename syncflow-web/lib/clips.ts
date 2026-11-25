/**
 * The scene films of the site (public/media/clips), by scene name. The three sector films are, since 25.11.2026 (docs/adr/0038 section 21), recordings
 * of the concept websites of three fictional firms scrolling on desktop and on a phone; the owner delivered them, and docs/media-sources.md records
 * what is in each. The architecture monolith and the logistics scene come from Remotion renders (remotion/, npm run film:render; docs/adr/0003, 0006).
 * Since the owner's warm-anthracite order (25.11.2026, section 22) every shipped file is the "-4" (and logistics "-2") REGRADE of those sources: a
 * channel-wise linear map that seats each film's background on the page's #1c1915, verified to +-2 per channel on the encoded output. Every replaced
 * film enters under a NEW file name because /media is cached for a week (next.config.mjs): under the old name a returning browser would have kept
 * showing the old film. Nothing in the browser imports Remotion; this module only maps a scene name to its file name.
 */
export const SCENE_NAMES = ['monolith', 'estate', 'clinic', 'law', 'logistics'] as const;
export type SceneName = (typeof SCENE_NAMES)[number];

export const CLIP_FILE: Record<SceneName, string> = { monolith: 'monolith-4', estate: 'estate-4', clinic: 'clinic-4', law: 'law-4', logistics: 'logistics-2' };

export type ClipExt = 'mp4' | 'webm' | 'webp';

/** The address of one file of a scene: `/media/clips/<file>.<ext>`. */
export const clipSrc = (name: SceneName, ext: ClipExt): string => `/media/clips/${CLIP_FILE[name]}.${ext}`;
