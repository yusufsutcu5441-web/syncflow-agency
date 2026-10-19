# Canlıya alma kontrol listesi: form, alan adı, doğrulama

Kodda yapılacak bir şey kalmadı; aşağıdakiler yalnızca **sizin hesaplarınızda** yapılabilir ve **isteğe bağlıdır**: sahibi bugünkü yer tutucu mantığıyla (form e-posta taslağı modunda, hukuki sayfalar yer tutuculu) yayında kalmayı kabul etti. Kilitli sürüm, dağıtım yapılandırması ve geri alma: [docs/deployment.md](deployment.md). Sırayla ilerleyin, her adımın sonunda doğrulama komutu var. Ayrıntılı kaynaklar: [docs/n8n-briefing.md](n8n-briefing.md) ("Hızlı yol"), [docs/vercel-next-site.md](vercel-next-site.md) §4 ve §10.

> Şu an form **bağlı değil**: ziyaretçi dört adımı doldurur, son düğme "E-posta taslağını aç" olur ve yanıtlar `contact@syncflow.agency` adresine bir e-posta taslağı olarak açılır (hiçbir şey "alındı" diye gösterilmez). Turnstile'ın iki anahtarı ve bir teslim yolu (A: imzalı webhook → n8n → Gmail, B: doğrudan SMTP ya da C: Telegram) girilince site **kod değişmeden** normal teslim yoluna geçer.

## 1. Cloudflare Turnstile (bot denetimi; ücretsiz)

1. Cloudflare panel → **Turnstile** → *Add site*. Alan adı: `syncflow.agency`. Widget türü: *Managed*.
2. İki değer verir: **Site Key** (herkese açık) ve **Secret Key** (gizli).

## 2. Teslim yolu: **A** (n8n, tercih edilen), **B** (doğrudan SMTP) ya da **C** (Telegram, ücretsiz); birini seçin

**A. n8n akışı (Gmail'e teslim; Gmail parolası sitede tutulmaz)**

1. n8n → *Import from file* → `docs/n8n/syncflow-briefing.workflow.json`.
2. *Crypto* düğümüne paylaşılan sırrı yazın (`openssl rand -hex 32` ile üretin; aynı değeri adım 3'te Vercel'e gireceksiniz; sohbete ya da depoya yazmayın).
3. Gmail düğümünde kendi Gmail hesabınızı **yetkilendirin** (OAuth onayı yalnızca sizde).
4. Akışı **Active** yapın; Webhook düğümünün **Production URL**'sini kopyalayın (`https://...`).

**B. Doğrudan SMTP (n8n gerekmez; bir posta sırrı sitenin ortamında durur, [ADR 0027](adr/0027-optional-smtp-delivery.md))**

1. **Ayrılmış bir gönderici hesabı** açın (örn. `site@syncflow.agency`): başka posta taşımayan bir Google Workspace/Gmail kullanıcısı. Asıl gelen kutunuzun parolasını girmeyin: Gmail uygulama parolası gönderme yetkisiyle birlikte **hesabın tüm posta kutusunu da açar**.
2. O hesapta Google Hesabı → Güvenlik → **2 Adımlı Doğrulama**'yı açın, sonra *Uygulama parolaları*'ndan 16 harflik bir parola üretin (boşluklar önemsizdir, kod temizler).
3. Başvurunun düşeceği gerçek gelen kutusu `contact@syncflow.agency` ise ayrıca bir şey girmeyin; başka bir adres istiyorsanız `BRIEFING_INBOX` yazın.
4. Gönderici adresi bir Gmail hesabı değilse (Resend, Postmark gibi yalnızca gönderen bir sağlayıcı daha dar bir anahtar verir) `SMTP_HOST`, gerekirse `SMTP_PORT` ve `SMTP_FROM` da girin.
5. `CONTACT_WEBHOOK_URL` **tanımlı olmamalı**: tanımlıysa SMTP kullanılmaz.

**C. Telegram (n8n ve posta hesabı gerekmez; ücretsiz, yaklaşık 5 dakika, [ADR 0034](adr/0034-telegram-lead-alert.md))**

1. Telegram'da **@BotFather** → `/newbot` → bir ad ve `bot` ile biten bir kullanıcı adı verin. Size bir **jeton** (`123456789:AA…`) verir. Sohbete, depoya ya da bir ekran görüntüsüne yazmayın; sızarsa BotFather'da `/revoke`.
2. Yeni botunuzu açın, **Start**'a basın ve "hi" yazın (bir bot, kendisine hiç yazmamış bir sohbete mesaj atamaz).
3. Bu klasörde (`syncflow-web/`) jetonu yalnızca o komutun kabuğuna verin. PowerShell: `$env:TELEGRAM_BOT_TOKEN = '<jeton>'; npm run telegram:check -- --find-chat` → özel sohbetinizin sayısal kimliğini yazar. **Özel sohbet** kullanın: grup kimliği negatiftir ve gruptaki herkes her başvuruyu görür.
4. Aynı kabukta `$env:TELEGRAM_CHAT_ID = '<kimlik>'; npm run telegram:check -- --send` → telefonunuza ve masaüstü uygulamasına iki deneme mesajı düşmeli (biri uyarı, biri tam başvuru; "TEST" yazar). Düşmezse komut nedenini söyler (yanlış jeton, Start'a basılmamış, yanlış kimlik).
5. Webhook (A) ya da SMTP (B) de girdiyseniz Telegram yalnızca **uyarı** verir ve o yol başarısız olursa tüm başvuruyu üstlenir; hiçbiri yoksa tek yol Telegram'dır ve tüm başvuru oraya gider.
6. **Açmadan önce:** Telegram rıza satırında ve gizlilik metninde işleyici olarak adlandırılmıştır, ama aktarım dayanağı ve sohbetteki mesajların saklama/silme süresi sizin ve avukatınızın kararıdır ([legal-facts-intake.md](legal-facts-intake.md)).

## 3. Vercel ortam değişkenleri (Project → Settings → Environment Variables; Production ve Preview)

| Ad | Değer |
|---|---|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | adım 1, Site Key |
| `TURNSTILE_SECRET_KEY` | adım 1, Secret Key |
| `CONTACT_WEBHOOK_URL` | **A:** adım 2, Production URL |
| `CONTACT_WEBHOOK_SECRET` | **A:** adım 2, paylaşılan sır |
| `SMTP_USER` | **B:** gönderici hesabın adresi (örn. `site@syncflow.agency`) |
| `SMTP_PASSWORD` | **B:** uygulama parolası (ya da sağlayıcının anahtarı) |
| `BRIEFING_INBOX` | **B, isteğe bağlı:** başvurunun düşeceği adres (varsayılan `contact@syncflow.agency`) |
| `TELEGRAM_BOT_TOKEN` | **C:** adım 1, BotFather jetonu (**Sensitive**; yalnızca **Production**: Preview dağıtımları da gerçek mesaj atar) |
| `TELEGRAM_CHAT_ID` | **C:** adım 3, özel sohbetinizin sayısal kimliği (yalnızca Production) |

Kaydedin ve **yeniden dağıtın** (`NEXT_PUBLIC_*` derleme anında gömülür): Deployments → son dağıtım → Redeploy ya da boş bir commit push edin (`git commit --allow-empty -m "chore: redeploy"`).

## 4. `www` alan adı

1. Vercel → Project → Settings → **Domains** → Add `www.syncflow.agency` (düz alan adı; yönlendirme kodda hazır: `www` → `syncflow.agency`, 308).
2. Spaceship → alan adı → **DNS** → kayıt ekle: `CNAME`, host `www`, değer `cname.vercel-dns.com` (Vercel başka bir değer gösteriyorsa onu).

## 5. Doğrulama (bu klasörde, `syncflow-web/`)

```
node scripts/live-check.mjs https://syncflow.agency        # www satırı PASS; belge tek yükleyici ister; CSP enforce
node scripts/n8n-test.mjs <webhook-url> <paylaşılan-sır>   # yol A: imzalı test: kabul, çift gönderim tek e-posta, kötü imza reddi
npm run delivery:verify                                    # yol B ve C: SMTP konuşması ve Telegram Bot API isteği yerelde, sahte sunuculara karşı (Google'ın ya da Telegram'ın kabulünü değil, protokolü sınar)
npm run telegram:check -- --send                           # yol C: gerçek botunuzla; telefonunuza iki TEST mesajı düşmeli (jeton ve sohbet kimliği kabuğun ortamında)
npm run qa:csp -- https://syncflow.agency                  # Turnstile widget'ı ilk kez gerçek alan adında: 0 ihlal olmalı
npm run qa:browser -- https://syncflow.agency --only=briefing   # bağlıyken "doğrudan e-posta" kipi görünmez
```

Son adımda sayfada "E-posta taslağını aç" yerine "Briefing'i gönder" düğmesi görünmeli; gerçek bir test briefing'i gönderin ve e-postanın gelmesini bekleyin.

## 5b. Hukuki sayfaların gerçek bilgileri

`/privacy` ve `/imprint` sayfalarının 13 yer tutucusu yalnızca sizin bildiğiniz olgulardır (unvan, adres, sicil, vergi no, sorumlu kişi, saklama süresi...). Liste, nerede göründükleri ve neyin avukat kararı olduğu: [docs/legal-facts-intake.md](legal-facts-intake.md). Doldurulana kadar iki sayfa `noindex` kalır (bilinçli).

> `node scripts/live-check.mjs` sitenin hız sınırına (10 dakikada 5 briefing POST'u, dakikada 30 API isteği) çarparsa 429'u bekler ya da **uyarı** olarak gösterir; arka arkaya sık koşmak hata üretmez ([ADR 0029](adr/0029-share-preview-live-check-429-and-declines.md)).

## 6. Bir şey ters giderse (geri alma anahtarları)

| Sorun | Anahtar |
|---|---|
| Çerçeve ertelemesi (sayfa etkileşimsiz kalırsa) | Vercel'de `DEFER_FRAMEWORK=off` + yeniden dağıtım ([ADR 0023](adr/0023-framework-after-first-paint.md)) |
| CSP bir kaynağı engelliyorsa | `CSP_MODE=report-only` + yeniden dağıtım ([ADR 0024](adr/0024-csp-enforced.md)); sonra `npm run qa:csp` ile hangi kaynak olduğuna bakılır |
| Her şey | `git revert <commit>` + `git push origin main` (Vercel 25 saniyede yayınlar) |
