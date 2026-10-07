# ADR 0005: Ana Sayfa Blueprint'i, Faz 4 (Strategic Briefing) ve Faz 5 (7 dil): uygunluk analizi, plan, karar bekleyenler

- **Durum:** Önerildi, 08.10.2026. **Karar bekliyor.** Faz 4–5 kodu bu ADR onaylanana kadar yazılmadı.
- **İstek:** proje sahibi, "syncflow.agency Ana Sayfa Blueprint" dokümanının (`syncflow-blueprint.docx`, 07.10.2026 23:01) tüm mimari, tasarım ve metin kurallarıyla uygulanmasını; 4 adımlı Strategic Briefing'i `contact@syncflow.agency`'ye bağlamamı (Faz 4); TR, EN, DE, FR, ES, AR, JA dillerini, Arapçada `dir="rtl"` aynalamayı ve küresel SEO'yu (Faz 5) istedi.
- **Neden önce plan:** CLAUDE.md "Karmaşık işe plan modunda başla, planı göster, onay bekle" ve "açık olanları Claude Code kendisi dondurmaz, sorar" der. Blueprint, aynı dosyanın "pazarlığa kapalı" kurallarıyla 17 noktada çelişir ve beş girdi eksiktir. Çelişkiyi sessizce bir yana çözmek, ya kuralları ya da Blueprint'i sahibin haberi olmadan çiğnemek olurdu.

## Blueprint'te ne var, ne yok

- **Kapsam bir form değil, ana sayfanın tamamı:** nav, hero, 3 kartlı "mimari ve performans", 3 kartlı sektör vitrini, küresel erişim, 4 adımlı briefing, başarı ekranı, footer. Bugünkü site ise başka bir üründür: tek teklif ($2.500) ve Lemon Squeezy ödeme katmanı (17 dosya, 74 anış: Hero, Pricing, Header, StickyCta, CSP, JSON-LD, `/og`, SSS, mesajlar). Blueprint'te ödeme ve fiyat yoktur; uygulamak ana sayfayı baştan kurmak ve teklifi başvuru bazlı akışa çevirmek demektir.
- **Yedi dilli sözlük yok.** Yedi dilde yalnızca tek cümle var ("Markanız, hak ettiği her dilde." tablosu). Başlıklar ve hero EN + TR; gövde metinlerinin çoğu yalnızca TR (briefing adımları ve başarı ekranı dahil), İngilizce karşılıkları da yok. DE, FR, ES, AR, JA sözlükleri bu dokümandan "tamamlanamaz"; yazılmaları gerekir.
- **Eksik girdiler:** n8n webhook adresi ve HMAC sırrı; Turnstile anahtarları; WhatsApp numarası, LinkedIn/Instagram adresleri, takvim bağlantısı; AR/JA yazı tipi onayı; Avrupa € karşılığı.

## Çelişkiler ve önerilen çözüm

| # | Blueprint | CLAUDE.md / karar | Öneri |
|---|---|---|---|
| 1 | Zemin saf `#000000`, kart `#0a0a0a` | Saf siyah yasak; zemin `#0D0D0E`, katmanlar `#141416` / `#1A1A1E` | Tokenlar |
| 2 | Kenar `#ffffff1a`, hover `#ffffff40`; nav `backdrop-filter: blur(20px)` | Çizgi %6 ve %16; blur telefonda pahalı (Header notu); denetim `#ffffff1a`'yı FAIL sayar | Tokenlar |
| 3 | Border Beam (conic-gradient), imleç spotlight'ı, "loş parlama", manyetik düğme | Glow, gradyan, CSS ışık efekti yok; özel imleç Faz 2'de bilerek kaldırıldı | Uygulanmaz ([ADR 0004](0004-motion-and-smooth-scroll.md) A/B) |
| 4 | Mono 11 px, geniş tracking, büyük harf etiketler (`01 — ARCHITECTURE`, `REAL ESTATE`, `NATIVE · WEBM`) | Arayüzde büyük harf yok, tek yazı ailesi, tracking değerleri sabit | Cümle düzeni, mevcut aile |
| 5 | Hap düğmeler; birincil düğme "dolu beyaz, siyah metin" | Hap yok, köşe 2–4 px; birincil CTA şampanya `#D4C5A9` | Tokenlar |
| 6 | Wordmark "syncflow", ".agency" %40 | Logo B1 + Özel Çizim v2 kilitli | Kilitli logo |
| 7 | Vitrin: Gayrimenkul, Klinik, **SaaS** | Yalnızca 3 sektör: sağlık, lüks gayrimenkul/mimarlık, kurumsal hukuk. SaaS niş dışı | SaaS yerine kurumsal hukuk |
| 8 | Klinik kartı "önce-sonra galerileri"; rozetler `+%212`, `−%38`, `+%64` | Sağlıkta önce-sonra, üstünlük, hasta yorumu yok. Blueprint de rozetler için "gerçek vaka olmadan yayınlanmamalı" diyor | Rozetler ve önce-sonra çıkar; hukuk kartı reklam yasağına uyar (Avukatlık Kanunu m.55) |
| 9 | "100 / 100 Lighthouse", "60 FPS kilitli", "LCP < 1,2 sn", "TBT < 50 ms", "INP < 100 ms", "120 Hz", "ilk 400 ms" | Spec değerleri yalnızca ölçülmüş olabilir; ölçülene kadar "ölçülecek" | Yalnızca [docs/perf/faz3.md](../perf/faz3.md)'deki ölçümler; kalanı "ölçülecek" |
| 10 | Scroll-jacked yatay vitrin (kart 70vw) | Dokunmatikte native scroll; scroll-jacking erişilebilirliği ve INP'yi bozar | Dikey kartlar ya da native `scroll-snap` şerit |
| 11 | Dönen küre, 7 şehir, yörüngede dil etiketleri, imleçle cümle değişimi | 5 dil kapalı; ağır; sürekli hareket 60 FPS bütçesini yer | 7 cümlelik statik dil listesi |
| 12 | Yatırım "$5k – $10k" | Yurt dışı taban $10.000 | "10 bin dolar altı" seçeneği düşük çıkışa gider; aralıklar `lib/pricing.ts`'ten |
| 13 | Briefing: karar yetkisi, rıza, Turnstile, honeypot yok; "üçüncü taraflarla paylaşılmaz"; "yaklaşık 90 sn"; herkese "24 saatte kişisel dönüş" | Protokol: 4 filtre + iletişim ve rıza ekranı, 60 sn altı, 3 çıkış. KVKK/GDPR: işaretsiz açık rıza, aydınlatma, işleyiciler (Turnstile, n8n, Gmail) | Protokole uyarlanır; mikro metin doğru hâle getirilir |
| 14 | Footer: WhatsApp, LinkedIn, Instagram, "Cookies" | Numara ve hesap adresi verilmedi; site çerezsiz | Gerçek adres gelene kadar yok; çerez notu gizlilik metninde |
| 15 | "Kusursuz", "mükemmellik standardı" | Üstünlük sıfatı yok | Yeniden yazılır |
| 16 | 7 dil birden | Lansman TR + EN, diğerleri yerel çeviri ve hukuk incelemesiyle tek tek ([ADR 0002](0002-launch-locales-and-market.md)) | Mimaride 7, yayında TR + EN (aşağıda) |
| 17 | Ana sayfada fiyat ve ödeme yok | Bugünkü site $2.500 + Lemon Squeezy | Başvuru bazlı akışa geçilir (onay gerekir) |

## Önerilen tasarım

**Sıra** (çeviri son, çünkü metin kesinleşmeden çevrilmez): (1) `lib/pricing.ts` ve içerik modeli, (2) ana sayfa Blueprint yapısıyla, tokenlarla, EN + TR, (3) briefing ve API, (4) 7 dil, RTL, SEO, (5) build, denetim, smoke, tarayıcı, Lighthouse, belgeler. Her adım kendi dalında ve commit'le; kapılar CLAUDE.md'deki gibi.

**Briefing (Faz 4)**

- **Yer:** `/[locale]/briefing` ayrı rota; ana sayfada aynı başlıkla tanıtım bölümü ve CTA. Gerekçe: "başvuru akışında smooth scroll yok" kuralı (Lenis o rotada başlatılmaz), ana sayfanın JS bütçesi, odak yönetimi. Satır içi isterseniz Lenis panel görünürken durdurulur.
- **Ekranlar:** (1) proje türü, (2) yatırım aralığı, (3) zamanlama, (4) iletişim: ad soyad, şirket ve unvan, iş e-postası, tek cümle proje (opsiyonel), karar yetkisi (3 seçenek), **işaretsiz** açık rıza kutusu + aydınlatma bağlantısı. Ekran başına tek soru, ilerleme çizgisi 4 parça, geri düğmesi.
- **Geçiş:** opacity + transform (CLAUDE.md "yalnızca transform ve opacity"; Blueprint'in animasyonlu `clip-path` geçişi yerine). `m.*`/LazyMotion burada serbest: bileşen kendisi dinamik yüklenir ([ADR 0004](0004-motion-and-smooth-scroll.md), karar 3).
- **Erişilebilirlik:** her adım `fieldset` + `legend`, klavye ok tuşları, `aria-live` ilerleme duyurusu, odak yeni adımın başlığına, hata `aria-describedby`; `prefers-reduced-motion`. Taslak tarayıcıda saklanmaz (çerez ve depolama yok).
- **API:** `POST /api/briefing`, `/api/contact` altyapısını paylaşır (origin, 8 KB, strict zod, honeypot + en az doldurma süresi, DOMPurify, IP başına 5/10 dk, HMAC imzalı webhook). Eklenenler: Turnstile sunucu doğrulaması (`TURNSTILE_SECRET_KEY`; production'da anahtar yoksa istek reddedilir), **çıkış sınıfı (yüksek/orta/düşük) sunucuda hesaplanır** (istemciye güvenilmez), ayrıntı sızdırmayan hatalar. CSP'ye yalnızca `challenges.cloudflare.com`.
- **Çıkışlar ve başarı ekranı:** yüksek = hemen e-posta/WhatsApp + takvim; orta = "24 saatte elle inceleme"; düşük = nazik ret + kaynak. Metin çıkışa göre değişir; "24 saatte kişisel dönüş" yalnızca gerçekse yazılır (kapasite cümlesi kuralı).
- **Teslimat:** form → imzalı webhook → n8n → Gmail → `contact@syncflow.agency` (+ isteğe bağlı otomatik yanıt). Gmail kimlik bilgisi uygulamada tutulmaz. İçe aktarılabilir n8n akışı örneği `docs/n8n/` altına konur (HMAC doğrulama, Gmail düğümü).
- **Doğrulama:** smoke (sahte alıcıda imza, yük, çıkış sınıfı, honeypot, Turnstile reddi, 429), tarayıcı (klavyeyle tamamlama, geri, hata, başarı, azaltılmış hareket), Lighthouse erişilebilirlik. **Gerçek posta kutusuna teslim bu makineden doğrulanamaz;** n8n sizde. Sahte alıcıyla yük ve imza kanıtlanır, gerçek teslim sizin ilk deneme gönderiminizle teyit edilir (kontrol listesi README §10'a eklenir).

**7 dil (Faz 5)**

- **Mimari:** `routing.locales` yedi dil; hangilerinin **yayında** olduğu tek listeden gelir (`i18n/launch.ts`). Üretimde yalnızca `en`, `tr`; geliştirmede ya da `PREVIEW_LOCALES=1` iken hepsi. `hreflang`, sitemap, `og:locale`, dil seçici, JSON-LD bu listeden türer; kapalı dil 404 verir (bugünkü davranış). Bir dili yayına almak tek satırdır.
- **RTL:** `<html dir>` dile bağlanır (`ar` = `rtl`). Tarama sonucu fiziksel yön kullanımı az: 4 TSX satırı (`text-right`, `right-6`, `origin-left`, çerçevesiz honeypot `-left-[9999px]`: RTL'de 9999 px'lik yatay kaydırma doğurur) ve 6 CSS kuralı (`.skip-link`, ok kaydırması `translateX`, dönen ok). Hepsi mantıksal özelliğe çevrilir; yönlü oklar `rtl:` ile aynalanır. Denetim betiğine "fiziksel yön özelliği yok" kuralı eklenir.
- **Yazı tipi:** AR ve JA için ayrı OFL yığını (öneri: IBM Plex Sans Arabic, Noto Sans JP), alt kümeli ve yalnızca o dilde indirilir. DE/FR/ES Latin glif testi `scripts/check-fonts.py`'ye eklenir. `/og` rotası da aynı yazı tiplerini ister, yoksa AR/JA paylaşım kartı kare kutular çıkarır.
- **Sözlükler:** `messages/{de,fr,es,ar,ja}.json`, `en.json` ile aynı anahtarlar (bugün 199, yeni ana sayfa ile artar). Bu oturumda **taslak** olarak yazılır, `check:messages` anahtar, yer tutucu ve etiket eşleşmesini zorlar. Taslak, yerel çeviri değildir; yayın kapısı ADR 0002'deki kontrol listesidir. Hukuk metinleri (gizlilik, künye, rıza) TR/EN dışında EN'e düşer ve uyarı satırı gösterir. Sağlık ve hukuk ifadeleri ülke mevzuatına göre inceleme ister (ör. Almanya'da HWG).
- **Showcase filmi:** bugün en/tr. Diğer beş dil için (a) EN filmi + yerelleştirilmiş başlık (öneri) ya da (b) dil başına yeniden render (`npm run film:render`, AR sağdan sola).
- **SEO:** dil başına `title`, `description`, OG, Twitter; `alternates.languages` = açık diller + `x-default`; sitemap alternates; `og:locale` `de_DE`, `fr_FR`, `es_ES`, `ar_AE`, `ja_JP`.
- **Doğrulama:** `smoke` beklentileri (`/de` yayında değilken 404, `PREVIEW_LOCALES=1` iken 200), her dilde `lang`/`dir`, RTL ekran görüntüleri, Lighthouse (erişilebilirlik, SEO), `check:messages`.

## Sahibinden gereken

Varsayılan: "Öneri" sütununu onaylarsanız hepsini o şekilde uygularım. Tek satırla ("öneriler geçerli") yanıt yeter.

1. **Görsel dil:** tokenlar geçerli kalsın (öneri) ya da Blueprint kazansın. İkincisinde önce CLAUDE.md ve denetim betiği güncellenir ([ADR 0004](0004-motion-and-smooth-scroll.md) seçenek B), sonra uygulanır.
2. **Teklif:** ana sayfadan $2.500 ve Lemon Squeezy kalksın, yerine başvuru bazlı akış gelsin (öneri: evet). Lemon Squeezy kodu silinmez, yalnızca sayfadan çıkar.
3. **Üçüncü sektör kartı:** SaaS yerine kurumsal hukuk ve danışmanlık (öneri: evet).
4. **Briefing yeri:** ayrı rota (öneri) ya da ana sayfada satır içi.
5. **Briefing ekranları:** Blueprint'in 4 ekranı, 4. ekranda karar yetkisi + rıza; "10 bin dolar altı" seçeneği düşük çıkış (öneri: evet).
6. **Sözler:** "24 saat içinde kurucu ekipten kişisel dönüş" gerçekse mi yazılsın? Yüksek çıkış için WhatsApp numarası ve takvim bağlantısı; düşük çıkış için "kaynak" olarak hangi sayfa?
7. **Diller:** yedisi geliştirmede açık, yayında yalnızca TR + EN (öneri) ya da yedisi yayında. Taslak çevirileri kim gözden geçirecek (yerel + hukuk)? AR/JA yazı tipi yığını onayı. Showcase filmi: EN filmi mi, dil başına render mı?
8. **Ölçülmemiş iddialar** (60 FPS kilitli, 100/100, LCP < 1,2 sn, TBT < 50 ms, 120 Hz): yalnızca ölçülmüş değerler, tarih ve profil ile yayınlansın (öneri: evet).
9. **Girdiler:** n8n webhook adresi ve HMAC sırrı; Turnstile site ve gizli anahtarı; WhatsApp, LinkedIn, Instagram adresleri (yoksa footer'dan çıkar); Avrupa € karşılığı (yoksa Avrupa'da fiyat yayınlanmaz).
10. **Numaralandırma:** Faz 4 = ana sayfa + briefing, Faz 5 = 7 dil olarak CLAUDE.md'deki F4–F8 satırları yeniden adlandırılsın mı?

## Sonuçlar

- Onaydan önce hiçbir şey bozulmadı: `faz_3` dalındaki site, denetim (0 hata) ve testler Faz 3 kapısında olduğu gibi duruyor.
- Onaydan sonra iş büyüktür (ana sayfa yeniden kurulumu, briefing, beş dil); her adım ayrı commit ve kapı ile gider, çeviri en sona kalır.
- Blueprint'in yapısı, metin ritmi, 4 adımlı akışı ve yedi dilli cümle tablosu korunur; değişen şey görsel dilin ve iddiaların proje kurallarına uydurulmasıdır.
