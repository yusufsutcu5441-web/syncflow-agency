# ADR 0035: Satışa hazır sürüm: fiyat, form, hukuki sayfalar ve diller bayraklara bağlandı; iletişim adresi koddan çıktı

- **Durum:** Uygulandı (yerel `main`; push edilmedi, canlıya alınmadı), 22.10.2026.
- **Tetikleyen istek:** sahibin "syncflow.agency'yi satışa hazır hale getir. Yeni özellik yok; yalnız temizlik ve dürüstlük" isteği. Brief, CLAUDE.md'deki fiyat kararlarını **bu yayın için geçici olarak** geçersiz kıldı ("`pricing.ts`'e dokunma; sadece görünürlüğü kapat"). Kurallar: push ve deploy yok, sonda tek commit; sır, e-posta ve telefon koda yazılmaz; `LEGAL_GATE` ve güvenlik başlıkları/CSP'ye dokunulmaz; mesaj anahtarları silinmez; doğrulanamayan iddia yazılmaz.
- **Karar:** varsayılan sürümde **fiyat yok, form yok, her çağrı bir e-posta bağlantısı, hukuki sayfalar kısa ve bitmiş, dil seçicide yalnızca İngilizce ve Türkçe**. Hepsi geri alınabilir: üç bayrak ve bir dil listesi (aşağıda §3). `lib/pricing.ts` değişmedi.

## 1. Kanıt (kod değiştirilmeden önce) ve brief'in kodla çelişen yerleri

| Soru | Bulgu |
|---|---|
| a) `/imprint` ve `/privacy` neden "[...]" ve "have a lawyer review" gösteriyor? `LEGAL_GATE=strict` neyi engelliyor? | **Depoda `LEGAL_GATE` adlı hiçbir değişken yok** (kod, betik, docs, `.env.example` arandı); yani "strict" diye bir engel de yoktur. Köşeli parantezler `messages/*.json` içindeki `Legal` metinlerindedir (`en.json` 328-362) ve `LegalPage.tsx` rozeti her zaman basıyordu: CLAUDE.md'deki sahip kararı (yer tutucular avukat onayına kadar durur). En yakın mekanizma `check-messages.mjs --strict`: placeholder görürse düşer, varsayılan koşuda yalnızca sayar. (Vercel panelinde `LEGAL_GATE` adlı bir değişken varsa kod onu okumaz, etkisizdir.) |
| b) Tutar, süre, iddia cümleleri | **Tutar:** yalnızca kodda: `lib/pricing.ts` (USD 50.000, ₺2.475.000, AED 184.000, EUR 45.000) → `Briefing.tsx` 1. adım ve `EntryGate.tsx` para birimi etiketi; mesaj dosyalarında tutar yoktu. **"24 saat":** `messages/en|tr.json` `Briefing.subtitle`, `Briefing.successBody`, `Briefing.chipPerson`, `Breakdown.ctaText`. **NDA:** `Briefing.chipNda`, `Studio.p2Text`. **Süre seçenekleri** (4-6 hafta…): yalnızca formun 3. adımı. **"7 dil":** metinde geçmiyordu; iddia dil seçici/kapı/footer listesi ve `i18n/launch.ts` varsayılanıydı. **"invoice":** yalnızca lojistik numunenin içeriği (SAP/Oracle olay adları), faturalama sözü yok. **Müşteri/sonuç sayısı:** yok; sayılar `lib/metrics.ts` ölçümleri. |
| c) Teslim env'i yoksa form ne gösterir? | `briefingDeliveryConnected()` false → `Briefing.tsx` `direct` kipi: "Your answers open as an email draft… nothing is sent from this page" notu, düğme "Open the email draft" (`mailto:` taslağı), Turnstile çalışmaz, doğrudan POST 503. Sahte başarı yok. |
| Brief'in varsaydığı ama olmayan şeyler | `contact.ts` ve `NEXT_PUBLIC_CONTACT_EMAIL` yoktu (adres `lib/site.ts`'te sabit yazılıydı); "form sayfası" yok (briefing ana sayfadaki bir bölüm); "Yatırım bölümü" ve SSS yok (yatırım = briefing 1. adımı). Her biri aşağıda kodun gerçeğine uyarlandı. |

## 2. Yapılanlar (brief maddeleri)

1. **Taslak izi sıfır.** Form kapalıyken `/imprint` ve `/privacy` `LegalNotice.tsx`'ten gelir: yer tutucu, "Draft" rozeti ya da avukat notu yoktur. Eski uzun KVKK/GDPR taslağı (`LegalPage.tsx`, anahtarlar silinmedi) form AÇIKKEN geri gelir, çünkü formu anlatır.
2. **`/imprint` = kısa Legal Notice:** "SyncFlow is an independent digital engineering studio in its founding stage." (TR: "SyncFlow, kuruluş aşamasında bağımsız bir dijital mühendislik stüdyosudur."), iletişim e-postası env'den, "Registration details will be published once complete." **`/privacy`** yalnızca kodla ve barındırmayla doğrulanan olguları söyler: Vercel'de barındırma ve her web isteğinin taşıdığı teknik veriler; hız sınırı için IP başına yaklaşık bir dakikalık bellek içi sayaç (`proxy.ts`, `lib/security/rate-limit.ts`); çerez ve analitik yok, üçüncü taraftan betik/yazı tipi/görsel/video yüklenmez (CSP `default-src 'self'`); e-postayla gelen mesaj yalnızca yanıt için kullanılır; silme talebi e-postayla. Yasal dayanak, saklama süresi, denetim makamı gibi koddan doğrulanamayan hiçbir şey yazılmadı. EN ve TR metinleri `Notice` ad alanındadır; diğer diller İngilizce metni `lang="en"` ile gösterir.
3. **Fiyat gizli.** `NEXT_PUBLIC_SHOW_PRICING` (varsayılan kapalı): yatırım basamakları ve kapıdaki para birimi etiketleri kapanır; kapalıyken hiçbir sayfada tutar ya da para birimi kodu yoktur (görünen metinde `$` ve `₺` sıfır; ham HTML'deki `$` React'in kendi veri akışıdır). `lib/pricing.ts` değişmedi.
4. **Form kapalı.** `NEXT_PUBLIC_BRIEFING_ENABLED` (varsayılan kapalı; yoktu, eklendi). Kapalıyken bölüm, başlık ve alt çubuktaki bağlantılar, footer ve kapanış bağlantıları, vitrin kartı bağlantıları, vaka sayfalarının çağrı bloğu ve istemciye giden `Briefing` mesajları yoktur; `/api/briefing` her yöntemde **404** verir. **Form yalnızca `SHOW_PRICING` de açıksa açılır:** formun ilk sorusu fiyat sorusudur, tutarsız bir form üretmemek için (yalnız briefing bayrağı açıksa derleme uyarır). Site haritasında form için bir adres zaten yoktu.
5. **Tüm çağrılar `mailto:`.** Adres `NEXT_PUBLIC_CONTACT_EMAIL`'dan gelir (`lib/site.ts`), bağlantıları `lib/contact.ts` kurar; **kodda hiçbir adres yazılı değil** (yoksa bağlantı yoktur, `next.config.mjs` derlemede uyarır). Hero'nun birincil düğmesi, mobil sabit çubuk, footer (form AÇIKKEN hero ve sabit çubuk briefing'i taşımaya devam eder, denetim çağrısı footer'da kalır): "Request a free 1-page site audit" (TR "Ücretsiz 1 sayfalık site analizi isteyin"), konu "Free site audit request", gövde "Website URL:" ve "What matters most (speed / SEO / mobile / redesign):" (konu ve gövde iki dilde de İngilizce: gelen kutusu İngilizce okunur). Üst bar düğmesi, vitrin kartları ve vaka sayfaları "Email us / Bize yazın".
6. **Tutamayacağımız söz yok.** "24 saat", "NDA" ve para birimi cümlesi metinlerden çıktı (`Meta.description`, `Gate.lead`, `Briefing.subtitle`, `Briefing.successBody`, `Studio.p2Text`, `Breakdown.ctaText`; değerler değişti, **anahtarlar silinmedi**); iki güven çipi (`chipNda`, `chipPerson`) gösterilmez. "7 dil" iddiası dil listesi daralınca kalktı. "Faturalı" yoktu (yalnızca lojistik içeriği).
7. **Diller `en,tr`.** `NEXT_PUBLIC_LAUNCHED_LOCALES` varsayılanı `en,tr`: dil seçici, kapı kartları, footer, hreflang, site haritası (49 → 14 adres) ve JSON-LD yalnızca ikisini listeler. Diğer beş dilin mesaj dosyalarına **dokunulmadı**; `check-messages` onları taslak sayar (eksik anahtar İngilizceye düşer).

## 3. Brief'ten bilerek ayrıldığım yerler

- **"Diğer diller noindex" yerine 404.** Mevcut ve sınanmış mekanizma yayında olmayan dili sunmaz (404). Sunulan ama `noindex` bir dil, beş dilin makine çevirisini ve eski iddialarını (24 saat, NDA, tutarlar) sayfada tutardı: brief'in "hiçbir locale'de iz kalmasın" maddesiyle çelişirdi ve 30 satır sınırını aşardı. Geri dönüş tek değişken: `NEXT_PUBLIC_LAUNCHED_LOCALES=en,tr,ar,de,fr,es,zh`.
- **Briefing bayrağı fiyat bayrağına bağlı** (§2.4).
- **Form açıkken uzun hukuki taslak geri gelir** (yer tutucularıyla); "bayraklar açık = eski site" ilkesi korundu.
- **İlk commit'te dokunulmayanlar (kalan risk olarak bildirildi, sahibi aynı gün §8'deki düzeltme turuyla işledi):** Studio'daki Çizim 01 ve Numune 01 sitenin kendi form mimarisini anlatır (kod duruyor, form kapalı); "High-ROI digital ecosystems" (ADR 0019'dan beri açık, ölçülmüş iddia değil); hero'daki "est. 2026" (kalır). Brief yalnızca nav, çağrı ve site haritasındaki izi istemişti, bu yüzden bunları kendiliğimden çıkarmadım.

## 4. Testler ve araçlar

- `faz2-denetim.mjs`: bir kural değişti (Stüdyo metni artık NDA ya da yanıt süresi sözü verirse FAIL) ve **13. grup** eklendi (6 kural): bayraklar varsayılan kapalı ve briefing bayrağı fiyat bayrağına bağlı; form kapalıyken bölüm yok ve `/api/briefing` her yöntemde 404; **kodda e-posta adresi yazılı değil** (`lib/arch/` örnek verisi hariç); denetim çağrısının konusu ve gövdesi; EN ve TR'de NDA / 24 saat / faturalı sözü yok ve kısa bildirimlerde yer tutucu yok; kapıdaki para birimi etiketi fiyat bayrağına bağlı.
- `scripts/smoke.mjs`: bayrakları ortamdan okur (`NEXT_PUBLIC_SHOW_PRICING`, `NEXT_PUBLIC_BRIEFING_ENABLED`, `NEXT_PUBLIC_CONTACT_EMAIL`, `EXPECT_LOCALES` varsayılanı `en,tr`). Varsayılanda: form yok, `/api/briefing` her yöntemde 404, görünen metinde tutar yok, hero ve footer'da denetim çağrısı (konu ve gövde ayrıştırılıp sınanır), kısa bildirimlerde yer tutucu/taslak/avukat izi yok, kapalı dillerde 404. Bayraklar açıkken eski kontrollerin tamamı (mock webhook dahil) aynen çalışır. Yeni "Release hygiene" bloğu her genel dilde ana sayfa, privacy, imprint, bir vaka ve bir numune sayfasını tarar.
- `scripts/live-check.mjs`: aynı bayrak ve dil kipini okur (canlı sitenin kendi sürümünü bekler).
- `scripts/release-verify.mjs`: **iki derleme** sınar: özellikli (her bayrak açık, yedi dil; denetim, duman, CSP, tarayıcı akışı) ve varsayılan sürüm (her bayrak kapalı; duman). Kapıdaki adres `gate@example.test`'tir (ayrılmış test alanı), gerçek adres yok.
- `scripts/delivery-e2e.mjs`: form kapalı bir derlemede açık bir mesajla durur (derleme bayraklarla alınmalı). `browser-flow.mjs` başlığı özellikli derlemeyi sürdüğünü söyler.
- `check-messages.mjs`: yayın dili listesinden türeyen taslak kümesi (eskiden yalnızca `ja`).

## 5. Sahibin yapacakları (Vercel ve elle)

1. **Push'tan ÖNCE** Vercel → Settings → Environment Variables → `NEXT_PUBLIC_CONTACT_EMAIL` (Production + Preview): sitenin tek iletişim adresi. Girmeden push edilirse canlı sitede hiçbir e-posta bağlantısı olmaz.
2. İsteğe bağlı, varsayılan zaten bu: `NEXT_PUBLIC_SHOW_PRICING` ve `NEXT_PUBLIC_BRIEFING_ENABLED` tanımsız ya da `false` kalır; `NEXT_PUBLIC_LAUNCHED_LOCALES` tanımsız ya da `en,tr`. (Panelde `en,tr,ar,de,fr,es,zh` kalmışsa silin: yoksa beş dil açık kalır.) Telegram ve Turnstile değişkenleri durabilir: form kapalıyken kullanılmaz.
3. Push sonrası: `NEXT_PUBLIC_CONTACT_EMAIL=<adres> node scripts/live-check.mjs https://syncflow.agency` (hata sıfır olmalı).
4. Hukuki gerçekler (şirket unvanı, adres, sicil, saklama süresi, denetim makamı) ve avukat incelemesi hâlâ sizde; kısa gizlilik bildirimi KVKK m.10 / GDPR m.13'ün tüm unsurlarını içermez ve içerdiğini söylemez. Formu açmadan önce [legal-facts-intake.md](../legal-facts-intake.md) tablosu doldurulmalıdır. Bildirim bugünkü kurulumu anlatır: barındırıcı Vercel, hız sınırı sayacı bellekte. Barındırıcı değişirse ya da `UPSTASH_REDIS_REST_*` tanımlanırsa (IP özetlenip paylaşımlı depoda sayılır) ilgili cümleler güncellenmelidir.

## 6. Geri alma

`NEXT_PUBLIC_SHOW_PRICING=true`, `NEXT_PUBLIC_BRIEFING_ENABLED=true`, `NEXT_PUBLIC_LAUNCHED_LOCALES=en,tr,ar,de,fr,es,zh` ve yeniden dağıtım siteyi önceki hâline (form, tutarlar, yedi dil, uzun hukuki taslak) döndürür. Kod için: `git revert <commit>`.

## 7. Doğrulama (yerel, 22.10.2026)

`npm run release:verify`: **11/11 adım yeşil**, yaklaşık 16,5 dakika (kapı artık iki derleme sınar, §4):

| Adım | Süre | Sonuç |
|---|---|---|
| Tip denetimi, lint, mesaj eşitliği (yayın dilleri `en`, `tr`) | 95 sn | yeşil |
| Tasarım denetimi, ÖZELLİKLİ derleme (her bayrak açık) | 19 sn | **247 geçti, 0 hata**, 1 uyarı (eski uzun taslağın yer tutucuları), 4 bilgi (241 + yeni 13. grubun 6 kuralı) |
| Teslim sözleşme testleri | 2 sn | 16/16 |
| Referans mimari sözleşme testleri | 2 sn | 65/65 |
| HTTP duman testi, özellikli derleme (yedi dil, form, tutarlar) | 8 sn | **197/197** |
| CSP ihlali ve konsol hatası (12 ziyaret) | 100 sn | 0 / 0 |
| Gerçek tarayıcı akışı, özellikli derleme | 732 sn | **315/315** |
| VARSAYILAN sürümün üretim derlemesi (her bayrak kapalı, `en`, `tr`) | 17 sn | yeşil |
| HTTP duman testi, varsayılan sürüm | 11 sn | **164/164** |

Kapı dışında, varsayılan sürümün derlemesiyle (`next start`, :3100):

- `npm run lint`, `typecheck`, `check:messages`, `check:fonts`, `audit:secrets`, `brand:check`, `flags:check` ve `node scripts/defer-framework.mjs --check`: yeşil.
- **44 rotanın HTTP kodları:** ana sayfa, `/tr`, `/privacy`, `/imprint`, dört vaka ve iki numune sayfası (EN ve TR) 200; `/showcase` 307; kapalı diller (`/de`, `/ar`, `/fr`, `/es`, `/zh`, `/ja` ve altındaki sayfalar) 404; `/api/briefing` GET ve POST **404**; `/api/breakdown` 200.
- **Aranan izler** (38 HTML rotası): `Draft` 0, `lawyer` 0, `₺` 0 (ham HTML'de de, görünen metinde de); `$` görünen metinde **0** (ham HTML'de 13.999: React'in kendi veri akışındaki `$L…` ve `$undefined` başvuruları, tutar değil); `[` görünen metinde 8 (hepsi simülatörün örnek yüklerindeki JSON dizi parantezi), ham HTML'de JavaScript dizileri.
- **Gerçek Chrome, 7 sayfa:** yalnızca kendi kaynağına istek (ve `data:`), çerez 0, `localStorage` 0, `sessionStorage` 0: gizlilik bildirimindeki "çerez yok, üçüncü taraftan hiçbir şey yüklenmez" cümlelerinin dayanağı.
- Ekran görüntüleri (masaüstü ve telefon, EN ve TR) gözle incelendi: hero, footer, gizlilik, künye, mobil sabit çubuk, vaka sayfasının çağrısı.

**Doğrulanmadı:** gerçek Vercel derlemesi ve panel değişkenleri (push edilmedi); `mailto:` bağlantılarının gerçek bir posta programında açılışı; Safari ve Firefox; yeni Türkçe metinlerin ana dil konuşuru ve avukat incelemesi (metinleri ben yazdım).

## 8. Düzeltme turu (22.10.2026, aynı gün, ikinci commit; push yok)

Sahibin "küçük düzeltme turu" isteği: (1) getiri ve sonuç vaatleri, (2) Çizim 01 ve Numune 01, (3) düz metin adres, (4) mailto kodlaması, (5) kapıyı yeniden çalıştırmak.

**1. Getiri ve sonuç vaatleri (EN ve TR görünen metinler).** İki dilin bütün mesajları (gizli form metinleri dahil) şu kalıplarla tarandı: ROI, return, yield, conversion, increase, boost, grow, revenue, profit, uplift, drive, generate, outcome, result, improve, guarantee, proven; TR: getiri, artır, artış, kazandır, kazanç, dönüşüm, büyüme, gelir, kâr, satış, sonuç, verim, hızlandır, iyileştir. "Artırır", "kazandırır" ya da "dönüşüm artışı" türünden bir vaat **bulunmadı**; bulunanlar ve yapılan:

| Yer | Metin | Yapılan |
|---|---|---|
| `messages/en.json:77`, `tr.json:77` (`Architecture.intro`) | "High-ROI digital ecosystems" / "Yüksek getirili dijital ekosistemler" | **kaldırıldı** ("Digital ecosystems are built here in two layers…") |
| `en.json:564`, `tr.json:564` (`Breakdown.impactTitle`) | "Measured impact & ROI" / "Ölçülen etki ve yatırım getirisi" | **"Measured impact" / "Ölçülen etki"** (vaka sayfalarının dördüncü başlığı) |
| `en.json:575-576`, `tr.json:575-576` (`Breakdown.roiTitle`, `roiText`) | "Return on investment" ve "We do not publish a return for a specimen, and we do not promise one…" | **"How impact is established" / "Etki nasıl belirlenir"**; metin "We publish no outcome for a specimen and promise none. On an engagement, impact is established with you, in three steps." (TR: "…sonuç yayınlamayız ve sonuç vaat etmeyiz…"). Bunlar bir vaat değil bir inkârdı; ama "ROI" ve "getiri" sözcüklerini taşıyorlardı ve istek bu sözcükleri sayıyordu: inkâr korundu, sözcükler gitti |
| `tr.json:605`, `tr.json:621` (`Breakdown.estate.m3`, `Breakdown.clinic.m3`) | "Taleplerden gezilere / randevulara dönüşüm oranı" | "…oran" (İngilizce karşılıkları zaten "Enquiry-to-viewing rate", "Request-to-appointment rate" diyordu); bunlar başlangıçta ölçülecek şeylerin adıdır, vaat değil |

Vaat olmadığı için **bırakılanlar:** `en.json:95` (`Architecture.c3Text`, "…never won back by a manifesto…": ölçmenin gerekçesi, müşteriye sonuç sözü değil), `en.json:154` (`Showcase.logistics.title`, "Nothing waits. Nothing is lost.": konsept numune başlığı; kuyruğun testlerle desteklenen mühendislik cümlesi), `en.json:606, 612, 622, 654` (`Breakdown.estate.note`, `clinic.c3`, `clinic.note`, `logistics.note`: "fiyat, sonuç galerisi, çalışma süresi iddia edilmez" uyarıları). Hero'daki **"est. 2026" kaldı**. Ar, De, Fr, Es, Zh ve Ja dosyalarına dokunulmadı: eski "High-ROI" çevirilerini ve ROI başlıklarını taşırlar; o diller yeniden açılmadan önce güncellenmelidir. Bundan sonrası için: denetimin 13. grubu EN ve TR'de bu sözcükleri yasaklar, duman testi her genel dilin sayfalarında arar.

**2. Çizim 01 ve Numune 01.** İkisi de, form kapalıyken, kullanılabilir bir form varmış izlenimi veriyordu ("The path of **your** briefing", "applied to the form **on this page**", "this site takes enquiries"); bu yüzden etiketlendi: Çizim 01'in etiketi "Reference architecture — Drawing 01" (TR "Referans mimari — Çizim 01", `components/sections/Studio.tsx:151`), Numune 01'in etiketi hem Studio kartında hem sayfasında "Reference architecture: this site" (TR "Referans mimari: bu site", `Studio.tsx:32`, `lib/server/specimen.ts:89`; anahtar `Specimen.studioSite.tagReference`, `en.json:671`). Etiket yalnızca form kapalıyken görünür (form açıkken gerçek bir form vardır: dokunulmadı). Etiket tek başına "applied to the form on this page" cümlesini düzeltmezdi; bu yüzden `Studio.drawingTitle` ve `drawingLead` (`en.json:462-463`) her iki kipte de doğru olacak biçimde yeniden yazıldı ("The path of a briefing…", "…applied to the briefing form in our repository…"). Aynı izlenimi veren iki cümle daha vardı ve aynı gerekçeyle düzeltildi: `Studio.f2Text` (`en.json:456`, "…except the Cloudflare bot check on the briefing form": form kapalıyken bu istisna yok; formsuz metin `f2TextNoForm`, `Studio.tsx:50`) ve `Sim.security.caption` (`en.json:529`, "…the pattern this site uses to deliver its own briefings" → "…the briefing form in our repository uses…"). Numune 02 (kuyruk) zaten "Reference: enterprise integration layer" der ve bir form ima etmez: dokunulmadı.

**3. İletişim adresi düz metin olarak da görünür** (mailto açmayan kullanıcı kopyalasın; tek tıkla tamamı seçilir, `select-all`). Kapanış bölümünde zaten vardı (adres ve "Copy" düğmesi): dokunulmadı. CTA'nın yanında yoktu, eklendi: hero (form kapalıyken, düğmelerin altında "Email us: adres", `Hero.tsx:91`), footer (denetim bağlantısının altında, `Footer.tsx:69`), vaka ve numune sayfalarının çağrı bloğu (`BreakdownView.tsx:199`, veri `lib/server/cta.ts`). Üst bar düğmesi, mobil sabit çubuk ve vitrin kartı bağlantıları küçük olduğu için adres taşımaz. Kapanış bölümündeki boş `<ul>` artık çizilmez (`Closing.tsx`).

**4. mailto kodlaması.** Konu ve gövde RFC 6068'e göre kodlanır ve gövdenin satır sonları `%0D%0A` olur (önceden `encodeURIComponent` ile `%0A` çıkıyordu). Kodlayıcı tek yerdedir, `lib/mailto.ts` (import'suz): `( ) ! ' *` de kodlanır, konudaki satır sonu boşluğa çevrilir (ikinci başlık açılamaz), adresteki `? & # % =` bağlantının biçimini bozamaz. İlk konu/gövde taşıyan bağlantının href'i:

`mailto:<adres>?subject=Free%20site%20audit%20request&body=Website%20URL%3A%0D%0A%0D%0AWhat%20matters%20most%20%28speed%20%2F%20SEO%20%2F%20mobile%20%2F%20redesign%29%3A%0D%0A`

(Sayfadaki ilk `mailto:` bağlantısı üst bar düğmesidir ve düz `mailto:<adres>`'tir; konu ve gövde taşımaz.) **Birim test:** `tests/delivery/mailto.test.mjs` (10 test; `npm run delivery:verify` koşar: tam href, URL ayrıştırıcıyla geri okuma, satır sonları, özel karakterler ve ASCII dışı harfler, konu enjeksiyonu, adres kodlaması). Duman testi sayfadaki bağlantının harfi harfine aynı olduğunu da sınar.

**5. Kapı.** `npm run release:verify` düzeltme turundan sonra yeniden koşuldu: **11/11 adım yeşil**, 906 sn (adım sürelerinin toplamı). Tip denetimi, lint ve mesaj eşitliği yeşil; tasarım denetimi (özellikli derleme) **251 geçti, 0 hata**, 1 uyarı, 4 bilgi (ilk commit'te 247; artış, 13. gruba eklenen düzeltme turu kurallarıdır); teslim ve kodlayıcı testleri **26/26** (16 + 10 yeni); mimari 65/65; özellikli derlemenin duman testi **199/199**; CSP ve konsol 0/0; gerçek tarayıcı akışı **315/315**; varsayılan sürümün derlemesi yeşil; varsayılan sürümün duman testi **167/167** (ilk commit'te 164). Tablo: `docs/deployment.md` §7.0. Kapıdan sonra, varsayılan sürümün derlemesinden `next start` ile okunan gerçek bağlantılar (EN ve TR'de 9'ar `mailto:`): ilk bağlantı üst bar düğmesidir (düz adres), ikincisi hero'daki denetim bağlantısıdır ve href'i yukarıdaki (4) ile harfi harfine aynıdır; hiçbirinde çıplak `%0A`, `%0D` ya da boşluk yoktur. Ham HTML'de `&` işareti `&amp;` diye kaçar, tarayıcı `&` okur.

**Ek: sayfa yüksekliği tahminleri.** Form kapalı varsayılan sürümde Kapanış ve footer bloklarının gerçek yüksekliği, `app/globals.css`'teki `--cv` tahminlerinden 100-200 px kısadır (tahminler formlu yapıyla ölçülmüştü). Kaydırırken yerleşim kayması **0,0000** (EN ve TR; masaüstü, tablet, telefon; içerik görünürlüğü açık ve kapalı), sayfa uzunluğu tahminle gerçek arasında %1,1-1,7. Kayma olmadığı için tahminlere dokunulmadı.
