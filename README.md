# syncflow.agency

Yüksek bütçeli markalar için dijital mimari stüdyosu sitesi: "Dark Monolith & Fluid Precision" ([Ana Sayfa Blueprint](docs/adr/0006-blueprint-adopted.md)) üzerinde B1/v2 marka sistemi ([ADR 0007](docs/adr/0007-tokens-and-brand.md)): obsidian zemin, platin metin, Instrument Sans, çizili logo.
**Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind v4 · next-intl (TR + EN yayında, yedi dillik altyapı uykuda) · Strategic Briefing (Turnstile + imzalı webhook → n8n → Gmail) · Remotion ile önceden render edilmiş sahne videoları · nonce tabanlı CSP (şimdilik report-only)**

| | |
|---|---|
| Diller | **Türkçe ve İngilizce** (`en` varsayılan `/`, `tr`). Her ortamda yalnızca `NEXT_PUBLIC_LAUNCHED_LOCALES` (varsayılan `en,tr`) yayınlanır, geliştirme sunucusu dahil. `de fr es ar ja` (Arapça sağdan sola) **uykuda taslak** çeviridir: altyapı ve dosyalar durur, hiçbir yerde bağlantı verilmez, yalnızca `NEXT_PUBLIC_PREVIEW_LOCALES=1` ile okunur. Sitede yedi dil iddiası yoktur ([ADR 0009](docs/adr/0009-niche-and-languages.md), [0002](docs/adr/0002-launch-locales-and-market.md)) |
| Satış akışı | Başvuru bazlı: ana sayfadaki 4 adımlı **Strategic Briefing** → `/api/briefing` → imzalı webhook → n8n → Gmail → `contact@syncflow.agency`. Ödeme ve fiyat yok |
| Bölümler | Hero · Mimari (3 Border Beam kartı) · Vitrin (kilitli üç sektör: Lüks Gayrimenkul, Özel Klinik, Kurumsal Hukuk ve Danışmanlık; 3 konsept video, yatay `scroll-snap` şerit) · Briefing · Kapanış ve footer |
| Güvenlik | HSTS, CSP (nonce + strict-dynamic, **report-only**; üçüncü taraf yalnızca Cloudflare Turnstile), XFO, nosniff, Referrer/Permissions-Policy, hız sınırı, zod + DOMPurify, honeypot, sunucuya özel sırlar |

> **Bu proje OneDrive / Masaüstü dışında durmalı.** `node_modules` ve `.next` on binlerce dosya içerir; OneDrive senkronu, Türkçe karakterli/boşluklu yollar ve Windows'un 260 karakter sınırı kurulumu ve Remotion'u bozar. Şu an `C:\Users\YAKUP\syncflow-agency` altında.

---

## 1. Hızlı başlangıç

Gereksinim: **Node ≥ 20.19** (Node 24 ile test edildi), npm.

```bash
npm install
npm run dev                 # http://localhost:3000  (geliştirme, Turbopack; yalnızca TR ve EN)

npm run build && npm start  # üretim derlemesi + sunucu (önizleme için bunu kullanın; yalnızca en,tr yayında)
```

Ortam değişkenleri `.env.example` içinde açıklıdır. Yerelde hiçbiri zorunlu değildir (Turnstile ve webhook olmadan form geliştirme kipinde "yerel kabul" yanıtı verir ve bunu söyler); `.env.local` oluşturup gerekenleri doldurun (git'e girmez).

| Komut | Ne yapar |
|---|---|
| `npm run check` | Çeviri eşitliği + TypeScript + ESLint |
| `npm run check:messages` | `en` ve `tr` anahtar/yer tutucu/etiket eşitliği; uykudaki taslak diller geride kalabilir (sayılır), fazlalık anahtar ya da bozuk yer tutucu hata (`--strict`: yasal sayfalardaki `[YER TUTUCU]`'lar da hata) |
| `npm run brand:build` / `brand:check` | `brand/*.svg` marka paketinden `lib/brand-paths.ts`, `app/icon.svg`, `app/apple-icon.png`, `public/brand/logo-512.png` üretir; `brand:check` eskimiş dosya varsa hata verir (denetim de çalıştırır) |
| `npm run check:fonts` | Latin yazılı dillerdeki (en tr de fr es) her karakter Instrument Sans dosyalarında var mı (Python + `pip install fonttools brotli`; AR ve JA kasıtlı sistem yazı tipidir, `⌘ ✓` simgeleri açık istisnadır). Dosyaları yeniden üretmek: `python scripts/build-fonts.py "InstrumentSans[wdth,wght].ttf"` |
| `node faz2-denetim.mjs --build` | **Aşama kapısı**: bağımlılıklar, tasarım belirteçleri, i18n, güvenlik, sahne videoları, hareket, doğrulanmamış iddia yasağı, ardından `npm run build` ve ilk yük paket denetimi |
| `npm run smoke` | **Çalışan** sunucuya karşı HTTP güvenlik/işlev kontrolleri (aşağıda). Ortam değişkenleri `scripts/smoke.mjs` başlığında: `EXPECT_LOCALES`, `TURNSTILE_MODE`, `MOCK_WEBHOOK_PORT`, `WEBHOOK_SECRET`, `EXPECT_CSP_MODE` |
| `npm run perf` | Çalışan üretim sunucusuna (ya da iki sunucuya, aralıklı A/B) Lighthouse çalıştırır ve medyanları yazdırır. Yöntem ve sonuçlar [docs/perf/faz4.md](docs/perf/faz4.md) |
| `npm run audit:secrets` | `build` sonrası: sunucu sırları tarayıcıya giden dosyalara sızmış mı |
| `npm run dev:inbox` | Yerel taklit "gelen kutusu" (`127.0.0.1:4011`): briefing kayıtlarını ekrana yazar ve imzayı doğrular, bkz. [docs/n8n-briefing.md](docs/n8n-briefing.md) |
| `npm run film:render` | Dört sahne videosunu Remotion ile `public/media/clips/` altına render eder (MP4 + WebM + poster), bkz. §6 |
| `npm run remotion:studio` | Sahneleri Remotion Studio'da açar |

---

## 2. Klasör yapısı

```
app/
  [locale]/layout.tsx      <html lang dir>, metadata (hreflang yalnızca yayındaki dillere), CSP nonce, dil kapısı (kapalı dil 404)
  [locale]/page.tsx        ana sayfa: Hero · Architecture · Showcase · BriefingSection · Closing
  [locale]/privacy|imprint yasal sayfa taslakları (noindex; EN/TR dışında İngilizce metin + uyarı)
  api/briefing/route.ts    Strategic Briefing API'si (Node runtime)
  api/csp-report/route.ts  CSP ihlal raporları alıcısı (204; sunucu günlüğüne rapor başına tek satır JSON)
  og/route.tsx             paylaşım görseli (GET /og?locale=tr; AR ve JA kartları İngilizce metinle)
  globals.css              @font-face, belirteçler (@theme), taban katman, bileşen sınıfları (Border Beam, cam yüzey, briefing ...)
  robots.ts · sitemap.ts · manifest.ts · icon.svg
components/
  layout/    Header · Footer · StickyCta · LanguageSwitcher(client)
  sections/  Hero · Architecture · Showcase + ShowcaseStrip(client) · BriefingSection + Briefing(client) · Closing + CopyEmail(client) · LegalPage
  media/     SceneVideo(client): poster + önceden render edilmiş video, ekran dışında durur
  i18n/      ClientI18n (tarayıcıya giden minik bağlam)    ui/  Logo (B1/v2, çizili SVG), MaskText/MaskLines, SectionHead
lib/
  briefing.ts      seçenekler, sınırlar, zod'suz tarayıcı doğrulayıcı, sınıflandırma (tarayıcı + sunucu)
  metrics.ts       sitede yayınlanan TÜM performans sayıları (değer, tarih, profil, kaynak)
  schemas/briefing.ts (zod, strict)    server/ deliver.ts · turnstile.ts · sanitize.ts (server-only)    security/ csp.ts · rate-limit.ts
  enhance/  ui-state (üstbilgi, mobil yapışkan CTA, ekran dışında durdurma) · spotlight · magnetic · rings · reveal (Motion) · smooth-scroll (Lenis)
  motion/   tokens · ease      merge-messages.ts (taslak dillerde eksik metin İngilizceden)    i18n-paths.ts
messages/   en tr de fr es ar ja (.json)
i18n/       routing.ts (altyapıda 7 dil, LOCALE_LABELS: ad, hreflang, og:locale, dir) · launch.ts (hangi diller yayında) · request.ts
proxy.ts    hız sınırı + CSP nonce + dil yönlendirmesi (Next 16'da "middleware" yeni adıyla "proxy")
docs/       adr/ (mimari kararlar 0001–0006) · perf/ (ölçümler) · n8n-briefing.md (teslimat akışı)
public/     fonts/ Instrument Sans alt kümeleri (OFL)   media/clips/ render edilmiş sahneler   brand/logo-512.png
brand/      B1 monogram + özel çizim v2 wordmark (SVG, tek renk, eğri) · README.md (kurallar) · tools/outline_wordmark.py
assets/     og-instrument-sans-600.ttf (paylaşım kartı yazı tipi)
remotion/   Render kaynağı, siteye girmez: config.ts, fonts.ts, Root.tsx, scenes/ (Monolith, Estate, Clinic, Saas)
scripts/    check-messages · check-fonts · build-fonts · build-brand · smoke · audit-secrets · render-film · lighthouse · dev-inbox
```

### Tasarım sistemi ("Dark Monolith & Fluid Precision")

Belirteçlerin **tek yeri**: [`app/globals.css`](app/globals.css) içindeki `@theme` bloğu ve `@utility text-*` tipografi ölçeği (Tailwind v4, CSS-first). Kural kaynağı CLAUDE.md "Tasarım tokenları" ve "Tipografi"; Blueprint'ten ayrılınan yerler [ADR 0006](docs/adr/0006-blueprint-adopted.md)'da, palet ve marka kararı [ADR 0007](docs/adr/0007-tokens-and-brand.md)'de.

| Katman | Belirteçler |
|---|---|
| Renk | `obsidian` #0D0D0E (zemin) · `layer-1` #141416 (kart) · `layer-2` #1A1A1E (menü) · `ink` platin #E2E2E6 (15,0:1) · `muted` platin %70 (≥ 6,5:1) · `faint` platin %60 (≥ 5,2:1) · `champagne` #D4C5A9 (yalnızca birincil düğme ve tekil vurgu; obsidian metinle 11,4:1). **Saf siyah ve saf beyaz yok** (denetim FAIL sayar) |
| Çizgi | `hairline` #ffffff1a (cam kenarlık) · `hairline-strong` #ffffff40 (hover) |
| Tipografi | Instrument Sans 400/500 (OFL, Latin 30 KB + Türkçe 2 KB; ailede 300 yok) · etiketler tek tarifle sistem mono yığını, 11 px, geniş harf aralığı, büyük harf · `text-hero` `text-headline` `text-title` `text-lead` · AR ve JA sistem yazı tipi yığınları, Arapçada harf aralığı sıfır |
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
- **Öncelik sınıfı (yüksek/orta/düşük) sunucuda hesaplanır** (`lib/briefing.ts`): $20k+ ve karar veren/karar ekibi = yüksek, $5k–$10k (taban $10.000'ın altı) = düşük, kalanı orta.
- Teslimat: `CONTACT_WEBHOOK_URL` (yalnızca `https://`, loopback hariç), yönlendirme izlenmez (SSRF), isteğe bağlı **HMAC-SHA256** imzası `x-syncflow-signature`; yük `type: "syncflow.briefing"`, her başvuruya rastgele bir **`id`** (UUID v4, ayrıca `Idempotency-Key` başlığı) ve hazır `subject` (`[Briefing][high] Şirket, Ad`). **En çok iki deneme, toplam < 9,5 sn**, yalnızca zaman aşımı/ağ hatası/5xx/408/429'da; iki deneme de aynı `id`'yi taşır, **n8n tekrarı `id`'ye göre ayıklamalıdır** ([docs/n8n-briefing.md](docs/n8n-briefing.md) "Çift kayıt"); iki deneme de başarısızsa `502` ve hazır e-posta taslağı ([ADR 0010](docs/adr/0010-briefing-delivery-and-security.md)).

**`security.txt`** (RFC 9116): `public/.well-known/security.txt`, `Expires` **2027-04-08**; süresi dolarsa denetim ve duman testi kırmızıya döner, yenileyin. **CSP enforce hazırlığı:** aynı derleme `CSP_MODE=enforce` ile gerçek bloklama altında denendi (duman 115/115, gerçek Turnstile widget'ı 12/12 ve üç tarayıcı seti geçti, [docs/perf/faz2b3.md](docs/perf/faz2b3.md)); varsayılan hâlâ report-only, geçiş F7'de ve yalnızca bir ortam değişkeni.

**Sırlar:** `CONTACT_WEBHOOK_*`, `TURNSTILE_SECRET_KEY`, `UPSTASH_*` `NEXT_PUBLIC_` önekli değildir; `lib/server/*` `server-only` ile işaretlidir. **Gmail kimlik bilgisi uygulamada hiçbir yerde yoktur**: e-postayı n8n'deki Gmail düğümü gönderir ([docs/n8n-briefing.md](docs/n8n-briefing.md)). `npm run audit:secrets` derleme çıktısını tarar.

**Bilinçli kararlar / dikkat:** HSTS `preload` jetonu yalnızca *uygunluk* bildirir; `hstspreload.org`'a başvurursanız tüm alt alan adları kalıcı olarak HTTPS olmak zorundadır. Webhook ayarlı değilken üretimde form `503` verir ve ziyaretçiye yanıtlarıyla hazırlanmış bir `mailto:` taslağı sunar: yanıtlar kaybolmaz.

---

## 4. Yerelleştirme (i18n) ve küresel SEO

- **Yedi dil:** `i18n/routing.ts` (`localePrefix: 'as-needed'`): EN `/`, diğerleri `/xx`. Dili **yalnızca URL** belirler: çerez yok, tarayıcı diline göre yönlendirme yok ([ADR 0002](docs/adr/0002-launch-locales-and-market.md)).
- **Hangi diller yayında:** tek kaynak `i18n/launch.ts`. Her ortamda `NEXT_PUBLIC_LAUNCHED_LOCALES` (varsayılan `en,tr`) dışındaki dil 404 verir (geliştirme sunucusu dahil); yedisi yalnızca `NEXT_PUBLIC_PREVIEW_LOCALES=1` ile açılır. `hreflang`, `x-default`, `og:locale` + `alternateLocale`, sitemap, JSON-LD (`inLanguage`), dil seçici ve footer'ın dil sütunu **yalnızca bu listeden** türer (denetim ve duman testi kapalı dilin sızmadığını doğrular). Bir dili yayına almak: kodunu listeye eklemek ve yeniden derlemek, ama önce yerel çeviri ve hukuk incelemesi.
- **Uykudaki taslak diller** (`de fr es ar ja`): `messages/xx.json` İngilizce'den geride kalabilir; eksik anahtar (hukuk sayfaları ve sonradan değişen metinler) İngilizceden tamamlanır (`lib/merge-messages.ts`) ve sayfada bunu söyleyen bir satır çıkar. Çeviriler bu oturumda yazılmış **taslaktır**; yerel konuşur ve avukat onayı olmadan yayına alınmamalıdır (sağlık ve hukuk ifadeleri ülkeye göre değişir, örn. Almanya'da HWG).
- **Arapça (RTL):** `<html lang="ar" dir="rtl">`; tüm yerleşim mantıksal özelliklerle aynalanır (üstbilgi, düğme okları, şerit sırası, ilerleme çizgisi, odak ve menü yönü); yönlü oklar `.icon-dir` ile aynalanır; harf aralığı sıfırlanır (bitişik harfler kopmasın); maske payı Arapça ve Japonca için büyütülür; Latin adlar (`syncflow.agency`, e-posta) `dir="ltr"` taşır; çerçevesiz honeypot `start-[-9999px]` ile konur (RTL'de `left:-9999px` 9999 px'lik yatay kaydırma doğururdu).
- **Yazı tipleri:** Latin ve Türkçe Instrument Sans (OFL, `scripts/build-fonts.py`). Almanca, Fransızca, İspanyolca Latin-1 kapsamında. **Arapça ve Japonca sistem yazı tipi yığınlarıyla** (Segoe UI/Tahoma/Geeza Pro; Yu Gothic/Hiragino/Noto): sıfır bayt maliyeti, ama marka tutarlılığı sistemin yazı tipine bağlıdır. Bu diller yayına alınırken özel bir OFL yığını seçilmelidir (CLAUDE.md). `/og` paylaşım kartı AR ve JA'da İngilizce metinle çizilir (yazı tipinde glif yok); `og:title` ve `og:description` kendi dillerindedir.
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

`lenis` ve `motion` yalnızca `import()` ile kullanılabilir; `faz2-denetim.mjs` statik import'u hata sayar ve `--build` sonrası rotanın ilk yük parçalarında ikisinin de olmadığını doğrular.

---

## 6. Remotion ve sahne videoları

Sitede **Remotion çalışma zamanı yok**: videolar önceden render edilmiş dosyalardır ([ADR 0003](docs/adr/0003-showcase-film-static-render.md)). `remotion` yalnızca geliştirme bağımlılığıdır; `remotion/scenes/` altındaki sahneleri `scripts/render-film.mjs` ile render etmek içindir.

- **Sahneler** (1280×720, 30 kare/sn, 8 sn kusursuz döngü, her biri tamamen kareden hesaplanır): `Monolith` (yavaşça dönen cam monolit; "mimari" kartı), `Estate` (gün batımında cam cepheli villa), `Clinic` (soluk klinik koridoru), `Saas` (karanlık panel, ⌘K paleti). **Konsept render'dır**, gerçek müşteri işi değildir; kartlarda öyle yazar. Sahnelerde okunabilir metin yoktur: altyazı HTML'dir, tek render her dile yeter.
- **Çıktı:** `public/media/clips/<ad>.{mp4,webm,webp}`: H.264 MP4 (tercih edilen), VP9 WebM (yedek) ve WebP poster. Toplam 12 dosya, yaklaşık 1,9 MB.
- **Oynatma** (`components/media/SceneVideo.tsx`): HTML'de yalnızca poster gelir, video `preload="none"`. Ince işaretçide, görünürken (mimari kartı) ya da kartın üstüne gelince/odaklanınca (vitrin) oynar; **dokunmatikte, azaltılmış hareket ve Save-Data'da otomatik oynamaz** ve hiçbir şey indirilmez; ziyaretçi düğmeye basınca yüklenir. Ekran dışına çıkınca ve sekme gizlenince durur. Her videoda görünür bir oynat/duraklat düğmesi vardır (WCAG 2.2.2). Çerçeve oranı sabittir (CLS 0).
- **Lisans:** Remotion yalnızca ≤ 3 kişilik kâr amaçlı şirketlerde/bireylerde ücretsizdir; **4+ kişilik şirketler için ücretli Company License gerekir** (remotion.pro). Render almak da lisans kapsamındadır.

```bash
npm run film:render                       # dört sahne × (MP4 + WebM + poster), ~10 dk
npm run film:render -- --posters          # yalnızca posterler (hızlı)
npm run film:render -- --only=estate      # tek sahne
npm run remotion:studio                   # sahneleri tarayıcıda düzenle
```
Sahne değişince komutu çalıştırıp çıkan dosyaları commit'leyin. Remotion CLI her seferinde `npx` ile, kurulu `remotion` sürümüyle getirilir (projeye eklenmez); "zod sürüm uyuşmazlığı" uyarısı zararsızdır.

---

## 7. Strategic Briefing ve e-posta teslimatı

Ana sayfada, ziyaretçiyi 4 ekrandan geçiren cam bir panel (`#briefing`): (1) proje türü, (2) yatırım aralığı ($5k–$10k, $10k–$20k, $20k+, önce konuşalım), (3) zamanlama, (4) iletişim (ad soyad, şirket ve unvan, iş e-postası, tek cümle proje, karar yetkisi, **işaretsiz** rıza kutusu). Ekran başına tek soru, klavye ile tamamlanır (Boşluk seçer, Enter devam eder), her adımda odak yeni başlığa taşınır, ilerleme çizgisi 4 parçadır, geçiş `clip-path` açılmasıdır. Tarayıcıda hiçbir şey saklanmaz (çerez ve depolama yok).

- **Başarı ekranı:** Blueprint metni ("24 saat içinde kurucu ekibimiz size kişisel olarak yazacak"). **Bu söz yalnızca gerçekse yayınlanmalıdır** (CLAUDE.md kapasite kuralı); sahibi korunmasını istedi.
- **Teslimat:** form → `/api/briefing` (Turnstile + zod + DOMPurify + hız sınırı) → imzalı webhook → n8n → Gmail → `contact@syncflow.agency`. n8n akışının adımları, HMAC doğrulama kodu ve deneme komutları: [docs/n8n-briefing.md](docs/n8n-briefing.md).
- **Doğrulanabilen / doğrulanamayan:** sahte alıcıyla yük, imza, sınıflandırma ve zararlı girdi reddi duman testinde doğrulandı. **Gerçek posta kutusuna teslim bu makinede doğrulanamadı:** n8n adresi, imza sırrı ve Turnstile anahtarları verilmedi. Hepsi tanımlanınca `docs/n8n-briefing.md` §5'teki ilk deneme listesi uygulanır.
- **Yedek yol:** webhook yoksa ya da hata verirse form yanıtlarla doldurulmuş bir `mailto:` taslağı önerir. Geliştirme kipinde webhook yoksa form kabul eder ama başarı ekranı "e-posta gönderilmedi" notunu da gösterir.
- **JavaScript yokken:** panel çalışamaz; `<noscript>` e-posta adresini önerir.

---

## 8. Performans ve yayınlanan sayılar

Sitede yayınlanan her performans sayısı **`lib/metrics.ts`** içinde durur (değer, tarih, profil, kaynak); ölçülmeyen "ölçülecek" yazar; `faz2-denetim.mjs` her kaydın tarih, profil ve kaynak taşıdığını ve metinlerde doğrulanmamış iddia bulunmadığını denetler (kilitli 60 FPS, 120 Hz, LCP/TBT/INP eşikleri, AV1, örnek yüzdeler, önce-sonra yok).

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

- **Vercel:** Hobby planı yalnızca **ticari olmayan** kullanıma açıktır; ticari site için **Pro** gerekir. Çalışma zamanı Node 22/24. Ortam değişkenleri: `NEXT_PUBLIC_SITE_URL=https://syncflow.agency`, `NEXT_PUBLIC_LAUNCHED_LOCALES`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `CONTACT_WEBHOOK_URL`, `CONTACT_WEBHOOK_SECRET`, `UPSTASH_REDIS_REST_URL/TOKEN`, isteğe bağlı `NEXT_PUBLIC_LINKEDIN_URL`, `NEXT_PUBLIC_INSTAGRAM_URL`, `NEXT_PUBLIC_WHATSAPP_URL` (`.env.example`). `NEXT_PUBLIC_*` derleme anında içeri gömülür: değiştirince yeniden derleyin.
- Vercel *Preview* dağıtımlarında Vercel'in kendi araç çubuğu betiği CSP'ye takılır (konsolda hata); üretimi etkilemez.
- Cloudflare Pages/Workers için OpenNext adaptörü gerekir (denenmedi).
- `NEXT_PUBLIC_SITE_URL` canonical/hreflang/OG/sitemap'i belirler. **Yanlışsa SEO bozulur**; yerel Lighthouse için `NEXT_PUBLIC_SITE_URL=http://localhost:3100` ile derleyin (yoksa canonical canlı alan adını gösterir ve SEO 92'ye düşer).

---

## 10. Yayın öncesi kontrol listesi

- [ ] **n8n akışını kurun ve ilk gerçek denemeyi yapın** ([docs/n8n-briefing.md](docs/n8n-briefing.md) §5): `contact@syncflow.agency`'e e-posta düşüyor mu, yanlış imza reddediliyor mu.
- [ ] **Turnstile anahtarlarını** (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`) Cloudflare'de oluşturup tanımlayın; üretimde gizli anahtar olmadan form 503 verir.
- [ ] **Yasal sayfalar** (yapı hazır, [ADR 0011](docs/adr/0011-legal-pages-structure.md); içerik yer tutuculu taslak): `messages/en.json` ve `tr.json` → `Legal.*` içindeki `[KÖŞELİ PARANTEZ]` alanlarını (şirket unvanı, adres, hukuki tür, telefon, sicil ve vergi no, sorumlu kişi, teslim hizmeti, aktarım güvenceleri, saklama süresi, **başvuru kanalları, denetim makamı**) doldurun, avukata inceletin; "p8/p9" bölümlerindeki işletme iddialarının ("her talebi bir kişi okur", "otomatik yanıt ya da ret yok") doğru olduğunu teyit edin; `npm run check:messages -- --strict` hata vermeyene kadar. "Taslak" uyarısı (`Legal.draft`) yayından önce kaldırılmalı.
- [ ] **"24 saat içinde kişisel dönüş" sözünün gerçek olduğunu** teyit edin (kapasite cümlesi kuralı).
- [ ] **Taslak dillerden hangisi yayına girecek?** Yerel konuşur çeviri incelemesi + hukuk incelemesi (sağlık reklamı kuralları, KVKK/GDPR muadilleri) sonra `NEXT_PUBLIC_LAUNCHED_LOCALES`'e ekleyin; AR ve JA için özel OFL yazı tipi yığınını seçin ve `check:fonts` kapsamını genişletin.
- [ ] **LinkedIn / Instagram / WhatsApp adresleri** verilirse ilgili `NEXT_PUBLIC_*` değişkenlerini tanımlayın (verilmedi, footer'da yok). Logo çizili B1/v2 paketidir ama **ad/marka sorgusu (Türkpatent ve uluslararası) bitmeden nihai değildir** (`brand/README.md`).
- [ ] **Sahne videolarının "konsept render" olduğu** kartlarda yazıyor; gerçek vaka çalışmaları gelirse kartlar ve etiket güncellenir.
- [ ] `NEXT_PUBLIC_SITE_URL` üretim alan adı. Search Console'a `sitemap.xml`. PageSpeed Insights ile canlı doğrulama, `lib/metrics.ts` güncelleme.
- [ ] `public/.well-known/security.txt` `Expires` tarihini (2027-04-08) dolmadan yenileyin.
- [ ] Remotion lisansı (4+ kişiyseniz).
- [ ] `npm run check`, `node faz2-denetim.mjs --build`, `npm start`, `npm run smoke`, `npm run audit:secrets`.

---

## 11. Doğrulama sonuçları

Hepsi üretim derlemesi üzerinde, Windows 11, Node 24.12, Chrome 154 ile alındı. Aşama sonuçları:

### Faz 4 ve 5 (08.10.2026, `faz_4` ve `faz_5` dalları)

| Denetim | Sonuç |
|---|---|
| `node faz2-denetim.mjs --build` | **0 hata**: 78 geçti, 1 uyarı, 3 bilgi. Uyarı `generateStaticParams` yok: nonce'lu CSP sayfaları zaten istek başına render ettiği için bilinçli ([ADR 0001](docs/adr/0001-csp-report-only.md)). `npm run build` başarılı. Yeni kapılar: Blueprint belirteçleri, yedi dil + yayın listesi, taslak dil anahtarları, Lemon Squeezy izi yok, briefing savunmaları, doğrulanmamış iddia yasağı, `lib/metrics.ts` kaynak kaydı, sahne videoları, Border Beam ve ışık kuralları |
| `npm run check` | Çeviri eşitliği (7 dil: `en`/`tr` 253 anahtar, beş taslak dil `Legal.*` hariç 222) · `tsc` 0 hata · ESLint 0 hata, 0 uyarı |
| `npm run smoke` | **107/107** üretim derlemesinde (`en,tr` yayında; sahte webhook alıcısı, Cloudflare'in her zaman geçen Turnstile test anahtarıyla gerçek `siteverify` çağrısı) ve **91/91** geliştirme sunucusunda (yedi dil, webhook yok): güvenlik başlıkları, report-only CSP + nonce, Turnstile tek üçüncü taraf, hreflang/sitemap/JSON-LD yalnızca yayındaki diller, kapalı dil 404, Arapça `dir="rtl"`, briefing API savunmaları, işaretleme saldırılarının reddi, tam yük ve HMAC imzası, altı öncelik sınıfı, 12 sahne dosyası, CSP rapor alıcısı, hız sınırı |
| Tarayıcı testi (Chrome 154, `puppeteer-core`; betik depoda yok) | **60/60**: Blueprint bölümleri, imleç ışığı, manyetik düğme, Border Beam ve ekran dışında durma, halkalar, video politikası, yatay şerit (scroll-jacking yok), küre, klavye ile briefing, kopyalama, telefon, azaltılmış hareket, JS kapalı, Arapça RTL, yedi dilli dil seçici; CSP ihlali 0, konsol hatası 0 |
| `npm run audit:secrets` | Kanarya değerli derlemede 29 tarayıcı dosyasında 5 sır adı + 3 sır değeri (**`TURNSTILE_SECRET_KEY` dahil**) **yok**; bilerek bir sızıntı yerleştirince denetim başarısız oldu (çıkış 1) |
| Lighthouse, kare ritmi | [docs/perf/faz4.md](docs/perf/faz4.md) |
| `npm run film:render` | 12 dosya, ≈ 1,9 MB (§6) |

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

Instrument Sans (SIL OFL 1.1, `public/fonts/OFL.txt`) · Next.js, React, next-intl, zod, DOMPurify, jsdom, lucide-react, Tailwind CSS, Lenis, Motion (MIT/Apache/MPL, bkz. paketler) · Remotion (yalnızca render için, özel lisans, §6) · Cloudflare Turnstile (yalnızca briefing'in son adımında yüklenir).
