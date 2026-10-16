#!/usr/bin/env python3
"""
Builds the self-hosted Inter Display files from the official variable font (needs: pip install fonttools brotli).

Source (SIL OFL 1.1, free to embed and redistribute; licence text in public/fonts/OFL-inter.txt):
    https://github.com/rsms/inter/releases  ->  InterVariable.ttf   (or the `inter-ui` npm package: variable/InterVariable.woff2)

Usage:
    python scripts/build-fonts.py InterVariable.woff2

Writes
    public/fonts/inter-display-latin-v1.woff2     Basic Latin, Latin-1 and the few typographic marks the copy uses; preloaded everywhere
    public/fonts/inter-display-turkish-v1.woff2   G-breve, I-dot, S-cedilla, Y-diaeresis only; preloaded on /tr
    assets/og-inter-display-600.ttf               static SemiBold for the share card (satori reads one instance, not an axis)
and prints the metrics of the "Inter Display Fallback" face (Arial scaled to the font, so swapping causes no layout shift).

One face does every Latin job on the site (docs/adr/0022): weight 300 for headlines, 400 for text, 500 for buttons and navigation.
The optical-size axis is pinned at 32, Inter's "Display" cut (sharp, tight, made for large type), the width does not exist, and the
weight axis is cut to 300-500, which is every weight the design uses (600 only for the share card). A character set drawn from what
the copy and the code actually draw keeps the Latin file near 26 KB instead of the 70+ KB the three faces before it cost.
"""
import os
import sys
import tempfile

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')

# These two ranges are what app/globals.css and remotion/fonts.ts declare, character for character. The copy of the five
# Latin-script languages draws nothing else (scripts/check-fonts.py fails when it does); the code adds the lira sign, the tick and
# the cross of the simulators.
LATIN = (
    'U+0020-007E,U+00A0,U+00A1,U+00A7,U+00A9,U+00AB,U+00AE,U+00B0-00B3,U+00B5-00B7,U+00B9-00BF,U+00C0-00FF,U+0131,U+0152-0153,'
    'U+02C6,U+02DC,U+2013-2014,U+2018-201A,U+201C-201E,U+2022,U+2026,U+202F,U+2039-203A,U+20AC,U+20BA,U+2122,U+2191,U+2193,'
    'U+2212,U+2264,U+2713,U+2715'
)
TURKISH = 'U+011E-011F,U+0130,U+015E-015F,U+0178'

# kerning, composition, language forms (Turkish i) and tabular figures (the sim counters). Not ligatures, contextual alternates,
# mark positioning or case-sensitive forms: the copy is precomposed (NFC), uses none of them, and each table costs kilobytes.
FEATURES = ['kern', 'ccmp', 'locl', 'tnum']
NAME_IDS = [0, 1, 2, 3, 4, 5, 6, 13, 14, 16, 17]  # keeps the copyright and licence records the OFL asks for

# Relative frequency of English letters, space included: the average advance width of running text.
FREQUENCY = {
    ' ': 18.0, 'e': 12.7, 't': 9.06, 'a': 8.17, 'o': 7.51, 'i': 6.97, 'n': 6.75, 's': 6.33, 'h': 6.09, 'r': 5.99,
    'd': 4.25, 'l': 4.03, 'c': 2.78, 'u': 2.76, 'm': 2.41, 'w': 2.36, 'f': 2.23, 'g': 2.02, 'y': 1.97, 'p': 1.93,
    'b': 1.49, 'v': 0.98, 'k': 0.77, 'j': 0.15, 'x': 0.15, 'q': 0.10, 'z': 0.07,
}


def ranges(spec):
    out = []
    for part in spec.split(','):
        lo, _, hi = part.replace('U+', '').partition('-')
        out.extend(range(int(lo, 16), int(hi or lo, 16) + 1))
    return out


def pinned(path, **axes):
    """A copy of the variable font with the given axes pinned (a number) or cut to a range (a (min, max) pair)."""
    return instancer.instantiateVariableFont(TTFont(path), axes, inplace=False)


def write_subset(font, unicodes, out_path, flavor):
    options = subset.Options()
    options.flavor = flavor
    options.layout_features = FEATURES
    options.name_IDs = NAME_IDS
    options.notdef_outline = True
    options.hinting = False
    options.desubroutinize = True
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=unicodes)
    subsetter.subset(font)
    font.flavor = flavor
    font.save(out_path)
    print('  %-48s %6d bytes' % (os.path.relpath(out_path, ROOT), os.path.getsize(out_path)))


def weighted_width(font):
    cmap = font.getBestCmap()
    hmtx = font['hmtx']
    total = sum(FREQUENCY.values())
    return sum(hmtx[cmap[ord(ch)]][0] * weight for ch, weight in FREQUENCY.items()) / total / font['head'].unitsPerEm


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    source = sys.argv[1]

    print('Web fonts (variable weight 300-500, optical size 32):')
    web = pinned(source, opsz=32, wght=(300, 500))
    for name, spec in (('latin', LATIN), ('turkish', TURKISH)):
        # subset() works in place, so each file starts from its own copy of the pinned font
        with tempfile.NamedTemporaryFile(suffix='.ttf', delete=False) as tmp:
            web.save(tmp.name)
        write_subset(TTFont(tmp.name), ranges(spec), os.path.join(ROOT, 'public', 'fonts', 'inter-display-%s-v1.woff2' % name), 'woff2')
        os.unlink(tmp.name)

    print('Share card (static SemiBold):')
    og = pinned(source, opsz=32, wght=600)
    write_subset(og, ranges(LATIN) + ranges(TURKISH), os.path.join(ROOT, 'assets', 'og-inter-display-600.ttf'), None)

    print('Fallback metrics:')
    regular = pinned(source, opsz=32, wght=400)
    upm = regular['head'].unitsPerEm
    hhea = regular['hhea']
    arial_path = os.environ.get('ARIAL_TTF', r'C:\Windows\Fonts\arial.ttf')
    if not os.path.exists(arial_path):
        sys.exit('Arial not found at %s (set ARIAL_TTF to a copy of arial.ttf)' % arial_path)
    size_adjust = weighted_width(regular) / weighted_width(TTFont(arial_path))
    print('  size-adjust: %.2f%%' % (size_adjust * 100))
    print('  ascent-override: %.2f%%' % (hhea.ascent / upm / size_adjust * 100))
    print('  descent-override: %.2f%%' % (abs(hhea.descent) / upm / size_adjust * 100))
    print('  line-gap-override: %.2f%%' % (hhea.lineGap / upm / size_adjust * 100))


if __name__ == '__main__':
    main()
