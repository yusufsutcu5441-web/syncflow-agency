# 2B-1 doğrulaması: tokenlar ve marka

- **Tarih:** 08.10.2026
- **Ölçülen kod:** `faz_2b1` dalı ([ADR 0007](../adr/0007-tokens-and-brand.md)): obsidian paleti, Instrument Sans, tek hap ve etiket tarifi, B1/v2 logo, yeniden render edilen klipler. Üretim derlemesi (`NEXT_PUBLIC_SITE_URL=http://localhost:3100 npm run build`, `next start -p 3100`).
- **Makine:** Windows 11, 8 çekirdek, headless Chrome 154, 60 Hz, yerel sunucu (HTTP/1.1, gzip). **Ölçüm sırasında makinede başka yükler vardı** (Spotify ve VS Code, toplam ≈ %10 CPU); Faz 4 raporundaki "başka ağır işlem yok" güvencesi bu ölçüm için verilemez.

## Ölçülenler

### Lighthouse masaüstü (n = 3, önceki sürümle aralıklı A/B)

Aynı oturumda, sırayla (yeni, eski, yeni, eski, ...) ölçüldü ki makinedeki yavaş sapma ikisine eşit vursun. Eski = `main` (Faz 4–5 birleşimi, 3101 portu), yeni = `faz_2b1` (3100 portu). Ham raporlar depoda yok.

| Sürüm | Performans | Erişilebilirlik | En iyi uygulamalar | SEO | LCP (medyan) | TBT (medyan) | CLS | İlk yükleme JS |
|---|---|---|---|---|---|---|---|---|
| **2B-1** | 100, 100, 100 | 100, 100, 100 | 100 | 100 | **682 ms** (634–718) | 0 ms (0–13) | 0 | 162 KB |
| önceki (main) | 99, 100, 100 | 100 | 100 | 100 | 735 ms (701–754) | 3 ms (0–5) | 0 | 162 KB |

Okuma: masaüstünde **gerileme yok**; erişilebilirlik 100'ü yeni palet de koruyor (platin metin, %70 ve %60 soluk tonlar, şampanya düğme). İlk yükleme JS'i aynı (162 KB): logo bileşeni sunucuda çizilir, istemciye kod eklemez. Latin yazı tipi 42 KB'tan 30 KB'a indi.

`lib/metrics.ts` buna göre güncellendi: masaüstü LCP 653 → **682 ms**, kaynak `docs/perf/faz2b1.md`.

### Tarayıcı doğrulaması (Chrome 154, `puppeteer-core`; betik depoda yok)

- **Yeni 2B-1 testi, 32/32** (üretim sunucusu 3100; aynı test geliştirme sunucusunda da 32/32): tüm sayfada hesaplanmış renklerde saf siyah/beyaz yok (sekiz kaydırma konumunda tarandı; tarama enjekte edilmiş saf beyaz blok ve saf siyah metni yakalayarak kanıtlandı) · canvas `rgb(13,13,14)`, metin `rgb(226,226,230)`, `theme-color #0D0D0E` · birincil düğme şampanya `rgb(212,197,169)` + obsidian metin · cam kenarlık `#ffffff1a`, kart `rgb(20,20,22)` · başlık, alt metin ve düğme **gerçekten** Instrument Sans (özel) ile çiziliyor (Chrome'un `getPlatformFontsForNode` ölçümü), mono etiketler sistem mono · başlık ağırlığı 400 · `/tr`'de İ ı Ş ş Ğ ğ Ç ç Ö ö Ü ü yüklü yüzlerde · her `.btn` hap (52 ya da 40 px), her chip, rozet ve yuvarlak ikon düğmesi tam yuvarlak · 36 mono etiketin hepsi tek tarifte (büyük harf, mono, 11 px, 1,98 px aralık, 400) · header logosu 28 px, oran 24,98 : 4,5, platin, `aria-hidden`, bağlantının adı var · footer çizili wordmark %6 platin, `aria-hidden`, içerik sütunu genişliğinde · `/icon.svg`, apple icon ve `/brand/logo-512.png` görüntü olarak sunuluyor, manifest obsidian ve eski "flat price, 14 days" iddiası yok · JSON-LD logosu PNG · `/og?locale=en` ve `tr` 1200×630 PNG olarak çiziliyor (gözle kontrol edildi, Türkçe karakterler doğru) · monolith ve SaaS klibinin posteri ve videosu dört köşede obsidian (13,13,13/15), klinik açık platin-gri, emlak illüstrasyon.
- **Faz 4 tarayıcı testi, 60/60** (üretim + yedi dilli geliştirme): gerileme yok (hero, Border Beam, spotlight, briefing, RTL, JS kapalı, azaltılmış hareket).
- **HTTP duman testi 107/107** (üretim, `en,tr`, sahte webhook, Cloudflare test anahtarıyla gerçek `siteverify`).
- **Denetim** `node faz2-denetim.mjs --build`: **0 hata**, 95 geçti, 1 uyarı (`generateStaticParams` yok: nonce'lu CSP sayfaları zaten istek başına render ettiği için bilinçli, ADR 0001), 3 bilgi; `npm run build` başarılı. Yeni kapılar: palet, saf siyah/beyaz yok, Instrument Sans, hap ve etiket tarifi, marka paketi ve çıktıları.
- **Gözle:** header, hero, mimari, vitrin, briefing, footer, telefon hero'su ve iki OG kartı ekran görüntüsüyle incelendi.

### Kanıtlanan korumalar

- Denetim, **bilerek bozulmuş bir kopyada** yedi ayrı ihlali ayrı ayrı yakaladı: `#fff`, ikinci bir `text-transform: uppercase`, `font-weight: 300`, şampanya olmayan birincil düğme, eksik yazı tipi dosyası, `text-white` sınıfı ve marka çıktısı sapması.
- Marka sapma algılaması gerçek depoda denendi: `lib/brand-paths.ts` bozulunca `build-brand.mjs --check` çıkış 1 verdi, geri alınınca 0.

## Ölçülemeyenler ve açık olanlar (dürüstçe)

1. **Mobil Lighthouse bu sürüm için ölçülmedi.** Tam seri başlatıldığında üç koşu tamamlandı: performans **69–73**, TBT **800–1000 ms**, LCP ≈ 3,35 sn (Faz 4'te 93, TBT ≈ 150 ms). Seri, makine meşgulken alındı ve **yarıda kesildi**. Önceki sürümle mobil A/B denemesi ise benim bir hatam yüzünden hiç sonuç vermedi (Git Bash `--paths=/` argümanını `C:/Program Files/Git/` yoluna çevirdi, 12 koşunun hepsi başarısız oldu). Bu yüzden iki şey ayırt edilemiyor: gerçek bir mobil gerileme mi (yazı tipi, klipler, renkler), yoksa ortam gürültüsü mü. **Yayınlanan "mobil performans 93" bu yüzden `null`'a çekildi** ve sayfa "ölçülecek" yazıyor. Çözüm: makine boştayken `npm run perf` (Faz 4 ile aynı yöntem, n = 7) çalıştırıp medyanı `lib/metrics.ts`'e yazmak; gerileme çıkarsa nedeni A/B ile aramak.
2. **Kare ritmi yeniden ölçülmedi.** Yayındaki 16,7 / 16,9 ms ve 160 örnekli grafik Faz 4 sürümünün ölçümüdür (animasyonlar ve yerleşim değişmedi, ama ölçüm o sürümündür); `lib/metrics.ts` bunu kaynakta belirtiyor.
3. **Mobil LCP** Faz 4'te de hedefin (≤ 2,5 sn) üstündeydi (≈ 2,9–3,1 sn); bu sürümde ölçülmedi, yayınlanmıyor.
4. **Videolar bu pakette yeniden render edildi** (12 dosya, 1.836 KB; önceden ≈ 1,9 MB); kareler gözle ve köşe pikselleriyle kontrol edildi, her kare incelenmedi.
5. **Emlak sahnesi** illüstrasyondur ve kendi koyu zemin tonları (`#030304` gibi) vardır; saf `#000` değildir, yeniden boyanmadı (ADR 0007 §5).
6. **Tipik sınırlar:** tek makine, yerel sunucu, headless Chrome, 60 Hz; Safari, Firefox, gerçek telefon, 120 Hz ve ekran okuyucu ile elle deneme yok. Marka sorgusu (Türkpatent) bitmedi; logo taslak durumundadır.
7. **`npm run check` içindeki `tsc`** çalışan geliştirme sunucusunun ürettiği `.next/dev/types` dosyalarında hata gösterebilir (dosya yazılırken bozuk); `tsc` sözdizimi hatası görünce anlamsal denetimi atladığı için bu sırada "0 hata" demek geçersizdir. Geçerli tip denetimi `npm run build` içindekidir (çıkış 0).
