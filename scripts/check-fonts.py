#!/usr/bin/env python3
"""
Font coverage guard (needs: pip install fonttools brotli).

The site ships two self-hosted Inter subsets (public/fonts):
  inter-latin-v1.woff2    Basic Latin + Latin-1 + common punctuation (EN, DE, FR, IT)
  inter-turkish-v1.woff2  Only the Turkish letters outside Latin: G-breve, I-dot, S-cedilla (and Y-diaeresis)

This script fails when any character used in messages/*.json is in neither file, because that character would
silently render in the fallback font. Run it whenever you add a language or change copy:
    python scripts/check-fonts.py
"""
import glob
import json
import os
import re
import sys

from fontTools.ttLib import TTFont

root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
latin = set(TTFont(os.path.join(root, 'public', 'fonts', 'inter-latin-v1.woff2')).getBestCmap())
turkish = set(TTFont(os.path.join(root, 'public', 'fonts', 'inter-turkish-v1.woff2')).getBestCmap())
covered = latin | turkish
turkish_only = turkish - latin

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
    with open(path, encoding='utf-8') as handle:
        data = json.load(handle)
    for text in strings(data):
        text = re.sub(r'<[^>]+>', '', text)  # rich-text tags
        text = re.sub(r'\{[^}]+\}', '', text)  # ICU placeholders
        for ch in text:
            if ord(ch) not in covered:
                missing.setdefault(ch, set()).add(locale)
            if ord(ch) in turkish_only:
                turkish_use.setdefault(locale, set()).add(ch)

if missing:
    for ch, locales in sorted(missing.items()):
        print('NOT COVERED: %r U+%04X in %s' % (ch, ord(ch), ', '.join(sorted(locales))))
    sys.exit(1)

print('OK: every character in messages/*.json is covered by the Latin or Turkish font file.')
for locale, chars in sorted(turkish_use.items()):
    print('  %s uses glyphs from the Turkish file: %s' % (locale, ''.join(sorted(chars))))
