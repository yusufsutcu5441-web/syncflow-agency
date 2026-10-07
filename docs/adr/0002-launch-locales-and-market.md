# ADR 0002: Lansman dilleri, dil ile pazar ayrımı ve URL tabanlı dil

- **Durum:** Kabul edildi, 07.10.2026 (Faz 2)
- **Karar:** proje sahibi ("Sadece TR/EN dilleri kalsın"). Uygulama: Faz 2.

## Bağlam

CLAUDE.md lansman dillerini TR + EN olarak dondurdu. DE, FR, ES, AR, JA mimaride hazır bekler ve her biri yerel çeviri ve hukuk incelemesinden sonra açılır (örneğin sağlık reklamı kuralları ülkeye göre değişir). Kod ise `en, tr, de, fr, it` yönlendiriyordu; ayrıca `NEXT_LOCALE` çerezi ve tarayıcı diline göre yönlendirme açıktı. Bu, CLAUDE.md'deki "seçim URL'de tutulur, çerez yok" ve "zorla yönlendirme yok" kurallarıyla çelişiyordu. İtalyanca CLAUDE.md'nin listesinde hiç yoktu.

## Karar

1. **Diller:** `en` (varsayılan, `/`) ve `tr` (`/tr`). `de`, `fr`, `it` yönlendirmeden ve `messages/` klasöründen çıkarıldı (dosyalar git geçmişinde: `4ef99e0`). `/de` gibi adresler 404 döner.
2. **Dil ile pazar ayrı kavramlardır.** Dil URL'dedir ve yalnızca metni belirler. Pazar (para birimi ve fiyat aralığı) ayrıdır, URL'de tutulur ve çerez gerektirmez; para biçimi `Intl.NumberFormat` ile verilir.
3. **Çerez yok, otomatik yönlendirme yok:** `localeCookie: false` ve `localeDetection: false` birlikte. Çerez olmadan algılama açık kalsaydı, Türkçe tarayıcıdaki ziyaretçi "EN"i seçtiğinde `/` onu yeniden `/tr`'ye atardı ve dil seçici bozulurdu. İleride dil önerisi, yönlendirme yapmayan kısa bir öneri satırı olarak eklenebilir.
4. `hreflang`, `sitemap.xml`, `og:locale` ve JSON-LD yalnızca açık dilleri listeler; hepsi `routing.locales`'tan türetilir.
5. `<html dir="ltr">`: iki dil de soldan sağa. RTL bir dil (AR) eklenince `dir` dile bağlanır. CSS'te mantıksal özellikler kullanılır (CLAUDE.md).

## Fiyat kararı ile ilişkisi (uygulanmış değil)

CLAUDE.md'deki fiyat kararı: yurt dışı başlangıç tabanı $10.000, Türkiye ₺100.000–₺500.000+, Avrupa için € karşılığı tanımlanana kadar yayınlanmaz. **Kodda bu kararın uygulaması henüz yok:** site hâlâ eski sabit $2.500 teklifini gösteriyor (`lib/site.ts`, `messages/*.json`). Tek kaynak dosyası Faz 5–6'da oluşturulur. CLAUDE.md `src/config/pricing.ts` adını veriyor ama repoda `src/` klasörü yok; yol **açık bir karardır** (öneri: `lib/pricing.ts`).

## Yeni dil açma kontrol listesi

1. Yerel çeviri ve hukuk incelemesi.
2. `messages/xx.json` (en.json ile aynı anahtarlar), `i18n/routing.ts` ve `LOCALE_LABELS`.
3. `npm run check`, ardından `scripts/check-fonts.py`. AR ve JA için ayrı bir OFL font yığını gerekir (Satoshi'nin AR/JA glifleri doğrulanmadı).
4. `remotion/Root.tsx` ve `scripts/render-film.mjs` dil listeleri, sonra `npm run film:render`.
5. `scripts/smoke.mjs` beklentileri.

## Sonuçlar

- **+** Davranış belirleyici ve önbellek dostudur (aynı URL, aynı içerik). Çerez beyanı gerekmez.
- **−** Varsayılan dil `en` olduğu için Türkiye'den gelen ziyaretçi `/` adresinde İngilizce görür. Varsayılan dili ya da bir öneri satırını sonra değerlendirin; bu bir ürün kararıdır.
- **−** Silinen de/fr/it çevirileri yayına hazır değildi (yerel gözden geçirme yapılmamıştı). Geri istenirse `4ef99e0`'dan alınır.
