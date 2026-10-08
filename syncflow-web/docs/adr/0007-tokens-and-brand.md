# ADR 0007: 2B-1 Tokenlar ve Marka: obsidian paleti, Instrument Sans, tek hap ve etiket tarifi, B1/v2 logo

- **Durum:** Kabul edildi ve uygulandı, 08.10.2026 (`faz_2b1` dalı). [ADR 0006](0006-blueprint-adopted.md)'nın görsel token kararlarını (saf siyah, `#0a0a0a`, beyaz metin, metin wordmark, Inter) **kısmen yerine geçer**; yapısı (Blueprint bölümleri, hareket, ışık, briefing) aynen kalır.
- **Karar:** proje sahibi, "2B-1 (Tokenlar ve Marka) paketini uygulamaya başlıyoruz. Kararlar: Font olarak Instrument Sans kullanılacak." ve üç madde: (1) zemini `#0D0D0E` token'ına çek, saf siyah/beyaz blokları temizle; (2) yuvarlak hap düğmeleri ve büyük harfli mono etiketleri standartlaştır; (3) B1/v2 marka logosunu ve renk sistemini entegre et.
- **Kaynak girdiler:** marka paketi `syncflow-brand-v2.zip` (07.10.2026; B1 monogram + özel çizim v2 wordmark, `brand/README.md`) ve CLAUDE.md'nin ilk sürümündeki palet (obsidian, iki katman, platin, şampanya). Bunlar zaten sahibin kilitlediği kayıtlardır ([ADR 0005](0005-blueprint-faz-4-5.md) çelişki 1, 5 ve 6); Faz 4'te Blueprint'in saf siyahı ve metin wordmark'ı öne alınmıştı, bu paket onları kayıtlı marka sistemine çeker. Sahibe yeni soru çıkmadı.

## Kararlar ve uygulaması

| # | Karar | Uygulama |
|---|---|---|
| 1 | Zemin `#0D0D0E`, saf siyah/beyaz yok | `@theme`: obsidian `#0D0D0E`, katman 1 `#141416` (kart), katman 2 `#1A1A1E` (menü), metin platin `#E2E2E6`. `#000`, `#fff`, `black`, `white`, `bg-white` gibi sınıflar CSS'te, bileşenlerde, OG kartında ve Remotion sahnelerinde kalmadı; şeffaf tonlar da paletten (`rgb(226 226 230 / x)`, `rgb(13 13 14 / x)`). Denetim saf değerleri FAIL sayar ve bunu bozulmuş bir kopyada kanıtladım. `theme-color`, manifest ve OG zemini de `#0D0D0E`. Dört sahne videosu yeniden render edildi: monolith ve SaaS zemini artık obsidian (köşe pikselleri `13,13,13`); klinik platin-gri bir oda (`#d9dce1`), emlak sahnesi gün/alacakaranlık illüstrasyonu. |
| 2 | Renk sistemi: platin metin, şampanya tek vurgu | Birincil düğme şampanya `#D4C5A9` zemin + obsidian metin (11,4:1); diğer tüm etkin durumlar (seçili kart, odak, ilerleme, halkalar) platin. İkincil metin platin %70, üçüncül platin %60. Kontrast, en kötü yüzeyde (cam, katman 2 üstünde): platin 11,7:1 · %70 6,5:1 · %60 5,2:1; platin zeminde 15,0:1. |
| 3 | Yazı tipi Instrument Sans | OFL, kendi sunucumuzdan. `scripts/build-fonts.py` resmî değişken yazı tipinden (google/fonts `ofl/instrumentsans`) genişliği 100'e sabitleyip ağırlığı 400–600'e keserek iki alt küme üretir: Latin 30 KB (Inter'de 42 KB idi), Türkçe 2 KB; OG kartı için statik SemiBold TTF (40 KB). "Instrument Sans Fallback" (Arial, `size-adjust 103,24 %`, ölçülü) CLS'i sıfırda tutar. Satoshi ve Fontshare EULA sorusu kapandı. |
| 4 | Hap düğme ve mono etiket tek tarif | `.btn` 52 px / `.btn-sm` 40 px, köşe `--radius-pill`; yuvarlak ikon düğmeleri ve seçim hapları aynı köşe ve kenar kuralını paylaşır. Etiket: `.label`, `.chip`, `.badge`, `.lang-trigger`, `.lang-item .code` tek CSS kuralından gelir (11 px mono, büyük harf, 0,18em); büyük harf ve etiket aralığı CSS'te yalnızca orada yazılır, denetim sayar. Rozet 10 px'ten 11 px'e, dil seçici 12 px'ten 11 px'e hizalandı. |
| 5 | B1/v2 logo | `brand/` paketi depoya girdi (SVG'ler eğriye çevrilmiş, tek renk). `scripts/build-brand.mjs` yolları `lib/brand-paths.ts`'e, favicon'u `app/icon.svg`'ye, `app/apple-icon.png`'yi (180) ve `public/brand/logo-512.png`'yi (JSON-LD logosu için raster) üretir; `--check` eskimişse denetim FAIL verir. `components/ui/Logo.tsx` bu yolları `currentColor` ile çizer. Header'da yatay kilit (28 px; asgari 24), footer'da %6 platin dev çizili wordmark (dekoratif, `aria-hidden`), OG kartında yatay kilit. |

## Dikkat edilmesi gerekenler (sapma ve yan etkiler)

1. **Ağırlık 300 yok.** Instrument Sans 400–600 taşır; Blueprint'in "ince" büyük başlığı ve wordmark'ı 400 oldu. Büyük başlıklar biraz daha dolgun. `font-weight: 300` ve `font-light` artık denetimde FAIL (sessizce 400 çizilirdi).
2. **Logoda `.agency` yok.** Marka kuralı logoya ek, gölge, gradyan ya da canlı yazı tipi koymaz ve wordmark'ın oranını bozmaz; Blueprint'in "syncflow" + soluk ".agency" metni bu yüzden kalktı. Alan adı footer, e-posta ve OG kartında yazı olarak duruyor.
3. **Dev footer wordmark'ı (%6 platin) bir yargıdır.** Marka kuralları logonun düşük opaklıkta dekoratif kullanımını anmaz, yasaklamaz da. Blueprint'teki öğeyi koruyup resmî çizili wordmark ile yaptım; marka sorumlusu istemezse `Footer.tsx`'ten tek blok silinir.
4. **Cam çizgiler olduğu gibi `#ffffff1a` ve `#ffffff40`** (sahibin Faz 3–4'te onayladığı değerler; %6/%16 değil). Yarı saydam çizgilerdir, blok değil.
5. **Emlak sahnesi bir illüstrasyondur:** gökyüzü ve zemin gradyanları (gece zemini `#030304` gibi çok koyu tonlar, çelik mavisi gündüz göğü) sahne sanatıdır, saf `#000` değildir ve çerçevenin içinde kalır; bu pakette yeniden boyanmadı. İsterseniz sahne paletine bağlanabilir.
6. **Marka taslaktır:** `brand/README.md` "ad/marka sorgusu (Türkpatent ve uluslararası) tamamlanmadan nihai kabul edilmez" der; o sorgu hâlâ sahibin elinde.
7. **Eski iddia temizlendi:** `manifest.ts` açıklaması hâlâ "Flat price, live in 14 days" diyordu ($2.500 teklifinden kalma); güncel metne çekildi.
8. **Paylaşım kartı sürümü** `v=2` → `v=3` (önbellek tazelensin); smoke testi güncellendi.
9. **Koruma betiği genişledi:** `scripts/check-fonts.py` Arapça/Japonca (kasıtlı sistem yazı tipi) ve `⌘ ✓` simgelerini açıkça istisna olarak listeliyor; önceden bu karakterleri sessizce kaçırıyordu ve yedi dil eklenince hata veriyordu.

## Doğrulama

Ayrıntı ve ham sayılar [docs/perf/faz2b1.md](../perf/faz2b1.md)'de.
