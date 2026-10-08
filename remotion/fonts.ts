import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';

/**
 * Loads the website's own Inter files (public/fonts, SIL OFL) into the Remotion browser, declared exactly the way
 * app/globals.css declares them: weights 400-500 only (a request for 600 renders at 500, as it did on the page), and the
 * Latin and Turkish subsets chosen glyph by glyph through unicode-range.
 *
 * Without this the headless browser has no 'Inter' and silently falls back to a system font, so the video would not
 * match the site's typography. delayRender holds the first frame until both files are in.
 */
const FACES = [
  {
    file: 'fonts/inter-latin-v1.woff2',
    range:
      'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
  },
  { file: 'fonts/inter-turkish-v1.woff2', range: 'U+011E-011F, U+0130, U+015E-015F, U+0178' },
] as const;

export function loadFonts(): void {
  const handle = delayRender('Loading Inter');
  Promise.all(
    FACES.map(({ file, range }) =>
      new FontFace('Inter', `url(${staticFile(file)}) format('woff2')`, { style: 'normal', weight: '400 500', unicodeRange: range }).load(),
    ),
  )
    .then((faces) => {
      for (const face of faces) document.fonts.add(face);
      continueRender(handle);
    })
    .catch((error: unknown) => cancelRender(error));
}
