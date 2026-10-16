# syncflow.agency

Yüksek bütçeli markalar için dijital mimari stüdyosu sitesi: "Dark Monolith & Fluid Precision" ([Ana Sayfa Blueprint](docs/adr/0006-blueprint-adopted.md)) üzerinde B1/v2 marka sistemi ([ADR 0007](docs/adr/0007-tokens-and-brand.md)): obsidian zemin, platin metin, Inter Display, çizili logo. Üstüne **sinematik katman** ([ADR 0014](docs/adr/0014-cinematic-layer.md)): tek WebGL2 tuvali, kaydırmayla oynayan dört bölümlük film ve sahneli dil geçişi.
**Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind v4 · next-intl (yedi dil yayında: EN, TR, AR, DE, FR, ES, ZH; JA uykuda) · Strategic Briefing (Turnstile + imzalı webhook → n8n → Gmail) · Remotion ile önceden render edilmiş sahne videoları · ham WebGL2 sinema katmanı (yalnızca yetenekli masaüstünde, lazy) · nonce tabanlı CSP (şimdilik report-only)**

| | |
|---|---|
| Diller ve pazarlar | **Yedi sermaye merkezi, yedi dil, yedi pazar** ([ADR 0018](docs/adr/0018-seven-capital-centres.md)): English (`/`, ABD ve küresel, USD), Türkçe (`/tr`, Türkiye, TRY), العربية (`/ar`, Orta Doğu ve Dubai, AED, sağdan sola), Deutsch (`/de`, DACH ve İsviçre, EUR), Français (`/fr`, Monako ve Fransa, EUR), Español (`/es`, küresel servet, USD), 中文 (`/zh`, Basitleştirilmiş Çince, Asya merkezleri, USD). Her ortamda yalnızca `NEXT_PUBLIC_LAUNCHED_LOCALES` (varsayılan `en,tr,ar,de,fr,es,zh`) yayınlanır, geliştirme sunucusu dahil; `ja` **uykuda taslak** (yalnızca `NEXT_PUBLIC_PREVIEW_LOCALES=1` ile okunur). **Beş yeni dilin çevirileri araç yazımıdır; yerel konuşur ve hukuk incelemesinden geçmedi** (sahibi bunu bilerek canlıya aldı). Sitede "yedi dil" ya da "küresel erişim" pazarlama iddiası yoktur |
| Satış akışı | Başvuru bazlı: ana sayfadaki 4 adımlı **Strategic Briefing** → `/api/briefing` → imzalı webhook → n8n → Gmail → `contact@syncflow.agency`. İlk adım nitelik eşiğidir: stüdyo asgari USD 50.000'lik projelere çalışır (Avro bölgesi €45.000, Orta Doğu AED 184.000, Türkiye ₺2.475.000; [ADR 0016](docs/adr/0016-qualification-and-markets.md), [0019](docs/adr/0019-enterprise-tier.md)), altı kabul edilmez. Ödeme ve fiyat listesi yok |
| Bölümler | Hero · Film (kaydırmayla oynayan 4 bölümlük sinema, [ADR 0014](docs/adr/0014-cinematic-layer.md)) · Mimari (6 kart: ön yüzün 3 Border Beam'li kartı, kurumsal katmanın 2 kartı ve Zero-Trust güvenlik akışı kartı; IV ve VI'da iki etkileşimli **model**: kuyruk simülatörü ve gerçek Web Crypto'yla güvenlik akışı, [ADR 0019](docs/adr/0019-enterprise-tier.md), [0020](docs/adr/0020-case-study-layer.md)) · Vitrin (kilitli dört sektör: Lüks Gayrimenkul, Özel Klinik, Kurumsal Hukuk ve Danışmanlık, Lojistik ve B2B tedarik zinciri; 4 "Architectural Specimen" videosu, yani stüdyonun kendi numuneleri, müşteri işi değil; yatay `scroll-snap` şerit; her kart **Architectural breakdown**'a açılır: `/showcase/<sektör>` sayfası ve ana sayfada diyalog, müşteri vakası değil, numunenin incelemesi) · Stüdyo (03: üç ilke ve "How we built it" mühendislik notları) · Briefing · Kapanış ve footer |
| Güvenlik | HSTS, CSP (nonce + strict-dynamic, **report-only**; üçüncü taraf yalnızca Cloudflare Turnstile), XFO, nosniff, Referrer/Permissions-Policy, hız sınırı, zod + DOMPurify, honeypot, sunucuya özel sırlar |

> **Bu proje OneDrive / Masaüstü dışında durmalı.** `node_modules` ve `.next` on binlerce dosya içerir; OneDrive senkronu, Türkçe karakterli/boşluklu yollar ve Windows'un 260 karakter sınırı kurulumu ve Remotion'u bozar. Şu an `C:\Users\YAKUP\syncflow-agency\syncflow-web` altında.

> **Depo düzeni (09.10.2026'dan beri):** uygulama deponun kökünde değil **`syncflow-web/` klasöründedir**; Vercel projesi bu klasörü derler ([ADR 0013](docs/adr/0013-app-moved-into-syncflow-web.md)). Bu belgedeki tüm komutlar `syncflow-web/` içinde çalıştırılır. Eski statik site `legacy-site` dalındadır.

---

## 1. Hızlı başlangıç

Gereksinim: **Node ≥ 20.19** (Node 24 ile test edildi), npm.

```bash
npm install
npm run dev                 # http://localhost:3000  (geliştirme, Turbopack; yalnızca TR ve EN)

npm run build && npm start  # üretim derlemesi + sunucu (önizleme için bunu kullanın; yedi dil yayında)
                            # build = next build; scripts/sf-adapter.mjs (adapterPath) çerçeve betiklerini ilk boyamadan sonraya taşır (ADR 0023); dönüşümsüz derleme: npm run build:eager
```

Ortam değişkenleri `.env.example` içinde açıklıdır. Yerelde hiçbiri zorunlu değildir (Turnstile ve webhook olmadan form geliştirme kipinde "yerel kabul" yanıtı verir ve bunu söyler); `.env.local` oluşturup gerekenleri doldurun (git'e girmez).

| Komut | Ne yapar |
|---|---|
| `npm run check` | Çeviri eşitliği + TypeScript + ESLint |
| `npm run check:messages` | `en` ve `tr` anahtar/yer tutucu/etiket eşitliği; uykudaki taslak diller geride kalabilir (sayılır), fazlalık anahtar ya da bozuk yer tutucu hata (`--strict`: yasal sayfalardaki `[YER TUTUCU]`'lar da hata) |
| `npm run brand:build` / `brand:check` | `brand/*.svg` marka paketinden `lib/brand-paths.ts`, `app/icon.svg`, `app/apple-icon.png`, `public/brand/logo-512.png` üretir; `brand:check` eskimiş dosya varsa hata verir (denetim de çalıştırır) |
| `npm run check:fonts` | Latin yazılı dillerdeki (en tr de fr es) her karakter Inter Display dosyalarında var mı, büyük harfli film sözcükleri Syne'de var mı (Python + `pip install fonttools brotli`; AR, ZH ve JA kasıtlı sistem yazı tipidir, `⌘` açık istisnadır). Dosyaları yeniden üretmek: `python scripts/build-fonts.py InterVariable.woff2` ([ADR 0022](docs/adr/0022-single-text-face-and-mobile-ceiling.md)) |
| `node faz2-denetim.mjs --build` | **Aşama kapısı**: bağımlılıklar, tasarım belirteçleri, i18n, güvenlik, sahne videoları, hareket, doğrulanmamış iddia yasağı, ardından `npm run build` ve ilk yük paket denetimi |
| `npm run smoke` | **Çalışan** sunucuya karşı HTTP güvenlik/işlev kontrolleri (aşağıda). Ortam değişkenleri `scripts/smoke.mjs` başlığında: `EXPECT_LOCALES`, `TURNSTILE_MODE`, `MOCK_WEBHOOK_PORT`, `WEBHOOK_SECRET`, `EXPECT_CSP_MODE` |
| `node scripts/defer-framework.mjs --check` | `.next`'in dönüştürüldüğünü doğrular (dönüşümü `next build` içinde `scripts/sf-adapter.mjs` yapar, Vercel'in kendi adaptöründen önce): belge tek `sf-boot` yükleyicisi ister, React ve Next betikleri ilk boyamadan sonra gelir ([ADR 0023](docs/adr/0023-framework-after-first-paint.md)). `DEFER_FRAMEWORK=off` atlar, `strict` düzen bilinmiyorsa derlemeyi düşürür (varsayılan: uyar ve betikleri belgede bırak) |
| `npm run perf` | Çalışan üretim sunucusuna (ya da iki sunucuya, aralıklı A/B) Lighthouse çalıştırır ve medyanları yazdırır. Yöntem ve sonuçlar [docs/perf/faz4.md](docs/perf/faz4.md) |
| `npm run arch:verify` · `arch:examples` | Kurumsal kanıtın **65 sözleşme testi** (`tests/arch/`, Node'un kendi test koşucusu, bağımlılık yok): yedekli kuyruk (kayıp 0, çift uygulama 0), HMAC-SHA256/AES-256-GCM zarfı, Salesforce/HubSpot/SAP/Oracle örnek eşleyicileri, belgelerin koddan üretilmiş olması. `arch:examples` `docs/architecture/examples/` dosyalarını koddan yeniden yazar ([ADR 0021](docs/adr/0021-production-performance-and-enterprise-proof.md) §5) |
| `npm run qa:browser` · `qa:browser:quick` | **Çalışan** üretim sunucusuna karşı gerçek Chrome (`puppeteer-core`, tarayıcı indirmez): kapı ve bayraklar, çapalar (masaüstü ve telefon), kaydırmada CLS (Arapça dahil), simülatör boyları ve davranışı, entegrasyon modeli, sinema katmanı (worker yolu, ana iş parçacığı yedeği, piksel eşdeğerliği), tipografi (taşma yok, hero iki satır, tek metin yüzü), vaka incelemeleri (kart → diyalog, bağımsız sayfa, Esc ve odak). `--only=<grup>`, `--parity` (görsel eşdeğerlik), `--full` (her dil ve genişlik) |
| `npm run perf:gate` | Mobil profilde (4× CPU, yavaş 4G) belirleyici sayaçlar (DOM, yerleşim, stil, görev, TBT tahmini, CLS) ve bütçe (`scripts/perf-budget.json`); `--baseline=<url>` eski yapıyla araya girerek A/B. **Mutlak bütçeler sessiz makine içindir**; yük altında göreli farka bakın |
| `npm run flags:build` · `flags:check` | Bayrakları (`app/flags.css`, bayrak başına tek boş öğe) üreticiden yeniden yazar / CSS'in üreticiyle aynı olduğunu doğrular (denetim çalıştırır) |
| `npm run audit:secrets` | `build` sonrası: sunucu sırları tarayıcıya giden dosyalara sızmış mı |
| `npm run dev:inbox` | Yerel taklit "gelen kutusu" (`127.0.0.1:4011`): briefing kayıtlarını ekrana yazar ve imzayı doğrular, bkz. [docs/n8n-briefing.md](docs/n8n-briefing.md) |
| `npm run film:render` | Beş sahne videosunu Remotion ile `public/media/clips/` altına render eder (MP4 + WebM + poster), bkz. §6 |
| `npm run remotion:studio` | Sahneleri Remotion Studio'da açar |
| `node scripts/render-posters.mjs` | Filmin yedek posterlerini (`public/film/`, yatay ve dikey) canlı motorun shader'larından render eder; Chrome ve Node ≥ 22.18 ister (başlığa bakın). Shader değişince yeniden çalıştırıp çıkan dosyaları commit'leyin |

---

## 2. Klasör yapısı

```
app/
  [locale]/layout.tsx      <html lang dir>, metadata (hreflang yalnızca yayındaki dillere), CSP nonce, dil kapısı (kapalı dil 404)
  [locale]/page.tsx        ana sayfa: Hero · Film · Architecture · Showcase · Studio · BriefingSection · Closing
  [locale]/showcase/[slug] Mimari İnceleme sayfası (ADR 0020: dört sektör × yedi dil, indekslenir); /showcase bölüme yönlendirir
  [locale]/privacy|imprint yasal sayfa taslakları (noindex; EN/TR dışında İngilizce metin + uyarı)
  api/briefing/route.ts    Strategic Briefing API'si (Node runtime)
  api/breakdown/route.ts   bir incelemenin JSON'u (diyalog okur; sektör ve yayındaki dil beyaz listeli, no-store)
  api/csp-report/route.ts  CSP ihlal raporları alıcısı (204; sunucu günlüğüne rapor başına tek satır JSON)
  og/route.tsx             paylaşım görseli (GET /og?locale=tr; AR ve JA kartları İngilizce metinle)
  globals.css              @font-face, belirteçler (@theme), taban katman, bileşen sınıfları (Border Beam, cam yüzey, briefing ...)
  robots.ts · sitemap.ts · manifest.ts · icon.svg
components/
  layout/    Header · Footer · StickyCta · LanguageSwitcher(client; sahneli dil geçişi)
  cinema/    CinemaStage(client): yetenek kapısından sonra WebGL2 motorunu yükler, CSS yedeğini çizer
  gate/      EntryGate(client): tam ekran pazar ve dil kapısı (sunucuda açık, gerçek bağlantılarla; çerezsiz, ?m=)
  sections/  Hero · Film · Architecture · Showcase + ShowcaseStrip(client) · Studio · BreakdownView (sayfa ve diyalog aynı bileşen) + BreakdownDialog + BreakdownHost(client) · BriefingSection + Briefing(client) · Closing + CopyEmail(client) · LegalPage
  sim/       QueueView · SecurityView · IntegrationView (saf görünüm, sunucuda boşta çizilir) · FailSafeSim · SecurityFlowSim · IntegrationSim (client, tembel parça; kripto ve eşleme `lib/arch/` modüllerini çağırır) · Reserve (boştaki ve canlı sürüm aynı boyda) · LazySims · types
  media/     SceneVideo(client): poster + önceden render edilmiş video, ekran dışında durur
  i18n/      ClientI18n (tarayıcıya giden minik bağlam)    ui/  Logo (B1/v2, çizili SVG), MaskText/MaskLines, SectionHead, Flag (tek boş öğe, resim `app/flags.css`'te)
lib/
  market.ts        pazar (us, eu, me, tr): beyaz listeli ?m= parametresi, önerilen dil, tab belleği   crawlers.ts  kapıyı atlayan arama motoru ve önizleme botları (ADR 0015)
  pricing.ts       asgari tutar ve basamaklar, pazar başına para birimi (USD 50.000 ve kur karşılıkları), Intl biçimi: fiyatın TEK kaynağı (ADR 0016)
  briefing.ts      seçenekler, sınırlar, zod'suz tarayıcı doğrulayıcı, sınıflandırma (tarayıcı + sunucu)
  metrics.ts       sitede yayınlanan TÜM performans sayıları (değer, tarih, profil, kaynak)
  breakdown.ts     inceleme sektörleri ve veri tipi (ADR 0020)   server/breakdown.ts  incelemenin yükleyicisi (dil + sayılar lib/metrics.ts'ten)
  schemas/briefing.ts (zod, strict)    server/ deliver.ts · turnstile.ts · sanitize.ts (server-only)    security/ csp.ts · rate-limit.ts
  enhance/  ui-state (üstbilgi, mobil yapışkan CTA, ekran dışında durdurma) · spotlight · magnetic · rings · reveal (Motion) · smooth-scroll (Lenis) · film (kaydırma → `--p` ve sinema durumu) · hero (kaydırma → `--hp`, amblem derinliği) · mask-frame (medya çerçevesi maskesi, `--mf`)
  cinema/   engine (sayfa tarafı: tuval, olaylar, worker ya da ana iş parçacığı) · core (ham WebGL2 motoru, sayfayı bilmez) · worker (OffscreenCanvas) · protocol · shaders (GLSL) · state · capable (yetenek kapısı)
  arch/     kurumsal kanıtın referans uygulaması (bağımlılıksız): olay şeması ve doğrulayıcı · envelope (HMAC-SHA256, AES-256-GCM) · queue (yedekli kuyruk durum makinesi) · mappers · benzetim   cv.ts  atlanan bölümler için çapa hazırlığı
  motion/   tokens · ease      merge-messages.ts (taslak dillerde eksik metin İngilizceden)    i18n-paths.ts
messages/   en tr ar de fr es zh ja (.json; ja uykuda)
i18n/       routing.ts (altyapıda 7 dil, LOCALE_LABELS: ad, hreflang, og:locale, dir) · launch.ts (hangi diller yayında) · request.ts
proxy.ts    hız sınırı + CSP nonce + dil yönlendirmesi (Next 16'da "middleware" yeni adıyla "proxy")
docs/       adr/ (mimari kararlar 0001–0021) · architecture/ (kurumsal kanıt: şema, yedekli kuyruk, zarf, entegrasyonlar, örnekler; referanstır) · perf/ (ölçümler) · n8n-briefing.md (teslimat akışı)
tests/      arch/ (65 sözleşme testi)
public/     fonts/ Inter Display (Latin + Türkçe) ve Syne alt kümeleri (OFL)   film/ sinema yedek posterleri   media/clips/ render edilmiş sahneler   brand/logo-512.png
brand/      B1 monogram + özel çizim v2 wordmark (SVG, tek renk, eğri) · README.md (kurallar) · tools/outline_wordmark.py
assets/     og-instrument-sans-600.ttf (paylaşım kartı yazı tipi)
remotion/   Render kaynağı, siteye girmez: config.ts, fonts.ts, Root.tsx, scenes/ (Monolith, Estate, Clinic, Law, Logistics, fx: ortak bitiriş)
scripts/    check-messages · check-fonts · build-fonts · build-brand · smoke · audit-secrets · render-film · render-posters · lighthouse · dev-inbox
```

### Tasarım sistemi ("Dark Monolith & Fluid Precision")

Belirteçlerin **tek yeri**: [`app/globals.css`](app/globals.css) içindeki `@theme` bloğu ve `@utility text-*` tipografi ölçeği (Tailwind v4, CSS-first). Kural kaynağı CLAUDE.md "Tasarım tokenları" ve "Tipografi"; Blueprint'ten ayrılınan yerler [ADR 0006](docs/adr/0006-blueprint-adopted.md)'da, palet ve marka kararı [ADR 0007](docs/adr/0007-tokens-and-brand.md)'de.

| Katman | Belirteçler |
|---|---|
| Renk | `obsidian` #0D0D0E (zemin) · `layer-1` #141416 (kart) · `layer-2` #1A1A1E (menü) · `ink` platin #E2E2E6 (15,0:1) · `muted` platin %70 (≥ 6,5:1) · `faint` platin %60 (≥ 5,2:1) · `champagne` #D4C5A9 (yalnızca birincil düğme ve tekil vurgu; obsidian metinle 11,4:1). **Saf siyah ve saf beyaz yok** (denetim FAIL sayar) |
| Çizgi | `hairline` #ffffff1a (cam kenarlık) · `hairline-strong` #ffffff40 (hover) |
| Tipografi | **Tek metin yüzü Inter Display** (OFL, opsz 32, ağırlık 300–500; Latin 26 KB + Türkçe 3 KB): başlıklar 300 ve iz −0,035 em, metin 400, düğme ve gezinti 500 · film bölüm sözcükleri: Syne 700–800, büyük harf (OFL, film yaklaşınca iner) · etiketler tek tarifle sistem mono yığını, 11 px, geniş harf aralığı, büyük harf · `text-hero` `text-headline` `text-title` `text-lead` · hero her dilde 820 px'ten itibaren iki satır · AR, ZH ve JA sistem yazı tipi yığınları, Arapçada harf aralığı sıfır |
| Şekil | kartlar 20 px, panel 28 px, **tüm düğmeler hap (999 px)**: `.btn` 52 px, `.btn-sm` 40 px, birincil şampanya, ikincil cam · gölge yok (ışık içeridedir) |
| Logo | `components/ui/Logo.tsx`: `lockupHorizontal` header'da 28 px (asgari 24), `wordmark` footer'da %6, tek renk platin (`currentColor`), oran bozulmaz, koruma alanı 2u (`brand/README.md`) |
| Hareket | `--ease-lux` cubic-bezier(.16, 1, .3, 1) · maske süresi 1,1 sn, satır gecikmesi 80 ms |

(1) `font-synthesis: none`: sahte kalın/italik üretilmez. (2) Yönlü sınıflar yasaktır (`ml-`, `pr-`, `left-`, `text-right` ...): mantıksal özellikler (`ms-`, `pe-`, `start-`, `text-end`) kullanılır, aksi hâlde Arapça bozulur; denetim bunu hata sayar. (3) `lib/utils.ts` içindeki `cn()` `text-*` boyutlarını tanır; `globals.css`'e yeni bir `@utility text-*` eklerseniz oradaki listeye de ekleyin.

---

## 3. Güvenlik modeli (OWASP odaklı)

**Başlıklar** (`next.config.mjs`, her yanıtta): `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `Cross-Origin-Opener-Policy: same-origin`. `X-Powered-By` kapalı.

**Content-Security-Policy** (`lib/security/csp.ts`, `proxy.ts` her sayfa isteğinde üretir). **Şimdilik `Content-Security-Policy-Report-Only`:** tarayıcı politikayı tam uygular ve her ihlali `/api/csp-report`'a bildirir ama hiçbir şeyi engellemez. Enforce'a geçiş Faz 7'de, `CSP_MODE=enforce` ile (kod değişikliği gerekmez); gerekçe [ADR 0001](docs/adr/0001-csp-report-only.md).
- `script-src 'self' 'nonce-…' 'strict-dynamic' https://challenges.cloudflare.com`: satır içi betikler yalnızca o isteğin nonce'unu taşıyorsa çalışır. Turnstile betiğini briefing'in son adımı kendi nonce'lu kodundan yükler (`strict-dynamic` onu güvenilir sayar; kaynak adı eski tarayıcılar için yedektir). `unsafe-inline`/`unsafe-eval` yok (geliştirme sunucusu hariç).
- **Tek üçüncü taraf Cloudflare Turnstile** (`script-src`, `frame-src`, `connect-src`). Lemon Squeezy ve onun `<style>` hash'i kalktı; `style-src` yalnızca nonce.
- `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'self'`, `report-uri /api/csp-report`. `upgrade-insecure-requests` yalnızca enforce kipinde ve HTTPS'te.
- **Rapor alıcısı:** `204` döner, gövde ≤ 8 KB, en fazla 10 rapor; yalnızca yönerge, engellenen/belge/kaynak adresi (sorgu dizesi ve parça atılır) ve satır/sütun tutulur; IP ve User-Agent tutulmaz.
- **Bedeli:** nonce her istekte değiştiği için sayfalar istek başına render edilir (CDN'de HTML önbelleğe alınamaz); yerel TTFB ≈ 20 ms ([docs/perf/faz4.md](docs/perf/faz4.md)).

**Hız sınırı** (`lib/security/rate-limit.ts`): `/api/*` + `/og` için 30 istek/dk/IP, sayfalar için 240/dk/IP (`proxy.ts`), briefing için ayrıca **5 gönderim/10 dk/IP**. Aşılınca `429` + `Retry-After`. Depolama: `UPSTASH_REDIS_REST_URL/TOKEN` tanımlıysa Redis (IP SHA-256'lanır), yoksa süreç belleği (**üretimde Upstash yoksa ilk istekte bir kez uyarı** yazılır). **Dürüst sınır:** sunucusuz ortamda bellek sayacı örnek başınadır (en iyi çaba); gerçek koruma için Upstash ekleyin, dağıtık saldırıya karşı asıl savunma platformdur (Vercel Firewall / Cloudflare WAF).

**Briefing girdi savunması** (`app/api/briefing/route.ts`): yalnızca POST + JSON, `Origin` host'u ile eşleşmeli (yoksa 403), `Sec-Fetch-Site: cross-site` reddedilir, gövde ≤ 8 KB (hem başlık hem gerçek okuma), **zod `strictObject`** (bilinmeyen alan ve tarayıcıdan gelen `tier` reddedilir), honeypot + 2,5 sn altı "anında gönderim" tuzağı (bota başarı gibi yanıt), **Cloudflare Turnstile sunucuda doğrulanır** (belirteç yoksa ya da geçersizse 400 `verification`; üretimde gizli anahtar yoksa 503), ardından **DOMPurify (jsdom)**:
- HTML-benzeri işaretleme (`<script>`, `<img onerror>`, kapatılmamış `<svg>` …) **açıkça reddedilir** (422 `invalid`); sessizce silinmez.
- `Ad <ad@firma.com>` ve `<https://…>` zararsız biçimleri düz metne çevrilir; kontrol karakterleri ve görünmez/çift yönlü ("Trojan Source") karakterler silinir.
- **Bütçe yalnızca asgari tutarın üstündeki üç basamaktır** (`t1`, `t2`, `t3`; asgari tutarın 1-2×, 2-4×, 4× ve üstü): `budget` değeri `lib/briefing.ts`'in dışında hiçbir şeyi kabul etmez, eski kodlar (`b5`, `b10`, `b20`, `talk`), `under` ve her uydurma değer 422 alır ve teslim edilmez. **Öncelik sınıfı (yüksek/orta) sunucuda hesaplanır:** `t3` ya da `t2` ve karar veren/karar ekibi = yüksek, kalanı orta ("düşük" sınıf kalktı).
- Teslimat: `CONTACT_WEBHOOK_URL` (yalnızca `https://`, loopback hariç), yönlendirme izlenmez (SSRF), isteğe bağlı **HMAC-SHA256** imzası `x-syncflow-signature`; yük `type: "syncflow.briefing"`, her başvuruya rastgele bir **`id`** (UUID v4, ayrıca `Idempotency-Key` başlığı) ve hazır `subject` (`[Briefing][high] Şirket, Ad`). **En çok iki deneme, toplam < 9,5 sn**, yalnızca zaman aşımı/ağ hatası/5xx/408/429'da; iki deneme de aynı `id`'yi taşır, **n8n tekrarı `id`'ye göre ayıklamalıdır** ([docs/n8n-briefing.md](docs/n8n-briefing.md) "Çift kayıt"); iki deneme de başarısızsa `502` ve hazır e-posta taslağı ([ADR 0010](docs/adr/0010-briefing-delivery-and-security.md)).

**`security.txt`** (RFC 9116): `public/.well-known/security.txt`, `Expires` **2027-04-08**; süresi dolarsa denetim ve duman testi kırmızıya döner, yenileyin. **CSP enforce hazırlığı:** aynı derleme `CSP_MODE=enforce` ile gerçek bloklama altında denendi (duman 115/115, gerçek Turnstile widget'ı 12/12 ve üç tarayıcı seti geçti, [docs/perf/faz2b3.md](docs/perf/faz2b3.md)); varsayılan hâlâ report-only, geçiş F7'de ve yalnızca bir ortam değişkeni.

**Sırlar:** `CONTACT_WEBHOOK_*`, `TURNSTILE_SECRET_KEY`, `UPSTASH_*` `NEXT_PUBLIC_` önekli değildir; `lib/server/*` `server-only` ile işaretlidir. **Gmail kimlik bilgisi uygulamada hiçbir yerde yoktur**: e-postayı n8n'deki Gmail düğümü gönderir ([docs/n8n-briefing.md](docs/n8n-briefing.md)). `npm run audit:secrets` derleme çıktısını tarar.

**Bilinçli kararlar / dikkat:** HSTS `preload` jetonu yalnızca *uygunluk* bildirir; `hstspreload.org`'a başvurursanız tüm alt alan adları kalıcı olarak HTTPS olmak zorundadır. Webhook ayarlı değilken üretimde form `503` verir ve ziyaretçiye yanıtlarıyla hazırlanmış bir `mailto:` taslağı sunar: yanıtlar kaybolmaz.

---

## 4. Yerelleştirme (i18n) ve küresel SEO

- **Yedi dil:** `i18n/routing.ts` (`localePrefix: 'as-needed'`): EN `/`, diğerleri `/xx`. Dili **yalnızca URL** belirler: çerez yok, tarayıcı diline göre yönlendirme yok ([ADR 0002](docs/adr/0002-launch-locales-and-market.md)).
- **Hangi diller yayında:** tek kaynak `i18n/launch.ts`. Her ortamda `NEXT_PUBLIC_LAUNCHED_LOCALES` (varsayılan `en,tr,ar,de,fr,es,zh`) dışındaki dil 404 verir (geliştirme sunucusu dahil); uykudaki `ja` yalnızca `NEXT_PUBLIC_PREVIEW_LOCALES=1` ile açılır. `hreflang` (`zh-Hans` dahil), `x-default`, `og:locale` + `alternateLocale`, sitemap, JSON-LD (`inLanguage`), dil seçici, footer'ın dil sütunu ve **giriş kapısındaki yedi kart** yalnızca bu listeden türer (denetim ve duman testi kapalı dilin sızmadığını doğrular). Geri alma: host'ta `NEXT_PUBLIC_LAUNCHED_LOCALES=en,tr` + yeniden derleme (kapıda yalnızca `us` ve `tr` kartı kalır; üretim derlemesiyle sınandı).
- **Çeviriler:** yedi yayın dili eksiksizdir (263 anahtar, hukuk sayfaları dahil; `check:messages` eksiği hata sayar). Uykudaki `ja` İngilizce'den geride kalabilir; eksik anahtar İngilizceden tamamlanır (`lib/merge-messages.ts`) ve hukuk sayfasında bunu söyleyen bir satır çıkar. `ar de fr es zh` çevirileri bu oturumda yazılmış **araç taslağıdır**; yerel konuşur ve avukat onayı yoktur (sağlık ve hukuk ifadeleri ülkeye göre değişir, örn. Almanya'da HWG; Almanya'da *Impressum*, Fransa'da *mentions légales* yükümlülükleri; anakara Çin'de PIPL). Arapça ve Çince sistem yazı tipi yığınlarıyla kurulur (Latin web yazı tipleri bu sayfalarda önyüklenmez).
- **Arapça (RTL):** `<html lang="ar" dir="rtl">`; tüm yerleşim mantıksal özelliklerle aynalanır (üstbilgi, düğme okları, şerit sırası, ilerleme çizgisi, odak ve menü yönü); yönlü oklar `.icon-dir` ile aynalanır; harf aralığı sıfırlanır (bitişik harfler kopmasın); maske payı Arapça ve Japonca için büyütülür; Latin adlar (`syncflow.agency`, e-posta) `dir="ltr"` taşır; çerçevesiz honeypot `start-[-9999px]` ile konur (RTL'de `left:-9999px` 9999 px'lik yatay kaydırma doğururdu).
- **Yazı tipleri:** Latin ve Türkçe Inter Display (OFL, `scripts/build-fonts.py`). Almanca, Fransızca, İspanyolca Latin-1 kapsamında. **Arapça ve Japonca sistem yazı tipi yığınlarıyla** (Segoe UI/Tahoma/Geeza Pro; Yu Gothic/Hiragino/Noto): sıfır bayt maliyeti, ama marka tutarlılığı sistemin yazı tipine bağlıdır. Bu diller yayına alınırken özel bir OFL yığını seçilmelidir (CLAUDE.md). `/og` paylaşım kartı AR ve JA'da İngilizce metinle çizilir (yazı tipinde glif yok); `og:title` ve `og:description` kendi dillerindedir.
- **Para birimi/tarih:** fiyat yayınlanmaz; tarihler `Intl.DateTimeFormat`, sayılar `Intl.NumberFormat` ile sunucuda dilin kuralına göre biçimlenir.
- Çeviriler **sunucuda** yapılır; tarayıcıya yalnızca birkaç düz metin gider (`components/i18n/ClientI18n.tsx`), next-intl'in ICU motoru tarayıcıya gitmez.

---

## 5. Hareket

Hareket bir **katmandır**: içerik sunucuda render edilir ve JS yokken tamamen görünür ([ADR 0004](docs/adr/0004-motion-and-smooth-scroll.md)). Her parça `prefers-reduced-motion`'a saygı duyar; spotlight, manyetik düğme ve Lenis yalnızca `(hover: hover) and (pointer: fine)` iken çalışır.

- **Hero:** iki satır, her biri kendi maskesinden 80 ms arayla yükselir; saf CSS, ilk boyamadan itibaren (`mask-rise`).
- **Ekran altı başlık ve paragraflar:** ekran dışındayken betik gizler, girişte `motion/mini` ile bir kez yükselir (Motion ilk etkileşimde iner).
- **Imleci izleyen ışık** (`lib/enhance/spotlight.ts`): hero'da 600 px, her vitrin kartının içinde 420 px; yalnızca `transform` taşınır (bileşik, yeniden boyama yok).
- **Border Beam:** üç mimari kartın 2 px ışık halkası, 8 sn'de bir döner; yalnızca `rotate` animasyonlanır, ekran dışında durur, azaltılmış harekette gizlidir. En çok 3 (denetim sayar).
- **Manyetik birincil düğme** (`magnetic.ts`), **Lighthouse halkaları** (`rings.ts`, görününce dolar, sayaç sayar; JS yokken doludur), **yumuşak kaydırma** (Lenis, yalnızca masaüstü, ayrı parça; briefing paneli `data-lenis-prevent` taşır: başvuru akışında smooth scroll yok).
- **Ekran dışında durma:** sürekli (`infinite`) animasyon taşıyan öğe `data-pause-offscreen` alır; `IntersectionObserver` durdurur (kural **katman dışı** bir CSS kuralıdır, aksi hâlde bir bileşenin `animation` kısaltması onu ezerdi; tarayıcı testi tam bunu yakaladı). Videolar da ekran dışında durur.
- **Vitrin şeridi** scroll-jacking yapmaz: yerel yatay `scroll-snap`, iki düğme ve klavye ile; tekerlek sayfayı kaydırmaya devam eder.

### Sinematik katman ([ADR 0014](docs/adr/0014-cinematic-layer.md))

Atmosfer katmanıdır; içerik ve erişilebilirlik onsuz da eksiksizdir.

- **Tuval:** `lib/cinema/core.ts` ham WebGL2 ile tek sabit tuval çizer (three.js yok); varsayılan olarak bir **Web Worker'da, `OffscreenCanvas` üzerinde** çalışır (`worker.ts`; context yaratma, shader derlemesi ve çizim ana iş parçacığında değildir, [ADR 0021](docs/adr/0021-production-performance-and-enterprise-proof.md) §2), worker yoksa ya da başlamazsa aynı çekirdek ana iş parçacığında çalışır (`engine.ts`; `?cinema-worker=off` zorlar). Resim iki yolda piksel piksel aynıdır. Dört sahne (kozmik madde, biyo-mekanik omurga, obsidiyen monolit, sıvı metal) kesirli çözünürlükte çizilir; ikinci geçiş renk sapması, bloom, mercek parıltısı, vinyet, 35 mm gren ve dil geçişi glitch'ini ekler ve çıktıyı obsidian–platin aralığına kıstırır (saf siyah ve beyaz üretemez).
- **Yalnızca yetenekli cihazda:** ince işaretçi, azaltılmış hareket yok, veri tasarrufu yok, ≥ 900 px, ≥ 4 iş parçacığı (`lib/cinema/capable.ts`). Motor ayrı lazy parçadır (shader dahil 6,7 KB gzip, 12.10.2026), ilk boyama ve boşta kalma sonrası indirilir; telefonda hiç istenmez. Adrese `?cinema=off` eklemek kapatır, `?cinema-force` kapıyı atlar, `?cinema-debug` test kancasını açar.
- **Film bölümü** (`components/sections/Film.tsx`, `lib/enhance/film.ts`): yüksek bölümde sticky sahne; yerel kaydırma, konum `--p` CSS değişkeniyle bölümlere dönüşür. Motor çalışmayan cihazlarda aynı dört sahne `public/film/` posterleridir (toplam ≈ 93 KB, film 3 ekran yaklaşınca indirilir).
- **Dil geçişi** (`LanguageSwitcher.tsx`): kararma, metin dilimlerinin kayması, yeni dilin karanlıktan gelmesi; azaltılmış harekette düz solma.
- **Kalite bütçesi:** ortam durumunda 30 kare/sn, sekme gizliyken durur, yavaş karede çözünürlük %80'e iner, yetmezse motor kendini kapatır; kapanırsa (ya da hiç başlayamazsa) film posterleri yüklenir.
- **Metin kontrastı:** son geçiş parlaklığı sol (metin) sütunda 0,17 ile sınırlar. Ölçüm ve sınırları [docs/perf/cinema.md §5](docs/perf/cinema.md).

### Giriş kapısı, pazarlar, Hero ve kimlik ([ADR 0015](docs/adr/0015-entry-gate-and-hero.md), [0016](docs/adr/0016-qualification-and-markets.md))

- **Kapı:** adreste geçerli `?m=us|eu|me|tr` yoksa tam ekran bir kapı pazar ve dil sorar; sunucuda açık gelir ve pazar seçenekleri düz `<a href>`'tir, yani JS olmadan da geçilir. Seçim yalnızca adreste durur (`/tr?m=tr`): **çerez, `localStorage` ve `sessionStorage` yok**. Esc ya da "seçmeden devam et" kapatır; arka plan `inert`, kaydırma kilitli, Lenis durur. Arama motoru ve önizleme botları kapıyı görmez ([lib/crawlers.ts](lib/crawlers.ts); Lighthouse bilerek listede yok).
- **Pazar** dilden ayrıdır (ABD, Avrupa, Orta Doğu, Türkiye; dil yalnızca EN ve TR): önerilen dili, **briefing'in para birimini ve asgari tutarını** ([ADR 0016](docs/adr/0016-qualification-and-markets.md)) belirler ve başvuruya `market` etiketi ekler ([docs/n8n-briefing.md](docs/n8n-briefing.md)). Hukuki metin ve vitrin pazara bağlı değildir (açık karar; hukuki sayfalar yer tutuculu).
- **Atmosfer** ([ADR 0017](docs/adr/0017-atmosphere.md)): sinema katmanına platin/şampanya ışık kaskadları, iki katmanlı derinlik ve bokeh eklendi, hareket yaklaşık üçte bir hıza indi; kartlar ve briefing paneli ekrana girerken maske ile açılır. Prosedürel bir atmosferdir, fotogerçekçi görüntü değildir.
- **Hero:** yetenekli masaüstünde 160 svh'lik sabit sahne; kaydırma `--hp` ile amblemi derinleştirir ve metni eritir. Telefonda, JS yokken ve azaltılmış harekette düz tek ekran.
- **Kimlik:** B1 amblem ve wordmark yalnızca platin (şampanya, parlama, gölge, gradyan yok). Kapıda devasa tam platin amblem, hero'da %11–20 platin amblem, ikisinde %6 wordmark.
- **Maske çerçeveleri:** `data-maskframe` taşıyan video çerçeveleri ekrana girerken açılır (`clip-path`); JS yokken ve azaltılmış harekette açıktır.

`lenis` ve `motion` yalnızca `import()` ile kullanılabilir; `faz2-denetim.mjs` statik import'u hata sayar ve `--build` sonrası rotanın ilk yük parçalarında ikisinin de olmadığını doğrular.

---

## 6. Remotion ve sahne videoları

Sitede **Remotion çalışma zamanı yok**: videolar önceden render edilmiş dosyalardır ([ADR 0003](docs/adr/0003-showcase-film-static-render.md)). `remotion` yalnızca geliştirme bağımlılığıdır; `remotion/scenes/` altındaki sahneleri `scripts/render-film.mjs` ile render etmek içindir.

- **Sahneler** (1280×720 tuvalde çizilir, 30 kare/sn, 8 sn kusursuz döngü, her biri tamamen kareden hesaplanır; dört sektör sahnesi `--scale=1.5` ile **1920×1080** işlenir, monolit 1280×720 kalır, [ADR 0020](docs/adr/0020-case-study-layer.md)): `Monolith` (yavaşça dönen cam monolit; "mimari" kartı), `Estate` (gün batımında cam cepheli villa), `Clinic` (soluk klinik koridoru), `Law` (tek ışıklı kapıya doğru uzanan karanlık sütunlu koridor; hukuk kartı), `Logistics` (yüksek açıdan yük koridoru: paralel şeritler, kapılar, akan koliler; bir kapı sessizleşince şampanya ışıklı yedek şerit devralır; lojistik kartı). **Konsept render'dır**, gerçek müşteri işi değildir; kartlarda öyle yazar. Sahnelerde okunabilir metin yoktur: altyazı HTML'dir, tek render her dile yeter.
- **Çıktı:** `public/media/clips/<ad>.{mp4,webm,webp}`: H.264 MP4 (tercih edilen), VP9 WebM (yedek) ve WebP poster. Toplam 15 dosya, yaklaşık 5,8 MB (sektör klipleri 0,4–1,1 MB, posterler 14–40 KB).
- **Oynatma** (`components/media/SceneVideo.tsx`): Poster, kartın içindeki **tembel `<img>`**'dir (`<video poster>` değil: poster sayfa yüklenirken iner, 1080p posterler ilk yüke binerdi); video `preload="none"`. Ince işaretçide, görünürken (mimari kartı) ya da kartın üstüne gelince/odaklanınca (vitrin) oynar; **dokunmatikte, azaltılmış hareket ve Save-Data'da otomatik oynamaz** ve hiçbir şey indirilmez; ziyaretçi düğmeye basınca yüklenir. Ekran dışına çıkınca ve sekme gizlenince durur. Her videoda görünür bir oynat/duraklat düğmesi vardır (WCAG 2.2.2). Çerçeve oranı sabittir (CLS 0).
- **Lisans:** Remotion yalnızca ≤ 3 kişilik kâr amaçlı şirketlerde/bireylerde ücretsizdir; **4+ kişilik şirketler için ücretli Company License gerekir** (remotion.pro). Render almak da lisans kapsamındadır.

```bash
npm run film:render                       # beş sahne × (MP4 + WebM + poster), ~10 dk
npm run film:render -- --posters          # yalnızca posterler (hızlı)
npm run film:render -- --only=estate      # tek sahne
npm run film:render -- --formats=mp4       # yalnızca bazı biçimler (boyutu hızlı görmek için)
npm run remotion:studio                   # sahneleri tarayıcıda düzenle
```
Sahne değişince komutu çalıştırıp çıkan dosyaları commit'leyin. Remotion CLI her seferinde `npx` ile, kurulu `remotion` sürümüyle getirilir (projeye eklenmez); "zod sürüm uyuşmazlığı" uyarısı zararsızdır.

---

## 7. Strategic Briefing ve e-posta teslimatı

Ana sayfada, ziyaretçiyi 4 ekrandan geçiren cam bir panel (`#briefing`): (1) **yatırım**, yalnızca pazarın para biriminde üç basamak (ABD'de $50.000–$100.000, $100.000–$250.000, $250.000 +; **daha düşük bir seçenek yok**, soru asgari tutarı söyler; tutarlar `lib/pricing.ts`'ten gelir), (2) proje türü, (3) zamanlama, (4) iletişim (ad soyad, şirket ve unvan, iş e-postası, tek cümle proje, karar yetkisi, **işaretsiz** rıza kutusu). Ekran başına tek soru, klavye ile tamamlanır (Boşluk seçer, Enter devam eder), her adımda odak yeni başlığa taşınır, ilerleme çizgisi 4 parçadır, geçiş `clip-path` açılmasıdır. Tarayıcıda hiçbir şey saklanmaz (çerez ve depolama yok).

- **Başarı ekranı:** Blueprint metni ("24 saat içinde kurucu ekibimiz size kişisel olarak yazacak"). **Bu söz yalnızca gerçekse yayınlanmalıdır** (CLAUDE.md kapasite kuralı); sahibi korunmasını istedi.
- **Teslimat:** form → `/api/briefing` (Turnstile + zod + DOMPurify + hız sınırı) → imzalı webhook → n8n → Gmail → `contact@syncflow.agency`. n8n akışının adımları, HMAC doğrulama kodu ve deneme komutları: [docs/n8n-briefing.md](docs/n8n-briefing.md).
- **Doğrulanabilen / doğrulanamayan:** sahte alıcıyla yük, imza, sınıflandırma ve zararlı girdi reddi duman testinde doğrulandı. **Gerçek posta kutusuna teslim bu makinede doğrulanamadı:** n8n adresi, imza sırrı ve Turnstile anahtarları verilmedi. Hepsi tanımlanınca `docs/n8n-briefing.md` §5'teki ilk deneme listesi uygulanır.
- **Yedek yol:** webhook yoksa ya da hata verirse form yanıtlarla doldurulmuş bir `mailto:` taslağı önerir. Geliştirme kipinde webhook yoksa form kabul eder ama başarı ekranı "e-posta gönderilmedi" notunu da gösterir.
- **JavaScript yokken:** panel çalışamaz; `<noscript>` e-posta adresini önerir.

---

## 8. Performans ve yayınlanan sayılar

Sitede yayınlanan her performans sayısı **`lib/metrics.ts`** içinde durur (değer, tarih, profil, kaynak); ölçülmeyen "ölçülecek" yazar (şu an tüm Lighthouse kayıtları 14.10.2026'da canlı sitede ölçülmüştür, kare süreleri 08.10.2026'dan); `faz2-denetim.mjs` her kaydın tarih, profil ve kaynak taşıdığını ve metinlerde doğrulanmamış iddia bulunmadığını denetler (kilitli 60 FPS, 120 Hz, LCP/TBT/INP eşikleri, AV1, örnek yüzdeler, önce-sonra yok).

Ayrıntı, yöntem ve ham koşular: [docs/perf/faz4.md](docs/perf/faz4.md) (Blueprint ana sayfası, 08.10.2026), [docs/perf/faz3.md](docs/perf/faz3.md) (Lenis ve maskeli girişler) ve [docs/perf/faz2-baseline.md](docs/perf/faz2-baseline.md). Profil: medyan, üretim derlemesi (`next start`), Lighthouse 13.5, mobil (simüle yavaş 4G, 4× CPU yavaşlatma) ve masaüstü.

| Sayfa | Performans (aralık) | FCP | LCP | TBT (aralık) | CLS | İlk yükleme JS (gzip) |
|---|---|---|---|---|---|---|
| Mobil EN `/` (n = 7) | **93** (90–95) | 1,0 sn | 2,9 sn | 152 ms (58–223) | 0 | 156 KB |
| Mobil TR `/tr` (n = 7) | **90** (89–92) | 1,0 sn | 3,1 sn | 226 ms (177–259) | 0 | 156 KB |
| Masaüstü EN `/` (n = 3) | **100** (100–100) | 0,3 sn | 0,65 sn | 0 ms | 0 | 162 KB |

Erişilebilirlik, en iyi uygulamalar ve SEO **her koşuda 100** (mobil ve masaüstü, EN ve TR). Bu, ilk ölçümde 97 çıkan erişilebilirliğin iki düzeltmeden sonraki hâlidir: %40 beyaz metin %50 yapıldı (3,65:1 → 5,3:1) ve %6 opaklıklı devasa footer wordmark'ı metin düğümü olmaktan çıkarıldı (bkz. faz4.md §1).

Kare ritmi (sayfa tamamen kaydırılırken, masaüstü, başsız Chrome, 60 Hz): medyan 16,7 ms, p95 16,8 ms, p99 16,9 ms, en uzun 17,0 ms; 4× CPU yavaşlatmada p99 16,9 ms, en uzun 33,1 ms. Bu ana iş parçacığının kare ritmidir; 120 Hz ölçülmedi; "kilitli 60 FPS" ifadesi bu yüzden yayınlanmaz.

> **Yerel ölçümün sınırı:** `next start` HTTP/1.1 + gzip sunar; Vercel gibi bir ortamda HTTP/2 + Brotli olur. Canlı adreste PageSpeed Insights ile doğrulayın. Mobil LCP CLAUDE.md hedefinin (≤ 2,5 sn) **üstündedir**; bu bir sonraki kapıdır.

---

## 9. Dağıtım

- **Vercel:** Hobby planı yalnızca **ticari olmayan** kullanıma açıktır; ticari site için **Pro** gerekir. Çalışma zamanı Node 22/24. Ortam değişkenleri: `NEXT_PUBLIC_SITE_URL=https://syncflow.agency`, `NEXT_PUBLIC_LAUNCHED_LOCALES`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `CONTACT_WEBHOOK_URL`, `CONTACT_WEBHOOK_SECRET`, `UPSTASH_REDIS_REST_URL/TOKEN`, isteğe bağlı `NEXT_PUBLIC_LINKEDIN_URL`, `NEXT_PUBLIC_INSTAGRAM_URL`, `NEXT_PUBLIC_WHATSAPP_URL` (`.env.example`). `NEXT_PUBLIC_*` derleme anında içeri gömülür: değiştirince yeniden derleyin. **Yayın tek projeyle yapılır: Vercel projesi `syncflow-web` (Root Directory `syncflow-web`, Production Branch `main`) `main`'e her push'ta bu klasörü derler; `syncflow-web/vercel.json` projenin eski statik site ayarlarını geçersiz kılar. Geri dönüş ve kontroller: [docs/vercel-next-site.md](docs/vercel-next-site.md), karar: [ADR 0013](docs/adr/0013-app-moved-into-syncflow-web.md), 08.10 kesintisinin kaydı: [ADR 0012](docs/adr/0012-vercel-deployment.md). Bu klasörü silmeyin ya da taşımayın.**
- Vercel *Preview* dağıtımlarında Vercel'in kendi araç çubuğu betiği CSP'ye takılır (konsolda hata); üretimi etkilemez.
- Cloudflare Pages/Workers için OpenNext adaptörü gerekir (denenmedi).
- `NEXT_PUBLIC_SITE_URL` canonical/hreflang/OG/sitemap'i belirler. **Yanlışsa SEO bozulur**; yerel Lighthouse için `NEXT_PUBLIC_SITE_URL=http://localhost:3100` ile derleyin (yoksa canonical canlı alan adını gösterir ve SEO 92'ye düşer).

---

## 10. Yayın öncesi kontrol listesi

- [ ] **n8n akışını kurun ve ilk gerçek denemeyi yapın** ([docs/n8n-briefing.md](docs/n8n-briefing.md) §5): `contact@syncflow.agency`'e e-posta düşüyor mu, yanlış imza reddediliyor mu.
- [ ] **Turnstile anahtarlarını** (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`) Cloudflare'de oluşturup tanımlayın; üretimde gizli anahtar olmadan form 503 verir.
- [ ] **Yasal sayfalar** (yapı hazır, [ADR 0011](docs/adr/0011-legal-pages-structure.md); içerik yer tutuculu taslak): `messages/en.json` ve `tr.json` → `Legal.*` içindeki `[KÖŞELİ PARANTEZ]` alanlarını (şirket unvanı, adres, hukuki tür, telefon, sicil ve vergi no, sorumlu kişi, teslim hizmeti, aktarım güvenceleri, saklama süresi, **başvuru kanalları, denetim makamı**) doldurun, avukata inceletin; "p8/p9" bölümlerindeki işletme iddialarının ("her talebi bir kişi okur", "otomatik yanıt ya da ret yok") doğru olduğunu teyit edin; `npm run check:messages -- --strict` hata vermeyene kadar. "Taslak" uyarısı (`Legal.draft`) yayından önce kaldırılmalı.
- [ ] **"24 saat içinde kişisel dönüş" sözünün gerçek olduğunu** teyit edin (kapasite cümlesi kuralı).
- [ ] **Beş yeni dilin (`ar de fr es zh`) yerel konuşur çeviri incelemesi ve hukuk incelemesi** (sağlık reklamı kuralları, KVKK/GDPR/PDPL/PIPL muadilleri); `ja` açılacaksa aynısı. Arapça için özel OFL yazı tipi yığınını seçin ve `check:fonts` kapsamını genişletin. İsviçre'nin EUR ile gösterilmesi (CHF?) ve anakara Çin'den erişim ([ADR 0018](docs/adr/0018-seven-capital-centres.md) "Riskler") sahibince karara bağlanmalı.
- [ ] **LinkedIn / Instagram / WhatsApp adresleri** verilirse ilgili `NEXT_PUBLIC_*` değişkenlerini tanımlayın (verilmedi, footer'da yok). Logo çizili B1/v2 paketidir ama **ad/marka sorgusu (Türkpatent ve uluslararası) bitmeden nihai değildir** (`brand/README.md`).
- [ ] **Sahne videolarının "konsept render" olduğu** kartlarda yazıyor; gerçek vaka çalışmaları gelirse kartlar ve etiket güncellenir.
- [ ] `NEXT_PUBLIC_SITE_URL` üretim alan adı. Search Console'a `sitemap.xml`. PageSpeed Insights ile canlı doğrulama, `lib/metrics.ts` güncelleme.
- [ ] `public/.well-known/security.txt` `Expires` tarihini (2027-04-08) dolmadan yenileyin.
- [ ] Remotion lisansı (4+ kişiyseniz).
- [ ] **Giriş kapısı ve Hero** ([ADR 0015](docs/adr/0015-entry-gate-and-hero.md)): (a, b) bot baypası ve `market` teslimi yerelde `npm run smoke` ile doğrulandı (139/139); canlıda da doğrulandı (12.10.2026 dağıtımı: `npm run live` 24 geçti; Googlebot, Bingbot ve facebookexternalhit kapıyı HTML'de görmüyor), (c) Lighthouse'ı kapıyla yeniden ölçün, (d) pazarın başka neyi şekillendireceğine karar verin, (e) metrikler 14.10.2026'da canlı sitede ölçülüp mühürlendi (`lib/metrics.ts`, [docs/perf/live-2026-10-14.md](docs/perf/live-2026-10-14.md): masaüstü performans 95, koşular 84–100; TBT 177 ms); her görsel değişiklikten sonra yeniden ölçün, (f) kapının klavye akışını ve ekran okuyucuyu elle deneyin.
- [ ] **Sinema katmanı** ([ADR 0014](docs/adr/0014-cinematic-layer.md)): (a) masaüstünde motor açıkken Lighthouse 89–96 / TBT ≈ 193 ms (kapalıyken 100 / 0) giderilsin ya da kabul edilsin, önce gerçek GPU'lu (başlıklı) Chrome'da ölçülsün; (b) motor çekilince film posterleri yüklenir (giderildi 12.10.2026); (c) küçük etiketlerin sahne üstündeki kontrastı ölçülsün (büyük metin ve paragraflar ölçüldü); (d) **Cabinet Grotesk** web yayın izni sahibince doğrulansın (Vercel derlemesinde `fonts:fetch` çalıştı, dosya canlıda HTTP 200 veriyor); (e) `?cinema-debug` kancası üretimde kalacak mı karar verilsin; (f) commit edildi ve canlıda (`7cf5b50`, 12.10.2026).
- [ ] `npm run check`, `node faz2-denetim.mjs --build`, `npm start`, `npm run smoke`, `npm run audit:secrets`.

---

## 11. Doğrulama sonuçları

Hepsi üretim derlemesi üzerinde, Windows 11, Node 24.12, Chrome 154 ile alındı. Aşama sonuçları:

### React ve Next ilk boyamadan sonra: mobil 96 → 99–100 (17.10.2026, yerel; canlı sonuç aşağıda eklenir)

Karar ve ölçümler: [ADR 0023](docs/adr/0023-framework-after-first-paint.md). `scripts/sf-adapter.mjs` (Next `adapterPath`), `next build` içinde ve Vercel'in kendi adaptörü dosya özetlerini çıkarmadan önce `scripts/defer-framework.mjs`'i çalıştırır; Next'in koduna dokunmadan yalnızca manifestleri düzenler (derleme SONRASI bir betik Vercel'de işe yaramazdı: ilk canlı deneme bu yüzden düştü, ADR 0023 §4): belge tek bir 1 KB'lık yükleyici ister, çerçeve betikleri ilk contentful paint'ten sonra (ya da ilk girdide) gelir. Bu, ADR 0022'de "bu mimaride sağlanamaz" yazan mobil tavanı aşar: tavan çerçevenin ilk boyamadan önce yüklenmesindendi, mimarinin kendisinden değil.

| Denetim | Sonuç |
|---|---|
| Mobil Lighthouse `/` (yerel, 12 koşu) | önce **96** → şimdi **100 ×6, 99 ×5, 98 ×1**; LCP 2.755 → **1.51–1.59 sn**; TBT 28–159 ms (React DOM değerlendirmesi artık TBT penceresine girer) |
| Masaüstü Lighthouse `/` (6 koşu) | **100 ×6**, TBT 0, LCP ≈ 0,38 sn (önce ≈ 0,60 sn) |
| Ödünleşim (yavaş 4G, 4× CPU, 3 koşu medyan) | ilk boyama **1,13 sn** (önce 1,64) · etkileşime hazır **2,63 sn** (önce 2,07) |
| `qa:browser --parity` (yeni `framework` grubu dahil) · `smoke` · `faz2-denetim.mjs --build` | **124/124** · **184/184** · **207 geçti, 0 hata** |

### Tek metin yüzü, medya etkileri ve mobil ölçüm tavanı (16.10.2026, dal `perf/luxury-type-mobile`, yerel)

Karar ve tüm ölçümler: [ADR 0022](docs/adr/0022-single-text-face-and-mobile-ceiling.md). Sonradan canlıya alındı ([docs/perf/live-2026-10-16.md](docs/perf/live-2026-10-16.md)); mobil tavan yargısı ADR 0023 ile aşıldı. Yazıldığı günkü hâli: **Mobil 100/100 ve LCP < 0,8 sn sağlanmadı ve bu mimaride sağlanamaz:** simüle LCP, gözlenen LCP'den önce biten her isteğin bayt toplamıdır (HTML 43 KB + CSS + yazı tipi + 165 KB JS; React ve Next çalışma zamanı tek başına 116 KB), FCP bile ≈ 0,91 sn'dir. En iyi ölçülen yerel mobil 96 (sakin makine, LCP ≈ 2,75 sn); ilk boyamadan sonraya çerçeve ertelemek ayrı bir mimari karardır ve sahibe sorulur.

| Denetim | Sonuç |
|---|---|
| Yazı tipi | Instrument Sans, Instrument Serif ve Cabinet Grotesk yerine **tek yüz Inter Display** (OFL, 300–500): ilk görünümdeki yazı tipi baytı **71,3 KB → 26,4 KB (−%63)**; Cabinet'in lisans sorusu kapandı, derleme ağdan yazı tipi çekmez |
| `npm run check` · `check:fonts` · `arch:verify` · `smoke` | temiz (503 anahtar × 7 dil) · temiz · **65/65** · **181/181** (`www` yönlendirmesi dahil) |
| `npm run qa:browser --parity` (yeni `type` ve `casestudy` grupları dahil) | **119/119** (makine boşta); tam koşuların ikisinde Arapça masaüstü kaydırma CLS'i 0,083 verdi (yüklü makine), boşta 14 koşunun hepsinde 0,00: aralıklı, garanti edilemez (ADR 0022 §8) |
| Mobil Lighthouse `/` (sakin makine, n=5, `ef72636` ile araya girerek) | eski **94** → yeni **96**; LCP 3.070 → **2.755 ms**; indirilen 387 → **334 KB**; TBT ≈ 28 ms (iki yapıda eşit) |
| Mobil Lighthouse `/` (yüklü makine, n=5) | eski 92 → yeni **94**; LCP 3.139 → **2.841 ms**; TBT 91 → 145 ms (yük gürültüsü, ayrıştırılmadı) |
| Temiz `main` build'i, son ölçüm (n=5) | mobil eski 91 → yeni **92** (LCP 3.147 → **2.843 ms**, makine %14–30 yükte); masaüstü eski 100 ×5 → yeni **100 ×5** (LCP 730 → **606 ms**) |
| Masaüstü Lighthouse `/` (iki set) | sakin n=5: eski 95 → yeni **98** (94–100); yüklü n=6: eski 99 → yeni **100** (altısı da), LCP 752 → **624 ms** |
| `perf:gate` | **yeşil değil**: mutlak bütçeler sessiz makine için, bu makinede taban dahil aşıldı; bütçeler gevşetilmedi. Göreli: betik −%34, görev −%9, TBT tahmini −%30 |

### Üretim performansı ve kurumsal kanıt (16.10.2026, dal `perf/enterprise-proof`, yerel)

Karar: [ADR 0021](docs/adr/0021-production-performance-and-enterprise-proof.md); ölçüm: [docs/perf/local-2026-10-16-production-optimization.md](docs/perf/local-2026-10-16-production-optimization.md). **Yerel `main`'e birleştirildi, push edilmedi, canlıya alınmadı.** **"Lighthouse 100/100" bir vaat değil, ölçülmüş sonuçtur:** aşağıdaki sayılar yerel, tek makine, başsız Chrome 155 ve eski yapıyla araya girerek alındı; `lib/metrics.ts` mührü değişmedi, canlı ölçüm birleştirme ve yayından sonra yapılır.

| Denetim | Sonuç |
|---|---|
| `npm run check` | `check:messages` (yedi yayın dilinde **503 anahtar**), `tsc` ve ESLint temiz |
| `node faz2-denetim.mjs --build` | **212 geçti, 0 hata**, 1 eski uyarı (`generateStaticParams`). Yeni bölüm 12 (atlama, bayraklar, yerleşim, kurumsal kanıt, QA araçları) ve sinema worker kontrolleri |
| `npm run arch:verify` | **65 test** geçti (kuyruk senaryolarında kayıp 0, çift uygulama 0, sıra korunur; RFC 4231 vektörü; belgeler kodla aynı) |
| `npm run smoke` | **180/180** (üretim derlemesi, sahte webhook alıcısı) |
| `npm run qa:browser` | **80/80** (kapı, çapalar, derin bağlantı, CLS en/ar/de, simülatörler, entegrasyon, sinema) ve `--only=parity` **5/5** (içerik görünürlüğü açıkken ve kapalıyken sayfalar piksel eşit) |
| Lighthouse masaüstü `/` (n=6, araya girerek) | eski **98** (96–99), TBT 110 ms → yeni **100** (99–100), TBT **0 ms**; erişilebilirlik, en iyi uygulamalar, SEO 100 |
| Lighthouse mobil `/` (n=5, araya girerek) | eski **81** (80–86), TBT 526 ms → yeni **92** (86–93), TBT 149 ms; **LCP ≈3,1 sn her iki yapıda** (çerçeve ve yazı tipi baytları, tavan) |
| Ana iş parçacığında WebGL (masaüstü, 3 yükleme) | eski `getContext` 44–118 ms + shader sorguları 98–237 ms → yeni **0 ms** |
| DOM düğümü (mobil) | 1.035 → **986** |

Sınırlar: makine ölçüm sırasında ≈%40 başka yük altındaydı (kullanıcının kendi uygulamaları), Chrome ölçümler arasında 154'ten 155'e güncellendi; gerçek GPU, Safari, Firefox ve canlı ortam **ölçülmedi**; `perf:gate`'in mutlak bütçeleri bu yük altında aşıldı (iki yapı da), göreli fark korunuyor. Mobil 100/100 bu mimaride bu ölçümle mümkün görünmüyor (LCP ≈3,1 sn).

### Vaka incelemesi katmanı, Stüdyo, simülatörler, bayraklar, 1080p klipler (15.10.2026, dal `feat/case-studies`, yerel)

Karar: [ADR 0020](docs/adr/0020-case-study-layer.md); ölçüm: [docs/perf/local-2026-10-15-case-studies.md](docs/perf/local-2026-10-15-case-studies.md). **Canlıya alınmadı**: canlı doğrulama, canlı Lighthouse ölçümü ve `lib/metrics.ts` mührü push'tan sonra yapılır.

| Denetim | Sonuç |
|---|---|
| `npm run check` | `check:messages` (yedi yayın dilinde **491 anahtar**, uyarı yok), `tsc` ve ESLint temiz |
| `node faz2-denetim.mjs --build` | **188 geçti, 0 hata**, 1 eski uyarı (`generateStaticParams`). Yeni bölüm 11: dört sektör × 14 metin × yedi dil, dört başlık sırası, rakam ve yüzde yokluğu, yasak iddialar (zero latency, fotogerçekçi, SLA, sertifika), toleransların koddaki sabitlerle eşleşmesi, gerçek Web Crypto, simülatör ve diyalog kodunun ilk yükte olmaması, bayrak emojisi yokluğu, klip çözünürlüğü (MP4/WebP başlıklarından 1920×1080) |
| `npm run smoke` | **213/213** (üretim derlemesi, sahte webhook alıcısı): 28 inceleme sayfası ve API'si, site haritası 35 adres, bilinmeyen sektör/kapalı dil 404, ana sayfada Stüdyo ve simülatörler, SVG bayraklar, tembel klip görüntüleri, yayınlanan sayıların sayfada görünmesi |
| `npm run live` (yerel kopyada, DNS/TLS hariç) | 37 geçti, 0 hata: yeni bloklar 28 sayfa, API, 1080p klip boyutları |
| Tarayıcı akışı (Chrome 154, 1440×900 ve 390×844; betik depoda yok) | önceki akış **23/23**; yeni akış **42/42**: kapıda ve menüde 7 bayrak, Stüdyo, **simülatörler gerçek Web Crypto ile** (imza `sha256=…`, tek karakter değişince ret, aynı ileti mükerrer), kuyrukta tıkama → bekleme → sırayla boşalma, **CLS 0,00**, kartın çerçevesine tıklayınca diyalog, adres değişimi, Esc ve Geri kapatır, odak döner, diyalogdaki çağrı Briefing'e kaydırır, Arapça sağdan sola, Çince, telefonda yatay kaydırma yok |
| Lighthouse (yerel, ana dal ile aralıklı A/B) | masaüstü **92 / 92**, mobil **83–86 / 85–91** (gürültü içinde; aynı derlemenin TBT'si 55–669 ms arasında oynadı), LCP yeni derlemede ~250–300 ms **daha iyi**, CLS 0, JS +3 KB (174 / 171). Ayrıntı ve sınırlar perf belgesinde; **canlı ölçüm yapılmadı** |

### Sinematik katman, giriş kapısı ve Hero (12.10.2026, `7cf5b50`, canlıda)

Ayrıntı: [docs/perf/cinema.md](docs/perf/cinema.md), karar: [ADR 0014](docs/adr/0014-cinematic-layer.md). Üretim derlemesi, Windows 11, Node 24.12, başsız Chrome 154, Lighthouse 13.5.

| Denetim | Sonuç |
|---|---|
| `npm run check` | çeviri eşitliği (7 dil), `tsc` ve ESLint temiz |
| `node faz2-denetim.mjs --build` | **0 hata**, 130 geçti, 1 bilinçli uyarı. WebGL motoru ilk yükte değil, ayrı lazy parça (6,7 KB gzip). İlk koşuda çıkan 2 hata denetimin eski yerlere bakmasındandı (kod değil) ve denetim düzeltildi |
| `npm run smoke` | **195/195** (üretim derlemesi, yedi dil `en,tr,ar,de,fr,es,zh`, sahte webhook alıcısı; yedi kartlı kapı ve bağlantıları, her dilin kapısı ve briefing'in kendi sayı biçimiyle asgari tutarı, `/ar` sağdan sola, `/zh` `zh-Hans`, bot baypası, çerezsizlik, başvuruda yedi `market` değeri, dört vitrin kartı, iki kurumsal sütun, USD 50.000 tabanı ve yeni basamaklar dahil). Tarayıcı akışı (Chrome 154, başsız, 1440×900 ve 390×844; betik depoda yok): **23/23** (kart → dil çipi → Giriş, Esc, üst bar seçicisi ve `?m=` korunumu; dördüncü kartta gerçek klip oynatma) |
| Lighthouse mobil (motor kapıyı geçmez) | `/` **94** (LCP 3,15 sn, TBT 55 ms), `/tr` **86** (76–90; LCP 3,27 sn, TBT 336 ms); JS 157 KB |
| Lighthouse masaüstü, A/B | motor kapalı **100** (TBT 0–2 ms), motor açık **89–96** (TBT 135–236 ms); LCP ≈ 0,7 sn ve CLS 0 aynı; JS 171 KB |

**Canlı doğrulama (12.10.2026, dağıtımdan sonra, kullanıcı aracısı taklidiyle):** `npm run live` 24 geçti, 0 hata, 1 bilinen uyarı (`www` kaydı yok). Googlebot, Bingbot, facebookexternalhit ve Googlebot `/tr` kapıyı HTML'de görmüyor (içerik aynı); varsayılan ziyaretçi ve Lighthouse kullanıcı aracısı görüyor; `?m=` ile kapı yok; hiçbir yanıtta çerez yok; `fonts/cabinet-grotesk-500.woff2` HTTP 200 (Vercel derlemesinde `fonts:fetch` çalıştı).

**Doğrulanmayanlar:** gerçek GPU'lu masaüstü (Lighthouse ve kare ritmi), küçük etiketlerin sahne üstünde kontrastı, motorun kendini kapatma davranışı, Lighthouse'ın kapıyla ölçümü, `/#briefing` çapa atlaması, canlı sitenin tarayıcıda gözle kontrolü, gerçek Googlebot, Safari/Firefox, gerçek telefon, ekran okuyucu.

### Faz 4 ve 5 (08.10.2026, `faz_4` ve `faz_5` dalları)

| Denetim | Sonuç |
|---|---|
| `node faz2-denetim.mjs --build` | **0 hata**: 78 geçti, 1 uyarı, 3 bilgi. Uyarı `generateStaticParams` yok: nonce'lu CSP sayfaları zaten istek başına render ettiği için bilinçli ([ADR 0001](docs/adr/0001-csp-report-only.md)). `npm run build` başarılı. Yeni kapılar: Blueprint belirteçleri, yedi dil + yayın listesi, taslak dil anahtarları, Lemon Squeezy izi yok, briefing savunmaları, doğrulanmamış iddia yasağı, `lib/metrics.ts` kaynak kaydı, sahne videoları, Border Beam ve ışık kuralları |
| `npm run check` | Çeviri eşitliği (7 dil: `en`/`tr` 253 anahtar, beş taslak dil `Legal.*` hariç 222) · `tsc` 0 hata · ESLint 0 hata, 0 uyarı |
| `npm run smoke` | **107/107** üretim derlemesinde (`en,tr` yayında; sahte webhook alıcısı, Cloudflare'in her zaman geçen Turnstile test anahtarıyla gerçek `siteverify` çağrısı) ve **91/91** geliştirme sunucusunda (yedi dil, webhook yok): güvenlik başlıkları, report-only CSP + nonce, Turnstile tek üçüncü taraf, hreflang/sitemap/JSON-LD yalnızca yayındaki diller, kapalı dil 404, Arapça `dir="rtl"`, briefing API savunmaları, işaretleme saldırılarının reddi, tam yük ve HMAC imzası, altı öncelik sınıfı, 12 sahne dosyası, CSP rapor alıcısı, hız sınırı |
| Tarayıcı testi (Chrome 154, `puppeteer-core`; betik depoda yok) | **60/60**: Blueprint bölümleri, imleç ışığı, manyetik düğme, Border Beam ve ekran dışında durma, halkalar, video politikası, yatay şerit (scroll-jacking yok), küre, klavye ile briefing, kopyalama, telefon, azaltılmış hareket, JS kapalı, Arapça RTL, yedi dilli dil seçici; CSP ihlali 0, konsol hatası 0 |
| `npm run audit:secrets` | Kanarya değerli derlemede 29 tarayıcı dosyasında 5 sır adı + 3 sır değeri (**`TURNSTILE_SECRET_KEY` dahil**) **yok**; bilerek bir sızıntı yerleştirince denetim başarısız oldu (çıkış 1) |
| Lighthouse, kare ritmi | [docs/perf/faz4.md](docs/perf/faz4.md) |
| `npm run film:render` | 15 dosya, ≈ 2,8 MB (§6) |

**Doğrulanmayanlar (dürüstçe):** gerçek bir e-posta teslimi (n8n ve Gmail verilmedi; sahte alıcıyla denendi) · gerçek Turnstile widget'ı (Cloudflare'in her zaman geçen test gizli anahtarıyla sunucu doğrulaması denendi, widget için site anahtarı yok) · yerel konuşur çeviri kalitesi ve hukuk incelemesi (beş dil taslak) · AR/JA'da özel yazı tipi · canlı alan adında PageSpeed/CrUX · Vercel dağıtımı · Upstash ile paylaşımlı hız sınırı · Safari/Firefox (yalnızca Chrome) · gerçek telefon ve 120 Hz ekran · ekran okuyucu ile elle deneme.

### 2B-1 Tokenlar ve Marka (08.10.2026, `faz_2b1` dalı)

Ayrıntı: [docs/perf/faz2b1.md](docs/perf/faz2b1.md), karar: [ADR 0007](docs/adr/0007-tokens-and-brand.md).

| Denetim | Sonuç |
|---|---|
| Tarayıcı testi (yeni, `puppeteer-core`; betik depoda yok) | **32/32** üretimde ve geliştirmede: hesaplanmış renklerde saf siyah/beyaz yok, Instrument Sans gerçekten çiziliyor, hap ve etiket tarifleri, logo, ikonlar, OG kartı, klip köşeleri |
| Tarayıcı testi (Faz 4, gerileme) | **60/60** |
| `npm run smoke` | **107/107** üretimde |
| Lighthouse masaüstü (n = 3, önceki sürümle aralıklı) | **100 / 100 / 100 / 100**, LCP medyanı 682 ms (önceki sürüm 735 ms), TBT 0, CLS 0, JS 162 KB |
| `npm run build` | çıkış 0 (tip denetimi dahil) |

**Doğrulanmayanlar:** **mobil Lighthouse bu sürüm için ölçülmedi** (yarım kalan üç koşu 69–73 verdi ama makine meşguldü ve mobil A/B denemesi benim bir araç hatam yüzünden sonuç vermedi; gerileme mi gürültü mü ayırt edilemiyor). Yayındaki "mobil performans" sayısı bu yüzden "ölçülecek"e çekildi; boş bir makinede `npm run perf` ile yeniden ölçülmeli. Kare ritmi Faz 4 sürümünden. Marka sorgusu (Türkpatent) bitmedi.

### 2B-2 Niş ve Dil (08.10.2026, `faz_2b2` dalı)

Ayrıntı: [docs/perf/faz2b2.md](docs/perf/faz2b2.md), karar: [ADR 0009](docs/adr/0009-niche-and-languages.md).

| Denetim | Sonuç |
|---|---|
| Tarayıcı testi (2B-2, `puppeteer-core`; betik depoda yok) | **31/31**: üç bağlantılı menü, Reach bölümü yok, hero şeridi üç ölçülmüş değer, tam üç vitrin kartı, hukuk videosu üzerine gelince oynar ve çıkınca durur, footer yalnızca English ve Türkçe, dil menüsü iki dil, sayfada SaaS ve çok dilli iddia yok, JSON-LD'de `areaServed` yok, `/de /fr /es /ar /ja` her ortamda 404, briefing'de `projectType: "law"` uçtan uca |
| Tarayıcı testi (2B-1, gerileme) | **32/32** (palet, yazı tipi, hap/etiket, logo, ikon, klip köşeleri; `law` klibi dahil) |
| `npm run smoke` | **109/109** üretimde (üç sektör, Reach yok ve çok dilli iddia yok kontrolleri eklendi) |
| `node faz2-denetim.mjs --build` | bkz. docs/perf/faz2b2.md; yeni kapılar: sektör kilidi, SaaS izi, yedi dil iddiası, `areaServed`, geliştirmede yedi dil, yeni klip listesi (beş ihlal bozulmuş kopyada ayrı ayrı yakalandı) |
| `npm run build` | çıkış 0 (tip denetimi dahil) |

**Doğrulanmayanlar:** hiçbir Lighthouse ya da performans ölçümü yapılmadı (sahibinin talimatı); **mobil performans hâlâ "ölçülecek"**, masaüstü sayıları 2B-1 sürümünündür. Hukuki sayfalar yer tutuculu taslaktır (K7). 2B-3 ve 2B-4 yapılmadı.

### 2B-3 Briefing ve Güvenlik (08.10.2026, `faz_2b3` dalı)

Ayrıntı: [docs/perf/faz2b3.md](docs/perf/faz2b3.md), karar: [ADR 0010](docs/adr/0010-briefing-delivery-and-security.md).

| Denetim | Sonuç |
|---|---|
| `node faz2-denetim.mjs --build` | **0 hata**, 106 geçti, 1 uyarı (bilinçli, ADR 0001); yeni kapılar bozulmuş kopyada 4/4 yakalandı |
| `npm run smoke` | **115/115** report-only'de ve **115/115 CSP enforce kipinde**: teslimde `id` ve `Idempotency-Key`, geçici 503'te bir kez yeniden deneme (aynı `id`), sürekli çöken alıcıda iki deneme + `502` + 10 sn altı, `security.txt` |
| Gerçek Turnstile widget'ı + teslim, **enforce** | **12/12**, CSP ihlali yok |
| Tarayıcı testleri, **enforce** | Faz 4 gerileme **42/42**, 2B-2 **31/31**, 2B-1 **32/32** |

**Doğrulanmayanlar:** gerçek n8n/Gmail teslimi ve n8n'deki çift kayıt ayıklaması (bilgiler verilmedi); CSP enforce yalnızca yerel HTTP'de denendi (canlıda HTTPS ve ilk günlerin rapor izlemesi gerekir); performans ölçümü yapılmadı (mobil hâlâ "ölçülecek"); otomatik yanıt, WhatsApp/takvim bağlantıları yapılmadı.

### 2B-4 Hukuki Sayfalar, yapı (08.10.2026, `faz_2b4` dalı)

Ayrıntı: [docs/perf/faz2b4.md](docs/perf/faz2b4.md), karar: [ADR 0011](docs/adr/0011-legal-pages-structure.md). **Bu bir hukuki yeterlilik doğrulaması değildir;** içerik yer tutuculu taslak kalır (sahibinin kararı), avukat onayı bekler.

| Denetim | Sonuç |
|---|---|
| Aydınlatma metni | 9 bölüm bildirim sırasıyla (yeni: toplama ve zorunluluk, öncelik sınıfı/otomatik karar yok; genişletilmiş haklar), bölüm `id`'leri, "son düzenleme" tarihi, rıza bağlantısı `/privacy#privacy-p2` |
| `npm run smoke` | **121/121** |
| Tarayıcı testi 2B-4 (yeni, `puppeteer-core`; betik depoda yok) | **19/19** (EN ve TR; bağlantı tıklayınca ilgili bölüme kaydırıyor; yer tutucular ve taslak uyarısı yerinde) |
| Gerileme setleri | Faz 4 **42/42**, 2B-2 **31/31**, 2B-1 **32/32** |
| `node faz2-denetim.mjs --build` | **0 hata**, 110 geçti, 1 bilinçli uyarı; beş ihlal bozulmuş kopyada yakalandı (taslak uyarısı kalkarsa ve "uyumludur" gibi bir iddia yazılırsa hata) |

**Doğrulanmayanlar:** hukuki yeterlilik, gerçek şirket bilgileri, avukat onayı; p8/p9'daki işletme iddiaları; performans (ölçülmedi, mobil hâlâ "ölçülecek").

## 12. Üçüncü taraf lisanslar

Inter Display (Inter Project Authors, SIL OFL 1.1, `public/fonts/OFL-inter.txt`) · Syne (SIL OFL 1.1, `public/fonts/OFL-syne.txt`) · Next.js, React, next-intl, zod, DOMPurify, jsdom, lucide-react, Tailwind CSS, Lenis, Motion (MIT/Apache/MPL, bkz. paketler) · Remotion (yalnızca render için, özel lisans, §6) · Cloudflare Turnstile (yalnızca briefing'in son adımında yüklenir).
