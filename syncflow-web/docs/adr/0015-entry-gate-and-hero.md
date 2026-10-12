# ADR 0015: Giriş kapısı, sinematik Hero ve devasa kimlik

- **Durum:** Kabul edildi ve uygulandı, 12.10.2026. Kod `main` dalının çalışma ağacındadır, **commit edilmemiştir** ([ADR 0014](0014-cinematic-layer.md) ile birlikte).
- **Karar:** proje sahibi, 12.10.2026. İstek: ilk girişte pazar ve dil soran sinematik tam ekran bir kapı; derinlik veren, Lenis ile akışkan, "oradaymışım" hissi veren bir Hero ve maske geçişleri; devasa B1 amblem ve wordmark. Sahibin sonraki üç kararı: (1) amblem saf platin kalır, şampanya yalnızca birincil CTA ve tekil vurgularda; (2) arama motoru botları kapıyı görmez (User-Agent baypası); (3) 3100'deki eski süreç kapatılır, belgeler eşitlenir, son üretim build'i alınır.
- **Tamamlar:** [ADR 0002](0002-launch-locales-and-market.md) (dil ve pazar URL'de, çerez yok), [ADR 0004](0004-motion-and-smooth-scroll.md) (Lenis, maskeli giriş), [ADR 0014](0014-cinematic-layer.md) (sinema katmanı). **Dokunmadığı:** marka paketi kuralları, fiyat, hukuk dili, CSP.

## Bağlam

Site "sessiz lüks"tü ve sinema katmanı ([ADR 0014](0014-cinematic-layer.md)) onun üstüne ışık ve hareket getirdi. Eksik olan ilk andı: ziyaretçi sayfaya düşüyor, dilini ve pazarını kendisi aramak zorunda kalıyordu; kimlik (amblem, wordmark) yalnızca küçük bir üst bar kilidiydi. Kurallar: dil yalnızca URL'den gelir, çerez ve tarayıcı depolaması yok, IP'ye ya da tarayıcı diline göre zorla yönlendirme yok ([ADR 0002](0002-launch-locales-and-market.md)); içerik JS yokken görünür olmalı ([ADR 0004](0004-motion-and-smooth-scroll.md)); sitede yedi dil ya da "küresel erişim" iddiası yok ([ADR 0009](0009-niche-and-languages.md)); logoda şampanya, parlama, gölge, gradyan yok (`brand/README.md`).

## Karar

### 1. Giriş kapısı (`components/gate/EntryGate.tsx`)

- **Sunucuda açık gelir, gerçek bağlantılarla.** `app/[locale]/page.tsx` kapıyı render eder; adreste geçerli bir `?m=` yoksa (ve istemci bot değilse) HTML'de `data-state="open"` ile durur. İki pazar seçeneği düz `<a href>`'tir ("/tr?m=tr", "/?m=int"): **JavaScript olmadan da kapı geçilir**. `?m=` varsa kapı HTML'e hiç girmez (dönen ziyaretçiye ek bayt yok).
- **JS yalnızca zenginleştirir:** pazar kartına tıklamak seçimi işaretler ve o pazarın önerdiği dili (Türkiye: Türkçe, yurt dışı: İngilizce) çip olarak sunar; dil çipleri **yalnızca yayındaki diller**dir (`i18n/launch.ts`). "Giriş" ya da "seçmeden devam et" kapıyı kapatır. JS'e bağlı parçalar ilk boyamadan itibaren yer tutar ama gizlidir (`visibility`), böylece hidrasyonda hiçbir şey kaymaz.
- **Seçim yalnızca adreste.** Aynı dilde `history.replaceState` ile `?m=` eklenir (sunucuya gidiş yok); başka dilde `router.replace` kullanılır ve yeni sayfa perdeyi kendisi kaldırır (modül düzeyinde `revealPending`). Çerez, `localStorage`, `sessionStorage` yoktur ve **denetim bunu sınar**. Tek bellek, sekmenin modül değişkenidir (`passed`, `rememberMarket`): siteyi bırakıp logoyla `/`'a dönen ziyaretçiye kapı tekrar sorulmaz; sekme kapanınca ya da sayfa yenilenince gider (yenilemede adresteki `?m=` işi görür).
- **Tuzak değil:** `role="dialog"`, `aria-modal`, başlığa odak; Esc kapıyı seçimsiz kapatır; kapı açıkken arkadaki sayfa `inert` (odak ve ekran okuyucu erişimi yok) ve kaydırma CSS ile kilitlidir (`html:has(.gate[data-state='open'])`). Lenis `gate:change` olayıyla durur (kaydırmayı `scrollTo` ile yaptığı için CSS kilidi onu durdurmaz). Kapı kapanınca odak `<main>`'e gider; adres bir bölüm çapası taşıyorsa (`/#briefing`) perdenin arkasında oraya kaydırılır.
- **Perde:** kapı `clip-path` ile yukarı kalkar (1,15 sn, `--ease-lux`), emblem büyüyüp solar, metin yükselip solar. Aynı anda arkadaki hero girişi başlar: kapı açıkken `[data-mask='load'] .mi` ve hero monogramı `animation-play-state: paused` (CSS `:has`), kapı kapanmaya başlayınca oynar. Azaltılmış harekette süreler küçülür (global kural).

### 2. Pazar (`lib/market.ts`)

İki pazar: `tr` (Türkiye) ve `int` (yurt dışı; sahibin iki fiyat tabanı ve iki yayın dili kararıyla örtüşür). Adreste `m` parametresi olarak taşınır, **beyaz listeyle** okunur (`parseMarket`; bilinmeyen değer yok sayılır, asla yansıtılmaz). Dil seçici dil değiştirirken `?m=`'yi taşır. **Şu an pazarın tek etkisi:** (a) önerilen dil, (b) başvuruya isteğe bağlı `market` etiketi (`briefingSchema`: `z.enum(MARKETS).optional()`, webhook yüküne eklenir, [docs/n8n-briefing.md](../n8n-briefing.md)); konu satırı, sınıflandırma ve bütçe basamakları ona bağlı değildir. **Fiyat, hukuki metin, vitrin ya da para birimi pazara göre değişmez**: bu tanımsızdır ve CLAUDE.md gereği sahibin kararıdır (Avrupa € karşılığı da tanımsız). "International" ve "Yurt dışı" etiketleri küresel bir erişim iddiası değildir (denetimdeki iddia kapısı geçer).

### 3. Arama motoru botları (`lib/crawlers.ts`)

Sayfa, `User-Agent` bilinen bir arama motoru ya da bağlantı önizleme botu ise (Googlebot, Google-InspectionTool, Bingbot, DuckDuckBot, Yandex, Baidu, Applebot, facebookexternalhit, Twitterbot, LinkedInBot, Slackbot, WhatsApp, Discord, Telegram ve genel `bot|crawler|spider`) kapıyı HTML'e koymaz. **İçerik herkes için aynıdır**, kapı yalnızca önündeki bir katmandır; bu yüzden bir cloaking değildir. User-Agent taklit edilebilir ve bu sorun değildir: kapı bir nezaket katmanıdır, erişim denetimi değildir. **Lighthouse ve PageSpeed Insights bilerek listede yok**: ölçtükleri şey ziyaretçinin gördüğü şey olmalı. Sayfalar istek başına render edilir ve önbelleğe alınmaz ([ADR 0001](0001-csp-report-only.md)); bir CDN ileride HTML'i önbelleğe alırsa `Vary: User-Agent` gerekir.

### 4. Sinematik Hero (`Hero.tsx`, `lib/enhance/hero.ts`)

- Bölüm iki katmandır: `.hero` (sarmalayıcı) ve `.hero-stage` (ekran boyunda sahne). **Yetenekli bir masaüstünde** (genişlik ≥ 64 rem, yükseklik ≥ 40 rem, ince işaretçi, azaltılmış hareket yok) sarmalayıcı 160 svh olur ve sahne `sticky` kalır; diğer her yerde (telefon, JS yok, azaltılmış hareket) düz tek ekranlık hero.
- `hero.ts` kaydırma ilerlemesini `--hp` (0..1) olarak yazar (kare başına en çok bir `getBoundingClientRect`); CSS yalnızca `transform` ve `opacity` ile: metin yükselip erir (hp ≈ 0,6'da kaybolur), kaydırma ipucu erir, amblem büyür, yükselir, %11'den %20'ye parlar ve hero'nun son %15'inde filme çözülür (ölü kaydırma bırakmaz).
- Sinema katmanı hero'da daha parlaktır: `cinemaState.heroGain` (0,46, hero uzaklaştıkça 0'a iner); motor `max(film, hero)` kullanır. Hero başlığı iki satırdır (ADR 0004 maskeli giriş), Instrument Serif.

### 5. Kimlik: devasa amblem ve wordmark, yalnızca platin

- **Kapıda:** tam platin devasa B1 monogramı (genişlik `min(88 vh, 58 vw)`, yaklaşık ekran yüksekliğinin %84'ü), altta wordmark platin %6, üstte 28 px yatay kilit. **Hero'da:** monogram platin %11–20 (kaydırmayla), altta wordmark %6. **Üst barda** yatay kilit, **footer'da** devasa wordmark %6 (önceden vardı).
- **Sahibin kararı (1):** amblem saf platin kalır. Marka paketi şampanyayı, parlamayı, gölgeyi ve gradyanı logoda yasaklar; şampanya yalnızca birincil CTA'da ve tekil vurgularda (kapıdaki "Giriş", hero'daki "Stratejik Briefing"). Denetim bölüm 9, logo kurallarına şampanya/parlama/gölge/gradyan yazılırsa hata verir.
- Amblem ve wordmark süs olarak `aria-hidden`'dır; stüdyonun adı kapıdaki ve üst bardaki kilitte `title`/`aria-label` ile verilir.

### 6. Maske çerçeveleri (`lib/enhance/mask-frame.ts`)

`data-maskframe` taşıyan medya çerçeveleri (vitrin kartlarının ve mimari kartının video çerçevesi) ekrana girerken deklanşör gibi açılır: `--mf` (0..1) giriş ilerlemesidir, CSS `clip-path` ve içerideki medyanın hafif zoom'u (`scale`). CSS `var(--mf, 1)` kullanır: JS yokken, yüklenmeden önce ve azaltılmış harekette çerçeveler açıktır, hiçbir şey gizlenmez.

### 7. Sahne üstünde metin kontrastı (ADR 0014 açık kalemi, ölçüldü)

POST shader'ında parlaklık sınırı sola doğru sıkılaştırıldı (`capX`: sol bölgede 0,17 ve sızıntı yok, sağa doğru açılır): metin sütunu solda, sahnelerin öznesi sağda. Ölçüm ve sınırları [docs/perf/cinema.md "Kontrast"](../perf/cinema.md). Posterler yeni shader ile yeniden render edildi.

### 8. Film posterleri (ADR 0014 boşluğu giderildi)

Motor başlayamazsa ya da kendini kapatırsa `reportCinemaOff()` (`lib/cinema/state.ts`) `cinema:off` olayını yayar; `film.ts` posterleri yükler. Motor tuvali kurulamadığında tuval öğesi de kaldırılır.

### 9. Denetim kapısı

`faz2-denetim.mjs` bölüm 9: dosyalar var; kapıda çerez ve depolama yok; pazar seçenekleri gerçek bağlantı ve kapı sunucuda render ediliyor; `role=dialog`, `aria-modal`, Esc, `inert`; yalnızca yayındaki diller; pazar beyaz listeli (sayfa ve başvuru şeması); bot baypası var ve Lighthouse bota sayılmıyor; Lenis `gate:change` ile duruyor; logoda şampanya/parlama/gölge/gradyan yok; hero sticky yalnızca yetenekli masaüstünde; maske çerçevesi `var(--mf, 1)`; kapı açıkken sayfa kilitli ve hero girişi bekliyor; film posterleri `cinema:off` ile yükleniyor. `check-fonts.py` kapı metinlerini de kendi yüzlerine karşı sınar.

## Doğrulama durumu (12.10.2026)

**Doğrulanan (üretim derlemesi, yerel sunucu, başsız Chrome 154, `puppeteer-core`; betik depoda yok):**
- `?m=` yokken HTML'de kapı açık ve iki pazar bağlantısı var; `?m=tr` ile kapı HTML'de yok.
- Pazar seçimi dil çiplerini açar, arka planı `inert` yapar, "Giriş" adresi `/tr?m=tr` yapar, `lang="tr"` olur, kapı kalkar, odak `<main>`'e gider, kaydırma kilidi çözülür; masaüstünde WebGL tuvali canlı; konsol hatası yok. Masaüstü 1440×900 ve telefon 390×844 için ekran görüntüleri gözle kontrol edildi; Türkçe glifler (İ ı ş ç ğ ü) doğru.
- Hero kaydırmasında `--hp` beklenen değerleri aldı (0,5 ve 0,95); kaydırmanın sonunda neredeyse boş bir ekran gözlendi ve ritim bunun üzerine sıkılaştırıldı (175 → 160 svh, daha erken erime, amblemin filme çözülmesi); **yeni ritim ayrıca görüntülenmedi**.
- Kontrast: [docs/perf/cinema.md](../perf/cinema.md).

**Doğrulanmayan:**
- **Bot baypası yerelde doğrulandı** (üretim derlemesi, `npm run smoke` 139/139): Googlebot, Bingbot, facebookexternalhit ve `/tr` için Googlebot kapıyı HTML'de görmez, içerik aynıdır; Lighthouse/PageSpeed kullanıcı aracısı ve sıradan tarayıcı kapıyı görür; kapı çerez bırakmaz; geçerli `?m=` ile kapı HTML'de yoktur; bilinmeyen `?m=` yok sayılır ve belge işaretlemesine yansımaz (Next yalnızca isteğin URL'sini kendi `<script>` yükünde JSON-kaçışlı taşır). **Canlı alan adında dağıtımdan sonra ayrıca bakılmalı** (`npm run live`, `curl -A "Googlebot"`).
- Başvuruda `market` alanı sahte alıcıyla uçtan uca doğrulandı (smoke: `tr` teslim edilir, bilinmeyen değer 422).
- Hero wordmark'ı, mobil monogram boyutu ve "ölçülecek" hero şeridi son build'de tek geçişle gözle kontrol edildi (masaüstü 1440×900, telefon 390×844; konsol hatası yok). **Bölüm çapası (`/#briefing`) düzeltmesi tarayıcıda denenmedi**; yeni 160 svh ritmi kaydırma sırasında ayrıca görüntülenmedi.
- Lighthouse kapıyla yeniden ölçülmedi. Kapı ilk boyamanın LCP öğesi olur; sayı bilinmiyor.
- Gerçek GPU'lu masaüstü, Safari, Firefox, gerçek telefon, ekran okuyucu ile elle deneme.
- Kapının klavyeyle tam akışı (Tab sırası, çip seçimi) elle denenmedi.

## Açık kalemler (sahibin kararı ya da ayrı iş)

1. **Pazarın başka neyi şekillendireceği** (fiyat basamakları, hukuki metin, vitrin vurgusu, para birimi) tanımsız; şu an yalnızca dil önerisi ve başvuru etiketi. Avrupa € karşılığı tanımsız.
2. **Hero şeridindeki "Lighthouse 100" (KARAR VERİLDİ 12.10.2026: "ölçülecek").** Değer 08.10.2026'ya ve sinema katmanından önceki sürüme aitti; sinema açıkken masaüstü 89–96 ölçüldü ([cinema.md](../perf/cinema.md)). `lib/metrics.ts` performans puanını ve masaüstü TBT'yi (0 ms, aynı gerekçeyle) boşaltır, sayfa "ölçülecek" yazar; tarih notu artık LCP kaydından gelir ve Mimari halkalarının notu erişilebilirlik kaydından. CLS, LCP ve diğer üç puan 08.10 tarihiyle durur (sinema ve kapıdan önceki sürüme ait); kapıyla yeniden ölçülünce güncellenmeli. **TBT'yi de boşaltmak sahibin yalnızca puan için verdiği kararın doğal uzantısıdır** (çelişen ölçüm elde olduğu için); geri almak tek satırdır.
3. **Gerçek ziyaretçi için arama deneyimi:** bot kapıyı görmez ama gerçek mobil ziyaretçi görür. Google'ın rahatsız edici geçiş katmanı ilkesinin etkisi doğrulanamaz ve izlenmelidir (Search Console, sayfa deneyimi). Bot listesi eksik kalabilir (yeni bir önizleme botu kapıyı görür; zararsızdır).
4. **Kapı LCP'si ve masaüstü TBT** ([ADR 0014](0014-cinematic-layer.md) açık kalem 1): ölçülüp sahibin kabulüne sunulacak.
5. Commit: çalışma ağacı commit edilmedi; üretimdeki site hâlâ sinemadan ve kapıdan önceki sürümdür.
