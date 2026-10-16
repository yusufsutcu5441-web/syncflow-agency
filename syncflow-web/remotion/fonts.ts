import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';

/**
 * Loads the website's own Inter Display files (public/fonts, SIL OFL) into the Remotion browser, declared exactly the way
 * app/globals.css declares them: the weight axis 300-500, and the Latin and Turkish subsets chosen glyph by glyph through
 * unicode-range.
 *
 * Without this the headless browser has no 'Inter Display' and silently falls back to a system font, so a scene that sets text
 * would not match the site's typography. (The scenes rendered so far draw no text.) delayRender holds the first frame until both
 * files are in.
 */
const FACES = [
  {
    file: 'fonts/inter-display-latin-v1.woff2',
    range:
      'U+0020-007E, U+00A0, U+00A1, U+00A7, U+00A9, U+00AB, U+00AE, U+00B0-00B3, U+00B5-00B7, U+00B9-00BF, U+00C0-00FF, U+0131, U+0152-0153, U+02C6, U+02DC, U+2013-2014, U+2018-201A, U+201C-201E, U+2022, U+2026, U+202F, U+2039-203A, U+20AC, U+20BA, U+2122, U+2191, U+2193, U+2212, U+2264, U+2713, U+2715',
  },
  { file: 'fonts/inter-display-turkish-v1.woff2', range: 'U+011E-011F, U+0130, U+015E-015F, U+0178' },
] as const;

export function loadFonts(): void {
  const handle = delayRender('Loading Inter Display');
  Promise.all(
    FACES.map(({ file, range }) =>
      new FontFace('Inter Display', `url(${staticFile(file)}) format('woff2')`, { style: 'normal', weight: '300 500', unicodeRange: range }).load(),
    ),
  )
    .then((faces) => {
      for (const face of faces) document.fonts.add(face);
      continueRender(handle);
    })
    .catch((error: unknown) => cancelRender(error));
}
