# ADR 0036: `/outbound`: ayrı, yalnızca İngilizce bir sayfa; Dark Engineer görünümü bu rota için

- **Durum:** 02.11.2026'da yerel `outbound-route` dalında uygulandı (46abf50). **03.11.2026'da sahibin açık onayıyla `main`'e birleştirildi ve push edildi, canlıda** (Vercel 08:47 UTC, `live` denetimi 52/52). Aynı gün terminaldeki geri dönen satırı düzeltildi (bölüm 7).
- **Tetikleyen istek:** sahibin 02.11.2026 tarihli iki brief'i: (1) siteyi "Autonomous B2B Outbound Infrastructure" olarak yeniden konumlandırma isteği; (2) planın onayı: "`/outbound` ayrı rota, ana sayfaya dokunma; ADR 0009/0019'u bu rota için bırak; koyu kömür + yeşil/kehribar terminal görünümü; yalnızca İngilizce; 9.9/10 skorunu atla; REPLAY verisi %100 olgusal kalsın; yerel dal, commit, push'tan önce rapor."
- **Karar:** yeni konumlandırma **ana sayfanın yerine geçmez**; `/outbound` adında kendi sayfasıdır. Ana sayfa, Hero, Film, vitrin, briefing ve yedi dilli yapı değişmedi.

## 1. Bu rota için bırakılan kurallar (sahibin açık kararı)

| Kural | Durum `/outbound` için |
|---|---|
| ADR 0009/0019 (kilitli dörtlü sektör, niş, nitelik eşiği) | Bırakıldı: sayfa ABD'li yazılım ekiplerine yazar. |
| Renk sistemi (şampanya tek vurgu, obsidian/platin) | Bırakıldı: kömür zemin, yeşil ve kehribar vurgu (`app/[locale]/outbound/outbound.css`, `.ob` kapsamı). |
| "Kodda sabit metin yok", yedi dilin eksiksizliği (`check:messages`) | Bırakıldı: metin ve olgular `lib/outbound.ts`'te, `messages/*.json`'a hiçbir anahtar eklenmedi. Sayfa yalnızca varsayılan dilde cevap verir. |

## 2. Bırakılmayan kurallar (her biri bir olguya, hukuka ya da güvenliğe dayanır)

- **"%100", garanti, "aşılmaz", mutlak sıfatlar yok.** Brief'in "100% deliverability" ve "Zero human intervention" ifadeleri **yazılmadı**: ilki ölçülemez ve bu sitenin kuralıdır; ikincisi yanlıştır (hedef kitleyi ve her ilk-mail partisini bir insan onaylar). Yerlerine doğrulanabilir cümleler: "runs unattended", "stops itself", "a person approves each batch of first mails".
- **Her sayı kayıtlı, tarihli ve kaynaklıdır** (`REPLAY_FACTS`, `lib/outbound.ts`). Terminal canlı değil, **etiketli bir tekrardır** ("REPLAY · 02.11.2026 · NOT A LIVE FEED"). Sahibin kararıyla **9.9/10 mail-tester skoru yazılmadı** (tarihi ve bağlantısı yok).
- **Olgusal rakamlar** (outbound motorunun kendi gönderim günlüğünden ve sonuç kayıtlarından, 02.11.2026, yalnızca prospect postası; sahibin kendine gönderdiği test postaları sayılmadı): 466 posta, 287 kişi, 11 kayıtlı geri dönen, 0 kayıtlı şikâyet, kuyrukta onaylı 37 posta. Not: ilk prototip "13 geri dönen, %2,5" yazıyordu; 13, sahibin kendi test postalarının iki geri dönüşünü de içeriyordu. İlk sürümde sayfaya 11 ve "%2,4" girmişti; yüzde 03.11.2026'da kaldırıldı (bölüm 7).
- **"Rol kutuları reddedilir" gibi genel bir iddia yazılmadı:** kuyrukta `founders@…` biçiminde adresler var ve takipleri otopilot kendisi başlatır; "insan her şeyi onaylar" da yazılmadı.
- **Saf siyah ve saf beyaz yok** (CSS'te `#000`, `#fff`, `black`, `white` yok; düğme metni `#06130d`).
- Çağrı düğmesi **`mailto:`**, `lib/contact.ts` üzerinden (`reviewHref`); adres koda yazılı değil (`NEXT_PUBLIC_CONTACT_EMAIL`), ayarlı değilse düğme hiç çizilmez. Etiket: "Request architecture review". "Deploy Your Engine" kullanılmadı: kendin kurabilirsin gibi okunur.

## 3. Dil: yalnızca İngilizce, iki ayrı güvence

1. Sayfa `locale !== routing.defaultLocale` ise `notFound()` der; `/tr/outbound` ve diğerleri 404'tür. **Rotada bilerek `generateStaticParams` yoktur:** derleme sırasında üretilen bir sayfa istek başına CSP nonce'unu taşıyamaz, tarayıcı sayfanın bütün Next betiklerini engeller ve React hiç bağlanmaz (02.11.2026'da gerçek tarayıcıda bulundu: 12 CSP ihlali, terminal hiç yazmadı). Hukuk ve vaka sayfaları gibi istekte çizilir.
2. **`NEXT_PUBLIC_LAUNCHED_LOCALES` değiştirilmedi.** Varsayılanı `en,tr`'dir ve canlıdaki Türkçe site ona bağlıdır; Vercel'de `en` yapılırsa `/tr` ve altındaki her sayfa 404 verir. İngilizce-dışı sayfaların kapalı kalması için bu değişkene dokunmak gerekmez.

## 4. Yapı: ana sayfaya dokunmadan nasıl ayrı görünür

- Mekanizma: `app/[locale]/layout.tsx` (üst bar, footer, yapışkan CTA, kamera katmanı) **değişmedi**. Sayfa kendini `data-bare-page` ile işaretler; `outbound.css` `body:has([data-bare-page])` ile yalnızca bu rota ekrandayken `.site-header`, `.cv-footer`, `.sticky-cta` ve `.cinema`'yı `display: none` yapar (sekme sırasından ve erişilebilirlik ağacından da çıkar).
- `components/cinema/CinemaStage.tsx`: tek satır koruma; `data-bare-page` varken WebGL motoru hiç indirilmez. Başka hiçbir rotada davranış değişmedi.
- `app/sitemap.ts`: bir giriş (`/outbound`, hreflang yok). `scripts/delivery-verify.mjs`: yeni modül ve test listeye eklendi.
- Terminal (`components/outbound/ReplayTerminal.tsx`): ilk çizim sunucunun yazdığı tam metinle aynıdır (hidrasyon uyuşmazlığı yok, JavaScript olmadan da okunur). Yazma, yalnızca görünür harfleri değiştirir; yazılmamış kısım `visibility: hidden` ile yerinde kalır, yani yükseklik değişmez (CLS). `prefers-reduced-motion`'da yazma ve "Replay" düğmesi yoktur.

## 5. Kanıt

Testler: `tests/delivery/outbound.test.mjs` (`npm run delivery:verify`): olgu kaydı ve aritmetiği, terminalin kayıtla birebir aynı olması, yasaklı iddialar (%100, garanti, "zero human", deliverability, tarihsiz skor, "agency", mutlak sıfatlar, sonuç vaadi), sayfadaki her sayının kayıtlı olması, `mailto` biçimi. Kapı sonuçları ve ölçümler commit mesajında ve bu dalın raporunda.

## 6. Açık / karara bağlananlar

- ~~Push ve canlıya çıkış~~ Sahibin onayıyla yapıldı (03.11.2026).
- ~~Kapanıştaki "A written review ..." cümlesi~~ Sahibin onayladı (03.11.2026).
- **Paylaşım kartı (`/og`)** bu rota için ayrı değildir: sayfa `openGraph.images` vermez, yani önizlemede görsel çıkmaz. Sahibin kararıyla şimdilik yapılmıyor.
- **Mail-tester 9.9/10:** tarih ve bağlantı gelince, değeri, tarihi ve kaynağıyla. Sahibin kararıyla şimdilik eklenmiyor.
- "Rol kutuları reddedilir" iddiası bölüm 2'de yazılmadı. Outbound motoru 03.11.2026'dan beri gönderim aşamasında rol kutularını reddediyor (`role_mailbox`), yani iddia artık doğrulanabilir; ama sahibin sözü olmadan sayfaya **eklenmedi**.

## 7. Düzeltme, 03.11.2026: geri dönen satırı

Motorun geçmişinin salt okunur analizi iki şey gösterdi: (a) kayıtlı 11 geri dönenin 11'i de rol kutusuydu (`info@`, `hello@`, `sales@`, `contact@`); (b) geri dönüş okuyucusunun ilk sonucu, ilk 42 gönderimden **sonra** kaydedildi ve o adreslerin 38'ine giden takiplerden 4'ü anında geri döndü. Yani ilk günlerin geri dönenleri büyük olasılıkla hiç kaydedilmedi ve kayıtlı sayı bir **tabandır**.

Bu yüzden terminaldeki satır "11 bounced (2.4%)" yerine **"11 recorded bounces · 0 recorded complaints"** olarak değişti ve altına "feedback is counted from recorded notices only: the earliest sends may be under-counted" satırı eklendi. **Yüzde kaldırıldı** (`REPLAY_FACTS.bounceRatePct` silindi, test yüzde basılmadığını kilitler): eksik olduğu bilinen bir sayının yüzdesi ölçüm gibi okunur. Rakamların kendisi (466 posta, 287 kişi, 11, 0) ve 02.11.2026 tarihi değişmedi. İlk 42 gönderimdeki boşluk kapanırsa ya da ölçülürse yüzde, tarihiyle birlikte geri konabilir.
