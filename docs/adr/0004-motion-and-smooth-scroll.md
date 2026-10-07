# ADR 0004: Hareket ve kaydırma (Lenis, Motion, maskeli girişler)

- **Durum:** Kısmen kabul edildi ve uygulandı (Faz 3), kapı geçildi 08.10.2026; ölçümler [docs/perf/faz3.md](../perf/faz3.md). Üç kalem karar bekliyor, aşağıda.
- **Karar:** proje sahibi ("Lenis yalnızca masaüstünde dinamik import; maskeli giriş animasyonları (Motion); azaltılmış hareket aktif"). Uygulama: Faz 3.

## Bağlam

Faz 2'de eski JS efektleri ve `framer-motion` kaldırıldı; site hareketsiz bir kabuktu. CLAUDE.md "Motion" kuralları: Lenis yalnızca `(hover: hover) and (pointer: fine)` ve azaltılmış hareket yokken, dinamik import ile, süre 1,2, eğri `cubic-bezier(.16, 1, .3, 1)`; dokunmatikte native scroll; yalnızca `transform` ve `opacity` animasyonlanır; "ilk gizli durum JS yokken içeriği gizlememeli"; ağır sahneler `next/dynamic`. Faz 3 kapısı: paket analizcisinde mobil ilk yükte `lenis` ve `motion` yok, Lighthouse düşmedi.

## Karar

1. **Lenis** (`lib/enhance/smooth-scroll.ts`).
   - Yalnızca fare benzeri işaretçide ve azaltılmış hareket yokken çalışır. İki koşul da izlenir: hibrit bir dizüstü ya da değişen bir ayar Lenis'i açar ya da kapatır.
   - `import('lenis')` ayrı bir parçadır (5,3 KB gzip). Dokunmatik cihazlarda kod yolu çalışmaz, parça hiç istenmez.
   - Eğri `lib/motion/ease.ts` içindeki `cubicBezier(.16, 1, .3, 1)`: Lenis eğri değil fonksiyon ister, böylece kaydırma, CSS ve Motion aynı eğrideki hareketi paylaşır.
   - Aynı sayfa bağlantıları (`/#pricing`, `#showcase`) yakalama aşamasında alınır ve Lenis'le kaydırılır. Tarayıcının ve Next `<Link>`'in anlık sıçraması engellenir, adres `pushState` ile güncellenir, odak bölüme taşınır (yerel çapa gibi). **Ek ofset verilmez:** Lenis hedefin `scroll-margin-top` ve kökün `scroll-padding-top` değerini kendisi düşer; ilk denemede ofseti ben de verince iki kez düşüldü ve bölüm 88 yerine 176 px aşağıda kaldı (tarayıcı testi yakaladı). Üstbilgi payı yalnızca CSS'te durur.
   - Ödeme overlay'i açıkken (`body.lemonsqueezy-open`) Lenis durur.
   - Başvuru akışında (Faz 6) smooth scroll kapalı olmalıdır (CLAUDE.md): o rota eklenince bu modül orada atlanmalı.
2. **Maskeli girişler.**
   - Başlıklar sunucuda kelimelere bölünür (`components/ui/MaskText.tsx`): `.mw` (maske: statik `clip-path`) içinde `.mi` (yükselen kelime), `--i` kelimenin sırasıdır ve gecikmeyi belirler. Kelimeler tek boşlukla ayrılır, bu yüzden satır kırma, seçim ve ekran okuyucu düz metindeki gibi çalışır. İçerideki öğeler (rich-text'in `dim` span'i) işaretlemesini korur.
   - **Maske `overflow` değil `clip-path`'tir,** kutunun üstünden ve altından 0,12 em taşırılmış (alt uzantılar, aksan ve Türkçe büyük harfler kesilmez). Böylece düzen kutusu metinle aynı kalır ve satır içi blok taban çizgisini metnin taban çizgisinde tutar. Tarayıcı testinde eski ve yeni sayfada sayfa yüksekliği ve tüm başlık kutuları birebir aynı çıktı.
   - **Hero (ilk ekran):** CSS `@keyframes mask-rise`, ilk boyamadan itibaren, JS'siz ve yalnızca `prefers-reduced-motion: no-preference` altında. İlk ekran betiğin gelmesini bekleyemez; bu yüzden Motion kullanılmaz.
   - **Ekranın altı** (`lib/enhance/reveal.ts`): eleman ekran dışındayken betik gizler (`.is-armed`), `IntersectionObserver` girişi yakalar, `motion/mini`'nin `animate`'i (WAAPI, 4,7 KB gzip) kelimeleri bir kez yükseltir, bitince sınıf ve satır içi stiller silinir. Paragraflar tek bir blok maskesiyle yükselir (betik sarar, bitince geri açar). İlk ekrandaki ya da yukarıdaki hiçbir şeye dokunulmaz. Hata durumunda içerik gösterilir, asla gizli bırakılmaz.
   - Motion, ziyaretçinin **ilk** kaydırma, tekerlek, işaretçi, dokunma ya da tuş etkileşiminde indirilir; yalnızca ilk ekrana bakan ziyaretçi hiç indirmez.
3. **Bilinçli sapma: `motion/react` + `LazyMotion` + `m.*` kullanılmadı** (CLAUDE.md bunu öneriyordu). `m.*` bileşenleri `initial` stilini sunucu HTML'ine yazar, yani JS yokken metin gizli kalır; ayrıca React tarafı hidratlanan istemci ağacına, yani ilk yüke girer (kapı: ilk yükte `motion` yok). İçerik sunucuda render edilmiş ve görünür kalmalıdır, hareket onun üstüne eklenen bir katmandır. `m.*` ve `LazyMotion`, kendileri dinamik yüklenen etkileşimli bileşenler (Faz 4 sahnesi, Faz 6 başvuru adımları) için uygun kalır.
4. **Azaltılmış hareket.** Lenis ve giriş animasyonları başlamaz, hero CSS'i devre dışıdır (hiçbir kelime ofsetle başlamaz). Sayfa açıkken ayar açılırsa Lenis kapanır ve tüm gizli metin hemen gösterilir.
5. **Bağımlılıklar** ([paket boyutu raporu], CLAUDE.md "yeni bağımlılık"): `lenis` 1.3.26 (MIT) ve `motion` 14.0.0 (MIT). `motion`, `framer-motion@14`'ü geçişli bağımlılık olarak getirir (`package.json`'a girmez); yalnızca `motion/mini` kullanılır. Ölçülen lazy parçalar: Lenis 18,3 KB ham / **5,3 KB gzip**, Motion mini 11,6 KB ham / **4,7 KB gzip**. İkisi de rotanın ilk yük parça listesinde yoktur.
6. **Gate, otomatik:** `faz2-denetim.mjs` kaynakta `lenis`, `motion` ve `framer-motion`'ın statik import edilmesini hata sayar, `--build` sonrası Next'in `entryJSFiles` listesinde ikisinin de olmadığını doğrular, azaltılmış hareket denetimlerinin ve "kelimeler başlangıçta gizlenmiyor" kuralının varlığını kontrol eder.

7. **Ekran dışında durma.** Sürekli (`infinite`) CSS animasyonu taşıyan öğe `data-pause-offscreen` alır; `lib/enhance/ui-state.ts` bir `IntersectionObserver` ile `data-offscreen` işaretler, CSS `animation-play-state: paused` uygular. Bugün tek örnek hero'daki canlı nokta (yalnızca opaklık). Video için aynı şeyi `ShowcaseFilm` yapar (görünür ≥ %30 ve ince işaretçide oynar, uzaklaşınca durur). Denetim, sonsuz animasyonlu bir sınıfın bu özniteliği taşımadığı durumu hata sayar.

## Ölçüm

Ayrıntı, ham koşular ve sınırlar [docs/perf/faz3.md](../perf/faz3.md)'de. Özet (08.10.2026, yerel üretim derlemesi, Lighthouse 13.5 mobil profil, taban = Faz 2 sonu):

- **Paket kapısı geçti:** rotanın 5 ilk yük dosyasında `lenis` ve `motion` yok; lazy parçalar 5,3 ve 4,7 KB gzip. Mobil ilk yükleme JS'i 155 → 157 KB, masaüstü 155 → 163 KB (Lenis yükleme sonrası iner). Sunucu HTML'i +605 B gzip.
- **Lighthouse düşmedi:** mobil performans medyanları 96/96, 95/94 (sakin makine) ve 91/88, 89/88 (gürültülü makine); masaüstü 100/100; erişilebilirlik, en iyi uygulamalar ve SEO 100. Fark ölçülebilir değil, aralıklar çakışıyor. Mobil LCP ≈ 2,7–2,8 sn iki sürümde de aynı (hedef ≤ 2,5 sn Hero işidir).
- **Kare ritmi** (rAF, masaüstü, başsız Chrome, 60 Hz): kısıtsız boşta ve Lenis'li kaydırmada p99 17,0 ms, en uzun kare 17,1 ms (Faz 2'de kaydırmada 33,3 ms). 4× CPU yavaşlatmada kaydırma Faz 2'den düzgün (p95 25,0 → 17,5 ms) ama p99 ≈ 33 ms; yüklemede Faz 3 bir iki kare fazla kaçırıyor. Bu yüzden "kilitli 60 FPS" ve "120 Hz" iddiası yayınlanmaz.
- **Telefon yükleme probu** (yavaş 4G, 4× CPU, 7 koşu): FCP/LCP 1.124 → 1.140 ms, fark yok. Maskeli girişin ilk sürümü her öğeyi yüklemede kuruyor ve ≈ +100 ms ile TBT sıçraması veriyordu; kurma ziyaretçinin kaydırmasına, ekranın bir ekran altına yayıldı.
- **Tarayıcı 41/41, HTTP duman testi 87/87:** Lenis telefonda hiç istenmiyor, azaltılmış hareket her yerde saygı görüyor, JS kapalıyken tüm metin görünür, Faz 2 ile sayfa yüksekliği ve başlık kutuları birebir aynı.

## Yapılmayanlar ve karar bekleyenler

İsteğin üç kalemi CLAUDE.md'nin "Tasarım tokenları (pazarlığa kapalı)" bölümüyle ve denetim betiğiyle çelişir; bu yüzden **uygulanmadı** ve sahibinin kararını bekler:

| İstek | Çeliştiği yer |
|---|---|
| Cam kenarlık `#ffffff1a` (%10 beyaz) | Çizgi belirteci `rgb(255 255 255 / 0.06)` (hairline) ve `0.16` (hairline-strong). Denetim betiği `#ffffff1a` ya da `rgb(255 255 255 / 0.1)` bulursa **FAIL** verir ("%10 beyaz çizgi; %6 olmalı"). İstekte geçen `globals.tokens.css` de yoktur: Faz 2'de `app/globals.css` içine birleştirildi. |
| Kart hover'da ışık akışı ("Border Beam") | "Glow, dekoratif gölge ve gradyan yok. Işık ve atmosfer gerçek render/fotoğraftan gelir, CSS efektinden değil." |
| İmleci izleyen yumuşak ışık (spotlight / ambient glow) | Aynı kural. Ayrıca Faz 2'de "eski JS efektleri" olarak bilerek kaldırılan şeylerin (özel imleç, spotlight) geri gelmesi demektir. |

Seçenekler:

- **A, kurallar geçerli kalsın** (önerilen, bugünkü hâl): bu üç kalem yapılmaz. Hareket dili maskeli girişler ve yumuşak kaydırmayla sessiz kalır. İstenirse "ışık akışı" yerine düz, tek renkli, gradyansız bir **ince çizgi parçası** kart kenarında gezdirilebilir (SVG `stroke-dasharray`, yalnızca masaüstü hover); bu kurallarla uyumludur ama "beam" parıltısı değildir.
- **B, sahibi kuralı değiştirsin:** CLAUDE.md'deki "glow/gradyan yok, ışık CSS efektinden değil" kuralı ve belirteçler (örn. yeni bir `--color-hairline-glass: #ffffff1a`) açıkça güncellenir; denetim betiğindeki `#ffffff1a` FAIL kuralı buna göre değiştirilir; sonra üçü uygulanır. İmleç ışığı için Motion'ın yay fiziği (`springValue`) kullanılabilir. Maliyet: gradyanlı bir katman her kart ve imleç için sürekli boyama ister; yalnızca `(hover: hover) and (pointer: fine)` ve azaltılmış hareket yokken, dinamik yüklenerek mobili etkilemeden yapılabilir.

Harf düzeyinde bölme de yapılmadı (kerning, DOM ve ekran okuyucu maliyeti); istenirse kelime içinde harf gecikmesi yalnızca kısa etiketlerde düşünülebilir.
