# ADR 0019: Kurumsal katman: USD 50.000 eşiği, lojistik vitrini, kurumsal mimari sütunları

- **Durum:** Kabul edildi ve uygulandı, 14.10.2026 (dal `feat/enterprise-tier`). Yerelde doğrulandıktan sonra sahibi uygulananların tümünü onayladı ve `main`'e commit/push edilip Vercel'e gönderilmesini, ardından `npm run live` ile doğrulanmasını istedi. **Canlıya alındı:** `main` `55190ec` (14.10.2026); `npm run live` ve canlı tarayıcı akışı geçti (aşağıda "Canlıda").
- **Onay:** proje sahibi, 14.10.2026 ("yapılan tüm kurumsal Enterprise B2B değişikliklerini onaylıyorum"). Onaydan önce şunlar bildirilmişti ve onay bunları kapsar: yedekli kuyruk ve dört entegrasyon iddiaları depoda kanıtlı değildir, "High-ROI" ölçülmüş bir iddia değildir ve "Measured, not promised." çizgisiyle gerilim taşır, yeni metinlerin yerel konuşur incelemesi yoktur, Lighthouse yeniden ölçülmedi (aşağıda "Riskler"). Bu iddiaların doğruluğunun sorumluluğu sahibindedir.
- **Karar:** proje sahibi, 14.10.2026. İstek: siteyi $40.000–$120.000+ kurumsal B2B müşterileri tam ikna edecek seviyeye getirmek, tasarımın lüks ve sinematik havasını bozmadan; yalnızca dört nokta: (1) bütçe bariyeri: $25.000 seçeneğini sil, asgari $50.000, üç basamak ve açıklamaları ("Core Architecture & Workflow Automation", "Enterprise Infrastructure & Multi-Region Ecosystem", "Custom Global Ecosystems"), diğer para birimlerinde taban $50.000 dengi; (2) vitrine dördüncü kart: "Global Logistics & B2B Supply Chain Architecture" (yedekli kuyruk mimarileri, kesintisiz veri akışı, yüksek otomasyon); (3) Mimari bölümüne kurumsal güvenlik: "Fail-Safe Enterprise Automation" (yedekli kuyruk mimarileri, güvenli webhook yönetimi) ve "Deep Enterprise Integrations" (Salesforce, SAP, HubSpot, Oracle); (4) Hero ve Mimari metinlerine "Enterprise Scale", "Secure Workflow Automation", "High-ROI Digital Ecosystems".
- **Yerine geçtiği:** [ADR 0016](0016-qualification-and-markets.md)'nın USD 25.000 eşiği ve 1×/2×/4× basamakları; [ADR 0009](0009-niche-and-languages.md)'un "vitrin kilitli üçlü" kuralı (kilit artık dörtlü: estate, clinic, law, logistics). CLAUDE.md'nin "aynı anda en çok 3 Border Beam" kuralı **değişmedi**; yalnızca denetim artık kart kabuğunu değil animasyonlu `.beam` öğesini sayar (aşağıda).
- **Tamamlar:** [ADR 0003](0003-showcase-film-static-render.md) (sahne klipleri), [ADR 0014](0014-cinematic-layer.md), [ADR 0018](0018-seven-capital-centres.md).

## Karar

### 1. Eşik ve basamaklar (`lib/pricing.ts`, tek kaynak)

Asgari proje bütçesi **USD 50.000**. Basamaklar asgari tutarın **1×–2×, 2×–5× ve 5× üstü**: dolarda $50.000–$100.000, $100.000–$250.000 ve $250.000 +. Diğer para birimleri güncel kur karşılığıdır (open.er-api.com, USD tabanı, 14.10.2026 00:02 UTC): EUR 0,893421 → 44.671,1 → **€45.000**; AED 3,6725 (resmî sabit kur) → 183.625 → **AED 184.000**; TRY 49,379871 → 2.468.993,6 → **₺2.475.000**.

| Para birimi | Pazarlar | Asgari tutar | 2. basamak başlar | 3. basamak başlar |
|---|---|---|---|---|
| USD | `us`, `wealth`, `asia` | 50.000 | 100.000 | 250.000 |
| EUR | `dach`, `fr` | 45.000 | 90.000 | 225.000 |
| AED | `me` | 184.000 | 368.000 | 920.000 |
| TRY | `tr` | 2.475.000 | 4.950.000 | 12.375.000 |

EUR yuvarlama adımı **500'den 1.000'e** çıkarıldı (miktar ikiye katlandı): 500'lük adımla 12.10 kurunda €45.000, 14.10 kurunda €44.500 çıkıyordu; kurdaki %0,2'lik oynama tabanı değiştirmesin diye adım büyütüldü. AED ve TRY adımları aynı kaldı. Kur tarihi `PRICING_AS_OF` = 14.10.2026, sonraki gözden geçirme `PRICING_NEXT_REVIEW` = 14.01.2027 (ya da bir kur %5'ten fazla oynarsa daha erken). Bir para biriminin tek tabanı vardır (denetim sınar).

Briefing'in ilk adımı hâlâ yalnızca bu üç basamağı sunar ve soru asgari tutarı adıyla söyler; **$25.000 seçeneği ve $25.000–$50.000 basamağı sayfada yoktur** (smoke sayfada "$25.000" geçmediğini sınar). Üç basamağın açıklaması yedi dilde yeni metinlerle değişti (`Briefing.budget.t1Desc`–`t3Desc`). Sunucu ve kodlar değişmedi (`t1`–`t3`); öncelik sınıfı kuralı aynı (`t3` ya da `t2` ve karar veren/ekip = yüksek), ama `t2` artık $100.000–$250.000'dir, yani "yüksek" sınıfın tabanı da yükseldi.

### 2. Vitrin: dördüncü kart, lojistik

- Konsept render (`remotion/scenes/Logistics.tsx`): yüksek açıdan bir yük koridoru; paralel şeritler, üstlerinde kapılar, akan koliler. Sekiz saniyede iki kez bir kapı sessizleşir (kısık, titrek), **yedek şerit şampanya ışıkla devralır**, kolilerin bir kısmı kapının çevresinden yedek şeritle geçip kendi şeridine döner ve akış durmaz. Her şey döngü konumunun işlevidir: **kare 0 ile kare 240 bayt bayt aynıdır** (kusursuz döngü, sınandı). Sahnede yazı yoktur (yedi dile tek render yeter), palet yalnızca obsidian, iki katman, platin ve şampanya (sıcak ışık olarak, ADR 0017'deki istisna). Çıktılar `public/media/clips/logistics.{mp4,webm,webp}` (478 KB, 453 KB, 15 KB), `npm run film:render -- --only=logistics` ile üretildi; klip yalnızca üzerine gelinince iner (`preload="none"`), poster HTML'dedir.
- Kart diğerleri gibi **"Architectural Specimen"** rozeti ve "stüdyonun kendi numuneleridir, müşteri işi değildir" notu taşır: yeni kart bir müşteri sonucu iddia etmez. Başlık "Nothing waits. Nothing is lost." (yedi dilde karşılığı), etiket "Global logistics & B2B supply chain architecture", zarf "Enterprise enquiry". Footer'da `#show-logistics` bağlantısı vardır; vitrin başlığı "Four industries." olur.
- Denetim: sektör kilidi `estate, clinic, law, logistics` (tam dört), klip sayısı 5 × 3 dosya; smoke dört kartı, beş sahne dosyasının içerik türünü ve yeni metinleri sınar.

### 3. Mimari: kurumsal katman (IV ve V)

Mimari bölümü iki katmandır: ön yüz (I–III, değişmedi) ve kurumsal katman (IV, V). İki yeni sütun aynı kart kabuğunu **Border Beam'siz** kullanır (sayfa en çok üç animasyonlu ışın taşır; denetim bu yüzden `className="beam-card"` yerine `className="beam"` sayar ve 3 bulur):

- **IV, "Fail-Safe Enterprise Automation":** yedekli kuyruk mimarileri, imzalı ve doğrulanan webhook'lar, idempotent teslim, sınırlı yeniden deneme; durağan bir şema (ana şeritte kesintiye uğramış bir düğüm ve yükü çevresinden taşıyan yedek şerit) ve "Şema desenin kendisidir, ölçüm değildir" altyazısı.
- **V, "Deep Enterprise Integrations":** Salesforce, SAP, HubSpot, Oracle; durağan bir merkez ve dört sistem şeması ve **"Ürün adları sahiplerine aittir. Ortaklık ya da sertifika ima edilmez."** notu. Logo yoktur, ortak listesi gibi sunulmaz.
- İki kartta da **rakam yoktur**; yeni kartlar `lib/metrics.ts` kuralına (ölçülmemiş sayı yayınlanmaz) takılmaz çünkü sayı taşımaz.

### 4. Metin: güç kelimeleri

Hero alt başlığı ("Digital architecture at **enterprise scale** for principals whose name is the business: **secure workflow automation**, machined to tight tolerances, finished in silence, and measured rather than promised.") ve Mimari girişi ("**High-ROI digital ecosystems** are built here in two layers: a front end that feels calibrated, not merely quick, and enterprise automation engineered to fail safely.") yedi dilde yerel karşılıklarıyla yazıldı. Başlıklar (`Built in the dark. / Moves like liquid.`) ve "measured rather than promised" cümlesi dokunulmadan kaldı; "High-ROI" bilerek Hero'ya değil Mimari girişine kondu (bir vaat ile "söz değil, ölçüm" aynı cümlede çelişirdi).

## Riskler ve AÇIK konular (dürüst kayıt)

- **Yeni yetenek iddiaları sahibin beyanıdır; depoda kanıtı yoktur.** Sitenin kendi teslim hattı bir imzalı webhook, bir teslim kimliği ve tek sınırlı yeniden denemeden ibarettir (ADR 0010); **kuyruk mimarisi yoktur**, n8n tarafındaki tekrar ayıklaması doğrulanmamıştır ve hiçbir Salesforce, SAP, HubSpot ya da Oracle entegrasyonu yoktur. Bu yüzden metin "bu sayfanın kendi hattı böyle çalışır" demez, yetenek ve desen anlatır, şemalar "ölçüm değildir" der ve sayfada **uydurma kimlik bilgisi yoktur** (smoke SLA, SOC 2, ISO 27001, çalışma süresi yüzdesi ve "sertifikalı ortak" ifadelerini yasaklar). Bu yetenekler gerçek değilse ilgili metin yayından kaldırılmalıdır.
- **"High-ROI" ölçülmüş bir iddia değildir** ve "Measured, not promised." çizgisiyle gerilim yaratır. Sahibinin talimatıyla yazıldı; "ROI odaklı" gibi bir yönelim ifadesine çevrilebilir (tek anahtar: `Architecture.intro`).
- **"Global" sözcüğü** (vitrin etiketi ve üçüncü basamak "Custom Global Ecosystems") bir sektör ve hizmet adıdır, erişim iddiası değildir; "küresel erişim" ya da "Worldwide" pazarlama iddiası yine yasaktır (CLAUDE.md, denetim). Bu ayrım sahibin onayına bağlıdır.
- **Üçüncü taraf adları** yalnızca "entegrasyon hedefi" olarak anılır; ilgili şirketlerin marka kullanım koşullarına uygunluk doğrulanmadı.
- **Briefing'in "proje türü" adımı** (ürün sitesi, platform, hukuk/danışmanlık, kararsız) lojistik ya da kurumsal otomasyon alıcısı için doğrudan bir seçenek sunmaz. Sahibi "sadece şu dört nokta" dediği için eklenmedi; öneri olarak durur (sunucu şeması ve n8n alanı da değişirdi).
- **Lighthouse canlıda yeniden ölçüldü ve mühürlendi** (docs/perf/live-2026-10-14-enterprise.md): masaüstü performans 97, mobil 96, CLS 0, masaüstü LCP 0,57 sn, TBT 145 ms. Sahibi 100/100 doğrulaması istemişti; **hiçbir koşuda 100 çıkmadı** (yayında 97 ve 96 durur) ve mobil LCP medyanı 2,55 sn yazılı hedefin (≤ 2,5 sn) 51 ms üstündedir. Önceki ölçümle fark gürültü sınırındadır: yeni içerik ilk yük JS'ini büyütmedi (170 ve 184 KB), ama iyileşme de iddia edilmez.
- Depoya ~0,9 MB ikili dosya girer (yeni klip). Çevirilerin (ar, de, fr, es, zh) yeni metinleri de araç yazımıdır; yerel konuşur incelemesi yoktur (ADR 0018'deki borç büyür).
- Fiyat karşılıkları yeni kurla yeniden alındı; EUR adımı değişti (yukarıda). İsviçre hâlâ EUR ile gösterilir.

## Doğrulama (yerel, 14.10.2026)

`check:messages` (yedi yayın dilinde **283 anahtar**, uyarı yok), `check:fonts`, `tsc`, ESLint, `audit-secrets`, `brand:check` temiz; `node faz2-denetim.mjs --build` **153 geçti, 0 hata** (yeni kapılar: taban USD 50.000, basamak katları 1×/2×/5×, dört sektör, beş klip, animasyonlu ışın sayısı 3); `npm run smoke` üretim derlemesinde **195/195**; Chrome 154'te (başsız, 1440×900 ve 390×844) tarayıcı akışı **23/23**: kapı akışları yedi dilde, dördüncü karta gelince **gerçek kliğin oynaması** (H.264, `currentTime` > 0,5 sn), şeridin dördüncü kartta bitmesi, Mimari'de beş kart ve üç ışın, briefing'in $50.000 ve yeni açıklamalarla açılması, konsol ve sayfa hatası yok, yatay taşma yok. Ekran görüntüleri (en, ar, zh, de; masaüstü ve telefon) gözle incelendi: Hero, Mimari IV ve V, vitrin dördüncü kart, briefing ilk adım. Sahne döngüsü (kare 0 = kare 240) bayt bayt doğrulandı.

**Canlıda** (`main` `55190ec`; yayın birkaç dakikada tamamlandı): `npm run live` **35 geçti, 0 hata, 1 uyarı** (`www` kaydı yok, bilinen eksik). Betik bu işle genişledi ve artık dört vitrin kartını, $50.000 tabanını ve üç yeni basamağı ($25.000'in kalmadığını), iki kurumsal sütunu ve yeni klibin üç dosyasını (mp4, webm, webp) doğru içerik türüyle sınar; yedi dilin sayfaları, `/ja` 404, sitemap yedi adres ve briefing savunmaları yerinde. Aynı tarayıcı akışı canlı sitede de **23/23** (gerçek klip oynatma, şeridin dördüncü kartta bitmesi, Mimari'de beş kart ve üç ışın, briefing'in $50.000 ile açılması). Duman testi canlıya karşı **çalıştırılmaz** (gerçek başvuru gönderir).

**Doğrulanmayan:** gerçek GPU, Safari, Firefox ve ekran okuyucu; gerçek cihazda ve `/` dışındaki sayfalarda Lighthouse; yeni metinlerin yerel konuşur okuması; üçüncü taraf adlarının hukuki kullanımı.
