#!/usr/bin/env python3
"""
Font coverage guard (needs: pip install fonttools brotli).

The site ships two self-hosted Instrument Sans subsets (public/fonts, built by scripts/build-fonts.py):
  instrument-sans-latin-v1.woff2    Basic Latin + Latin-1 + common punctuation (EN, DE, FR, ES)
  instrument-sans-turkish-v1.woff2  Only the Turkish letters outside Latin: G-breve, I-dot, S-cedilla (and Y-diaeresis)

This script fails when any character used in the Latin-script messages (en tr de fr es) is in neither file, because that
character would silently render in the fallback font. Run it whenever you add a language or change copy:
    python scripts/check-fonts.py
"""
import glob
import json
import os
import re
import sys

from fontTools.ttLib import TTFont

root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
latin = set(TTFont(os.path.join(root, 'public', 'fonts', 'instrument-sans-latin-v1.woff2')).getBestCmap())
turkish = set(TTFont(os.path.join(root, 'public', 'fonts', 'instrument-sans-turkish-v1.woff2')).getBestCmap())
covered = latin | turkish
turkish_only = turkish - latin

# Arabic, Chinese and Japanese are set in system font stacks on purpose (app/globals.css :lang rules), so Instrument Sans is not
# expected to cover them. These two symbols are drawn by the system symbol font in every language; listing them here makes
# that a decision instead of a silent fallback.
SYSTEM_FONT_LOCALES = {'ar', 'zh', 'ja'}
SYMBOL_FALLBACK = {'⌘', '✓', '₺'}  # keyboard hint, "copied" tick, lira sign (the Turkish briefing's amounts are formatted at run time by Intl; Instrument Sans has no U+20BA, the system font draws it)

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

print('OK: every character in the Latin-script messages (en tr de fr es) is covered by the Latin or Turkish font file.')
for locale, chars in sorted(turkish_use.items()):
    print('  %s uses glyphs from the Turkish file: %s' % (locale, ''.join(sorted(chars))))

# ── Cinematic type (docs/adr/0014): each family only sets certain strings, so each is checked against exactly those. ──
def cmap(*names):
    out = set()
    for name in names:
        out |= set(TTFont(os.path.join(root, 'public', 'fonts', name)).getBestCmap())
    return out


serif = cmap('instrument-serif-latin-v1.woff2', 'instrument-serif-latin-ext-v1.woff2')
syne = cmap('syne-latin-v1.woff2', 'syne-latin-ext-v1.woff2')
cabinet_path = os.path.join(root, 'public', 'fonts', 'cabinet-grotesk-500.woff2')
cabinet = cmap('cabinet-grotesk-500.woff2') if os.path.exists(cabinet_path) else None


def role_strings(locale, data):
    """(family, text) pairs: what each family actually renders in this locale."""
    hero, film, nav, header = data.get('Hero', {}), data.get('Film', {}), data.get('Nav', {}), data.get('Header', {})
    for key in ('title1', 'title2'):
        if key in hero:
            yield 'Instrument Serif', hero[key]
    for n in range(1, 5):
        if 'c%dLine' % n in film:
            yield 'Instrument Serif', film['c%dLine' % n]
        if 'c%dWord' % n in film:
            word = film['c%dWord' % n]
            # text-transform: uppercase, with Turkish dotted/dotless i rules under lang="tr"
            word = word.replace('i', 'İ').upper() if locale == 'tr' else word.upper()
            yield 'Syne', word
    for key in ('ctaPrimary', 'ctaSecondary'):
        if key in hero:
            yield 'Cabinet Grotesk', hero[key]
    for group in (nav, header):
        for value in group.values():
            if isinstance(value, str):
                yield 'Cabinet Grotesk', value
    # Entry gate (docs/adr/0015, 0018): the title is set in Instrument Serif; the region names and the buttons in Cabinet Grotesk. (The
    # card headings are the languages' own names, set in each language's font; Arabic and Chinese in system stacks.)
    gate = data.get('Gate', {})
    if 'title' in gate:
        yield 'Instrument Serif', gate['title']
    for key in ('us', 'tr', 'me', 'dach', 'fr', 'wealth', 'asia', 'enter', 'skip'):
        if key in gate:
            yield 'Cabinet Grotesk', gate[key]


faces = {'Instrument Serif': serif, 'Syne': syne, 'Cabinet Grotesk': cabinet}
gaps = {}
for path in sorted(glob.glob(os.path.join(root, 'messages', '*.json'))):
    locale = os.path.basename(path)[:-5]
    if locale in SYSTEM_FONT_LOCALES:
        continue
    with open(path, encoding='utf-8') as handle:
        data = json.load(handle)
    for family, text in role_strings(locale, data):
        if faces[family] is None:
            continue
        text = re.sub(r'<[^>]+>', '', text)
        text = re.sub(r'\{[^}]+\}', '', text)
        for ch in text:
            if ch.isspace() or ch in SYMBOL_FALLBACK:
                continue
            if ord(ch) not in faces[family]:
                gaps.setdefault((family, ch), set()).add(locale)

if gaps:
    for (family, ch), locales in sorted(gaps.items()):
        print('NOT COVERED by %s: %r U+%04X in %s' % (family, ch, ord(ch), ', '.join(sorted(locales))))
    sys.exit(1)
print('OK: headlines (Instrument Serif), chapter words in capitals (Syne) and button/navigation text (%s) are covered in en tr de fr es.' % ('Cabinet Grotesk' if cabinet else 'Cabinet Grotesk not downloaded here: skipped'))
