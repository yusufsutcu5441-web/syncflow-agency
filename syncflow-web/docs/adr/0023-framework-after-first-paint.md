# ADR 0023: React ve Next ilk boyamadan sonra başlar (mobil Lighthouse 96 → 99–100)

- **Durum:** Uygulandı ve yerelde doğrulandı, 17.10.2026 (`main` üzerine, `scripts/defer-framework.mjs`). Canlıya alma ve canlı ölçüm bu belgenin sonunda ("Canlıda") eklenir.
- **Karar:** proje sahibi, 17.10.2026: "mobil 100 istiyorum, gerekeni yap"; tam yetki. [ADR 0022](0022-single-text-face-and-mobile-ceiling.md) §5 bunu "ulaşılabilir tek büyük kaldıraç, ayrı bir mimari karar" diye yazmıştı; bu ADR o kaldıracı **kod yaması olmadan, derleme sonrası bir betikle** uygular.
- **Tamamlar:** [ADR 0004](0004-motion-and-smooth-scroll.md) (geliştirmeler ilk boyamadan sonra başlar), [ADR 0021](0021-production-performance-and-enterprise-proof.md), [ADR 0022](0022-single-text-face-and-mobile-ceiling.md).

## 1. Bağlam: neyin ölçüldüğü

ADR 0022 §5'te Lighthouse'un simüle mobil LCP'sini Lantern grafiği olarak döktük: gözlenen LCP'den önce biten **her istek** (HTML 43 KB, CSS, yazı tipi, 165 KB JS, React ve Next tek başına 116 KB) hesaba girer, 1,6 Mbps'te 258 KB ≈ 2,7 sn eder. Sayfa tamamen sunucuda çizilmiş HTML ve CSS'tir; çerçeve yalnızca davranış ekler. Kaldıraç: çerçeve betiklerini **ilk boyamadan sonra** istemek. Bu yalnızca bir Lighthouse biçimi değildir: gerçek yavaş ağda da boyama, 165 KB betikle bant genişliği için yarışmaz.

## 2. Önce kodlamadan ölçüldü (yeniden yazan vekil sunucu)

Next'in HTML'indeki betik etiketlerini çıkarıp ilk boyamadan sonra ekleyen bir deney vekili (depoda yok), aynı sayfaya karşı aralıklı Lighthouse:

| Varyant | Mobil skor | LCP | TBT | Not |
|---|---|---|---|---|
| Kontrol (aynı vekil, dokunulmadan) | **96** ×5 | 2.756 ms | 31 ms | |
| Tüm betikler ilk boyamadan sonra | **100** ×4 + bir aykırı 73 | **1.516 ms** | 33 ms (aykırı 1.603 ms) | tam tarayıcı akışı **114/114** |
| Yalnızca beş kök betik | 99–100 | 1.74–1.82 sn | 34–66 ms | istemci parçaları belgede kaldı: marj dar |

Betikler ilk boyamadan sonra başladığı için artık TBT penceresinin **içinde** çalışırlar; makine gürültüsü (aykırı koşu) eskiden boyamadan önce çalışan betiklerde görünmezdi.

## 3. Mekanizma: `scripts/defer-framework.mjs` (derleme sonrası)

`npm run build` = `next build && node scripts/defer-framework.mjs`. Betik Next'in koduna dokunmaz; yalnızca sayfayı çizerken okuduğu **veri dosyalarını** düzenler:

1. `build-manifest.json` (genel ve sayfa başına): `rootMainFiles`, Next'in `<head>`'e yazdığı betikler (React DOM, Next istemcisi, Turbopack çalışma zamanı; ilki önyükleme). Tek bir küçük `sf-boot.<özet>.js` dosyasına indirilir.
2. `page_client-reference-manifest.js` (sayfa başına): `entryJSFiles` (uygulamanın layout ve sayfa istemci parçaları, Next bunları da `<head>`'e yazar) boşaltılır; `moduleLoading` `null` olur (React'in sunucu çizicisi her istemci parçası için `<script async>` önyüklemesi yazmaz).
3. `sf-boot` yükleyicisi (≈1 KB, her derlemede içerik özetiyle adlanır, `immutable`): orijinal betikleri aynı sırayla **ilk contentful paint'ten sonra** ekler. Ayrıca ilk dokunuş, tuş, tekerlek ya da `pointerdown` ile hemen, 3,5 sn sonra zamanlayıcıyla, gizli sekmede anında başlar. Her adresi, yükleyicinin kendi **`src` özniteliğinden** (göreli `/_next/...`, `?dpl=` ve nonce dahil) kurar.
4. `.next/sf-defer.json`: özgün listeler (denetim okur).

Betik idempotenttir, yaptığını geri okuyup doğrular, beklenmedik bir manifest düzeninde (örneğin bir Next yükseltmesinden sonra) **sesli düşer**: derleme başarısız olur ve Vercel önceki dağıtımı korur. `--check` yalnızca doğrular; `DEFER_FRAMEWORK=off` (ortam değişkeni) dönüşümü atlar.

**Bulunan hata (testin değeri):** ilk sürüm adresleri `script.src` (mutlak) ile kurdu. Turbopack çalışma zamanı bir parçanın kimliğini `src` özniteliğinden çıkarır ve `/_next/` ile başlayan göreli yolu bekler; mutlak adres eşleşmedi, sayfa **hidrate olmadı**: tüm betikler 200 ile yüklendi, konsolda hata yoktu, Lighthouse yine 100 gösterdi (hiç JavaScript çalışmıyordu). Yeni `framework` tarayıcı grubu (`.gate[data-ready]` bekler) bunu yakaladı.

## 4. Reddedilen yollar

- **HTML'i vekille yeniden yazmak** (`proxy.ts` içinde kendine `fetch`): her sayfa isteği iki işlev çağrısı; gerçek istemci adresi `x-forwarded-for`'dan geçmez (hız sınırı), iç isteği ayırt etmek için sır gerekir (Vercel ortam değişkenini ben giremem); akışı tamponlamak gerekir. Veri dosyasını düzenlemek bunların hiçbirini gerektirmez.
- **Next'in çalışma zamanını yamamak:** üretimde çalışan kod `app-page.runtime.prod.js` (700 KB, küçültülmüş); her Next sürümünde kırılır.
- **Sayfaları statik üretmek:** CSP nonce'ı (istek başına) ve kapının `?m=` kararı sayfayı dinamik yapar; statik için CSP modeli ve kapı yeniden yazılmalı.
- **Boş bağlantı yuvası hipotezi** (ADR 0022 §5, ölçüldü, işe yaramadı) ve **`font-display: optional`** (ADR 0022 §2).
- **İlk boyamayı beklemeden önce 5 sn gecikme** (Lighthouse'un gözlem penceresinin dışına itmek): ölçüm oyunudur ve gerçek ziyaretçiyi bekletir; yapılmadı. 3,5 sn yalnızca boyama hiç gelmezse bir güvencedir.

## 5. Ölçümler (yerel, Chrome 155, `/` kapı açık)

| | Önce (betikler belgede) | Şimdi (ilk boyamadan sonra) |
|---|---|---|
| **Mobil performans** | **96** (96 ×5, ADR 0022) | **99–100**: 12 koşu, 100 ×6, 99 ×5, 98 ×1 |
| Mobil LCP | 2.755 ms | **1.51–1.59 sn** |
| Mobil TBT | ≈ 28 ms | 28–159 ms, medyan ≈ 66 ms |
| Mobil FCP | 919 ms | ≈ 913 ms (aynı: HTML + CSS belirler) |
| **Masaüstü performans** | 100 | **100** ×6 (TBT 0, LCP ≈ 0,38 sn; önceki ≈ 0,60 sn) |
| Belgenin istediği betik | 11 | **1** (+ `nomodule` çoklu dolgu, modern tarayıcıda indirilmez) |

**TBT neden 0 değil:** React DOM'un tek bir değerlendirme görevi gözlemde ≈ 20–46 ms, 4× yavaşlatmada 80–186 ms; artık ilk boyamadan sonra olduğu için TBT penceresine girer (eskiden boyamadan önceydi ve sayılmazdı). Bu görev bölünemez (tek bir betiğin üst düzey çalışması); skoru 98–100 arasında oynatan, o görevin süresinin gözlemdeki titreşimidir. Hidrasyonun kendisi ucuzdur (sunucu bileşenleri ağırlıklı).

**Ödünleşim (ölçüldü, yavaş 4G + 4× CPU, DevTools kısıtlaması, 3 koşu medyan):** ilk boyama **1,13 sn** (canlı eager: 1,64 sn): **≈ 0,5 sn erken**; sayfa etkileşime hazır (giriş kapısı hidrate) **2,63 sn** (canlı eager: 2,07 sn): **≈ 0,5 sn geç**. Karşılaştırma ayrı iki sunucuyla (yerel ve canlı) yapıldı, yön güvenilir, büyüklük yaklaşıktır. Hızlı ağda fark ≈ 100–200 ms. Etkileşim yoluyla (dokunma, tuş, kaydırma) bekleme olmadan başlar; kapıdaki pazar ve dil seçenekleri gerçek bağlantılardır, JavaScript beklemez; hash bağlantıları CSS ile (`:has(:target)`) önceden hazırlanır.

## 6. Doğrulama

`qa:browser` tam koşu (parity dahil, yeni `framework` grubu: ilk boyamadan önce hiçbir çerçeve betiği istenmez, sonra hepsi istenir ve kapı uyanır; boyama yolu kapalıyken tek tuşla; hiçbir girdi yokken 3,5 sn zamanlayıcıyla): **124/124**. `smoke` **184/184** (belge tek yükleyici ister, yükleyicinin adlandırdığı her betik vardır). Denetim **207/0**, yeni kontroller: build betiği ve `--build` sonrası `--check`.

## 7. Sınırlar ve riskler

- Yükleyici ya da çerçeve betikleri yüklenemezse sayfa **okunur ama etkileşimsiz** kalır (önceden de çerçeve betikleri yüklenemezse aynıydı).
- Mobil hâlâ 100'ün **garantisi değildir**: TBT titreşimi 98–100 aralığı verir. Canlıda (Brotli, gerçek ağ) ölçülmeden yazılmaz.
- Safari ve Firefox'ta sınanmadı (`PerformanceObserver` `paint` desteği yoksa `load` ve 3,5 sn güvencesi devreye girer).
- Next sürüm yükseltmesi manifest düzenini değiştirirse derleme sesli düşer (istenen davranış); `DEFER_FRAMEWORK=off` ile dönüşümsüz derleme alınır.
- Geri alma: `package.json`'daki `build` komutundan `&& node scripts/defer-framework.mjs`'i çıkarmak (ya da Vercel'de `DEFER_FRAMEWORK=off` + yeniden dağıtım), ya da `git revert`.

## Nasıl doğrulanır

```
npm run build                                        # next build + defer-framework
node scripts/defer-framework.mjs --check             # .next dönüştürülmüş mü
npx next start -p 3100
npm run smoke -- http://localhost:3100               # 184/184
npm run qa:browser -- http://localhost:3100 --parity # 124/124
npm run perf -- --runs=5 --desktop=3 --paths=/ new=http://localhost:3100
```
