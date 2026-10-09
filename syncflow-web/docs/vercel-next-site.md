# Vercel'e yayın: tek proje, uygulama `syncflow-web/` klasöründe

- **Durum:** 09.10.2026. Karar ve gerekçe: [ADR 0013](adr/0013-app-moved-into-syncflow-web.md). 08.10 kesintisinin kaydı: [ADR 0012](adr/0012-vercel-deployment.md).
- **Düzen:** depo kökünde yalnızca `syncflow-web/` (Next.js uygulaması), `claude code` ve `motor_hedef.py` (ikisi de boş, eski) var. Vercel projesi `syncflow-web` (Root Directory `syncflow-web`, Production Branch `main`, alan adı `syncflow.agency`) **`main`'e her push'ta bu klasörü derler.** Tüm komutlar (`npm ci`, `npm run build`, `node faz2-denetim.mjs --root .`) `syncflow-web/` içinde çalışır.
- **`syncflow-web/vercel.json`:** projenin panelde eski statik site için kayıtlı ayarlarını (framework, build/install/output) geçersiz kılar: `framework: nextjs`, geri kalanı `null` (Next.js varsayılanı). **Bu geçersiz kılmanın canlıda işlediği ilk deployment'ta ölçülerek doğrulanır** (§6); yalnızca belgeye güvenmeyin.
- **Dallar:** `main` = yayın. `legacy-site` = eski statik sitenin yedeği (`60d9f00`). `next-site` = yeni sitenin eski, kök düzenli geçmişi: **artık yayın dalı değildir ve Root Directory `syncflow-web` orada bulunmadığından Vercel'de her push'ta başarısız bir Preview üretir; oraya push etmeyin** (silinmesi sahibinin kararıdır). Diğer çalışma dalları da kök düzenlidir; Vercel'e çıkarmayın.

## 1. Yayına çıkış: ne yapılır

```bash
git push origin main      # Vercel otomatik derler (1-3 dk)
```

Panele, CLI'a ya da ayara gerek yoktur. Panelden "Redeploy" **eski kaynağı ve eski ayarı** yeniden derler; yeni davranış için push edin (boş bir commit yeter: `git commit --allow-empty -m "chore: redeploy"`).

## 2. Geri dönüş (yeni site bozuk ya da yanlış çıkarsa)

En hızlı yoldan yavaş yola:

1. **Panel (erişim varsa, anında):** Deployments → `531f569` kaynaklı son eski-site Production deployment'ı → **Promote to Production** (ya da *Instant Rollback*).
2. **Git (terminalden, 1-3 dk):** taşımadan beri gelen **tüm** commit'leri geri alıp itin; eski site `syncflow-web/` içinde geri gelir.
   ```bash
   git revert --no-edit 531f569..HEAD   # 531f569 = taşımadan önceki main; en yeniden eskiye geri alır
   git push origin main                 # ileri sarma, zorlama yok
   ```
   Bu komut 09.10'da geçici bir dalda denendi: sonuç ağaç, `531f569`'un ağacıyla **aynı karmaya** (`600cfa4a59`) sahip. Yalnızca taşıma commit'ini geri almak, sonraki commit'ler aynı dosyalara dokunduğu için çakışır; hep aralığı kullanın.
3. **Yedek:** yerel etiket `yedek-main-tasima-oncesi` = `531f569`; commit uzak `main`'in atasıdır, yani `git revert` yolu etiket olmasa da çalışır.

Geri almadan sonra `https://syncflow.agency/` ve `/kvkk/` 200 vermeli (eski site).

## 3. Node sürümü
Vercel **Settings → General → Node.js Version** 22.x ya da 24.x olmalı (`package.json` `engines`: `>=20.19.0`). Panele girilemiyorsa Vercel varsayılanı (yeni projelerde 22.x) yeterlidir; `engines` aralığı bunu kapsar.

## 4. Ortam değişkenleri (panel: Settings → Environment Variables; Production ve Preview)

Değişkenler **yalnızca panelden** girilir; o yüzden ilk yayında hiçbiri tanımlı olmayabilir. Site yine çalışır (§5).

| Değişken | Değer / kaynak | Gizli mi |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | **tanımlamayın**: varsayılanı `https://syncflow.agency` | hayır |
| `NEXT_PUBLIC_LAUNCHED_LOCALES` | tanımlamayın: varsayılan `en,tr` | hayır |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile widget site anahtarı (izinli alan adı: `syncflow.agency`) | hayır |
| `TURNSTILE_SECRET_KEY` | aynı widget'ın gizli anahtarı | **evet** |
| `CONTACT_WEBHOOK_URL` | n8n Webhook düğümünün Production URL'si (https) | **evet** |
| `CONTACT_WEBHOOK_SECRET` | n8n ile paylaşılan HMAC sırrı (`openssl rand -hex 32`) | **evet** |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST (önerilir; yoksa hız sınırı örnek başına sayılır ve ilk istekte günlüğe uyarı düşer) | **evet** |
| `CSP_MODE` | **tanımlamayın** (report-only). `enforce` yalnızca F7'de, sahibinin kararıyla | hayır |
| `NEXT_PUBLIC_LINKEDIN_URL`, `NEXT_PUBLIC_INSTAGRAM_URL`, `NEXT_PUBLIC_WHATSAPP_URL` | yalnızca gerçek adresler varsa; yoksa footer'da bağlantı çıkmaz | hayır |

`NEXT_PUBLIC_*` değerleri **derleme anında** içeri gömülür: değiştirince yeni bir push (ya da panelden Redeploy) gerekir. Gizli değerleri sohbete ya da depoya yazmayın. Cloudflare'in her zaman geçen **test** anahtarları `.env.example`'da yazılı; yalnızca hazırlık için kullanın.

## 5. Ortam değişkeni olmadan ne olur
Temiz kopyada, hiçbir ortam değişkeni olmadan üretim sunucusu başlatılıp duman testi koşturuldu (`TURNSTILE_MODE=unset`): başlıklar, CSP (report-only + nonce), iki dil, `security.txt` ve briefing girdi savunması geçer; **Turnstile gizli anahtarı yokken briefing formu 503 verir** ve ziyaretçiye hazır e-posta taslağı (`mailto:`) çıkar, yanıtlar kaybolmaz. n8n akışı yoksa `CONTACT_WEBHOOK_*` boş kalır, aynı sonuç ([docs/n8n-briefing.md](n8n-briefing.md)). **Yani yayın günü form çalışmaz, e-posta bağlantısı çalışır.**

## 6. Yayından sonra kontroller (adres: `https://syncflow.agency`)

İlk yayında (08.10 23:51Z = 09.10 02:51 yerel) bu liste canlıda koşuldu; sonuçlar ve bulunan hata [ADR 0013](adr/0013-app-moved-into-syncflow-web.md)'te. **Bir sonraki dağıtımdan sonra `/api/briefing` mutlaka denensin:** derlemenin başarılı olması, route'un çalıştığını göstermez (jsdom/`ERR_REQUIRE_ESM` hatası derlemede değil, çalışma zamanında çıktı).

- [ ] Vercel/GitHub'da `main` için derleme **Ready**. (Panele girilemiyorsa: GitHub'daki commit durumu ya da aşağıdaki canlı ölçümler.)
- [ ] `/` ve `/tr` **200**, başlık yeni sitenin başlığı (eski site değil); `/de`, `/fr`, `/ar` **404**.
- [ ] `/.well-known/security.txt` 200; `/sitemap.xml` yalnızca `en` ve `tr` ve `syncflow.agency`; `/robots.txt` 200.
- [ ] Yanıt başlıklarında `Content-Security-Policy-Report-Only` (nonce'lu) ve `Strict-Transport-Security` var, `Content-Security-Policy` (enforce) **yok**.
- [ ] **`/og?locale=en` bir PNG (1200×630) döndürüyor.** Bu rota yazı tipini `assets/og-instrument-sans-600.ttf` dosyasından okur ve Vercel'e dosya izleme (`outputFileTracingIncludes`) ile taşınır; yerelde doğrulandı, Vercel'de ilk yayında ölçülür.
- [ ] `GET /api/briefing` 405.
- [ ] Gizli anahtarlar girildiyse: bir deneme briefing'i gönderin, `contact@syncflow.agency` kutusuna düştü, konu `[Briefing][...]`. Aynı `id` ile iki kez gelen istek tek e-posta üretiyor (n8n'de "Remove Duplicates").
- [ ] Function Logs'ta (Upstash yoksa) tek bir `[rate-limit] ... not set` uyarısı, başka hata yok.
- [ ] Eski sitenin `/kvkk/`, `/demo/*` adresleri artık **404** (yeni sitede karşılığı `/tr/privacy`; yönlendirme eklenmedi, ADR 0013).

## 7. Doğrulanamayanlar (Vercel'e çıkmadan bilinemez)
- `vercel.json` geçersiz kılmasının kayıtlı proje ayarlarını gerçekten aştığı; Vercel'in derlemesi (Node sürümü, bellek, süre) ve `/og` yazı tipi izlemesi.
- Gerçek HTTP/2 + Brotli altında performans; **mobil Lighthouse hâlâ ölçülmedi** (`npm run perf`, sessiz makinede, yayın adresine karşı).
- CSP'nin canlıda `challenges.cloudflare.com` ile davranışı (yerelde enforce altında denendi; canlıda ilk günlerin rapor izlemesi gerekir).
- Hobby plan yalnızca ticari olmayan kullanıma açıktır; ticari site için **Pro** gerekir (README).

## 8. Yayından sonra kapanması gerekenler (site artık herkese açık)
(1) n8n teslimi gerçek kutuda denensin ve §4'teki Turnstile/webhook/Upstash değişkenleri panelden girilsin, (2) hukuki sayfaların yer tutucuları gerçek bilgilerle dolsun ve avukat onaylasın, "Taslak" uyarısı kalksın ([ADR 0011](adr/0011-legal-pages-structure.md)), (3) mobil Lighthouse ölçülsün ve `lib/metrics.ts` güncellensin, (4) 24 saatlik kişisel dönüş sözü gerçek olsun.

## 9. Artık gereksiz olanlar
- **`syncflow-next` projesi** (panelde ayrı oluşturulmuş): hiçbir push'a tepki vermedi ve artık gerekmiyor; sahibi isterse siler. Silmek yayını etkilemez.
- **Eski `Ignored Build Step` önerisi:** gerekmez; yalnızca `main` yayın dalıdır, diğer dallara push edilmez (§ başı).
- **Alan adı taşıma ("geçiş günü") adımları:** kalktı; alan adı hiç taşınmadı, aynı proje yeni uygulamayı derliyor.
- Panel/CLI sorunu (bu makinede): CLI, ağdaki TLS araya girmesi yüzünden çöktü (Sentry adresi için `*.btk.gov.tr` sertifikası, `self-signed certificate`). Panel/CLI gerekirse **farklı bir ağdan** (telefon paylaşımı, VPN) deneyin; TLS doğrulamasını kapatmayın.
