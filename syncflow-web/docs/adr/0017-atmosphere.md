# ADR 0017: Atmosfer (ışık kaskadları, derinlik, ağır çekim, kartlarda maske geçişi)

- **Durum:** Kabul edildi ve uygulandı, 13.10.2026 (dal `feat/high-ticket-markets`).
- **Karar:** proje sahibi, 13.10.2026. İstek: yapay duran stok görsel ve videoları temizlemek; platin/şampanya ışık kaskadları, ağır çekim derinlik efektleri ve üst düzey maske geçişleri eklemek. Sahibin yanıtı: **prosedürel sinema katmanı rafine edilsin** (gerçek çekim ya da render sağlanmayacak, konsept render'lar kalacak).
- **Tamamlar:** [ADR 0014](0014-cinematic-layer.md) (sinema katmanı), [ADR 0015](0015-entry-gate-and-hero.md) (maske çerçeveleri).

## Bağlam ve dürüst sınırlar

- **Sitede stok görsel ya da video yok.** `public/` altında yalnızca marka dosyaları, yazı tipleri, `film/` posterleri (aynı shader'lardan üretilir) ve `media/clips/` (Remotion ile üretilmiş konsept render'lar: monolit, villa, klinik koridoru, sütunlu koridor) var. Temizlenecek stok yok; konsept render'ları silmek vitrini kaldırırdı ve sahibin yanıtı onları tuttu. Kartlar bunları "konsept render, müşteri işi değil" diye etiketler.
- **"Ultra-realistik" gerçek kaynak ister** (fotoğraf, çekim, 3D render). Bu katman prosedürel bir atmosferdir; fotogerçekçi görüntü üretmez ve öyle sunulmaz. Gerçek kaynak sağlanırsa entegrasyonu (sıkıştırma, poster, maske) ayrı iştir.
- **"FWA/Awwwards kalitesi" bir iddia olarak yazılmaz:** doğrulanamaz ve hiçbir sayfada ya da raporda geçmez.

## Karar

### 1. Işık kaskadları ve bokeh (`lib/cinema/shaders.ts`)

`cascade()`: platin ince dikey ışık perdeleri, çekirdeklerinde şampanyaya ısınır; iki derinlik katmanı farklı hızda akar (uzak katman daha ince, sönük ve yavaştır: paralaks derinliktir). `bokeh()`: yüzeyin gerisinde yavaşça süzülen altı yumuşak disk, uzun mercekten odak dışı ışıklar. Kaskad sıvı metal (ortam) ve kozmik madde sahnelerine eklendi; bokeh ortam sahnesine.

**Şampanya burada yalnızca resmin içinde sıcak ışıktır** (CLAUDE.md'ye tek istisna): yüzey, metin, arayüz ya da logo rengi değildir. Logo yine saf platindir ([ADR 0015](0015-entry-gate-and-hero.md) §5).

### 2. Ağır çekim

Hareket yaklaşık üçte bir hıza indi (sıvı metal 0,06 → 0,036, imleç dalgası 2,2 → 1,5, kozmik madde 0,06 → 0,04, biyo-mekanik 0,35 → 0,25, monolit 0,08 → 0,05). Ağır akış ağırlık hissi verir; kaydırma ve Lenis ayarı değişmedi.

### 3. Kartlarda ve başvuru panelinde maske geçişi

`data-maskframe` (ADR 0015 §6) Mimari kartlarına ve briefing paneline de bağlandı: kart ekrana girerken üst kenarı bir perde gibi kalkar (`clip-path`) ve kart 28 px oturur (`translate`). Aynı betik (`lib/enhance/mask-frame.ts`) `--mf` yazar; CSS `var(--mf, 1)` kullandığı için JS yokken ve azaltılmış harekette her şey açıktır, hiçbir şey gizlenmez.

### 4. Okunurluk yapısal olarak korunur

POST shader'ının metin sütunu parlaklık sınırı (sol bölge 0,17, [ADR 0015](0015-entry-gate-and-hero.md) §7) **değişmedi** ve ışık efektlerinden sonra uygulanır: kaskad ve bokeh sol sütunda bu sınırı aşamaz. Sağ ve orta bölgede (metnin az olduğu yer) açıktırlar. Son satır her pikseli obsidian–platin aralığına kıstırmaya devam eder.

## Doğrulama durumu

**Doğrulanan:** derleme, shader'ın iki bağlamda (canlı motor ve poster üretimi) derlenmesi (konsol hatası yok, posterler yeniden üretildi), hero ve briefing arka planında kaskad ve bokeh'in görünmesi (gözle, masaüstü 1440×900), briefing panelinin ve kartların ekranda tam açık görünmesi.

**Doğrulanmayan:** maske geçişinin ara kareleri (kartın yarı açık anı ayrıca görüntülenmedi); performans maliyeti (kaskadın iki döngüsü ve altı bokeh diski GPU yükünü artırır; masaüstü TBT ve kare ritmi yeniden ölçülmedi; ADR 0014'teki masaüstü gerilemesi geçerli kalır); metin kontrastının yeniden ölçümü (yapısal sınır korunur ama sayılar yeniden alınmadı); poster modunda kontrast; gerçek GPU; Safari/Firefox; sahibin "ultra-realistik" beklentisinin karşılanıp karşılanmadığı (karşılanmadığı açıkça bilinir: bu prosedürel bir atmosferdir).

## Açık kalemler

1. Gerçek fotoğraf, çekim ya da 3D render sağlanırsa entegrasyon (ayrı iş).
2. Kaskad ve bokeh sonrası masaüstü Lighthouse, TBT ve kare ritmi ([ADR 0014](0014-cinematic-layer.md) açık kalem 1 ile birlikte).
3. Metin kontrastının yeniden ölçümü ([docs/perf/cinema.md §5](../perf/cinema.md) yöntemi).
