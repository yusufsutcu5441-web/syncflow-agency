# ADR 0038: syncflow.agency yalnızca lüks ve yüksek performanslı web tasarımı stüdyosudur (outbound ve kurumsal katman kapalı)

- **Durum:** 22.11.2026'da yerel `studio-only` dalında uygulandı; aynı gün sahibin onayıyla `main`'e hızlı ileri sarmayla alındı ve push edildi (`f8bdebe`). Vercel dağıtımı 01:02 TSİ'de başarılı, `npm run live` 66/66. Bölüm 9 bu commit'ten sonra yazıldı ve ayrı bir commit'tir (`7fda82e`, sahibin onayıyla 22.11.2026 01:30 TSİ'de push edildi; Vercel başarılı). Bölüm 10 (metin temizliği, D3) üçüncü commit'tir ve push sahibin onayını bekler.
- **Tetikleyen istek:** sahibin 22.11.2026 brief'i: site tek bir konuma oturuyor, lüks ve yüksek performanslı web tasarımı stüdyosu; outbound ajansı kimliği tamamen kalkıyor. Kalacaklar: performans vurgusu (Lighthouse 100), tasarım kalitesi anlatımı, 4 sektörlük Showcase, doğrudan iletişim / e-posta. Kurallar: tasarımı ve animasyonları bozma, minimum müdahale; Showcase'teki her iş "Konsept çalışma / Concept study" olarak etiketlensin, gerçek müşteri işi gibi sunulmasın; testleri güncelle, hangi assertion'ın neden değiştiğini tek tek raporla.
- **Karar:** tek bir yayın anahtarı, `NEXT_PUBLIC_SHOW_ENTERPRISE` (`lib/flags.ts`). **Varsayılan kapalı** (yalnızca tam `true` ya da `1` açar; ADR 0035'in öteki anahtarlarıyla aynı kural). Kod silinmedi: `lib/arch`, simülatörler (`components/sim`), `/pilot` ve `/outbound` sayfaları, Drawing 01 ve testleri yerinde; anahtarı açıp yeniden dağıtmak her şeyi geri getirir.

## 1. Anahtar kapalıyken ne değişir

| Parça | Kapalıyken |
|---|---|
| Ana sayfadaki "Outbound pilot" bandı (Hero) ve footer'daki pilot linki | çizilmez |
| Architecture bölümünde IV, V, VI kartları (hata-güvenli kuyruk, entegrasyon modeli, Zero-Trust güvenlik akışı simülatörleri) | çizilmez; bölüm I–III kartlarıdır (yerel video, kare süresi, dört Lighthouse halkası). Bölüm alt başlığı `Architecture.introFront` olur ("kurumsal otomasyon" cümlesi çıkar) |
| Studio: R&D numune kartları (`#specimens`), Drawing 01, HMAC / AES olgusu (f1), beşinci manifesto satırı (m5) | çizilmez. Olgular iki tane (iki eşit sütun: `.facts[data-count='2']`), manifesto dört satır (`Studio.manifestoTitleFour`) |
| `/pilot`, `/outbound`, `/specimens/fail-safe-queue` | **301** ile ana sayfaya (bkz. 2) ve sitemap'ten çıkar |
| `/specimens/studio-site` | **kalır** (bkz. 3) |

**Atlanan bloklar için yer tutucu boyutu (tasarımı bozmamanın bir parçası):** Architecture ve Studio bölümleri `content-visibility: auto` ile atlanır ve yer tutucuları (`--cv`, `app/globals.css`) tam içerikle ölçülmüştü (Mimari 7240 / 5605 / 5560 px, Studio 7625 / 6567 / 4807 px). Kısalan bölümlerde bu değerler yanlış kalırdı: ilk RELEASE tarayıcı koşusunda sayfa kaydırmadan önce 18.947 px, çizildikten sonra 13.771 px çıktı (yüzde 38 sapma; ölçü 15 %), yani kaydırma çubuğu atlıyordu. Bölümler anahtar kapalıyken `data-lean` taşır ve CSS bu durum için **o sayfada ölçülen** yükseklikleri verir (Mimari 2687 / 2302 / 2179 px, Studio 5082 / 4036 / 3260 px; İngilizce, `content-visibility` kapalı, 412 / 820 / 1440 px). Bir sınıf değil öznitelik, çünkü `faz2-denetim.mjs` (satır 924) kaynakta sabit `cv cv-<ad>` sınıf dizgisini arar; şablon ifadeli bir `className` kapıyı bir kez kırmızıya çevirdi ve denetim kuralı gevşetilmedi, kaynak eski biçime döndürüldü.

Sahibe ait olmayan ya da zaten dokunulmayanlar: Hero başlığı ve film, Showcase kartları ve videoları, entry gate, header, footer'ın kalan linkleri, kapanış (iletişim / e-posta), `lib/pilot.ts`, `lib/outbound.ts` ve onların birim testleri.

## 2. Yönlendirmeler

`next.config.mjs` `redirects()`; yalnızca anahtar kapalıyken. `statusCode: 301` yazıldı, çünkü `permanent: true` Next'te **308** üretir ve brief 301 ister. Config yönlendirmesi `proxy.ts`'ten önce çalışır (CSP nonce'u gerekmez).

| Kaynak | Hedef |
|---|---|
| `/pilot`, `/outbound`, `/specimens/fail-safe-queue` | `/` |
| `/tr/pilot`, `/tr/outbound` | `/tr` |
| `/{tr,ar,de,fr,es,zh,ja}/specimens/fail-safe-queue` | `/{dil}` |

Diğer dillerde `/pilot` hiç yayında olmamıştı (yalnızca en/tr); onlar 404 kalır, yönlendirilmez. **Uyarı:** tarayıcılar 301'i uzun süre önbelleğe alır; anahtarı sonradan açmak, yönlendirmeyi görmüş bir tarayıcıya sayfaları hemen geri getirmez.

## 3. Sahibin D2 kararı: `/specimens/studio-site` kalır

Sahibin 22.11.2026 kararı: studio-site numunesi Lighthouse 100 kanıtının sayfasıdır; yeni konum "yüksek performans" üzerine kurulduğu için kanıt silinemez. Studio'daki kart kalktığı için sayfa öksüz kalmasın diye **Lighthouse halkalarının kartından** (Architecture III) `data-lighthouse-evidence` işaretli bir link verildi ("Bu puanın nasıl ölçüldüğünü görün"). Sayfanın "geri" linki artık var olmayan `/#specimens` yerine `/#architecture`'a gider (`lib/server/specimen.ts`). Anahtar açıkken link çizilmez (Studio kartları oraya götürür) ve geri linki `/#specimens`'tir: eski davranış birebir.

## 4. Showcase etiketi

Showcase kartlarındaki rozet "Architectural Specimen / Mimari Numune" idi; **"Concept study / Konsept çalışma"** oldu, alttaki not ve her sektör sayfasının numune notu (`Breakdown.specimen`, `Breakdown.metaDescription`) aynı sözcüğü kullanır. "Müşteri işi değildir" (`not client work`) ifadesi korundu; smoke ve audit onu arar. `Breakdown.back` ("All specimens") hem sektör sayfalarında hem numune sayfasında kullanıldığı için nötr "Back to the site / Siteye dön" yapıldı. Studio `p2Text` ("vitrinde yalnızca stüdyonun numuneleri") da "konsept çalışmalar" dedi. **Yalnızca en ve tr** değişti: de/fr/es/ar/zh dosyaları yayında olmayan taslaklardır (404), eski "specimen" etiketini taşımaya devam ederler; yayına alınırken çevrilmeleri gerekir.

## 5. Doğrulama kapısı nasıl değişti (testler)

- **Yaklaşım:** her enterprise'a bağlı assertion'ın bayrağa bağlı bir ikizi vardır (`ENTERPRISE_ON` ve `ENTERPRISE_ON` değil). **FEATURE derlemesi** (`release-verify.mjs`) artık `NEXT_PUBLIC_SHOW_ENTERPRISE=true` ile derlenir: orada eski assertion'ların tamamı **aynen** koşar, hiçbiri silinmedi ya da gevşetilmedi. **RELEASE derlemesi** (gönderilen site) aynı yerlerde tersini doğrular: yok olmalı, 301 olmalı, sitemap'te olmamalı.
- **Kapı 11 adımdan 12 adıma çıktı:** RELEASE derlemesi artık yalnızca HTTP smoke ile değil, **gerçek tarayıcıyla da** ölçülür (`browser-flow.mjs --only=cls,type,casestudy,studioonly,framework,cinema` ve `EXPECT_LOCALES=en,tr`; grupların dil listeleri derlemenin gerçek dil kümesine bağlandı, varsayılan yine yedi dil). Gönderilen sayfanın hiç ölçülmemesi kabul edilemezdi. Yeni `studioonly` grubu: iki olgunun satırı doldurması, Lighthouse linkinin halkaların altında olması, tıklayınca numune sayfasının açılması, geri linkinin `#architecture`'a inip bölümün başlığın altında durması, DOM'da simülatör / Drawing 01 / numune kartı / pilot bandı bulunmaması.
- `live-check.mjs` aynı ikizleri taşır (sitemap sayısı, 301'ler, numune sayfaları, mimari bölümü, simülatörler). Deploy sonrası `npm run live` bu yüzden aynı commit'te güncellendi.

## 6. Doğrulama kapsamındaki açık (bilerek yazıldı)

**`faz2-denetim.mjs` artık gönderilen siteyi ölçmez.** Denetim `release-verify`'da yalnızca FEATURE derlemesiyle (`--build`, anahtar açık) koşar; kural çoğu kaynak kodu okur, bir kısmı derlenmiş parçaları ölçer. Anahtar kapalıyken derlemede simülatör parçaları yoktur, bu yüzden "simülatörler ilk yükte değil, ayrı lazy parçalar" kontrolü (`faz2-denetim.mjs` 623–628) gönderilen derlemede **çalışamaz**. Zayıflatılmadı (FEATURE'da aynen geçer), ama artık gönderileni ölçmediğini bilmek gerekir. Gönderilen sayfanın performansı bunun yerine RELEASE derlemesinin Lighthouse / CLS ölçümleriyle ve `studioonly` + `cls` tarayıcı gruplarıyla izlenir. Aynı şey `qa-csp.mjs` için de geçerli (yalnızca FEATURE derlemesinde, 12 ziyaret).

**Gönderilen derlemede tarayıcıyla koşmayan gruplar:** `browser-flow.mjs`'in `gate`, `anchors` ve `deeplink` grupları FEATURE derlemesini varsayar (yedi dilli giriş kapısı, `#briefing` bağlantısı) ve en/tr, formsuz derlemede doğal olarak kırılır; bunlar yalnızca FEATURE koşusunda çalışır. Giriş kapısı, bölüm bağlantılarının konumu ve derin bağlantılar bu yüzden gönderilen kapalı derlemede tarayıcıyla **ölçülmüyor** (HTTP smoke'taki kapı ve bağlantı denetimleri orada koşar). Bu kopya değil, bir kapsam boşluğudur; kapatmak için bu üç grubun form ve dil varsayımlarından arındırılması gerekir (ayrı iş).

## 7. Bırakılan işler (bu commit'in dışında)

- **D3 (22.11.2026'da yapıldı, bkz. bölüm 10):** Hero alt başlığı ("Digital architecture at enterprise scale… secure workflow automation…") ve `Meta.ogDescription` sahibin metniyle değişti; smoke'taki "enterprise scale / secure workflow automation" denetimi aynı commit'te yeni cümlelere bağlandı. `Studio.lead` sahibin isteğiyle (A6) aynen duruyor; `Studio.founding` ("low-tolerance enterprise infrastructures") hâlâ "enterprise" tonunda ve açık.
- **D1:** Showcase sektör sayfalarındaki "Entegrasyon ve güvenlik" bölümü (Oracle / SAP / Salesforce örnek hedefleri, ortaklık-yok notu) olduğu gibi kaldı; audit o notu zorunlu tutuyor.
- `/outbound`'un 02.11 tarihli rakamları, ADR 0036 ve 0037 tarihsel kayıt olarak durur; sayfalar anahtar kapalıyken erişilemez.
- **Repo dışı (aynı gün sahibin talimatı):** outbound motorundaki pilot e-posta dizisi ve kuyruk durduruldu (`syncflow-outbound`, `data\PAUSE` + `pm2 stop`); gerekçe: teslimat sorunu çözülmedi, site artık başka bir şey satıyor, mailler eski teklifi pazarlıyordu. Mail şablonlarında `/pilot` ya da `/outbound` linki yoktu (tarandı), yani yönlendirme mailleri kırmaz; ama gönderici adresi syncflow.agency olduğu için alıcı alan adına baktığında artık bir tasarım stüdyosu görür. Sunucuyu yeniden açmanın koşulu ve kuyruğun son hali: bölüm 9.

## 8. Geri alma

`NEXT_PUBLIC_SHOW_ENTERPRISE=true` + yeniden dağıtım: Architecture IV–VI, Studio parçaları, Hero bandı, footer linki, `/pilot`, `/outbound`, iki numune sayfası ve sitemap girişleri geri gelir; yönlendirmeler kalkar (301'in tarayıcı önbelleği bir süre eski yönlendirmeyi hatırlayabilir). Sonrasında `release:verify` FEATURE adımları zaten bu hali kanıtlar.

## 9. Outbound sunucusu yeniden açılmadan önce düzeltilmeli (yalnızca kayıt; kod bilerek düzeltilmedi)

Sahibin 22.11.2026 talimatı, olduğu gibi:

> Kuyruk yeniden başlatılmadan önce düzeltilmeli: SyncFlow Followups görevi, kuyruğun gerekçesi "waiting for business hours" iken onu kendiliğinden yeniden başlatıyor (`autopilot.ts:251`, `:307`). Bu yüzden API pause tek başına yetmiyor. Düzeltme yapılmadan sunucu açılmamalı.

**Durum (22.11.2026, `syncflow-outbound`):** sunucu `pm2 stop` ile durdu ve `data\PAUSE` ile tutuluyor (5 dakikalık bekçi görevi PAUSE varken sunucuyu açmaz, `scripts\start-pm2.ps1`). Kuyruk, sunucu kapalıyken ürünün kendi `control('cancel')` işleviyle iptal edildi: `queue.json` 677 → 639 kayıt, hepsi gönderilmiş (424 ilk mail, 204 adım 2, 11 adım 3), bekleyen 0, durum `idle`, `resumeAt` yok. Silinen 38 bekleyen (25 ilk mail, 4 adım 2, 9 adım 3) iptalden önceki yedekte duruyor (`backups\20261121T211802Z`). Lead CSV'leri ve öteki veriler değişmedi: 687 dosya iptalden önce ve sonra parmak iziyle karşılaştırıldı, değişen tek dosya `queue.json`, 603 CSV bayt bayt aynı. Lead Sniper'a dokunulmadı.

**Doğrulanmış ek bulgu (sahibin cümlesine ekleme; gerçek veriyle salt okunur simülasyon):**

- İptal, takip planlayıcıyı durdurmaz. Sunucu açılırsa "SyncFlow Followups" görevinin takvim bacağı (`calendarLeg`) gönderim kaydından yeniden planlar: 9 adım-3 kapanış notu 3 günlük `LATE_MS` penceresinin içindedir ve yeniden kuyruğa alınır; adım 2'nin 15'i ve adım 3'ün 5'i 3 günden geç olduğu için "Lead Desk'e bırakılır" ve alınmaz; adım 4'ün 11'i pilot şablonunda adım 4 metni olmadığı için yazılmaz. Bu sayılar 22.11.2026 içindir, pencere her gün kayar.
- Kuyruk artık `idle`. Aynı bacak `idle` bir kuyruğu da başlatır (`autopilot.ts:250` ve `:306`, ardından `start` çağrıları `:254` ve `:309`), yani tehlikeli koşul yalnızca "waiting for business hours" gerekçesi değildir, boşta durum da. Kuyruğa bir takip alınırsa kuyruk kendiliğinden çalışır ve pilot kapanış notları alıcının çalışma saatinde gider.
- Düzeltme yönü: bu iki `start` çağrısı, sahibin durdurduğu bir kuyrukta ve pilot adımları için kuyruğu kendiliğinden başlatmamalı. Hangi yolun seçileceği (yalnızca insanın başlatması, pilot adımlarının takvimden çıkarılması ya da ikisi) sahibin kararıdır.

**Yeniden açma sırası:** (1) yukarıdaki düzeltme ve testi, (2) kod değiştiyse `npm run build` ve `.next/BUILD_ID` kontrolü (pm2 `.next`'ten çalışır, yalnızca restart eski kodu tutar), (3) `data\PAUSE`'u silmek ve `pm2 start syncflow-outbound`, (4) bir şey başlamadan önce `/api/queue` ile durumu okumak. Düzeltme yapılmadan sunucu açılmamalı.

## 10. Metin temizliği (D3), 22.11.2026: hero yalnızca stüdyoyu anlatır

İki brief, aynı gün. Gece brief'i ("Built like architecture. Loads like nothing.", üç sektör cümlesi, "400 ms altı" kanıt satırı) uygulandı ama **commit'e ve yayına girmedi**: kapı 10/12'de (FEATURE tarayıcı akışında iki kontrol, RELEASE smoke'ta ağ kesintisi: ECONNRESET) oturum DNS hatasıyla kesildi. Sabah brief'i metni yeniden belirledi; aşağıdaki durum sabah brief'inin uygulanmış hâlidir. Kurallar: tasarım, animasyon ve yerleşim değişmez; kırılan assertion silinmez, ikizi eklenir; `Studio.lead` ve Showcase "Konsept çalışma" etiketleri dokunulmaz; push sahibin onayını bekler.

### Hero: önce (canlı, f8bdebe) → sonra (bu commit)

| Parça | Önce | Sonra |
|---|---|---|
| Başlık (`Hero.title1/title2`, h1 iki maskeli satır) | Built in the dark. / Moves like liquid. · Karanlıkta inşa edilir. / Sıvı gibi akar. | **Luxury websites, / engineered for speed.** · **Hızı mühendislikle kurulmuş / lüks web siteleri.** (sahibin tek cümlesi iki satıra bölündü; paylaşım kartı da bu iki satırı çizer) |
| Alt başlık (`Hero.subtitle`) | Digital architecture at enterprise scale for principals whose name is the business: secure workflow automation, machined to tight tolerances, finished in silence, and measured rather than promised. | **SyncFlow is a studio for luxury, high-performance websites. Hand-coded, built for brands that cannot afford to look ordinary.** · **SyncFlow, lüks ve yüksek performanslı web siteleri tasarlayan bir stüdyo. Elle kodlanır, sıradan görünmeyi göze alamayan markalar için yapılır.** |
| Kanıt satırı (`Hero.proof`, yeni) | — | **Lighthouse {score} across all four categories (desktop), measured on this site.** · **Dört kategoride Lighthouse {score} (masaüstü), bu sitede ölçüldü.** Metrik şeridinin altında, tarihli ölçüm notunun üstünde (`data-hero-proof`, `mt-4 text-sm text-faint`: adres satırının kaydı, yeni CSS yok, hiçbir CTA yer değiştirmez). `{score}` mühürlü masaüstü puanıdır ve satır yalnızca dört kategori (performans, erişilebilirlik, en iyi uygulamalar, SEO) aynı sayıyı taşırken çizilir; sayı metne yazılmaz (CLAUDE.md: yayındaki sayılar yalnızca ölçülmüş olabilir). |
| Birincil CTA | "Request a free 1-page site audit" (mailto, konu "Free site audit request") | **"See the work" / "Çalışmaları gör"** → `/#showcase` (`btn btn-primary`, aynı düğme). Form açıkken (FEATURE) birincil eylem yine briefing. |
| İkincil CTA | "Showcase" / "Vitrin" → `/#showcase` (`btn btn-ghost`) | **"Write to us" / "Bize yazın"** (`Closing.emailLabel`; sitenin mevcut iletişim bağlantısı `writeHref()`, konu yok). Düz metin adres altında kaldı; önündeki "Bize yazın:" etiketi düğmeyle tekrar etmesin diye düştü. Ücretsiz site analizi isteği footer'da ve telefon çubuğunda duruyor. |
| `Meta.ogDescription` ve `Meta.description` | Digital architecture at enterprise scale. Finished in silence, measured rather than promised. · A digital architecture studio for owners, partners and principals whose name is the business. | **SyncFlow is a studio for luxury, high-performance websites. Concept studies for real industries, hand-coded for speed.** · **SyncFlow, lüks ve yüksek performanslı web siteleri tasarlayan bir stüdyo. Gerçek sektörler için konsept çalışmalar, hız için elle kodlanır.** (sahibin tek metni iki anahtara) |
| `Meta.ogTitle` / `Meta.ogAlt` | eski başlık | yeni başlık (başlığın kopyasıdırlar) |

Hero'da "enterprise", "workflow automation", "audit", "pilot" sözcükleri yok (smoke bunu artık sınar). `Hero.eyebrow` ("Digital architecture studio — est. 2026") ve `Meta.title` brief'te yoktu, değişmedi.

### Beraberinde

- **Mühür (`lib/metrics.ts`) yenilendi, docs/perf/live-2026-11-22.md:** canlı site 22.11.2026'da yeniden ölçüldü. Masaüstü 5 koşu: performans 100/100/100/100/100, erişilebilirlik / en iyi uygulamalar / SEO 100, LCP 402 / 392 / 394 / 387 / 387 ms (medyan 392, 425 idi), TBT 0, CLS 0. Mobil, sakin makinede `/` ve `/tr` 5'er koşu: 93, 100, 100, 100, 100 ve 100 × 5 (medyan 100). Kanıt satırının "dört kategoride 100"ü bu ölçümdür.
- **Paylaşım kartı sürümü** `v=4` → `v=5` (`app/[locale]/layout.tsx`, `showcase/[slug]/page.tsx`, `specimens/[slug]/page.tsx`, `app/og/route.tsx` yorumu): kart `Hero.title1/title2`'yi çizer, başlık değişti, kenar önbelleği bir yıl (ADR 0026).
- **Taslak diller (de / fr / es / ar / zh; yayında değil, 404):** aynı hero anahtarları (`title1`, `title2`, `subtitle`, `proof` eklendi, `ctaSecondary`) ve `Meta.ogTitle/ogAlt/ogDescription/description` aynı anlamla çevrildi; anahtar yapısı aynı. Araç çevirisidir, yerel konuşur incelemesi yoktur. Arapça ve Çince kart yazı tipleri yalnızca kartın harflerini taşıdığı için (ADR 0026) resmi Noto kaynaklarından yeniden kesildi (`scripts/build-og-fonts.py`: Arapça 55, Çince 60 karakter) ve Arapça kart PNG'si yeniden çizildi (`scripts/render-og-card-ar.mjs`); `python scripts/check-fonts.py` geçer. İlk kapı koşusu iki şey öğretti: (1) Chrome 157 başsız kipte `fonts.ready` hemen ardından alınan ekran görüntüsü boyanmamış, baştan sona obsidyen bir kare veriyordu (3,7 KB; FEATURE smoke'un "> 10 KB" kontrolü yakaladı); betik artık iki animasyon karesi bekler ve 10 KB'ın altında kalan kareyi reddeder (kart 78,8 KB). (2) Tarayıcı akışının "hero 820 px'ten itibaren iki satır" kuralı Almanca, İspanyolca ve Çince ikinci satırları düşürdü (32 ve 30 Latin karakter, 1440 px'te satır bütçesi ≈ 28; Çincede CJK hero boyutu 127 px/karakter, 9 karakter sığmaz); anlam değişmeden kısaltıldı: "gebaut für Geschwindigkeit.", "hechos para la velocidad.", "为速度而造。" (sahibin "sığmazsa kısalt" kuralı). Ayrıca gece brief'inin A7'si: f8bdebe'nin en/tr'de değiştirdiği altı "specimen" anahtarı bu beş dilde "Concept study" karşılığını aldı (Konzeptstudie / Étude de concept / Estudio conceptual / دراسة مفهومية / 概念研究; `Breakdown.back` "Zurück zur Website" vb.; `{tag}` ve Fransızcadaki U+00A0 korundu). `ja` uykuda, dokunulmadı.

### Testler: hiçbiri silinmedi, hiçbiri gevşetilmedi

| Yer (`scripts/smoke.mjs`, satırlar f8bdebe'ye göre) | Eski | Yeni | Neden |
|---|---|---|---|
| 176 | h1 "Built in the dark." + "Moves like liquid." | "Luxury websites," + "engineered for speed." | başlık |
| 186 | sayfa metni /enterprise scale/ **ve** /secure workflow automation/ içermeli; ROI yok | sahibin cümlesi var (/luxury, high-performance websites/ ve /cannot afford to look ordinary/); anahtar kapalıyken /enterprise scale\|workflow automation/ **yok**; ROI yarısı aynen | alt başlık; §7 bunu zaten istiyordu |
| 186'nın altı, **yeni** | — | hero bölümünün metninde enterprise / workflow automation / audit / pilot yok (anahtar açıkken pilot bandı hero'nun parçası: o zaman yalnızca audit ve workflow automation aranır) | sahibin sözcük listesi |
| 210–212 | form kapalıyken hero'da **analiz isteği** mailto'su (konu + gövde) ve footer'da aynı | form kapalıyken hero'da adrese giden bir mailto (ikincil CTA) ve footer'da analiz isteği (aynen); 215'teki biçim denetimi footer'da aynen sürer | CTA değişimi |
| 280 | kapı arkasındaki sayfa "Built in the dark." | "Luxury websites," | başlık |
| 301 (3 bot) | aynı | aynı | başlık |
| 354–359 | tr / ar / de / fr / es / zh işaretleri eski başlıklar | yeni başlıklar (ja aynen) | başlık ve taslak çeviriler |
| 481 | og:image `&v=4$` | `&v=5$` | kart sürümü |
| 482 | og:image:alt eski başlık | "syncflow.agency: Luxury websites, engineered for speed." | ogAlt |
| 512 | kart isteği `v=4` | `v=5` | parametre, assertion değil |
| **yeni**, Locales sonu | — | `/` ve `/tr`'de `data-hero-proof` satırı var ve puan sayıya çözülmüş (en `Lighthouse \d+ across all four categories (desktop)…`, tr `Dört kategoride Lighthouse \d+ (masaüstü)…`) | kanıt satırı; "ölçülecek" yedeği yayına çıkmasın |

`live-check.mjs` (177: analiz isteği konusu sayfada; footer taşır), `browser-flow.mjs`, `faz2-denetim.mjs` (`select-all` Hero'da duruyor) ve `tests/**` hero ya da og metnini sabit tutmuyor, değişmedi. `check:messages`: en/tr 675 anahtar, yer tutucular eşit; taslaklar 33 anahtar geride (hata değil).

### Kapı (`npm run release:verify`, 22.11.2026, dört koşu)

| Koşu | Sonuç | Düşen | Ne yapıldı |
|---|---|---|---|
| 1 (gece, 02:00) | 10/12 | FEATURE tarayıcı 313/315 (anchors `#studio` inişi, casestudy Escape odağı); RELEASE smoke `ECONNRESET` | oturum DNS kesintisiyle bitti; sabah brief'i metni değiştirdi |
| 2 (sabah) | 10/12 | FEATURE smoke 211/212 (Arapça kart 3,7 KB: boş kare); FEATURE tarayıcı: de/es/zh ikinci satır üç satıra taşıyor + puppeteer "detached frame" çökmesi | kart render'ına boyama beklemesi; üç satır kısaltıldı (yukarıda) |
| 3 | 10/12 | FEATURE tarayıcı 314/315 (studio-site III. bölüm çapası, en); RELEASE smoke yine `ECONNRESET` (index 2, OPTIONS /api/briefing) | altı paralel istek tek başına 6/6 turda 404 verdi: hata sunucuya ulaşmayan, boşta kapanan keep-alive soketinin yeniden kullanımı; smoke'a yalnızca bu hata için tek seferlik yeniden deneme eklendi (`fetchOnce`; başka hata ya da ikinci sıfırlama yine düşürür) |
| 4 | 10/12 | FEATURE tarayıcı 312/315 (`#architecture` ve `#showcase` çapa inişleri, ar studio-site III. bölüm çapası; biri ikinci yüklemede oturdu); RELEASE tarayıcı 44/45 (casestudy Escape odağı, en) | hepsi kaydırma / odak zamanlaması; her koşuda başka kontrol düşüyor ve aynı kontroller öteki koşularda geçiyor. Makine yüklüydü (Creative Cloud, Lively, Chrome, Spotify; adımlar 2–3 kat yavaş: `npm run check` 17 → 52 sn) |

| izole (4. koşudan sonra, aynı derlemeler yeniden kurularak) | — | FEATURE yalnızca `anchors,specimens,casestudy`: 106/108 (`#architecture` çapa inişi bu kez telefonda; ar studio-site III. bölüm çapası yine); RELEASE kapının altı grubu: **45/45** | makine %26 → %52 CPU; gönderilen (RELEASE) derleme tarayıcıda temiz, FEATURE çapa inişleri yük altında oturmuyor |

Dört koşuda 12 adımın her biri en az bir kez yeşil; tek koşuda 12/12 **alınamadı**. Studio-site III. bölüm çapası üç FEATURE koşusunda art arda düştü (en, ar, ar) ama gece 02:00'deki sakin koşuda geçmişti ve bu commit numune sayfasına dokunmuyor; sakin makinede doğrulanmadan "yük" demek bir varsayımdır, açık bırakıldı. Tarayıcı dışındaki on adım 3. koşudan itibaren her koşuda yeşil (tip + lint + mesajlar, denetim 251/0, teslim 41, mimari 65, smoke FEATURE 212/212, qa-csp 0, RELEASE derleme, smoke RELEASE 185/185). Düşen tarayıcı kontrolleri hiçbiri bu commit'in değiştirdiği bir şeyi ölçmüyor (kaydırma çapası inişi, diyalog odak dönüşü); kodda ve testte düzeltme yapılmadı, sakin makinede yeniden koşulması sahibe bırakıldı.

### Raporlanan, karar sahibinde (bu commit'te dokunulmadı)

Dördüncü Showcase sektörü (lojistik), giriş kapısının "Choose your capital center. / Finans merkezinizi seçin." metni, `Studio.founding`, `Breakdown.challengeLead`, `Footer.rights`, `/specimens/studio-site`'ın kapalı formu anlatan metinleri, `app/manifest.ts` sloganı ve yedi sözcüğün (enterprise, workflow, fail-safe, pilot, outbound, audit, queue) sekiz dildeki 83 geçişi sahibe ayrıca raporlandı.
