# Küresel rakip karşılaştırması ve kalite açığı raporu (17.10.2026)

- **Soru:** syncflow.agency, dünyanın üst düzey dijital ajans ve mühendislik stüdyolarının yanında nerede duruyor; hangi eksikler var, hangileri kapatıldı, hangileri yalnızca sahibin elinde?
- **Kapsam:** 12 küresel stüdyo/danışmanlık sitesinin ana sayfası + syncflow (canlı). Aynı makine, aynı Lighthouse (13.5.0), aynı profiller, aynı gün.
- **Sınır (bunu okumadan sayıları kullanmayın):** laboratuvar verisidir, saha verisi (CrUX) değildir. Başsız Chrome, simüle yavaş 4G ve 4× CPU. **WebGL ve video ağırlıklı stüdyolar başsız Chrome'da yazılım çizimiyle çalışır**; GPU'lu gerçek bir cihazda bu sitelerin yaşattığı deneyim, buradaki skorlardan iyidir (özellikle TBT'leri). Bu tablo "aynı yöntemle ölçüldü" demektir, "o siteler kötüdür" demek değil. Her site için mobilde 3, masaüstünde 1 koşu (syncflow için ayrıca n=7, aşağıda); rakip sayfaları çerez bildirimi, konuma göre içerik ve A/B değişkenleri içerebilir. Yapısal gözlemler yalnızca ana sayfanın metninden (otomatik özet) alındı; kapsamlı bir site incelemesi değildir.

## 1. Ölçüm

| Site | Mobil perf (3 koşu) | FCP | LCP | TBT | CLS | Toplam | İstek | JS | Erişilebilirlik | En iyi uyg. | SEO | Masaüstü perf | Masaüstü LCP |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **syncflow.agency** | **99** (99/100/99) | 1,13 sn | **1,48 sn** | 88 ms | 0 | **0,3 MB** | 24 | 169 KB | 100 | 100 | 100 | **100** | 0,33 sn |
| Active Theory | 40 (38/40/41) | 3,0 sn | 5,2 sn | 10.063 ms | 0 | 12,8 MB | 138 | 517 KB | 91 | 100 | 92 | 62 | 1,31 sn |
| Lusion | 52 (52/48/54) | 1,1 sn | 4,2 sn | 2.343 ms | 0 | 9,9 MB | 108 | 987 KB | 85 | 77 | 100 | 76 | 1,02 sn |
| Locomotive | 38 (38/37/38) | 1,8 sn | 2,4 sn | 2.364 ms | **0,502** | 9,5 MB | 30 | 1.090 KB | 95 | 54 | 100 | 51 | 1,48 sn |
| Huge | 43 (44/43/42) | 2,5 sn | 6,6 sn | 1.427 ms | 0,081 | 1,7 MB | 172 | 1.023 KB | 100 | 73 | 92 | 91 | 1,37 sn |
| Instrument | 35 (41/30/35) | 9,1 sn | 14,9 sn | 948 ms | 0,009 | 8,7 MB | 200 | 845 KB | 93 | 73 | 92 | 51 | 3,86 sn |
| Basic/Dept | 41 (41/41/41) | 1,3 sn | 13,3 sn | 1.331 ms | 0 | 9,2 MB | 89 | 1.059 KB | 100 | 73 | 100 | 70 | 3,67 sn |
| AKQA | 40 (40/43/40) | 1,4 sn | 9,6 sn | 1.338 ms | 0 | 29,1 MB | 78 | 1.518 KB | 98 | 96 | 92 | 81 | 2,02 sn |
| Work & Co | 39 (39/39/36) | 5,1 sn | 13,9 sn | 699 ms | 0 | 4,5 MB | 91 | 1.617 KB | 96 | 73 | 92 | 83 | 1,45 sn |
| Ueno | 29 (29/30/29) | 5,0 sn | 10,6 sn | 2.488 ms | 0 | 19,2 MB | 65 | 1.047 KB | 98 | 100 | 100 | 54 | 2,58 sn |
| Fantasy | 55 (51/63/55) | 1,9 sn | 3,4 sn | 1.508 ms | 0 | 9,4 MB | 83 | 868 KB | 84 | 77 | 100 | 83 | 0,96 sn |
| Netguru | 44 (44/52/41) | 2,2 sn | 5,8 sn | 1.447 ms | 0 | 9,0 MB | 138 | 935 KB | 100 | 73 | 100 | 77 | 1,15 sn |
| Thoughtworks | 32 (29/32/35) | 4,7 sn | 7,3 sn | 1.602 ms | 0,046 | 7,6 MB | 67 | 1.926 KB | 100 | 96 | 85 | 88 | 1,18 sn |

**Rakip medyanı (12 site):** mobil performans **40** (29–55), LCP **7,3 sn**, TBT **1.508 ms**, sayfa ağırlığı **9,4 MB**, JS **1.047 KB**, istek **91**; masaüstü performans **77** (51–91), LCP 1,45 sn; erişilebilirlik 98, en iyi uygulamalar 77, SEO 100. **12 rakipten hiçbiri mobilde 90'a ulaşmadı.**

**syncflow:** mobil bu tabloda 99/100/99; aynı gün yapılan yedi koşuluk sakin-makine ölçümünde medyan **100** (LCP 1,62 sn, TBT 33 ms); makine yüklüyken iki oturumda 72–99 (TBT hidrasyon yüzünden şişiyor); sakin makinedeki dördüncü oturumda (güncel dağıtım) yedi koşunun yedisi **100**. Yayınlanan sayı "sakin makinede medyan **100**"dür (14 koşu); tüm 25 koşunun medyanı 99 ([docs/perf/live-2026-10-17.md](../perf/live-2026-10-17.md)). Masaüstü **100**. Rakiplerin ölçümleri de aynı makinede yapıldı; onların skorları 29–55 arasında ve LCP'leri 2,4–14,9 sn: makinenin yükü bu farkı kapatacak büyüklükte değil. Sayfa rakip medyanından **≈ 29× hafif** (0,3 MB / 9,4 MB), betik **≈ 6× az** (169 / 1.047 KB). Bu koşudaki TBT 88 ms, makinenin aynı anda başka işler yürütmesinden (tablodaki bütün siteler sırayla ölçüldü, benim işlerim de arada çalıştı); skorun 99'a düşmesi bu.

**Adil okuma:** syncflow'un ana sayfası ilk açılışta giriş kapısını (pazar seçimi) gösterir ve filmi/videoları tembel yükler; rakiplerin ana sayfaları tam portföy, video ve görsel taşır. Bu bir **editoryal tercih farkıdır**, "aynı içerik daha hızlı" değil. Yine de ziyaretçinin ilk gördüğü ve Lighthouse'un ölçtüğü hâl budur ve ağırlık farkı, mobilde skor farkının asıl nedenidir.

## 2. Yapı: ana sayfa metninden gözlenenler (17.10.2026)

| | Dil | Fiyat ya da asgari proje | İletişim | Güven işaretleri | Vaka sunumu |
|---|---|---|---|---|---|
| **syncflow** | **7** (EN, TR, AR sağdan sola, DE, FR, ES, ZH) | **Yayında: USD 50.000 asgari, üç basamak, yerel para** | Strategic Briefing (çok adımlı başvuru, 24 saatte dönüş sözü) + e-posta + "kopyala"; **form canlıda henüz 503** | Ölçülmüş, tarihli sayılar; **müşteri logosu, ödül, referans, ekip yok** | Dört dilde "Architectural breakdown" (dört bölüm), "müşteri işi değildir" notuyla |
| Instrument | 1 (EN) | Yok | Birkaç form; e-posta ve takvim yok | Nike, Google, Netflix… logoları; 2026 Campaign US Design Studio Agency of the Year, Webby, Clio… | Kategori filtreli portföy |
| Huge | 1 | Yok | /contact | 20'den fazla logo; "14 yıl, birden çok iş" ortaklık anlatısı | Kart + vaka sayfaları |
| Locomotive | 2 (EN, FR) | Yok | E-posta, telefon, adres, form | 15 yıl; Wolverine, The Drake Hotel, Scout Motors | Beş kartlık karusel |
| Basic/Dept | 1 | Yok | E-posta (altbilgi) | Yılın ajansı ödülleri, Webby; Google, KFC, Patagonia | Kartlar |
| Work & Co | 1 | Yok | E-posta, telefon, form | Fast Company alıntısı; Apple, Google, Nike | Haber öğeleri |
| Netguru | 1 | Yok ("Estimate project" düğmesi var) | E-posta + adres | NPS 73, 2.500+ proje, B Corp, TÜV, Clutch, Inc. 5000 | Müşteri kartları |
| Thoughtworks | belirtilmemiş | Yok | "Get in touch" | Bulut ortaklıkları, Great Place to Work | Liste |
| Active Theory, Lusion, Fantasy, Ueno, AKQA | metin alınamadı ya da yapısal içerik çekilmedi | | | | |

## 3. syncflow'un özgün (örnekte kimsenin yapmadığı) yanları

1. **Yedi sermaye merkezi, yedi dil, yerel para ve sağdan sola.** Ana sayfa metni alınabilen yedi rakibin hepsi tek dilli ya da iki dilli (biri belirtmiyor). Pazar başına dil, para birimi ve asgari tutar dönüşümü (`₺2.475.000`, `45.000 €`, `184,000 AED`) farklı bir konumlandırmadır.
2. **Açık asgari proje eşiği.** Ana sayfa metni alınabilen yedi rakipten hiçbiri fiyat ya da asgari tutar söylemiyor; syncflow USD 50.000 ve üç basamağı yayınlıyor (nitelik eşiği, [ADR 0019](../adr/0019-enterprise-tier.md)). Bu hem vakit kaybını azaltır hem de alıcıya "büyük ölçek" sinyali verir; riski, düşük bütçeli iyi bir müşteriyi baştan caydırmasıdır (sahibin kararıdır).
3. **Yayınlanan her sayı ölçülmüş ve tarihli** (`lib/metrics.ts`: değer, tarih, profil, kaynak). Rakipler "NPS 73", "2.500+ proje" gibi iddiaları kaynaksız yayınlıyor; syncflow'da doğrulanmamış iddia denetimle yasak.
4. **Vaka incelemesi biçimi.** Dört bölüm (zorluk, mimari çözüm, entegrasyon ve güvenlik, ölçülmüş etki ve ROI), her dilde, JavaScript'siz de okunur, "müşteri işi değildir" diyen bir dürüstlükle. Üstüne **çalışan** iki simülatör (kuyruk modeli; gerçek Web Crypto ile imzalı ve şifreli teslim akışı) ve belgelerden koddan üretilmiş 65 sözleşme testi ([ADR 0021](../adr/0021-production-performance-and-enterprise-proof.md)).
5. **Ağırlık ve hız.** Mobil 100 (sakin makinede; yüklüyken 72–99), masaüstü 100, sayfa ≈ 29× hafif, erişilebilirlik, en iyi uygulamalar ve SEO 100, CLS 0 (Locomotive 0,50).
6. **Güvenlik duruşu.** Nonce'lu ve **enforce edilen** CSP (12 ziyarette 0 ihlal), HSTS preload, `security.txt`, imzalı webhook, hız sınırı. Rakiplerin güvenlik başlıklarını incelemedim; bu madde bir kıyas iddiası değil, syncflow'un durumunun kaydıdır.
7. **Ertelenmiş çerçeve başlatma** ([ADR 0023](../adr/0023-framework-after-first-paint.md)): React ve Next ilk boyamadan sonra başlar; bu, mobilde 96 → 100'ü sağlayan mekanizmadır.

## 4. Açıklar (dürüst liste, önem sırasıyla)

### Yalnızca sahibin kapatabileceği (kodla çözülmez)

1. **İletişim yolu canlı değil.** Başvuru formu 503 veriyor: Turnstile anahtarları, n8n akışı ve dört Vercel ortam değişkeni girilmedi. Ziyaretçi bugün yalnızca e-posta bağlantısına ve hazır taslağa sahip. Hepsi hazır: `docs/n8n/syncflow-briefing.workflow.json`, `docs/n8n-briefing.md` "Hızlı yol", imzalı test betiği. **Bu, "iletişim kusursuz olmalı" hedefinin tek kırık halkası.**
2. **`www.syncflow.agency` çözülmüyor.** Spaceship'te `CNAME www → cname.vercel-dns.com` ve Vercel'de alan adı eklenmeli (yönlendirme kodda hazır).
3. **Sosyal kanıt yok.** Örnekteki her rakip logo, ödül, rakam ya da alıntıyla güven kuruyor; syncflow'da müşteri logosu, referans, ekip, ofis, ödül yok. Uydurulamaz ve uydurulmayacak. Gerçek olanlar (2–3 referans, NDA'ya uygun biçimde adsız bile olsa; kurucu profili; kuruluş ve konum bilgisi) girildiğinde `ProfessionalService` şeması da adres ve kurucuyla zenginleşir.
4. **Hukuki sayfalar yer tutuculu** (76 `[YER TUTUCU]` dizesi) ve bu yüzden `noindex`. Avukat onayı ve gerçek şirket bilgileri gelince açılır.
5. **Altı dilde ana dili konuşan gözden geçirme yok.** Arapça, Almanca, Fransızca, İspanyolca, Çince ve Türkçe metinler, özellikle hukuki ve iddia içeren olanlar, bir ana dil konuşuru tarafından okunmadı.
6. **Alan adı e-postası:** DMARC `p=none` (yalnızca izleme). SPF, DKIM (Google) ve MX tamam. Rapor akışı birkaç hafta temiz görününce `p=quarantine`, sonra `p=reject` yapılır (Spaceship DNS). MTA-STS ve TLS-RPT yok (isteğe bağlı).
7. **Claude.ai bağlayıcıları** (Gmail, Takvim, Drive, vidIQ) yetkilendirilmedi; ben kullanamıyorum.

### Ölçülemeyen ya da henüz ölçülmeyen

8. **Saha verisi (CrUX) yok;** site yeni. Gerçek telefon, gerçek GPU'lu masaüstü, Safari ve Firefox denenmedi. Yavaş ağda sayfa **≈ 0,5 sn daha geç etkileşir** (ilk boyama ≈ 0,5 sn erken gelir): ADR 0023'te ölçüldü, canlıda ayrıca ölçülmedi.
9. **Turnstile widget'ı canlıda hiç çizilmedi** (anahtar yok). CSP enforce altında daha önce Cloudflare test anahtarlarıyla denendi (12/12); canlı anahtarla ilk gün ayrıca doğrulanmalı.

### Küçük, kodla kapanabilir (kalanlar)

10. Simülatör düğmeleri ve oynat düğmesi telefonda 36–40 px (WCAG 2.2'nin 24 px alt sınırının üstünde, 44 px konforunun altında); simülatör yükseklikleri "hiç değişmez" kuralına bağlı olduğu için ayrı bir ölçümle ele alınmalı.
11. On üç vaka sayfasında (de, fr, es dillerinde ve en/law, en/logistics) başlık 65 ya da açıklama 165 karakteri aşıyor: arama sonucunda kesilir, sıralamayı etkilemez; metinler sahibin kopyası olduğu için dokunulmadı.

## 5. Bu turda kapatılanlar (kanıtla)

| Açık | Ne yapıldı | Kanıt |
|---|---|---|
| Mobil Lighthouse 96 | React ve Next ilk boyamadan sonra ([ADR 0023](../adr/0023-framework-after-first-paint.md)) | Canlı mobil: sakin makinede medyan **100** (14 koşu; güncel dağıtımda 7/7), yüklü makinede 72–99; LCP 2,43 → 1,5–1,6 sn |
| CSP yalnızca raporluyordu, hiçbir şeyi engellemiyordu | **Enforce** ([ADR 0024](../adr/0024-csp-enforced.md)) + `npm run qa:csp` kapısı | Canlıda 12 ziyaret, 0 ihlal, 0 konsol hatası; başlık `Content-Security-Policy` |
| Erişilebilirlik: axe 2 kural (`region`, `scrollable-region-focusable`), telefonda 20 px'lik altbilgi bağlantıları | Dekoratif tuval erişilebilirlik ağacından çıkarıldı, kaydırılabilir kod örneği klavyeyle erişilebilir, dokunmatikte altbilgi bağlantıları ve iletişim adresi ≥ 44 px | axe (WCAG 2.2 AA + en iyi uygulamalar) 16 tarama: **0 ihlal** (önce 2 kural, 14 örnek); telefonda 44 px altı öğe 49 → 22 |
| Vaka sayfalarında yapılandırılmış veri yok | `WebPage` + `BreadcrumbList` JSON-LD, 28 sayfa | Duman testi 184/184 (her sayfa için denetlenir) |
| Bağlantılar | Tarandı: 15 sayfa, 118 iç bağlantı, 49 benzersiz yol | Hepsi 200, tüm `#çapalar` hedefi var, dış bağlantı yok |
| Sonuçların yükle oynaması | Ölçüm koşulları belgelendi: yüklü makinede mobil 72–99, sakin makinede 99–100; CSP enforce'un etkisi aralıklı A/B ile sınandı (p ≈ 0,46: fark yok) | [docs/perf/live-2026-10-17.md](../perf/live-2026-10-17.md) |
| Canlı dağıtım gözlemi | `live-check`: belge tek yükleyici ister ve adlandırdığı her betik vardır; CSP enforce uyarısı | 45 geçti, 0 hata, 1 uyarı (`www`) |
| Önceki iki canlı dağıtım düştü | Vercel'in paketleme modeli okundu; dönüşüm `next build` içine, yükleyici `static/chunks`'a alındı | [ADR 0023 §4](../adr/0023-framework-after-first-paint.md); önizleme dalıyla doğrulandı |

## 6. Önerilen sıra (sahip için)

1. **Formu canlıya al** (1 numara): Turnstile (Cloudflare, ücretsiz) → n8n içe aktar → Gmail yetkisi → dört Vercel değişkeni. Sonra `node scripts/n8n-test.mjs` ve `npm run qa:csp` ile doğrula.
2. `www` DNS kaydı (5 dakika).
3. Üç gerçek güven işareti: kurucu profili, kuruluş/konum bilgisi, en az bir referans (adsız olabilir). Rakiplerin tamamının bu satırı dolu; syncflow'da boş.
4. Hukuki metinler ve altı dilde ana dil gözden geçirmesi; ardından yasal sayfalar `noindex`ten çıkar.
5. DMARC sıkılaştırması (izleme birkaç hafta temiz olunca).
6. Trafik gelince CrUX ve gerçek cihaz ölçümü; `lib/metrics.ts`'e yazılır.

## Nasıl yeniden üretilir

```
node scripts/lighthouse.mjs --runs=7 --desktop=5 --paths=/ live=https://syncflow.agency   # kendi sitemiz (Git Bash'te MSYS_NO_PATHCONV=1 ve Windows tarzı --out)
npm run qa:csp -- https://syncflow.agency
node scripts/live-check.mjs https://syncflow.agency
```
Rakip ölçümü için kullanılan betik depoya girmedi (üçüncü tarafların sitelerine toplu istek atan bir araç projeye ait değil); yöntem yukarıdadır: aynı Lighthouse sürümü, varsayılan mobil ve masaüstü profilleri, mobilde 3 ve masaüstünde 1 koşu, medyan.
