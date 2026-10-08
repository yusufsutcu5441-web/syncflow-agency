# ADR 0012: Vercel'e çıkış: ayrı proje, dal düzeni ve 08.10.2026 kesintisinin dersleri

- **Durum:** Kabul edildi, 08.10.2026. **"Ayrı proje" kararı (Kararlar 1 ve 3) 09.10.2026'da [ADR 0013](0013-app-moved-into-syncflow-web.md) ile değişti:** uygulama `syncflow-web/` klasörüne taşındı, mevcut proje onu derliyor. Olay kaydı ve dersler geçerlidir. Güncel adımlar [docs/vercel-next-site.md](../vercel-next-site.md)'de.
- **Bağlam:** GitHub deposu (`yusufsutcu5441-web/syncflow-agency`, **herkese açık**) Vercel'de `syncflow-web` projesine bağlıydı ve `syncflow.agency` oradan eski bir statik siteyi sunuyordu. Uzak `main` (`60d9f00`, "initial agency commit") bu eski siteyi (`syncflow-web/`) taşıyordu ve yerel Next.js geçmişiyle **ilgisizdi** (ortak commit yok).

## Ne oldu (UTC, 08.10.2026)

| Saat | Olay |
|---|---|
| 20:24 | Uzak `main`, sahibinin onayıyla, yeni Next.js sürümüyle değiştirildi (eski `main` önce `legacy-site` dalına yedeklendi, `--force-with-lease`). Vercel bir Production deployment'ı "başarılı" bildirdi; `syncflow.agency` **404 NOT_FOUND** vermeye başladı. |
| 20:35 | `main` yedekten geri alındı, yeni sürüm `next-site` dalına park edildi. Yeni deployment "başarılı" ama site hâlâ 404. |
| 21:13 | Panelden Redeploy: yine 404. Alan adı **depo kökünü** statik dosya olarak sunuyordu (`/` 404, `/syncflow-web/index.html` 200, kök dizindeki iki boş dosya indirilebiliyordu). |
| 21:25 | Panelde Root Directory `syncflow-web` yapıldı ve Redeploy: yeni deployment oluşmadı, site değişmedi (Redeploy güncel ayarı almadı). |
| 21:32 | Uzak `main`'e içeriği değişmeyen **boş bir commit** (`44bbf02`, ileri sarma) itildi: git push yeni deployment tetikledi ve site eski haliyle geri geldi (`/`, `/kvkk/`, `/demo/*`, `robots.txt`, `sitemap.xml` 200; depo kökü artık 404). |
| 21:43 | Kılavuz commit'i `next-site`'e itildi: eski `syncflow-web` projesinde bir **Preview** derlemesi tetiklendi ve **başarısız** oldu (Root Directory `syncflow-web`, `next-site`'te yok). Canlı site etkilenmedi (200). |
| 22:45 | Uzak `main`'e ilgisiz geçmişlerin birleşimi itildi (`44bbf02..777a9f8`, ileri sarma, zorlama yok). Eski proje yeniden deploy etti ve **site boyunca 200 verdi**; depo kökündeki yeni dosyalar canlıda 404 (yalnızca eski sitenin kendi `README.md`'si, zaten eskiden de açıktı). |
| 22:53 | `next-site` (`84da115`) itildi: eski projede yine başarısız Preview; `syncflow-next` hiçbir push'a (ne `main` ne `next-site`) tepki vermedi. |

Toplam kesinti yaklaşık **68 dakika** (20:24 → 21:32). Kök neden: projenin Root Directory ayarı, `main`'in yapısıyla (eski site bir alt klasörde) uyumsuzdu; Vercel boş ya da yanlış kökü "başarılı" saydı.

## Kararlar

1. **Yeni site ayrı bir Vercel projesinde** (`syncflow-next`), Production Branch `next-site`, Root Directory `./`, Framework Next.js. Eski proje `syncflow-web` (Root Directory `syncflow-web`, dal `main`) **olduğu gibi kalır**; `syncflow.agency` geçiş gününe kadar orada.
2. **Dal düzeni (uzakta, 08.10 22:45Z'den beri):** `main` = eski site (`syncflow-web/`) + yeni Next.js uygulaması (kök), ilgisiz geçmişlerin birleşimi (`777a9f8`; iki ağaçta ortak yol yoktu, çakışmasız; `syncflow-web/` ağaç karması birleşimden önce ve sonra aynı) · `legacy-site` = eski sitenin yedeği (`60d9f00`) · `next-site` = yeni sitenin saf geçmişi. **Yerel ve uzak `main` eşit;** `git push` artık normal bir ileri sarmadır (önceki "yerel main itilmez" kuralı kalktı). **`main`'de `syncflow-web/` klasörü silinmez ya da taşınmaz:** eski proje (Root Directory `syncflow-web`) onu sunuyor.
3. **Geçiş** yalnızca ön koşullar bitince (docs/vercel-next-site.md §8): gerçek n8n teslimi, Turnstile ve Upstash, dolu ve onaylı hukuki sayfalar, ölçülmüş mobil performans. Alan adı projeler arasında taşınır; geri dönüş alan adını eski projeye geri eklemektir.
4. **Hazırlık adresi korumalı kalır** (Deployment Protection): içinde yer tutuculu hukuki metinler var.

## Dersler

- **`main`'i değiştirmeden önce Vercel proje ayarını (Root Directory, Production Branch, framework) görmek gerekir.** Bu depoda panele erişim yoktu; "deployment success" ile "site çalışıyor" aynı şey değildir. Sonuç, alan adının kendi isteğiyle (`/`, `robots.txt`, bir alt yol) ölçülerek doğrulandı.
- **Panelden Redeploy güncel proje ayarlarını almayabilir; bir git push'u alır.** İçeriği değiştirmeyen boş bir ileri sarma commit'i, ayar değişikliklerini devreye sokmanın güvenli yoludur.
- **Zorla itme (force) yalnızca yedek alındıktan sonra, `--force-with-lease=<dal>:<beklenen sha>` ile** yapılır: uzak dal başka biri tarafından değiştirilmişse işlem reddedilir.
- Depo herkese açık olduğundan, eski kök dizindeki dosyalar (`claude code`, `motor_hedef.py`; ikisi de boş) GitHub'da zaten görünürdü; yine de bir alan adından indirilebilir olmaları ayrıca kapatıldı. **Yeni eklenen her dosya herkese açık depoya gider:** sır, `.env` ve lisanslı font eklenmez (`audit:secrets`, denetimin depo hijyeni kapısı, geçmiş taraması).

## Açık olanlar
- Vercel projesi (`syncflow-next`) henüz **oluşturulmadı**; adımlar sahibindedir (panel).
- Vercel'de derleme ve `/og` yazı tipi izlemesi, canlı performans, HTTP/2 + Brotli altında ölçüm: yayından sonra doğrulanacak.
- **Eski proje `next-site`'i Preview olarak derlemeye çalışıyor ve başarısız oluyor** (21:43). İlk push'larda (yeni dal oluşturma) deployment kaydı çıkmamıştı; bu yüzden "dal filtresi var" çıkarımı yanlıştı. Çözüm: eski projeye Ignored Build Step (docs/vercel-next-site.md §2 madde 5); panelde doğrulanmadı. Ayrı proje oluşunca `next-site` push'ları yalnızca orada derlenmeli.
- **İlgisiz geçmişleri birleştirmek** (`git merge --allow-unrelated-histories`) uzak geçmişi silmeden `main`'i yeni siteyle ortak bir geçmişe getirir, ama **Vercel'e bağlı projenin Root Directory'siyle uyumunu önceden ölçmek şart**: `syncflow-web/` ağacının birleşimden önce ve sonra aynı olduğu, uzak `main`'in bu commit'in atası olduğu (ileri sarma) doğrulandı, ve itmeden sonra canlı adres ölçüldü.
- **Yeni projenin push'a tepki vermemesi** dışarıdan teşhis edilemiyor (docs/vercel-next-site.md §9). Panel/CLI sorunu yerel ağdaki TLS araya girmesinden (BTK sertifikası) kaynaklanıyor görünüyor.
