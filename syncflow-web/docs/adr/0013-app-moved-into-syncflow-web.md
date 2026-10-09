# ADR 0013: Uygulama `syncflow-web/` klasörüne taşındı; mevcut Vercel projesi yeni siteyi derliyor

- **Durum:** Kabul edildi ve **uygulandı**: yeni site `syncflow.agency`'de canlı (08.10.2026 23:51Z = 09.10 02:51 yerel; sahibinin "evet, taşı" onayıyla). [ADR 0012](0012-vercel-deployment.md)'nin "ayrı proje" kararının yerini alır. Uygulama adımları ve geri dönüş: [docs/vercel-next-site.md](../vercel-next-site.md).
- **Bağlam:** Yeni Next.js sitesi yayında değildi. ADR 0012 ayrı bir Vercel projesi (`syncflow-next`) öngörmüştü; o proje `main` ve `next-site` push'larının hiçbirine tepki vermedi (neden dışarıdan görülemedi), sahibinin makinesinde Vercel paneli ve CLI'a bağlantı sorunu vardı (ağdaki TLS araya girmesi) ve sahibi "panelle ya da ayarlarla vakit kaybetme, `main`'e itelim" dedi. Mevcut proje `syncflow-web` ise çalışıyordu: depoya bağlı, Production Branch `main`, **Root Directory `syncflow-web`**, `syncflow.agency` ona bağlı. Panelden değiştirilemeyen şey Root Directory'ydi; değiştirilebilen şey **`main`'in yapısıydı**.

## Karar

1. **Uygulama dosyaları depo kökünden `syncflow-web/` içine `git mv` ile taşındı** (153 yeniden adlandırma, tümü %100 eşleşmeli; dosya geçmişi korunur). Depo kökünde yalnızca `syncflow-web/`, `claude code` ve `motor_hedef.py` kalır.
2. **Eski statik sitenin 47 dosyası `main`'den kaldırıldı.** Silinmiş değildir: `legacy-site` dalında (`60d9f00`) ve `main` geçmişinde (`531f569` dahil) durur.
3. **`syncflow-web/vercel.json`** eklendi: `framework: nextjs`, `installCommand`, `buildCommand`, `devCommand`, `outputDirectory` = `null`. Amaç, projenin panelde eski statik site için saklanan ayarlarını (framework "Other", çıktı klasörü gibi) dosya düzeyinde geçersiz kılmak. **Bu geçersiz kılma beklenen biçimde çalışır, ama canlıda doğrulanmadı:** ilk deployment'ın ölçümü (docs/vercel-next-site.md §6) bunun kanıtıdır.
4. **Yayın = `git push origin main`.** Panel, CLI ve ayar gerekmez.
5. **jsdom 26.x'e sabitlendi** (`^26.1.0`; `@types/jsdom` `^21.1.7`), yayın sonrası bulunan bir hata yüzünden (aşağıda). jsdom yalnızca DOMPurify'ın sunucu tarafı DOM penceresi olarak kullanılıyor; temizleme mantığı değişmedi.

## Reddedilen seçenekler
- **Ayrı proje (`syncflow-next`):** push'lara tepki vermedi, panel gerektirir (ADR 0012 §9).
- **Panelden Root Directory'yi `./` yapmak:** panel gerektirir; ayrıca 08.10'da Root Directory/yapı uyumsuzluğu 68 dakikalık kesinti yarattı.
- **Eski siteyi `main`'de bırakıp yeni siteyi başka klasöre koymak ve dalda `vercel.json` ile yönlendirmek:** iki site tek projeye sığmaz; "iki ağaç, tek proje" belirsizliğini sürdürür.

## Sonuçlar (ziyaretçi ve sahibi için)
- **Eski site yok oldu.** `syncflow.agency` artık yeni siteyi sunar. Eski `/kvkk/` ve `/demo/*` adresleri **404** verir (yönlendirme eklenmedi: yeni sitede birebir karşılığı olan sayfalar yok; hukuki içerik zaten taslak). İstenirse `next.config` `redirects()` ile `/kvkk/ → /tr/privacy` eklenebilir; ayrı karar.
- **Hukuki sayfalar yer tutuculu taslak olarak herkese açık** (K7 kararı: avukat onayına kadar böyle kalır; sayfada "taslak" uyarısı durur). Bu, yayından önce giderilmesi gereken bir şeydi; sahibi bunu bilerek taşıdı.
- **Briefing formu yayında 503 verir** (`{"ok":false,"code":"unavailable"}`) ve ziyaretçiye `mailto:` taslağı çıkarır: Turnstile ve webhook anahtarları yalnızca panelden girilebilir ve girilmedi. Yanıtlar kaybolmaz, ama form işlevsel değildir. (İlk 4 dakika 500'dü, aşağıya bakın.)
- **Mobil performans ölçülmedi** (masaüstü Lighthouse 100/100/100/100, mobil bu sürümde ölçülmedi, sayfa "ölçülecek" der).
- **`next-site` dalı ve diğer kök düzenli dallar** Vercel'de her push'ta başarısız Preview üretir (`syncflow-web` Root Directory'si orada yok). Oraya push edilmez. `syncflow-next` projesi gereksizdir.
- **`NEXT_PUBLIC_SITE_URL` tanımlanmaması sorun değildir:** varsayılan `https://syncflow.agency`.

## Geri dönüş
Taşıma tek bir commit'tir. Geri alma: `git revert --no-edit <sha>` + `git push origin main` (ileri sarma; 1-3 dk), ya da panelde önceki Production deployment'ı *Promote to Production*. Taşımadan önceki `main` = `531f569` (yerel etiket `yedek-main-tasima-oncesi`; commit uzakta da var). Ayrıntı: docs/vercel-next-site.md §2.

## Doğrulama (itmeden önce, `syncflow-web/` içinde, taşıma sonrası düzende)
Çalışma kopyasında (taşınmış düzen) ve taşıma commit'inin (`b7dafb0`) **temiz klonunda** (`core.autocrlf=false`, `.env` yok, `node_modules` yok) denendi:

| Kontrol | Sonuç |
|---|---|
| `check:messages`, `check:fonts`, `brand:check`, `typecheck`, `lint` (çalışma kopyası) | hepsi çıkış 0 |
| `node faz2-denetim.mjs --root . --build` (çalışma kopyası) | 110 geçti, 0 hata, 1 uyarı (`generateStaticParams`, eski), 4 bilgi |
| Temiz klon, `syncflow-web/` içinde `npm ci` | geçti, 439 paket, 96 sn |
| Temiz klon, `npm run build` | geçti (çıkış 0), 59 sn, 13 rota |
| Temiz klon, `brand:check` (LF) ve `faz2-denetim.mjs --root .` | geçti; 108 geçti, 0 hata |
| Duman testi, klonun üretim sunucusu, **hiçbir ortam değişkeni olmadan** (`TURNSTILE_MODE=unset`), `:3100` | **95/95** |
| Elle: `/`, `/tr` 200; `/de`, `/fr` 404; `security.txt`, `robots.txt`, `sitemap.xml` 200; `/og?locale=en` `image/png`; `GET /api/briefing` 405; CSP yalnızca report-only; HSTS var; sitemap yalnızca `syncflow.agency` `en`+`tr` | doğru |
| `/kvkk/` ve `/demo/` yeni sitede | 308 (sondaki eğik çizgi), ardından 404: eski adresler karşılıksız |

## Yayın ve canlı doğrulama (UTC, 08.10.2026)

| Saat | Olay |
|---|---|
| 23:49 | `tasi` dalı itildi: eski projede Preview derlemesi **başarılı** (54 sn; içerik SSO arkasında okunamadı). |
| 23:51:20 | `main` `531f569..848f35e` ileri sarmayla itildi. 47 sn sonra `/tr` 200, yeni başlık, `security.txt` 200 (öncesinde 404). |
| 23:52 | Canlı kontrol: `/`, `/tr`, `/privacy`, `/tr/imprint`, `robots.txt`, `sitemap.xml` (yalnızca `syncflow.agency` `en`+`tr`), `manifest`, `icon`, `security.txt` 200; `/de /fr /ar /ja` 404; CSP yalnızca report-only; HSTS var; `/og?locale=en` 1200×630 PNG. **`/api/briefing` her yönteme boş gövdeli 500 verdi** (yerelde 405/403). |
| 23:54 | Geçici tanı route'u (`/api/zz-diag`) itildi: her bağımlılığı tek tek yükleyip hatayı döndürüyor. |
| 23:55 | Neden: Node **v24.21.0 linux/x64**; `jsdom` yüklenirken `ERR_REQUIRE_ESM`: `html-encoding-sniffer` 6, ES modülü `@exodus/bytes/encoding-lite.js`'i `require()` ediyor, Vercel çalışma zamanı buna izin vermiyor. Route içe aktarma anında çöküyor. |
| 23:58-23:59 | `jsdom` 26.1.0'a sabitlendi (`bd28f9f`) ve itildi. `GET /api/briefing` 405; tanı route'unda 9 bağımlılığın hepsi `ok`, `toPlainText('<b>x</b>')` çalışma zamanında çalıştı. |
| 00:05 (09.10) | Tanı route'u kaldırıldı (`ae9cb08`; `/api/zz-diag` 404). Canlı savunma ölçümü (kaldırmadan önce, düzeltme canlıyken): GET 405 · Origin yok 403 · yabancı Origin 403 · `text/plain` 415 · bozuk JSON 400 · `{}` 422 · geçerli gövde ve anahtar yok **503 `unavailable`**. |

Hata, yerelde bulunamazdı: bu çalışma kopyasında Node `require()` ile ES modülü yükler. **`node --no-experimental-require-module` ile yerelde birebir yeniden üretildi** (aynı modül, aynı mesaj), ve düzeltme bununla sınandı: duman testi jsdom 29'da 7 kontrolde kırmızı, jsdom 26'da hem normal hem kısıtlı Node'da 121/121.

## Dersler
- **Derleme başarısı ve "sayfa 200" çalışma zamanı hatasını göstermez.** `/api/briefing` yalnızca çağrıldığında yüklendiği için derleme, Preview ve sayfaların canlı kontrolü geçti; hata ancak o route'a istek atılınca göründü. Yayından sonra her dinamik route en az bir istekle denenir.
- **Vercel'in Node çalışma zamanı `require()` ile ES modülü yüklemez** (Node 24.21'de bile). Sunucuda yüklenen paketlerin tüm bağımlılık zinciri CommonJS-uyumlu olmalı. `faz2-denetim.mjs` artık jsdom'un `--no-experimental-require-module` ile yüklendiğini denetler; jsdom 27+ bunu bozar, yükseltme yapılmaz.
- **Panelsiz tanı:** günlüklere erişim yokken, geçici bir route ile (her bağımlılık `try/catch` içinde yüklenir, hata ve Node sürümü döner) neden tek istekte bulundu. Route bulgudan hemen sonra silindi.
- **Taşıma sırasında üç dizin (`app/`, `components/`, `lib/`; 62 dosya) diskten kayboldu** (`git mv -k` indeksi güncelledi, çalışma ağacında dizinler yoktu: durum `RD`). Neden anlaşılamadı. İndeks ve HEAD aynı blob'ları taşıdığından `git restore --worktree -- syncflow-web/app syncflow-web/components syncflow-web/lib` ile aynen geri geldi; taşımadan sonra `git status`'ta `RD` ve diskte eksik dizin kontrolü şarttır.
- **Çalışma kopyasında derleme geçmesi yetmez:** temiz bir klonda (`.env` yok, `node_modules` yok, yalnızca izlenen dosyalar) `npm ci` ve `npm run build` denenmeden itilmez; aksi hâlde yerelde duran ama izlenmeyen bir dosyaya bağımlılık gizli kalır.
