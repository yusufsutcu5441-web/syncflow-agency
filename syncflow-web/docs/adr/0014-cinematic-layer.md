# ADR 0014: Sinematik katman (WebGL2 tuvali, Film bölümü, sahneli dil geçişi, sinematik tipografi)

- **Durum:** Kabul edildi, 12.10.2026. **Uygulama bu ADR'den önce yazılmıştı** ve 12.10.2026 itibarıyla `main` dalında **commit edilmemiş** çalışma ağacındadır (başlangıçta 17 değişen dosya, yeni `lib/cinema/`, `components/cinema/`, `Film.tsx`, `public/film/`, iki yazı tipi ailesi). Kodda bu ADR'ye yapılan atıflar (`globals.css`, `engine.ts`, `Film.tsx` vb.) dosya yokken duruyordu; bu belge kodu **geriye dönük** kayda geçirir, CLAUDE.md ve denetim betiği ona göre güncellendi.
- **Karar:** proje sahibi, 12.10.2026: "Sinema katmanı ve gelişmiş motion özellikleri onaylıdır." Yönlendirme: lüks, akışkan, sinematik atmosfer (Porsche sakinliği, Lamborghini gerilimi).
- **Değiştirdiği kurallar:** CLAUDE.md'nin önceki "WebGL yok" ve "ağırlık yalnızca 400/500, tek yazı tipi ailesi (Instrument Sans)" maddeleri ([ADR 0007](0007-tokens-and-brand.md) tipografisi). Tamamlar: [ADR 0004](0004-motion-and-smooth-scroll.md) (hareket ve kaydırma). Dokunmadığı: renk paleti, hukuk ve sağlık dili, güvenlik, i18n.
- **Ölçüm:** [docs/perf/cinema.md](../perf/cinema.md).

## Bağlam

Site "sessiz lüks"tü: obsidian zemin, cam yüzeyler, ölçülü ışık. Sahibi bunun üstüne akışkan, gerilimli bir ışık ve hareket dili istedi. Mevcut sınırlar: ilk yük JS'i ~150 KB gzip tavanına yakın; Lighthouse masaüstü 100/100/100/100; içerik JS yokken görünür olmalı ([ADR 0004](0004-motion-and-smooth-scroll.md)); saf siyah ve saf beyaz yasak; erişilebilirlik 100. Katman bu sınırların **içinde** kalmak zorundaydı.

Atmosfer referansı (Porsche, Lamborghini) yalnızca iç tasarım dilidir. Bu adlar sitede, metinlerde ve meta verilerde geçmez, benzerlik ya da ilişki ima edilmez.

## Karar

### 1. İlke: katman içeriğin yerine geçmez

Bütün metin gerçek DOM'dadır ve sunucuda render edilir; katman olmadan sayfa eksiksizdir. Katman yalnızca yetenekli cihazda, ilk boyamadan sonra ve ayrı bir parça olarak gelir. Her hata yolu (WebGL2 yok, shader derlenmedi, bağlam kaybı, yavaş makine) motoru sessizce çeker ve CSS yedeği kalır.

### 2. Motor: tek sabit tuval, ham WebGL2

- `lib/cinema/engine.ts` (275 satır) + `lib/cinema/shaders.ts` (252 satır). **three.js ve React Three Fiber kullanılmaz** (kodda yazılı gerekçe: motor birkaç KB kalır; denetim `three` vb. bağımlılık görürse uyarır). Ölçülen lazy parça **6,7 KB gzip**, shader dahil.
- İki geçiş. **Sahne** geçişi seçili sahneleri tuvalin bir kesri kadar çözünürlükte bir dokuya çizer (başlangıç 0,5). **Son geçiş** dokuyu tam çözünürlüğe çizer ve optiği ekler: renk sapması (fare ve kaydırma hızıyla artar), ucuz bloom, anamorfik mercek parıltısı ve hayaletleri, vinyet, 24 kare/sn 35 mm gren, kapı titremesi, dil geçişi glitch dilimleri, bantlaşmaya (banding) karşı dither.
- Dört sahne, her biri bir fonksiyon, yalnızca ağırlığı sıfırdan büyük olanlar hesaplanır: **kozmik madde** (alan bükmeli nebula ve toz), **biyo-mekanik omurga** (ışın izlemeli omurga ve kaburgalar), **obsidiyen monolit** (ışın izlemeli levha, zemin, arka ışık demeti), **sıvı metal** (ortam sahnesi). Kamera film ilerlemesini (`local`) okur.
- `KHR_parallel_shader_compile` varsa derleme ana iş parçacığını beklemeden yoklanır (en çok 15 sn); sonuç yalnızca bittiğinde okunur.
- Tuval `<body>`'e eklenir (React ağacı dışı) ve ilk kare çizilince `data-live` ile görünür olur. **Kalıcı durum `<html>` üzerinde tutulmaz**: React dil değişiminde `<html>` niteliklerini sıfırlar ve ilk uygulamada bu yüzden yeni sayfa bir an parladı. CSS durumu `body:has(> .cinema-canvas[data-live])` ile okur.
- `lib/cinema/state.ts` tek paylaşılan nesnedir; film bölümü yazar, motor kendi kopyasını her karede ona doğru yumuşatır (kaydırma sıçraması görüntüyü sıçratmaz). Motor olmadan da CSS altyazıları çalışsın diye `film.ts` ve `state.ts` ayrı, küçük ve serbesttir.

### 3. Kapı ve yedek

- **Kapı** (`lib/cinema/capable.ts`; hem `CinemaStage` hem Film bölümü kullanır): `(hover: hover) and (pointer: fine)`, azaltılmış hareket yok, veri tasarrufu yok, `innerWidth` ≥ 900, `hardwareConcurrency` ≥ 4. Geçmeyen cihaz motoru hiç indirmez. Destek ve test için: `?cinema=off` (hiç başlatma), `?cinema-force` (kapıyı atla), `?cinema-debug` (`window.__cinema` test kancası).
- **Başlatma:** `CinemaStage` ilk karede ve ardından `requestIdleCallback` (en geç 2 sn) ile `import('@/lib/cinema/engine')` çağırır. Motor tekildir ve bileşen sökülünce yıkılmaz: dil değişimi `[locale]` altındaki her şeyi yeniden kurar, görüntü yeniden başlamamalı ve shader'lar yeniden derlenmemeli.
- **CSS yedeği** (`.cinema-fallback`): yumuşak ışık + 35 mm gren (platin gürültü, %6, `steps(1)` titreşim). Telefon, azaltılmış hareket, veri tasarrufu ve WebGL2'siz makineler filmik bir karanlık arka plan tutar. Motor canlıyken gizlenir.
- **Film yedeği:** dört sahne için yatay (1280×720) ve dikey (720×1280) WebP poster (`public/film/`, toplam ≈ 93 KB), **canlı motorun aynı shader'larından** `scripts/render-posters.mjs` ile üretilir (başsız Chrome + SwiftShader, GPU gerekmez). Posterler HTML'de `data-src`/`data-srcset` olarak durur ve film 3 ekran yaklaşınca, yalnızca kapıyı geçmeyen cihazlarda yüklenir.

### 4. Kalite bütçesi (motor kendini yönetir)

Ortam durumunda (yalnızca sıvı metal) 30 kare/sn; sekme gizliyken hiç çizmez; DPR en çok 1,25; 90 karelik ortalama kare süresi 24 ms'yi aşarsa sahne çözünürlüğü %80'e iner (alt sınır 0,3), alt sınırda iki pencere üst üste yavaşsa motor kendini kapatır ve CSS yedeği kalır. Bağlam kaybında `preventDefault` + `destroy()`. Resim gücü (`gain`) içerik arkasında `AMBIENT_GAIN` = 0,22, filmin içinde 1'e çıkar.

### 5. Film bölümü

`components/sections/Film.tsx` + `lib/enhance/film.ts`. Yüksek bir bölüm (420 svh, 48 rem altında 360 svh) ve içinde `position: sticky` bir sahne. **Kaydırma yerel kalır (scroll-jacking yok)**: `film.ts` kaydırma konumunu `--p` (0..1) CSS değişkenine yazar, dört bölüm ve poster yalnızca CSS ile (`clamp`/`calc`) çapraz solar, bölüm metni hafifçe kayar. Her kare en çok bir `getBoundingClientRect` okunur ve yalnızca özel özellikler yazılır. Dört bölüm gerçek metindir ve okuma sırasındadır; ekran okuyucu kaydırmadan hepsini okur. Zaman kodu (`00:00:00:00`) kaydırma konumu göstergesidir (24 kare/sn × 40 sn), gerçek bir film iddiası değildir. Sahnelerde okunabilir metin yoktur; tek render her dile yeter.

### 6. Sahneli dil geçişi

`components/layout/LanguageSwitcher.tsx`. Dil seçilince: sayfa kararır (360 ms; azaltılmış harekette 200 ms), metin dilimler hâlinde kayar (`glitch-shift`, yalnızca `translate` ve `text-shadow`, `<main>` ve footer), motora `cinema:glitch` olayı gider, yeni dil karanlığın arkasında yüklenir ve karanlıktan çıkar (620 ms). Perde `<body>`'e eklenen bir öğedir (React ağacı dışı, dil değişiminde silinmez); sahne durumu modül düzeyinde tutulur çünkü dil değişimi dil seçici bileşenini de yeniden kurar ve yeni dil seçicinin bağlanması "gezinme indi" işaretidir. Gezinme hiç bildirmezse **5 sn'lik güvenlik zamanlayıcısı** ziyaretçiyi karanlıkta bırakmaz. Azaltılmış harekette dilim kayması ve renk kırılması yoktur, yalnızca kısa solma.

### 7. Sinematik tipografi: üç ek yüz, her birinin tek işi

| Yüz | Lisans | İş | Not |
|---|---|---|---|
| Instrument Serif 400 | OFL, depoda | hero ve bölüm başlıkları, film cümleleri | italik yok; Latin 20,5 KB + Latin Ext 11,3 KB (Latin preload, Ext yalnızca `/tr`) |
| Syne 700–800 | OFL, depoda | yalnızca film bölüm sözcükleri, büyük harf | Latin 33,8 KB + Ext 14,4 KB; **film 3 ekran yaklaşana dek indirilmez**, o zamana kadar Instrument Sans 600 çizer; `film.ts` gerçek genişliği ölçüp taşan sözcüğü küçültür |
| Cabinet Grotesk 500 | ITF FFL v2.0, **depoda değil** | düğme, gezinti, `text-title` | 19,8 KB, preload, `font-display: optional` |

- Instrument Sans metin yüzü olarak kalır. Her yüzün Arial/Georgia'dan ölçeklenmiş bir yedeği vardır (CLS 0). AR ve JA'da hiçbiri kullanılmaz (sistem yığınları: `:lang` kuralları `--font-display/-wide/-ui`'yi sistem yazı tipine çeker; Arapçada ayrıca büyük harf dönüşümü ve harf aralığı kapanır).
- **Cabinet Grotesk lisansı:** betik başlığına göre ITF FFL v2.0 §02 dosyanın herkese açık depoda dağıtılmasını, budanmasını ve biçim dönüşümünü yasaklar; §01 kendi sitenden sunmaya izin verir. Bu depo herkese açık olduğundan dosya `.gitignore`'dadır ve `scripts/fetch-fonts.mjs` resmi dosyayı Fontshare'in CSS API'sinden **olduğu gibi** (budamadan, dönüştürmeden) `dev` ve `build` öncesi (`predev`, `prebuild`) indirir. **Betik derlemeyi asla düşürmez:** indirme başarısız olursa uyarır, çıkış kodu 0 verir ve arayüz Instrument Sans'a düşer. Bu, lisansın bir *yorumudur*, hukuki görüş değildir; sahibi doğrulamalıdır (CLAUDE.md açık kalem).
- Türkçe büyük harf `lang="tr"` ile CSS'te dönüşür (Işık → IŞIK, Biçim → BİÇİM). `scripts/check-fonts.py` her yüzü yalnızca çizdiği metinlere karşı, her dil için sınar.

### 8. Palet ve kontrast

- Son geçiş her pikseli **obsidian `#0D0D0E` ile platin `#E2E2E6` arasına kıstırır**: katman saf siyah ya da beyaz üretemez (shader'ın son satırı; denetim bunu doğrular).
- Şampanya sahnede yalnızca sıcak ışık vurgusu (çekirdek parlaması, monolit kenarı, mercek parıltısı) ve dil geçişinin renk kırılmasında geçer; yüzey rengi değildir.
- İçerik arkasında sahne yüzde 22 güçtedir (`AMBIENT_GAIN`); amaç metin kontrastının tasarım değerlerinde kalmasıdır. **Bu sahne üstünde ölçülmedi** (aşağıda açık kalem).

### 9. Azaltılmış hareket

Motor başlamaz. Film CSS ile kalır ama bölüm kayması ve gren hareketi kapanır; kaydırmaya bağlı bölüm geçişinde yalnızca **opaklık** çapraz solması kalır (kabul edilen karar: hareket yok, geçiş var). Dil geçişi düz solmadır. Global `prefers-reduced-motion` kuralı geri kalan her şeyi durdurur.

### 10. Denetim kapısı (`faz2-denetim.mjs`)

Bölüm 8 ("Sinema katmanı"): dosyalar var; motor ve shader statik import edilmemiş, yalnızca `import()` ile; `--build` sonrası motor ilk yük parçalarında değil ayrı lazy parça; kapı (`capable.ts`) reduced-motion, ince işaretçi ve `saveData` kontrol ediyor ve `CinemaStage` onu çağırıyor; WebGL2/bağlam kaybı koruması; POST shader paleti kıstırıyor; sekme duraklatma ve uyarlamalı kalite; `three`/R3F yok; dört sahne için yatay ve dikey poster var; CSS yedeği ve azaltılmış hareket kuralları; dil geçişi (`beginStaging`, `cinema:glitch`, perde kuralları); `<html>`'e kalıcı durum yazılmıyor. Bölüm 2: üç ek yazı tipinin `@font-face`'i, OFL metinleri, Cabinet Grotesk'in git'te izlenmediği, `fetch-fonts` hata verse de derlemeyi düşürmediği, `--font-ui` yedeği, 700/800 ağırlığın yalnızca Syne'de olduğu.

## Ölçüm

Ayrıntı ve ham değerler [docs/perf/cinema.md](../perf/cinema.md). Özet (12.10.2026, yerel üretim derlemesi, başsız Chrome 154, Lighthouse 13.5):

- **Telefon (motor kapıyı geçmez):** `/` 94 (91–94), LCP 3,15 sn, TBT 55 ms, JS 157 KB; `/tr` 86 (76–90), LCP 3,27 sn, TBT 336 ms. Faz 4'e (93 ve 90) göre puan benzer ama `/tr` daha gürültülü ve LCP 0,15–0,25 sn yüksek; LCP hedefi (≤ 2,5 sn) **zaten aşılıyordu** ve aşılmaya devam ediyor.
- **Masaüstü, motor açık ve kapalı (A/B):** kapalı **100, 100, 100** (TBT 0–2 ms); açık **89–96** (medyan 92,5; TBT 135–236 ms). LCP (≈ 0,7 sn) ve CLS (0) aynı. **Masaüstü gerilemesinin kaynağı motordur.** Başsız Chrome'un GL arka ucu kaydedilmedi (yazılım olması olası), gerçek GPU'da maliyet farklı olabilir.
- Denetim 130 geçti, 0 hata, 1 bilinçli uyarı; duman testi 121/121; `tsc` ve ESLint temiz.

## Bilinen boşluklar ve açık kalemler

1. **Masaüstü TBT/performans gerilemesi** (yukarıda). Sahibinin kapısı: Lighthouse masaüstü 100 hedefi. Seçenekler (hiçbiri uygulanmadı): motoru Lighthouse'ın ölçtüğü pencerenin dışına ertelemek (ilk etkileşim ya da daha uzun boşta bekleme), yazılım GL arka ucunu `WEBGL_debug_renderer_info` ile algılayıp motoru hiç başlatmamak (GPU'suz makinede de kullanıcı için işe yaramaz), shader derlemesini parçalara bölmek, başlangıç çözünürlüğünü düşürmek. Önce gerçek GPU'lu (başlıklı Chrome) ölçüm gerekir.
2. **Yedek poster boşluğu (GİDERİLDİ 12.10.2026, [ADR 0015](0015-entry-gate-and-hero.md) §8; aşağıdaki açıklama düzeltmeden öncesidir):** `film.ts` posterleri yalnızca `!cinemaCapable()` iken yükler. Kapıyı geçen ama sonra motoru başlayamayan ya da kendini kapatan cihazda (WebGL2 yok, çok yavaş GPU, bağlam kaybı) tuval görünür olmaz, `.film-posters` görünür kalır ama `src` hiç atanmadığı için boştur: film yalnızca CSS ışığı üstünde metin gösterir. Metin okunur, görsel yoktur. Düzeltme: motor başarısız olunca ya da yıkılınca posterleri yükle.
3. **Sahne üstünde metin kontrastı (KISMEN ÖLÇÜLDÜ 12.10.2026, [docs/perf/cinema.md "Kontrast"](../perf/cinema.md), [ADR 0015](0015-entry-gate-and-hero.md) §7).** Axe/Lighthouse sahne üstünde piksel bazlı kontrast ölçmez; `?cinema-debug` kancasıyla sahne dondurulup metin kutularının piksellerinden WCAG oranı hesaplandı. Büyük metin (başlık, film sözcüğü ve cümlesi) en kötü pikselde bile ≥ 3:1; küçük paragraf metni (soluk platin) hero'da bir parlak dalganın arkasında 2,7:1'e düşüyordu ve POST shader'ının sol sütun sınırıyla ≥ 5,7:1'e çıktı. Küçük etiketler (en soluk renk) için ölçüm yalnızca iki noktada gerçek metin bölgesinden alındı; kalanı kesin değildir. Başsız Chrome'da, 1440×900, birkaç zaman anında; kapsamlı bir tarama değildir.
4. **Cabinet Grotesk web yayın izni** sahibince doğrulanacak; yedek hazır. Vercel derlemesinde `fonts:fetch`'in çalıştığı ve dosyanın dağıtıma girdiği **canlıda doğrulanmadı**. Dosya yoksa layout'taki `preload` 404 verir (zararsız ama konsol gürültüsü).
5. **`?cinema-debug` kancası üretimde de açık.** Yalnızca görsel durumu (sahne, zaman, gren) değiştirir, veri okumaz ya da yazmaz; ama kullanıcıya dönük bir yüzey olduğundan kapatılıp kapatılmayacağı sahibinin kararıdır.
6. **Mobil LCP** (3,15–3,27 sn) hedefin üstünde; hero başlığı artık Instrument Serif (olası LCP öğesi) ve kritik yola ≈ 40 KB yazı tipi eklendi (EN). Nedensellik doğrulanmadı.
7. **Test kapsamı:** sinema için tarayıcı testleri (`puppeteer-core`) yok; kare ritmi, motorun kendini kapatma davranışı, dil geçişi akışı, Safari ve Firefox, gerçek telefon, ekran okuyucu ile elle deneme yapılmadı.
8. **Commit:** çalışma ağacı commit edilmedi. Üretimdeki site sinema katmanından önceki sürümdür.

## Reddedilen alternatifler

- **three.js / React Three Fiber:** paket boyutu (kodda yazılı gerekçe). Başka alternatiflerin tartışıldığına dair kayıt yok.
- **Önceden render edilmiş sahne videoları** ([ADR 0003](0003-showcase-film-static-render.md)) vitrin kartları için kalır; sinema katmanı onların yerini almaz.
