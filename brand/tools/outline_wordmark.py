#!/usr/bin/env python3
"""
SYNCFLOW wordmark'ını bir fontla yazıp EĞRİYE ÇEVİRİR ve B1 monogramıyla yatay kilit üretir.

Kullanım (Satoshi Medium dosyasını Fontshare'den kendiniz indirin):
    pip install fonttools uharfbuzz
    python outline_wordmark.py Satoshi-Medium.otf --tracking 0.14 --out ../satoshi

Üretilen dosyalar (--out öneki ile):
    <önek>-wordmark-platin.svg, <önek>-wordmark-obsidian.svg
    <önek>-lockup-horizontal-platin.svg, <önek>-lockup-horizontal-obsidian.svg

Notlar:
- Kerning HarfBuzz ile uygulanır, liga kapalıdır; tracking em cinsindendir.
- Büyük harf yüksekliği (cap) monogram biriminde 2,0'dır: yani yatay kilitte monogramın %44'ü
  (özel çizim wordmark ile aynı oran), böylece iki seçenek birebir kıyaslanır.
- Lisans: font dosyası bu depoya eklenmez. Fontshare Free Font EULA'yı (FFL.txt) okuyun ve
  fontun logo/marka kullanımına izin verdiğini doğrulayın. Bu betik hukuki doğrulama yapmaz.
"""
import argparse, sys
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

B1_D = "M1.896 0.75 L0.646 2.0 L1.896 3.25 L3.896 3.25 L4.646 4.0 L3.896 4.75 L1.0 4.75 L1.0 5.25 L4.104 5.25 L5.354 4.0 L4.104 2.75 L2.104 2.75 L1.354 2.0 L2.104 1.25 L5.0 1.25 L5.0 0.75Z"
B1_VB = (0.6464, 0.75, 4.7071, 4.5)   # (x, y, w, h) monogram birimi
PLATIN, OBSIDIAN = "#E2E2E6", "#0D0D0E"

def fmt(v): return f"{v:.3f}".rstrip("0").rstrip(".")

def build(font_path, text, tracking, cap_target):
    blob = hb.Blob.from_file_path(font_path)
    face = hb.Face(blob); hbfont = hb.Font(face); upem = face.upem
    buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
    hb.shape(hbfont, buf, {"kern": True, "liga": False, "clig": False})
    tt = TTFont(font_path); gs = tt.getGlyphSet(); cmap = tt.getBestCmap()
    bp = BoundsPen(gs); gs[cmap[ord("H")]].draw(bp); cap = bp.bounds[3]
    s = cap_target / cap                        # birim/em ölçeği
    baseline = 3.0 + cap_target / 2             # cap merkezi = monogram merkezi (y=3.0)
    pen_path, pen_bounds = SVGPathPen(gs), BoundsPen(gs)
    x = 0.0
    n = len(buf.glyph_infos)
    for i, (info, pos) in enumerate(zip(buf.glyph_infos, buf.glyph_positions)):
        name = tt.getGlyphName(info.codepoint)
        t = (s, 0, 0, -s, (x + pos.x_offset) * s, baseline - pos.y_offset * s)
        gs[name].draw(TransformPen(pen_path, t)); gs[name].draw(TransformPen(pen_bounds, t))
        x += pos.x_advance + (tracking * upem if i < n - 1 else 0)
    return pen_path.getCommands(), pen_bounds.bounds

def svg(vb, body, title):
    x, y, w, h = vb
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{fmt(x)} {fmt(y)} {fmt(w)} {fmt(h)}" '
            f'role="img" aria-label="{title}"><title>{title}</title>{body}</svg>\n')

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("font"); ap.add_argument("--text", default="SYNCFLOW")
    ap.add_argument("--tracking", type=float, default=0.14, help="em cinsinden harf aralığı (varsayılan 0.14)")
    ap.add_argument("--cap", type=float, default=2.0, help="cap yüksekliği, monogram biriminde")
    ap.add_argument("--gap", type=float, default=1.4, help="monogram ile wordmark arası, birim")
    ap.add_argument("--out", default="satoshi")
    a = ap.parse_args()

    d, b = build(a.font, a.text, a.tracking, a.cap)
    x0, y0, x1, y1 = b
    mx, my, mw, mh = B1_VB
    for cname, col in (("platin", PLATIN), ("obsidian", OBSIDIAN)):
        wm = svg((x0, y0, x1 - x0, y1 - y0), f'<path fill="{col}" d="{d}"/>', a.text)
        open(f"{a.out}-wordmark-{cname}.svg", "w", encoding="utf-8").write(wm)
        # kilit: monogram solda, wordmark sağda
        shift = (mx + mw + a.gap) - x0
        body = (f'<path fill-rule="evenodd" fill="{col}" d="{B1_D}"/>'
                f'<g transform="translate({fmt(shift)} 0)"><path fill="{col}" d="{d}"/></g>')
        top = min(my, y0); bot = max(my + mh, y1)
        lk = svg((mx, top, (x1 + shift) - mx, bot - top), body, "SyncFlow")
        open(f"{a.out}-lockup-horizontal-{cname}.svg", "w", encoding="utf-8").write(lk)
    print("Hazır:", a.out + "-wordmark-*.svg ve " + a.out + "-lockup-horizontal-*.svg",
          "| genişlik/yükseklik oranı:", round((x1 - x0) / (y1 - y0), 2))

if __name__ == "__main__":
    sys.exit(main())
