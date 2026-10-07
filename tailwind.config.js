/**
 * SyncFlow design system: "Quiet Luxury Noir".
 *
 * This file is the single source of every design token: colour, type, whitespace, shape, motion.
 *  - Tailwind v4 does not discover a JS config by itself; app/globals.css loads it with `@config`.
 *  - The plugin at the bottom also publishes the tokens as CSS custom properties (--color-obsidian, --space-section,
 *    --tracking-display ...), so the plain CSS in globals.css reads exactly the values the utilities use.
 *  - There is no `content` list: v4 scans the project for class names on its own.
 *  - `extend` adds to Tailwind's defaults. Whatever is not named here (text-sm, p-4, rounded-xl ...) keeps its default.
 *
 * CommonJS on purpose: in a package without "type": "module", Node prints a warning on every build when a `.js`
 * file uses `export`.
 */

/** { line: { DEFAULT: a, faint: b } } -> [['line', a], ['line-faint', b]] */
const flatten = (tokens, prefix = '') =>
  Object.entries(tokens).flatMap(([key, value]) => {
    const name = key === 'DEFAULT' ? prefix : prefix ? `${prefix}-${key}` : key;
    return typeof value === 'object' ? flatten(value, name) : [[name, value]];
  });

/* ── Colour ─────────────────────────────────────────────────────────────────────────────────────
   The canvas is charcoal, never pure black: pure black makes light type vibrate and flattens depth.
   Contrast on the canvas (WCAG): snow 17.5:1 · muted 7.7:1 · subtle 5.7:1. Nothing below 4.5:1 carries text. */
const colors = {
  obsidian: '#0d0d0e', // the page canvas
  raised: '#131315', // one step up: menus, popovers
  snow: '#f4f4f5', // primary text
  muted: '#a1a1aa', // secondary text
  subtle: '#8a8a93', // captions, footnotes
  glow: '#e2e8f0', // the only accent: a cool white light
  /* Hairlines are white at 5 / 10 / 15 / 25 %. A bare `border` is a hairline too (see @layer base in globals.css). */
  line: {
    DEFAULT: 'rgb(255 255 255 / 0.1)', // border-line: cards, dividers, the standard
    faint: 'rgb(255 255 255 / 0.05)', // border-line-faint: inner dividers that should barely register
    strong: 'rgb(255 255 255 / 0.15)', // border-line-strong: controls at rest, the highlighted column
    bright: 'rgb(255 255 255 / 0.25)', // border-line-bright: hover and active states
  },
};

/* ── Typography ─────────────────────────────────────────────────────────────────────────────────
   Neo-grotesk logic (Satoshi, PP Neue Montreal): the bigger the type, the tighter the tracking (headlines -3.5 %,
   body -1.1 %), and tiny caps labels open up (+16 %). Inter stands in for those faces. The subset we ship has the
   weight axis, kerning and tabular figures only: no stylistic sets and no optical-size axis, so the character comes
   from tracking, weight and leading, not from font features. To set headlines in another face, change
   `fontFamily.display` here and add its @font-face (and preload) in globals.css / the layout. */
const sans =
  "'Inter', 'Inter Fallback', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

const fontFamily = {
  sans,
  display: sans,
  mono: "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
};

const tracking = {
  tightest: '-0.06em', // the price numeral
  tighter: '-0.045em', // the wordmark
  display: '-0.035em', // headlines
  tight: '-0.03em', // large UI text (Tailwind's own `tight` is -0.025em)
  snug: '-0.02em', // question and card titles
  lead: '-0.015em', // intro paragraphs
  body: '-0.011em', // running text
  eyebrow: '0.16em', // small monospace caps labels
};

const leading = {
  display: '1.02', // headlines are set almost solid
  body: '1.6',
};

/* One tuple = size, line height and tracking together, so `text-display` is a complete headline style. */
const display = { lineHeight: leading.display, letterSpacing: tracking.display };

const fontSize = {
  'display-xl': ['clamp(2.85rem, 6.4vw, 5.6rem)', display], // hero headline
  'display-lg': ['clamp(2.4rem, 5.2vw, 4.7rem)', display], // hero headline when the translation is long (DE, TR)
  display: ['clamp(1.95rem, 5vw, 4.1rem)', display], // section headlines
  'display-sm': ['clamp(2.4rem, 6vw, 4rem)', display], // page titles (legal pages)
  numeral: ['clamp(3.5rem, 11vw, 7.25rem)', { lineHeight: '0.9', letterSpacing: tracking.tightest }], // the price
  lead: ['clamp(1.0625rem, 1.2vw + 0.8rem, 1.3125rem)', { lineHeight: '1.55', letterSpacing: tracking.lead }],
  title: ['clamp(1.0625rem, 0.6vw + 0.95rem, 1.3125rem)', { lineHeight: '1.35', letterSpacing: tracking.snug }],
};

/* ── Whitespace ─────────────────────────────────────────────────────────────────────────────────
   Luxury is mostly what is left empty. One rhythm, three beats:
     section  space above and below a major section        (fluid)
     block    a section's header -> its content             (steps up at 48rem)
     gutter   page margin left and right of the container   (steps up at 48rem)
   A pair is [phones, from 48rem]. The plugin publishes each pair as ONE variable that switches at 48rem, so markup
   says `mt-block` instead of `mt-14 md:mt-20`. Utilities: py-section, mt-block, px-gutter, gap-block ... */
const rhythm = {
  section: 'clamp(5rem, 11vw, 9.5rem)',
  block: ['3.5rem', '5rem'],
  gutter: ['1.5rem', '2.5rem'],
};

const maxWidth = {
  container: '75rem', // the page column
  measure: '38rem', // longest comfortable paragraph line
};

/* ── Shape and motion ───────────────────────────────────────────────────────────────────────── */
const borderRadius = {
  card: '1.25rem', // glass cards
  control: '0.85rem', // inputs
};

const ease = {
  'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)', // fast start, long soft landing: every reveal and hover
};

/** Publishes the tokens above as CSS custom properties (the 48rem steps in one media query). */
function publishTokens({ addBase }) {
  const root = {};
  const wide = {};
  const publish = (prefix, tokens) => {
    for (const [name, value] of flatten(tokens)) root[`--${prefix}-${name}`] = value;
  };

  publish('color', colors);
  publish('font', fontFamily);
  publish('tracking', tracking);
  publish('leading', leading);
  publish('max', maxWidth);
  publish('radius', borderRadius);
  publish('ease', ease);

  for (const [name, value] of Object.entries(rhythm)) {
    if (Array.isArray(value)) {
      root[`--space-${name}`] = value[0];
      wide[`--space-${name}`] = value[1];
    } else {
      root[`--space-${name}`] = value;
    }
  }

  addBase({ ':root': root, '@media (min-width: 48rem)': { ':root': wide } });
}

/** @type {import('tailwindcss').Config} */
const config = {
  theme: {
    extend: {
      colors,
      fontFamily,
      fontSize,
      letterSpacing: tracking,
      lineHeight: leading,
      spacing: Object.fromEntries(Object.keys(rhythm).map((name) => [name, `var(--space-${name})`])),
      maxWidth,
      borderRadius,
      transitionTimingFunction: ease,
    },
  },
  plugins: [publishTokens],
};

module.exports = config;
