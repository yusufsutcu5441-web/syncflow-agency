# syncflow.agency
High-ticket dijital mühendislik stüdyosu sitesi. Sessiz lüks: Porsche sakinliği + Ferrari sinematik ışığı.
Son güncelleme: 07.10.2026. Bu dosya kısa tutulur; ayrıntılar docs/ altına taşınır ve @docs/... ile içe aktarılır.

## Niş (değişmez)
Yüksek bütçeli elit markalar için hızlı, mevzuata duyarlı, sessiz lüks web sistemleri. Yalnızca 3 sektör:
1. Özel sağlık ve klinikler (estetik, diş, tüp bebek, özel tedaviler)
2. Lüks gayrimenkul ve mimarlık (Boğaz hattı, lüks portföy, iç mimarlık)
3. Kurumsal hukuk ve danışmanlık büroları
Yavaş, ucuz, şablon iş yapmayız. Bu 3 sektör dışında sayfa, demo veya metin ekleme.

## Kararlar ve açık konular (açık olanları Claude Code KENDİSİ DONDURMAZ, kullanıcıya sorar)
- KARAR VERİLDİ (07.10.2026) Fiyat: yurt dışı başlangıç tabanı $10.000; Türkiye ₺100.000–₺500.000+. Avrupa için € karşılığı henüz tanımlanmadı (öneri: $10.000'ın güncel kur karşılığı, çeyrekte bir gözden geçirme); tanımlanana kadar Avrupa fiyatı yayınlanmaz. Tek kaynak dosyası henüz yok (kodda hâlâ eski $2.500 teklifi var: `lib/site.ts`); Faz 5–6'da oluşturulur. Yol açık: repoda `src/` yok, öneri `lib/pricing.ts`. Başvuru bütçe aralıkları da buradan gelecek.
- KARAR VERİLDİ (07.10.2026) Lansman dilleri: TR + EN. DE, FR, ES, AR, JA mimaride hazır bekler; her biri yerel çeviri ve hukuk incelemesinden sonra açılır. UYGULANDI (Faz 2): `routing.locales = ['en','tr']`; çerez ve tarayıcı dili yönlendirmesi kapalı, dili yalnızca URL belirler (docs/adr/0002).
- Kapasite cümlesi: "ayda 3" mü "çeyrekte 3" mü? Yalnızca gerçekse yayınlanır.
- "SyncFlow" ad/marka sorgusu sonucu (kullanıcı yürütüyor). Satoshi yalnızca arayüz yazı tipidir; Fontshare EULA'sının web yayınına izni doğrulanmalı.
- KARAR VERİLDİ (07.10.2026) CSP: Faz 7'ye kadar `Content-Security-Policy-Report-Only`; `CSP_MODE=enforce` ile enforce edilir (docs/adr/0001).
- KARAR VERİLDİ (07.10.2026) Showcase filmi: önceden render edilmiş MP4/WebM + poster (`public/media/showcase/`); tarayıcıda Remotion çalışmaz, `remotion` yalnızca geliştirme bağımlılığıdır (docs/adr/0003).
- AÇIK: varsayılan dil. `/` şu an İngilizce, Türkçe `/tr`. Türkiye ilk pazarsa varsayılan TR olabilir; sahibi karar verir (docs/adr/0002).

## Tasarım tokenları (pazarlığa kapalı)
- Zemin #0D0D0E; katmanlar #141416 ve #1A1A1E. Saf siyah, bembeyaz blok, neon, turkuaz, lacivert YASAK.
- Tipografi rengi mat platin #E2E2E6; aksan şampanya #D4C5A9 (yalnızca birincil CTA ve tekil vurgular); çizgi rgb(255 255 255 / 0.06).
- Köşe 2–4 px. Hap buton, glow, dekoratif gölge ve gradyan yok. Işık ve atmosfer gerçek render/fotoğraftan gelir, CSS efektinden değil.
- Bölüm ayrımı yalnızca ton farkı ve boşlukla.
- Hero başlığı en fazla 2 satır; ürün/sistem ilk ekranda tek kahraman.

## Tipografi
- Tek aile: Satoshi (yedek Instrument Sans). Satoshi'nin Arapça ve Japonca glifleri DOĞRULANMADI: AR ve JA için ayrı OFL font yığını, o diller açılırken seçilir (lansmanda yok).
- Ağırlık yalnızca 400 ve 500. İtalik yok. Arayüzde büyük harf yok (`text-transform: uppercase` yasak); majüskül yalnızca çizilmiş SYNCFLOW wordmark'ta.
- Tracking: display -0.02em, başlık -0.01em, gövde 0, mikro +0.01em. Başka değer yok.
- Ölçek: display 88/44 px (akıcı) · bölüm başlığı 56/32 · başlık 28/22 (500) · lead 20/17 · gövde 16 · spec değeri 40/28 (500, tabular) · spec etiketi 14 · mikro 12 · buton 15 (500).
- Sola hizalı. Satır uzunluğu 45–62 karakter. Vurgu renkle ya da tek kelime kalınlaştırmayla değil, boşlukla.
- Türkçe: İ ı Ş ş Ğ ğ Ç ç Ö ö Ü ü ₺ glif testi geçmeden font kesinleşmez. `lang` özniteliği doğru olmalı.
- Font dosyaları public repoya commit edilmez (.gitignore).

## Logo
Platin tek renkli amblem (6×6 ızgara, yalnızca 90° ve 45°, tek sürekli yol) + özel çizim, monoline SYNCFLOW wordmark (eğriye çevrilmiş SVG). Mevcut turkuaz/mavi logo kaldırılır. KARAR VERİLDİ (07.10.2026): monogram B1 (chevron-S) ve wordmark Özel Çizim v2 KİLİTLENDİ; B2, A ve Satoshi wordmark elendi. Marka paketi `brand/`; logoda canlı yazı tipi kullanılmaz. Ad/marka sorgusu kullanıcı tarafından yürütülüyor; sonuç gelmeden nihai değildir.

## Motion
- Yalnızca transform ve opacity. Layout özelliği animasyonlanmaz.
- Lenis yalnızca `(hover: hover) and (pointer: fine)` ve azaltılmış hareket yokken, dinamik import ile; duration 1.2, easing cubic-bezier(.16, 1, .3, 1). Dokunmatikte native scroll, parallax kapalı. Başvuru akışında smooth scroll yok.
- `motion/react` ile LazyMotion + `m.*`. Maskeli satır girişi tek seferlik. `prefers-reduced-motion` her yerde desteklenir.
- İlk gizli durum JS yokken içeriği gizlememeli. Ağır sahneler `next/dynamic`. İlk sürümde WebGL yok.

## Performans (mobil orta segment, 4G throttle, production build)
LCP ≤ 2,5 sn · CLS ≤ 0,1 · INP ≤ 200 ms. İlk rota JS tavanı öneri: ~150 KB gzip (build'de ölçülür). Spec sheet değerleri yalnızca ölçülmüş olabilir (RUM veya Lighthouse + tarih + kaynak); ölçülene kadar "ölçülecek" yazılır. Yeni bağımlılık eklemeden önce paket boyutu etkisi raporlanır.

## Güvenlik (hedef: OWASP Top 10 / ASVS'ye göre kontrol listesi)
- Başlıklar: CSP, HSTS (preload öncesi koşulları kontrol et), X-Frame-Options DENY + CSP `frame-ancestors 'none'`, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy.
- CSP stratejisi Faz 2'de ADR ile belirlenir: nonce tabanlı CSP genellikle dinamik render gerektirir (statik/edge cache ile çatışır); animasyon kütüphanelerinin satır içi stilleri ve Turnstile kaynakları da hesaba katılır. Claude Code güncel Next.js 16 CSP dokümanını okuyup öneri sunar.
- Formlar: honeypot, Cloudflare Turnstile (sunucuda doğrula), IP tabanlı rate limit (platform güvenlik duvarı veya Upstash vb.), şema doğrulama (zod), origin kontrolü, hata mesajlarında ayrıntı sızdırma yok.
- Sırlar yalnızca sunucu ortam değişkenlerinde. Gmail kimlik bilgisi Next uygulamasında tutulmaz: başvuru → imzalı (HMAC) webhook → n8n → Gmail.
- "Aşılmaz", "tam uyumlu", "%100 güvenli" gibi ifadeler hiçbir sayfada kullanılmaz.

## Dil ve mevzuat
- "Ajans / web tasarımcısı" dili yok; dijital mühendislik stüdyosu tonu. Kanıtsız küresel otorite iddiası ve üstünlük sıfatları yok.
- Hiçbir sayfa "%100 uyumlu", "yasal riski sıfır", "garanti" demez. Uyum müşterinin içeriğine ve operasyonuna bağlıdır; dil "uyum odaklı kurgu, yayın öncesi hukuk müşaviri onayı" biçimindedir.
- Sağlık demoları: fiyat, indirim, kampanya, önce-sonra, hasta yorumu, üstünlük iddiası yok; iletişimi hasta başlatır (Sağlık Hizmetlerinde Tanıtım ve Bilgilendirme Yönetmeliği, 12.11.2025).
- Hukuk: iş elde etmeye yönelik reklam sayılabilecek ifade yok (Avukatlık Kanunu m.55, TBB Reklam Yasağı Yönetmeliği).
- KVKK/GDPR: işaretsiz açık rıza kutusu, aydınlatma metni, çerezsiz analitik, veri minimizasyonu, saklama süresi, yurt dışı aktarım notu (Turnstile, Gmail, n8n). Hukuki metinler yayın öncesi avukata onaylatılır.

## i18n ve pazar
- `next-intl`, `messages/{locale}.json`; kodda sabit metin yok. Yol tabanlı yönlendirme, `hreflang`; IP'ye göre zorla yönlendirme yok (yalnızca öneri).
- Dil ile pazar (para birimi) ayrı kavramlardır; seçim URL'de tutulur, çerez yok. Para biçimi `Intl.NumberFormat`.
- RTL (ar) için mantıksal CSS özellikleri (margin-inline-start vb.) baştan kullanılır. Yeni dil = yerel çeviri + hukuk incelemesi (ör. sağlık reklamı kuralları ülkeye göre değişir).

## Başvuru protokolü
4 filtre adımı (sektör, karar yetkisi, zamanlama, yatırım aralığı) + iletişim ve rıza ekranı. Ekran başına tek soru, 60 saniyenin altında. Bütçe aralıkları pazara göre `pricing.ts`'ten gelir. Çıkışlar: yüksek (anında e-posta/WhatsApp + takvim), orta (24 saatte elle inceleme), düşük (nazik ret + kaynak). Kapasite sayacı yalnızca gerçek veriyle.

## Çalışma kuralları
- Karmaşık işe plan modunda başla, planı göster, onay bekle. Güncel Next.js 16, next-intl ve Tailwind v4 dokümanlarını oku; sürüme özgü dosya adlarını tahmin etme.
- Her fazdan sonra: `npm run build`, lint, production build üzerinde Lighthouse (başka ağır süreç çalışmıyorken). Ham skorları cihaz profili ve throttling ayarıyla raporla.
- Doğrulamadığın şeyi "geçti" diye raporlama; hangi rotada, hangi ortamda test ettiğini yaz.
- `.env`, font dosyaları ve sırlar commit edilmez.

## Faz planı
F0 Karar dondurma (kapasite cümlesi ve ad sorgusu açık) · F1 Logo ve tipografi (TAMAM: B1 + özel çizim v2) · F2 Next.js 16 / Tailwind v4 (KAPI GEÇİLDİ 07.10.2026, `faz_2` dalı, main'e birleştirme bekliyor; denetim: kökteki `faz2-denetim.mjs --build` 0 hata; tokenlar `app/globals.css` içinde `@theme`; kararlar `docs/adr/0001–0003`; performans başlangıcı `docs/perf/faz2-baseline.md`) · F3 Motion ve scroll · F4 Hero · F5 Spec sheet ve vitrin · F6 Başvuru, n8n, Gmail · F7 Güvenlik sıkılaştırma doğrulaması, çeviri ve hukuk incelemesi · F8 Vercel ve lansman
