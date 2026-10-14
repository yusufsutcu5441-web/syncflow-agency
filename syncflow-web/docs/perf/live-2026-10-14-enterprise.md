# Canlı site ölçümü, yedi dil ve kurumsal katmandan sonra (syncflow.agency)

- **Tarih:** 14.10.2026
- **Ölçülen:** canlı alan adı `https://syncflow.agency`, `55190ec` kodunun dağıtımı (üstündeki `2b9eded` yalnızca belgedir): yedi dil ve yedi pazar ([ADR 0018](../adr/0018-seven-capital-centres.md)), kurumsal katman, dördüncü vitrin kartı ve Mimari'nin iki yeni sütunu ([ADR 0019](../adr/0019-enterprise-tier.md)). Önceki ölçüm (`91c009a` dağıtımı, [live-2026-10-14.md](live-2026-10-14.md)) bu iki işten öncesine aittir.
- **Araç ve profil:** `npm run perf -- --runs=3 --desktop=3 --paths=/ live=https://syncflow.agency --out=perf-out/live-enterprise` (Lighthouse 13.5.0, başsız Chrome 154, Windows 11, kullanıcının makinesi, canlı ağ üzerinden). Mobil: 412×823 ×1,75, simüle yavaş 4G (RTT 150 ms, 1.638 Kbps), 4× CPU yavaşlatma. Masaüstü: Lighthouse masaüstü ön ayarı. Sayfa: `/` (giriş kapısı açık; Lighthouse kullanıcı aracısı kapıyı görür, ADR 0015).
- **Sınır:** laboratuvar verisidir (saha verisi değil), üç koşu, tek makine; makine kullanıcının günlük makinesi olduğundan dışarıdan gelen yük (tarayıcı sekmeleri, editör) denetlenmedi. Ham raporlar `perf-out/live-enterprise/` (git'e girmez).
- **Not (araç hatası, düzeltildi):** ilk deneme Git Bash'in `--paths=/` bağımsız değişkenini bir Windows yoluna çevirmesi yüzünden yanlış adresle başladı; koşu sonuç vermeden durduruldu ve doğru adresle baştan yapıldı. Aşağıdaki altı koşunun hepsi `https://syncflow.agency/` içindir.

## Ham koşular

| Profil | Koşu | Performans | LCP | TBT | CLS | JS (gzip) |
|---|---|---|---|---|---|---|
| Mobil | 1 | 83 | 2.708 ms | 356 ms | 0 | 170 KB |
| Mobil | 2 | 97 | 2.462 ms | 30 ms | 0 | 170 KB |
| Mobil | 3 | 96 | 2.551 ms | 76 ms | 0 | 170 KB |
| Masaüstü | 1 | 97 | 570 ms | 148 ms | 0 | 184 KB |
| Masaüstü | 2 | 99 | 577 ms | 103 ms | 0 | 184 KB |
| Masaüstü | 3 | 97 | 565 ms | 145 ms | 0 | 184 KB |

## Medyanlar (sitede yayınlanan sayılar: `lib/metrics.ts`)

| Profil | Performans | Erişilebilirlik | En iyi uygulamalar | SEO | LCP | TBT | CLS | JS (dosya) | Toplam |
|---|---|---|---|---|---|---|---|---|---|
| Mobil `/` | **96** | 100 | 100 | 100 | 2,55 sn | 76 ms | 0 | 170 KB (10) | 397 KB |
| Masaüstü `/` | **97** | 100 | 100 | 100 | **0,57 sn** | **145 ms** | 0 | 184 KB (12) | 368 KB |

Diğer medyanlar: FCP mobilde 1.148 ms, masaüstünde 352 ms; Speed Index 3.209 ve 960 ms; TTFB 44 ve 43 ms.

## Sahibin beklentisi ve ölçülen gerçek

Sahibi bu ölçümü "performans 100/100, CLS 0,00 ve LCP kusursuz" beklentisiyle istedi. Ölçülenler:

| Beklenti | Ölçülen | Sonuç |
|---|---|---|
| Performans 100/100 | masaüstü **97** (koşular 97, 99, 97), mobil **96** (83, 97, 96) | **Tutmuyor.** Hiçbir koşuda 100 çıkmadı. Yayında 100 yazılamaz (CLAUDE.md: ölçülmemiş değer yayınlanmaz); yayında 97 ve 96 durur. |
| CLS 0,00 | **0,000**, altı koşunun hepsinde | Tutuyor. |
| LCP "kusursuz" | masaüstü **0,57 sn**; mobil medyan **2,55 sn** | "Kusursuz" ölçülebilir bir eşik değildir. Masaüstü hedefin (≤ 2,5 sn) çok altında; **mobil medyan hedefin 51 ms üstünde** (koşular 2,71, 2,46, 2,55 sn): hedef mobilde tutmuyor. |
| Erişilebilirlik, en iyi uygulamalar, SEO | **100**, altı koşunun hepsinde | Tutuyor. |

## Nasıl okunmalı

1. **Masaüstü performans puanı 97–99; 100'ün altında kalmasının başlıca nedeni TBT'dir** (103–148 ms; ham metrik puanı 0,90–0,97) ve küçük ölçüde Speed Index (0,97–0,98). FCP, LCP ve CLS her masaüstü koşusunda tam puan (1,00) aldı (ham Lighthouse raporlarından okundu). TBT'yi büyüten şeyin sinema motoru olduğu önceki ölçümde de olası neden olarak yazılmıştı ve hâlâ **doğrulanmış değildir** (motor açık/kapalı karşılaştırması bu ölçümde yapılmadı).
2. **Mobilde puanı belirleyen LCP ve Speed Index'tir** (LCP metrik puanı 0,85–0,90, Speed Index 0,61–0,97; CLS 1,00). **Mobil ilk koşu aykırı** (83: LCP 2,71 sn, TBT 356 ms, Speed Index 5,2 sn); sonraki ikisi 97 ve 96. Soğuk önbellek, dağıtımın hemen ardından CDN ısınması ya da makine yükü olabilir; bu üç koşuyla ayırt edilemiyor. Medyan aykırıya dayanıklıdır, ama mobil 96 için "güvenilir" demek de abartı olur: dağılım 83–97.
3. **Önceki ölçümle karşılaştırma** (`91c009a`): masaüstü performans 95 → 97, LCP 0,58 → 0,57 sn, TBT 177 → 145 ms; mobil performans 93 → 96, LCP 2,50 → 2,55 sn, TBT 222 → 76 ms. Farklar üç koşu ve koşular arası geniş dağılım içinde gürültü sınırındadır: **yedi dil ve kurumsal katman bu ölçümde belirgin bir gerileme göstermedi, ama bir iyileşme de iddia edilmez.**
4. **İlk yük JS'i değişmedi:** mobilde 170 KB (önceden 169), masaüstünde 184 KB (önceden 184), gzip. Yeni dördüncü kartın klibi ilk yüklemede inmiyor, yalnızca 15 KB'lık WebP posteri iniyor (üzerine gelinince oynayan MP4/WebM `preload="none"`). Yeni Mimari kartları ve şemalar sunucuda çizilen SVG'dir, JS eklemez.
5. **Yazılı hedefler** (CLAUDE.md): masaüstü LCP ve CLS tutuyor; **mobil LCP medyanı 2,55 sn hedefin (≤ 2,5 sn) 51 ms üstünde.** İlk yükleme JS'i önerilen ~150 KB'ın üstünde (170 ve 184 KB), önceki ölçümlerde de öyleydi.

## Ölçülmeyenler

Gerçek GPU'lu masaüstü, gerçek telefon, `/`'ten başka sayfalar (altı dilin sayfaları ve `?m=` ile açılan sayfalar ölçülmedi), kapı sonrası akış, Safari ve Firefox, saha verisi (CrUX). Kare süresi örnekleyicisi (`FRAME_SERIES`, `frameMedian`, `frameP99`) yeniden çalıştırılmadı: bu iki sayı hâlâ 08.10.2026 Faz 4 ölçümüdür ve `lib/metrics.ts`'te o tarihle durur.
