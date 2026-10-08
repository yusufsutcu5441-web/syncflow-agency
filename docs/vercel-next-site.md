# Yeni siteyi ayrı bir Vercel projesi olarak yayınlama (`next-site` dalı)

- **Durum:** 08.10.2026. Bu kılavuzdaki Vercel adımlarını **panelde sahibi yapar**: kod tarafında Vercel hesabına, CLI'a ya da projeye erişim yoktur. Kod tarafında doğrulananlar §1'de, doğrulanamayanlar §7'de.
- **Neden ayrı proje:** mevcut Vercel projesi `syncflow-web` eski statik siteyi (`syncflow.agency`) sunuyor, Root Directory'si `syncflow-web`. Aynı projede Root Directory'yi değiştirmek canlı siteyi kırar (08.10'da yaşandı, [ADR 0012](adr/0012-vercel-deployment.md)). Yeni Next.js uygulaması kendi projesinde, kendi `*.vercel.app` adresinde denenir; **`syncflow.agency` geçiş gününe kadar eski projede kalır.**
- **Dallar:** yeni site `next-site` dalındadır (uzakta `4da47fe` ve üstü). **Yerel `main`'i uzak `main`'e itmeyin:** uzak `main` eski sitenin geçmişidir (ilgisiz geçmiş), reddedilir; zorlarsanız canlı siteyi yeniden bozarsınız. Eski sitenin yedeği `legacy-site` dalında.

## 1. Kod tarafında doğrulananlar (08.10.2026)

GitHub'dan `next-site` dalının temiz bir kopyası (Vercel'in göreceği gibi: `.env` yok, `node_modules` yok) alınıp denendi:

| Kontrol | Sonuç |
|---|---|
| `npm ci` (kilit dosyasından) | geçti, 439 paket, 52 sn |
| `npm run build` | geçti (çıkış 0) |
| `node faz2-denetim.mjs --root .` (derlemesiz) | 0 hata, 108 geçti, 1 bilinçli uyarı |
| `npm run brand:check` (CRLF'li Windows kopyası) | geçti |
| Duman testi, **hiçbir ortam değişkeni olmadan** başlatılmış üretim sunucusu (`TURNSTILE_MODE=unset`) | **95/95**: başlıklar, CSP (report-only + nonce), iki dil, `security.txt`, briefing girdi savunması, ve Turnstile gizli anahtarı yokken form **503** veriyor |

Yani ortam değişkenleri girilmeden ilk deployment çalışır; yalnızca briefing formu 503 verir ve ziyaretçiye hazır e-posta taslağı (`mailto:`) çıkar, yanıtlar kaybolmaz.

## 2. Vercel'de projeyi oluşturma

1. **Add New → Project →** `yusufsutcu5441-web/syncflow-agency` deposunu içe aktarın (mevcut `syncflow-web` projesine **dokunmayın**; bu ikinci bir proje).
2. **Project Name:** `syncflow-next` (adres `https://syncflow-next.vercel.app` olur; alınmışsa Vercel bir ek getirir, o adresi §4'te `NEXT_PUBLIC_SITE_URL` yapın).
3. **Framework Preset:** Next.js (otomatik). **Root Directory:** `./` (boş). Build ve Install komutları varsayılan (`next build`, `npm install`). **Çıktı klasörünü değiştirmeyin.**
4. **Henüz Deploy'a basmayın:** önce §3 ve §4'ü yapın. (İçe aktarırken Vercel, deponun varsayılan dalından, yani eski siteden, bir derleme başlatabilir. Bu derleme başarısız olur ya da boş çıkar, **normaldir ve zararsızdır**: alan adı bağlı değil. Başlarsa §3'ten sonra Redeploy edin.)

## 3. Production Branch'i `next-site` yapın
**Settings → Git → Production Branch → `next-site`**. `main` olarak kalırsa proje eski siteyi derlemeye çalışır. Bu ayarı yapmadan §6'daki adres kontrolleri anlamsız olur.

**Settings → General → Node.js Version:** 22.x ya da 24.x (`package.json` `engines`: `>=20.19.0`).

## 4. Ortam değişkenleri (Settings → Environment Variables; Production ve Preview)

| Değişken | Değer / kaynak | Gizli mi |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | **hazırlık aşamasında** `https://syncflow-next.vercel.app` (§2'deki adres). Geçiş gününde `https://syncflow.agency` yapılıp **yeniden derlenir** | hayır |
| `NEXT_PUBLIC_LAUNCHED_LOCALES` | `en,tr` | hayır |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile widget site anahtarı (izinli alan adlarına hem `syncflow-next.vercel.app` hem `syncflow.agency` ekleyin) | hayır |
| `TURNSTILE_SECRET_KEY` | aynı widget'ın gizli anahtarı | **evet** |
| `CONTACT_WEBHOOK_URL` | n8n Webhook düğümünün Production URL'si (https) | **evet** |
| `CONTACT_WEBHOOK_SECRET` | n8n ile paylaşılan HMAC sırrı (`openssl rand -hex 32`) | **evet** |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST (önerilir; yoksa hız sınırı örnek başına sayılır ve ilk istekte günlüğe uyarı düşer) | **evet** |
| `CSP_MODE` | **tanımlamayın** (report-only). `enforce` yalnızca F7'de, sahibinin kararıyla | hayır |
| `NEXT_PUBLIC_LINKEDIN_URL`, `NEXT_PUBLIC_INSTAGRAM_URL`, `NEXT_PUBLIC_WHATSAPP_URL` | yalnızca gerçek adresler varsa; yoksa footer'da bağlantı çıkmaz | hayır |

`NEXT_PUBLIC_*` değerleri **derleme anında** içeri gömülür: değiştirince Redeploy gerekir. Gizli değerleri sohbete ya da depoya yazmayın. Cloudflare'in her zaman geçen **test** anahtarları `.env.example`'da yazılı; yalnızca hazırlık için kullanın, gerçek anahtarla değiştirin.

n8n akışı henüz yoksa `CONTACT_WEBHOOK_*` boş bırakılır: site çalışır, form 503 + e-posta taslağı verir ([docs/n8n-briefing.md](n8n-briefing.md)).

## 5. Erişim koruması
**Settings → Deployment Protection:** hazırlık adresini **korumalı** tutun (Vercel Authentication). Sayfalarda henüz yer tutuculu hukuki metinler ([ADR 0011](adr/0011-legal-pages-structure.md)) ve ölçülmemiş mobil performans var; herkese açık yayında olmamalı. Doğrulamayı sizin tarayıcınızda (Vercel'e giriş yapmışken) yaparsınız; otomatik betikle doğrulamamı isterseniz korumayı **kısa süreliğine** kapatın ya da bana "Protection Bypass for Automation" ile çalışacak şekilde betiği genişletmemi söyleyin.

## 6. İlk deployment sonrası kontroller (adres: `https://syncflow-next.vercel.app`)

- [ ] Deployments sekmesinde **Production** deployment `next-site` dalından, durum **Ready**; Build Logs'ta `next build` bitti.
- [ ] `/` ve `/tr` **200**; `/de`, `/fr`, `/ar` **404**; `/.well-known/security.txt` 200; `/sitemap.xml` yalnızca iki dil ve **hazırlık adresini** gösteriyor.
- [ ] Yanıt başlıklarında `Content-Security-Policy-Report-Only` (nonce'lu) ve `Strict-Transport-Security` var, `Content-Security-Policy` (enforce) **yok**.
- [ ] **`/og?locale=en` bir PNG (1200×630) döndürüyor.** Bu rota yazı tipini `assets/og-instrument-sans-600.ttf` dosyasından okur ve Vercel'e dosya izleme (`outputFileTracingIncludes`) ile taşınır; **yerelde doğrulandı, Vercel'de henüz doğrulanmadı.**
- [ ] `GET /api/briefing` 405. Gizli anahtarlar girilmişse: bir deneme briefing'i gönderin, `contact@syncflow.agency` kutusuna düştü, konu `[Briefing][...]`. Aynı `id` ile iki kez gelen istek tek e-posta üretiyor (n8n'de "Remove Duplicates", [n8n kılavuzu](n8n-briefing.md)).
- [ ] Vercel *Preview* adreslerinde Vercel'in araç çubuğu betiği CSP'ye takılır (konsolda hata); üretimi etkilemez (README).
- [ ] Function Logs'ta (Upstash yoksa) tek bir `[rate-limit] ... not set` uyarısı, başka hata yok.

Bunları bana adresle birlikte bildirirseniz salt okunur isteklerle (koruma kapalıysa) doğrularım.

## 7. Doğrulanamayanlar (Vercel'e çıkmadan bilinemez)
- Vercel'in derlemesi (Node sürümü, bellek, süre) ve `/og` yazı tipi izlemesi.
- Gerçek HTTP/2 + Brotli altında performans; **mobil Lighthouse hâlâ ölçülmedi** (`npm run perf` yeni adrese karşı çalıştırılmalı).
- CSP'nin canlıda `challenges.cloudflare.com` ile davranışı (yerelde enforce altında denendi, canlıda ilk günlerin rapor izlemesi gerekir).
- Hobby plan yalnızca ticari olmayan kullanıma açıktır; ticari site için **Pro** gerekir (README).

## 8. Geçiş günü (`syncflow.agency` yeni projeye)
**Aşağıdakiler bitmeden yapmayın:** (1) n8n teslimi gerçek kutuda denendi, (2) Turnstile ve Upstash gerçek anahtarlarla bağlı, (3) hukuki sayfaların yer tutucuları gerçek bilgilerle dolu ve avukat onaylı, "Taslak" uyarısı kalktı ([ADR 0011](adr/0011-legal-pages-structure.md)), (4) mobil Lighthouse ölçüldü ve `lib/metrics.ts` güncellendi, (5) 24 saatlik kişisel dönüş sözü gerçek.

Sonra: eski projede **Settings → Domains → `syncflow.agency` → Remove**, yeni projede **Add** (aynı takımda alan adı taşımak anlıktır; DNS değişmez), `NEXT_PUBLIC_SITE_URL=https://syncflow.agency` ve **Redeploy**, ardından §6 kontrolleri bu adreste. **Geri dönüş:** alan adını eski projeye geri ekleyin (eski deployment'lar durur). Search Console'a `sitemap.xml`. İki dalı birleştirme/yeniden adlandırma (`main` ⇄ `next-site`) ayrı, bilinçli bir adımdır, bu kılavuzun kapsamı dışında.
