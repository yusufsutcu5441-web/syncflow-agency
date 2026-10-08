# Faz 2 performans başlangıcı ("boş kabuk")

- **Tarih:** 07.10.2026
- **Ölçülen kod:** `faz_2` dalı, commit `d981af8`, üretim derlemesi.
- **Karşılaştırma:** `4ef99e0` (Faz 2 öncesi anlık görüntü). `git archive` ile ayrı bir dizine çıkarıldı, `npm ci` ve aynı ortam değişkeniyle derlendi, yeni sürümle aynı anda ayakta tutuldu.
- **Amaç:** Faz 2 sonunda sitenin başlangıç skorunu kayda geçirmek. Faz 3–8 kapıları bununla karşılaştırılır. Bu ölçüm **Hero ve Spec sheet henüz yeniden yapılmamış** siteye aittir (içerik hâlâ eski teklif: $2.500, Lemon Squeezy).

## Yöntem

- Derleme: `NEXT_PUBLIC_SITE_URL=http://localhost:3100 npm run build`. Canonical bağlantı yerel adresi göstermezse Lighthouse SEO puanını düşürür; canlıda bu sorun yoktur. Sunucu: `npx next start -p 3100`. Eski sürüm 3101'de.
- Araç: `npm run perf` (`scripts/lighthouse.mjs`): Lighthouse 13.5.0, Chrome 154 (headless). Koşular **aralıklı** yapıldı (yeni, eski, yeni, eski …), böylece makinenin yavaş kayması iki sürümü de aynı etkiler.
- Mobil profil, Lighthouse'un varsayılanı: Moto G Power emülasyonu (412×823, ×1,75), **simüle** yavaş 4G (RTT 150 ms, 1.638 Kbps indirme), 4× CPU yavaşlatma. Masaüstü: `--preset=desktop`.
- Tekrar: mobil `/` ve `/tr` için 7'şer, masaüstü `/` için 3 koşu. Tablolar **medyan** verir; puan ve TBT için aralık da yazılıdır. Tüm ham koşular aşağıda.
- Makine: Windows 11 ev bilgisayarı. Ölçüm sırasında başka ağır iş çalıştırılmadı; ancak sahibinin tarayıcısı ve boşta bir `next dev` sunucusu açıktı. CLAUDE.md "başka ağır süreç çalışmıyorken" der; bu koşul tam sağlanmadı, bu yüzden TBT aralıkları geniştir.
- Yerel `next start` HTTP/1.1 ve gzip sunar. Canlıda (HTTP/2, Brotli) aynı ya da daha iyi beklenir; doğrulama canlı adreste PageSpeed Insights ile yapılmalı.

## Sonuç (medyan, aralık)

| Profil | Sayfa | Sürüm | n | Performans (aralık) | FCP | LCP | TBT (aralık) | CLS | Hız İndeksi | TTFB | İlk yükleme JS (gzip, dosya) | Toplam |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Mobil | `/` | Faz 2 öncesi | 7 | **92** (89–95) | 1,1 sn | 2,8 sn | 228 ms (142–315) | 0 | 1,2 sn | 69 ms | 180 KB (12) | 257 KB |
| Mobil | `/` | **Faz 2 sonu** | 7 | **95** (87–96) | 1,0 sn | 2,8 sn | 147 ms (58–373) | 0 | 1,1 sn | 70 ms | 155 KB (11) | 260 KB |
| Mobil | `/tr` | Faz 2 öncesi | 7 | **86** (83–96) | 0,9 sn | 2,8 sn | 420 ms (95–512) | 0 | 1,1 sn | 61 ms | 180 KB (12) | 256 KB |
| Mobil | `/tr` | **Faz 2 sonu** | 7 | **90** (84–95) | 0,9 sn | 2,8 sn | 274 ms (82–482) | 0 | 1,1 sn | 73 ms | 155 KB (11) | 263 KB |
| Masaüstü | `/` | Faz 2 öncesi | 3 | **100** (100–100) | 0,3 sn | 0,6 sn | 32 ms (16–56) | 0 | 0,6 sn | 87 ms | 275 KB (13) | 352 KB |
| Masaüstü | `/` | **Faz 2 sonu** | 3 | **100** (99–100) | 0,3 sn | 0,6 sn | 22 ms (5–89) | 0 | 0,5 sn | 65 ms | 155 KB (11) | 251 KB |

Erişilebilirlik, en iyi uygulamalar ve SEO: her iki sürümde, tüm koşularda **100**.

## Nasıl okunmalı

1. **Mobil puan ve TBT'de fark ölçülemedi.** Medyanlar yeni sürümde daha iyi görünüyor (92→95, 86→90; TBT 228→147, 420→274), ama aralıklar büyük ölçüde çakışıyor ve tek bir sürüm bile koşudan koşuya 87–96 arasında oynuyor. Bunu iyileşme diye yazmıyorum.
2. **Kesin olan fark ilk yükleme JS'inde** (aktarılan, gzip): mobilde 180 → 155 KB (−25 KB, `framer-motion` tabanlı efekt katmanı gitti), masaüstünde 275 → 155 KB (−120 KB: efekt katmanı ve ~94 KB'lık Remotion Player parçası). Masaüstünde toplam aktarım 352 → 251 KB. Sebep: masaüstü penceresinde Showcase, 700 px ön yükleme payının içinde kaldığı için eski sürüm Player'ı sayfa açılışında indiriyordu.
3. **Telefonda Remotion açılışta inmiyordu.** Mobilde Hero uzun olduğu için film 700 px payının dışında kalıyor (eski sürümde açılış JS'i 180 KB, Remotion parçası ek). [ADR 0003](../adr/0003-showcase-film-static-render.md)'ün ilk taslağındaki "telefonda açılışta yükleniyor olmalı" çıkarımı **mobil için yanlış** çıktı, masaüstü için doğruydu. Remotion'un telefondaki maliyeti, ziyaretçi filme yaklaştığında ortaya çıkıyor; Lighthouse kaydırmadığı için bunu görmez (aşağıya bakın).
4. **Mobil LCP ≈ 2,8 sn, CLAUDE.md hedefi ≤ 2,5 sn'nin üstünde.** Her iki sürüm de aşıyor; bu Faz 4 kapısının işidir. Bir koşuda LCP öğesi Hero alt başlığıdır (`p.lead`, düz metin): TTFB 78 ms, öğe oluşturma gecikmesi 348 ms.
5. **CLS 0.** Film çerçevesinin oranı sabit olduğu için poster ile video değişiminde kayma yok.
6. **İlk yükleme JS'i 155 KB**, CLAUDE.md'nin önerdiği ~150 KB tavanının biraz üstünde. Faz 3 `motion` ve `Lenis` ekleyecek (yalnızca masaüstü, dinamik import); paket analizcisinde mobil ilk yükte bunların olmadığı Faz 3 kapısında doğrulanmalı.
7. **TTFB ≈ 65–70 ms** (yerel): nonce'lu CSP'nin istek başına render maliyetinin ölçüsü ([ADR 0001](../adr/0001-csp-report-only.md)). Statik/önbellekli HTML ile karşılaştırma Faz 7'de, canlı ortamda yapılmalı.

## Kaydırma maliyeti (telefon): Lighthouse'un görmediği kısım

Telefon 390×844, simüle yavaş 4G (RTT 150 ms, 1,6 Mbps), 4× CPU yavaşlatma, önbellek kapalı, 5 koşu medyan. Sayfa açıldıktan sonra filme kaydırılır ve 7 saniye beklenir (son satırda 0,5 sn sonra Oynat'a basılır). Ana iş parçacığı değerleri `Performance.getMetrics` (`ScriptDuration`, `TaskDuration`) farkıdır.

| Sürüm | Açılışta JS | Filme kaydırınca ek JS | Ek medya | Ana iş parçacığı: betik | Ana iş parçacığı: görevler |
|---|---|---|---|---|---|
| Faz 2 öncesi (canlı Player, kendiliğinden oynar) | 180 KB | +95 KB | – | 3.182 ms | 6.594 ms |
| Faz 2 sonu, poster (dokunmatikte oynamaz) | 155 KB | 0 | 0 | 33 ms | 339 ms |
| Faz 2 sonu, Oynat'a basılmış | 155 KB | 0 | 645 KB (MP4) | 187 ms | 1.633 ms |

Eski Player'ın parçası ham 311,5 KB, gzip 94,1 KB'dır. Yedi saniyelik pencerede betik süresi yaklaşık yarıya, görev süresi neredeyse tamamına çıkıyordu (yavaşlatılmış CPU'da). Yeni sürümde film oynarken bile betik süresi ~%94, görev süresi ~%75 düşük. Bayt tarafında dürüst not: **izlenen film, Player'ın JS'inden daha fazla bayt indirir** (645 KB, 94 KB'a karşı). Kazanç bayt toplamında değil, ana iş parçacığında ve "ziyaretçi istemeden hiçbir şey inmemesi"ndedir.

Bu test betiği depoda değildir (tek seferlik doğrulama); yöntemi yukarıda tamdır.

## Sınırlar

- Tek makine, yerel sunucu, simüle kısıtlama. RUM (gerçek kullanıcı ölçümü) değil.
- Gerçek bir orta segment Android ve iPhone'da ölçüm yapılmadı; Faz 7 kapısı bunu ister.
- Örnek sayısı küçük (mobil 7, masaüstü 3) ve TBT gürültülü. Faz kapılarında karşılaştırma yapılırken en az aynı n ve aralıklı koşu kullanılmalı.
- Bu ölçüm yalnızca ana sayfa (`/`, `/tr`). Gizlilik, künye ve 404 sayfaları ölçülmedi.

## Ham koşular

Sıra, koşu sırasıdır (aralıklı). "Sonu" = Faz 2 sonu (`d981af8`), "öncesi" = `4ef99e0`.

| # | Profil | Sayfa | Sürüm | Perf | FCP ms | LCP ms | TBT ms | CLS | SI ms | JS KB | Toplam KB |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | mobil | `/` | sonu | 96 | 1092 | 2484 | 128 | 0 | 1105 | 155 | 260 |
| 2 | mobil | `/` | öncesi | 92 | 1138 | 2790 | 228 | 0 | 1295 | 180 | 257 |
| 3 | mobil | `/tr` | sonu | 86 | 935 | 2848 | 395 | 0 | 1201 | 155 | 263 |
| 4 | mobil | `/tr` | öncesi | 93 | 922 | 2762 | 194 | 0 | 922 | 180 | 256 |
| 5 | mobil | `/` | sonu | 95 | 980 | 2774 | 147 | 0 | 980 | 155 | 260 |
| 6 | mobil | `/` | öncesi | 89 | 1120 | 2792 | 315 | 0 | 1129 | 180 | 257 |
| 7 | mobil | `/tr` | sonu | 93 | 1006 | 2928 | 161 | 0 | 1021 | 155 | 263 |
| 8 | mobil | `/tr` | öncesi | 85 | 943 | 2848 | 435 | 0 | 1142 | 180 | 256 |
| 9 | mobil | `/` | sonu | 87 | 1037 | 2791 | 365 | 0 | 1298 | 155 | 260 |
| 10 | mobil | `/` | öncesi | 94 | 1081 | 2813 | 167 | 0 | 1353 | 180 | 257 |
| 11 | mobil | `/tr` | sonu | 91 | 931 | 2818 | 240 | 0 | 1061 | 155 | 263 |
| 12 | mobil | `/tr` | öncesi | 96 | 1065 | 2582 | 95 | 0 | 1106 | 180 | 256 |
| 13 | mobil | `/` | sonu | 88 | 1022 | 2747 | 341 | 0 | 1249 | 155 | 260 |
| 14 | mobil | `/` | öncesi | 94 | 1121 | 2739 | 168 | 0 | 1142 | 180 | 257 |
| 15 | mobil | `/tr` | sonu | 95 | 1063 | 2784 | 82 | 0 | 1063 | 155 | 263 |
| 16 | mobil | `/tr` | öncesi | 86 | 910 | 2775 | 420 | 0 | 974 | 180 | 256 |
| 17 | mobil | `/` | sonu | 87 | 935 | 2748 | 373 | 0 | 1104 | 155 | 260 |
| 18 | mobil | `/` | öncesi | 90 | 1103 | 2741 | 285 | 0 | 1211 | 180 | 257 |
| 19 | mobil | `/tr` | sonu | 88 | 1048 | 2788 | 335 | 0 | 1246 | 155 | 263 |
| 20 | mobil | `/tr` | öncesi | 94 | 914 | 2781 | 164 | 0 | 914 | 180 | 256 |
| 21 | mobil | `/` | sonu | 95 | 1085 | 2822 | 58 | 0 | 1110 | 155 | 260 |
| 22 | mobil | `/` | öncesi | 90 | 1077 | 2909 | 253 | 0 | 1276 | 180 | 257 |
| 23 | mobil | `/tr` | sonu | 90 | 918 | 2785 | 274 | 0 | 1098 | 155 | 263 |
| 24 | mobil | `/tr` | öncesi | 84 | 966 | 2805 | 476 | 0 | 1137 | 180 | 256 |
| 25 | mobil | `/` | sonu | 95 | 938 | 2777 | 127 | 0 | 938 | 155 | 260 |
| 26 | mobil | `/` | öncesi | 95 | 1088 | 2713 | 142 | 0 | 1088 | 180 | 257 |
| 27 | mobil | `/tr` | sonu | 84 | 917 | 2760 | 482 | 0 | 1249 | 155 | 263 |
| 28 | mobil | `/tr` | öncesi | 83 | 951 | 2795 | 512 | 0 | 1231 | 180 | 256 |
| 29 | masaüstü | `/` | sonu | 100 | 278 | 645 | 22 | 0 | 482 | 155 | 251 |
| 30 | masaüstü | `/` | öncesi | 100 | 319 | 635 | 32 | 0 | 575 | 275 | 352 |
| 31 | masaüstü | `/` | sonu | 100 | 314 | 620 | 5 | 0 | 445 | 155 | 251 |
| 32 | masaüstü | `/` | öncesi | 100 | 315 | 592 | 16 | 0 | 498 | 275 | 352 |
| 33 | masaüstü | `/` | sonu | 99 | 549 | 796 | 89 | 0 | 898 | 155 | 251 |
| 34 | masaüstü | `/` | öncesi | 100 | 358 | 673 | 56 | 0 | 602 | 275 | 352 |

Lighthouse profili: `{"lighthouse":"13.5.0","formFactor":"mobile","throttlingMethod":"simulate","throttling":{"rttMs":150,"throughputKbps":1638.4,"requestLatencyMs":562.5,"downloadThroughputKbps":1474.56,"uploadThroughputKbps":675,"cpuSlowdownMultiplier":4},"screenEmulation":{"mobile":true,"width":412,"height":823,"deviceScaleFactor":1.75}}`, Chrome 154 headless, Windows 11.

## Nasıl tekrar ölçülür

```bash
# Her faz sonunda: üretim derlemesi (canonical yerel adresi göstersin), sonra sunucu
$env:NEXT_PUBLIC_SITE_URL = 'http://localhost:3100'; npm run build      # PowerShell
npx next start -p 3100

# başka bir terminalde: tek hedef ya da aynı anda ayakta tutulan önceki sürümle aralıklı A/B
npm run perf -- --runs=7 --desktop=3 new=http://localhost:3100
npm run perf -- --runs=7 --desktop=3 new=http://localhost:3100 old=http://localhost:3101
```

Önceki sürümü karşılaştırma için ayağa kaldırmak: `git archive --format=zip -o ..\baseline.zip <commit>`, kısa bir yola (Windows'un 260 karakter sınırı için) çıkarıp `npm ci`, `NEXT_PUBLIC_SITE_URL=http://localhost:3101` ile derleyip `npx next start -p 3101`. Ham raporlar `perf-out/` altına yazılır (git'e girmez); sonuçlar bu klasördeki gibi bir belgeye işlenir.
