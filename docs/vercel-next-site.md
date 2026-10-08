# Yeni siteyi ayrı bir Vercel projesi olarak yayınlama (`next-site` dalı)

- **Durum:** 08.10.2026. Bu kılavuzdaki Vercel adımlarını **panelde sahibi yapar**: kod tarafında Vercel hesabına, CLI'a ya da projeye erişim yoktur. Kod tarafında doğrulananlar §1'de, doğrulanamayanlar §7'de.
- **Neden ayrı proje:** mevcut Vercel projesi `syncflow-web` eski statik siteyi (`syncflow.agency`) sunuyor, Root Directory'si `syncflow-web`. Aynı projede Root Directory'yi değiştirmek canlı siteyi kırar (08.10'da yaşandı, [ADR 0012](adr/0012-vercel-deployment.md)). Yeni Next.js uygulaması kendi projesinde, kendi `*.vercel.app` adresinde denenir; **`syncflow.agency` geçiş gününe kadar eski projede kalır.**
- **Dallar (08.10.2026 22:45Z'den beri):** `main` artık **hem eski siteyi (`syncflow-web/`) hem yeni Next.js uygulamasını (kökte)** içerir: ilgisiz geçmişler birleştirildi (`777a9f8`), yerel ve uzak `main` eşit, `git push` normal bir ileri sarmadır. `next-site` yeni sitenin saf geçmişi (eski site klasörü olmadan), `legacy-site` eski sitenin yedeği. **Eski proje (`syncflow-web`, Root Directory `syncflow-web`) `main`'i derlemeye devam eder ve eski siteyi sunar; `main`'de `syncflow-web/` klasörünü silmeyin ya da taşımayın, aksi hâlde 08.10 kesintisi tekrarlanır.** Yeni Next.js uygulaması yalnızca Root Directory'si `./` olan bir projede derlenir.

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

5. **Eski projede (`syncflow-web`) `next-site` derlemesini kapatın.** 08.10 21:43Z'de `next-site`'e yapılan bir push, eski projede bir **Preview** derlemesi tetikledi ve **başarısız** oldu (o projenin Root Directory'si `syncflow-web`, `next-site`'te öyle bir klasör yok). Canlı site etkilenmedi, ama GitHub'da `next-site` ucu kırmızı görünür ve her push bir başarısız derleme daha üretir. Eski projede **Settings → Git → Ignored Build Step → Custom** alanına şunu girin: `[ "$VERCEL_GIT_COMMIT_REF" != "main" ]` (dal `main` değilse çıkış 0 = derlemeyi atla; `main`'de çıkış 1 = derle). Bu komutun etkisi **panelde doğrulanmadı**; deneyip eski sitenin `main` push'unda hâlâ derlendiğini ve `next-site` push'unda atlandığını kontrol edin.

## 3. Production Branch (`main` ya da `next-site`)
`main` (varsayılan, ayar gerekmez; artık Next.js uygulamasını da içeriyor) **ya da** `next-site` olabilir. Hangisini seçerseniz seçin **Root Directory `./`** olmalı. Eski projenin Root Directory'si (`syncflow-web`) ve dalı değişmez.

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

- [ ] Deployments sekmesinde **Production** deployment `main` (ya da seçtiğiniz dal) dalından, durum **Ready**; Build Logs'ta `next build` bitti.
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

## 9. Durum notu (08.10.2026 22:55Z): yeni proje push'lara tepki vermedi
`syncflow-next` projesi var ve bu depoya bağlı görünüyor (22:02 ve 22:24Z'de `44bbf02` için yapı denemeleri kayıtlı; ikincisi, o commit eski site olduğu için **başarısız**). Ama `main` push'u (`777a9f8`, 22:45Z) ve `next-site` push'u (`84da115`, 22:53Z) için `Vercel – syncflow-next` durumu **hiç oluşmadı** (7 ve 2 dakika izlendi); yalnızca eski proje deploy etti. Nedeni dışarıdan görülemiyor; olası olanlar (tahmin):

- [ ] `syncflow-next` → **Settings → Git:** depo bağlı mı, **Production Branch** ne, otomatik deploy açık mı?
- [ ] **Settings → Git → Ignored Build Step** boş olmalı (eski projeye önerilen komut yanlışlıkla bu projeye girilmiş olabilir).
- [ ] GitHub → **Settings → Applications → Vercel → Configure:** bu depoya erişim var mı?
- [ ] **Deployments → Create Deployment** (varsa) ile `main` dalı (`777a9f8`) elle derlenebilir. **Redeploy işe yaramaz:** eski deployment'ın kaynağını (`44bbf02`) yeniden derler.
- Panele ya da CLI'a bağlanamıyorsanız: bu ortamda CLI, ağınızdaki TLS araya girmesi yüzünden çöktü (Sentry adresi için `*.btk.gov.tr` sertifikası, ayrıca `self-signed certificate`). Panel/CLI'ı **farklı bir ağdan** (telefon paylaşımı, VPN) deneyin; TLS doğrulamasını kapatmayın.
