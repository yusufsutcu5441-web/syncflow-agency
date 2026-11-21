# ADR 0038: syncflow.agency yalnızca lüks ve yüksek performanslı web tasarımı stüdyosudur (outbound ve kurumsal katman kapalı)

- **Durum:** 22.11.2026'da yerel `studio-only` dalında uygulandı. **Yayınlanmadı, push edilmedi:** sahibin talimatı "push etmeden önce assertion raporuyla birlikte dur ve sor".
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

- **D3, ayrı görev, sıradaki iş:** Hero alt başlığı ("Digital architecture at enterprise scale… secure workflow automation…"), `Meta.ogDescription` ve `Studio.lead` / `Studio.founding` ("low-tolerance enterprise infrastructures") hâlâ "enterprise" tonunda ve yeni konumla çelişiyor. Bu commit'te bilerek dokunulmadı; smoke'taki "enterprise scale / secure workflow automation" denetimi de bu yüzden aynen duruyor ve kopya değişince birlikte güncellenmeli.
- **D1:** Showcase sektör sayfalarındaki "Entegrasyon ve güvenlik" bölümü (Oracle / SAP / Salesforce örnek hedefleri, ortaklık-yok notu) olduğu gibi kaldı; audit o notu zorunlu tutuyor.
- `/outbound`'un 02.11 tarihli rakamları, ADR 0036 ve 0037 tarihsel kayıt olarak durur; sayfalar anahtar kapalıyken erişilemez.
- **Repo dışı (aynı gün sahibin talimatı):** outbound motorundaki pilot e-posta dizisi ve kuyruk durduruldu (`syncflow-outbound`, `data\PAUSE` + `pm2 stop`); gerekçe: teslimat sorunu çözülmedi, site artık başka bir şey satıyor, mailler eski teklifi pazarlıyordu. Mail şablonlarında `/pilot` ya da `/outbound` linki yoktu (tarandı), yani yönlendirme mailleri kırmaz; ama gönderici adresi syncflow.agency olduğu için alıcı alan adına baktığında artık bir tasarım stüdyosu görür.

## 8. Geri alma

`NEXT_PUBLIC_SHOW_ENTERPRISE=true` + yeniden dağıtım: Architecture IV–VI, Studio parçaları, Hero bandı, footer linki, `/pilot`, `/outbound`, iki numune sayfası ve sitemap girişleri geri gelir; yönlendirmeler kalkar (301'in tarayıcı önbelleği bir süre eski yönlendirmeyi hatırlayabilir). Sonrasında `release:verify` FEATURE adımları zaten bu hali kanıtlar.
