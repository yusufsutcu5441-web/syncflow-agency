# Sinema katmanı ölçümleri

- **Tarih:** 12.10.2026
- **Ölçülen kod:** `main` dalının çalışma ağacı, sinema katmanı dahil (ölçüm sırasında commit edilmemişti; sonra `4bc5799` ile commit edildi ve `7cf5b50` ile canlıya alındı) ([ADR 0014](../adr/0014-cinematic-layer.md)). Üretim derlemesi: `NEXT_PUBLIC_SITE_URL=http://localhost:3101 npm run build`, `next start -p 3101` (3100 portunda 09.10'dan kalma eski bir sunucu vardı, ona dokunulmadı).
- **Makine:** Windows 11, Node 24.12, Chrome 154 (başsız), Lighthouse 13.5.0. Ölçümler arka arkaya, başka ağır işlem çalıştırılmadan alındı; kullanıcının makinesi olduğu için dışarıdan gelen yük **denetlenmedi**. **Tek makine, yerel sunucu (HTTP/1.1, gzip).** Saha verisi (CrUX/RUM) değildir.
- **Amaç:** sinema katmanının ([CLAUDE.md](../../CLAUDE.md) "Performans": her sinema değişikliğinden sonra mobil ve masaüstü ayrı ölçülür) ilk ölçümü. Bu katman için daha önce hiçbir ölçüm yoktu.

## 1. Lighthouse (`npm run perf` betiği, ham koşular `perf-out/cinema/`)

Mobil: 412×823 ×1,75, simüle yavaş 4G (RTT 150 ms, 1.638 Kbps), 4× CPU yavaşlatma. Masaüstü: `--preset=desktop`. Medyan ve aralık.

| Profil | Sayfa | n | Performans (aralık) | FCP | LCP | TBT (aralık) | CLS | Hız İndeksi | TTFB | JS (gzip, dosya) | Toplam |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Mobil | `/` | 3 | **94** (91–94) | 0,93 sn | 3,15 sn | 55 ms (51–141) | 0 | 1,5 sn | 35 ms | 157 KB (10) | 384 KB |
| Mobil | `/tr` | 3 | **86** (76–90) | 0,99 sn | 3,27 sn | 336 ms (169–391) | 0 | 1,75 sn | 52 ms | 157 KB (10) | 415 KB |
| Masaüstü | `/` | 2 | **91** (89–93) | 0,35 sn | 0,70 sn | 208 ms (179–236) | 0 | 1,7 sn | 69 ms | 171 KB (12) | 343 KB |

Erişilebilirlik, en iyi uygulamalar ve SEO: **100, tüm koşularda.** (SEO 100, derlemenin `NEXT_PUBLIC_SITE_URL`'inin yerel adres olmasına bağlıdır; ayarsız derlemede canonical canlı alan adını gösterir ve SEO 92'ye düşer.)

### Faz 4 ile karşılaştırma (08.10.2026, [faz4.md](faz4.md); farklı gün, farklı makine yükü)

| Profil | Sayfa | Faz 4 (sinemadan önce) | Şimdi |
|---|---|---|---|
| Mobil | `/` | 93 (90–95) · LCP 2,9 sn · TBT 152 ms · JS 156 KB | 94 (91–94) · LCP 3,15 sn · TBT 55 ms · JS 157 KB |
| Mobil | `/tr` | 90 (89–92) · LCP 3,1 sn · TBT 226 ms · JS 156 KB | 86 (76–90) · LCP 3,27 sn · TBT 336 ms · JS 157 KB |
| Masaüstü | `/` | 100 (100–100) · LCP 0,65 sn · TBT 0 · JS 162 KB | 91 (89–93) · LCP 0,70 sn · TBT 208 ms · JS 171 KB |

## 2. Masaüstü A/B: motor açık ve kapalı (aynı sunucu, aynı oturum, sıralı)

`?cinema=off` motoru hiç başlatmaz ([lib/cinema/capable.ts](../../lib/cinema/capable.ts)). Aynı Lighthouse masaüstü profili, beş koşu art arda (kapalı, açık, kapalı, açık, kapalı), artı betiğin iki açık koşusu.

| Motor | n | Performans | LCP | TBT | Ana iş parçacığı |
|---|---|---|---|---|---|
| Kapalı (`?cinema=off`) | 3 | **100, 100, 100** | 714, 686, 705 ms | 2, 0, 0 ms | 549, 529, 436 ms |
| Açık | 4 | **96, 92, 93, 89** (medyan 92,5) | 672, 681, 692, 704 ms | 135, 206, 179, 236 ms (medyan ≈ 193) | 904, 1059 ms (yalnızca A/B'deki 2 koşuda alındı) |

**Okuma:**

1. **Masaüstü gerilemesinin kaynağı sinema motorudur.** Aynı sayfa motor kapalıyken 100/100/100, açıkken 89–96. LCP (≈ 0,7 sn) ve CLS (0) değişmiyor; fark TBT'de (0–2 → 135–236 ms) ve ana iş parçacığı çalışmasında (≈ 440–550 → ≈ 900–1060 ms).
2. **Bunun gerçek bir GPU'lu masaüstünde de olup olmadığı bilinmiyor.** Başsız Chrome'un GL arka ucu bu ölçümde kaydedilmedi; yazılım rasterleştirme (SwiftShader) olması olasıdır ve yazılımla çizilen ham ışın izleme shader'ı gerçek bir ekran kartından çok daha pahalı olur. Ölçülmedi: gerçek GPU'lu, başlıklı (headful) Chrome ile Lighthouse ve kare ritmi.
3. **Ana iş parçacığının payı:** motor ilk boyama ve boşta kalmadan sonra (`requestIdleCallback`, en geç 2 sn) başlıyor, bu yüzden TBT penceresine düşüyor. Shader derleme ve ilk çizim `startCinema` içinde ana iş parçacığında (`getProgramParameter` ve ilk `draw`), `KHR_parallel_shader_compile` yoksa ya da yazılım arka uçta derleme beklemesi bloklar. Hangi görevin ne kadar tuttuğu bu ilk ölçümde profillenmedi, bu bir varsayımdı; **16.10.2026'da profillendi ve doğrulandı, §7.**

## 3. Ağırlıklar

| Parça | Boyut | Ne zaman iner |
|---|---|---|
| WebGL motoru + shader (lazy parça) | 6,7 KB gzip (denetim, `--build`) | yalnızca kapıyı geçen masaüstünde, ilk boyama ve boşta kalmadan sonra |
| Instrument Serif (Latin) | 20,5 KB | her sayfada **preload** (hero başlığı, olası LCP öğesi) |
| Instrument Serif (Latin Ext) | 11,3 KB | yalnızca `/tr` ve preload |
| Cabinet Grotesk 500 | 19,8 KB | her sayfada preload (`font-display: optional`) |
| Syne (Latin / Latin Ext) | 33,8 / 14,4 KB | film 3 ekran yaklaşınca |
| Film posterleri (8 dosya, WebP) | toplam 93,3 KB (5,7–30,2 KB) | yalnızca kapıyı geçmeyen cihazlarda, film 3 ekran yaklaşınca |

Sinemadan önce preload edilen tek yazı tipi Instrument Sans'tı (29,3 KB). Şimdi `/` için **≈ 40 KB daha** kritik yolda (Serif + Cabinet); `/tr` için ≈ 52 KB daha. Mobil LCP'nin 2,9 → 3,15 sn (EN) ve 3,1 → 3,27 sn (TR) çıkmasında bunun payı olabilir; **nedensellik doğrulanmadı** (iki ölçüm farklı günlerde, farklı makine yüküyle alındı).

Mobil 10 dosya, masaüstü 12 dosya JS: iki fark Lenis ve sinema motorudur; bu, telefonda ikisinin de istenmediğiyle uyumludur (dolaylı kanıt; ağ isteği listesinde motor parçası ayrıca aranmadı).

## 4. Diğer kapılar (aynı oturum, aynı derleme)

| Denetim | Sonuç |
|---|---|
| `npm run check` | çeviri eşitliği (7 dil), `tsc` 0 hata, ESLint 0 hata ve 0 uyarı (başta 1 kullanılmayan `eslint-disable` uyarısı vardı, giderildi) |
| `node faz2-denetim.mjs --build` | **0 hata**, 130 geçti, 1 bilinçli uyarı (`generateStaticParams` yok, [ADR 0001](../adr/0001-csp-report-only.md)). İlk koşuda 2 hata çıktı, ikisi de **denetimin eski yerlere bakmasından** kaynaklıydı (yetenek kapısı `CinemaStage`'den `capable.ts`'e taşınmış; `.chapter-word` etiket tarifi sayımına giriyordu) ve denetim düzeltildi; uygulama davranışı değişmedi (yalnızca `Film.tsx`'te kullanılmayan bir `eslint-disable` yorumu silindi) |
| `npm run smoke` | **121/121** üretim derlemesinde (`en,tr` yayında; sahte webhook alıcısı, Cloudflare'in her zaman geçen Turnstile test anahtarı) |

## 5. Kontrast: sahne üstünde metin (12.10.2026)

**Yöntem.** Başsız Chrome 154 (yazılım GL), 1440×900, `?cinema-debug` kancasıyla sahne belirli zamanlarda dondurulur, sayfadaki tüm metin saydam yapılıp yalnızca resim (tuval ve CSS katmanları) ekran görüntüsü alınır, metin kutularının piksellerinden **en parlak piksel (max)** ve **99. yüzdelik (p99)** için WCAG oranı hesaplanır. Metin renkleri sitedeki gibidir (platin %100, `muted` %70, `faint` %60). Eşik **metin boyutuna göre**: ≥ 24 px (başlık, film sözcüğü ve cümlesi) için 3:1, küçük metin için 4,5:1. Betikler depoda yoktur.

| Metin | Önce (sol sınır yok) | Sonra (POST shader'ı: sol sütun 0,17) |
|---|---|---|
| Hero başlığı (büyük) | max 3,2–9,0 · p99 4,2–12,9 ✓ | max 3,5–9,3 · p99 5,7–12,9 ✓ |
| Hero paragrafı (küçük, `muted`) | max **2,7**–7,0 · p99 **3,0**–7,3 ✗ (bir parlak dalga arkasında) | max 5,7–7,0 · p99 5,9–7,3 ✓ (4 zaman anı) |
| Film sözcüğü ve cümlesi (büyük) | max 3,3–10,8 ✓ | max 3,3–11,6 ✓ |
| Film paragrafı (küçük, `muted`) | max 6,6–7,6 ✓ | max 7,3–7,6 ✓ |
| Vitrin ve Briefing başlığı, paragrafı (ortam gücü) | max 8,1–9,7 ve 4,6–7,1 ✓ | aynı |

**Doğrulanmayan:** küçük **etiketler** (en soluk renk, 11–13 px). Toplu ölçüm etiketleri sayfa genişliğinde bir kutuyla aldığı için (metin solda, kutu sağa kadar) en parlak piksel çoğu zaman metnin hiç olmadığı yerden geldi ve sonuç anlamsız çıktı (hero 3,0–3,5; film 2,2–5,1). Yalnızca iki noktada gerçek metin bölgesine bakıldı: hero ölçüm etiketlerinin kutularında en parlak değer 22, 30 ve 37 / 255 (en soluk renkle ≈ 5:1 ve üstü) ve film 4. bölümün `04 / 04` etiketi kutusunda en parlak piksel metnin 970 px sağındaydı. **Etiketlerin tüm kare ve bölümlerde ≥ 4,5:1 olduğu söylenemez.** Ayrıca: p99'dan söz ederken kalan %1'lik piksel, harflerin arkasında yerel bir lekedir; tek piksellik parlama okunurluğu bozmaz ama "en kötü piksel" ölçütünü karşılamaz.

Mimari kartlarındaki metin opak katman 1'dedir (`.beam-body`, sahne arkasında değil). Betiğin ilk sürümünde bu kartlar 1,1:1 gibi anlamsız değerler verdi; neden, ölçüm için kart arka planlarını saydam yapmamın dönen ışık halkasını görünür kılması olarak **varsayıldı** (ayrıca doğrulanmadı) ve bu kartlar ölçüme alınmadı.

Film posterleri (WebGL'siz cihazların resmi) yeni shader ile yeniden render edildi; **poster modunda kontrast ayrıca ölçülmedi** (poster `<img>`'dir, üstünde obsidian perde `.film-scrim` durur).

## 6. Ölçülmeyenler (dürüstçe)

- **Gerçek GPU'lu masaüstü:** Lighthouse, kare ritmi (motor açıkken `requestAnimationFrame` aralıkları), GPU ısınması.
- **Metin kontrastı sahne üstünde:** büyük metin ve paragraflar için §5'te ölçüldü; küçük etiketler, poster modu, mobil, farklı pencere boyutları ve ince zaman taraması **ölçülmedi**.
- **Motorun kendini kapatma davranışı** (kare süresi 24 ms'yi aşınca çözünürlük düşürme, alt sınırda kapanma) laboratuvarda gözlenmedi.
- **Safari ve Firefox**, gerçek telefon, 120 Hz ekran, ekran okuyucu ile elle deneme.
- **Sinema için tarayıcı testleri** (`puppeteer-core`): bu ilk ölçümde yazılıp koşulmadı; 16.10.2026'dan beri `npm run qa:browser -- --only=cinema` var (§7).
- **Vercel:** doğrulandı (12.10.2026 dağıtımından sonra `fonts/cabinet-grotesk-500.woff2` canlıda HTTP 200, 20.260 bayt): derleme sırasında `fonts:fetch` çalıştı ve dosya dağıtıma girdi.

## 7. Güncelleme (16.10.2026): masaüstü TBT'nin nedeni profillendi, motor worker'a taşındı ([ADR 0021](../adr/0021-production-performance-and-enterprise-proof.md) §2)

**Profil.** Başsız Chrome 155 (yazılım GL), 1350×940, CPU profili (`Profiler`, 100 µs örnekleme) ve `longtask` gözlemcisi, ana iş parçacığında `getContext` ve `getProgramParameter` süreleri sarılarak; sayfa `/?m=us`, üç ayrı yükleme. Eski yapı (motor ana iş parçacığında):

| Yükleme | `getContext('webgl2')` | `getProgramParameter` (derleme sorguları) | Uzun görevler (ms @ başlangıç) |
|---|---|---|---|
| 1 | 44 ms | 237 ms | 261 @1057, 51 @1980 |
| 2 | 70 ms | 112 ms | 228 @582, 56 @880, 74 @1335 |
| 3 | 118 ms | 98 ms | 121 @1088 |

Yani masaüstü TBT'nin sinema motorundan gelen kısmı iki kaynaktan oluşuyordu: context yaratma ve derleme sürerken yapılan durum sorguları (GPU sürecinin yanıtını bekler). Önceki mimarideki `KHR_parallel_shader_compile` derlemeyi başka bir iş parçacığına zaten alıyordu; **sorguları** almıyordu. Kare başına sorgu aralığını 150 ms'ye çıkarmak (ilk deneme) bekleme sayısını azalttı ama context yaratma ve kalan beklemeler ana iş parçacığında kaldı.

**Çözüm.** Motoru bir worker'a, `OffscreenCanvas` üzerine taşımak. Aynı üç yükleme, yeni yapı: `getContext` ve `getProgramParameter` ana iş parçacığında **0 ms** (sayfa iş parçacığı WebGL'e hiç dokunmaz); kalan uzun görevler (üçüncü yüklemede 77 ve 61 ms, diğer ikisinde yok) büyük olasılıkla hidrasyondur (eski yapıda da, motordan önce, 121 ila 261 ms uzun görevler vardı); ayrıca ayrıştırılmadı.

**Resim aynı.** `?cinema-debug` kancasıyla zaman sabitlenip beş durumun (ortam, kozmik, organik, monolit, monolit-geç) 1280×720 kareleri eski yapıdan, yeni yapının worker yolundan ve ana iş parçacığı yolundan alındı ve piksel piksel karşılaştırıldı: eski yapıya göre iki yeni yolda da **%0,000** fark (eşik: kanal farkları toplamı > 6). İlk karşılaştırmada ortam karesi %2 ila %5 farklı çıktı; neden resim değil, **tuvalin 1,4 sn'lik opaklık geçişiydi** (kare solma bitmeden alınmıştı, eski yapının kendi karesi de kendisiyle ortalama 0,165 / 255 oynuyordu). Karşılaştırma solmanın bitmesini bekleyince fark sıfırlandı. Aynı karşılaştırma artık sürekli bir testtir (`qa:browser --only=cinema`: sabit monolit karesi iki yolda %0,05'in altı ve boş değil). Test, kalite denetleyicisinin sabit zamanda çalışmaması gerektiğini de ortaya çıkardı: yavaş bir çiziciyle (SwiftShader) sahne çözünürlüğü kare sayısına göre düşüyor ve resmi makinenin hızına bağlı yapıyordu; sabit zamanda (yalnızca test ve still-kare modu) artık düşmez.

**Lighthouse (yerel, araya girerek A/B, Chrome 155, makine ≈%40 başka yük altında).** Masaüstü `/`, n=6: eski **98** (96–99), TBT 110 ms (104–151); yeni **100** (99, 100, 100, 100, 100, 100), TBT **0 ms**. Kategoriler: erişilebilirlik, en iyi uygulamalar ve SEO 100. Mobil `/`, n=5: eski 81, TBT 526 ms; yeni 92, TBT 149 ms (mobilde motor hiç başlamaz; fark, aynı yapıdaki diğer değişikliklerden gelir, bkz. ADR 0021 §8). Bu sayılar **yayınlanmaz** (`lib/metrics.ts` değişmedi): yerel, tek makine, başsız Chrome.

**Bedeli ve sınırları.** (i) Ek bayt: eski tek parça 6,7 KB gz; şimdi sayfa tarafı 2,1 KB + worker parçası 8,8 KB (yedek yol 2,1 + 7,5 KB); hâlâ yalnızca ilk boyama ve boşta kalmadan sonra, yalnızca kapıyı geçen masaüstünde. (ii) Hedefler/işaretçi/kaydırma/boyut yalnızca değiştiklerinde mesajlanır (kare başına en çok bir küçük mesaj; sakin sayfada hiç). (iii) Kaydırma hızı (renk sapmasını artıran) worker'a bir kare gecikmeyle ulaşır; görünür bir fark gözlenmedi ama ölçülmedi. (iv) **Ölçülmeyenler:** gerçek GPU'lu masaüstü (orada `getContext` ucuzdur, kazanç daha küçük olabilir), Safari ve Firefox (OffscreenCanvas üzerinde WebGL2 olmayan tarayıcı ana iş parçacığı yoluna düşer; bu yol `Worker` kurucusunun fırlatmasıyla sınandı), 120 Hz ekran, worker'da `requestAnimationFrame` kare ritmi (kare süresi dağılımı iki yol için karşılaştırılmadı).
