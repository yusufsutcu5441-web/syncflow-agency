# Sinema katmanı ölçümleri

- **Tarih:** 12.10.2026
- **Ölçülen kod:** `main` dalının çalışma ağacı, **commit edilmemiş** sinema katmanı dahil ([ADR 0014](../adr/0014-cinematic-layer.md)). Üretim derlemesi: `NEXT_PUBLIC_SITE_URL=http://localhost:3101 npm run build`, `next start -p 3101` (3100 portunda 09.10'dan kalma eski bir sunucu vardı, ona dokunulmadı).
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
3. **Ana iş parçacığının payı:** motor ilk boyama ve boşta kalmadan sonra (`requestIdleCallback`, en geç 2 sn) başlıyor, bu yüzden TBT penceresine düşüyor. Shader derleme ve ilk çizim `startCinema` içinde ana iş parçacığında (`getProgramParameter` ve ilk `draw`), `KHR_parallel_shader_compile` yoksa ya da yazılım arka uçta derleme beklemesi bloklar. Hangi görevin ne kadar tuttuğu profillenmedi, bu bir varsayımdır.

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
- **Sinema için tarayıcı testleri** (`puppeteer-core`): bu oturumda yazılıp koşulmadı.
- **Vercel:** derleme sırasında `fonts:fetch`'in çalışıp indirilen `cabinet-grotesk-500.woff2`'nin dağıtıma girdiği canlıda doğrulanmadı.
