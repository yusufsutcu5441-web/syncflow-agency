# Yerel ölçüm: üretim optimizasyonu ve kurumsal kanıt (ADR 0021), eski yapıyla A/B

- **Tarih:** 16.10.2026
- **Ölçülen:** dal `perf/enterprise-proof` (yeni, `:3100`) ile aynı dalın başlangıç noktası `feat/case-studies` (eski, `:3101`; ayrı bir kopya olarak derlendi), ikisi de üretim derlemesi, aynı makinede, **araya girerek** (yeni, eski, yeni, eski ...). Her derleme kendi adresini `NEXT_PUBLIC_SITE_URL` olarak aldı, yoksa canonical canlı alana işaret eder ve SEO düşer.
- **Araç ve profil:** `npm run perf` (Lighthouse 13.5.0, başsız Chrome 155, Windows 11). Mobil: 412×823 ×1,75, simüle yavaş 4G, 4× CPU yavaşlatma. Masaüstü: Lighthouse masaüstü ön ayarı, `/` (sayfa `?m=` almaz, kapı açık gelir). Ham raporlar `perf-out/ab-0021-worker` (masaüstü) ve `perf-out/ab-0021-worker-mobile` (git'e girmez).
- **Sınır (önemli):** **canlı değil, yerel**; tek makine, kullanıcının günlük makinesi. Ölçüm sırasında CPU yükü ≈%40'tı (kullanıcının kendi Chrome, Edge, VS Code, Creative Cloud süreçleri; denetlenmedi) ve Chrome ölçümler arasında 154'ten 155'e güncellendi; bu yüzden **bu belgenin sayıları ADR 0021 §8'in ilk tablosuyla karşılaştırılmaz**, yalnızca bu belgedeki eski/yeni sütunları birbiriyle karşılaştırılır. Yayınlanan sayılar (`lib/metrics.ts`) bu ölçümle **değişmez**.

## 1. Lighthouse (medyan; n = koşu sayısı)

| Profil | Derleme | n | Performans | Erişilebilirlik | En iyi uyg. | SEO | FCP | LCP | TBT | CLS | SI | JS (dosya) | Toplam |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Masaüstü | **yeni** | 6 | **100** | 100 | 100 | 100 | 321 ms | 734 ms | **0 ms** | 0 | 655 ms | 183 KB (14) | 367 KB |
| Masaüstü | eski | 6 | 98 | 100 | 100 | 100 | 353 ms | 685 ms | 110 ms | 0 | 762 ms | 189 KB (14) | 355 KB |
| Mobil | **yeni** | 5 | **92** | 100 | 100 | 100 | 1.061 ms | 3.154 ms | **149 ms** | 0 | 2.095 ms | 174 KB (11) | 387 KB |
| Mobil | eski | 5 | 81 | 100 | 100 | 100 | 910 ms | 3.119 ms | 526 ms | 0 | 2.170 ms | 174 KB (12) | 385 KB |

Tek tek koşular (performans): masaüstü yeni 99, 100, 100, 100, 100, 100; eski 99, 98, 98, 96, 98, 98 (TBT 104 ila 151 ms). Mobil yeni 86, 87, 93, 93, 92 (TBT 335, 302, 63, 76, 149); eski 86, 81, 86, 80, 80 (TBT 335, 526, 339, 549, 551). İki yapıda da **ilk iki mobil koşu 86 (TBT 335)** verdi: makine yükünün en yüksek olduğu an; bu yüzden kararlar tek koşuya değil sıralı karşılaştırmaya dayanır.

**Okuma.**

1. **Masaüstü yerelde dört kategoride de 100'dür** (bir koşu 99). Kazancın nedeni sinema motorunun ana iş parçacığından çıkmasıdır (§2): eski yapıda masaüstü TBT 104–151 ms, yenide altı koşunun altısında 0 ms.
2. **Mobil 92 ila 93'te bir tavan vardır.** Mobil LCP ≈3,1 sn (puan ≈0,78) her iki yapıda aynıdır: Lighthouse'un simülasyonu, gözlenen LCP'den önce biten her isteği (React + Next çalışma zamanı ≈120 KB gz, üç yazı tipi, CSS, HTML) kısıtlı ağda indirmeyi ve çalıştırmayı LCP yoluna katar; LCP öğesi (lead metni) ≈0,4 sn'de boyanır. TBT'yi sıfırlamak bile bu tavanı kaldırmaz. **Mobilde 100/100 bu mimaride bu ölçümle mümkün görünmüyor**; ulaşmak, ilk yükteki baytı azaltmayı gerektirir (çerçeve dışı bir yol: adalar, kısmi hidrasyon) ve bu işin kapsamı değildir.
3. Masaüstü LCP yeni yapıda ≈50 ms yüksek (734 / 685 ms, altı koşunun altısında tutarlı); puanı etkilemez (eşikten çok uzak), nedeni araştırılmadı.

## 2. Sinema motoru: ana iş parçacığı ve resim eşdeğerliği

Profil (`cinema-profile`, CPU profili + `longtask`, üç yükleme, `/?m=us`):

| | `getContext('webgl2')` | `getProgramParameter` | Uzun görevler (ms @ başlangıç) |
|---|---|---|---|
| Eski, yükleme 1 / 2 / 3 | 44 / 70 / 118 ms | 237 / 112 / 98 ms | 261 @1057 + 51 @1980; 228 @582 + 56 @880 + 74 @1335; 121 @1088 |
| Yeni, yükleme 1 / 2 / 3 | **yok** (ana iş parçacığında çağrı 0) | **0 ms** | yok; yok; 77 @1071 + 61 @1180 (büyük olasılıkla hidrasyon, ayrıştırılmadı) |

Resim: `?cinema-debug` kancasıyla zaman sabitlenip beş durumun (ortam, kozmik, organik, monolit, monolit-geç) 1280×720 kareleri eski yapıdan, yeni yapının worker yolundan ve ana iş parçacığı yolundan alındı: eski yapıya göre iki yeni yolda da **%0,000 piksel farkı**. Bu karşılaştırma `npm run qa:browser -- --only=cinema` içinde sürekli bir testtir (sabit monolit karesi iki yolda %0,05'in altı ve boş değil). Ayrıntı: [cinema.md §7](cinema.md).

## 3. Belirleyici sayaçlar (`npm run perf:gate`, mobil profil, ısınmadan sonra medyan)

| Metrik | Sessiz makine (ADR 0021 §8; eski → yeni) | Bu belgenin yükü altında (eski → yeni) | Bütçe |
|---|---|---|---|
| Yerleşim | 550 → 270 ms | 1.296 → 452 ms (−65 %) | ≤ 400 ms |
| Görev süresi | 1.733 → 1.308 ms | 2.960 → 1.975 ms (−33 %) | ≤ 1.500 ms |
| İlk boyama | 1.476 → 1.096 ms | 2.260 → 1.364 ms (−40 %) | ≤ 1.400 ms |
| Stil | n/a → n/a | 276 → 197 ms (−29 %) | ≤ 220 ms |
| Betik | n/a → n/a | 471 → 397 ms (−16 %) | ≤ 300 ms |
| TBT tahmini | n/a → n/a | 331 → 329 ms | ≤ 200 ms |
| DOM düğümü | 1.035 → 986 | 1.034 → 986 | ≤ 1.000 |
| CLS / uzun görev | n/a | 0 / 1 → 0 / 1 | ≤ 0,005 / ≤ 1 |

**Bu yük altındaki koşuda dört bütçe kontrolü (yerleşim, betik, görev, TBT) kırmızı verdi; iki yapı da aşıyor.** Bütçeler sessiz bir makinede, yeni ile eski arasına oturtuldu; makinede %40 başka yük varken eski yapı bile bunların iki ila üç katını gösteriyor. Bu bir uygulama gerilemesi değildir ama **kapı geçmedi** ve bu belge bunu yeşile boyamaz: geçerli olan aynı koşudaki göreli fark ve sessiz makinede alınan sütundur; kapı sessiz bir makinede yeniden koşulmadıkça "geçti" denmez.

Aynı oturumda bir kez daha koşuldu ve makine bu sefer daha da yoğundu (koşudan sonra bakıldığında benim süreçlerim yalnızca iki sunucuydu, artık başsız Chrome kalmamıştı; yükün kaynağı belirlenmedi): iki yapı da 3 ila 5 katına şişti (eski: yerleşim 3.564 ms, görev 8.427 ms, ilk boyama 5.036 ms; yeni: 1.140 / 5.194 / 2.200 ms; göreli fark −10 % ila −68 %, uzun görev yeni 4, eski 3: bu yükte gürültü). Sekiz kontrol kırmızı verdi (hepsi mutlak bütçe; "eskiden kötü" işareti uzun görevde çıktı ve gürültü içindedir). Bu koşu **hiçbir şey kanıtlamaz**; yalnızca kapının sessiz makine gerektirdiğini gösterir.

## 4. Testler ve denetimler (üretim derlemesi, `:3100`)

| Denetim | Sonuç |
|---|---|
| `npm run check` | 503 anahtar × 7 dil eşit, `tsc` ve ESLint temiz (1 uyarı: `de` `Sim.integration.kind.salesforce` İngilizceyle aynı: "Lead", gerçek sistem terimi) |
| `node faz2-denetim.mjs --build` | 212 geçti, 0 hata, 1 eski uyarı (`generateStaticParams`, ADR 0001), 4 bilgi |
| `npm run arch:verify` | 65 sözleşme testi geçti |
| `npm run smoke` | 180/180 |
| `npm run qa:browser` | 80/80 (kapı, bayraklar, dil menüsü, çapalar, derin bağlantı, CLS en/ar/de, simülatörler, entegrasyon, sinema); `--only=parity` 5/5; sinema grubu `CSP_MODE=enforce` ile ayrı bir sunucuda da 6/6 |

## 5. İstek maddelerine karşı durum

| İstek | Yapılan | Kanıt | Sınır |
|---|---|---|---|
| 1. DOM ve betik | `content-visibility: auto` ile altı blok, bayraklar tek öğe (−100 düğüm), yield'li başlatma, yüklemede geometri okuma yok, `useMemo`/`useCallback`, motor worker'da | §1 ve §2; DOM 1.035 → 986; yerleşim −65 % | İstekte sayfanın 1.035 düğümü anılıyordu: 986'ya indi (−49, %5: bayraklar −100, entegrasyon modeli +52). Asıl kazanç düğüm sayısında değil, ilk yerleşimde: atlanan altı blok ilk geçişe girmez (yerleşim −65 %). Lenis/Motion zaten tembel ve ilk etkileşimde yüklenir. Bölümleri `Suspense` ile akıtmak denendi ve reddedildi (ADR 0021 §7) |
| 2. Medya ve yazı tipi | Görseller zaten WebP, videolar H.264 + VP9, `priority` gerekmez (LCP bir metin), OFL yazı tipleri alt kümeli/`swap`/ölçü eşlenmiş | ADR 0021 §7 | **Cabinet Grotesk `font-display: optional` kaldı** (`swap` yerleşim kaydırır; ITF lisansı alt kümelemeyi yasaklar). AVIF eklenmedi (görseller zaten WebP; ek biçimin kazancı ölçülmedi) |
| 3. Kurumsal kanıt | `docs/architecture/` + `lib/arch/` + `tests/arch/` (65 test) ve sitede entegrasyon modeli | §4 | **Referanstır:** canlı bağlayıcı, ortaklık, sertifika, uyum, SLA yok; eşlemeler herkese açık adlandırmaya göre örnek şekillerdir, satıcı sandbox'ına karşı doğrulanmadı |
| 4. Dil ve CLS | Yedi dilde görünür metin gözden geçirildi (ADR 0021 §10); Arapçada CLS 0,00 | `qa:browser` CLS grubu (en/ar/de, üç genişlik) | Yerel konuşur ve hukuk incelemesi yok; Chrome'a özgü RTL kayma nedenleri giderildi, Safari/Firefox'ta sınanmadı |
| 5. QA | `smoke` genişletildi, `qa:browser`, `perf:gate` | §3 ve §4 | "TBT'yi sıfıra indir" bir söz değil, ölçülen kapıdır; mobil TBT medyanı eski 526 → yeni 149 ms, sıfır değil |

## 6. Ölçülmeyenler ve sonraki adım

- **Canlı ortam:** Vercel (HTTP/2, Brotli, gerçek ağ), PageSpeed Insights, CrUX. Canlı sayılar birleştirme ve yayından sonra `npm run live` ve `npm run perf -- live=https://syncflow.agency` ile ölçülüp `lib/metrics.ts`'e yazılır; canlıya alma ayrı bir karardır ve yapılmadı.
- **Gerçek GPU'lu masaüstü, Safari, Firefox, gerçek telefon, 120 Hz ekran, ekran okuyucu.** Worker'lı sinema yalnızca başsız Chrome'da (yazılım GL) sınandı.
- **Sessiz makinede `perf:gate`** (bütçeler yeniden doğrulanmadı) ve çok koşulu mobil A/B.
- Masaüstü LCP'sindeki ≈50 ms.
