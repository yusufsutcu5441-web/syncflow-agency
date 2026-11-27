# Film kaynakları

Sitedeki sahne filmlerinin kaynakları. **27.11.2026'dan beri** (ADR 0038 bölüm 23) yayındaki adlar `estate-5`, `clinic-5`, `law-5`, `monolith-5`, `logistics-2`'dir ve depo ayrıca üç **dikey telefon sürümü** taşır (`estate-m-5`, `clinic-m-5`, `law-m-5`; henüz hiçbir bileşen kullanmaz). Beş yayın filminden dördü sahibin 27.11.2026 teslimidir ve **zemini doğrudan sayfanın `#1c1915`'i ile üretilmiştir** (derecelendirme adımı yok); `logistics-2`, bölüm 22'nin derecelendirmesiyle kalan Remotion türevidir. Eski kuşakların kayıtları aşağıda, tarih düşürülerek duruyor.

## Yayındaki filmler — 27.11.2026 teslimi (`syncflow-klipler-v3.zip`, bölüm 23)

**Teslim ve doğrulama.** `syncflow-klipler-v3.zip` (Downloads, 27.11.2026 21:45; 11.030.329 B) içindeki `MANIFEST.md5` 21 dosyanın 21'iyle eşleşti ve `monolith.mp4`'ün md5'i brief'in sabitlediği değerin aynısıydı (`83ee6e3e3d63c62077309987f1bf2f7c`). ffprobe: yatay dört film H.264 (MP4) + VP9 (WebM) **1920 × 1080**, dikey üç film **1080 × 1350**; hepsi 30 fps, 8,00 sn, **240 kare** (webm'ler `-count_frames` ile sayıldı), ses yok; WebP posterler kendi ailesinin boyutunda. Kodlanmış kenar zemini (kenar halkasının modu, üç karede): üç sektör ailesi ve dikeyleri **(26,21,18)**, monolith **(28,23,20)** — sayfa zemini (28,25,21)'den sapma kanal başına ≤ 4, yani kodlayıcı kaybı aralığında ve sayfadaki ≤ 8 kuralının içinde; **derecelendirme uygulanmadı** (brief'in kendi kuralı). Eşleme: `klinik→clinic-5`, `hukuk→law-5`, `emlak→estate-5`, `monolith→monolith-5`, dikeyler `*-m-5`.

| Dosya | Ne gösteriyor | Sahte alan adı | Not |
|---|---|---|---|
| `clinic-5` | "Seren" — estetik, diş ve longevity kliniği konsept sitesi | `seren-klinik.com` | Sıcak zeminde yeşil vurgu; yumuşak bir küre grafiği dışında fotoğraf yok |
| `law-5` | "ARAL" — kurumsal hukuk ve danışmanlık konsept sitesi | `aral-hukuk.com` | Sıcak zeminde şampanya vurgu; çizgisel kemer grafiği dışında fotoğraf yok |
| `estate-5` | "KIYI" — seçilmiş gayrimenkul konsept sitesi | `kiyi-gayrimenkul.com` | Sıcak zeminde şampanya vurgu; **fotoğraf içerir** (aşağıda) |
| `monolith-5` | Koyu zeminde yavaşça dönen, parlak yüzeyli obsidyen bir levha; altında şampanya renkli ışık havuzu ve yansıma | — | **three.js ile sıfırdan render** (başsız Chromium, yazılım WebGL; ince dithering bantlaşmayı giderir). Sahne kaynağı depoda değildir; üretim sahibin beyanıdır, ölçülebilir nitelikler (boyut, kare, zemin) yukarıda doğrulanmıştır |

Üç sektör filmi, bölüm 21'deki konsept sitelerin **sıcak zeminde yeniden üretilmiş kayıtlarıdır**: her karede solda masaüstü tarayıcı penceresi, sağda telefon; ikisi de aynı sayfayı kaydırır ve pencerenin sağ üst köşesinde **"ÖRNEK TASARIM"** damgası durur. Dikey `-m-5` dosyaları **aynı konsept sayfaların telefon-only kayıtlarıdır** (tek telefon çerçevesi, damga üstte). Firma adları, adresler ve içerik kurgusaldır; site metinleri Türkçedir.

**Fotoğraflar.** `clinic-5` ve `law-5` fotoğraf içermez (tipografi ve vektör; kare kare bakıldı). `estate-5` ve `estate-m-5` fotoğraf **içerir**: hero'da bir kıyı yerleşiminin hava görüntüsü, portföy bölümünde iç mekân fotoğrafları. Bu fotoğrafların kaynağı ve lisansı **bu teslimde beyan edilmedi** ve depoda kaydı yoktur; önceki kuşağın "iki fotoğraf sahibin kendi çektiğidir" beyanı (bölüm 21) bu yeni içeriği kapsamaz. **Sahibin kaynak beyanı beklemektedir** (rapora not düşüldü); beyan gelene kadar bu dosya "fotoğrafların kaynağı beyan edilmedi" der ve siteye fotoğraf kaynağına dair bir iddia yazılmaz.

**Boyutlar (B).** Yatay: `estate-5` 1.547.374 / 908.026 / 101.010, `law-5` 1.110.110 / 674.667 / 43.290, `clinic-5` 988.225 / 620.491 / 48.030, `monolith-5` 499.164 / 136.367 / 7.112, `logistics-2` 845.141 / 712.134 / 27.220. Dikey: `estate-m-5` 1.019.657 / 636.634 / 50.518, `clinic-m-5` 963.581 / 474.241 / 32.604, `law-m-5` 710.096 / 499.621 / 29.426. Klasör toplamı **24 dosya, 12.684.739 B ≈ 12,7 MB**.

## Kullanımdan kalktı: `-4` yayın kuşağı ve `-3` teslimi (25.11.2026 → 27.11.2026)

**Bu kuşak 27.11.2026'da kullanımdan kalktı** (yerine yukarıdaki `-5` teslimi girdi; `-4` adları 404 kilidindedir). Kayıt, zincirin izi kalsın diye duruyor. — Dosyaları sahibin kendisi teslim etti (`sektor-klipleri.zip`, 25.11.2026 13:12) ve `-3` adlarıyla depoya aynen girdi. Aynı gün ikinci brief'le sayfa zemini #1c1915'e taşınınca üç film **kanala göre doğrusal bir eşlemeyle** (filmin kendi zemini → `#1c1915`, beyaz 255 sabit; ffmpeg `lutrgb`, H.264 CRF 22 / VP9 CRF 33 / WebP 82) yeniden kodlandı ve `-4` adlarıyla yayına girdi; **yayındaki baytlar artık teslim edilen baytların derecelendirilmiş türevidir**, kompozisyona ve kurguya dokunulmadı. Her karede solda masaüstü tarayıcı penceresi, sağda telefon vardır; ikisi de aynı sayfayı kaydırır ve tarayıcı penceresinin sağ üst köşesinde **"ÖRNEK TASARIM"** damgası durur. Sitelerdeki metin Türkçedir; firma adları, adresler ve içerik **kurgusaldır**.

| Dosya | Konsept site | Sahte alan adı | Sahnede ne var |
|---|---|---|---|
| `clinic-4` | "Seren" — estetik, diş ve longevity kliniği | `seren-klinik.com` | Koyu zeminde yeşil vurgu; hero, üç adımlık süreç, randevu formu; grafik bir küre dışında fotoğraf yok |
| `law-4` | "ARAL" — kurumsal hukuk ve danışmanlık | `aral-hukuk.com` | Koyu zeminde şampanya vurgu; hero, üç maddelik yaklaşım, gizli talep formu; çizgisel bir kemer dışında fotoğraf yok |
| `estate-4` | "KIYI" — seçilmiş gayrimenkul | `kiyi-gayrimenkul.com` | Koyu zeminde şampanya vurgu; hero'da kıyı silueti fotoğrafı, telefonda bir salon fotoğrafı |

**Fotoğraflar.** `clinic-4` ve `law-4` hiç fotoğraf içermez (tamamı tipografi ve vektör). `estate-4`'teki iki fotoğraf sahibin beyanına göre **kendi çektikleridir**; depoda ayrıca bir lisans kaydı yoktur. Hiçbir dosyada stok fotoğraf kullanılmamıştır.

**Teslim ölçümü (`-3`, hepsi geçti, eşikler ADR 0038 bölüm 12/14 ile aynı).** Dokuz dosya: H.264 (MP4) ve VP9 (WebM), 1920 × 1080, 30 fps, 8,00 sn, 240 kare, ses yok, hepsi 4 MB altında; WebP posterler 1920 × 1080. Boyutlar: `clinic-3` 978.257 / 698.399 / 46.976 B, `law-3` 1.170.401 / 728.814 / 42.232 B, `estate-3` 1.502.402 / 1.005.902 / 99.790 B. Döngü dikişi (son kare → ilk kare) SSIM 0,9965 · 0,9958 · 0,9857; ortalama parlaklık 32,1 · 29,6 · 36,6. Üç dosyanın hiçbirinde **C2PA içerik kimliği yoktur** (bayt taramasıyla doğrulandı) — `estate-2`'de bulunan ve ADR 0038 bölüm 12'de sahibin kararına bırakılan kimlik, o dosya kullanımdan kalktığı için yayındaki sitede artık yoktur.

**Yayın ölçümü (`-4` + `logistics-2`, bölüm 22).** Aynı biçim kapılarının hepsi yeniden geçti (codec, 1920 × 1080, 30 fps, 8,00 sn, 240 kare, ses yok, < 4 MB). Boyutlar: `clinic-4` 1.702.385 / 668.611 / 43.362 B, `law-4` 1.958.080 / 716.510 / 38.600 B, `estate-4` 2.636.348 / 979.893 / 84.888 B, `monolith-4` 485.586 / 454.763 / 11.798 B, `logistics-2` 845.141 / 712.134 / 27.220 B. Kodlanmış çıktının kenar zemini üç biçimde de ölçüldü: `clinic-4`/`law-4`/`estate-4` (27,25,21), `monolith-4` (29,24,21) — hedef `#1c1915` = (28,25,21) ± 2 içinde; `logistics-2` tam-kare bir sahnedir (düz zemini yoktur), kenarı (33,28,27) ve sayfadaki kenar farkı kanal başına ≤ 6 kuralıyla tarayıcıda sınanır. Döngü dikişi SSIM 0,9948 · 0,9930 · 0,9806 · 0,9836 · 0,9701.

## Kullanımdan kalktı: fotoğraf tabanlı `-2` filmleri (24.11.2026 → 25.11.2026)

Aşağıdaki fotoğraflar `clinic-2` ve `law-2` filmlerinde kullanıldı. **Bu filmler 25.11.2026'da kullanımdan kalktı**; dosyalar depodan silindi ve adresleri 404 döner. Kayıt, ne kullanıldığının izi kalsın diye duruyor.

### clinic-2 (özel klinik sahnesi) — 24.11.2026, kullanımdan kalktı

| Sahne | Fotoğraf | Fotoğrafçı | Lisans |
|---|---|---|---|
| A (geniş: koridor) | https://unsplash.com/photos/hallway-with-paneled-walls-and-art-mISkLiMzypI | Enio Pereira da Silva | Unsplash ücretsiz lisansı |
| B (yakın: oturma köşesi) | https://unsplash.com/photos/a-row-of-wooden-chairs-sitting-next-to-each-other-uzEWY67n-xE | Kimia Kazemi | Unsplash ücretsiz lisansı |

### law-2 (kurumsal hukuk sahnesi) — 24.11.2026, kullanımdan kalktı

| Sahne | Fotoğraf | Fotoğrafçı | Lisans |
|---|---|---|---|
| A (geniş: kütüphane rafları) | https://unsplash.com/photos/photo-of-library-shelves-GWCvnsMtiBg | Annie Spratt | Unsplash ücretsiz lisansı |
| B (yakın: toplantı masası) | https://unsplash.com/photos/a-conference-room-with-a-large-wooden-table-and-leather-chairs-znrDHyqHpSI | Bennie Bates | Unsplash ücretsiz lisansı |

### estate-2 (lüks gayrimenkul sahnesi) — 24.11.2026, kullanımdan kalktı

Dosyalar sahibin kendisi tarafından teslim edilmişti (`estate-klip.zip`); kaynak fotoğrafların adresleri depoda yoktu. Sahibin beyanı: Unsplash lisanslı fotoğraflardan kamera hareketi (aydınlık bir salon, ardından altın saatte bir liman). Teslim edilen `estate-2.mp4` ve `estate-2.webp` bir **C2PA içerik kimliği** taşıyordu ("Anthropic Files 1.0.0"); ayrıntı ADR 0038 bölüm 12'de. Dosya kullanımdan kalktığı için o madde kapandı.

### Yöntem (clinic-2 ve law-2, kullanımdan kalktı)

Fotoğraflar Unsplash'in kendi indirme ucundan tam çözünürlükte alındı; **"Unsplash+" etiketli (ücretli) hiçbir fotoğraf kullanılmadı**, hesap açılmadı, ödeme yapılmadı. Her aday ölçüldü (genişlik ≥ 3000 px, ortalama parlaklık 70–170, patlak beyaz < %2, keskinlik) ve gözle denetlendi: kişi yok, okunabilir yazı/logo/marka/bayrak/tabela yok, tanınabilir ünlü yapı yok. İki fotoğraf 8 saniyelik kusursuz döngüye `_klip-isi/photo_loop.py` ile çevrildi (1,5× supersample, yavaş pan ve hafif zoom, 1 sn çapraz geçiş, 4+4 sn), sonra H.264 (CRF 24) ve VP9 (CRF 33) olarak kodlandı, poster 48. kareden WebP (kalite 82). Çalışma klasörü depo dışındadır ve commit edilmemiştir.

## Remotion kökenli film: logistics-2 (ve monolitin eski zinciri)

Yayında Remotion kökenli tek film **`logistics-2`**'dir: `remotion/scenes/Logistics.tsx` render'ı → sıcak zemin derecelendirmesi (bölüm 22). Fotoğraf kullanmaz. Monolitin **eski** zinciri — render → 1080p (bölüm 15) → kontrast derecelendirmesi (bölüm 19, `monolith-3`) → sıcak zemin derecelendirmesi (bölüm 22, `monolith-4`) — 27.11.2026'da kapandı: yayındaki `monolith-5` artık Remotion değil, **three.js render'ıdır** (yukarıda, bölüm 23). Remotion sahne dosyaları depoda durur (zeminleri bölüm 22'de sıcak aileye taşınmıştı), ama **hiçbir sahne varsayılan koşuda render edilmez** (`scripts/render-film.mjs`): her yayın dosyası sürümlü bir teslim ya da türevdir. Uykudaki aydınlık `Clinic.tsx` sahnesine dokunulmadı.
