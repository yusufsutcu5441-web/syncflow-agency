/**
 * The scene films of the site (public/media/clips), by scene name. Four are Remotion renders (remotion/, npm run film:render; docs/adr/0003, 0006).
 * The estate film is, since 24.11.2026 (docs/adr/0038 section 12), a camera move over licensed photographs delivered by the owner, not a render:
 * it carries the file name estate-2 because /media is cached for a week (next.config.mjs), and under the old name a returning browser would have
 * kept showing the old film. Nothing in the browser imports Remotion; this module only maps a scene name to its file name.
 */
export const SCENE_NAMES = ['monolith', 'estate', 'clinic', 'law', 'logistics'] as const;
export type SceneName = (typeof SCENE_NAMES)[number];

export const CLIP_FILE: Record<SceneName, string> = { monolith: 'monolith', estate: 'estate-2', clinic: 'clinic', law: 'law', logistics: 'logistics' };

export type ClipExt = 'mp4' | 'webm' | 'webp';

/** The address of one file of a scene: `/media/clips/<file>.<ext>`. */
export const clipSrc = (name: SceneName, ext: ClipExt): string => `/media/clips/${CLIP_FILE[name]}.${ext}`;
