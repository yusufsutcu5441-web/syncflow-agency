#!/usr/bin/env python3
"""
Builds assets/og-inter-600.ttf: a STATIC Inter SemiBold (wght 600) covering Latin + the Turkish letters,
used by the Open Graph image route. (next/og's renderer reads TTF/OTF/WOFF, not WOFF2, and does not apply variable
font axes, so the variable web fonts in public/fonts cannot be used there.)

Needs:  pip install fonttools brotli
Run:    python scripts/build-og-font.py
"""
import os
import tempfile

from fontTools.merge import Merger
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
sources = [
    os.path.join(root, 'public', 'fonts', 'inter-latin-v1.woff2'),
    os.path.join(root, 'public', 'fonts', 'inter-turkish-v1.woff2'),
]
target = os.path.join(root, 'assets', 'og-inter-600.ttf')

with tempfile.TemporaryDirectory() as tmp:
    statics = []
    for index, path in enumerate(sources):
        font = TTFont(path)
        static = instancer.instantiateVariableFont(font, {'wght': 600}, inplace=False)
        static.flavor = None
        out = os.path.join(tmp, f'static-{index}.ttf')
        static.save(out)
        statics.append(out)
    Merger().merge(statics).save(target)

merged = TTFont(target)
print(f'wrote {os.path.relpath(target, root)}: {os.path.getsize(target) // 1024} KB, {len(merged.getBestCmap())} characters')
print('has Turkish letters:', all(c in merged.getBestCmap() for c in map(ord, 'ĞğİŞş')))
