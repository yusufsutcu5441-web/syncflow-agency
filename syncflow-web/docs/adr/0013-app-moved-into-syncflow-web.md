# ADR 0013: Uygulama `syncflow-web/` klasörüne taşındı; mevcut Vercel projesi yeni siteyi derliyor

- **Durum:** Kabul edildi, 09.10.2026 (sahibinin "evet, taşı" onayıyla). [ADR 0012](0012-vercel-deployment.md)'nin "ayrı proje" kararının yerini alır. Uygulama adımları ve geri dönüş: [docs/vercel-next-site.md](../vercel-next-site.md).
- **Bağlam:** Yeni Next.js sitesi yayında değildi. ADR 0012 ayrı bir Vercel projesi (`syncflow-next`) öngörmüştü; o proje `main` ve `next-site` push'larının hiçbirine tepki vermedi (neden dışarıdan görülemedi), sahibinin makinesinde Vercel paneli ve CLI'a bağlantı sorunu vardı (ağdaki TLS araya girmesi) ve sahibi "panelle ya da ayarlarla vakit kaybetme, `main`'e itelim" dedi. Mevcut proje `syncflow-web` ise çalışıyordu: depoya bağlı, Production Branch `main`, **Root Directory `syncflow-web`**, `syncflow.agency` ona bağlı. Panelden değiştirilemeyen şey Root Directory'ydi; değiştirilebilen şey **`main`'in yapısıydı**.

## Karar

1. **Uygulama dosyaları depo kökünden `syncflow-web/` içine `git mv` ile taşındı** (153 yeniden adlandırma, tümü %100 eşleşmeli; dosya geçmişi korunur). Depo kökünde yalnızca `syncflow-web/`, `claude code` ve `motor_hedef.py` kalır.
2. **Eski statik sitenin 47 dosyası `main`'den kaldırıldı.** Silinmiş değildir: `legacy-site` dalında (`60d9f00`) ve `main` geçmişinde (`531f569` dahil) durur.
3. **`syncflow-web/vercel.json`** eklendi: `framework: nextjs`, `installCommand`, `buildCommand`, `devCommand`, `outputDirectory` = `null`. Amaç, projenin panelde eski statik site için saklanan ayarlarını (framework "Other", çıktı klasörü gibi) dosya düzeyinde geçersiz kılmak. **Bu geçersiz kılma beklenen biçimde çalışır, ama canlıda doğrulanmadı:** ilk deployment'ın ölçümü (docs/vercel-next-site.md §6) bunun kanıtıdır.
4. **Yayın = `git push origin main`.** Panel, CLI ve ayar gerekmez.

## Reddedilen seçenekler
- **Ayrı proje (`syncflow-next`):** push'lara tepki vermedi, panel gerektirir (ADR 0012 §9).
- **Panelden Root Directory'yi `./` yapmak:** panel gerektirir; ayrıca 08.10'da Root Directory/yapı uyumsuzluğu 68 dakikalık kesinti yarattı.
- **Eski siteyi `main`'de bırakıp yeni siteyi başka klasöre koymak ve dalda `vercel.json` ile yönlendirmek:** iki site tek projeye sığmaz; "iki ağaç, tek proje" belirsizliğini sürdürür.

## Sonuçlar (ziyaretçi ve sahibi için)
- **Eski site yok oldu.** `syncflow.agency` artık yeni siteyi sunar. Eski `/kvkk/` ve `/demo/*` adresleri **404** verir (yönlendirme eklenmedi: yeni sitede birebir karşılığı olan sayfalar yok; hukuki içerik zaten taslak). İstenirse `next.config` `redirects()` ile `/kvkk/ → /tr/privacy` eklenebilir; ayrı karar.
- **Hukuki sayfalar yer tutuculu taslak olarak herkese açık** (K7 kararı: avukat onayına kadar böyle kalır; sayfada "taslak" uyarısı durur). Bu, yayından önce giderilmesi gereken bir şeydi; sahibi bunu bilerek taşıdı.
- **Briefing formu ilk yayında 503 verir** ve ziyaretçiye `mailto:` taslağı çıkarır: Turnstile ve webhook anahtarları yalnızca panelden girilebilir ve girilmedi. Yanıtlar kaybolmaz, ama form işlevsel değildir.
- **Mobil performans ölçülmedi** (masaüstü Lighthouse 100/100/100/100, mobil bu sürümde ölçülmedi, sayfa "ölçülecek" der).
- **`next-site` dalı ve diğer kök düzenli dallar** Vercel'de her push'ta başarısız Preview üretir (`syncflow-web` Root Directory'si orada yok). Oraya push edilmez. `syncflow-next` projesi gereksizdir.
- **`NEXT_PUBLIC_SITE_URL` tanımlanmaması sorun değildir:** varsayılan `https://syncflow.agency`.

## Geri dönüş
Taşıma tek bir commit'tir. Geri alma: `git revert --no-edit <sha>` + `git push origin main` (ileri sarma; 1-3 dk), ya da panelde önceki Production deployment'ı *Promote to Production*. Taşımadan önceki `main` = `531f569` (yerel etiket `yedek-main-tasima-oncesi`; commit uzakta da var). Ayrıntı: docs/vercel-next-site.md §2.

## Doğrulama (itmeden önce, `syncflow-web/` içinde, taşıma sonrası düzende)
Aşağıdaki sonuçlar taşınmış çalışma kopyasında alındı; temiz kopya derlemesi ve canlı ölçüm ayrıca kaydedilecek.

| Kontrol | Sonuç |
|---|---|
| `check:messages`, `check:fonts`, `brand:check`, `typecheck`, `lint` | hepsi çıkış 0 |
| `node faz2-denetim.mjs --root . --build` | 110 geçti, 0 hata, 1 uyarı (`generateStaticParams`, eski), 4 bilgi |

## Dersler
- **Taşıma sırasında üç dizin (`app/`, `components/`, `lib/`; 62 dosya) diskten kayboldu** (`git mv -k` indeksi güncelledi, çalışma ağacında dizinler yoktu: durum `RD`). Neden anlaşılamadı. İndeks ve HEAD aynı blob'ları taşıdığından `git restore --worktree -- syncflow-web/app syncflow-web/components syncflow-web/lib` ile aynen geri geldi; taşımadan sonra `git status`'ta `RD` ve diskte eksik dizin kontrolü şarttır.
- **Çalışma kopyasında derleme geçmesi yetmez:** temiz bir klonda (`.env` yok, `node_modules` yok, yalnızca izlenen dosyalar) `npm ci` ve `npm run build` denenmeden itilmez; aksi hâlde yerelde duran ama izlenmeyen bir dosyaya bağımlılık gizli kalır.
