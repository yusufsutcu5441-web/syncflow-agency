# Faz 4 ölçümleri: Blueprint ana sayfası

- **Tarih:** 08.10.2026
- **Ölçülen kod:** `faz_4` dalı, Blueprint ana sayfası ([ADR 0006](../adr/0006-blueprint-adopted.md)), üretim derlemesi (`NEXT_PUBLIC_SITE_URL=http://localhost:3100 npm run build`, `next start -p 3100`). Karşılaştırma yok: sayfa baştan kuruldu, Faz 3'ün ana sayfasıyla aynı içeriği taşımıyor. Faz 3 sayıları [faz3.md](faz3.md)'de.
- **Makine:** Windows 11, 8 çekirdek, 16 GB; ölçüm sırasında başka ağır bir işlem çalıştırılmadı (geliştirme sunucusu boşta açıktı). Faz 3'teki gürültülü oturumun aksine koşular tutarlı çıktı (mobil `/` 90–95). **Tek makine, yerel sunucu (HTTP/1.1, gzip), başsız Chrome, 60 Hz.** Saha verisi (CrUX/RUM) değildir.
- **Amaç:** (1) kullanıcının "Lighthouse 100/100 erişilebilirlik" isteğini ve [CLAUDE.md](../../CLAUDE.md) performans kapılarını ölçmek, (2) sitede yayınlanan her sayının (`lib/metrics.ts`) kaynağını kayda geçirmek.

## 1. Lighthouse (mobil ve masaüstü, n = 7 ve 3)

Araç `npm run perf` (Lighthouse 13.5.0, Chrome 154 headless). Mobil: 412×823 ×1,75, simüle yavaş 4G (RTT 150 ms, 1.638 Kbps), 4× CPU yavaşlatma. Masaüstü: `--preset=desktop`. Medyan ve aralık.

| Profil | Sayfa | n | Performans (aralık) | FCP | LCP | TBT (aralık) | CLS | Hız İndeksi | TTFB | İlk yükleme JS (gzip, dosya) | Toplam |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Mobil | `/` | 7 | **93** (90–95) | 1,0 sn | 2,9 sn | 152 ms (58–223) | 0 | 1,0 sn | 23 ms | 156 KB (10) | 281 KB |
| Mobil | `/tr` | 7 | **90** (89–92) | 1,0 sn | 3,1 sn | 226 ms (177–259) | 0 | 1,0 sn | 23 ms | 156 KB (10) | 286 KB |
| Masaüstü | `/` | 3 | **100** (100–100) | 0,3 sn | 0,7 sn | 0 ms (0–0) | 0 | 0,4 sn | 19 ms | 162 KB (11) | 288 KB |

**Erişilebilirlik, en iyi uygulamalar ve SEO: 100, tüm koşularda** (mobil `/`, `/tr`, masaüstü).

Doğrulama koşusu (ölçülen sayılar `lib/metrics.ts`'e yazılıp yeniden derlendikten sonra, son derleme, n = 3 mobil ve 2 masaüstü): mobil `/` **95** (LCP 2,8 sn, TBT 81 ms), `/tr` **94** (LCP 3,0 sn, TBT 106 ms), masaüstü **100** (LCP 0,64 sn, TBT 0); erişilebilirlik, en iyi uygulamalar, SEO yine 100. Sayfaya metrik sayıları eklenince sonuç bozulmadı.

### Nasıl okunmalı

1. **Erişilebilirlik 100'e iki ayarla ulaştı.** İlk ölçüm 97 verdi; axe `color-contrast` iki şeyi yakaladı: (a) Blueprint'in %40 beyaz "soluk" tonu ve `.agency` (3,65:1; WCAG AA 4,5:1 ister) → %50'ye (5,3:1) yükseltildi, bu Blueprint'ten bilinçli bir sapmadır; (b) %6 opaklıklı devasa footer wordmark'ı (1,09:1) bir metin düğümü olduğu için okundu → artık `::before { content: attr(data-text) }` ile çizilen, `aria-hidden`, metin düğümü taşımayan bir süs. Her iki düzeltme sonrası mobil ve masaüstünde 100.
2. **Mobil LCP ≈ 2,9–3,1 sn, hedef ≤ 2,5 sn'nin üstünde** (Faz 2 ve 3'te 2,7–2,8 sn idi; yeni sayfa HTML/CSS'i büyüttü). LCP öğesi hero alt metni (`p.lead`, düz metin, animasyonsuz). Gerçek (simülasyonsuz) izlemede TTFB 26 ms + öğe çizim gecikmesi 202 ms; simülasyondaki 2,9 sn Lighthouse'ın yavaş-4G kritik yol modelidir (HTML, CSS, yazı tipi). Bu **bir sonraki kapıdır**, bu fazda çözülmedi.
3. **Mobil performans puanı 90–95 arasında oynuyor** (TBT 58–259 ms): hidrasyon (briefing, vitrin şeridi, dil seçici istemci bileşenleri) 4× yavaşlatılmış CPU'da kısa görevler üretiyor. `/tr` biraz daha yavaş (Türkçe alt küme yazı tipi + daha uzun metin).
4. **Masaüstü 100/100/100/100:** LCP 0,65 sn, TBT 0, CLS 0. Videolar `preload="none"` olduğu için bu sayılara girmez (toplam 288 KB'ta poster WebP'ler var, MP4/WebM yok).
5. **İlk yükleme JS'i mobilde 156 KB, masaüstünde 162 KB gzip** (Faz 3'te 157/163): CLAUDE.md'nin önerdiği ~150 KB tavanın biraz üstünde. Lenis (5,3 KB) ve Motion (4,7 KB) lazy parçalardır; mobil ilk yükte yok (denetim doğrular).
6. **Videolar:** MP4 144–371 KB, WebM 108–402 KB, poster 4–17 KB; yalnızca oynatılacağı zaman iner.

## 2. Kare ritmi (requestAnimationFrame aralıkları)

Masaüstü 1280×800, başsız Chrome (yazılım rasterleştirme), 60 Hz. Sayfa tamamen kaydırılır (64 tekerlek adımı, her biri 140 px, 45 ms arayla): Lenis, üç Border Beam, görünür videolar, halkalar, maskeli girişler ve imleç ışığı birlikte çalışır. Beş koşunun medyanı.

| Koşul | Koşu | Kare/koşu | p50 | p95 | p99 | En uzun | > 20 ms | > 33 ms |
|---|---|---|---|---|---|---|---|---|
| Kısıtsız | 5 | ≈ 377 | 16,7 | 16,8 | 16,9 | 17,0 | 0 | 0 |
| 4× CPU | 3 | ≈ 425 | 16,7 | 16,8 | 16,9 | 33,1 | 1 | 0 |

Kısıtsız beş koşunun biri tek bir 33 ms'lik kare içeriyordu (koşu 1: 2 kare > 20 ms). **Sitedeki grafik bu ölçümün gerçek verisidir** (`lib/metrics.ts` `FRAME_SERIES`: medyan koşunun 160 örneği). Sınırlar: bu **ana iş parçacığının kare ritmidir**, GPU raster süresi ya da gerçek bir ekranın görüntü gecikmesi değildir; ölçüm 60 Hz'de sabitlenmiştir, **120 Hz hiç ölçülmedi**. Bu yüzden sitede "kilitli 60 FPS" ya da "120 Hz için kalibre" yazmaz; yazan: "60 Hz ekranda kaydırırken ölçüldü, medyan 16,7 ms, 99. yüzdelik 16,9 ms".

## 3. Tarayıcı doğrulaması (Chrome 154, `puppeteer-core`; betik depoda yok)

**60/60** (üretim derlemesi + yedi dilin açık olduğu geliştirme sunucusu). Öne çıkanlar:

- Hero iki maskeli satır, CSS ile ilk boyamadan; Lenis ve Motion ilk yükte yok; Lenis ince işaretçide yüklenir, Motion ilk etkileşimden önce istenmez.
- İmleç ışığı yalnızca ince işaretçide, hareket edince görünür ve imleci izler; birincil düğme imlece doğru eğilir (12 px) ve uzaklaşınca yerine döner.
- **Üç Border Beam döner; ekran dışına çıkınca üçü de durur.** (İlk koşuda bu başarısız oldu: bir bileşenin `animation` kısaltması `animation-play-state`'i sıfırlıyordu. Duraklatma kuralı katman dışına taşınarak düzeltildi.)
- Lighthouse halkaları ekran altındayken silahlı (boş), görününce dolar; azaltılmış harekette ve JS yokken dolu.
- Mimari kartındaki video görünürken oynar; vitrin kartı imleç üstündeyken oynar ve ışık yanar, imleç ayrılınca durur; telefonda ve azaltılmış harekette hiçbir video otomatik oynamaz.
- Vitrin şeridi kendi düğmesiyle yerel kayar; dikey tekerlek şeridin üstündeyken de sayfayı kaydırır (scroll-jacking yok).
- Küre: yedi şehir noktası; bir dil etiketinin üstüne gelmek cümleyi o dile çevirir, Arapça cümle `dir="rtl"`; üretimde yalnızca `en` ve `tr` bağlantıdır, kalan beşi önizleme düğmesidir.
- Briefing yalnızca klavye ile tamamlanır (Boşluk seçer, Enter devam eder, odak yeni başlığa gider); panel `data-lenis-prevent` taşır; kopyalama düğmesi "Copied ✓" der ve adresi panoya yazar.
- Telefon: Lenis çalışmaz ve parçası istenmez, ışık gizli, hero şeridi tek sütun, yapışkan çubuk hero düğmesi görünürken ve briefing görünürken gizli; yatay taşma yok.
- Azaltılmış hareket: hero animasyonu yok, Border Beam gizli, ışık yok, düğme eğilmez, halkalar dolu, videolar oynamaz, Lenis ve Motion yok.
- JavaScript kapalı: tüm kelimeler görünür, `<noscript>` e-posta adresini önerir.
- **Arapça** (`/ar`): `lang="ar" dir="rtl"`, wordmark sağda, düğme solda, başlık sağa yaslı, yatay taşma yok (honeypot başlangıç kenarında), harf aralığı sıfır, Arapça metin sistem yazı tipinde, vitrin şeridi sağdan başlar ve düğme doğru yöne kayar, ilerleme çizgisi sağdan dolar. Dil seçici yedi dili kendi yazısıyla listeler (beşi "taslak"), Deutsch'u seçmek `/de`'ye götürür ve footer'da taslak notu çıkar; `/fr /es /ja /tr` kendi dilinde ve kendi `<title>`ıyla açılır.
- CSP ihlali yok, konsol hatası yok (tüm sayfalarda).

HTTP duman testi: **107/107** (üretim, yalnızca `en,tr` yayında, sahte webhook, Cloudflare'in her zaman geçen test gizli anahtarıyla gerçek `siteverify` çağrısı) ve **91/91** (geliştirme sunucusu, yedi dil, webhook yok).

## 4. Sınırlar ve dürüst notlar

- **Doğrulanmayanlar:** 120 Hz ekran; gerçek telefon (iPhone, orta segment Android); Safari/Firefox; canlı alan adında PageSpeed/CrUX; gerçek e-posta teslimi ve gerçek Turnstile widget'ı (anahtarlar verilmedi); ekran okuyucu ile elle deneme; Lighthouse dışı erişilebilirlik denetimi (axe-core Lighthouse içinde çalıştı, ayrı bir WCAG incelemesi yapılmadı).
- **Mobil LCP ve TBT hedeflerin gerisinde kaldı;** bunlar yayınlanan sayılar arasında "mobil performans 93" olarak dürüstçe yer alır, LCP mobil için yayınlanmaz.
- Yerel `next start` HTTP/1.1 ve gzip sunar; canlıda (HTTP/2, Brotli) doğrulama PageSpeed Insights ile yapılmalıdır.
- Ölçüm sayfa içeriği değişince bayatlar: görsel bir değişiklikten sonra `npm run perf` yinelenmeli ve `lib/metrics.ts` güncellenmelidir (denetim yalnızca tarih, profil ve kaynağın varlığını kontrol eder, değerlerin güncelliğini değil).
