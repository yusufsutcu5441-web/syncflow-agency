/**
 * The scene films of the site (public/media/clips), by scene name. Two are still Remotion renders (remotion/, npm run film:render; docs/adr/0003, 0006):
 * the architecture monolith and the logistics scene. Three are camera moves over licensed photographs: estate since 24.11.2026 (docs/adr/0038 section 12,
 * the owner's own files), clinic and law since the same day (section 14, built from free-licence Unsplash photographs; docs/media-sources.md names every
 * photograph and photographer). Each of the three carries a "-2" file name because /media is cached for a week (next.config.mjs): under the old name a
 * returning browser would have kept showing the old film. The architecture monolith is still a Remotion render and carries a new name for the same
 * reason: since 24.11.2026 it is rendered at 1920 x 1080 like every other scene (section 15) and graded for contrast rather than exposure
 * (section 19: its blacks sit on obsidian and its highlight stops at platin), which is monolith-3.
 * Nothing in the browser imports Remotion; this module only maps a scene name to its file name.
 */
export const SCENE_NAMES = ['monolith', 'estate', 'clinic', 'law', 'logistics'] as const;
export type SceneName = (typeof SCENE_NAMES)[number];

export const CLIP_FILE: Record<SceneName, string> = { monolith: 'monolith-3', estate: 'estate-2', clinic: 'clinic-2', law: 'law-2', logistics: 'logistics' };

export type ClipExt = 'mp4' | 'webm' | 'webp';

/** The address of one file of a scene: `/media/clips/<file>.<ext>`. */
export const clipSrc = (name: SceneName, ext: ClipExt): string => `/media/clips/${CLIP_FILE[name]}.${ext}`;
