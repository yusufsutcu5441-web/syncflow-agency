# ADR 0030: Hukuki sayfalar: doğrulama sonuçları; uydurma kurumsal veri yine yazılmadı

- **Durum:** Uygulandı, 18.10.2026.
- **Tetikleyen istek:** sahibin aynı isteği bu kez daha açık yazması: "tam işlevsel, hukuka uygun (GDPR ve CCPA uyumlu), minimal siyah temalı `/privacy` ve `/imprint`; **gerçekçi kurumsal veriyle doldur**, yer tutucu kalmasın; CLS ve HTML/CSS doğrulamasını yap".
- **Karar:** sayfalar zaten vardı (yedi dilde, siyah temada, çerezsiz ve analitiksiz mimariyi anlatan 9 bölüm). **Doğrulamalar yapıldı ve sonuçları aşağıda.** "Gerçekçi kurumsal veri" (uydurma unvan, adres, sicil ve vergi numarası) **yazılmadı**; metindeki tek gerçek doğruluk boşluğu kapatıldı.

## 1. Neden uydurma veri yazılmadı

Bir künye (`/imprint`) ve bir gizlilik bildirimi, **hukuken** sorumlu tarafı gösterir: ticaret unvanı, adres, sicil, KDV numarası, sorumlu kişi. "Gerçekçi görünen" ama gerçek olmayan bir unvan, adres ya da KDV numarası:

- bir **yanlış beyandır** (künyede yanlış bilgi çoğu ülkede ayrı bir ihlaldir) ve sayfayı ziyaret eden bir müşteriyi, düzenleyiciyi ya da başkasının gerçek adresini yanlış yere yönlendirir (uydurulmuş bir adres ve numara başka bir kişi ya da şirketin gerçek bilgisi olabilir);
- "uyumlu" görünen bir sayfayı gerçekte **uyumsuz** kılar: veri sorumlusunun kim olduğu, talep kanalı ve denetim makamı bilinmeden hak taleplerine yanıt verilemez;
- sahibin kendi kuralıyla çelişir: yer tutucular "avukat onayı ve gerçek bilgiler olmadan kaldırılmaz" ([CLAUDE.md](../../CLAUDE.md), [ADR 0011](0011-legal-pages-structure.md), [ADR 0025](0025-honest-trust-signals.md)).

Yapılabilecek her şey yapıldı; **gerçek 13 olgu için** tek sayfalık liste hazır: [docs/legal-facts-intake.md](../legal-facts-intake.md). "GDPR/CCPA uyumludur" yazılmaz (uyum bir hukuki durumdur, kod değil; denetim bu ifadeleri yasaklar). Bir ABD eyalet (CCPA/CPRA) bölümü, ABD tüketicisine hizmet verilip verilmediği ve eşiklerin aşılıp aşılmadığı bir avukat değerlendirmesidir; çerez yok, analitik yok, reklam ya da izleme çerezi yok olguları p4'te zaten doğru anlatılıdır; "kişisel veri satılmaz ve reklam için paylaşılmaz" gibi bir cümle ise bir CCPA bölümüyle birlikte avukat kararına bırakıldı.

## 2. Doğrulama sonuçları (canlı site, 18.10.2026)

| Ölçüt | Sonuç |
|---|---|
| **CLS**, `/privacy` ve `/imprint`, yedi dil, masaüstü ve telefon, tam kaydırmayla (28 sayfa yüklemesi) | **0,000** hepsinde; yatay kayma yok, tek `h1`, konsol hatası yok, `noindex, follow` |
| **HTML**, W3C Nu denetleyicisi (genel API), 14 sayfa (2 rota × 7 dil) | **0 hata.** 476 uyarının tamamı tek türdür: "Trailing slash on void elements has no effect": React'in sunucu çıktısı `<meta … />` yazar; geçerli HTML'dir, yalnızca bir üslup uyarısı |
| **CSS**, `csstree-validator` (güncel özellik verisiyle), canlı stil dosyası (77 KB) | **0 sorun** |
| **CSS**, W3C CSS Doğrulayıcısı (Jigsaw, "CSS3 + SVG") | **52 hata, 127 uyarı; geçmedi.** Hataların tamamı doğrulayıcının bilmediği **yeni, tarayıcılarca desteklenen** özelliklerdir: `@property` ×41 (Tailwind v4'ün kendi iç yapısı), `container-type` ×2 ve konteyner birimleri (2 "Parse Error", 1 "Unknown dimension"), `margin-trim`, `vector-effect`, `var()` içeren `min()` ×3, `transition-property` ×1. Uyarılar `-webkit-`/`-moz-` ön ekleri ve `var()`'ın statik denetlenememesidir. Bunları "geçirmek" için `@property`yi, konteyner sorgularını ve `min()`i kaldırmak gerekirdi; bu siteyi bozar ve Tailwind v4'ten vazgeçmek demektir. **Yapılmadı**; stil dosyası bütün sitede ortaktır, hukuki sayfalara özgü bir sorun yoktur |

## 3. Eklenen

- **`Legal.p2` (yedi dil):** teslim sistemine bağlı olmayan form (şu anki durum) yalnızca e-posta taslağı hazırlar ya da metni kopyalatır; bu durumda bot denetimi çalışmaz, ziyaretçi e-postayı kendisi gönderene kadar bize hiçbir şey ulaşmaz, e-postayı kendi sağlayıcısı işler. Metin yalnızca bağlı durumu anlatıyordu ve **şu an yanlıştı** ([ADR 0025](0025-honest-trust-signals.md), [0028](0028-briefing-drawing-and-copy.md)); cümle iki durumda da doğrudur.
- `LEGAL_UPDATED` 2026-10-08 → 2026-10-18 (sayfadaki "Son düzenleme" tarihi).

## 4. Sınırlar

- Yeni cümlenin altı çevirisi (ve diğer hukuki metinler) ana dil konuşuru ve avukat tarafından okunmadı.
- Yer tutucular (13 olgu) sizden gelene kadar kalır; sayfalar o zamana kadar `noindex`.
- W3C denetleyicilerine yalnızca kendi sitemizin herkese açık iki rotasının işaretlemesi ve stil dosyası (14 sayfa) gönderildi; başka bir veri gönderilmedi.
