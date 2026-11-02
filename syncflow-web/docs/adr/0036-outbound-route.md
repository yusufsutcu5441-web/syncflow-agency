# ADR 0036: `/outbound`: ayrı, yalnızca İngilizce bir sayfa; Dark Engineer görünümü bu rota için

- **Durum:** Yerel `outbound-route` dalında uygulandı ve commit edildi, 02.11.2026. **Push edilmedi, canlıya çıkmadı**; sahibin "push'tan önce rapor ver" şartı geçerli.
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
- **Olgusal rakamlar** (outbound motorunun kendi gönderim günlüğünden ve sonuç kayıtlarından, 02.11.2026, yalnızca prospect postası; sahibin kendine gönderdiği test postaları sayılmadı): 466 posta, 287 kişi, 11 geri dönen (466'nın %2,4'ü), 0 şikâyet, kuyrukta onaylı 37 posta. Not: ilk prototip "13 geri dönen, %2,5" yazıyordu; 13, sahibin kendi test postalarının iki geri dönüşünü de içeriyordu ve %2,5 motorun başka bir tanımıydı. Sayfaya giren rakam 11 ve %2,4'tür.
- **"Rol kutuları reddedilir" gibi genel bir iddia yazılmadı:** kuyrukta `founders@…` biçiminde adresler var ve takipleri otopilot kendisi başlatır; "insan her şeyi onaylar" da yazılmadı.
- **Saf siyah ve saf beyaz yok** (CSS'te `#000`, `#fff`, `black`, `white` yok; düğme metni `#06130d`).
- Çağrı düğmesi **`mailto:`**, `lib/contact.ts` üzerinden (`reviewHref`); adres koda yazılı değil (`NEXT_PUBLIC_CONTACT_EMAIL`), ayarlı değilse düğme hiç çizilmez. Etiket: "Request architecture review". "Deploy Your Engine" kullanılmadı: kendin kurabilirsin gibi okunur.

## 3. Dil: yalnızca İngilizce, iki ayrı güvence

1. Rota `generateStaticParams` ile yalnızca `en` üretir, `dynamicParams = false`; sayfa ayrıca `locale !== 'en'` ise `notFound()` der. `/tr/outbound` ve diğerleri 404'tür.
2. **`NEXT_PUBLIC_LAUNCHED_LOCALES` değiştirilmedi.** Varsayılanı `en,tr`'dir ve canlıdaki Türkçe site ona bağlıdır; Vercel'de `en` yapılırsa `/tr` ve altındaki her sayfa 404 verir. İngilizce-dışı sayfaların kapalı kalması için bu değişkene dokunmak gerekmez.

## 4. Yapı: ana sayfaya dokunmadan nasıl ayrı görünür

- Mekanizma: `app/[locale]/layout.tsx` (üst bar, footer, yapışkan CTA, kamera katmanı) **değişmedi**. Sayfa kendini `data-bare-page` ile işaretler; `outbound.css` `body:has([data-bare-page])` ile yalnızca bu rota ekrandayken `.site-header`, `.cv-footer`, `.sticky-cta` ve `.cinema`'yı `display: none` yapar (sekme sırasından ve erişilebilirlik ağacından da çıkar).
- `components/cinema/CinemaStage.tsx`: tek satır koruma; `data-bare-page` varken WebGL motoru hiç indirilmez. Başka hiçbir rotada davranış değişmedi.
- `app/sitemap.ts`: bir giriş (`/outbound`, hreflang yok). `scripts/delivery-verify.mjs`: yeni modül ve test listeye eklendi.
- Terminal (`components/outbound/ReplayTerminal.tsx`): ilk çizim sunucunun yazdığı tam metinle aynıdır (hidrasyon uyuşmazlığı yok, JavaScript olmadan da okunur). Yazma, yalnızca görünür harfleri değiştirir; yazılmamış kısım `visibility: hidden` ile yerinde kalır, yani yükseklik değişmez (CLS). `prefers-reduced-motion`'da yazma ve "Replay" düğmesi yoktur.

## 5. Kanıt

Testler: `tests/delivery/outbound.test.mjs` (`npm run delivery:verify`): olgu kaydı ve aritmetiği, terminalin kayıtla birebir aynı olması, yasaklı iddialar (%100, garanti, "zero human", deliverability, tarihsiz skor, "agency", mutlak sıfatlar, sonuç vaadi), sayfadaki her sayının kayıtlı olması, `mailto` biçimi. Kapı sonuçları ve ölçümler commit mesajında ve bu dalın raporunda.

## 6. Açık (sahibin kararı bekleyen)

- Push ve canlıya çıkış (onay yok).
- Kapanıştaki "A written review of your audience, domain and sending setup before anything is built. No call required." cümlesi bir hizmet tarifidir; sahibin onayı gerekir.
- Paylaşım kartı (`/og`) bu rota için ayrı değildir: sayfa `openGraph.images` vermez, yani önizlemede görsel çıkmaz.
- Mail-tester 9.9/10: tarih ve bağlantı gelince, değeri, tarihi ve kaynağıyla.
