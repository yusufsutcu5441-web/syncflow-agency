# Film kaynakları

Sitedeki sahne filmlerinin kaynakları. **25.11.2026'dan beri** üç sektör filmi (`estate-3`, `clinic-3`, `law-3`) ne Remotion render'ı ne de fotoğraf klibidir: kurgusal firmaların **konsept web sitelerinin masaüstü + telefon kaydırma kaydıdır** (ADR 0038 bölüm 21). Fotoğraf tabanlı `-2` dosyaları (bölüm 12 ve 14) kullanımdan kalktı; kayıtları aşağıda, tarih düşürülerek duruyor.

## Yayındaki üç sektör filmi — 25.11.2026

Dosyaları sahibin kendisi teslim etti (`sektor-klipleri.zip`, 25.11.2026 13:12); teslim edilen baytlar değiştirilmeden, yalnızca yeniden adlandırılarak depoya girdi. Her karede solda masaüstü tarayıcı penceresi, sağda telefon vardır; ikisi de aynı sayfayı kaydırır ve tarayıcı penceresinin sağ üst köşesinde **"ÖRNEK TASARIM"** damgası durur. Sitelerdeki metin Türkçedir; firma adları, adresler ve içerik **kurgusaldır**.

| Dosya | Konsept site | Sahte alan adı | Sahnede ne var |
|---|---|---|---|
| `clinic-3` | "Seren" — estetik, diş ve longevity kliniği | `seren-klinik.com` | Koyu zeminde yeşil vurgu; hero, üç adımlık süreç, randevu formu; grafik bir küre dışında fotoğraf yok |
| `law-3` | "ARAL" — kurumsal hukuk ve danışmanlık | `aral-hukuk.com` | Koyu zeminde şampanya vurgu; hero, üç maddelik yaklaşım, gizli talep formu; çizgisel bir kemer dışında fotoğraf yok |
| `estate-3` | "KIYI" — seçilmiş gayrimenkul | `kiyi-gayrimenkul.com` | Koyu zeminde şampanya vurgu; hero'da kıyı silueti fotoğrafı, telefonda bir salon fotoğrafı |

**Fotoğraflar.** `clinic-3` ve `law-3` hiç fotoğraf içermez (tamamı tipografi ve vektör). `estate-3`'teki iki fotoğraf sahibin beyanına göre **kendi çektikleridir**; depoda ayrıca bir lisans kaydı yoktur. Hiçbir dosyada stok fotoğraf kullanılmamıştır.

**Ölçüm (hepsi geçti, eşikler ADR 0038 bölüm 12/14 ile aynı).** Dokuz dosya: H.264 (MP4) ve VP9 (WebM), 1920 × 1080, 30 fps, 8,00 sn, 240 kare, ses yok, hepsi 4 MB altında; WebP posterler 1920 × 1080. Boyutlar: `clinic-3` 978.257 / 698.399 / 46.976 B, `law-3` 1.170.401 / 728.814 / 42.232 B, `estate-3` 1.502.402 / 1.005.902 / 99.790 B. Döngü dikişi (son kare → ilk kare) SSIM 0,9965 · 0,9958 · 0,9857; ortalama parlaklık 32,1 · 29,6 · 36,6. Üç dosyanın hiçbirinde **C2PA içerik kimliği yoktur** (bayt taramasıyla doğrulandı) — `estate-2`'de bulunan ve ADR 0038 bölüm 12'de sahibin kararına bırakılan kimlik, o dosya kullanımdan kalktığı için yayındaki sitede artık yoktur.

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

## Remotion render'ı olarak kalanlar

`monolith` (mimari) ve `logistics` (lojistik) sahneleri hâlâ `remotion/scenes` içindeki kodun render'ıdır (`npm run film:render`); hiçbir fotoğraf kullanmazlar. `remotion/scenes/Estate.tsx`, `Clinic.tsx` ve `Law.tsx` dosyaları silinmedi, yalnızca varsayılan render koşusunun dışında bırakıldı (`scripts/render-film.mjs`).
