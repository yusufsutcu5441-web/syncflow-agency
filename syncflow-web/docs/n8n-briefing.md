# Strategic Briefing → n8n → Gmail → contact@syncflow.agency

Site tarafı hazırdır: form, Turnstile doğrulaması, imzalı webhook (`lib/server/deliver.ts`). Bu belge **n8n tarafında** yapılacakları anlatır. n8n bu depoda değildir ve **bu makinede doğrulanmadı**: sahte alıcıyla (`npm run dev:inbox`, `scripts/smoke.mjs`) yük, imza ve sınıf doğrulandı; gerçek Gmail teslimi sizin ilk deneme gönderiminizle teyit edilir (aşağıdaki kontrol listesi).

Gmail kimlik bilgisi Next uygulamasında hiçbir yerde tutulmaz (CLAUDE.md "Güvenlik"): site yalnızca imzalı bir HTTPS isteği atar, e-postayı n8n'deki Gmail düğümü gönderir.

## 1. Site tarafındaki ortam değişkenleri

| Değişken | Açıklama |
|---|---|
| `CONTACT_WEBHOOK_URL` | n8n Webhook düğümünün **Production URL**'si (https). |
| `CONTACT_WEBHOOK_SECRET` | n8n ile paylaşılan rastgele uzun bir dize (örn. `openssl rand -hex 32`). İmza için. |
| `TURNSTILE_SECRET_KEY` ve `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile widget anahtarları. |

`.env.example` hepsini açıklar. Webhook ayarlı değilse üretimde form `503` verir ve ziyaretçiye hazır bir e-posta taslağı (`mailto:contact@syncflow.agency`) sunar, yanıtlar kaybolmaz.

## 2. İstek

`POST` `application/json`, başlıklar `x-syncflow-signature: sha256=<hex>` (gövdenin HMAC-SHA256'sı, anahtar `CONTACT_WEBHOOK_SECRET`) ve `idempotency-key: <id>` (gövdedeki `id` ile aynı). Gövde:

```json
{
  "type": "syncflow.briefing",
  "id": "3f0c6c1e-0a5b-4d3e-9b53-2d1e8e5f7a10",
  "receivedAt": "2026-10-08T12:00:00.000Z",
  "subject": "[Briefing][high] Acme Holding, Jane Doe",
  "projectType": "showcase | platform | law | unsure",
  "budget": "b5 | b10 | b20 | talk",
  "timeline": "w4 | w6 | w10 | flex",
  "role": "decider | team | exploring",
  "tier": "high | medium | low",
  "name": "Jane Doe",
  "company": "Acme Holding, Chief Marketing Officer",
  "email": "jane@acme.com",
  "message": "",
  "locale": "en"
}
```

**Teslim `id`'si ve yeniden deneme.** `id` her başvuru için rastgele bir UUID v4'tür. Site isteği **en çok iki kez** dener, toplam süre 9,5 sn'nin altında kalır: ilk deneme 5 sn, 0,4 sn bekleme, ikinci deneme en çok 4 sn. Yalnızca zaman aşımı, bağlantı hatası ve `5xx`, `408`, `429` yanıtında tekrar denenir; `4xx` (alıcı isteği reddetti) kesindir, tekrarlanmaz. **İki deneme de aynı `id`'yi taşır**, çünkü ilk deneme n8n'e ulaşıp yalnızca yanıt gecikmiş olabilir: alıcı çift e-postayı bu `id` ile ayıklamalıdır (aşağıda "Çift kayıt"). İki deneme de başarısızsa form `502` alır ve ziyaretçiye hazır e-posta taslağını önerir.

Anlamlar: `budget` `b5` = $5k–$10k (taban altı), `b10` = $10k–$20k, `b20` = $20k+, `talk` = önce konuşalım. `tier` sunucuda hesaplanır (`lib/briefing.ts`): `b20` ve karar veren/karar ekibi = `high`; `b5` = `low`; kalanı `medium`. Alanlar düz metindir (işaretleme reddedilir, görünmez karakterler atılır); yine de bir HTML şablonunda kullanılacaksa kaçışlanmalıdır.

## 3. n8n akışı

1. **Webhook** düğümü: HTTP Method `POST`, Path `syncflow-briefing`, Authentication `None` (imzayı kendimiz doğruluyoruz), Response `Immediately` (ya da akış sonunda), **Options → Raw Body: açık** (imza ham gövdeyle doğrulanır).
2. **Code** düğümü ("İmzayı doğrula", *Run once for all items*):

```js
const crypto = require('crypto'); // kendi sunucunuzda: NODE_FUNCTION_ALLOW_BUILTIN=crypto
const secret = $env.SYNCFLOW_WEBHOOK_SECRET; // n8n ortamında tanımlayın (site ile aynı değer)
const raw = await this.helpers.getBinaryDataBuffer(0, 'data'); // Raw Body açıkken ham gövde
const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');
const received = String($input.first().json.headers['x-syncflow-signature'] ?? '');
const a = Buffer.from(expected);
const b = Buffer.from(received);
if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
  throw new Error('invalid signature'); // akış durur, Gmail'e hiçbir şey gitmez
}
return [{ json: JSON.parse(raw.toString('utf8')) }];
```

   (`crypto` kullanılamıyorsa: **Crypto** düğümü, Action `Hmac`, Type `SHA256`, Encoding `hex`, değer olarak `{{ JSON.stringify($json.body) }}`; sitenin gövdesi kompakt `JSON.stringify` çıktısı olduğundan gidiş-dönüş aynı metni verir.)
3. **Gmail** düğümü (Send): To `contact@syncflow.agency`, Subject `{{ $json.subject }}`, Email Type `Text`, Message:

```
Sınıf: {{ $json.tier }}
Proje: {{ $json.projectType }}
Yatırım: {{ $json.budget }}
Zamanlama: {{ $json.timeline }}
Rol: {{ $json.role }}

Ad Soyad: {{ $json.name }}
Şirket ve unvan: {{ $json.company }}
E-posta: {{ $json.email }}
Dil: {{ $json.locale }}

Proje: {{ $json.message }}
```

   Gönderen hesap, n8n'deki Gmail OAuth bağlantısıdır; kimlik bilgisi n8n'de kalır. `Reply-To` için "Options → Reply To" alanına `{{ $json.email }}` verilirse "Yanıtla" doğrudan adayı seçer.
4. (İsteğe bağlı, **varsayılan kapalı önerilir**) ikinci Gmail düğümü ile adaya otomatik onay. Dikkat: formu başkasının adresiyle doldurup ona e-posta yağdırmak mümkündür; Turnstile ve hız sınırı bunu zorlaştırır ama kaldırmaz.
5. **Respond to Webhook** (Webhook "When Last Node Finishes" ise): `200`. Site yalnızca 2xx'i başarı sayar. **Yanıtı hızlı verin** (Webhook'ta `Immediately` önerilir): ilk deneme 5 sn içinde dönmezse site bir kez daha dener ve e-posta çift gidebilir.

### Çift kayıt (aynı `id`)

Gmail düğümünden **önce**, imza doğrulamasından sonra, `{{ $json.id }}` değerine göre tekrarı ayıklayın: **Remove Duplicates** düğümü ("Remove Items Processed in Previous Executions", değer `{{ $json.id }}`). Menü adları n8n sürümüne göre değişebilir ve bu **bu makinede doğrulanmadı**; amaç aynı `id`'yi ikinci kez gören akışın e-postayı göndermeden durmasıdır. Aynı `id` ile iki kez gelen istek tek e-posta üretmelidir (aşağıdaki kontrol listesi).

## 4. Deneme

Yerelde alıcı olmadan: `npm run dev:inbox` (4011) ve ayrı bir terminalde `CONTACT_WEBHOOK_URL=http://127.0.0.1:4011/lead CONTACT_WEBHOOK_SECRET=test npm run dev`; briefing'i doldurunca yük ve imza durumu terminalde yazılır.

n8n'e doğrudan (PowerShell, sırrı kendi değerinizle değiştirin):

```powershell
$secret = 'SİTEYLE-AYNI-SIR'
$body = '{"type":"syncflow.briefing","id":"00000000-0000-4000-8000-000000000001","subject":"[Briefing][high] Test, Test","tier":"high","name":"Test","company":"Test","email":"test@example.com","message":"","locale":"en"}'
$hmac = [System.Security.Cryptography.HMACSHA256]::new([Text.Encoding]::UTF8.GetBytes($secret))
$sig = 'sha256=' + (($hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($body)) | ForEach-Object { $_.ToString('x2') }) -join '')
Invoke-RestMethod -Uri 'https://N8N-ADRESİNİZ/webhook/syncflow-briefing' -Method Post -ContentType 'application/json' -Headers @{ 'x-syncflow-signature' = $sig; 'idempotency-key' = '00000000-0000-4000-8000-000000000001' } -Body $body
```

## 5. İlk gerçek deneme kontrol listesi

- [ ] n8n akışı **Active** (Production URL çalışır; Test URL değil).
- [ ] Site ortamında `CONTACT_WEBHOOK_URL`, `CONTACT_WEBHOOK_SECRET`, `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` tanımlı; sunucu yeniden başlatıldı (`NEXT_PUBLIC_*` için yeniden derleme).
- [ ] Sitedeki briefing'i uçtan uca doldurun: başarı ekranı geldi, `contact@syncflow.agency` kutusuna e-posta düştü, konu `[Briefing][...]` ile başlıyor.
- [ ] **Aynı `id` ile iki kez gönderilen istek tek e-posta üretiyor** (PowerShell örneğini iki kez çalıştırın, ikinci seferde yeni `id` vermeyin): kutuya yalnızca bir e-posta düşmeli.
- [ ] Yanlış imzalı istek reddediliyor (PowerShell örneğinde sırrı bozarak deneyin): kutuya hiçbir şey düşmemeli.
- [ ] Spam klasörünü ve Gmail'in "gönderilenler"ini kontrol edin; SPF/DKIM için Google Workspace alan adı doğrulaması.
- [ ] Gizlilik metnindeki `[TESLİM HİZMETİ]`, `[AKTARIM GÜVENCELERİ]` ve `[SAKLAMA SÜRESİ]` alanları gerçek bilgilerle dolduruldu; avukat onayı.
