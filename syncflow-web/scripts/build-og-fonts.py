#!/usr/bin/env python
"""
Builds the two share-card fonts for Arabic and Chinese (docs/adr/0026-share-cards-in-arabic-and-chinese.md).

The share card (app/og/route.tsx) is drawn by satori, which needs a font file that has the glyphs. Inter Display (assets/og-inter-display-600.ttf)
has no Arabic and no Han characters, so those cards were set in English. This script cuts a small subset out of the official Noto fonts (SIL OFL 1.1,
https://openfontlicense.org), only the characters the card draws in that language: the two headline lines and the subtitle (messages/<locale>.json,
Hero.title1, Hero.title2, Meta.ogSubtitle) plus the digits and punctuation a retouched sentence will want. Arabic keeps its shaping tables (GSUB, GPOS),
so letters still join.

  python scripts/build-og-fonts.py <NotoSansArabic-SemiBold.ttf> <NotoSansSC-Bold.otf>

Sources: github.com/notofonts/notofonts.github.io (NotoSansArabic, hinted/ttf/NotoSansArabic-SemiBold.ttf) and github.com/notofonts/noto-cjk
(Sans/SubsetOTF/SC/NotoSansSC-Bold.otf). Needs `pip install fonttools brotli`. scripts/check-fonts.py fails if a card string needs a character these
files do not have, so changing the copy never prints empty boxes unnoticed.
"""
import json
import sys
from pathlib import Path

from fontTools import subset

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
EXTRA = "0123456789 .,:;!?-–—·()«»“”‘’\"'/&+%"


def card_text(locale: str) -> str:
    data = json.loads((ROOT / "messages" / f"{locale}.json").read_text(encoding="utf-8"))
    return "".join([data["Hero"]["title1"], data["Hero"]["title2"], data["Meta"]["ogSubtitle"], EXTRA])


def build(source: Path, target: Path, text: str, shaping: bool) -> None:
    options = subset.Options()
    # Arabic keeps every shaping table: the card is rendered by a browser (scripts/render-og-card-ar.mjs), which reads all of them. Chinese goes through
    # satori on request and needs only kerning.
    options.layout_features = ["*"] if shaping else ["kern"]
    options.name_IDs = [1, 2, 3, 4, 6, 13, 14]  # family, style, id, full name, postscript, license text and url (OFL asks to keep them)
    options.notdef_outline = True
    options.hinting = False
    options.desubroutinize = True
    font = subset.load_font(str(source), options)
    subsetter = subset.Subsetter(options)
    subsetter.populate(text=text)
    subsetter.subset(font)
    subset.save_font(font, str(target), options)
    print(f"{target.relative_to(ROOT)}: {target.stat().st_size / 1024:.1f} KB, {len(set(text))} characters")


def main() -> None:
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    arabic, chinese = Path(sys.argv[1]), Path(sys.argv[2])
    build(arabic, ASSETS / "og-noto-sans-arabic-600.ttf", card_text("ar"), shaping=True)
    build(chinese, ASSETS / "og-noto-sans-sc-700.otf", card_text("zh"), shaping=False)


if __name__ == "__main__":
    main()
