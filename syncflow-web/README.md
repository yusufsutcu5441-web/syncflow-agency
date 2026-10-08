# SyncFlow Kurumsal Vitrin

Özel sağlık, gayrimenkul, hukuk, kurumsal danışmanlık, mimarlık ve yüksek bütçeli B2B hizmet markaları için "ziyaretçiyi saniyeler içinde müşteriye dönüştüren" web sistemlerini satan SyncFlow'un kendi sitesi. Saf statik HTML + Tailwind CSS v4 (derlenmiş) + ~7 KB gzip JS (Motion mini dahil). Çalışma zamanı çerçevesi, çerez ve görsel (`<img>`) yok.

## Hızlı başlangıç

```powershell
# 1) Önizleme (proje kökünden)
python -m http.server 5173        # http://localhost:5173
# index.html'e çift tıklamak da çalışır (404.html hariç)

# 2) Yer tutucuları doldur (WhatsApp numarası, alan adı, telefon)
node scripts/fill.mjs --wa=905321234567 --domain=syncflow.com.tr --tel="+90 532 123 45 67"

# 3) Yayın öncesi kontrol (bütçe, yer tutucu, token/senaryo/çip eşitliği, ikon, kırık bağlantı, klinik ifadeleri)
node scripts/check.mjs --strict
```

## Derleme (CSS + JS)

`assets/css/main.css` ve `assets/js/main.js` repoda **derlenmiş hazır gelir**; yayın için build gerekmez. Tasarımı (Tailwind sınıfları, `src/styles/input.css`) ya da davranışı (`src/js`, `src/core`) değiştirirseniz yeniden derleyin:

```powershell
npm install          # node_modules oluşturur: tailwindcss, esbuild, motion
npm run build        # build:css + build:js
npm run dev          # CSS izleme   |   npm run dev:js  # JS izleme
```

- **CSS** Tailwind v4, **JS** esbuild ile `src/js/main.js` → `assets/js/main.js` (IIFE, minify, es2020). Motion yalnızca `animate()` ile pakete girer (~3,4 KB gzip). Lisans bildirimi: `THIRD-PARTY-NOTICES.txt`.
- **OneDrive uyarısı:** Bu klasör OneDrive içindeyse `node_modules` yüzlerce dosyayı senkronlar; projeyi OneDrive dışına taşıyın ya da paketleri başka bir klasöre kurup şunları verin: `NODE_PATH=<klasör>\node_modules` (esbuild ve motion oradan çözülür) ve `SF_JS_OUT=<çıktı yolu>` (sonra `assets/js/main.js` üzerine kopyalayın). Tailwind'in standalone (Bun) ikilisi de OneDrive klasörüne yazarken `EEXIST: mkdir` hatası verebilir; çıktıyı OneDrive dışına alıp kopyalayın.
- Yayından önce `node scripts/check.mjs`: paketlerin kaynaklardan eski olup olmadığını (`derleme güncelliği`) ve sayfadaki "ölçüldü" rakamlarının bayatlayıp bayatlamadığını söyler.

## Mimari ve animasyonlar

| Katman | Dosya | Rol |
|---|---|---|
| Paylaşılan çekirdek | `src/core/tokens.js`, `src/core/scenarios.js` | Marka renkleri/easing/süreler ve WhatsApp sohbet senaryoları. **Saf veri** (DOM yok): site ve Remotion aynı dosyayı kullanır |
| Talep akışı | `src/js/lead.js` | Hazır WhatsApp mesajı, seçim çipleri, alttan açılan form, sabit çubuk, UTM, webhook |
| Sohbet simülatörü | `src/js/chat-sim.js`, `src/js/sims.js` | `scenarios.js` zaman çizelgesini Motion (WAAPI) ile oynatır: gelen mesaj → "yazıyor…" → yanıt → rozet |
| Kaydırmayla belirme | `src/js/reveal.js` | Fade-up + kademeli (stagger) belirme; `data-reveal` ve `data-stagger` |
| Hover / glow | `src/styles/input.css` | Yalnızca CSS (transform + box-shadow), yalnızca fare olan cihazlarda |

Motion, Framer Motion'ın React'sız DOM motorudur (`motion/mini` aslında `framer-motion/dom/mini`'yi dışa aktarır). Framer Motion'ın React sürümü bu statik site için React + derleme sistemi + onlarca KB demek olurdu; mini sürüm 3,4 KB'tır.

**Performans ve erişilebilirlik kuralları (bozmayın):**

1. Yalnızca `opacity`, `translate`, `scale` animasyonu yapılır; düzen kayması (CLS) üretecek hiçbir şey animasyona girmez. Sohbet alanı ve "Sizin Sektörünüz" önizlemesi sabit boyutlu kutulardır, gizli öğeler yerini korur.
2. **Hero metinleri animasyonsuzdur** (LCP, FCP, Speed Index). Yalnızca telefon maketi kısa bir CSS girişi alır.
3. **Süs animasyonları ilk boyamadan sonra başlar** (`src/js/main.js` içindeki `afterPaint`). Bu kuralın nedeni ölçülmüş bir hatadır: `initReveal` ilk boyamadan önce `getBoundingClientRect()` okuyunca ilk sayfa düzenini script'in içinde tetikledi (4× yavaş CPU'da 254 ms zorunlu reflow); Performans 100'den 97'ye, TBT 0'dan 100 ms'ye, Speed Index 0,9 sn'den 4,2 sn'ye geriledi. Düzeltmeden sonra tekrar 100/100/100/100.
4. Yalnızca ilk görünümün **altındaki** öğeler gizlenir ve bu JS çalışınca yapılır; JS yüklenmezse hiçbir şey gizli kalmaz. `prefers-reduced-motion`'da hiçbir animasyon çalışmaz, son durum görünür.
5. Otomatik hareket ~4 sn sürer ve döngüye girmez (WCAG 2.2.2). Sektör senaryoları yalnızca kullanıcı seçince oynar.
6. Motion mini notu: gecikmeli animasyonlarda **ilk kare bekleme süresince de uygulanır** (backwards fill). Aynı öğede iki gecikmeli animasyon yerine tek animasyon + `times` kullanın (bkz. "yazıyor…" göstergesi).

### "Sizin Sektörünüz" kartı ve yeni sektör eklemek

Kart, seçilen sektörün senaryosunu (`scenarios.js`) önizlemede oynatır ve WhatsApp mesajına `Sektör: …` ekler. Yeni sektör için:

1. `src/core/scenarios.js` içine senaryoyu ekleyin (adım sırası: `in > typing > out > tag`).
2. `index.html` içindeki **üç** çip grubuna (kapanış formu, alttan açılan form, "Sizin Sektörünüz") aynı etiketi ekleyin; "Sizin Sektörünüz" çipine `data-scenario="<id>"` verin.
3. `npm run build`, ardından `node scripts/check.mjs` (çip eşitliğini ve senaryo geçerliliğini doğrular).

## Remotion (otomatik video demoları)

`remotion/` klasörü siteden **bağımsızdır** ve aynı `src/core` senaryo/token verisinden 9:16 video üretir. Kurulum, komutlar ve doğrulama durumu için `remotion/README.md`. **Lisans uyarısı:** Remotion 3 kişiye kadar şirketlerde ve bireylerde ücretsizdir; 4+ kişilik kâr amaçlı şirketlerde ücretli Company License gerekir ([güncel şartlar](https://www.remotion.dev/docs/license/pricing)).

## Yer tutucular

| Yer tutucu | Nerede | Ne yazılacak |
|---|---|---|
| `905XXXXXXXXX` | tüm HTML (`<body data-wa>`, `wa.me`, `tel:`) | WhatsApp numarası, `90` ile başlayan 12 hane, `+`/boşluk yok |
| `__DOMAIN__` | canonical, OG, JSON-LD, robots, sitemap, e-posta | alan adı, `https://` ve `/` olmadan |
| `+90 5XX XXX XX XX` | kapanış bölümü, klinik demosu | görünen telefon |
| `data-endpoint=""` | `<body>` | n8n / Make webhook adresi (aşağıya bak) |
| `data-cal=""` | `<body>` (yalnızca `index.html`) | Cal.com / Calendly bağlantısı; doluysa "Takvimden saat seç" görünür |
| `[...]` köşeli parantezler | `kvkk/index.html` | şirket ünvanı, adres, hukuki sebep, saklama süresi (avukat onayıyla) |
| "Kapsama göre teklif" | `index.html` paketler | fiyat vermek istersen paket kartlarındaki `price` satırı |

`check.mjs --strict` doldurulmamış yer tutucu varsa hata verir.

## Talep akışı ve webhook (CRM)

1. Ziyaretçi sektörünü (ya da hizmet/bölge/bütçeyi) seçer, **WhatsApp'ta Başlat**'a dokunur. Mesaj hazır gelir: seçimler + kaynak (UTM / yönlendiren site) + sayfa. Form yok.
2. `data-endpoint` doluysa, tıklamada **kişisel veri içermeyen** bir niyet olayı (`{type, sektör/hizmet, pkg, src, page, t}`) POST edilir (`no-cors`, `text/plain` gövde). n8n/Make'te "Webhook" düğümüyle yakalayıp CRM'e/Telegram'a/e-postaya aktarabilirsin.
3. Webhook kullanırsan CSP'ye origin'i ekle: `_headers` ve `vercel.json` içinde `connect-src 'self'` → `connect-src 'self' https://webhook-adresin.com`.
4. WhatsApp tarafında **WhatsApp Business** karşılama mesajını aç; "60 saniyede ilk yanıt" vaadi ancak anlık bildirim + gerçek yanıtla (ya da otomatik karşılamayla) karşılanabilir. Karşılayamayacağın vaadi sitede bırakma.

Faz 2 fikirleri: Pages Function ile `/api/lead` + Cloudflare Turnstile, EN sürüm (`/en/`, hreflang), "Ücretsiz Analiz" için otomatik hız karnesi.

## Yayın

- **Cloudflare Pages (önerilen):** ücretsiz plan, statik istekler sınırsız, Türkiye'den İstanbul (IST) PoP'una düşer. Git deposunu bağla; *Framework preset: None*, *Build command: boş*, *Build output directory: `/`*. Panelde ayarları yayın sırasında doğrula. `_headers` otomatik uygulanır. Çerezsiz ölçüm için Pages → Analytics → Web Analytics'i aç. Ticari kullanım için Cloudflare Hizmet Şartları'nı kontrol et.
- **Vercel:** Hobby planı yalnızca ticari olmayan kişisel kullanıma açıktır; hizmet satışını tanıtan bu site ticari sayılır, **Pro plan gerekir** ([Fair Use](https://vercel.com/docs/limits/fair-use-guidelines)). *Framework: Other*, build komutu boş, çıktı dizini `.`. `vercel.json` başlıkları uygular.
- Alan adı bağlayınca `node scripts/fill.mjs --domain=...` ile canonical/OG/sitemap'i güncelle, Search Console'a `sitemap.xml`'i ver.

## Ölçümler (Ekim 2026)

Lighthouse 13.5 mobil (simüle Slow 4G, 4× CPU), `_headers` + gzip uygulayan yerel sunucuda:

| Sayfa | Performans | Erişilebilirlik | En iyi uyg. | SEO | FCP | LCP | TBT | CLS | Speed Index |
|---|---|---|---|---|---|---|---|---|---|
| Ana sayfa | 100 | 100 | 100 | 100 | 0,9 sn | 1,4 sn | 0 ms | 0 | 0,9 sn |
| Klinik demosu | 100 | 100 | 100 | 63* | 0,9 sn | 1,4 sn | 0 ms | 0 | 0,9 sn |
| Gayrimenkul demosu | 100 | 100 | 100 | 63* | 0,9 sn | 1,4 sn | 0 ms | 0 | 0,9 sn |

\* Demolar bilinçli olarak `noindex` (kurgusal içerik); Lighthouse'un tek düşen denetimi `is-crawlable`.

Bütçe (gzip): HTML ≤12 KB · CSS ≤15 KB · JS ≤12 KB · fontlar ≤50 KB · ilk yükleme ≤120 KB. Gerçek değerler: HTML 7,9 · CSS 7,4 · JS 7,1 · fontlar 47,9 · toplam ~70 KB. Ek olarak Puppeteer ile 175 otomatik denetim yapıldı: sabit çubuk hizası ve ikonlar, hero sohbetinin zamanlaması, "Sizin Sektörünüz" etkileşimi, kaydırmayla belirme, azaltılmış hareket, JS kapalı görünüm, 17 genişlikte yatay taşma, her iki ekran boyutunda CLS = 0. Canlıya aldıktan sonra gerçek ağdan ölçmek için [PageSpeed Insights](https://pagespeed.web.dev/) kullanın.

## Düzenlemeye tabi sektörler için not

- **Özel sağlık:** 12 Kasım 2025'ten beri yürürlükteki Sağlık Hizmetlerinde Tanıtım ve Bilgilendirme Faaliyetleri Hakkında Yönetmelik (RG 33075; m.5/1-m ücret/indirim/kampanya, m.5/1-k rızasız ileti, m.5/1-i ücretli sponsorlu arama görünürlüğü, m.7 önce-sonra görseller). `demo/klinik/` bu çerçeveye göre kurgulanmıştır ve `check.mjs` demodaki yasaklı ifadeleri tarar.
- **Hukuk:** Avukatlık Kanunu m.55 iş elde etmeye yönelik reklam sayılabilecek her türlü girişimi yasaklar ve TBB Reklam Yasağı Yönetmeliği internet sitelerini de kapsar. Hukuk bürosu müşterilerinde agresif talep toplama dili, "ücretsiz görüşme" gibi çağrılar ve karşılaştırmalı iddialar uygun olmayabilir; içerik bilgilendirme odaklı kurgulanmalı ve baro/hukuk danışmanı onayıyla yayınlanmalıdır. Bu sitenin kendi pazarlama dili SyncFlow'a aittir; müşteri sitelerine olduğu gibi taşınmamalıdır.
- Bunlar bilgilendirmedir, **hukuki danışmanlık değildir**; müşteri sitelerini yayına almadan önce avukat onayı alın.

## Yapı

```
index.html            ana sayfa (Hero → Sorun/Çözüm → Demolar → Paketler → CTA)
demo/klinik|gayrimenkul/   kurgusal demolar (noindex)
kvkk/index.html       aydınlatma metni iskeleti (noindex, taslak)
404.html              kök-mutlak yollar kullanır (her URL'de servis edilir)
src/core/             paylaşılan saf veri: tokens.js, scenarios.js
src/js/               main, lead, chat-sim, sims, reveal, motion (esbuild kaynağı)
src/styles/input.css  Tailwind v4 tokenları (Navy/Teal) ve bileşenler
assets/               css (derlenmiş), js (derlenmiş), fonts (Plus Jakarta Sans, OFL), img
remotion/             video demoları (siteden bağımsız, kendi README'si)
scripts/              check.mjs (yayın öncesi kontrol), fill.mjs (yer tutucu), build-js.mjs (esbuild)
_headers · vercel.json   güvenlik ve önbellek başlıkları (Cloudflare / Vercel)
THIRD-PARTY-NOTICES.txt  Motion (MIT) ve font lisansları
```

Font: Plus Jakarta Sans (variable), SIL Open Font License 1.1, `assets/fonts/LICENSE-OFL.txt`.
