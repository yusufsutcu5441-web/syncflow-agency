#!/usr/bin/env python3
"""
Font coverage guard (needs: pip install fonttools brotli).

The site ships one text face as two self-hosted subsets (public/fonts, built by scripts/build-fonts.py, docs/adr/0022):
  inter-display-latin-v1.woff2    Basic Latin, Latin-1 and the typographic marks the copy draws (EN, DE, FR, ES, most of TR)
  inter-display-turkish-v1.woff2  Only the Turkish letters outside that set: G-breve, I-dot, S-cedilla (and Y-diaeresis)
plus Syne (public/fonts, the film's chapter words in capitals, fetched when the film is near).

This script fails when any character used in the Latin-script messages (en tr de fr es) is in neither Inter Display file, because
that character would silently render in the fallback font, and when a chapter word is not covered by Syne once capitalised. The
character set of the subset is deliberately narrow (about 26 KB): when copy needs a new character, add it to LATIN in
scripts/build-fonts.py and to the unicode-range in app/globals.css, then rebuild. Run it whenever you add a language or change copy:
    python scripts/check-fonts.py
"""
import glob
import json
import os
import re
import sys

from fontTools.ttLib import TTFont

root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')


def cmap(*names):
    out = set()
    for name in names:
        out |= set(TTFont(os.path.join(root, 'public', 'fonts', name)).getBestCmap())
    return out


latin = cmap('inter-display-latin-v1.woff2')
turkish = cmap('inter-display-turkish-v1.woff2')
covered = latin | turkish
turkish_only = turkish - latin
syne = cmap('syne-latin-v1.woff2', 'syne-latin-ext-v1.woff2')

# Arabic, Chinese and Japanese are set in system font stacks on purpose (app/globals.css :lang rules), so Inter Display is not
# expected to cover them. These symbols are drawn by the system symbol font if Inter lacked them; listing them keeps that a
# decision instead of a silent fallback (Inter Display has all three, so today they are covered by the face itself).
SYSTEM_FONT_LOCALES = {'ar', 'zh', 'ja'}
SYMBOL_FALLBACK = {'⌘'}  # keyboard hint: not in the subset, drawn by the system symbol font

missing = {}
turkish_use = {}


def strings(node):
    if isinstance(node, dict):
        for value in node.values():
            yield from strings(value)
    else:
        yield node


for path in sorted(glob.glob(os.path.join(root, 'messages', '*.json'))):
    locale = os.path.basename(path)[:-5]
    if locale in SYSTEM_FONT_LOCALES:
        continue
    with open(path, encoding='utf-8') as handle:
        data = json.load(handle)
    for text in strings(data):
        text = re.sub(r'<[^>]+>', '', text)  # rich-text tags
        text = re.sub(r'\{[^}]+\}', '', text)  # ICU placeholders
        for ch in text:
            if ch.isspace() or ch in SYMBOL_FALLBACK:
                continue
            if ord(ch) not in covered:
                missing.setdefault(ch, set()).add(locale)
            if ord(ch) in turkish_only:
                turkish_use.setdefault(locale, set()).add(ch)

if missing:
    for ch, locales in sorted(missing.items()):
        print('NOT COVERED: %r U+%04X in %s' % (ch, ord(ch), ', '.join(sorted(locales))))
    sys.exit(1)

print('OK: every character in the Latin-script messages (en tr de fr es) is covered by the Inter Display Latin or Turkish file.')
for locale, chars in sorted(turkish_use.items()):
    print('  %s uses glyphs from the Turkish file: %s' % (locale, ''.join(sorted(chars))))

# ── Syne (docs/adr/0014) only sets the film's chapter words, in capitals, so it is checked against exactly those. ──
gaps = {}
for path in sorted(glob.glob(os.path.join(root, 'messages', '*.json'))):
    locale = os.path.basename(path)[:-5]
    if locale in SYSTEM_FONT_LOCALES:
        continue
    with open(path, encoding='utf-8') as handle:
        film = json.load(handle).get('Film', {})
    for n in range(1, 5):
        word = film.get('c%dWord' % n)
        if word is None:
            continue
        # text-transform: uppercase, with Turkish dotted/dotless i rules under lang="tr"
        word = word.replace('i', 'İ').upper() if locale == 'tr' else word.upper()
        for ch in word:
            if not ch.isspace() and ord(ch) not in syne:
                gaps.setdefault(ch, set()).add(locale)

if gaps:
    for ch, locales in sorted(gaps.items()):
        print('NOT COVERED by Syne: %r U+%04X in %s' % (ch, ord(ch), ', '.join(sorted(locales))))
    sys.exit(1)
print('OK: the film chapter words in capitals (Syne) are covered in en tr de fr es.')
