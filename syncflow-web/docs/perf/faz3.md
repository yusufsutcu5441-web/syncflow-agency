# Faz 3 ölçümleri: hareket, kaydırma, kare ritmi

- **Tarih:** 08.10.2026
- **Ölçülen kod:** `faz_3` dalı, üretim derlemesi (`next start`). Karşılaştırma: Faz 2'nin son hâli ([faz2-baseline.md](faz2-baseline.md) ile aynı kod, ayrı dizinde derlenip 3101'de ayakta tutuldu).
- **Kapı** (CLAUDE.md ve ilk yol haritası): paket analizcisinde mobil ilk yükte `lenis` ve `motion` yok; Lighthouse düşmedi; azaltılmış hareket çalışıyor; erişilebilirlik 100.
- **Makine:** Windows 11, 8 çekirdek, 16 GB. Sahibin tarayıcısı, Spotify ve (son koşularda) bir VS Code güncelleyicisi açıktı. CLAUDE.md "başka ağır süreç çalışmıyorken" der; bu koşul tam sağlanmadı. Aşağıda gürültü açıkça belirtilir.

## 1. Paket kapısı (otomatik, `node faz2-denetim.mjs --build`)

| Ölçüt | Sonuç |
|---|---|
| Kaynakta `lenis`, `motion`, `framer-motion` statik import | yok (yalnızca `import()`) |
| Rotanın ilk yük parçalarında (5 dosya, Next'in `entryJSFiles` listesi) Lenis ya da Motion | **yok** |
| Lazy parça: Lenis | 18,3 KB ham, **5,3 KB gzip**; yalnızca `(hover: hover) and (pointer: fine)` ve azaltılmış hareket yokken indirilir |
| Lazy parça: Motion mini (`animate`, WAAPI) | 11,6 KB ham, **4,7 KB gzip**; ziyaretçinin ilk kaydırma/tekerlek/işaretçi/dokunma/tuş etkileşiminde |
| Sunucu HTML'i (`/`) | 84.242 → 91.187 bayt ham, 15.946 → **16.551 bayt gzip** (+605 B: 27 kelime maskesi, +54 etiket) |

Tarayıcıda doğrulandı ([bölüm 4](#4-tarayıcı-ve-http-testleri)): masaüstü ilk HTML'deki 10 betikte Lenis/Motion yok; telefonda Lenis parçası hiç istenmez; Motion yalnızca etkileşimden sonra iner.

## 2. Lighthouse (aralıklı A/B, mobil ve masaüstü)

Araç `npm run perf` (Lighthouse 13.5.0, Chrome 154 headless). Mobil: 412×823 ×1,75, simüle yavaş 4G (RTT 150 ms, 1.638 Kbps), 4× CPU. Her iki sunucu da `NEXT_PUBLIC_SITE_URL=http://localhost:<port>` ile derlendi (yoksa canonical canlı alan adını gösterir ve SEO 92'ye düşer, bkz. [bölüm 5](#5-gürültü-uç-değerler-ve-sınırlar)). Koşular yeni/eski sırayla aralıklıdır.

### 2a. Son kod, son koşu (n = 9 mobil, 3 masaüstü; gürültülü makine)

| Profil | Sayfa | Sürüm | n | Performans (aralık) | FCP | LCP | TBT (aralık) | CLS | Hız İndeksi | TTFB | İlk yükleme JS (gzip, dosya) | Toplam |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Mobil | `/` | Faz 2 sonu (taban) | 9 | **88** (82–95) | 0,9 sn | 2,8 sn | 362 ms (107–524) | 0.000 | 1,2 sn | 59 ms | 155 KB (11) | 260 KB |
| Mobil | `/` | **Faz 3 (son)** | 9 | **91** (83–95) | 1,0 sn | 2,8 sn | 222 ms (73–485) | 0.000 | 1,3 sn | 63 ms | 157 KB (11) | 263 KB |
| Mobil | `/tr` | Faz 2 sonu (taban) | 9 | **88** (81–96) | 0,9 sn | 2,8 sn | 353 ms (65–549) | 0.000 | 1,1 sn | 61 ms | 155 KB (11) | 263 KB |
| Mobil | `/tr` | **Faz 3 (son)** | 9 | **89** (83–96) | 1,0 sn | 2,8 sn | 285 ms (74–486) | 0.000 | 1,2 sn | 71 ms | 157 KB (11) | 266 KB |
| Masaüstü | `/` | Faz 2 sonu (taban) | 3 | **100** (100–100) | 0,3 sn | 0,7 sn | 10 ms (8–11) | 0.000 | 0,5 sn | 75 ms | 155 KB (11) | 251 KB |
| Masaüstü | `/` | **Faz 3 (son)** | 3 | **100** (100–100) | 0,3 sn | 0,6 sn | 7 ms (2–31) | 0.000 | 0,5 sn | 64 ms | 163 KB (12) | 260 KB |

Kategoriler (tüm koşular): Faz 3: erişilebilirlik 100–100, en iyi uygulamalar 100–100, SEO 100–100; taban: erişilebilirlik 100–100, en iyi uygulamalar 100–100, SEO 92–100 (bir koşu).

### 2b. Daha sakin bir makinede, ekran dışı duraklatma kancasından önceki kod (n = 7 mobil, 3 masaüstü)

| Profil | Sayfa | Sürüm | n | Performans (aralık) | FCP | LCP | TBT (aralık) | CLS | Hız İndeksi | TTFB | İlk yükleme JS (gzip, dosya) | Toplam |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Mobil | `/` | Faz 2 sonu (taban) | 7 | **96** (91–97) | 0,9 sn | 2,7 sn | 99 ms (62–261) | 0.000 | 0,9 sn | 29 ms | 155 KB (11) | 260 KB |
| Mobil | `/` | **Faz 3 (kanca öncesi)** | 7 | **96** (91–96) | 0,9 sn | 2,7 sn | 89 ms (73–263) | 0.000 | 0,9 sn | 32 ms | 157 KB (11) | 263 KB |
| Mobil | `/tr` | Faz 2 sonu (taban) | 7 | **94** (89–97) | 0,9 sn | 2,8 sn | 170 ms (33–307) | 0.000 | 0,9 sn | 29 ms | 155 KB (11) | 263 KB |
| Mobil | `/tr` | **Faz 3 (kanca öncesi)** | 7 | **95** (79–96) | 0,9 sn | 2,8 sn | 112 ms (53–596) | 0.000 | 1,0 sn | 32 ms | 157 KB (11) | 266 KB |
| Masaüstü | `/` | Faz 2 sonu (taban) | 3 | **100** (100–100) | 0,3 sn | 0,6 sn | 2 ms (0–4) | 0.000 | 0,3 sn | 27 ms | 155 KB (11) | 251 KB |
| Masaüstü | `/` | **Faz 3 (kanca öncesi)** | 3 | **100** (100–100) | 0,3 sn | 0,6 sn | 2 ms (0–4) | 0.000 | 0,4 sn | 33 ms | 163 KB (12) | 260 KB |

Kategoriler (tüm koşular): erişilebilirlik, en iyi uygulamalar, SEO her iki sürümde 100–100. "Kanca öncesi": `data-pause-offscreen` kodu (yaklaşık 0,3 KB) henüz eklenmemişti.

### Nasıl okunmalı

1. **İki resmi tabloda Faz 3'ün medyanı tabanın altında kalmadı** (Faz 3 / taban: 96/96, 95/94, 91/88, 89/88; masaüstünde 100/100). Ama **fark ölçülebilir değil:** aynı sürüm koşudan koşuya 79–97 arasında oynuyor, aralıklar tam çakışıyor. Gürültülü, kısmen başarısız (34 koşunun 2'si düştü) başka bir denemede yön tutarsızdı (`/` 96'ya karşı 89, `/tr` 88'e karşı 95; bölüm 5). "Düşmedi" kapısı karşılandı; "iyileşti" yazmıyorum.
2. **Mobil LCP ≈ 2,7–2,8 sn, her iki sürümde aynı;** CLAUDE.md hedefi ≤ 2,5 sn'nin üstünde. Faz 3 bunu ne iyileştirdi ne bozdu; iş Hero'nun yeniden kurulumundadır.
3. **İlk yükleme JS'i mobilde 155 → 157 KB** (+2 KB: `lib/enhance` parçası artık maske ve duraklatma kodunu taşıyor), **masaüstünde 155 → 163 KB** (Lenis lazy parçası sayfa yüklendikten sonra iniyor, 12. dosya). CLAUDE.md'nin önerdiği ~150 KB tavanı Faz 2'de de aşılmıştı (155); Faz 3 bunu 2 KB artırdı.
4. **Erişilebilirlik, en iyi uygulamalar, SEO: 100** (tüm koşularda, her iki sürüm, `/` ve `/tr`), bir istisna dışında: bir taban koşusunda (`/tr`, #8) SEO 92 çıktı, bir sonraki koşularda yok; tek seferlik bir denetim hatası, sürümle ilgisi yok.
5. Lighthouse sayfayı kaydırmaz, etkileşim yapmaz. Maskeli girişlerin ve Lenis'in **kaydırma sırasındaki** maliyetini bu tablo görmez; onu bölüm 3 ölçer.

## 3. Kare ritmi ve telefon yükleme probu

### 3a. requestAnimationFrame aralıkları (masaüstü 1280×800, headless Chrome, yazılım rasterleştirme, 4 koşu medyanı)

"Hero" ilk 1,8 sn (giriş animasyonu + hidrasyon), "boşta" sonraki 3,5 sn, "kaydırma" 40 tekerlek adımı (her biri 140 px, 45 ms arayla) ve 0,9 sn sönümleme. Eski = Faz 2 (yerel kaydırma), yeni = Faz 3 (Lenis çalışıyor).

| Koşul | Faz | Aşama | Kare | p50 | p95 | p99 | En uzun | > 20 ms | > 33 ms |
|---|---|---|---|---|---|---|---|---|---|
| Kısıtsız | Faz 2 | hero | 102 | 16,7 | 16,9 | 17,0 | 25,2 | 0,5 | 0 |
| Kısıtsız | Faz 3 | hero | 101 | 16,7 | 16,9 | 25,1 | 25,1 | 0,5 | 0 |
| Kısıtsız | Faz 2 | boşta | 209 | 16,7 | 16,9 | 17,0 | 17,0 | 0 | 0 |
| Kısıtsız | Faz 3 | boşta | 209 | 16,7 | 16,9 | 17,0 | 17,0 | 0 | 0 |
| Kısıtsız | Faz 2 | kaydırma | 218 | 16,7 | 16,9 | 17,0 | 33,3 | 1 | 0 |
| Kısıtsız | Faz 3 | kaydırma | 249 | 16,7 | 16,9 | 17,0 | 17,1 | 0 | 0 |
| 4× CPU | Faz 2 | hero | 107 | 16,7 | 16,8 | 25,1 | 66,6 | 1,5 | 1 |
| 4× CPU | Faz 3 | hero | 104 | 16,7 | 16,8 | 66,5 | 76,3 | 2 | 2 |
| 4× CPU | Faz 2 | kaydırma | 214 | 16,7 | 25,0 | 34,5 | 74,8 | 10 | 4,5 |
| 4× CPU | Faz 3 | kaydırma | 273 | 16,7 | 17,5 | 33,4 | 34,8 | 6,5 | 2,5 |

Okuma: kısıtsız masaüstünde Faz 3'te boşta ve kaydırma sırasında kareler 16,7 ms'de (60 Hz) sabit, en uzun kare 17,1 ms. 4× CPU yavaşlatmada kaydırma Faz 2'den **daha düzgün** (p95 25,0 → 17,5 ms), ama p99'da hâlâ ~33 ms'lik düşen kareler var ve yükleme penceresinde (hero) Faz 3 bir iki kare fazla kaçırıyor (2 kare > 33 ms, Faz 2'de 1). Bu yüzden **"kilitli 60 FPS" iddiası yayınlanmaz:** ölçüm 60 Hz'lik tek bir ekranda, başsız Chrome'da ve bu makinede yapıldı; 120 Hz hiç ölçülmedi; kısıtlı CPU'da düşen kareler var. Doğru ifade: "bu makinede, kısıtsız masaüstünde kaydırma sırasında en uzun kare 17,1 ms".

### 3b. Telefon yükleme probu (412×823, yavaş 4G, 4× CPU, önbellek kapalı, 7 koşu)

| Sürüm | FCP medyan | Son LCP medyan | LCP öğesi | Koşu aralığı |
|---|---|---|---|---|
| Faz 2 | 1.124 ms | 1.124 ms | `p.lead` | 1.072–1.220 |
| Faz 3 | 1.140 ms | 1.140 ms | `p.lead` | 1.092–1.184 |

+16 ms, aralıklar çakışıyor: **fark yok.** Masaüstü (kısıtsız): 204 → 212 ms, aynı. (Bu ölçüm Lighthouse'un simülasyonundan farklı bir yöntemdir; Lighthouse mobil LCP'si ≈ 2,7 sn çıkar, bu prob gerçek kısıtlama altında ≈ 1,1 sn. İkisi birbirinin yerine kullanılmaz, yalnızca sürümler arası karşılaştırma içindir.) Maskeli girişin ilk sürümü her `[data-reveal]` öğesini yükleme anında kuruyordu: probda ≈ +100 ms ve Lighthouse'ta TBT sıçramaları verdi. Bu yüzden kurma, ziyaretçi kaydırdıkça ekranın bir ekran altındaki öğelere yayıldı; yukarıdaki tablolar bu hâl içindir.

## 4. Tarayıcı ve HTTP testleri

Tek seferlik doğrulama betikleri (depoda değil; puppeteer-core ile Chrome 154, headless) ve depodaki `scripts/smoke.mjs`:

- **Tarayıcı: 41/41.** Masaüstü: hero kelimeleri sunucuda bölünmüş ve CSS ile yükseliyor, giriş bitince dinlenme konumunda; Lenis ilk HTML'de yok, yükleme sonrası parça iniyor ve `html.lenis` çalışıyor; tekerlek adımı `lenis-smooth` başlatıp kaydırmayı zamana yayıyor; başlık bağlantısı Lenis ile süzülüp üstbilgi payının altına (88 px) iniyor, adres ve odak güncelleniyor; ödeme katmanı açıkken Lenis duruyor; CSP ihlali ve konsol hatası yok. Telefon: Lenis çalışmıyor ve parçası hiç istenmiyor, yerel çapa sıçraması korunuyor, kurma gelen öğelere yayılıyor. Azaltılmış hareket: animasyon yok, ofset yok, Lenis yok, Motion hiç inmiyor; ayar sonradan açılırsa Lenis kapanıp gizli metin gösteriliyor. JavaScript kapalı: tüm kelimeler görünür. Düzen: telefon ve masaüstünde sayfa yüksekliği ve başlık kutuları Faz 2 ile **birebir aynı**. Ekran dışı duraklatma: görünürken hero noktasının animasyonu çalışıyor, uzaklaşınca `paused` ve opaklık donuyor, dönünce yeniden çalışıyor; film görünürken oynuyor, uzaklaşınca duruyor ve ilerlemiyor; telefonda film hiç otomatik oynamıyor.
- **HTTP duman testi: 87/87** (sahte webhook alıcısıyla).
- **Denetim:** `node faz2-denetim.mjs --build` 0 hata (rapor son commit'in açıklamasında ve README §11).

## 5. Gürültü, uç değerler ve sınırlar

- **İlk son-kod koşusunda SEO 92 çıktı:** yeni sunucu üretim canonical'ı (`https://syncflow.agency`) ile derlenmişti, taban ise yerel canonical ile. Lighthouse yerel sayfada başka alan adını işaret eden canonical'ı reddeder. Kod değil ölçüm düzeni farkıydı; yeni kod `NEXT_PUBLIC_SITE_URL=http://localhost:3100` ile yeniden derlenip yeniden ölçüldü (yukarıdaki tablolar). Canlıda bu sorun yoktur.
- **Aynı ilk koşuda iki uç değer:** yeni sürümün `/` ve `/tr` koşularında TBT 1.704 ve 1.552 ms (puan 69/70). Ham izlemede tek bir **1.867 ms'lik "atfedilemeyen" ana iş parçacığı görevi var, betik süresi 8 ms:** uygulama JS'inden gelmiyor. Nedenini doğrulayamadım; yeniden ölçümlerde tekrarlanmadı. Bu koşu canonical uyuşmazlığıyla birlikte geçersiz sayıldı ve tablolara girmedi.
- **Bir ara deneme gürültülüydü:** makine yeniden başlamış, sunucular ölmüş ve yeniden ayağa kaldırılmıştı (ondan önceki deneme bu yüzden iptal oldu), VS Code güncelleyicisi çalışıyordu; 34 koşunun 2'si Chrome izleme hatasıyla (`NO_NAVSTART`) düştü, kalanlarda TBT hem tabanda hem yenide 65–460 ms arasında salındı (`/` Faz 3 96, taban 89; `/tr` Faz 3 88, taban 95). Yön tutarsız olduğu için bunu bir regresyon ya da kazanç olarak yazmıyorum, tabloya da koymadım.
- **Resmi son koşu da gürültülü** (2a): çalışma süresi ≈ 20 dk, VS Code güncelleyicisi ve başka uygulamalar açık. Her iki sürümde puanlar 81–96, TBT 65–549 ms arasında oynuyor. Bu yüzden iki tablo birlikte verildi ve fark değil **eşitlik** iddia ediliyor. Sakin bir makinede kesin sayı için `npm run perf` yinelenmelidir (talimat: [scripts/lighthouse.mjs](../../scripts/lighthouse.mjs) başlığı).
- **Yayınlanabilir sayılar:** yalnızca yukarıdakiler, tarih ve profille birlikte. "100/100 Lighthouse" ifadesi yalnızca erişilebilirlik, en iyi uygulamalar ve SEO için doğrudur (bu iki sayfada, bu profilde); performans mobilde 81–97 arasında oynuyor, masaüstünde 100. "LCP < 1,2 sn", "TBT < 50 ms", "kilitli 60 FPS", "120 Hz" **ölçülmedi ya da ölçüm tersini gösteriyor;** CLAUDE.md gereği "ölçülecek" yazılır.
- Yerel `next start` HTTP/1.1 ve gzip sunar; canlıda (HTTP/2, Brotli) doğrulama PageSpeed Insights ile yapılmalıdır.
