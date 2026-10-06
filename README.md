# SyncFlow Agency: syncflow.agency

Yüksek bütçeli B2B markalar için "Quiet Luxury Noir" kurumsal vitrin.
**Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind v4 · next-intl (5 dil) · Framer Motion · Remotion Player · Lemon Squeezy · nonce tabanlı sıkı CSP**

| | |
|---|---|
| Diller | EN (varsayılan, `/`), TR `/tr`, DE `/de`, FR `/fr`, IT `/it` |
| Satış akışı | Tek CTA "Start Project — $2,500" → Lemon Squeezy koyu overlay ödeme |
| Bölümler | Hero · Showcase (canlı Remotion kompozisyonu) · Karşılaştırma (Contrast Grid) · Fiyat · SSS · İletişim · Footer |
| Güvenlik | HSTS, CSP (nonce + strict-dynamic), XFO, nosniff, Referrer/Permissions-Policy, hız sınırı, zod + DOMPurify, sunucuya özel sırlar |

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
| `npm run check:messages` | 5 dilde anahtar/yer tutucu/etiket eşitliği (`--strict`: yasal sayfalardaki `[YER TUTUCU]`'lar da hata) |
| `npm run check:fonts` | Mesajlardaki her karakter yazı tipi dosyalarında var mı (Python + `pip install fonttools brotli`) |
| `npm run check:csp-hash` | Lemon.js'in eklediği `<style>` hash'i güncel mi |
| `npm run smoke` | **Çalışan** sunucuya karşı 78 HTTP güvenlik/işlev kontrolü (aşağıda) |
| `npm run audit:secrets` | `build` sonrası: sunucu sırları tarayıcıya giden dosyalara sızmış mı |
| `npm run dev:inbox` | Yerel taklit "gelen kutusu" (`127.0.0.1:4011`): formdan gelen kayıtları ekrana yazar. Sunucuyu `CONTACT_WEBHOOK_URL=http://127.0.0.1:4011/lead` ile başlatın (PowerShell: `$env:CONTACT_WEBHOOK_URL='http://127.0.0.1:4011/lead'; npm start`) |
| `npm run remotion:studio / :still / :render` | Aynı kompozisyonu Remotion ile videoya/görsele çevirir (bkz. §8) |

---

## 2. Klasör yapısı

```
app/
  [locale]/layout.tsx      <html lang>, CSP nonce okuma, Lemon.js (next/script), JSON-LD, metadata
  [locale]/page.tsx        ana sayfa (sunucu bileşeni, bölümler)
  [locale]/privacy|imprint yasal sayfa taslakları (noindex)
  api/contact/route.ts     iletişim formu API'si (Node runtime)
  og/route.tsx             paylaşım görseli (GET /og?locale=tr)
  globals.css              tasarım belirteçleri, @font-face, bileşen sınıfları
  robots.ts · sitemap.ts · manifest.ts · icon.svg
components/
  layout/  Header · Footer · StickyCta · LanguageSwitcher(client)
  sections/ Hero · Showcase · Comparison · Pricing · Faq · Contact · ContactForm(client) · LegalPage
  remotion/ ArchitectureComposition (kare tabanlı, saf) · ShowcasePlayer(client) · ArchitecturePlayer · config
  checkout/ LemonSqueezy(client): lemon.js + overlay erişilebilirliği
  i18n/     ClientI18n (tarayıcıya giden minik bağlam) · ui/ Logo, CheckoutLink, Magnetic, SectionHead
lib/
  security/ csp.ts · rate-limit.ts      server/ deliver.ts · sanitize.ts (server-only)
  schemas/  contact.ts (zod, sunucu) · contact-fields.ts (tarayıcı, zod'suz)
  enhance/  reveal · magnetic · cursor · scroll-line · ui-state   (Framer Motion DOM motoru)
messages/   en.json tr.json de.json fr.json it.json
i18n/       routing.ts · request.ts
proxy.ts    hız sınırı + CSP nonce + dil yönlendirmesi (Next 16'da "middleware" yeni adıyla "proxy")
public/fonts/ Inter alt kümeleri (OFL)    assets/og-inter-600.ttf (paylaşım görseli yazı tipi)
remotion/   Remotion CLI girişi (5 dil × 2 oran = 10 kompozisyon)
scripts/    check-messages · check-fonts · smoke · audit-secrets · lemon-style-hash · build-og-font
```

---

## 3. Güvenlik modeli (OWASP odaklı)

**Başlıklar** (`next.config.mjs`, her yanıtta): `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `Cross-Origin-Opener-Policy: same-origin-allow-popups` (3-D Secure/PayPal pencereleri için). `X-Powered-By` kapalı.

**Content-Security-Policy** (`lib/security/csp.ts`, `proxy.ts` her sayfa isteğinde üretir):
- `script-src 'self' 'nonce-…' 'strict-dynamic'`: satır içi betikler **yalnızca** o isteğin nonce'unu taşıyorsa çalışır. `unsafe-inline`/`unsafe-eval` yok.
- Üçüncü taraf olarak yalnızca `lemonsqueezy.com`: betik (`assets.lemonsqueezy.com`) ve ödeme iframe'i (`*.lemonsqueezy.com`).
- `style-src` nonce + **iki tam hash**: Lemon.js'in yükleyici `<style>`'ı ve Remotion Player'ın eklediği `<style>`. Remotion hash'i her derlemede kurulu sürümden **otomatik hesaplanır** (`next.config.mjs`), Lemon hash'i `npm run check:csp-hash` ile doğrulanır.
- `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'self'`, üretimde HTTPS ise `upgrade-insecure-requests`.
- **Bedeli:** nonce her istekte değiştiği için sayfalar istek başına render edilir (CDN'de HTML önbelleğe alınamaz). Marka sitesi için ölçülen sunucu yanıtı ≈ 90–170 ms. Önbellekli statik HTML isterseniz CSP `'unsafe-inline'` ile gevşetilmelidir; bunu yapmanızı önermiyorum.

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

- Yönlendirme `i18n/routing.ts` (`localePrefix: 'as-needed'`). İlk ziyarette tarayıcı diline göre yönlendirme yapılır; seçim **`NEXT_LOCALE` çerezinde 1 yıl** saklanır (işlevsel çerez, izleme yok).
- Çeviriler **sunucuda** yapılır (fiyat biçimi dahil: `$2,500`, `$2.500`, `2.500 $`, `2 500 $`, `2500 $`: her dilin CLDR kuralı). Tarayıcıya yalnızca birkaç düz metin gider (`components/i18n/ClientI18n.tsx`), next-intl'in ICU motoru tarayıcıya **gitmez** (~13 KB gzip kazanç).
- `hreflang` (HTML + `Link` başlığı + sitemap), `x-default`, dil başına canonical, `og:locale`.
- Dil seçici: giriş-çıkışta yumuşak geçiş, ok tuşları/Home/End/Esc, `lang=""` ile anadilde adlar, seçimi çereze yazar, `#anchor`'ı korur.

**Yeni dil eklemek:** `messages/xx.json` (en.json ile aynı anahtarlar) → `i18n/routing.ts` `locales` + `LOCALE_LABELS` → `npm run check` → yazı tipi kapsamı için `python scripts/check-fonts.py` (eksik harf varsa alt kümeyi yeniden üretin, bkz. dosya başlığı) → `remotion/Root.tsx`'e `MESSAGES` ekleyin.

---

## 5. Animasyon sistemi

Hepsi **Framer Motion**'ın motorudur (`framer-motion/dom`: yay fiziği, `springValue`, `styleEffect`, `scroll`), ama React bileşeni olarak değil, ilk boyamadan **sonra** ve tarayıcı boştayken ayrı bir parçada yüklenen DOM iyileştirmeleri olarak (`lib/enhance/`). Neden: hidrasyon maliyeti sıfır, LCP/TBT'ye dokunmaz, JS kapalıyken içerik görünür.

- **Scroll reveal:** yalnızca ekran *altındaki* öğeler gizlenir (hero asla), yay fiziğiyle girer, sonunda satır içi stiller temizlenir. Düzen okuması yok (zorunlu reflow yok), yalnızca opacity/transform → CLS 0.
- **Manyetik buton:** `springValue` ile imleci takip eder, bırakınca yaylanarak döner. Yalnızca fare/kalem.
- **Özel imleç:** nokta + yaylı halka, tıklanabilirlerin üzerinde büyür. Yerel imleç **gizlenmez**.
- **Sıvı çizgi:** sol kenarda sayfa ilerlemesini yaylı izleyen ince çizgi (masaüstü).
- **Spotlight:** kartlarda imleci izleyen monokrom parıltı (saf CSS + 2 değişken).
- `prefers-reduced-motion`: reveal, imleç, çizgi, otomatik oynatma kapanır; içerik anında görünür.

---

## 6. Remotion

`components/remotion/ArchitectureComposition.tsx` her şeyi **kareden** hesaplar (zamanlayıcı, `Math.random`, `Date` yok), bu yüzden tarayıcıdaki Player ile `remotion render` aynı kareyi üretir. Üç sahne × 5 sn = 15 sn döngü: mimari (düğümler, bağlantı çizgileri, ışık paketleri, yazılan kod) · hız bütçesi (halkalar, sayaçlar) · 14 günlük plan. İki tuval: 16:9 (1280×720) ve telefon için 4:5 (800×1000).

- Player, bölüm ekrana yaklaşınca **tembel** yüklenir (ayrı ~94 KB gzip parça), yalnızca görünürken oynar, sekmeler `seekTo` ile sahne seçer, oynat/duraklat/yeniden başlat gerçek ve etiketli düğmelerdir, ekran okuyucu için metin açıklaması vardır.
- **Hız bütçesi sahnesindeki değerler (LCP < 1,2 sn, CLS < 0,01, TBT < 100 ms, Lighthouse 95+) hedeftir, ölçüm değildir**; sayfada da böyle yazar.
- **Lisans:** Remotion yalnızca ≤ 3 kişilik kâr amaçlı şirketlerde/bireylerde ücretsizdir; **4+ kişilik şirketler için ücretli Company License gerekir** (remotion.pro). `acknowledgeRemotionLicense` bilinçli olarak sizin yerinize işaretlenmedi.

### Videoya çevirme
```bash
npm run remotion:studio     # tarayıcıda önizleme/ayar
npm run remotion:still      # remotion-out/architecture-en.png (kare 290)
npm run remotion:render     # remotion-out/architecture-en.mp4 (15 sn, 30 fps)
# başka dil/oran: ... render remotion/index.ts Architecture-tr-tall out.mp4
```
Kimlikler: `Architecture-<en|tr|de|fr|it>-<wide|tall>`. Metinler sitenin kendi `messages/*.json` dosyalarından gelir. Not: CLI altında site CSS'i yoktur; Inter yoksa sistem sans kullanılır. Birebir yazı tipi için `@remotion/fonts` ile `public/fonts/inter-latin-v1.woff2` yükleyin.

---

## 7. Lemon Squeezy ödeme

- `components/checkout/LemonSqueezy.tsx`, `lemon.js`'i `next/script` (`lazyOnload`, **nonce'lu**) ile yükler. Her `a[data-checkout]` gerçek bir bağlantıdır; JS kapalıyken veya betik yüklenmeden tıklanırsa barındırılan ödeme sayfası açılır. Betik hazırsa **koyu overlay** açılır (`?embed=1&dark=1`).
- Erişilebilirlik: overlay açıkken arka sayfa `inert`, odak overlay'e taşınır, kapanınca tetikleyen düğmeye döner, kaydırma kilitlenir.
- Lemon.js'in kendi `.lemonsqueezy-button` bağlayıcısı kullanılmaz (React yeniden çizimlerinde çift bağlama riski); tek bir olay delegasyonu kullanılır.
- **Mağaza şu an TEST MODUNDA** (ödeme sayfasında turuncu "Test mode is currently enabled" şeridi var). Yayına almadan önce Lemon Squeezy panelinde canlı moda geçin, ardından canlı ürünün buy-linkini `NEXT_PUBLIC_CHECKOUT_URL` ile verin.
- Denemelerimde `dark=1` parametresi ödeme sayfasını koyu yapmadı: LS, `/checkout/buy/…` isteğini parametresiz `/checkout/cart/<id>` adresine 302 ile yönlendiriyor ve tema aynı açık kaldı. Bu LS tarafında bir davranış; panelden ödeme teması ayarına bakın.

---

## 8. Performans

Ölçüm yöntemi: `next start` üretim sunucusu, Lighthouse 13.5 **mobil** profil (simüle yavaş 4G, 4× CPU yavaşlatma), İngilizce sayfa.

| Sayfa | Performans | Erişilebilirlik | En İyi Uygulamalar | SEO | FCP | LCP | TBT | CLS | Hız İndeksi |
|---|---|---|---|---|---|---|---|---|---|
| **Masaüstü** EN | **100** | 100 | 100 | 100 | 0,3 sn | 0,6 sn | 20 ms | **0** | 0,5 sn |
| **Mobil** EN | **95** | 100 | 100 | 100 | 1,0 sn | 2,7 sn | 140 ms | **0** | 1,0 sn |
| **Mobil** TR | **96** | 100 | 100 | 100 | 1,0 sn | 2,7 sn | 90 ms | **0** | 1,0 sn |
| **Mobil** DE | **95** | 100 | 100 | 100 | 1,0 sn | 2,7 sn | 140 ms | **0** | 1,0 sn |

İlk yükleme: HTML 15 KB + CSS 8 KB + font 42 KB + JS 185 KB (gzip). SEO 100 için yerel derleme `NEXT_PUBLIC_SITE_URL=http://localhost:3000` ile alındı (canonical başka bir alan adını gösterirse Lighthouse düşürür; gerçek alan adında bu sorun yoktur).

> **Yerel ölçümün sınırı:** `next start` HTTP/1.1 + gzip sunar. Vercel gibi bir ortamda HTTP/2 + Brotli olur; Lighthouse'ın simülasyonu bunu hesaba katar, yani canlıda aynı veya daha iyi çıkması beklenir. Bunu canlı adreste PageSpeed Insights ile doğrulayın (footer'daki "Test this page on PageSpeed" bağlantısı bunun içindir).

Neden mobil 100 değil: Next.js 16 + React 19 çalışma zamanı tek başına ≈ 164 KB gzip JS'tir; JS tamamen engellendiğinde aynı sayfa Lighthouse'ta **100** (LCP 1,8 sn, TBT 10 ms) alır. Yani kalan puan framework'ün maliyetidir, sayfanın değil. Bunu azaltmak için yaptıklarım: zod ve next-intl ICU motoru ve tailwind-merge tarayıcıdan çıkarıldı (başlangıç JS'i **299 → 185 KB**), Remotion/Framer parçaları tembel, yazı tipleri 2 dosya (Latin 42 KB ön yüklenir, Türkçe harfler için 3 KB yalnızca `/tr`'de), Next'in aynı sayfaya `Link` önceden yüklemeleri kapalı.

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

## 11. Doğrulama sonuçları (bu sürüm)

| Denetim | Sonuç |
|---|---|
| `next build` (Turbopack) | Hatasız, uyarısız. TypeScript strict, `noUncheckedIndexedAccess` |
| `npm run check` | Çeviri eşitliği (5 dil × 200 anahtar) · `tsc` 0 hata · ESLint (React Compiler kuralları dahil) 0 hata |
| `npm run smoke` | **78/78**: güvenlik başlıkları, nonce'un her betikte ve her istekte farklı olması, hreflang, JSON-LD, 5 dilde fiyat biçimi, 5 işaretleme saldırısının reddi, zararsız metnin korunması, HMAC imzası, hız sınırı (429), 5 dilde `/og` görseli |
| Tarayıcı testi (Chrome, Puppeteer) | **56/56**: masaüstü + mobil + hareket azaltma + JS kapalı; dil değiştirme ve çerez kalıcılığı; manyetik buton/imleç; Remotion otomatik oynatma/sekmeler/duraklat; gerçek Lemon Squeezy overlay açma-kapama (`inert`, odak dönüşü); iletişim formu uçtan uca; 12 genişlik × 5 dilde yatay taşma yok; CSP ihlali 0, konsol hatası 0, hidrasyon hatası 0, CLS < 0,01 |
| `npm run audit:secrets` | Kanarya değerlerle derlendi: 29 tarayıcı dosyasında 4 sır adı + 4 sır değeri **yok**; bilerek sızıntı koyunca denetim başarısız oldu (çıkış 1) |
| Remotion CLI | `remotion still` ile kare üretimi doğrulandı (bkz. §6) |

**Doğrulanmayanlar (dürüstçe):** gerçek bir ödeme (mağaza test modunda, para çekmedim) · canlı alan adında PageSpeed/CrUX · Vercel dağıtımı · Upstash ile paylaşımlı hız sınırı (kod yolu mock'sız, yazılı ama canlı bir Redis'e karşı denenmedi) · gerçek webhook alıcısı (yerel taklit alıcıyla denendi) · Safari/Firefox (yalnızca Chrome).

## 12. Üçüncü taraf lisanslar

Inter (SIL OFL 1.1, `public/fonts/OFL.txt`) · Next.js, React, next-intl, Framer Motion, zod, DOMPurify, jsdom, lucide-react, Tailwind CSS (MIT/Apache/MPL, bkz. paketler) · Remotion (özel lisans, §6) · Lemon.js (Lemon Squeezy, yalnızca ödeme için yüklenir).
