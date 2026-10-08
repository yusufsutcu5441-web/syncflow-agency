# syncflow.agency
Yüksek bütçeli markalar için dijital mimari stüdyosu sitesi. Görsel dil "Dark Monolith & Fluid Precision": obsidian zemin, cam yüzeyler, ince çizgiler, ölçülü ışık ve akıcı hareket; renk ve marka sistemi B1/v2 (docs/adr/0007).
Son güncelleme: 08.10.2026. Bu dosya kısa tutulur; ayrıntılar docs/ altına taşınır.

## Kaynak sırası
1. **`syncflow-blueprint.docx` ("Ana Sayfa Blueprint")** ana sayfanın mimarisi, tasarımı ve metin ritmi için esastır (sahibi onayladı, 08.10.2026, docs/adr/0005 ve 0006).
2. Bu dosya Blueprint'in dokunmadığı kuralları ve onaylı sapmaları taşır. İkisi çelişirse bu dosyadaki **onaylı sapmalar** kazanır, çünkü her biri bir gerçeklik, hukuk ya da güvenlik gerekçesine dayanır.
3. Açık kalan her şeyi Claude Code KENDİSİ DONDURMAZ, kullanıcıya sorar.

## Onaylı sapmalar (Blueprint'ten bilerek ayrılınan yerler)
- **Ölçülmemiş metrik yayınlanmaz.** "Kilitli 60 FPS", "120 Hz", "LCP < 1,2 sn", "TBT < 50 ms", "ilk 400 ms", "INP < 100 ms", "AV1", "adaptif bitrate" ve kartlardaki "+%212" benzeri örnek yüzdeler çıkarıldı. Yayındaki her sayı `lib/metrics.ts` içinde değer + tarih + profil + kaynakla durur; ölçülmeyen "ölçülecek" yazar.
- **Sağlıkta önce-sonra galerisi, fiyat, hasta yorumu ve üstünlük iddiası yok** (Sağlık Hizmetlerinde Tanıtım ve Bilgilendirme Yönetmeliği, 12.11.2025). Klinik kartının metninden "önce-sonra galerileri" çıkarıldı.
- **Briefing formunda rıza, Turnstile ve honeypot var** (KVKK/GDPR, aşağıda). "Üçüncü taraflarla paylaşılmaz" cümlesi doğru olmadığı için (işleyiciler: Cloudflare, n8n, Gmail) işleyicileri açıkça adlandıran metinle değişti. Karar yetkisi sorusu 4. ekranda.
- **Vitrin kartları "konsept render"dir**, gerçek müşteri işi değil; kartta öyle yazar. "View Case" bağlantısı yok (vaka sayfası yok), yerine Briefing'e bağlantı var.
- **Showcase yatay şeridi scroll-jacking yapmaz:** yerel `scroll-snap` şeridi + düğmeler (dokunmatikte yerel kaydırma kuralı).
- **Dil ve küresel erişim bölümü yok (2B-2, docs/adr/0009):** Blueprint'in küre, yedi şehir ve yedi dilli cümle bölümü kalktı; site Türkçe ve İngilizce odaklıdır ve yedi dil, "küresel erişim" ya da "Worldwide" iddiası yapmaz (denetim FAIL sayar).
- **Logo (2B-1, docs/adr/0007):** B1 monogram + özel çizim v2 wordmark (`brand/`, eğriye çevrilmiş SVG). Blueprint'in metinle yazılmış "syncflow.agency" wordmark'ı ve `.agency` soluk eki kalktı: marka kuralı logoya ek, gölge, gradyan ya da canlı yazı tipi koymaz. Header'da yatay kilit, footer'da %6 opaklıkta dev çizili wordmark (dekoratif, `aria-hidden`).
- **Dil yayını:** altyapı yedi dili taşır (`en tr de fr es ar ja`), ama de/fr/es/ar/ja çevirileri **uykuda TASLAKTIR** ve hiçbir ortamda varsayılan olarak açılmaz: **her ortamda yalnızca `NEXT_PUBLIC_LAUNCHED_LOCALES` (varsayılan `en,tr`) yayınlanır** (hreflang, sitemap, dil seçici, footer, 404); geliştirme sunucusu da öyle. Taslakları okumak için `NEXT_PUBLIC_PREVIEW_LOCALES=1`. Bir dili listeye eklemek yerel çeviri ve hukuk incelemesinden sonra, sahibinin onayıyla yapılır. Taslaklar İngilizce'den geride kalabilir (eksik anahtar İngilizce'ye düşer). Hukuk metinleri (gizlilik, künye) TR/EN dışında İngilizceye düşer ve uyarı gösterir.

## Kararlar ve açık konular
- KARAR VERİLDİ (07.10.2026) Fiyat: yurt dışı başlangıç tabanı $10.000; Türkiye ₺100.000–₺500.000+. Avrupa € karşılığı tanımlanmadı, tanımlanana kadar yayınlanmaz. Sitede fiyat yayınlanmaz (başvuru bazlı). Briefing bütçe basamakları Blueprint'tedir: $5k–$10k (taban altı, "düşük" sınıf), $10k–$20k, $20k+, "önce konuşalım".
- KARAR VERİLDİ (08.10.2026) Teklif: $2.500 sabit teklif ve Lemon Squeezy kaldırıldı; yerine Strategic Briefing başvuru akışı geldi. `lib/pricing.ts` hâlâ yok (yalnızca briefing basamakları `lib/briefing.ts` içinde).
- KARAR VERİLDİ (08.10.2026, 2B-2, docs/adr/0009) Vitrin sektörleri **kilitli üçlü**: Özel Sağlık/Klinik, Lüks Gayrimenkul, Kurumsal Hukuk ve Danışmanlık. SaaS kaldırıldı (kod, mesaj, sahne ve klip dahil; denetim FAIL sayar). Hukuk kartı bir konsept renderdır; Avukatlık Kanunu m.55 ve TBB Reklam Yasağı Yönetmeliği'ni uygulamak müşterinin sorumluluğudur ve gerçek bir hukuk müşterisi alınmadan önce avukata gösterilir. Önceki "Gayrimenkul, Klinik, SaaS" kararı (ADR 0006) bununla değişti.
- KARAR VERİLDİ (08.10.2026) Başvuru yanıtı: "24 saat içinde kurucu ekipten kişisel dönüş" sözü korunur. Kapasite cümlesi ("ayda 3"/"çeyrekte 3") yalnızca gerçekse yayınlanır; bugün yok.
- KARAR VERİLDİ (07.10.2026) CSP: Faz 7'ye kadar `Content-Security-Policy-Report-Only`; `CSP_MODE=enforce` ile enforce (docs/adr/0001).
- KARAR VERİLDİ (08.10.2026) Hareket, ışık ve cam yüzey Blueprint'e göre serbest (aşağıda). Lenis yalnızca masaüstünde ve dinamik import ile (docs/adr/0004).
- KARAR VERİLDİ (08.10.2026, 2B-2) Dil: Türkçe ve İngilizce odak, varsayılan dil İngilizce (`/`, Türkçe `/tr`); sitede yedi dil iddiası yok. Hukuki sayfalar şimdilik yer tutuculu taslak kalır, avukat onayından sonra gerçek bilgiler girilir.
- KARAR VERİLDİ (08.10.2026) Yazı tipi: Instrument Sans (OFL); Satoshi ve Fontshare EULA sorusu kapandı. AÇIK: "SyncFlow" ad/marka sorgusu (kullanıcı yürütüyor). AÇIK: LinkedIn, Instagram ve WhatsApp adresleri (verilmedi; footer'da yok). AÇIK: n8n webhook adresi, imza sırrı ve Turnstile anahtarları (verilmedi; bkz. .env.example).

## Tasarım tokenları (Blueprint yapısı, B1/v2 renk sistemi: docs/adr/0006 ve 0007)
- **Saf siyah (`#000`) ve saf beyaz (`#fff`) hiçbir yerde yok** (CSS, bileşenler, OG kartı, Remotion sahneleri, videolar); koyu her zaman obsidian, açık her zaman platin. Denetim bunu FAIL sayar.
- Zemin obsidian `#0D0D0E`; katman 1 `#141416` (kart); katman 2 `#1A1A1E` (yükseltilmiş yüzey, menü). Metin platin `#E2E2E6` (zeminde 15,0:1), ikincil platin %70 (en kötü yüzeyde 6,5:1), üçüncül platin %60 (5,2:1). Hat: cam kenarlık `#ffffff1a` (%10), hover `#ffffff40` (%25): sahibin onayladığı yarı saydam çizgiler, blok değil. Şeffaf tonlar da paletten gelir (`rgb(226 226 230 / x)`, `rgb(13 13 14 / x)`).
- **Şampanya `#D4C5A9` tek vurgu rengidir:** yalnızca birincil çağrı düğmesi ve tekil vurgular; logoda hiç kullanılmaz. Diğer her etkin durum (seçili kart, odak halkası, ilerleme) platin.
- Cam yüzey: şeffaf zemin + 1px `#ffffff1a`; üst bar ve vitrin kartlarında `backdrop-filter` yalnızca masaüstünde ve kaydırınca. Seçili kart: platin kenar + içeriden loş ışık.
- Işık serbesttir ama ölçülüdür: imleci izleyen 600 px radyal spotlight (yalnızca ince işaretçi), Border Beam (conic-gradient, 8 sn, yalnızca `transform` ile dönen), düğme içi loş parlama. Aynı anda en çok 3 Border Beam + 1 spotlight; görünür alan dışında hepsi durur. Logoya parlama, gölge, gradyan eklenmez.
- **Hap düğme tek tarif:** `.btn` (52 px) ve `.btn-sm` (40 px), köşe `--radius-pill`; birincil = şampanya zemin + obsidian metin (11,4:1), ikincil = cam (`.btn-ghost`). Yuvarlak ikon düğmeleri (`.strip-btn`, `.frame-control`) ve seçim hapları (`.reach-chip`, `.role-chip`, `.overlay-chip`) aynı köşe ve kenar kuralını paylaşır.
- **Mono etiket tek tarif:** `.label`, `.chip`, `.badge`, `.lang-trigger`, `.lang-item .code` tek kuraldan gelir (11 px mono, büyük harf, `--tracking-label` 0,18em). Büyük harf ve etiket aralığı CSS'te yalnızca o kuralda yazılır; yeni etiket aynı sınıflardan birini alır, kendi tipografisini yazmaz (denetim sayar). Arapça ve Japoncada büyük harf ve aralık kalkar.
- Köşe: kartlar 20 px, paneller 28 px, düğmeler ve rozetler hap (999 px). Gölge yok (ışık içeridedir).
- Başlık en çok 2 satır. Sola hizalı (RTL'de sağa, mantıksal özelliklerle).

## Tipografi
- Gövde ve başlık: **Instrument Sans** (OFL, `public/fonts`, Latin 30 KB + Türkçe 2 KB alt kümeleri, `scripts/build-fonts.py` resmi değişken yazı tipinden üretir; genişlik ekseni 100'e sabit, ağırlık ekseni 400–600). Etiketler: sistem mono yığını (`ui-monospace, SFMono-Regular, Menlo, Consolas`), 11 px, geniş harf aralığı, büyük harf (yalnızca bu mikro etiketlerde). **Ağırlık 400 ve 500** (büyük başlık da 400: ailede 300 yok); 600 yalnızca OG kartında. İtalik yok, `font-synthesis: none`. Yedek: Arial'dan ölçeklenen "Instrument Sans Fallback" (CLS 0).
- AR ve JA: sistem yazı tipi yığınları (Segoe UI/Tahoma/Geeza Pro/Noto Sans Arabic; Yu Gothic/Hiragino Sans/Noto Sans JP). Arapçada harf aralığı SIFIR (bitişik yazı). Özel OFL yığını bu diller yayına alınırken seçilir.
- Türkçe: İ ı Ş ş Ğ ğ Ç ç Ö ö Ü ü glif testi `scripts/check-fonts.py`; ₺ yazı tipinde yok (fiyat gösterilmediği sürece sorun değil). `lang` ve `dir` doğru olmalı.
- Lisansı kısıtlı font dosyaları (Satoshi vb.) repoya commit edilmez; OFL fontlar (Instrument Sans) `public/fonts` altında durur ve `OFL.txt` yanında olur.
- **Logo:** `brand/` paketi (B1 monogram, özel çizim v2 wordmark, `brand/README.md` kuralları: tek renk, koruma alanı 2u, asgari boyut monogram 16 px / yatay kilit 24 px / yığılmış kilit 48 px, oran bozulmaz). Kodda `components/ui/Logo.tsx` çizilmiş SVG yollarını `lib/brand-paths.ts`'ten okur; bu dosya, `app/icon.svg`, `app/apple-icon.png`, `public/brand/logo-512.png` `npm run brand:build` ile üretilir (`brand:check` ve denetim eskimişse FAIL). Ad/marka sorgusu (Türkpatent ve uluslararası) bitmeden logo nihai kabul edilmez.

## Motion
- Tercihen `transform` ve `opacity`; layout özelliği animasyonlanmaz. Bilinçli istisnalar: SVG halka dolumu (`stroke-dashoffset`, 4 küçük halka, yalnızca görünürken) ve adım geçişinde `clip-path` (briefing paneli).
- Lenis yalnızca `(hover: hover) and (pointer: fine)`, azaltılmış hareket yokken, dinamik import ile; duration 1.2, easing cubic-bezier(.16, 1, .3, 1). Dokunmatikte native scroll. Briefing paneli `data-lenis-prevent` taşır (başvuru akışında smooth scroll yok).
- Hero satır satır `clip-path`/maske girişi (80 ms arayla), sunucuda bölünmüş, CSS ile; ekran altı girişleri `motion/mini` (docs/adr/0004). `prefers-reduced-motion` her yerde desteklenir: giriş animasyonu, Lenis, spotlight, Border Beam, manyetik düğme, sürekli animasyon kapanır.
- Sürekli (`infinite`) animasyon taşıyan öğe `data-pause-offscreen` alır; ekran dışında durur. Videolar ekran dışında durur. `lenis` ve `motion` statik import edilmez (denetim).
- İlk gizli durum JS yokken içeriği gizlememeli. Ağır sahneler `next/dynamic` ya da tembel. WebGL yok.

## Performans (mobil orta segment, 4G throttle, production build)
LCP ≤ 2,5 sn · CLS ≤ 0,1 · INP ≤ 200 ms hedef. İlk rota JS tavanı öneri ~150 KB gzip. Yayındaki sayılar yalnızca ölçülmüş olabilir (`lib/metrics.ts`: değer, tarih, profil, kaynak). Yeni bağımlılıktan önce paket boyutu etkisi raporlanır.

## Güvenlik (hedef: OWASP Top 10 / ASVS'ye göre kontrol listesi)
- Başlıklar: CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy. CSP nonce tabanlı; yalnızca `challenges.cloudflare.com` (Turnstile) üçüncü taraf olarak izinlidir.
- Formlar (briefing): honeypot, Cloudflare Turnstile (sunucuda doğrula), IP başına hız sınırı, zod (strict), origin kontrolü, DOMPurify, ayrıntı sızdırmayan hatalar. Sınıflandırma (yüksek/orta/düşük) sunucuda hesaplanır.
- Teslim sözleşmesi (docs/adr/0010): her başvuru rastgele bir `id` taşır (gövde + `Idempotency-Key`), en çok iki deneme, toplam < 10 sn, yalnızca zaman aşımı/ağ/5xx/408/429'da; n8n `id`'ye göre tekrarı ayıklar. `public/.well-known/security.txt` (RFC 9116) `Expires`'ı gelecekte ve ≤ 1 yıl içinde tutulur (denetim FAIL sayar). Üretimde Upstash yoksa hız sınırı örnek başına sayar ve bir kez uyarır. CSP enforce kipi denendi, varsayılan report-only; geçiş F7'de, sahibin kararı.
- Sırlar yalnızca sunucu ortam değişkenlerinde. Gmail kimlik bilgisi Next uygulamasında tutulmaz: başvuru → imzalı (HMAC) webhook → n8n → Gmail (`docs/n8n-briefing.md`). Webhook yoksa üretimde form 503 verir ve ziyaretçiye `contact@syncflow.agency` e-posta bağlantısı gösterir.
- "Aşılmaz", "tam uyumlu", "%100 güvenli" gibi ifadeler hiçbir sayfada kullanılmaz.

## Dil ve mevzuat
- "Ajans / web tasarımcısı" dili yok; dijital mimari stüdyosu tonu. Kanıtsız küresel otorite iddiası ve üstünlük sıfatları ("kusursuz", "mükemmellik standardı") yok.
- Hiçbir sayfa "%100 uyumlu", "yasal riski sıfır", "garanti" demez. Uyum müşterinin içeriğine ve operasyonuna bağlıdır.
- Sağlık: fiyat, indirim, kampanya, önce-sonra, hasta yorumu, üstünlük iddiası yok; iletişimi hasta başlatır.
- KVKK/GDPR: işaretsiz açık rıza kutusu, aydınlatma metni, çerezsiz, veri minimizasyonu, saklama süresi, yurt dışı aktarım notu (Turnstile, Gmail, n8n). Hukuki metinler yayın öncesi avukata onaylatılır. Aydınlatma metni 9 bölümdür ve KVKK m.10 / GDPR m.13 sırasını izler (docs/adr/0011); rıza bağlantısı `#privacy-p2`'ye gider; sayfalarda "son düzenleme" tarihi vardır. **Hukuki sayfalarda yer tutucular ve `Legal.draft` uyarısı sahibinin kararıyla durur**; avukat onayı ve gerçek bilgiler olmadan kaldırılmaz, "uyumludur/compliant/garanti" yazılmaz (denetim FAIL sayar). p8/p9'daki işletme iddiaları (her talebi bir kişi okur; otomatik yanıt/ret yok) doğru kalmak zorundadır.

## i18n ve pazar
- `next-intl`, `messages/{locale}.json`; kodda sabit metin yok. Yol tabanlı yönlendirme (EN `/`, diğerleri `/xx`), `hreflang` yalnızca yayındaki dillere; çerez yok; IP/tarayıcı diline göre zorla yönlendirme yok.
- Altyapı yedi dili taşır: `en tr de fr es ar ja` (yalnızca `en tr` yayında). `ar` için `dir="rtl"`; mantıksal CSS özellikleri (`margin-inline-start`, `start-*`, `text-start`). Yönlü oklar RTL'de aynalanır.
- Uykudaki taslak diller (de, fr, es, ar, ja): `messages/xx.json` İngilizce'den geride kalabilir; eksik anahtar İngilizceden tamamlanır (`i18n/request.ts`). `npm run check:messages` fazlalık anahtarı, yer tutucu ve etiket uyumsuzluğunu hata sayar, gerideki anahtarları yalnızca sayar. İngilizce metni değişen bir anahtarın taslak çevirisi silinir (eski anlam kalmasın).

## Başvuru protokolü (Strategic Briefing)
Ana sayfada 4 adım, ekran başına tek soru: (1) proje türü, (2) yatırım aralığı, (3) zamanlama, (4) iletişim (ad soyad, şirket ve unvan, iş e-postası, tek cümle proje opsiyonel, karar yetkisi, işaretsiz rıza). Sunucu sınıflandırır: yüksek ($20k+ ve karar verici/karar ekibi), düşük ($5k–$10k), diğerleri orta; sınıf e-posta konusuna ve yüke eklenir. Başarı ekranı Blueprint metnidir.

## Çalışma kuralları
- Karmaşık işe plan modunda başla, planı göster, onay bekle. Güncel Next.js 16, next-intl ve Tailwind v4 dokümanlarını oku.
- Her fazdan sonra: `npm run build`, lint, `node faz2-denetim.mjs --build`, `npm run smoke`, production build üzerinde Lighthouse (başka ağır süreç çalışmıyorken). Ham skorları cihaz profili ve throttling ayarıyla raporla.
- Doğrulamadığın şeyi "geçti" diye raporlama; hangi rotada, hangi ortamda test ettiğini yaz.
- `.env`, font dosyaları ve sırlar commit edilmez.

## Faz planı
F0 Karar dondurma · F1 Logo ve tipografi (Blueprint wordmark'ı geçerli) · F2 Next.js 16 / Tailwind v4 (KAPI GEÇİLDİ 07.10.2026, `faz_2`) · F3 Motion ve scroll (KAPI GEÇİLDİ 08.10.2026, `faz_3`, docs/perf/faz3.md) · F4 Ana sayfa (Blueprint) ve Strategic Briefing (KAPI GEÇİLDİ 08.10.2026, `faz_4`: denetim 0 hata, duman 107/107, tarayıcı 60/60, Lighthouse masaüstü 100/100/100/100, mobil performans 93, docs/perf/faz4.md; açık: mobil LCP ≈ 2,9 sn > 2,5 sn hedefi) · F5 7 dil ve küresel SEO (TASLAK ÇEVİRİLERLE TAMAM 08.10.2026, `faz_5`; yayın listesi `en,tr`, beş dil yerel çeviri ve hukuk incelemesi bekliyor) · 2B-1 Tokenlar ve Marka (UYGULANDI 08.10.2026, `faz_2b1`, docs/adr/0007, docs/perf/faz2b1.md: obsidian paleti, saf siyah-beyaz yok, Instrument Sans, tek hap ve etiket tarifi, B1/v2 logo; masaüstü Lighthouse 100/100/100/100; açık: mobil performans bu sürüm için ölçülmedi, sayfada "ölçülecek" yazar) · 2B-2 Niş ve Dil (UYGULANDI 08.10.2026, `faz_2b2`, docs/adr/0009, docs/perf/faz2b2.md: SaaS yerine Kurumsal Hukuk, Reach bölümü ve yedi dil iddiası kalktı, TR/EN odak; hukuki sayfalar yer tutuculu) · 2B-3 Briefing ve Güvenlik (UYGULANDI 08.10.2026, `faz_2b3`, docs/adr/0010, docs/perf/faz2b3.md: teslimde id + tek yeniden deneme, hız sınırı uyarısı, security.txt, CSP enforce hazırlığı denendi; açık: gerçek n8n/Gmail teslimi, n8n çift kayıt ayıklaması doğrulanmadı) · 2B-4 Hukuki Sayfalar (YAPI UYGULANDI 08.10.2026, `faz_2b4`, docs/adr/0011, docs/perf/faz2b4.md: 9 bölüm KVKK m.10/GDPR m.13 sırasıyla, tarih, rıza bağlantısı; İÇERİK yer tutuculu taslak, gerçek bilgiler ve avukat onayı bekleniyor) · F6 n8n/Gmail gerçek teslim (n8n adresi, imza sırrı, Turnstile anahtarları gerekir) ve gerçek cihaz testi · F7 Güvenlik sıkılaştırma (CSP enforce), çeviri ve hukuk incelemesi · F8 Vercel ve lansman (09.10.2026: uygulama depoda `syncflow-web/` klasörüne taşındı, mevcut Vercel projesi `syncflow-web` (Root Directory `syncflow-web`, dal `main`) `main`'e her push'ta onu derler; `syncflow-web/vercel.json` framework'ü nextjs yapar; docs/adr/0013 ve docs/vercel-next-site.md. **Depo kökünde komut çalıştırılmaz, `cd syncflow-web`; `syncflow-web/` klasörü silinmez ya da taşınmaz.** Eski statik site `legacy-site` dalında. Açık: yayında formun env değişkenleri panelden girilmeli (form o zamana kadar 503 + mailto), hukuki sayfalar yer tutuculu, mobil performans ölçülmedi, `vercel.json` geçersiz kılmasının canlı doğrulaması)
