# ADR 0021: Üretim performansı (görünürlük atlama, CSS bayraklar, yerleşim kararlılığı, sağdan sola CLS) ve kurumsal kanıt (`docs/architecture`, `lib/arch`, entegrasyon modeli)

- **Durum:** Uygulandı ve yerelde doğrulandı, 16.10.2026 (dal `perf/enterprise-proof`, `feat/case-studies` üzerine). **Henüz `main`'e birleştirilmedi ve canlıya alınmadı:** sahibin son isteği "canlı Lighthouse testine hazır rapor" dedi; canlıya alma izni vermedi.
- **Karar:** proje sahibi, 16.10.2026: "Production Optimization & Lighthouse 100/100 Standard". Beş madde: (1) DOM ve betik (düğüm sayısını 1.035'ten düşür, ekran dışını tembel yükle, Lenis/Motion ana iş parçacığını bloklamasın, gereksiz yeniden çizimleri önle); (2) medya ve yazı tipleri (WebP/AVIF, `priority` yalnızca LCP görseli, `font-display: swap` ve yerel alt kümeleme); (3) kurumsal kanıt (`/docs/architecture/` altında Salesforce/SAP/Oracle ve Fail-Safe Queue için somut şema ve arayüzler, sitede hafif SVG/canvas modeli); (4) dil gözden geçirmesi (özellikle Arapça, Almanca, Fransızca, İspanyolca, Çince: "Quiet Luxury" B2B dili; Arapçada CLS 0,00); (5) QA (smoke ve Puppeteer sıkılaştırması, mobilde TBT artışını sıfırlayan senaryolar).
- **Yerine geçtiği:** ADR 0020 §8'in "bayraklar satır içi SVG" kararı (bayraklar artık CSS arka planı, §3) ve ADR 0020 §3'ün "simülatörün canlı sürümü boştakiyle aynı yerleşimde" cümlesinin eksik uygulaması (§4: bazı genişliklerde 49 ila 101 px farklıydı). Başka hiçbir karar geri alınmadı.
- **Tamamlar:** [ADR 0004](0004-motion-and-smooth-scroll.md) (Lenis, Motion), [ADR 0010](0010-briefing-delivery-and-security.md) (imzalı webhook, tek yeniden deneme), [ADR 0015](0015-entry-gate-and-hero.md) (kapı, hero), [ADR 0020](0020-case-study-layer.md) (simülatörler).

## Bağlam: sayı vermeden önce neye bakıldı

Canlı mühür masaüstü 97, mobil 96 idi. Kayıp puanlar iki yerdeydi ve ikisi de ölçülerek bulundu (4× CPU, yavaş 4G, önbellek kapalı iz; yerel Lighthouse; her ikisi de eski yapıyla aynı makinede ve araya girerek):

1. **Ana iş parçacığı maliyeti yazılım baytından değil, yerleşim ve stilden geliyordu.** JavaScript ana yapıya göre yalnızca ~2 KB fazlaydı. İlk tam yerleşim (≈1.470 yerleşim nesnesi) 4× yavaşlatmada 600 ila 900 ms; yazı tipi değişiminde ("fonts changed") tüm düğümler (SVG şekilleri dahil) yeniden stillendi ve ikinci bir yerleşim ≈300 ms daha aldı.
2. **Mobil LCP ≈3 sn (puan ≈0,78) bant genişliği ile belirlenir.** Lighthouse'un simüle LCP'si, gözlenen LCP'den önce istenen her kaynağı (11 betik ≈172 KB, 3 yazı tipi 73 KB, CSS, HTML) kısıtlı ağda indirmeyi ve çalıştırmayı sayar. Bu sayfada LCP öğesi (hero lead metni) 0,4 sn'de boyanır, ama çerçeve (React + Next çalışma zamanı ≈120 KB gz) o sayede "erken" sayılır. Bunu aşağı çeken tek yol ilk yükteki baytı azaltmaktır; çerçeve payı sabittir (bkz. §9).

## Karar

### 1. Film altındaki altı blok, yakına gelene kadar atlanır (`content-visibility: auto`)

Architecture, Showcase, Studio, Briefing, Closing ve footer `cv cv-<ad>` sınıfını taşır (`app/globals.css`, "Skipped until near"). Tarayıcı, görüntü alanına yaklaşık yarım ekran kalana dek bunların stilini ve yerleşimini hesaplamaz: ilk geçiş yalnızca kapı, hero ve filmi kapsar. Metin HTML'de, erişilebilirlik ağacında ve Ctrl+F'te durur (arama bloğu açar), bağlantılar çalışır.

- **Yer tutucu boyutu ölçülmüştür** (`--cv`: üç kırılımda bölümün gerçek border-box yüksekliği; `--cv-pad` bölümün kendi dolgusunu çıkarır, çünkü `contain-intrinsic-block-size` içerik kutusudur) ve `auto` anahtar sözcüğü bir bölüm bir kez çizildikten sonra **gerçek boyutu hatırlatır**: atlanmış bir bölüm sayfa uzunluğunu bir daha değiştirmez.
- **Hero ve film dışarıda:** yapışkan sahnelerdir ve betikle ölçülürler.
- **Çapalar:** atlanmış bölümler yalnızca yer tutucudur; hedefin üstündeki bölümleri **gerçek** yapmadan konum hesaplamak kaydırmayı yüzlerce piksel şaşırtırdı. `lib/cv.ts` `holdLayoutBefore(hedef)` hedefin kendi bölümünü ve öncesindekileri `.cv[data-cv-prime]` ile görünür yapar, yerleşimi boşaltır ve kaydırma bitince bırakır. Beş yol da bunu kullanır: Lenis (`lib/enhance/smooth-scroll.ts`), yerel yumuşak kaydırma (`lib/enhance/content-visibility.ts`, yakalama aşamasında tek dinleyici), diyalogdaki bağlantı (`BreakdownDialog`), kapının hash kaydırması (`EntryGate`) ve istemci içi gezinti (`AnchorPrime`, düzen etkisi `useLayoutEffect` ile Next'in kaydırmasından önce çalışır). **Derin bağlantı** (`/#studio`) sayfa hazır olana dek (`data-cv-ready`) tam yerleşimle açılır (CSS `:has(:target)`).
- **Doğrulandı:** her bağlantı, atlama açıkken ve kapalıyken aynı yere iner: bölümün üstü `scroll-padding-top` (88 px) ± 3 px; masaüstü (Lenis) ve telefon (yerel); derin bağlantı ve `/privacy` sayfasından yumuşak gezinti. Yukarı ve aşağı kaydırmada CLS 0,00. **Görsel eşdeğerlik:** en/ar/de/zh, üç boyut, 96 görünüm adımı, ±1 piksel toleransla piksel eşit (bkz. §6). İlk karşılaştırma ham farkı %2 ila %8 gösterdi; fark bir piksellik yuvarlamaydı (paint containment bölümü tam piksele oturtur), eksik, kırpılmış ya da kaymış blok yoktu.

### 2. İlk ekran ve betikler

- **Kapı başlığı ve lead yalnızca kayar** (`gate-slide`: yalnızca `translate`, gecikme ve opaklık yok). Önceki `gate-rise` opaklık 0'dan, 0,3 sn + gecikmeyle başlıyordu: tarayıcı "LCP öğesi" olarak ilk opak boyamayı ölçtüğü için gözlenen LCP gecikmenin sonuna denk geliyordu. Eyebrow ve pazar kartları solmayı korur.
- **Eklentiler dört yield'li görevde başlar** (`lib/enhance/index.ts`: `GROUPS` ve `scheduler.yield()`, yoksa `setTimeout`). On bir başlatma tek görevdi; TBT bir görevi 50 ms'nin üstünden sayar, aynı iş dört kısa görevde sayılmaz.
- **Yüklemede geometri okunmaz.** `rings.ts` (yüklemede `getBoundingClientRect`) atlanan Architecture bloğunu çizdirirdi; artık gözlemciyle kurulur. `ShowcaseStrip` ilk ölçümünü yakına gelince yapar ve eşit kenar durumunda yeniden çizmez (kaydırma olayı saniyede onlarca kez aynı değeri yazıyordu).
- **Dil menüsü ilk ilgide kurulur** (üzerine gelme, odak, dokunma). Kapalıyken `inert` ve görünmezdi ama Arapça ve Çince adlar her ilk yerleşimde bir yazı tipi araması isterdi; aynı adlar footer'da bağlantı olarak ve `head`'de `hreflang` olarak durur.
- **Gereksiz çizim/hesap:** `ClientI18nProvider` bağlam değeri `useMemo`; briefing'in türetilmiş değerleri (`floorText`, bantlar) `useMemo`/`useCallback`, `setField` kararlı ve hatasız alan için `errors` nesnesine dokunmaz; `formatMoney` her çağrıda `Intl.NumberFormat` kurmak yerine dil+para birimi başına bir kez kurar (briefing her çizimde yedi tane kuruyordu). Yerel öğelere (`<button>`) verilen işleyicilere `useCallback` eklemek bir etki yaratmaz; eklenmedi.
- **Lenis ve Motion** zaten dinamik `import()` ile ve ilk etkileşimde yüklenir (ADR 0004); değişmedi. `next/dynamic` ya da `React.lazy` ile **sunucu çıktısını** bölmek yerine simülatörler zaten tembel parçadır (yakına gelince inen canlı parça, sunucuda boşta çizilir).
- **Sinema motoru ana iş parçacığında değildir (masaüstü TBT'nin asıl nedeni).** Masaüstünde motor kapalıyken (`?cinema=off`) iki yapı da 99 ila 100 alıyordu; açıkken 84 ila 99 (TBT ≈50 ila ≈400 ms, çift modlu). Profil (`Profiler` + `longtask`, başsız Chrome, SwiftShader): `getContext('webgl2')` ana iş parçacığını 44 ila 118 ms (en çok 146), shader durum sorguları (`getProgramParameter`, derleme sürerken GPU sürecini bekler) 98 ila 237 ms tutuyordu. İlk düzeltme (sorgu aralığını kare başına yerine 150 ms yapmak) tek başına yetmedi; asıl çözüm motoru **worker'a** taşımaktır. `lib/cinema/core.ts` motorun kendisidir (sayfayı, `window`'u ve `document`'i bilmez; girdisi `EngineInput` düz sayıları, çıktısı iki geri çağrıdır: ilk kare ve kendini kapatma), `lib/cinema/worker.ts` onu bir `OffscreenCanvas` üzerinde çalıştırır, `lib/cinema/engine.ts` sayfa tarafıdır (tuvali `<body>`'e koyar, `transferControlToOffscreen`, hedefleri/işaretçiyi/kaydırmayı/sekme görünürlüğünü/boyutu/glitch'i **yalnızca değiştiklerinde** mesajlar). **Yedek:** `OffscreenCanvas`/`Worker` yoksa, `Worker` kurucusu fırlatırsa, worker `failed` derse (workerda WebGL2 yok, shader derlenmedi) ya da 25 sn içinde ilk kare gelmezse tuval ve worker temizlenir ve **aynı çekirdek** ana iş parçacığında çalışır (`?cinema-worker=off` bunu zorlar; çekirdek ayrı lazy parçadır, yalnızca bu yolda iner). Kendini kapatma ve bağlam kaybı worker'dan `retire` ile gelir ve eski davranışla aynıdır (film posterleri yüklenir). **Eşdeğerlik:** sabit zamanda beş durumun (ortam, kozmik, organik, monolit, monolit-geç) kareleri eski motorla **piksel piksel aynı** (fark %0,000; baseline-baseline ortam karesi bile bir gölge içinde oynuyordu, çünkü tuval 1,4 sn'de solarak açılır: karşılaştırmalar solmanın bitmesini bekler). Sabit zamanda (test/still kare) kalite denetleyicisi çalışmaz, aksi hâlde yazılım çizicide çözünürlük düşüp resim zamana bağlı olurdu. `?cinema-debug` kancası korunur (`stats()` worker modunda en son bildirilen değerdir).

### 3. Bayraklar: CSS arka planı (`app/flags.css`, `scripts/build-flags.mjs`)

Satır içi SVG bayrak başına 3 ila 19 düğümdü; sayfada ≈25 bayrak vardı: DOM'un %10'u ve her yazı tipi değişiminde yeniden stillenen şekiller. Bayrak artık **tek boş öğe** (`<span class="flag" data-flag="us">`), resim `app/flags.css`'te veri URI'li SVG. Çizim `scripts/build-flags.mjs`'te yaşar ve `npm run flags:check` CSS'in üreticiyle aynı olduğunu doğrular (denetim çalıştırır). Palet kuralı sürer: beyaz yerine platin, siyah yerine grafit, saf `#fff/#000` yok; emoji yok. **−100 DOM düğümü**, ek istek yok, CSS +4,3 KB ham.

### 4. Yerleşim kararlılığı: simülatörler ve sağdan sola

- **Simülatörlerin boştaki ve canlı sürümü aynı boydaydı yalnızca iddia olarak.** Ölçüm (`en`, 360 ila 1440 px, kuyruk ve güvenlik): kontrol satırı iki satıra sarınca canlı sürüm 49 ila 101 px uzundu; durum satırları da duruma göre uzar/kısalırdı. Etkisi iki yerdeydi: (i) kartlar ekrana girerken içerik aşağı kayıyordu (CLS), (ii) **çapaya gidişte hedef 30 ila 130 px aşağıda inerdi**, çünkü sayfa kaydırma sırasında uzuyordu (bu `perf` işinden önce de vardı). Çözüm `components/sim/Reserve.tsx`: değişen her satır, **aynı ızgara hücresinde** `visibility: hidden` ve `aria-hidden` seçeneklerini taşır; kutu en uzun seçeneğin yüksekliğidir (o genişlikte, o dilde). Kontrol satırı baştan çizilir (`inert`, görünmez) ve geçiş düğmesi iki etiketinin genişliğini korur. Sonuç: yedi dilin dördünde ve üç genişlikte tüm durumlar boyunca **0 px fark**; bütün çapalar artık `scroll-padding-top` değerine tam iner.
- **Sağdan sola CLS (yalnızca Chrome'da, yalnızca `/ar`):** iki ayrı neden bulundu, ikisi de aynı sayfa `dir="rtl"` zorlanarak İngilizcede yeniden üretildi. (a) `overflow: hidden` bir kaydırma kapsayıcısıdır; içindeki resmin yakınlaştırması (`--mf` ile `scale`) sağdan sola sayfada yerleşim kayması sayıldı (kaydırmada CLS 0,03 ila 0,04). `.frame`, `.beam-card`, `.show-card` artık `overflow: clip` (aynı kırpma, kaydırma kapsayıcısı değil; `hidden` geri dönüş olarak durur). (b) Metni değişen bir metin düğümü, sağdan sola başlangıç kenarı sağda olduğundan büyüdükçe kayma sayıldı (simülatör etkileşimlerinde 0,015). Canlı satırlar artık metin düzenlemek yerine **yeni öğe** olur (`key`), canlı bölge (`role="status"`) kalıcı sarmalayıcıdadır. Sonuç: kaydırma ve simülatör kullanımında `/ar` CLS **0,00** (üç genişlik).
- **Simülatör 3 (yeni):** entegrasyon modeli de aynı kuralla yazıldı; dört sistem ve üç genişlikte boyu sabit (§5).

### 5. Kurumsal kanıt

`docs/architecture/` (README, `canonical-event.schema.json`, `fail-safe-queue.md`, `security-envelope.md`, `integrations.md`, `examples/`), referans uygulama `lib/arch/` (bağımlılıksız TypeScript: tipler, doğrulayıcı, imza/doğrulama/mühürleme, kuyruk durum makinesi, eşleyiciler, deterministik benzetim) ve `tests/arch/` (65 sözleşme testi, `npm run arch:verify`, Node'un kendi test koşucusu).

- **Üç kanıt katmanı, hiçbir iddia yüksek katmana taşınmaz.** **A:** bu depoda çalışan üretim kodu (briefing teslimi: `x-syncflow-signature: sha256=<hex>`, `idempotency-key`, en çok iki deneme/9,5 sn, 4xx kesin: `lib/server/deliver.ts`, duman testiyle doğrulanır). **B:** referans uygulama + yürütülebilir testler (yedekli kuyruk, sıfır güven doğrulaması, AES-GCM, entegrasyon eşlemeleri). **C:** iddia edilmeyen (README "Not claimed": canlı bağlayıcı, ortaklık/sertifika/uyum, uptime/SLA/verim, mevzuat uyumu, referansın olduğu gibi üretime hazır olduğu, anahtar yönetimi).
- **Kuyruk** (`lib/arch/queue.ts`): `accept` yanıtlamadan önce kalıcı depoya yazar; en az bir kez gönderim aynı id ile; alıcı id'yi bir kez uygular (etkili bir kez); sıra korunur (baş-sıra engeli bedeliyle); `maxAttempts` (6) sonra ölü mektup, silinmez; **kesinti ≠ zehirli olay:** üst üste hata + başarısız sağlık yoklaması devreyi açar, yoklamalar deneme harcamaz (kesinti olayı öldürmez), yoklama geçince sıralı boşalır; sağlıklı kanalda tek olayın hatası zehirli sayılır ve devreyi açmaz. Dokuz deterministik senaryoda (sağlıklı, 20 sn kesinti, titreyen kanal, %30 kayıp onay, zehirli olay, inatçı olay, kesintide iki yeniden başlatma, tekrar gönderen üretici, hepsi bir arada) **kayıp 0, çift uygulama 0, sıra korunur, deneme sınırı korunur**; sonuç tablosu `fail-safe-queue.md`'ye koddan üretilip yazılır ve test belgeyle kodun aynı olduğunu denetler.
- **Zarf** (`lib/arch/envelope.ts`): HMAC-SHA256 (RFC 4231 test vektörüyle), sabit zamanlı karşılaştırma, tazelik penceresi (5 dk, iki yön), şekil doğrulaması; sıra önemlidir: gövdeye hiçbir şey imza doğrulanmadan bakılmaz. AES-256-GCM, mesaj başına taze 96 bit IV (1.000 mesajda tekrar yok), değişen şifreli metin/IV/anahtar açılmaz.
- **Şema ve doğrulayıcı uyumu:** JSON Schema ve TypeScript doğrulayıcısı birbirine karşı sınanır (test içinde küçük bir şema değerlendiricisi; bağımlılık yok); sınama doğrulayıcının "ek alan" kabul ettiğini ortaya çıkardı ve düzeltildi (şema `additionalProperties: false`).
- **Eşleyiciler** (`lib/arch/mappers.ts`): sistem başına tek bildirimsel tablo (Salesforce Lead, HubSpot Contact, SAP satış siparişi, Oracle alacak faturası): eşleyici, belge, sitedeki model ve testler aynı tabloyu okur. **Örnek şekillerdir:** satıcıların herkese açık adlandırmasına uyar, bir satıcı sandbox'ına ya da API referansına karşı üretilmedi/doğrulanmadı; ortaklık/sertifika/uyum ima edilmez (belgede, sitede, yedi dilde).
- **Sitedeki model** (Architecture kart V, eski durağan hub şemasının yerine): bir kanonik olay, dört sistem sekmesi, eşleme çizgileri (SVG, canvas yok), gönderilen yük; sunucuda ilk sistem için boşta çizilir, canlı parça yakına gelince iner (üç kart arasındaki tek ortak tembel yükleyici). Sayfada gösterilen yük, belgedeki örnek dosyayla bayt bayt aynıdır (tarayıcı testi). Güvenlik akışı simülatörü artık **aynı** modülleri çağırır (kendi kriptosunu yazmaz); yani ekranda çalışan, testle doğrulanan koddur.
- **Siteye eklenen yeni iddia yok:** kart V'in metni ("can move between the site and the systems") değişmedi; model yeteneği gösterir, canlı bağlayıcıyı iddia etmez.

### 6. QA

- **`npm run smoke`** (HTTP): yeni bölüm; yedi dilde altı `cv` bloğu, hero/film atlanmaz, **akış yok** (bölüm gizli bloğa akmaz: bkz. §7), bayraklar tek öğe, entegrasyon modeli sunucuda o dilin başlığıyla, dil menüsü sunucu çıktısında yok, hayalet satırlar `aria-hidden`; CSS kuralları; kapının `gate-slide`'ı. **180/180** (son koşu, worker yapısıyla).
- **`npm run qa:browser`** (`scripts/browser-flow.mjs`, `puppeteer-core` devDependency, tarayıcı indirmez): kapı ve bayraklar, tembel dil menüsü, çapalar (masaüstü ve telefon, dört bölüm), derin bağlantı ve yumuşak gezinti, kaydırmada CLS (en/ar/de, masaüstü/telefon), simülatörlerde boy ve davranış (kuyruk engelle/geri ver, imza/yeniden gönderim/kurcalama), entegrasyon modeli (dört sekme, payload doğrulaması, boy), sinema katmanı (varsayılan yol worker'dır ve sayfa iş parçacığı **hiç** WebGL context'i yaratmaz; `?cinema-worker=off` ve `Worker` kurucusu fırlatınca ana iş parçacığı yedeği canlı olur; aynı sabit monolit karesi iki yolda %0,05'in altında piksel farkı verir ve boş değildir), `--parity` ile görsel eşdeğerlik; `--quick` ve `--full`. Son koşu: varsayılan küme **80/80**, `--only=parity` **5/5**.
- **`npm run perf:gate`** (`scripts/perf-gate.mjs`, `scripts/perf-budget.json`): mobil profilde (Lighthouse'unki: 412×823 @1,75×, 4× CPU, yavaş 4G, önbellek kapalı) DOM, yerleşim, stil, betik, görev süresi, TBT tahmini, uzun görev, CLS, ilk boyama; ısınmadan sonra medyan; **`--baseline` eski yapıyla araya girerek A/B** (hiçbir metrik %10'dan fazla kötüleşemez). Bütçeler yeni ile eski yapı arasına oturur; **negatif kontrol:** eski yapı dört bütçeyi aşar (DOM, yerleşim, görev süresi, ilk boyama), yeni yapı geçer.
- **Denetim bölüm 12** (`faz2-denetim.mjs`): yukarıdakilerin kod düzeyi karşılıkları, `arch:verify`'ı çalıştırır.
- **"TBT artışını sıfırlayan senaryo" bir söz değildir, bir kapıdır:** `perf:gate` ve `qa:browser` bir gerilemeyi ölçülmüş sayıyla yakalar; TBT'yi sıfıra indirmeyi vaat etmez (§8, §9).

### 7. Reddedilenler

- **Bölümleri `<Suspense>` ile sarıp kademeli hidrasyon.** Denendi: sunucu bölümleri gizli bir bloğa (`<div hidden id="S:…">`) akıtıp bir `$RC` betiğiyle yerine koyuyor. JavaScript'siz ya da betik çalıştırmayan okuyucuda bölümler **görünmez** olur, ve bu bir ölçüm kazancı uğruna kabul edilemez. Geri alındı; smoke ve denetim sayfa ilk yanıtta eksiksizdir kuralını denetler.
- **"Lighthouse 100/100" vaadi.** Yazılmadı ve yazılmaz: yalnızca ölçülmüş sayı yayınlanır (`lib/metrics.ts`). Mobil LCP bant genişliği sınırlıdır (bağlam, madde 2); masaüstünde yerel ölçüm 99 ila 100'e çıktı, mobilde 91,5'ten 93,5 (medyan), tek çalıştırmalarda 95'e kadar. Canlı sayılar canlıda ölçülür (§8).
- **`font-display: swap` Cabinet Grotesk için.** Yazı tipi `optional`'dır: ya ilk boyamada gelir ya da o görünümde hiç kullanılmaz; `swap` yerleşim kaydırırdı ve ITF lisansı alt kümelemeyi yasaklar. OFL yazı tipleri (Instrument Sans, Instrument Serif, Syne) zaten alt kümelenmiş woff2, `swap` ve ölçüsü eşlenmiş yedek yüzle gelir (CLS 0).
- **WebP/AVIF ve `priority`.** Görseller zaten WebP; PNG yalnızca platformların istediği yerde (apple-icon, OG, logo-512); videolar H.264 + VP9 (Remotion AV1 üretmez). LCP öğesi bir metindir; `next/image` `priority` gerekmez ve eklenmedi.
- **Yazı tiplerini sonradan yüklemek** (LCP grafiğinden 73 KB çıkarmak için): ilk boyamada yazı tipsiz metin göstermek, görünür bir tasarım bozulması olurdu.
- **Lucide simgelerini CSS maskeye çevirmek** (≈50 düğüm): çizgi kalınlığı varyantları ve görsel gerileme riski, kazanç küçük; ertelendi.

### 8. Ölçümler (yerel, aynı makine, eski yapıyla araya girerek; 16.10.2026)

Bunlar **yerel** sayılardır: yayınlanmazlar, canlı mühür değildir (`lib/metrics.ts` değişmedi). Profil: Lighthouse 13.5, mobil (412×823 @1,75×, 4× CPU, simüle yavaş 4G) ve masaüstü (1350×940), Chrome 154 headless.

| | Eski | Yeni |
|---|---|---|
| Mobil Lighthouse, medyan (n=4) | 91,5 | **93,5** (tekil: 91 ila 95) |
| Mobil TBT, medyan | 174 ms | **115 ms** |
| Mobil FCP / SI | 1.090 ms / 2.138 ms | **926 ms / 1.941 ms** |
| Mobil LCP | 3.092 ms | 2.985 ms (bant genişliği sınırlı, bağlam madde 2) |
| Masaüstü Lighthouse (n=3) | 92, 92, 92 (TBT 218–228) | 84 (ilk, soğuk), 99, 100 (TBT 345, 93, 46) |
| İz, 4× CPU: ilk yerleşim | 511 ms | **≈320 ms** |
| İz, 4× CPU: toplam Layout / UpdateLayoutTree | 858 ms / 433 ms | **≈470 ms / ≈240 ms** |
| İz, 4× CPU: yazı tipi değişiminde ikinci yerleşim | 223 ms | **≈45 ms** |
| `perf:gate` (5 ek çalıştırma): yerleşim / görev / ilk boyama | 550 ms / 1.733 ms / 1.476 ms | **270 ms / 1.308 ms / 1.096 ms** |
| DOM düğümü | 1.035 | **986** (bayraklar −100, entegrasyon modeli +52) |

Masaüstündeki yeni yapının ilk Lighthouse çalıştırması 84 (TBT 345) verdi: yeni başlatılmış sunucuda, soğuk önbellekte, ilk çalıştırma; sonraki ikisi 99 ve 100. Bu sapma ve mobil sayıların gürültüsü (aynı yapıda TBT 55 ila 669 ms) yüzünden kararlar **tek tek Lighthouse'a değil, belirleyici sayaçlara** (düğüm, yerleşim nesnesi, Layout/Style ms) dayandırıldı; `perf:gate` bu sayaçları ısınma sonrası medyanla verir.

**Son ölçüm: motor worker'a taşındıktan sonra (aynı gün, yeni oturum).** Profil aynı; iki fark vardır ve ikisi de tabloyu yukarıdakiyle **karşılaştırılamaz** yapar: Chrome 155 (ölçümler arasında 154'ten güncellendi) ve makine ölçüm sırasında ≈%40 yük altındaydı (kullanıcının kendi Chrome, Edge, VS Code ve Creative Cloud süreçleri; denetlenmedi). Eski ve yeni yapı **araya girerek** koşuldu (A, B, A, B...), bu yüzden yük ikisine eşit biner; yalnızca iki sütun birbiriyle karşılaştırılır.

| | Eski | Yeni |
|---|---|---|
| Masaüstü Lighthouse, performans (n=6, `/`) | 98 (96–99) | **100** (99, 100, 100, 100, 100, 100) |
| Masaüstü TBT | 110 ms (104–151) | **0 ms** (altı koşunun altısında) |
| Masaüstü FCP / LCP | 353 / 685 ms | 321 / 734 ms (LCP +49 ms; puanı etkilemez, nedeni araştırılmadı) |
| Mobil Lighthouse, performans (n=5, `/`) | 81 (80–86) | **92** (86, 87, 92, 93, 93) |
| Mobil TBT | 526 ms (335–551) | **149 ms** (63–335) |
| Mobil FCP / LCP | 910 / 3.119 ms | 1.061 / 3.154 ms (LCP bant genişliği sınırlı, bağlam madde 2) |
| Erişilebilirlik, En iyi uygulamalar, SEO | 100, 100, 100 | 100, 100, 100 (iki sunucu, iki profilde medyan) |
| Ana iş parçacığında WebGL (üç yükleme, profil) | `getContext` 44–118 ms, `getProgramParameter` 98–237 ms | **0 ms** (sayfa iş parçacığı WebGL'e hiç dokunmaz) |
| `perf:gate` (yük altında, 3 çalıştırma, yeni / eski) | | yerleşim 452 / 1.296 ms (−65 %), görev 1.975 / 2.960 ms (−33 %), ilk boyama 1.364 / 2.260 ms (−40 %) |

Okuma: **masaüstü Lighthouse yerelde dört kategoride de 100'dür** (bir koşu 99). Mobil 92 ila 93'tür ve bu yapıda **bir tavan** vardır: mobil LCP ≈3,1 sn (puan ≈0,78) çerçeve ve yazı tipi baytlarıyla belirlenir (bağlam madde 2), TBT'yi sıfırlamak bile bu tavanı kaldırmaz. İki yapıda da ilk iki mobil koşu 86 verdi (TBT 335): makine yükünün en yüksek olduğu an; kararlar bu yüzden tek koşuya değil sıralı karşılaştırmaya dayanır. `perf:gate`'in **mutlak bütçeleri** sessiz bir makine için ayarlıdır (bkz. yukarıdaki ilk tablo: 270 / 1.308 / 1.096 ms); yük altında hem yeni hem eski yapı onları aşar, bu yüzden bu koşuda dört bütçe kontrolü kırmızı verdi ve **bu bir uygulama gerilemesi olarak okunmamalıdır**; geçerli olan, aynı koşudaki göreli fark ve sessiz makinede alınan ilk tablodur.

### 9. Sınırlar ve açık kalanlar

- Mobil LCP ≈3 sn'dir (puan ≈0,8): React + Next çalışma zamanı (≈120 KB gz) ve üç yazı tipi ilk yükte bulunur ve Lighthouse'un simülasyonu bunları LCP yoluna katar. Çerçeve olmadan (adalar, kısmi hidrasyon) ya da yazı tipi ve betik baytı olmadan aşağı inmez; ikisi de bu işin kapsamında değildir.
- Canlı Lighthouse bu işin dışındadır ve izin olmadan başlatılmaz (canlıya alma ayrı bir karardır). Canlı sayılar, birleştirme ve yayından sonra `npm run live` ve `npm run perf` ile ölçülüp `lib/metrics.ts`'e yazılır.
- `docs/architecture` referanstır: canlı bağlayıcı, ortaklık, sertifika, uyum, uptime/SLA yok. `MemoryStore` testler içindir.
- `content-visibility` ilk yerleşimi kaydırmaya ertelemez gibi okunmamalı: bir blok ekrana yaklaşırken yerleşimi o anda hesaplanır (bir kez); gerçek cihazda uzun bir film kaydırmasında en büyük blok (Architecture) için tek seferlik bir yerleşim vardır. Daha ince granülerlik (kart başına) denenmedi; ölçülürse bir sonraki adımdır.
- Dil gözden geçirmesi (§10) görünür metinleri kapsar; hukuki sayfaların köşeli parantezli yer tutucuları bu işin konusu değildir ve avukat onayı bekler.
- **Worker yalnızca başsız Chrome 154/155'te (yazılım GL) sınandı.** Gerçek GPU'lu masaüstü, Safari ve Firefox ölçülmedi; `OffscreenCanvas` üzerinde WebGL2'si olmayan tarayıcılar ana iş parçacığı yedeğine düşer (bu yol, `Worker` kurucusunun fırlatması ve `?cinema-worker=off` ile sınandı, gerçek bir eski tarayıcıda sınanmadı). Gerçek GPU'da ana iş parçacığı kazancı daha küçük olabilir (orada `getContext` ucuzdur); worker'ın bedeli ek bayttır (eski tek parça 6,7 KB gz; şimdi sayfa tarafı 2,1 KB + worker parçası 8,8 KB gz ≈ 10,9 KB, yalnızca ilk boyama ve boşta kalma sonrası, yalnızca kapıyı geçen masaüstünde; ana iş parçacığı yedeği 2,1 + 7,5 KB) ve her karede en çok bir küçük mesajdır. Worker kare süresi denetleyicisi (24 ms) kendi iş parçacığında çalışır: sayfa meşgulken kare süresi şişmez, ama sayfa ile worker arasındaki gecikme (bir kare) kaydırma hızı tahminine girer.
- **Worker'ın dağıtımı:** Turbopack worker'ı `/_next/static/chunks/turbopack-worker-*.js` olarak `application/javascript` ile sunar (ve Turbopack çalışma zamanı ile worker parçasını içeri alır); `worker-src 'self' blob:` zaten CSP'dedir ve `CSP_MODE=enforce` ile ayrı bir sunucuda da canlıya geçti (tarayıcı akışı 6/6). `new URL('./worker.ts', import.meta.url)` ayrıca `.next/static/media/worker.<özet>.ts` olarak **kaynak dosyayı** yayımlar; hiçbir tarayıcı bunu istemez (worker parçasından çalışır), içinde sır yoktur (kod zaten derlenmiş hâlde herkese açık), ama kullanılmayan bir kaynak kopyadır. Vercel'de aynı yapının davranışı canlıda doğrulanmadı.
- Masaüstü LCP yeni yapıda ≈50 ms yüksek ölçüldü (734 / 685 ms, altı koşunun altısında). Puan 1,0 kalır; nedeni (yeni bölümlerin ilk yerleşimi mi, yazı tipi sırası mı) ayrıca araştırılmadı.

### 10. Dil gözden geçirmesi

Yedi dilin görünür metni (Meta, Hero, Gate, Architecture, Showcase, Studio, Closing) İngilizcenin yanında okunup kayıt ve terim tutarlılığı açısından gözden geçirildi; düzeltilen yerler (yalnızca değer; anahtar, yer tutucu, NBSP ve `’` kuralları korundu):

- **Türkçe:** "sermaye merkezi" → "finans merkezi" (Türkçede yerleşik terim), "Küresel servet" → "Küresel servet yönetimi", "Müvekkilin ilk okuduğu şey ölçülülüktür" → "…ketumluktur" (discretion), `başvuru` → `talep` (bir iş başvurusu çağrışımı vardı), "derli toplu" (gündelik) → "sakin".
- **Almanca:** "Fließt wie Flüssigkeit" (totoloji) → "Bewegt sich wie Flüssigkeit" (başlık, `og` başlığı ve alternatif metin), "Mandat" (hukuk jargonu) → "Zusammenarbeit", "Globales Vermögen" → "Private Wealth, global", "Asiatische Drehkreuze" → "Finanzplätze in Asien" (kapıdaki "Finanzplatz" ile tutarlı), "herausgeplant" (uydurma sözcük) cümlesi yeniden yazıldı.
- **Fransızca:** "Pôles asiatiques" → "Places financières d’Asie", "Fortunes mondiales" → "Gestion de fortune mondiale", "sécurité intégrée" (yanlış: yerleşik güvenlik) → "tolérante aux pannes" / "conçue pour résister aux pannes", "faibles tolérances" → "tolérances serrées" (teknik terim), "Rien n’est cru…" → "Rien n’est digne de confiance tant qu’il n’est pas vérifié", "Demande entreprise" (calque) → "Demande grand compte".
- **İspanyolca:** "Inmobiliaria de lujo" (emlak ofisi) → "Inmuebles de lujo", "Nada es de fiar…" (gündelik) → "Nada merece confianza…", "Centros de Asia" → "Plazas financieras de Asia" ("plaza financiera" ile tutarlı).
- **Çince:** "资本中心" → "金融中心", "全球财富" → "全球财富管理", "亚洲枢纽" → "亚洲金融中心", **"垂询" → "洽询" (dört yerde):** 垂询 bir üstün bir alta sorması demektir (müşterinin stüdyoya sorusu için yanlış yön).
- **Arapça:** metin düzeyi yüksek (MSA, tutarlı terimler: الإحاطة, نظام الأعمال, المركز المالي); yalnızca "مراكز آسيا" → "المراكز المالية في آسيا". Simülatör cümlelerinde sayı-isim uyumu sorununu (10 حقول / 11 حقلًا) önlemek için durum cümlesi "عدد الحقول المُعيَّنة: {count}" biçiminde, ve kod belirteçleri çift yönlü izolasyonla (U+2066…U+2069) yazılır.
- Not (kararlaştırılmadı, sahibe): Çincede "数字建筑" (dijital yapı/BIM çağrışımı) yerine kurumsal alıcı için "数字架构" daha tanıdık olabilir; markanın "architect" metaforunu bozacağı için dokunulmadı.

## Nasıl doğrulanır

```
npm run check                     # mesajlar (503 anahtar × 7 dil), typecheck, lint
node faz2-denetim.mjs             # bölüm 12 dahil
npm run arch:verify               # 65 sözleşme testi
npm run build && npx next start -p 3100
npm run smoke -- http://localhost:3100
npm run qa:browser -- http://localhost:3100            # --quick | --full | --parity | --only=cinema
npm run perf:gate -- http://localhost:3100 --baseline=http://localhost:3101
```
