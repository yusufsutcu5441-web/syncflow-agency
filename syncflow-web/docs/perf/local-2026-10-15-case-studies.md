# Yerel ölçüm: vaka incelemesi katmanı, Stüdyo, simülatörler (ADR 0020), ana dal ile A/B

- **Tarih:** 15.10.2026
- **Ölçülen:** dal `feat/case-studies` (yeni) ile `main` `5ea0b64` (eski), ikisi de üretim derlemesi, aynı makinede, **aralıklı** (yeni, eski, yeni, eski ...). Her derleme kendi adresini `NEXT_PUBLIC_SITE_URL` olarak aldı (`http://localhost:3100` ve `:3101`), yoksa canonical canlı alana işaret eder ve SEO düşer.
- **Araç ve profil:** `npm run perf -- --runs=3 --desktop=3 --paths=/ --out=perf-out/ab-0020 new=http://localhost:3100 old=http://localhost:3101` (Lighthouse 13.5.0, başsız Chrome 154, Windows 11). Mobil: 412×823 ×1,75, simüle yavaş 4G, 4× CPU yavaşlatma. Masaüstü: Lighthouse masaüstü ön ayarı. Sayfa: `/` (giriş kapısı açık).
- **Sınır (önemli):** **canlı değil, yerel**; üç koşu, bir makine, makine kullanıcının günlük makinesi (başka süreçler çalışıyor), **koşular arası dağılım geniş**. Yayınlanan sayılar (`lib/metrics.ts`) bu ölçümle **değişmez**: onlar canlı sitenin 14.10.2026 mührüdür ve yeni sürüm canlıya çıkınca yeniden ölçülüp mühürlenir. Bu belge yalnızca "yeni katman bir gerileme getirdi mi" sorusunu yanıtlar.

## Sonuçlar (medyan)

| Profil | Derleme | n | Performans | LCP | TBT | CLS | JS (dosya) | Toplam |
|---|---|---|---|---|---|---|---|---|
| Mobil | **yeni** | 3 | 86 | **3.107 ms** | 339 ms | 0 | 174 KB (12) | **385 KB** |
| Mobil | eski (`main`) | 3 | 91 | 3.387 ms | 98 ms | 0 | 171 KB (10) | 409 KB |
| Masaüstü | **yeni** | 3 | 92 | **694 ms** | 223 ms | 0 | 189 KB (14) | **355 KB** |
| Masaüstü | eski (`main`) | 3 | 92 | 748 ms | 220 ms | 0 | 185 KB (12) | 379 KB |

İkinci bir aralıklı koşu (4 mobil + 2 masaüstü; bu sırada Stüdyo ve footer için denenip **geri alınan** bir `content-visibility` deneyi vardı, sonuç yine de gürültünün boyutunu gösterir): mobil yeni **83** (TBT 138–669 ms), mobil eski **85,5** (TBT 124–388 ms), masaüstü yeni 92,5, masaüstü eski 93; LCP yeni 3,05–3,29 sn, eski 3,39–3,51 sn.

## Nasıl okunmalı

1. **Masaüstü eşit** (92 / 92; TBT 223 / 220 ms) ve **CLS her koşuda 0**; simülatörler canlıya geçerken de CLS 0,00 (tarayıcı akışında ölçüldü).
2. **LCP yeni derlemede daha iyi** (mobil ≈ 250–300 ms, masaüstü ≈ 55 ms): sayfa toplamı 409 → 385 KB ve 379 → 355 KB'a indi, çünkü sektör klipleri artık `<video poster>` değil **tembel `<img>`** ile geliyor (poster öznitelikli görüntü ekrandan uzak da olsa sayfa yüklenirken iner). Poster 1080p oldu ve 4 × 14–40 KB'tır; tembel olduğu için ilk yüke binmiyor.
3. **Mobilde puan 5 puana kadar düşük çıktı, ama bu gürültünün içinde:** aynı derlemenin TBT'si koşular arasında 55 ile 669 ms arasında oynadı (eski derleme 55–388, yeni 138–669). Puan farkının tamamı TBT'dendir (CLS, LCP ve FCP eşit ya da yeni lehine). Üç koşuyla 100–200 ms'lik bir TBT farkı ayırt edilemez; **gerçek bir artış olabilir** ve aşağıdaki neden olası.
4. **Olası neden (doğrulanmış bir ölçüm, nedensellik değil):** ana sayfanın DOM'u **652 → 1.035 düğüme** (+%59), HTML'i 132 → 196 KB'a çıktı (Stüdyo bölümü, iki simülatörün boşta çizimi, 15 SVG bayrak). 4× yavaşlatılmış CPU ile yükleme sonrası Chrome sayaçları: toplam görev 1.974 → 2.170 ms (+%10), yerleşim 468 → 609 ms, stil 286 → 324 ms, betik 236 → 268 ms. JS neredeyse aynı: ilk yük parçaları 34,3 → 36,2 KB gzip (+1,9 KB), yeni iki küçük parça. Yani maliyet kod boyutundan değil, **daha çok DOM'un yerleşimi ve hidrasyonundan** geliyor.
5. **Denenen ve geri alınan:** Stüdyo ve footer için `content-visibility: auto` yerleşimi 609 → 564 ms'ye indirdi (kazanç küçük); kaydırma sırasında kutu boyutu kestirimi, çapa bağlantılarının konumu ve CLS için gerçek cihazda sınanmadığı için **geri alındı**.

## Ölçülmeyenler ve sonraki adım

Canlı ağ üzerinde ölçüm, gerçek telefon, `/`'ten başka sayfalar (28 inceleme sayfası ve `/showcase/...` ölçülmedi), diyalog açıkken ve simülatörler canlıyken kare süresi, saha verisi (CrUX). Canlıya alındıktan sonra `npm run perf -- --runs=3 --desktop=3 --paths=/ live=https://syncflow.agency` ile yeniden ölçülür; çıkan medyanlar `lib/metrics.ts`'e (tarih, profil, kaynak) yazılır. Mobil TBT'nin gerçekten arttığı çıkarsa seçenekler: sunucuda boşta çizilen simülatör gövdesini küçültmek, Stüdyo notlarının gövdesini hidrasyonsuz (`dangerouslySetInnerHTML`) çizmek, menüdeki bayrakları ilk açılışta çizmek.
