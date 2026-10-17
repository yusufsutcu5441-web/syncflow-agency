# Fonts in this folder (share cards, app/og/route.tsx)

| File | Font | License |
|---|---|---|
| `og-inter-display-600.ttf` | Inter Display (static SemiBold, built by `scripts/build-fonts.py` from the official InterVariable) | SIL Open Font License 1.1, Copyright The Inter Project Authors |
| `og-noto-sans-sc-700.otf` | Noto Sans SC Bold, a subset holding only the Chinese share card's characters (`scripts/build-og-fonts.py`) | SIL Open Font License 1.1, Copyright The Noto Project Authors |
| `og-noto-sans-arabic-600.ttf` | Noto Sans Arabic SemiBold, a subset holding only the Arabic share card's characters; used by `scripts/render-og-card-ar.mjs` to draw `og-ar.png` | SIL Open Font License 1.1, Copyright The Noto Project Authors |

The subsets are modified versions of the original fonts (glyphs removed), kept under the same license; the license text and URL stay in each file's
`name` table. Full text: https://openfontlicense.org/open-font-license-official-text/. The fonts are not sold on their own.

`og-ar.png` is a picture of text set in Noto Sans Arabic; `og-ar.json` records the strings it was rendered from (`scripts/check-fonts.py` compares it with `messages/ar.json`).
