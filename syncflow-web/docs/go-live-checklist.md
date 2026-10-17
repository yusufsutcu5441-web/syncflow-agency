# Canlıya alma kontrol listesi: form, alan adı, doğrulama

Kodda yapılacak bir şey kalmadı; aşağıdakiler yalnızca **sizin hesaplarınızda** yapılabilir. Sırayla ilerleyin, her adımın sonunda doğrulama komutu var. Ayrıntılı kaynaklar: [docs/n8n-briefing.md](n8n-briefing.md) ("Hızlı yol"), [docs/vercel-next-site.md](vercel-next-site.md) §4 ve §10.

> Şu an form **bağlı değil**: ziyaretçi dört adımı doldurur, son düğme "E-posta taslağını aç" olur ve yanıtlar `contact@syncflow.agency` adresine bir e-posta taslağı olarak açılır (hiçbir şey "alındı" diye gösterilmez). Aşağıdaki dört değer girilince site **kod değişmeden** normal teslim yoluna (Turnstile + imzalı webhook → n8n → Gmail) geçer.

## 1. Cloudflare Turnstile (bot denetimi; ücretsiz)

1. Cloudflare panel → **Turnstile** → *Add site*. Alan adı: `syncflow.agency`. Widget türü: *Managed*.
2. İki değer verir: **Site Key** (herkese açık) ve **Secret Key** (gizli).

## 2. n8n akışı (Gmail'e teslim)

1. n8n → *Import from file* → `docs/n8n/syncflow-briefing.workflow.json`.
2. *Crypto* düğümüne paylaşılan sırrı yazın (`openssl rand -hex 32` ile üretin; aynı değeri adım 3'te Vercel'e gireceksiniz; sohbete ya da depoya yazmayın).
3. Gmail düğümünde kendi Gmail hesabınızı **yetkilendirin** (OAuth onayı yalnızca sizde).
4. Akışı **Active** yapın; Webhook düğümünün **Production URL**'sini kopyalayın (`https://...`).

## 3. Vercel ortam değişkenleri (Project → Settings → Environment Variables; Production ve Preview)

| Ad | Değer |
|---|---|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | adım 1, Site Key |
| `TURNSTILE_SECRET_KEY` | adım 1, Secret Key |
| `CONTACT_WEBHOOK_URL` | adım 2, Production URL |
| `CONTACT_WEBHOOK_SECRET` | adım 2, paylaşılan sır |

Kaydedin ve **yeniden dağıtın** (`NEXT_PUBLIC_*` derleme anında gömülür): Deployments → son dağıtım → Redeploy ya da boş bir commit push edin (`git commit --allow-empty -m "chore: redeploy"`).

## 4. `www` alan adı

1. Vercel → Project → Settings → **Domains** → Add `www.syncflow.agency` (düz alan adı; yönlendirme kodda hazır: `www` → `syncflow.agency`, 308).
2. Spaceship → alan adı → **DNS** → kayıt ekle: `CNAME`, host `www`, değer `cname.vercel-dns.com` (Vercel başka bir değer gösteriyorsa onu).

## 5. Doğrulama (bu klasörde, `syncflow-web/`)

```
node scripts/live-check.mjs https://syncflow.agency        # www satırı PASS; belge tek yükleyici ister; CSP enforce
node scripts/n8n-test.mjs <webhook-url> <paylaşılan-sır>   # imzalı test: kabul, çift gönderim tek e-posta, kötü imza reddi
npm run qa:csp -- https://syncflow.agency                  # Turnstile widget'ı ilk kez gerçek alan adında: 0 ihlal olmalı
npm run qa:browser -- https://syncflow.agency --only=briefing   # bağlıyken "doğrudan e-posta" kipi görünmez
```

Son adımda sayfada "E-posta taslağını aç" yerine "Briefing'i gönder" düğmesi görünmeli; gerçek bir test briefing'i gönderin ve e-postanın gelmesini bekleyin.

## 6. Bir şey ters giderse (geri alma anahtarları)

| Sorun | Anahtar |
|---|---|
| Çerçeve ertelemesi (sayfa etkileşimsiz kalırsa) | Vercel'de `DEFER_FRAMEWORK=off` + yeniden dağıtım ([ADR 0023](adr/0023-framework-after-first-paint.md)) |
| CSP bir kaynağı engelliyorsa | `CSP_MODE=report-only` + yeniden dağıtım ([ADR 0024](adr/0024-csp-enforced.md)); sonra `npm run qa:csp` ile hangi kaynak olduğuna bakılır |
| Her şey | `git revert <commit>` + `git push origin main` (Vercel 25 saniyede yayınlar) |
