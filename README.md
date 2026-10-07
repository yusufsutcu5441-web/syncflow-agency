# SyncFlow Agency: syncflow.agency

Yüksek bütçeli B2B markalar için "Quiet Luxury Noir" kurumsal vitrin.
**Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind v4 · next-intl (2 dil) · Remotion ile önceden render edilmiş film · Lemon Squeezy · nonce tabanlı CSP (şimdilik report-only)**

| | |
|---|---|
| Diller | EN (varsayılan, `/`) ve TR `/tr`. Diğer diller çeviri ve hukuk incelemesinden sonra açılır ([ADR 0002](docs/adr/0002-launch-locales-and-market.md)) |
| Satış akışı | Tek CTA "Start Project — $2,500" → Lemon Squeezy koyu overlay ödeme |
| Bölümler | Hero · Showcase (önceden render edilmiş mimari filmi) · Karşılaştırma (Contrast Grid) · Fiyat · SSS · İletişim · Footer |
| Güvenlik | HSTS, CSP (nonce + strict-dynamic, şimdilik **report-only**), XFO, nosniff, Referrer/Permissions-Policy, hız sınırı, zod + DOMPurify, sunucuya özel sırlar |

> **Bu proje OneDrive / Masaüstü dışında durmalı.** `node_modules` ve `.next` on binlerce dosya içerir; OneDrive senkronu, Türkçe karakterli/boşluklu yollar ve Windows'un 260 karakter sınırı kurulumu ve Remotion'u bozar. Şu an `C:\Users\YAKUP\syncflow-agency` altında.

---

## 1. Hızlı başlangıç

Gereksinim: **Node ≥ 20.19** (Node 24 ile test edildi), npm.

```bash
npm install
npm run dev                 # http://localhost:3000  (geliştirme, Turbopack)

npm run build && npm start  # üretim derlemesi + sunucu (önizleme için bunu kullanın)
```

Ortam değişkenleri `.env.example` içinde açıklıdır. Yerelde hiçbiri zorunlu değildir; `.env.local` oluşturup gerekenleri doldurun (git'e girmez).

| Komut | Ne yapar |
|---|---|
| `npm run check` | Çeviri eşitliği + TypeScript + ESLint |
| `npm run check:messages` | Her dilde anahtar/yer tutucu/etiket eşitliği (`--strict`: yasal sayfalardaki `[YER TUTUCU]`'lar da hata) |
| `npm run check:fonts` | Mesajlardaki her karakter yazı tipi dosyalarında var mı (Python + `pip install fonttools brotli`) |
| `npm run check:csp-hash` | Lemon.js'in eklediği `<style>` hash'i güncel mi |
| `npm run smoke` | **Çalışan** sunucuya karşı HTTP güvenlik/işlev kontrolleri (aşağıda). Faz 7'de CSP enforce'a geçince `EXPECT_CSP_MODE=enforce` ile çalıştırın |
| `npm run perf` | Çalışan üretim sunucusuna (ya da iki sunucuya, aralıklı A/B) Lighthouse çalıştırır ve medyanları yazdırır. Her fazın kapısı için; yöntem ve sonuçlar [docs/perf/faz2-baseline.md](docs/perf/faz2-baseline.md) |
| `npm run audit:secrets` | `build` sonrası: sunucu sırları tarayıcıya giden dosyalara sızmış mı |
| `npm run dev:inbox` | Yerel taklit "gelen kutusu" (`127.0.0.1:4011`): formdan gelen kayıtları ekrana yazar. Sunucuyu `CONTACT_WEBHOOK_URL=http://127.0.0.1:4011/lead` ile başlatın (PowerShell: `$env:CONTACT_WEBHOOK_URL='http://127.0.0.1:4011/lead'; npm start`) |
| `npm run film:render` | Showcase filmini Remotion ile `public/media/showcase/` altına render eder: 2 dil × 2 oran × (MP4 + WebM + poster), bkz. §6 |
| `npm run remotion:studio` | Kompozisyonu Remotion Studio'da açar |

---

## 2. Klasör yapısı

```
app/
  [locale]/layout.tsx      <html lang dir>, CSP nonce okuma, Lemon.js (next/script), JSON-LD, metadata
  [locale]/page.tsx        ana sayfa (sunucu bileşeni, bölümler)
  [locale]/privacy|imprint yasal sayfa taslakları (noindex)
  api/contact/route.ts     iletişim formu API'si (Node runtime)
  api/csp-report/route.ts  CSP ihlal raporları alıcısı (204; sunucu günlüğüne rapor başına tek satır JSON)
  og/route.tsx             paylaşım görseli (GET /og?locale=tr)
  globals.css              @font-face, tasarım belirteçleri (@theme), taban katman, bileşen sınıfları
  robots.ts · sitemap.ts · manifest.ts · icon.svg
components/
  layout/  Header · Footer · StickyCta · LanguageSwitcher(client)
  sections/ Hero · Showcase · Comparison · Pricing · Faq · Contact · ContactForm(client) · LegalPage
  showcase/ ShowcaseFilm(client): poster + önceden render edilmiş video, sahne sekmeleri
  checkout/ LemonSqueezy(client): lemon.js + overlay erişilebilirliği
  i18n/     ClientI18n (tarayıcıya giden minik bağlam) · ui/ Logo, CheckoutLink, SectionHead, MaskText
lib/
  security/ csp.ts · rate-limit.ts      server/ deliver.ts · sanitize.ts (server-only)
  schemas/  contact.ts (zod, sunucu) · contact-fields.ts (tarayıcı, zod'suz)
  enhance/  ui-state (üstbilgi arka planı, mobil yapışkan CTA) · reveal (ekran altı giriş animasyonu, Motion) · smooth-scroll (Lenis, yalnızca masaüstü)
  motion/   tokens (süre, eğri, kelime gecikmesi) · ease (cubic-bezier fonksiyonu)
  i18n-paths.ts   dil önekli yollar (next-intl'in istemci çalışma zamanı olmadan)
messages/   en.json tr.json
i18n/       routing.ts · request.ts
proxy.ts    hız sınırı + CSP nonce + dil yönlendirmesi (Next 16'da "middleware" yeni adıyla "proxy")
docs/adr/   mimari kararlar: 0001 CSP report-only · 0002 lansman dilleri ve pazar · 0003 Showcase filmi · 0004 hareket ve kaydırma · 0005 Blueprint, Faz 4 (briefing) ve Faz 5 (7 dil) planı (karar bekliyor)
public/fonts/ Inter alt kümeleri (OFL)   public/media/showcase/ render edilmiş film dosyaları   assets/og-inter-600.ttf
remotion/   Render kaynağı, siteye girmez: kompozisyon, yazı tipi yükleyici, CLI girişi (2 dil × 2 oran = 4 kompozisyon)
scripts/    check-messages · check-fonts · smoke · audit-secrets · lemon-style-hash · build-og-font · render-film
```

### Tasarım sistemi ("Quiet Luxury Noir")

Tüm tasarım belirteçleri **tek yerde**: [`app/globals.css`](app/globals.css) içindeki `@theme` bloğu ve `@utility text-*` tipografi ölçeği (Tailwind v4, CSS-first). Eski `tailwind.config.js` Faz 2'de kaldırıldı. Kural kaynağı CLAUDE.md'deki "Tasarım tokenları" ve "Tipografi" bölümleridir.

| Katman | Belirteçler | Örnek |
|---|---|---|
| Renk | `obsidian` #0D0D0E (zemin, saf siyah değil) · `layer-1` #141416 · `layer-2` #1A1A1E · `platin` #E2E2E6 (metin) · `muted` #9A9A9F · `champagne` #D4C5A9 (yalnızca birincil CTA ve tekil vurgular) | `bg-obsidian` `text-muted` |
| Çizgi (hairline) | `hairline` beyaz %6 · `hairline-strong` beyaz %16. Çıplak `border` da `hairline` rengini alır | `border-hairline` |
| Tipografi | `text-display` · `text-headline` · `text-title` · `text-lead` · `text-spec-value` · `text-spec-label` · `text-micro`: boyut + ağırlık (yalnızca 400/500) + satır yüksekliği + iz aralığı birlikte. İz aralığı yalnızca dört değer: display −0,02em · başlık −0,01em · gövde 0 · mikro +0,01em | `text-headline` |
| Boşluk | `--space-section` · `mt-block` (başlık → içerik) · `--space-gutter` · `measure` (paragraf satırı) · `--max-container` | `mt-block` |
| Şekil, hareket | `rounded-sharp` 2 px · `rounded-sharp-lg` 4 px · `--ease-lux` | `rounded-sharp` |

Notlar: (1) Yazı tipi şimdilik Inter (SIL OFL); marka yazı tipi Satoshi'nin web lisansı ve Türkçe glifleri doğrulanana kadar geçicidir (CLAUDE.md "Tipografi"). `font-synthesis: none` sayesinde sahte kalın/italik üretilmez. (2) Glow, gradyan, dekoratif gölge, hap buton ve film greni yoktur. (3) `lib/utils.ts` içindeki `cn()` `text-*` boyutlarını tanır; `globals.css`'e yeni bir `@utility text-*` eklerseniz oradaki listeye de ekleyin, yoksa tailwind-merge onu "metin rengi" sanıp `text-platin` ile birlikte kullanıldığında siler.

---

## 3. Güvenlik modeli (OWASP odaklı)

**Başlıklar** (`next.config.mjs`, her yanıtta): `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `Cross-Origin-Opener-Policy: same-origin-allow-popups` (3-D Secure/PayPal pencereleri için). `X-Powered-By` kapalı.

**Content-Security-Policy** (`lib/security/csp.ts`, `proxy.ts` her sayfa isteğinde üretir). **Şimdilik `Content-Security-Policy-Report-Only` olarak gönderilir:** tarayıcı politikayı tam uygular ve her ihlali `/api/csp-report`'a bildirir ama hiçbir şeyi engellemez. Enforce'a geçiş Faz 7'de, `CSP_MODE=enforce` ortam değişkeniyle (kod değişikliği gerekmez); gerekçe ve ölçütler [ADR 0001](docs/adr/0001-csp-report-only.md).
- `script-src 'self' 'nonce-…' 'strict-dynamic'`: satır içi betikler **yalnızca** o isteğin nonce'unu taşıyorsa çalışır. `unsafe-inline`/`unsafe-eval` yok.
- Üçüncü taraf olarak yalnızca `lemonsqueezy.com`: betik (`assets.lemonsqueezy.com`) ve ödeme iframe'i (`*.lemonsqueezy.com`).
- `style-src` nonce + **bir tam hash**: Lemon.js'in yükleyici `<style>`'ı (`npm run check:csp-hash` ile doğrulanır). Remotion Player kalktığı için ikinci hash yok.
- `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'self'`, `report-uri /api/csp-report`. `upgrade-insecure-requests` yalnızca enforce kipinde ve üretimde HTTPS ise gönderilir (report-only'de tarayıcılar bu yönergeyi yok sayar).
- **Rapor alıcısı** (`app/api/csp-report/route.ts`): `204` döner, gövde ≤ 8 KB, en fazla 10 rapor işler ve sunucu günlüğüne rapor başına tek satır JSON yazar. Yalnızca yönerge, engellenen/belge/kaynak adresi (sorgu dizesi ve parça atılır) ve satır/sütun tutulur; politika metni, betik örneği, IP ve User-Agent tutulmaz.
- **Report-only iken:** CSP enjekte edilmiş bir betiği engellemez. XSS savunması React'in kaçışına, DOMPurify'a ve kullanıcı HTML'i render etmemeye dayanır. Tıklama hırsızlığına karşı zorunlu `X-Frame-Options` çalışır.
- **Bedeli:** nonce her istekte değiştiği için sayfalar istek başına render edilir (CDN'de HTML önbelleğe alınamaz). Marka sitesi için ölçülen sunucu yanıtı ≈ 90–170 ms (Faz 2 ölçümü, yerel `next start`: TTFB ≈ 65–70 ms, [docs/perf/faz2-baseline.md](docs/perf/faz2-baseline.md)). Önbellekli statik HTML isterseniz CSP `'unsafe-inline'` ile gevşetilmelidir; bunu yapmanızı önermiyorum.

**Hız sınırı** (`lib/security/rate-limit.ts`): `/api/*` + `/og` için 30 istek/dk/IP, sayfalar için 240/dk/IP (`proxy.ts`), iletişim formu için ayrıca **5 gönderim/10 dk/IP**. Aşılınca `429` + `Retry-After`. Depolama: `UPSTASH_REDIS_REST_URL/TOKEN` tanımlıysa Redis (IP **SHA-256'lanır**), yoksa süreç belleği. **Dürüst sınır:** Vercel gibi sunucusuz ortamda bellek tabanlı sayaç örnek başınadır, yani en iyi çaba. Gerçek koruma için Upstash ekleyin. Dağıtık (L7 DDoS) saldırıya karşı asıl savunma platformdur: Vercel Firewall / Cloudflare WAF. Uygulama katmanı bunun yerine geçmez.

**Girdi savunması** (`app/api/contact/route.ts`): yalnızca POST + JSON, `Origin` host'u ile eşleşmeli (yoksa 403), `Sec-Fetch-Site: cross-site` reddedilir, gövde ≤ 8 KB (hem başlık hem gerçek okuma), **zod `strictObject`** (bilinmeyen alan reddedilir), honeypot + "anında gönderim" tuzağı (bota başarı gibi yanıt), ardından **DOMPurify (jsdom)**:
- HTML-benzeri işaretleme (`<script>`, `<img onerror>`, kapatılmamış `<svg>` …) **açıkça reddedilir** (422 `invalid` → kullanıcı "desteklenmeyen karakterleri kaldırın" görür). Sessizce silinmez: ayrıştırıcı kapatılmamış `<svg` sonrası metni yutar ve ziyaretçi mesajının yarısını kaybederdi.
- `Ad <ad@firma.com>` ve `<https://…>` zararsız biçimleri düz metne çevrilir.
- Kontrol karakterleri ve görünmez/çift yönlü ("Trojan Source") karakterler silinir, kalan `<` `>` atılır.
- Teslimat: `CONTACT_WEBHOOK_URL` (yalnızca `https://`, loopback hariç), yönlendirme izlenmez (SSRF), isteğe bağlı **HMAC-SHA256** imzası `x-syncflow-signature`.

**Sırlar:** `CONTACT_WEBHOOK_*` ve `UPSTASH_*` `NEXT_PUBLIC_` önekli değildir; `lib/server/*` `server-only` ile işaretlidir (bir istemci bileşeni içe aktarırsa derleme kırılır). `npm run audit:secrets` derleme çıktısını tarar; sahte "kanarya" değerleriyle derleyip sızıntı olmadığını ve denetimin gerçek bir sızıntıyı yakaladığını kanıtladım.

**Bilinçli kararlar / dikkat:** HSTS `preload` jetonu yalnızca *uygunluk* bildirir; `hstspreload.org`'a başvurursanız tüm alt alan adları kalıcı olarak HTTPS olmak zorundadır. Lemon.js üçüncü taraf bir betiktir (sayfa yüklendikten sonra boşta yüklenir); ödeme pencerelerinde LS'nin kendi güvenlik politikası geçerlidir.

---

## 4. Yerelleştirme (i18n)

- Yönlendirme `i18n/routing.ts` (`localePrefix: 'as-needed'`): EN `/`, TR `/tr`. Dili **yalnızca URL** belirler: çerez yok, tarayıcı diline (`Accept-Language`) göre yönlendirme yok. İkisi birlikte kapalıdır, çünkü çerez olmadan algılama, Türkçe bir tarayıcıda "EN"i seçen ziyaretçiyi `/`'tan tekrar `/tr`'ye atardı. Bilinmeyen dil kodu (`/de`) 404 döner. Gerekçe: [ADR 0002](docs/adr/0002-launch-locales-and-market.md).
- Çeviriler **sunucuda** yapılır (fiyat biçimi dahil: `$2,500`, `$2.500`: her dilin CLDR kuralı). Tarayıcıya yalnızca birkaç düz metin gider (`components/i18n/ClientI18n.tsx`), next-intl'in ICU motoru tarayıcıya **gitmez** (~13 KB gzip kazanç). Dil önekli yollar `lib/i18n-paths.ts` ile üretilir (next-intl'in `createNavigation`'ı, yani istemci çalışma zamanı, bilerek kullanılmaz).
- `hreflang` (HTML + `Link` başlığı + sitemap), `x-default`, dil başına canonical, `og:locale`.
- Dil seçici: giriş-çıkışta yumuşak geçiş, ok tuşları/Home/End/Esc, `lang=""` ile anadilde adlar, `#anchor`'ı korur. Seçimi çereze **yazmaz**.

**Yeni dil eklemek** (yerel çeviri ve hukuk incelemesi bittikten sonra): `messages/xx.json` (en.json ile aynı anahtarlar) → `i18n/routing.ts` `locales` + `LOCALE_LABELS` → `npm run check` → yazı tipi kapsamı için `python scripts/check-fonts.py` (eksik harf varsa alt kümeyi yeniden üretin, bkz. dosya başlığı) → `remotion/Root.tsx` `MESSAGES` ve `scripts/render-film.mjs` `LOCALES` listelerine ekleyip `npm run film:render` → Arapça gibi sağdan sola bir dil için `app/[locale]/layout.tsx` içindeki `dir`'i dile bağlayın.

---

## 5. Hareket

Faz 2'de eski animasyon katmanı ve `framer-motion` kaldırıldı; Faz 3 hareketi yeniden, bu kez ölçülü kurallarla getirdi ([ADR 0004](docs/adr/0004-motion-and-smooth-scroll.md)). Üç ilke: içerik sunucuda render edilir ve JS yokken tamamen görünür; hareket onun üstüne eklenen bir katmandır; yalnızca `transform` hareket eder (maske statik bir `clip-path`'tir).

- **Hero başlığı:** kelime kelime maskenin altından yükselir. Kelimeler sunucuda bölünür (`components/ui/MaskText.tsx`), animasyonu CSS oynatır (`mask-rise`): ilk boyamadan itibaren, JS'siz, hidrasyonu ya da bir parçayı beklemeden.
- **Ekranın altındaki başlık ve paragraflar:** ekran dışındayken betik gizler (`.is-armed`), girişte bir kez yükselir (`lib/enhance/reveal.ts`, `motion/mini`). İlk ekrandaki hiçbir şeye dokunulmaz. Motion, ziyaretçinin ilk kaydırma, tıklama, dokunma ya da tuşunda indirilir (4,7 KB gzip); yavaşsa ya da inmezse metin hemen gösterilir.
- **Yumuşak kaydırma (Lenis):** yalnızca fare benzeri işaretçide (`(hover: hover) and (pointer: fine)`) ve azaltılmış hareket yokken; `import('lenis')` ayrı bir parça (5,3 KB gzip), dokunmatik cihazlar hiç istemez. Süre 1,2 sn, eğri `cubic-bezier(.16, 1, .3, 1)`. Aynı sayfa bağlantıları (`/#pricing`, `#showcase`) aynı eğriyle kayar, sabit üstbilgi payı CSS'teki `scroll-padding-top`'tan gelir, adres ve odak yerel sıçramadaki gibi güncellenir. Ödeme overlay'i açıkken durur. Başvuru akışında (Faz 6) kapalı olmalıdır (CLAUDE.md).
- **Azaltılmış hareket:** Lenis ve giriş animasyonları başlamaz, hero CSS'i devre dışıdır; ayar sayfa açıkken açılırsa Lenis kapanır ve her şey hemen görünür.
- **Ekran dışında durma:** sürekli (`infinite`) CSS animasyonu taşıyan öğe `data-pause-offscreen` alır; görünür alanın dışındayken `IntersectionObserver` onu durdurur (`lib/enhance/ui-state.ts`). Showcase filmi de aynı şekilde görünür ≥ %30 iken oynar, uzaklaşınca durur.
- **Harf harf bölme yapılmaz** (kerning bozulur, DOM şişer, ekran okuyucu zorlanır); bölme kelime düzeyindedir.

`lenis` ve `motion` yalnızca `import()` ile kullanılabilir. `faz2-denetim.mjs` statik import'u hata sayar ve `--build` sonrası rotanın ilk yük parçalarında ikisinin de olmadığını doğrular. Henüz yapılmayanlar (karar bekliyor): cam kenarlık `#ffffff1a`, kart "Border Beam", imleci izleyen ışık; ADR 0004'te.

---

## 6. Remotion ve Showcase filmi

Sitede **Remotion çalışma zamanı yok**: Showcase'in mimari filmi önceden render edilmiş dosyalardır ([ADR 0003](docs/adr/0003-showcase-film-static-render.md)). `remotion` yalnızca geliştirme bağımlılığıdır; `remotion/` altındaki kompozisyonu `scripts/render-film.mjs` ile render etmek içindir.

- **Kaynak:** `remotion/ArchitectureComposition.tsx` her şeyi **kareden** hesaplar (zamanlayıcı, `Math.random`, `Date` yok). Üç sahne × 5 sn = 15 sn döngü: mimari · hız bütçesi · 14 günlük plan. İki tuval: 16:9 (1280×720) ve telefon için 4:5 (800×1000). Metinler sitenin kendi `messages/<dil>.json` dosyalarından gelir. `remotion/fonts.ts` sitenin Inter dosyalarını Remotion tarayıcısına yükler (yoksa film sistem yazı tipine düşerdi).
- **Çıktı:** `public/media/showcase/architecture-<en|tr>-<wide|tall>.{mp4,webm,webp}`: H.264 MP4 (tercih edilen), VP9 WebM (H.264'süz tarayıcılar için yedek) ve WebP poster (mimari sahnenin tam çizilmiş hali, kare 118). Dosya boyutları: ADR 0003.
- **Oynatma** (`components/showcase/ShowcaseFilm.tsx`): HTML'de yalnızca poster gelir. Fare cihazlarında film ekranın %30'u göründüğünde başlar, kaydırılınca durur. Dokunmatik cihazlarda, `prefers-reduced-motion` ve Save-Data'da **hiçbir şey indirilmez ve otomatik oynamaz**; ziyaretçi Oynat'a (ya da bir sahne sekmesine) basınca video yüklenir. Sekmeler sahnenin başına sarar. Çerçevenin oranı sabittir (CLS 0).
- **Hız bütçesi sahnesindeki değerler (LCP < 1,2 sn, CLS < 0,01, TBT < 100 ms, Lighthouse 95+) hedeftir, ölçüm değildir**; sayfada da böyle yazar (`Showcase.note`).
- **Geçicidir:** film önceki görünümü ve eski teklifin içeriğini (14 günlük plan, ödeme düğümü) taşır; Faz 5'te vitrinle birlikte yeniden tasarlanır.
- **Lisans:** Remotion yalnızca ≤ 3 kişilik kâr amaçlı şirketlerde/bireylerde ücretsizdir; **4+ kişilik şirketler için ücretli Company License gerekir** (remotion.pro). Render almak da lisans kapsamındadır. `acknowledgeRemotionLicense` bilinçli olarak sizin yerinize işaretlenmedi.

### Filmi yeniden üretmek
```bash
npm run film:render                       # her şey (~10 dk): 4 kompozisyon × (MP4 + WebM + poster)
npm run film:render -- --posters          # yalnızca posterler (hızlı)
npm run film:render -- --only=tr-tall     # tek kompozisyon
npm run remotion:studio                   # kompozisyonu tarayıcıda düzenle
```
Metin (`messages/*.json` içindeki `Showcase.scene`) ya da kompozisyon değişince komutu çalıştırıp çıkan dosyaları commit'leyin. Remotion CLI her seferinde `npx` ile, kurulu `remotion` sürümüyle getirilir (projeye eklenmez). "zod sürüm uyuşmazlığı" uyarısı zararsızdır: kompozisyonda zod şeması yoktur.

---

## 7. Lemon Squeezy ödeme

- `components/checkout/LemonSqueezy.tsx`, `lemon.js`'i `next/script` (`lazyOnload`, **nonce'lu**) ile yükler. Her `a[data-checkout]` gerçek bir bağlantıdır; JS kapalıyken veya betik yüklenmeden tıklanırsa barındırılan ödeme sayfası açılır. Betik hazırsa **koyu overlay** açılır (`?embed=1&dark=1`).
- Erişilebilirlik: overlay açıkken arka sayfa `inert`, odak overlay'e taşınır, kapanınca tetikleyen düğmeye döner, kaydırma kilitlenir.
- Lemon.js'in kendi `.lemonsqueezy-button` bağlayıcısı kullanılmaz (React yeniden çizimlerinde çift bağlama riski); tek bir olay delegasyonu kullanılır.
- **Mağaza şu an TEST MODUNDA** (ödeme sayfasında turuncu "Test mode is currently enabled" şeridi var). Yayına almadan önce Lemon Squeezy panelinde canlı moda geçin, ardından canlı ürünün buy-linkini `NEXT_PUBLIC_CHECKOUT_URL` ile verin.
- Denemelerimde `dark=1` parametresi ödeme sayfasını koyu yapmadı: LS, `/checkout/buy/…` isteğini parametresiz `/checkout/cart/<id>` adresine 302 ile yönlendiriyor ve tema aynı açık kaldı. Bu LS tarafında bir davranış; panelden ödeme teması ayarına bakın.

---

## 8. Performans

Ayrıntı, yöntem ve ham koşular: [docs/perf/faz2-baseline.md](docs/perf/faz2-baseline.md) (Faz 2 sonu başlangıcı, 07.10.2026) ve [docs/perf/faz3.md](docs/perf/faz3.md) (Faz 3: paket kapısı, Lighthouse A/B, kare ritmi, telefon probu, 08.10.2026). Faz 3'te mobil ilk yükleme JS'i 155 → 157 KB, Lighthouse medyanı tabanın altına inmedi (fark ölçülebilir değil), mobil LCP ≈ 2,7–2,8 sn aynı kaldı. Aşağıdaki tablo Faz 2 başlangıcıdır. Özet: medyan, üretim derlemesi (`next start`), Lighthouse 13.5, mobil profil (simüle yavaş 4G, 4× CPU yavaşlatma).

| Sayfa | Performans (aralık) | FCP | LCP | TBT (aralık) | CLS | İlk yükleme JS (gzip) |
|---|---|---|---|---|---|---|
| Mobil EN `/` | **95** (87–96) | 1,0 sn | 2,8 sn | 147 ms (58–373) | 0 | 155 KB |
| Mobil TR `/tr` | **90** (84–95) | 0,9 sn | 2,8 sn | 274 ms (82–482) | 0 | 155 KB |
| Masaüstü EN `/` | **100** (99–100) | 0,3 sn | 0,6 sn | 22 ms (5–89) | 0 | 155 KB |

Erişilebilirlik, en iyi uygulamalar ve SEO her koşuda 100. **Mobil LCP hedefin (≤ 2,5 sn) üstünde**; bu Faz 4 kapısının işidir. Mobil puan ve TBT koşular arasında savruluyor, bu yüzden tek koşuya değil medyana ve aralığa bakın.

Faz 2 öncesi sürümle (aynı makinede, aynı oturumda, aralıklı koşularla) karşılaştırma: ilk yükleme JS'i mobilde 180 → 155 KB, masaüstünde 275 → 155 KB; mobil puan farkı ölçüm gürültüsünün içinde. Telefonda filme kaydırınca eski Player +95 KB JS indirir ve yedi saniyede ≈ 3,2 sn betik çalıştırırdı (4× CPU yavaşlatma); yeni sayfa poster halinde ≈ 0,03 sn betik ve 0 KB JS, Oynat'a basılınca ≈ 0,19 sn betik ve 645 KB video.

> **Yerel ölçümün sınırı:** `next start` HTTP/1.1 + gzip sunar. Vercel gibi bir ortamda HTTP/2 + Brotli olur; Lighthouse'ın simülasyonu bunu hesaba katar, yani canlıda aynı veya daha iyi çıkması beklenir. Bunu canlı adreste PageSpeed Insights ile doğrulayın (footer'daki "Test this page on PageSpeed" bağlantısı bunun içindir).

İlk yükleme JS'i 155 KB gzip (Faz 3'te 157 KB); CLAUDE.md ~150 KB tavan önerir. `motion` ve `Lenis` yalnızca masaüstünde ve dinamik import ile eklendi; mobil ilk yükte olmadıkları paket analizcisiyle her `--build`'de doğrulanır. Faz 2 öncesi sürümün tablosu `git show e498e98:README.md` içinde.

---

## 9. Dağıtım

- **Vercel:** Hobby planı yalnızca **ticari olmayan** kullanıma açıktır; ticari site için **Pro** gerekir. Çalışma zamanı Node 22/24. Ortam değişkenleri: `NEXT_PUBLIC_SITE_URL=https://syncflow.agency`, `CONTACT_WEBHOOK_URL`, `CONTACT_WEBHOOK_SECRET`, `UPSTASH_REDIS_REST_URL/TOKEN`.
- Vercel *Preview* dağıtımlarında Vercel'in kendi araç çubuğu betiği CSP'ye takılır (konsolda hata görürsünüz); üretimi etkilemez, istenirse proje ayarlarından araç çubuğunu kapatın.
- Cloudflare Pages/Workers'ta çalıştırmak için OpenNext adaptörü gerekir (bu projede denenmedi).
- `NEXT_PUBLIC_SITE_URL` canonical/hreflang/OG/sitemap'i belirler. Yanlışsa SEO bozulur.

---

## 10. Yayın öncesi kontrol listesi

- [ ] **Lemon Squeezy'yi canlı moda alın** ve checkout URL'sini doğrulayın (§7).
- [ ] **Yasal sayfalar:** `messages/*.json` → `Legal.*` içindeki `[KÖŞELİ PARANTEZ]` alanlarını doldurun, bir avukata inceletin; `npm run check:messages -- --strict` hata vermeyene kadar. Sayfa üstündeki "Taslak" uyarısı (`Legal.draft`) yayından önce kaldırılmalı.
- [ ] **`CONTACT_WEBHOOK_URL`** ayarlayın (n8n/Make/Zapier/CRM). Ayarlı değilse üretimde form `503` döner ve ziyaretçiye "geçici olarak kullanılamıyor" der.
- [ ] **İçeriği onaylayın (taslaktır):** paket kapsamı (`Pricing.i1–i6`), SSS yanıtları (özellikle "kaynak kodu size ait", "kapsam dışı iş önceden fiyatlanır"), süreç adımları (Gün 1/5/10/14), "Guaranteed 14-Day Delivery" için **gecikme halinde ne olacağını (iade/kredi) tanımlayıp yayınlayın**; şartsız "garanti" AB/Birleşik Krallık/ABD tüketici/ticaret hukukunda yanıltıcı sayılabilir.
- [ ] **Karşılaştırma tablosu:** "$20k+", "3 aylık gecikme", "yavaş WordPress" genellemelerdir. Sayfada "tipik piyasa rakamları" uyarısı var; AB'de karşılaştırmalı reklam kuralları (Yönerge 2006/114/EC) nesnel ve doğrulanabilir olmayı ister, gerekirse kaynak gösterin.
- [ ] `NEXT_PUBLIC_SITE_URL` üretim alan adı. Search Console'a `sitemap.xml`.
- [ ] Remotion lisansı (4+ kişiyseniz).
- [ ] `npm run check`, `npm run build`, `npm start`, `npm run smoke`, `npm run audit:secrets`.

---

## 11. Doğrulama sonuçları (Faz 2, 07.10.2026)

Hepsi `faz_2` dalındaki son kodla (`d981af8`), üretim derlemesi üzerinde alındı: Windows 11, Node 24.12, Chrome 154.

| Denetim | Sonuç |
|---|---|
| `node faz2-denetim.mjs --build` | **0 hata**: 42 geçti, 1 uyarı, 4 bilgi. Uyarı `generateStaticParams` yok: nonce'lu CSP sayfaları zaten istek başına render ettiği için bilinçli ([ADR 0001](docs/adr/0001-csp-report-only.md)). `npm run build` başarılı |
| `npm run check` | Çeviri eşitliği (2 dil × 199 anahtar) · `tsc` 0 hata · ESLint 0 hata, 0 uyarı |
| `npm run smoke` | **87/87** (yerel sahte webhook alıcısıyla): güvenlik başlıkları, report-only CSP + nonce, hreflang, JSON-LD, TR/EN, `/de` `/fr` `/it` 404, çerez yok ve yönlendirme yok, 5 işaretleme saldırısının reddi, HMAC imzası, 12 film dosyası (içerik türü, byte-range, önbellek), CSP rapor alıcısı (204/415/400/413/405), hız sınırı (429), `/og` görseli |
| Tarayıcı testi (Chrome 154, `puppeteer-core`; betik depoda yok) | **32/32**: telefon (dokunmatik) ve masaüstü (fare); telefonda film yüklenmez, Oynat'a basınca MP4 oynar, sekmeler sahneye sarar; masaüstünde görününce oynar, kaydırınca durur; azaltılmış harekette oynamaz; JS kapalıyken poster görünür; dil seçici çerez yazmaz; CSP ihlali 0, konsol hatası 0; 390 ve 320 px'de yatay taşma yok; tarayıcıya inen hiçbir betikte "remotion" geçmez |
| `npm run audit:secrets` | Test değerleriyle denendi: 27 tarayıcı dosyasında 4 sır adı + 2 sır değeri **yok**; bilerek bir sızıntı yerleştirince denetim başarısız oldu (çıkış 1) |
| Lighthouse | [docs/perf/faz2-baseline.md](docs/perf/faz2-baseline.md) |
| `npm run film:render` | 12 dosya, 5.005 KB (§6, [ADR 0003](docs/adr/0003-showcase-film-static-render.md)) |

### Faz 3 (08.10.2026, `faz_3` dalı)

| Denetim | Sonuç |
|---|---|
| `node faz2-denetim.mjs --build` | **0 hata**: 52 geçti, 1 uyarı, 3 bilgi (Faz 2'ye göre +10 hareket denetimi). Uyarı aynı: `generateStaticParams` yok, bilinçli. `npm run build` başarılı; ilk yük parçalarında `lenis` ve `motion` yok |
| `npm run smoke` | **87/87** (sahte webhook alıcısıyla) |
| Tarayıcı testi (Chrome 154, `puppeteer-core`; betik depoda yok) | **41/41**: Lenis yalnızca fare benzeri işaretçide, telefonda parça hiç istenmez; maskeli girişler (hero CSS, ekranın altı Motion); azaltılmış hareket; JS kapalıyken tüm metin görünür; Faz 2 ile birebir aynı sayfa yüksekliği ve başlık kutuları; ekran dışında animasyon ve film durur |
| Paket kapısı | rotanın 5 ilk yük dosyasında `lenis` ve `motion` yok; lazy parçalar 5,3 ve 4,7 KB gzip |
| Lighthouse, kare ritmi, telefon probu | [docs/perf/faz3.md](docs/perf/faz3.md) |

**Faz 3'te doğrulanmayanlar:** 120 Hz ekran · kısıtlı CPU'da kilitli 60 FPS (ölçüm tersini gösteriyor, bkz. faz3.md) · gerçek telefon · Safari/Firefox · sakin makinede kesin Lighthouse farkı (gürültü, bkz. faz3.md §5).

**Önceki sürümde yapılıp bu sürümde tekrarlanmayanlar:** gerçek Lemon Squeezy overlay'ini açıp kapatma, iletişim formunu tarayıcıda uçtan uca deneme, 12 farklı genişlikte yatay taşma taraması (yalnızca 390 ve 320 px bakıldı).

**Doğrulanmayanlar (dürüstçe):** gerçek bir ödeme (mağaza test modunda, para çekmedim) · canlı alan adında PageSpeed/CrUX · Vercel dağıtımı · Upstash ile paylaşımlı hız sınırı · gerçek webhook alıcısı (yerel taklit alıcıyla denendi) · Safari/Firefox (yalnızca Chrome) · gerçek telefon (iPhone ve orta segment Android; Faz 7 kapısı).

## 12. Üçüncü taraf lisanslar

Inter (SIL OFL 1.1, `public/fonts/OFL.txt`) · Next.js, React, next-intl, zod, DOMPurify, jsdom, lucide-react, Tailwind CSS (MIT/Apache/MPL, bkz. paketler) · Remotion (yalnızca film render'ı için, özel lisans, §6) · Lemon.js (Lemon Squeezy, yalnızca ödeme için yüklenir).
