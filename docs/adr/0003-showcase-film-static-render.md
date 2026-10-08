# ADR 0003: Showcase filmi önceden render edilir, tarayıcıda Remotion çalışmaz

- **Durum:** Kabul edildi, 07.10.2026 (Faz 2)
- **Karar:** proje sahibi ("Statik render, MP4/WebM ve poster, canlı Player yükünü tamamen kaldırıyoruz"). Uygulama: Faz 2.
- **Güncelleme 08.10.2026 (Faz 4, [ADR 0006](0006-blueprint-adopted.md)):** ilke aynı kaldı (tarayıcıda Remotion yok, dosyalar önceden render edilir), içerik değişti. Dört dilli mimari filmi ve `public/media/showcase/` kalktı; yerine dört kısa **döngü sahnesi** geldi (`remotion/scenes/`: cam monolit, gün batımında villa, klinik koridoru, SaaS paneli), 1280×720, 30 kare/sn, 8 sn kusursuz döngü, `public/media/clips/<ad>.{mp4,webm,webp}` (toplam 12 dosya, yaklaşık 1,9 MB). Sahnelerde okunabilir metin yoktur: altyazılar videonun üstünde HTML'dir, bu yüzden tek render her dile yeter ve dil başına yeniden render gerekmez. Oynatıcı `components/media/SceneVideo.tsx` (poster HTML'de, `preload="none"`, ince işaretçide görünürken ya da üstüne gelince oynar, ekran dışında durur, her zaman duraklat/oynat düğmesi vardır).

## Bağlam

Showcase bölümündeki mimari filmi `@remotion/player` ile tarayıcıda canlı oynuyordu.

- Remotion çalışma zamanı ayrı bir parçaydı (ham 311,5 KB, **gzip 94,1 KB**, ölçüldü) ve bölüm görüşe 700 px kala yükleniyordu. Masaüstünde Showcase bu payın içinde kaldığı için parça sayfa açılışında iniyordu (ilk yükleme JS'i 275 KB). Telefonda Hero uzun olduğundan açılışta inmiyordu (180 KB); parça, ziyaretçi filme yaklaşınca iniyordu. Karar taslağındaki "telefonda da açılışta iniyor" varsayımı ölçümle yalnızca masaüstü için doğrulandı ([ölçüm](../perf/faz2-baseline.md)).
- Kompozisyon her kareyi ana iş parçacığında hesaplıyordu. Telefonda filme yaklaşınca (4× CPU yavaşlatma, yavaş 4G) yedi saniyede 3,2 sn betik çalıştırıyor ve görevler 6,6 sn sürüyordu.
- Player, CSP'de ikinci bir `<style>` hash'i gerektiriyordu ve bu hash `next.config.mjs` içinde her derlemede hesaplanıyordu.
- Hedef (CLAUDE.md): mobilde LCP ≤ 2,5 sn, ilk rota JS'i ~150 KB gzip.

## Karar

1. Film `remotion/` altındaki kompozisyondan **önceden render edilir** ve `public/media/showcase/` altına konur: `architecture-<en|tr>-<wide|tall>.{mp4,webm,webp}`.
2. `@remotion/player` bağımlılıktan kaldırıldı. `remotion` yalnızca geliştirme bağımlılığıdır ve yalnızca `scripts/render-film.mjs` için kullanılır. Sitede Remotion kodu yoktur; CSP'deki Remotion hash'i ve `next.config.mjs`'teki yapı zamanı hesabı kaldırıldı. Tarayıcıdaki betiklerin hiçbirinde "remotion" geçmediği tarayıcı testinde doğrulandı.
3. Oynatma `components/showcase/ShowcaseFilm.tsx` (istemci bileşeni): HTML'de yalnızca poster gelir (`<picture>`, telefonda dikey, geniş ekranda yatay); video `preload="none"`.
   - Fare cihazlarında ekranın %30'u görününce otomatik oynar, kaydırılınca durur.
   - **Dokunmatik cihazlarda, `prefers-reduced-motion` ve Save-Data'da hiçbir şey indirilmez ve otomatik oynamaz.** Ziyaretçi Oynat'a ya da bir sahne sekmesine basınca video yüklenir.
   - Tarayıcı H.264 çalabiliyorsa MP4, çalamıyorsa WebM kullanılır; MP4 hata verirse bir kez WebM'e düşer.
   - Düzen (16:9 / 4:5) 768 px medya sorgusuyla seçilir. Çerçevenin oranı sabittir (CLS 0).
4. Arayüz aynı kaldı: sahne sekmeleri, oynat/duraklat, yeniden başlat, ilerleme çizgisi. İki metin değişti: "Canlı kompozisyon" rozeti "Mimari filmi / Architecture film" oldu (artık canlı değil) ve "yükleniyor" metni kalktı (poster hemen görünür).
5. Film dosyaları bir hafta önbelleğe alınır, arka planda yenilenir (`next.config.mjs`). Dosya adları yeniden render'da değiştiği için `immutable` verilmedi.

## Render ayarları ve boyutlar (07.10.2026, Remotion 4.0.533)

Kareler PNG olarak ara belleğe alınır (varsayılan JPEG ince çizgiyi ve küçük yazıyı bozar). MP4: H.264 High, CRF 20, preset slow, yuv420p, sessiz, `moov` dosyanın başında (akışa hazır). WebM: VP9, CRF 28. Poster: 118. kare (mimari sahne tam çizilmiş). Süre 15 sn, 30 fps, 450 kare.

| Dosya | yatay 1280×720 | dikey 800×1000 |
|---|---|---|
| `en` MP4 | 509 KB | 644 KB |
| `en` WebM | 572 KB | 735 KB |
| `en` poster (WebP) | 26 KB | 34 KB |
| `tr` MP4 | 498 KB | 637 KB |
| `tr` WebM | 566 KB | 728 KB |
| `tr` poster (WebP) | 24 KB | 32 KB |

Aynı içerikte VP9 (CRF 28) H.264'ten (CRF 20) büyük çıktı. Bu yüzden MP4 tercih edilir, WebM yedektir. Bir ziyaretçi en çok bir poster (24–34 KB) ve izlerse bir MP4 (0,5–0,64 MB) indirir.

**Dürüst not:** izlenen film (645 KB), eski Player'ın çalışma zamanından (94 KB gzip) daha fazla bayt indirtir. Kazanç bayt toplamında değil, ana iş parçacığında ve "istenmeyen hiçbir şey inmemesi"ndedir. Telefon ölçümü (yavaş 4G, 4× CPU, 7 sn): eski Player 3.182 ms betik ve 6.594 ms görev; yeni sayfa poster halinde 33 ms ve 339 ms, Oynat'a basılınca 187 ms ve 1.633 ms. İlk yükleme JS'i mobilde 180 → 155 KB, masaüstünde 275 → 155 KB. Mobil Lighthouse puanında fark ölçülemedi (ölçüm gürültüsü içinde). Ayrıntı: [docs/perf/faz2-baseline.md](../perf/faz2-baseline.md).

## Render hattının dikkat noktaları

- `remotion/fonts.ts` sitenin Inter dosyalarını Remotion tarayıcısına yükler. Yoksa render sistem yazı tipine düşer.
- Kompozisyonun kökü `font-synthesis: none` ve `lang` taşır. Site bu kuralları `body` ve `<html lang>`'dan miras alıyordu; Remotion sayfasında yoktur. Biri eksik olursa sahte kalın yazı ve Türkçe büyük harf hatası ("MIMARI") çıkar. Ölçüm adları (LCP, Lighthouse) `lang="en"` taşır, yoksa "LİGHTHOUSE" yazılır.
- `remotion/config.ts` `remotion` içe aktarmamalıdır: site de bu dosyayı içe aktarır.
- CLI "zod sürüm uyuşmazlığı" uyarısı verir (Remotion 4.5.4 ister, proje 4.6.5 kullanır). Kompozisyonda zod şeması olmadığı için zararsızdır.
- Remotion lisansı render için de geçerlidir: ≤ 3 kişilik kâr amaçlı şirketlerde ücretsiz, 4+ kişilikte ücretli (remotion.pro).

## Geçicilik ve içerik notu

Film Faz 5'te vitrinle birlikte yeniden tasarlanacak ve o zaman yeniden render edilecek. Bugünkü hâli eski görünümü ve eski teklifin içeriğini taşır: 14 günlük plan sahnesi, "Checkout / Lemon Squeezy" ve "Remotion" düğümleri, glow ve gradyan, 22 px köşeler, yarı kalın yazı, büyük harf etiketler. Hız bütçesi sahnesindeki değerler hedeftir ve sayfada "Görsel bir örnektir. Bütçeler sitenizin ölçümleri değil, kurarken hedeflediğimiz sınırlardır" notuyla etiketlidir (`Showcase.note`). Bunların yeni konumlandırmayla ve CLAUDE.md'nin "Dil ve mevzuat" kurallarıyla örtüşmesi Faz 5'in işidir; yayına çıkmadan önce gözden geçirilmelidir.

## Sonuçlar

- **+** Tarayıcıda Remotion çalışma zamanı, ikinci CSP hash'i ve yapı zamanı hash hesabı kalktı.
- **+** Film dosyaları statiktir ve CDN'de önbelleğe alınabilir.
- **−** Film artık kare-kare esnek değil: metin ya da kompozisyon değişince `npm run film:render` çalıştırılıp çıkan dosyalar (≈ 5 MB) commit'lenmelidir.
- **−** Film dosyaları depoyu büyütür; sık yeniden render'da git geçmişi şişer. Faz 5'te film sayısı artarsa Git LFS ya da ayrı bir depolama düşünülmelidir.
