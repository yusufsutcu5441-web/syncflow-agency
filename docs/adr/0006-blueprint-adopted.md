# ADR 0006: Blueprint esas alındı (görsel dil, teklif, vitrin, briefing, 7 dil)

- **Durum:** Kabul edildi, 08.10.2026 (Faz 4–5). [ADR 0005](0005-blueprint-faz-4-5.md)'in on sorusuna sahibinin yanıtı. **Görsel token'ları (saf siyah `#000000`, `#0a0a0a`, beyaz metin), metin wordmark'ı ve Inter [ADR 0007](0007-tokens-and-brand.md) ile değişti** (obsidian `#0D0D0E`, platin, şampanya, Instrument Sans, B1/v2 logo); aşağıdaki 1. satırın sayıları tarihsel kayıttır.
- **Karar:** proje sahibi: "Tüm önerileri onaylıyorum, Blueprint esas alınarak uygulamaya geçilsin", on madde (aşağıda). CLAUDE.md "sahibi değiştirirse önce bu dosya ve denetim betiği güncellenir" kuralı gereği önce CLAUDE.md ve `faz2-denetim.mjs` güncellendi, sonra kod yazıldı.

## Sahibin kararı ve uygulaması

| # | Karar | Uygulama |
|---|---|---|
| 1 | Görsel dil: Blueprint mimarisi | Saf siyah zemin, `#0a0a0a` kart, `#ffffff1a` cam kenarlık, `#ffffff40` hover, hap düğmeler, mono büyük harf etiketler, Border Beam, imleç spotlight'ı, manyetik düğme, bulanık üst bar. [ADR 0004](0004-motion-and-smooth-scroll.md)'ün seçenek B'si uygulandı. |
| 2 | $2.500 ve Lemon Squeezy kalksın, yerine Strategic Briefing | Ödeme katmanı, fiyat, karşılaştırma, SSS, iletişim formu ve `/api/contact` kaldırıldı; `/api/briefing` geldi. CSP'den Lemon Squeezy çıktı, Turnstile girdi. |
| 3 | Vitrin: Gayrimenkul, Klinik, SaaS | Üç kart. Sapmalar (gerçeklik/hukuk): "konsept render" etiketi, örnek yüzde rozetleri ve "önce-sonra galerileri" çıkarıldı, "View Case" yerine Briefing bağlantısı. |
| 4 | Briefing ana sayfaya entegre | `#briefing` bölümü. Başvuru akışında smooth scroll olmaması için panel `data-lenis-prevent` taşır. |
| 5 | Blueprint'in 4 adımı | Proje türü, yatırım ($5k–$10k, $10k–$20k, $20k+, önce konuşalım), zamanlama, iletişim. 4. ekrana ADR 0005'te onaylanan karar yetkisi sorusu ve işaretsiz rıza eklendi. |
| 6 | "24 saatte kişisel dönüş" korunur | Başarı ekranı Blueprint metniyle. |
| 7 | 7 dil altyapısı, AR için RTL, taslak çeviriler | `en tr de fr es ar ja`; `dir` dile bağlı; beş dil taslak. **Üretimde yayın listesi** `NEXT_PUBLIC_LAUNCHED_LOCALES` (varsayılan `en,tr`): önizlemede 7 dil açık, canlıya çıkarken liste tek satırla genişler. |
| 8 | Ölçülebilir ve doğrulanabilir metrikler | `lib/metrics.ts`: değer, tarih, profil, kaynak. Ölçülmeyenler "ölçülecek" ya da yok. |
| 9 | E-posta ve form altyapısı bağlansın | Form → imzalı webhook → n8n → Gmail → `contact@syncflow.agency` hazır; **webhook adresi, imza sırrı ve Turnstile anahtarları verilmediği için gerçek teslimat bu makinede doğrulanamadı** (sahte alıcıyla yük ve imza doğrulandı). Webhook ayarlı değilse form e-posta bağlantısı gösterir. |
| 10 | Faz 4 (Briefing) ve Faz 5 (7 dil ve SEO) | Ayrı dallar: `faz_4`, `faz_5`. |

## Blueprint'ten bilerek ayrılınanlar (gerekçe CLAUDE.md "Onaylı sapmalar")

Hepsi sahibin kendi kararıyla çelişmeyen, gerçeklik, hukuk ya da erişilebilirlik gerekçeli sapmalardır: doğrulanmamış performans iddiaları (60 FPS kilitli, 120 Hz, LCP < 1,2 sn, TBT < 50 ms, AV1, adaptif bitrate), kanıtsız örnek yüzdeler, sağlıkta önce-sonra, "üçüncü taraflarla paylaşılmaz" cümlesi (işleyiciler var), olmayan vaka sayfası bağlantısı, dönen küre (statik SVG), scroll-jacking (yerel `scroll-snap`), verilmeyen sosyal medya adresleri, hero alt metnindeki "ilk 400 ms / 120Hz için kalibre" cümleleri, "yaklaşık 90 saniye" (ölçülmedi) ve **%40 opaklıklı soluk metin ile `.agency` (%50 yapıldı)**: %40 beyaz siyah üstünde 3,65:1'dir, WCAG AA'nın 4,5:1'ini geçemez ve Lighthouse erişilebilirliğini 97'ye düşürdü (axe `color-contrast`, ilk ölçümde yakalandı). Sahibin "100/100 erişilebilirlik" isteği bu sapmayı gerektiriyor.

## Sonuçlar

- Tokenlar ve denetim betiği Blueprint'e göre yeniden yazıldı; denetim artık saf siyahı ve `#ffffff1a`'yı zorunlu sayar.
- Performans riskleri kayıt altındadır: üç Border Beam, spotlight ve dört video aynı anda çalışmaz (görünürlük kuralı, `data-pause-offscreen`, video `preload="none"`); ölçümler `docs/perf/faz4.md`.
- Beş taslak dil yerel çeviri ve hukuk incelemesi olmadan yayına alınmamalıdır; teknik olarak tek satırlık değişikliktir, hukuken değildir.
