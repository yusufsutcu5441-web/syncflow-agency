# ADR 0024: Content-Security-Policy artık enforce

- **Durum:** Uygulandı, 17.10.2026. [ADR 0001](0001-csp-report-only.md)'in "Faz 7'ye kadar report-only" kısmının yerine geçer; politikanın kendisi, nonce mekanizması ve `CSP_MODE` anahtarı aynı kalır, yalnızca **varsayılan tersine döndü**.
- **Karar:** "kaliteyi en üst seviyeye çıkar, eksiklerini bul ve sırasıyla kapat" (proje sahibi, 17.10.2026) ve daha önceki genel yetki ("her şey onayımdadır"). ADR 0001 geçişi "F7'de sahibin kararı" diye bırakmıştı; sahip o kararı bu yetkiyle bana devretti. Geri alma tek bir ortam değişkenidir (aşağıda).

## 1. Bağlam

CSP, nonce + `strict-dynamic` ile kuruldu (`lib/security/csp.ts`, `proxy.ts`): betik yalnızca nonce'lu olanlar ve onların yüklediği, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'self'`, üçüncü taraf yalnızca Cloudflare Turnstile. Report-only iken tarayıcı politikayı değerlendirir ve ihlalleri bildirir ama **hiçbir şeyi engellemez**: enjekte edilmiş bir betiğe karşı korumasızdır (ADR 0001 bunu "−" olarak yazmıştı). Savunma React'in kaçışına, DOMPurify'a ve kullanıcı HTML'inin hiçbir yerde render edilmemesine dayanıyordu. Bunlar iyi katmanlardır ama tek katman olmamalıdır.

## 2. Kanıt (enforce'a geçmeden önce)

- **Canlıda** (`https://syncflow.agency`, report-only iken; `securitypolicyviolation` olayı report-only'de de tetiklenir): 12 ziyaret (kapı masaüstü ve telefon, ana sayfa masaüstü ve telefon tüm sayfa boyunca kaydırılarak, dil menüsü, vaka diyaloğu, briefing alanına odak ve yazı, motor kapalı, vaka sayfası, gizlilik, imprint, `tr`, `ar` (sağdan sola), `de`, `zh`): **0 ihlal, 0 konsol hatası, 0 sayfa hatası**.
- **Yerelde gerçek enforce** (`CSP_MODE=enforce`, aynı derleme): aynı tarama 0 ihlal; `framework`, `gate`, `casestudy`, `cinema`, `integration` grupları 57/57; duman testi, mevcut derleme eski metrik mührüyle derlendiği için tek kontrolde (yayınlanan sayılar) düştü, CSP ile ilgisiz (yeniden derleme sonrası yeşil).
- **Önceki denemeler:** enforce ile duman 115/115 ve **gerçek Turnstile widget'ı** (Cloudflare test anahtarlarıyla) 12/12 ([ADR 0010](0010-briefing-delivery-and-security.md), [docs/perf/faz2b3.md](../perf/faz2b3.md)). Bu ADR'den sonra eklenen yükleyici (ADR 0023) nonce'u kendi `src`/`nonce`'undan kopyalar ve `strict-dynamic` ile güvenilir; enforce altında hidrasyon testleri geçti.

## 3. Ne değişti

- `lib/security/csp.ts`: `CSP_MODE` varsayılanı `enforce`; yalnızca `CSP_MODE=report-only` raporlayıp engellemez. Başlık `Content-Security-Policy`; `upgrade-insecure-requests` HTTPS'te artık gönderilir (HSTS zaten zorunluydu).
- `scripts/smoke.mjs`: varsayılan olarak enforce bekler (`EXPECT_CSP_MODE=report-only` eski davranışı sınar). `scripts/live-check.mjs`: enforce başlığı yoksa uyarır, hiç CSP yoksa düşer. Denetim (G4) varsayılanın enforce olduğunu doğrular.
- **Yeni kapı `npm run qa:csp`** (`scripts/qa-csp.mjs`): yukarıdaki 12 ziyareti yapar ve her ihlal, konsol hatası ve sayfa hatası için 1 döner. Yeni bir dış kaynak (betik, çerçeve, bağlantı, yazı tipi, görsel) ekleyen her değişiklikten ve politikaya dokunan her dağıtımdan sonra çalıştırılır: enforce altında o kaynak engellenir.
- `.env.example`, README, CLAUDE.md, `docs/vercel-next-site.md` güncellendi.

## 4. Riskler ve geri alma

- **Turnstile canlıda henüz çalışmıyor** (site anahtarı tanımlı değil, widget çizilmiyor): politika `challenges.cloudflare.com`'a betik, bağlantı ve çerçeve izni verir ve widget daha önce enforce altında test edildi, ama gerçek alan adında canlı anahtarla ilk denemede formun açılıp gönderildiği **sahibin Turnstile anahtarlarını girdiği gün ayrıca doğrulanmalı** (`npm run qa:csp` form alanına odaklanır, widget'ı çizdirmez; form kurulumundan sonra widget görünür hâle gelince tekrar çalıştırın).
- Tarayıcı eklentilerinin ziyaretçi sayfasına enjekte ettiği betikler artık engellenir ve konsolda ihlal olarak görünür: sitenin hatası değildir, zararsızdır (raporlar `/api/csp-report`'a düşer ve günlüğe yazılır; gürültü olabilir).
- Bir ihlal raporu gelirse (`/api/csp-report` günlüğü, Vercel günlüklerinde) politika ya da kaynak düzeltilir; günlüklere erişimim yok, bu yüzden izlemeyi sahip ya da `npm run qa:csp` yapar.
- **Acil geri alma:** Vercel'de `CSP_MODE=report-only` ortam değişkeni + yeniden dağıtım (kod değişikliği yok); ya da `git revert`.

## Nasıl doğrulanır

```
npm run build && npx next start -p 3100
npm run smoke -- http://localhost:3100       # varsayılan: enforce başlığı bekler
npm run qa:csp -- http://localhost:3100      # 0 ihlal, 0 konsol hatası
node scripts/live-check.mjs https://syncflow.agency   # "the CSP is enforced" PASS
npm run qa:csp -- https://syncflow.agency
```
