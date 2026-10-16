# ADR 0022: Tek metin yüzü (Inter Display), sinematik medya etkileri ve mobil Lighthouse'un ölçülmüş tavanı

- **Durum:** Uygulandı ve yerelde doğrulandı, 16.10.2026 (dal `perf/luxury-type-mobile`, `perf/enterprise-proof` üzerine). Sahibin ikinci isteğinin sonucu: bu ADR **mobil 100/100 ve LCP < 0,8 sn'nin neden bu mimaride ulaşılamadığını ölçümle** gösterir ve ulaşılabilecek en iyi sonucu kaydeder.
- **Karar:** proje sahibi, 16.10.2026: (1) vaka incelemelerini ana projeye tam entegre et; (2) tipografiyi "Quiet Luxury" finans/teknoloji seviyesine çıkar (Neue Haas Grotesk, Syne, Inter Display ya da Geist benzeri), fontları yerel alt küme WOFF2 yap, bayt boyutunu %60 küçült, görsel ve videoya GPU hızlandırmalı hafif sinematik etkiler ekle; (3) mobil LCP'yi 3,1 sn'den 0,8 sn'nin altına indir, TBT'yi sıfırla, yerel mobil Lighthouse'u 100 yap, `perf:gate`'i yeşile çevir; sonunda dalları birleştir, temiz build al, son skoru raporla.
- **Yerine geçtiği:** [ADR 0014](0014-cinematic-layer.md) §7 (üç yüz: Instrument Sans, Instrument Serif, Cabinet Grotesk) ve [ADR 0007](0007-tokens-and-brand.md)'nin Instrument Sans kararı. Syne (film bölüm sözcükleri) aynen kalır.
- **Tamamlar:** [ADR 0020](0020-case-study-layer.md) (vaka incelemeleri), [ADR 0021](0021-production-performance-and-enterprise-proof.md) (üretim performansı).

## 1. Vaka incelemeleri

`feat/case-studies` (ADR 0020) zaten `perf/enterprise-proof` dalının altındadır: kartlar, diyalog, bağımsız sayfalar ve yedi dil bu yığında tamdır, eklenecek bileşen kalmamıştı. Eksik olan, bunun **sürekli bir testle** kanıtlanmasıydı: `npm run qa:browser -- --only=casestudy` (en, tr, ar) dört kartı, bir tıkla açılan diyaloğu (başlık, dört başlık, kendi adresi), Esc ile kapanıp adresin ve odağın karta dönmesini, `/showcase/<slug>` sayfalarının tek başına durmasını (yatay kaydırma yok, CLS < 0,005, hata yok; en/tr/de/ar) sınar. Birleştirme `main`'e yapılır (§9).

## 2. Tipografi: tek metin yüzü

**Ne yapıldı.** Instrument Sans (metin), Instrument Serif (başlık) ve Cabinet Grotesk (düğme, gezinti) kaldırıldı; hepsinin işini **Inter Display** yapar (SIL OFL 1.1, `public/fonts/OFL-inter.txt`): Inter'in "Display" optik boyutu (opsz 32), ağırlık ekseni 300–500. Başlıklar 300, metin 400, düğme ve gezinti 500. Syne (film bölüm sözcükleri, büyük harf) kalır ve film yaklaşana dek inmez.

**Neden Inter Display.** Sahibin ilk örneği Neue Haas Grotesk'ti: Monotype'ın ticari yazı tipidir, web lisansı yoktur ve repoya konamaz, bu yüzden **kullanılamaz**. Aynı Helvetica soyundan gelen OFL karşılığı Inter Display'dir. Geist de denendi (OFL, 23 KB ile daha küçük): daha geometrik ve geniş; yan yana render'da Inter Display 300 (iz −0,04 em) en keskin, en sessiz ve "Neue Haas" kaydına en yakın olandı (karşılaştırma ekran görüntüsü oturumda alındı, depoda yok). Instrument Serif'i hero için tutmak 21 KB'ı kritik yolda bırakırdı ve sahibin isteği tam tersiydi.

**Bayt.** Önceki üç yüz ilk görünümde **71,3 KB** (30,0 + 21,0 + 20,3), Türkçede 85 KB'tı. Şimdi `inter-display-latin-v1.woff2` **26,4 KB**, Türkçede +3,0 KB: **−%63** (Türkçe −%65). Elde edilen: karakter kümesi kopyanın ve kodun gerçekten çizdiğine daraltıldı (Basic Latin, Latin-1'in kullanılanları, `– — ’ “ ” „ …`, `€ ₺ ✓ ✕`; `scripts/check-fonts.py` kopya o kümeyi aşarsa düşer), ligatür ve bağlamsal alternatifler (`calt`, `liga`), işaret konumlama ve büyük/küçük harf duyarlı biçimler atıldı (kopya NFC'dir; her tablo kilobayt tutuyordu). Denetim bu bütçeyi (≤ 28,5 KB) bir hata olarak sınar. İlk görünümde tek dosya ön yüklenir (Türkçede +Türkçe dosya); Syne ön yüklenmez. Bu işte **Cabinet Grotesk'in ITF lisansı sorusu da kapandı** (yüz yok) ve derleme artık ağdan yazı tipi indirmez (`scripts/fetch-fonts.mjs`, `prebuild` ve `predev` kancaları silindi).

**`font-display: swap`, `optional` değil.** İstek `optional` ya da satır içi kritik CSS'i önerdi. `optional`, yüz ilk 100 ms içinde gelmezse **o ziyaret boyunca** yedek yüzü bırakır: yavaş bağlantıdaki bir alıcı tüm siteyi Arial'la görürdü, lüks bir tipografi sitesi için kabul edilemez. `swap` + ölçüsü eşlenmiş yedek yüz ("Inter Display Fallback": Arial'dan `size-adjust` 98,04 %, ascent 98,81 %, descent 24,6 %) değişimi kaydırmaz: yedi dil, üç genişlikte ölçülen **CLS 0,0000**. Satır içi kritik CSS ölçüldü ve **fayda vermez** (§6).

**Ölçek.** Başlık boyutları dar bir serif için çizilmişti, grotesk yaklaşık beşte bir daha geniştir. `--display-fit` 0,8 her başlık `clamp()`'ini çarpar; hero için `--hero-size` ayrıdır: en uzun hero satırı Almanca, "Bewegt sich wie Flüssigkeit." **10,6 em** (gerçek yüzle ölçüldü), hero sütunu en çok 64 rem, bu yüzden hero en çok 5,75 rem (92 px) olur ve **her dilde 820 px'ten itibaren iki satırda** kalır (CLAUDE.md "başlık en çok 2 satır"; telefonda uzun bir satır iki satır tutar, serif'te de öyleydi). Başlık izi −0,035 em (−0,04 em'de uzun cümle başlıkları sıkışıyordu), gövde +0,004 em. Arapça, Çince ve Japonca kendi sistem yığınlarında ve **eski boyutlarında** kalır (`--display-fit: 1`, ağırlık 400). Denetimin eski "−0,04 em yasak" ve "300 ağırlık yok" kuralları o yüze aitti; yeni yüz için güncellendi (aşırı sıkı iz hâlâ yasak).

**Diğer.** OG paylaşım kartı statik Inter Display SemiBold (34 KB) ile çizilir (Türkçe ı, ş dahil gözle doğrulandı). Remotion yükleyicisi yeni dosyaları okur (şimdiye dek render edilen sahneler metin çizmez). Film sözcüğü, Syne gelene dek 600 yerine 500'de çizilir (yeni dosyada 600 yok).

## 3. Sinematik medya etkileri

Yalnızca `opacity` ve `translate` hareket eder (kompozitörde, düzen ve boyama yok): (a) film ilk çözülmüş karede duran görüntünün üstüne 0,9 sn'de solarak girer (`SceneVideo` ilk `playing` olayında `data-on` yazar; JavaScript'siz ya da oynatmayan ziyaretçi duran görüntüyü görür); (b) ince işaretçili cihazda kartın üstüne gelince çerçevenin üzerinden yumuşak bir ışık şeridi geçer (`will-change` yalnızca geçiş sürerken). Azaltılmış harekette ikisi de kapalıdır. Zaten var olan: duran görüntü tembel `<img>`, video `preload="none"`, ekran dışında durur, sinema tuvali worker'da ve ilk boyamadan sonra başlar. Bu işte yeni bir canvas ya da kütüphane eklenmedi: mobilde motor hiç başlamaz ve ağırlık eklemek bu işin ters yönüdür.

## 4. İstemciden `tailwind-merge` çıkarıldı

`next experimental-analyze` ilk yük parçalarını modül modül gösterdi: `tailwind-merge` **8,6 KB gzip (28 KB ham)** idi ve yalnızca iki yerde (`Logo`, `SectionHead`) çağrılan `cn()` içindi; hiçbir çağrı çakışan yardımcı sınıf koymaz. `cn` artık düz `clsx`; bağımlılık kaldırıldı. Gerekirse bir bileşen kendi CSS sınıfını alır, yardımcı sınıflarla savaşmaz.

## 5. Mobil Lighthouse: sayının neyden yapıldığı

Lighthouse'un mobil skoru, **simüle** edilen LCP'ye (25 %) ve TBT'ye (30 %) bağlıdır. Aynı Lighthouse'u Node API ile çalıştırıp Lantern grafiğini düğüm düğüm döktüm (`lantern-lcp.mjs`, oturum betiği): iyimser ve kötümser tahmin **aynı**, yani LCP bir "kritik yol" değil, **gözlenen LCP'den önce biten her isteğin toplamı**dır. Gözlenen (kısıtsız) izde bütün ilk kaynaklar 75 ms'de biter, ilk boyama 260–330 ms'dedir; hepsi grafiğe girer.

| Parça (kapı açık `/`, gzip) | Bayt | Not |
|---|---|---|
| HTML | 43 KB | 0 → 755 ms (el sıkışma, istek, TCP yavaş başlangıcı: 2 tur) |
| Yazı tipi | 26 KB | önceden 71 KB |
| CSS | 17 KB | |
| React DOM | 71 KB | sabit |
| Next istemci çalışma zamanı | 45 KB | sabit |
| Uygulama ve geri kalan JS | ≈ 49 KB | önceden ≈ 58 KB (`tailwind-merge` çıktı) |
| **Toplam** | **≈ 258 KB** (önceden 302 KB), 18 istek | simüle LCP 2,66–2,83 sn |

**Sonuç:** 1,6 Mbps'te her 20 KB ≈ 0,1 sn. Çerçeve (React + Next) tek başına 116 KB, yani yalnızca onu indirmek ≈ 0,6 sn ve HTML ≈ 0,75 sn eder; **FCP bile ≈ 0,91 sn**'dir. LCP < 0,8 sn'nin, FCP'den küçük olması gerekirdi. Skor tarafı: LCP puanı 2,75 sn'de ≈ 0,84'tür (25 puan ağırlıkla ≈ 4 puan kayıp); mobil 100 için LCP ≈ 1,6 sn ve altı gerekir. TBT zaten ≈ 25–35 ms'dir (sakin makinede), puanı ≈ 1,0: **kalan açığın tamamı LCP'dir**.

**Reddedilen (ölçülerek).**
- *Boş bağlantı yuvaları hipotezi* (H1.1'de 6 bağlantıyı `icon.svg` ×2 ve `manifest` tutuyor, büyük JS geç başlıyor): bir yeniden yazan vekil sunucuyla (`rewrite-proxy.mjs`, sıkıştırma korunarak) bu üç istek HTML'den çıkarıldı: LCP **iyileşmedi, +150 ms kötüleşti** (kontrol 2.610–2.722, varyant 2.825–2.891). Model, ortak bant genişliğinden geçen toplam baytı sayar; yuva sayısı belirleyici değildir.
- *Satır içi kritik CSS:* HTML 43 KB'dan ≈ 60 KB'a çıkar ve TCP yavaş başlangıcında üçüncü tura (cum. 102 KB) girer: kazanılan bir RTT geri verilir. Net fayda yok, CSP'de nonce'lu `<style>` ek risk; yapılmadı.
- *`font-display: optional`:* §2.
- *Yazı tipini daha da küçültmek (Latin 26 → ≈ 18 KB, 400–500 aralığı ya da Geist):* ≈ 0,04 sn; 300 ağırlığı (başlıkların kimliği) kaybettirirdi.

**Ulaşılabilir tek büyük kaldıraç ve neden yapılmadı.** Simülasyon yalnızca gözlenen LCP'den **sonra biten** istekleri dışarıda bırakır. Çerçeve betikleri ilk boyamadan sonra istenseydi (yerel izde ≈ 250 ms'den sonra), LCP grafiği HTML + CSS + yazı tipine ≈ 1,0–1,2 sn'ye inerdi ve mobil 100'e yaklaşırdı. Bu, **gerçek bir yavaş 4G ziyaretçi için de** boyamayı hızlandırır (betikler bant genişliği için yarışmaz), ama Next App Router'ın bunu desteklenen bir yolu yoktur: `bootstrapScripts` etiketlerini Next üretir. Seçenekler: (a) Next'in HTML'ini yeniden yazmak (proxy ya da özel sunucu; Vercel'de çalışmaz ya da kırılgandır, CSP nonce'ları, Turbopack çalışma zamanı sırası, Next sürüm güncellemeleri); (b) ana sayfayı kısmi hidrasyonlu bir mimariye (adalar) taşımak, App Router'dan çıkmak. İkisi de bu işin kapsamı dışında, geri alması zor ve **sahibin kararıdır**; kendiliğinden yapılmadı.

## 6. Ölçümler (yerel, aynı makine, `ef72636` ile araya girerek; 16.10.2026)

Taban: bu oturumun başındaki doğrulanmış durum (`ef72636`, ADR 0021), ayrı bir kopyada derlenip `:3101`'de sunuldu; yeni yapı `:3100`. İki set alındı çünkü makine kullanıcının günlük makinesidir (VS Code güncellemesi, ChatGPT uygulaması çalışıyordu): **sakin** set CPU %4–16, **yüklü** set %20–46. Chrome 155, Lighthouse 13.5, sayfa `/` (kapı açık).

| | Eski (`ef72636`) | Yeni |
|---|---|---|
| **Mobil, sakin makine (n=5)** performans | 94 (94, 94, 94, 94, 94) | **96** (96, 96, 96, 97, 96) |
| LCP / FCP | 3.070 / 1.062 ms | **2.755 / 919 ms** |
| TBT | 27 ms | 28 ms |
| İndirilen toplam / JS | 387 KB / 174 KB | **334 KB / 165 KB** |
| **Mobil, yüklü makine (n=5)** performans | 92 (92–93) | **94** (92–95) |
| LCP | 3.139 ms | **2.841 ms** |
| TBT | 91 ms (75–155) | 145 ms (121–194): sakin sette eşit; bu sette 5 çiftin 4'ünde yeni yapıda yüksek (ortalama +43 ms), nedeni ayrıştırılmadı |
| **Masaüstü, sakin (n=5)** performans | 95 (76–100; bir koşu düştü) | **98** (94–100) |
| **Masaüstü, yüklü (n=6)** performans | 99 (99, 99, 100, 99, 99, 99) | **100** (altısı da 100) |
| Masaüstü LCP | 752 ms | **624 ms** |
| Erişilebilirlik, En iyi uygulamalar, SEO | 100 | 100 (tüm koşularda medyan) |
| CLS | 0 | 0 |
| Kritik yazı tipi baytı | 71,3 KB | **26,4 KB** (−%63) |

Okuma: **LCP farkı iki sette de tutarlı (≈ −300 ms) ve beklenen büyüklüktedir** (yazı tipi −45 KB, `tailwind-merge` −8,6 KB). Skor farkı +2'dir; mobil **96'da bir tavan** vardır (§5). Masaüstü 98–100: TBT iki durumludur (0 ya da ≈ 90 ms), makinenin o anki yüküne göre, iki yapıda da. **`perf:gate`**: mutlak bütçeler sessiz bir makine için ayarlıdır (ADR 0021 §8); bu makinede iki yapı da onları aştı (taban dahil: yerleşim 534 ms, bütçe 400), yani **gate yeşile çevrilemedi ve bütçeler gevşetilmedi**; göreli sonuç (aynı koşuda, yeni / taban): betik −%34, görev −%9, TBT tahmini −%30, yerleşim −%6, stil +%11, DOM 984 / 986.

## 7. QA

`npm run qa:browser` iki yeni grup kazandı: **`type`** (yedi dil × 412/820/1440 px: hiçbir başlık ekran dışına taşmaz, hero 820 px'ten itibaren iki satır, CLS < 0,005; ilk görünüm yalnızca Inter Display'i (Türkçede + Türkçe dosyayı) çeker, Arapça ve Çince hiç web yazı tipi çekmez) ve **`casestudy`** (§1). Tam koşu **114 kontrolün 113'ü** geçti: Arapça masaüstü kaydırma CLS'i bir kez 0,083 verdi (makine VS Code kurucusuyla yüklüydü), izole üç koşuda 0,00; **kararlı olduğu söylenemez**, bkz. §8. Denetim (`faz2-denetim.mjs`): yazı tipi bölümü yeni sisteme göre yeniden yazıldı (tek yüz, bayt bütçesi, eski yüz izi yok, Cabinet kalıntısı yok, ön yükleme). `npm run smoke` 180/180, `npm run arch:verify` 65/65, `npm run check` temiz.

## 8. Sınırlar ve açık kalanlar

- **Mobil 100/100 ve LCP < 0,8 sn sağlanmadı ve bu mimaride sağlanamaz** (§5): en iyi ölçülen 96/97. Canlıda (Vercel, Brotli ≈ %15–20 daha küçük, HTTP/2) sonuç farklı çıkar ve canlıda ölçülmeden yazılmaz (`lib/metrics.ts` değişmedi).
- **Yüklü makinede mobil TBT** yeni yapıda eskiden ortalama ≈ 43 ms yüksek ölçüldü (sakin makinede ikisi de ≈ 28 ms); skoru 1 puandan az etkiledi. Nedeni (yeni CSS'in ayrıştırılması, yazı tipi değişimi, ölçüm gürültüsü) ayrıştırılmadı.
- **Arapça masaüstü CLS flake'i** (bir koşuda 0,083, üçünde 0,00): yük altında bir bölümün geç çizilmesiyle ilgili görünüyor (CLS, içerik görünürlüğü kapalıyken 0,0000), ama nedeni ayrıca ayrıştırılmadı. Arapçada yazı tipi bu işte değişmedi (sistem yığını).
- Görsel inceleme ekran görüntüleriyle yapıldı (hero, kapı, telefon, OG); yedi dilin tüm bölümleri tek tek gözle gözden geçirilmedi (taşma ve satır sayısı otomatik sınanır). Sahibin gözü gerekir: 300 ağırlığın hero'daki karakteri, −0,035 em izi.
- Safari ve Firefox'ta yazı tipi ve medya etkileri sınanmadı (`opsz` sabitlendiği için değişken eksen farkı beklenmez).
- Remotion sahneleri metin çizmez; yeniden render edilmedi.

## 9. Birleştirme

Sahip dalların birleştirilmesini istedi: `perf/luxury-type-mobile` (bu iş) → `main`, geçmişte `feat/case-studies` ve `perf/enterprise-proof` ile birlikte (üst üste dizili oldukları için tek birleştirme hepsini getirir). **Yerel `main`'e birleştirilir; `git push` yapılmaz** (push Vercel üretimini tetikler ve ayrı bir izindir).

## Nasıl doğrulanır

```
npm run check                      # mesajlar (503 anahtar × 7 dil), typecheck, lint
python scripts/check-fonts.py      # kopya yazı tipi kümesinde mi
node faz2-denetim.mjs              # yazı tipi bölümü dahil
npm run arch:verify                # 65 sözleşme testi
npm run build && npx next start -p 3100
npm run smoke -- http://localhost:3100
npm run qa:browser -- http://localhost:3100            # --only=type | casestudy | cinema | parity
npm run perf -- --runs=5 --desktop=5 --paths=/ new=http://localhost:3100 old=http://localhost:3101
```
