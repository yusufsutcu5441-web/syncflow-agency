# Fotoğraf kaynakları

Sitedeki sahne filmlerinin kaynakları. Üç sektör filmi artık Remotion render'ı değil, **lisanslı fotoğraflar üzerinde kamera hareketidir** (ADR 0038 bölüm 12 ve 14). Bu belge, hangi filmin hangi fotoğraftan yapıldığını ve fotoğrafçısını kayıt altında tutar; sitede fotoğrafçı adı, konum ya da kurum adı yazmaz.

## clinic-2 (özel klinik sahnesi) — 24.11.2026

| Sahne | Fotoğraf | Fotoğrafçı | Lisans |
|---|---|---|---|
| A (geniş: koridor) | https://unsplash.com/photos/hallway-with-paneled-walls-and-art-mISkLiMzypI | Enio Pereira da Silva | Unsplash ücretsiz lisansı |
| B (yakın: oturma köşesi) | https://unsplash.com/photos/a-row-of-wooden-chairs-sitting-next-to-each-other-uzEWY67n-xE | Kimia Kazemi | Unsplash ücretsiz lisansı |

## law-2 (kurumsal hukuk sahnesi) — 24.11.2026

| Sahne | Fotoğraf | Fotoğrafçı | Lisans |
|---|---|---|---|
| A (geniş: kütüphane rafları) | https://unsplash.com/photos/photo-of-library-shelves-GWCvnsMtiBg | Annie Spratt | Unsplash ücretsiz lisansı |
| B (yakın: toplantı masası) | https://unsplash.com/photos/a-conference-room-with-a-large-wooden-table-and-leather-chairs-znrDHyqHpSI | Bennie Bates | Unsplash ücretsiz lisansı |

## estate-2 (lüks gayrimenkul sahnesi) — 24.11.2026

Dosyalar sahibin kendisi tarafından teslim edildi (`estate-klip.zip`); kaynak fotoğrafların adresleri depoda yoktur. Sahibin beyanı: Unsplash lisanslı fotoğraflardan kamera hareketi (aydınlık bir salon, ardından altın saatte bir liman). Teslim edilen `estate-2.mp4` ve `estate-2.webp` bir **C2PA içerik kimliği** taşır ("Anthropic Files 1.0.0"); ayrıntı ve sahibin açık kararı ADR 0038 bölüm 12'de.

| Sahne | Fotoğraf | Fotoğrafçı | Lisans |
|---|---|---|---|
| A ve B | kullanıcıdan alındı (adres kayıtlı değil) | bilinmiyor | sahibin beyanı: Unsplash ücretsiz lisansı |

## Remotion render'ı olarak kalanlar

`monolith` (mimari) ve `logistics` (lojistik) sahneleri hâlâ `remotion/scenes` içindeki kodun render'ıdır (`npm run film:render`); hiçbir fotoğraf kullanmazlar. `remotion/scenes/Estate.tsx`, `Clinic.tsx` ve `Law.tsx` dosyaları silinmedi, yalnızca varsayılan render koşusunun dışında bırakıldı (`scripts/render-film.mjs`).

## Yöntem (clinic-2 ve law-2)

Fotoğraflar Unsplash'in kendi indirme ucundan tam çözünürlükte alındı; **"Unsplash+" etiketli (ücretli) hiçbir fotoğraf kullanılmadı**, hesap açılmadı, ödeme yapılmadı. Her aday ölçüldü (genişlik ≥ 3000 px, ortalama parlaklık 70–170, patlak beyaz < %2, keskinlik) ve gözle denetlendi: kişi yok, okunabilir yazı/logo/marka/bayrak/tabela yok, tanınabilir ünlü yapı yok. İki fotoğraf 8 saniyelik kusursuz döngüye `_klip-isi/photo_loop.py` ile çevrildi (1,5× supersample, yavaş pan ve hafif zoom, 1 sn çapraz geçiş, 4+4 sn), sonra H.264 (CRF 24) ve VP9 (CRF 33) olarak kodlandı, poster 48. kareden WebP (kalite 82). Çalışma klasörü depo dışındadır ve commit edilmemiştir.
