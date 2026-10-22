# Dağıtım yapılandırması ve sürüm kilidi

Bu belge, sitenin bugünkü **kilitli, üretime hazır** durumunu, onu nasıl yayınlayıp doğruladığınızı ve nasıl geri alacağınızı tek yerde toplar. Ayrıntılı kaynaklar: [go-live-checklist.md](go-live-checklist.md) (bağlanacak hesaplar), [vercel-next-site.md](vercel-next-site.md), [ADR 0023](adr/0023-framework-after-first-paint.md) (derleme), [ADR 0013](adr/0013-app-moved-into-syncflow-web.md) (klasör düzeni).

## 1. Kilitli durum

| | |
|---|---|
| **Sürüm etiketi** | `release-2026-10-19b` (açıklamalı git etiketi, `origin`'e gönderilir; önceki: `release-2026-10-19`, `c06f6f9`) |
| **Canlı** | https://syncflow.agency · `https://www.syncflow.agency` → 308 → apex (yol ve sorgu korunur) |
| **Yapı** | Next.js 16.3.8, React 19, Tailwind v4, next-intl (7 dil), `npm` + `package-lock.json`; Node `>=20.19.0` (yerel doğrulama Node 24.12; `delivery:verify` ve `arch:verify` Node 20.19.0'da da denendi, [ADR 0034](adr/0034-telegram-lead-alert.md) §6) |
| **Doğrulama** | `npm run release:verify`: etiketin anında **8/8 adım yeşil**, yerel, temiz derleme (aşağıda §7.1); 22.10.2026'dan beri kapı iki derleme sınar ve 11 adımdır (§7.0) |
| **Canlı doğrulama** | `node scripts/live-check.mjs https://syncflow.agency`: 47 geçti, 0 uyarı, 0 hata; `qa:csp` 0 ihlal, 0 konsol hatası |

### Kabul edilen yer tutucu mantığı (sahibin kararı, 19.10.2026)

Sahibi, teslim ve hukuki değişkenlerin **yer tutucu mantığıyla** yayında kalmasını kabul etti. Bunlar **kusur değil, bilinen ve kabul edilmiş durumlardır**; sürüm kapısı onları bilerek boş bırakarak çalışır ve yine de sıfır hatayla geçer:

- **Teslim: yalnızca Telegram bağlı** (19.10.2026 akşamı, sahibin Production değişkenleriyle, [ADR 0034](adr/0034-telegram-lead-alert.md)); **SMTP ve webhook bağlı değil.** Form normal "gönder" modundadır ve başvuru (tek yol olduğundan tüm başvuru: ad, e-posta, mesaj) sahibin Telegram sohbetine düşer. İki Telegram değişkeni silinirse form dürüst "e-posta taslağı" moduna döner (ziyaretçi yanıtlarını kendi posta programında gönderir, "kopyala" düğmesi vardır; hiçbir şey "alındı" diye gösterilmez). API, anahtarlar ya da teslim yolu yokken kapalı düşer (403/503). Sürüm kapısı bu değişkenleri bilerek tanımsız bırakır, yani kapı hâlâ taslak modunu sınar. Diğer yollar kod değişmeden bağlanır (§3, §9).
- **Hukuki sayfalar yer tutuculu (yalnızca form AÇIKKEN):** `/privacy` ve `/imprint` uzun KVKK/GDPR taslağını yer tutucularıyla (yedi dilde 13 yer tutucu) gösterir ve `noindex`'tir; "uyumludur" yazılmaz. Gerçek olgular [legal-facts-intake.md](legal-facts-intake.md)'de listelidir. Varsayılan sürümde (§1.1) form kapalıdır ve iki sayfa kısa, bitmiş bildirimlerdir.
- Diğer bilinen sınırlar (kusur değil): altı çevirinin ana dil konuşuru incelemesi yok; Lighthouse son değişikliklerden sonra sakin makinede yeniden ölçülmedi (mühürlü değerler `lib/metrics.ts`'te); düzey-bileşen eşlemesi (bütçe adımı) sahibin onayına tabidir ([ADR 0031](adr/0031-founding-statement-and-budget-scope.md)).

### 1.1 Satışa hazır sürüm (22.10.2026, [ADR 0035](adr/0035-sales-ready-release.md))

Sahibinin isteğiyle varsayılan sürüm temizlendi: **fiyat yok, form yok, dil seçicide yalnızca İngilizce ve Türkçe, her çağrı bir e-posta bağlantısı.** Üç anahtar (hepsi `NEXT_PUBLIC_`, derlemede gömülür, yalnızca `true` ya da `1` açar): `NEXT_PUBLIC_SHOW_PRICING` (yatırım basamakları ve kapıdaki para birimi etiketleri), `NEXT_PUBLIC_BRIEFING_ENABLED` (form, bağlantıları ve `POST /api/briefing`; **form açılış sorusu fiyat olduğundan yalnızca `SHOW_PRICING` de açıksa açılır**) ve `NEXT_PUBLIC_CONTACT_EMAIL` (**tek iletişim adresi, kodda yazılı değil**; yoksa sayfada hiçbir e-posta bağlantısı olmaz ve derleme uyarır). Diller `NEXT_PUBLIC_LAUNCHED_LOCALES` varsayılanıyla `en,tr`; diğer beş dil 404 verir, mesaj dosyalarına dokunulmadı. Hepsini önceki hâline getirmek: üç değişkeni `true` / `true` / `en,tr,ar,de,fr,es,zh` yapıp yeniden dağıtmak (uzun hukuki taslak ve form geri gelir). **Telegram, Turnstile ve diğer teslim değişkenleri Production'da kalır ama form kapalıyken kullanılmaz.**

## 2. Vercel projesi

| Ayar | Değer |
|---|---|
| Ekip / proje | `yusufsutcu5441-7383` (hobby) / `syncflow-web` (`prj_MkTXQZlkbkWbRNzdUAkqEOUasFTJ`) |
| Depo ve dal | `yusufsutcu5441-web/syncflow-agency`, üretim dalı `main` (her `push` üretimdir) |
| Root Directory | `syncflow-web` (depo kökünde komut çalıştırılmaz) |
| Framework | Next.js, `vercel.json` ile; kurulum ve derleme komutları varsayılan (`npm install`, `next build`) |
| Derleme | `next build`; sarmalayıcı bağdaştırıcı `scripts/sf-adapter.mjs` çerçeveyi ilk boyamadan sonraya erteler ([ADR 0023](adr/0023-framework-after-first-paint.md)); kapatma anahtarı `DEFER_FRAMEWORK=off` |
| Önizleme | diğer dallar önizleme dağıtımı alır; `*.vercel.app` adresleri Vercel Authentication arkasındadır (401 normaldir) |

## 3. Ortam değişkenleri (Vercel → Settings → Environment Variables)

NEXT_PUBLIC_ önekliler **derleme anında gömülür** (değişince yeniden dağıtım gerekir); sunucu tarafı değişkenler yeni dağıtımda geçerli olur. Hassas (Sensitive) değişkenler girildikten sonra panelden bile okunamaz.

| Ad | Durum | Ne yapar |
|---|---|---|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | **Tanımlı** (Production + Preview) | Cloudflare Turnstile site anahtarı (herkese açık) |
| `TURNSTILE_SECRET_KEY` | **Tanımlı** (Sensitive, Production + Preview) | Bot denetiminin sunucu doğrulaması; API belirteçsiz isteği 403 ile reddeder |
| `SMTP_USER`, `SMTP_PASSWORD` (+ `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_FROM`, `BRIEFING_INBOX`) | **Yer tutucu: tanımsız** | Girilirse (ve `CONTACT_WEBHOOK_URL` yoksa) başvuru düz metin e-posta olarak SMTP ile gider ([ADR 0027](adr/0027-optional-smtp-delivery.md)); form "gönder" moduna geçer |
| `CONTACT_WEBHOOK_URL`, `CONTACT_WEBHOOK_SECRET` | **Yer tutucu: tanımsız** | Tercih edilen yol: imzalı webhook → n8n → Gmail ([n8n-briefing.md](n8n-briefing.md)); tanımlıysa SMTP kullanılmaz |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (+ `TELEGRAM_API_BASE`, yalnızca test) | **Tanımlı** (yalnızca Production; jeton Sensitive; 19.10.2026) | Ücretsiz, n8n'siz üçüncü yol ([ADR 0034](adr/0034-telegram-lead-alert.md), [go-live-checklist.md](go-live-checklist.md) yol C): webhook ya da SMTP varken yalnızca uyarı (ad, e-posta, mesaj yok) ve o yol başarısız olursa tüm başvuru; tek başına tüm başvuru. Geçerli bir çift girilince form "gönder" moduna geçer. Telegram rıza satırında ve gizlilik metninde işleyici olarak adlandırılmıştır |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Tanımsız | Paylaşımlı hız sınırı; yokken örnek başına bellek (bir kez uyarır) |
| `NEXT_PUBLIC_SITE_URL` | Tanımsız | Varsayılan `https://syncflow.agency` (canonical, hreflang, OG, site haritası) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | **Girilmeli** (Production + Preview; 22.10.2026) | Sitenin tek iletişim adresi: her `mailto:` bağlantısı, iletişim satırı, künye ve yapılandırılmış veri bundan gelir. **Kodda yazılı değildir.** Yoksa derlemede hiçbir e-posta bağlantısı olmaz (derleme uyarır); push'tan ÖNCE girin ya da girdikten sonra yeniden dağıtın |
| `NEXT_PUBLIC_SHOW_PRICING` | Tanımsız (= kapalı) | `true`: yatırım basamakları ve kapıdaki para birimi etiketleri görünür. Kapalıyken sitede hiçbir tutar yoktur; `lib/pricing.ts` değişmez ([ADR 0035](adr/0035-sales-ready-release.md)) |
| `NEXT_PUBLIC_BRIEFING_ENABLED` | Tanımsız (= kapalı) | `true` **ve** `SHOW_PRICING=true`: briefing formu, bağlantıları ve `POST /api/briefing` açılır; açılınca uzun hukuki taslak (yer tutuculu) geri gelir. Kapalıyken form yoktur ve `/api/briefing` her yöntemde 404 verir |
| `NEXT_PUBLIC_LAUNCHED_LOCALES` | Tanımsız | Varsayılan `en,tr` (22.10.2026, ADR 0035); diğer diller 404. Yedi sermaye merkezi dilini açmak: `en,tr,ar,de,fr,es,zh` |
| `CSP_MODE` | Tanımsız | Varsayılan: uygulanan CSP; `report-only` acil geri alma anahtarı |
| `DEFER_FRAMEWORK` | Tanımsız | `off` çerçeve ertelemesini kapatır |

Hiçbir gizli değer depoya girmez (`.env*` yoksayılır, yalnızca `.env.example` izlenir); `npm run audit:secrets` derleme çıktısında sızıntı arar ([ADR 0010](adr/0010-briefing-delivery-and-security.md)).

## 4. Alan adı ve DNS

- DNS Spaceship'tedir (`launch1/2.spaceship.net`); apex Vercel'e bakar, `www` için `CNAME` → `958eafc4b5215247.vercel-dns-017.com.` (Vercel'in bu proje için önerdiği değer; `cname.vercel-dns.com.` da çalışır).
- `www` → apex 308 yönlendirmesi kodda (`next.config.mjs`); sertifikalar (Let's Encrypt) Vercel tarafından otomatik alınır, yeni bir alan adı eklenince yaklaşık 10 dakika SSL hatası görülebilir.
- Doğrulama: `node scripts/live-check.mjs` (DNS üç çözümleyiciyle, TLS, `www`).

## 5. Yayın akışı

1. **Yerelde kapı:** `npm run release:verify` (iki derleme, 11 adım; sessiz makinede 16–18 dakika, yoğun makinede daha uzun; `-- --quick` hızlı kümedir). Hepsi yeşil olmadan commit "hazır" sayılmaz. Bir adım düşerse kapı düşen satırları ve tam çıktının dosya yolunu yazar.
2. **Yayın:** `git push origin main`; Vercel yaklaşık 30–60 saniyede yayınlar. Durum: `https://api.github.com/repos/yusufsutcu5441-web/syncflow-agency/commits/<sha>/status` ya da panel.
3. **Canlıda doğrula:** `NEXT_PUBLIC_CONTACT_EMAIL=<panelde girdiğiniz adres> node scripts/live-check.mjs https://syncflow.agency` (varsayılan sürümde bayraklar kapalı, diller `en,tr`; form açıkken `NEXT_PUBLIC_SHOW_PRICING=true NEXT_PUBLIC_BRIEFING_ENABLED=true EXPECT_LOCALES=…` da verilir; hata sıfır olmalı), `npm run qa:csp -- https://syncflow.agency`. `npm run qa:browser` **form açık derlemeyi** sürer (varsayılan sürümde form gruplarının sürecek bir şeyi yoktur). Site her adrese dakikada 30 API isteği ve 10 dakikada 5 briefing POST'u sınırı koyar; `live-check` 3 POST yapar, art arda çok sık koşmayın (429 uyarı olarak raporlanır, hata değildir).
4. **Değişken girdikten sonra:** panelden Redeploy ya da boş commit; `NEXT_PUBLIC_*` yeni derleme ister.

## 6. Geri alma

| İstenen | Yol |
|---|---|
| En hızlı | Vercel → Deployments → önceki dağıtım → **Promote to Production** (anında) |
| Kod | `git revert <sha>` + `git push origin main`; ya da `git checkout release-2026-10-19` ile kilitli sürümden dal açmak |
| Çerçeve ertelemesi sorun çıkarırsa | `DEFER_FRAMEWORK=off` + yeniden dağıtım |
| CSP bir kaynağı engellerse | `CSP_MODE=report-only` + yeniden dağıtım |
| Teslim sorun çıkarırsa | SMTP/webhook/Telegram değişkenlerini silmek: form dürüst taslak moduna döner |
| Beş yeni dili açmak (varsayılan kapalı) | `NEXT_PUBLIC_LAUNCHED_LOCALES=en,tr,ar,de,fr,es,zh` + yeniden dağıtım |
| Formu ve fiyatı geri getirmek | `NEXT_PUBLIC_SHOW_PRICING=true` ve `NEXT_PUBLIC_BRIEFING_ENABLED=true` + yeniden dağıtım (önce uzun hukuki taslağın yer tutucuları doldurulur) |

## 7. Sürüm kapısı sonuçları

`npm run release:verify` (`scripts/release-verify.mjs`): teslim ve bot denetimi değişkenleri **bilerek tanımsız**, sunucuda yalnızca Cloudflare'in her zaman geçen test gizli anahtarı. Her sürümün sonucu kendi etiketine aittir; **farklı etiketten sayı alıntılanmaz.**

### 7.0 `main` + ADR 0035, satışa hazır sürüm ve düzeltme turu (etiketsiz; yerel, 22.10.2026, 906 sn)

[ADR 0035](adr/0035-sales-ready-release.md): fiyat, form ve hukuki taslak bayraklara bağlandı, diller `en,tr`, her çağrı bir e-posta bağlantısı. Aynı günün düzeltme turu (ADR 0035 §8: getiri ve sonuç vaatleri nötrleştirildi, form kapalıyken Çizim 01 ve Numune 01 "Referans mimari" etiketli, adres düz metin de görünür, mailto kodlayıcısı birim testli) ikinci commit'tir. **Yeni etiket atılmadı; push edilmedi.** Kapı artık **iki derleme** sınar ve 11 adımdır. Aşağıdaki sayılar düzeltme turunun commit'ine aittir (ilk commit `63c231b` için: denetim 247, teslim 16/16, duman 197/197 ve 164/164, tarayıcı 315/315); `release-2026-10-19b` etiketine ait değildir (o etiketin sayıları değişmez). Süre, adım sürelerinin toplamıdır.

| Adım | Süre | Sonuç |
|---|---|---|
| Tip denetimi, lint, mesaj eşitliği (`en`, `tr`) | 21 sn | yeşil |
| Tasarım denetimi, özellikli derleme (her bayrak açık) | 22 sn | **251 geçti, 0 hata**, 1 uyarı, 4 bilgi |
| Teslim sözleşme testleri ve mailto kodlayıcısı | 3 sn | **26/26** (16 teslim + 10 kodlayıcı) |
| Referans mimari sözleşme testleri | 2 sn | 65/65 |
| HTTP duman testi, özellikli derleme (yedi dil) | 9 sn | **199/199** |
| CSP ihlali ve konsol hatası (12 ziyaret) | 102 sn | 0 / 0 |
| Gerçek tarayıcı akışı, özellikli derleme | 716 sn | **315/315** |
| Varsayılan sürümün derlemesi (her bayrak kapalı) | 19 sn | yeşil |
| HTTP duman testi, varsayılan sürüm | 12 sn | **167/167** |

Rota taraması, aranan izler ve gerçek Chrome'da çerez/depolama/üçüncü taraf denetimi: ADR 0035 §7. Düzeltme turunun kapsamı, dosya:satır listesi ve mailto href'i: ADR 0035 §8.

### 7.1 `release-2026-10-19b` (yerel, temiz derleme, 19.10.2026, 844 sn)

Önceki etikete göre fark: kök `README.md` (İngilizce), `LICENSE` (MIT), ADR 0033, kapının çıktısı ve tarayıcı akışının tipografi ölçümü (ADR 0033); **uygulama kodu aynıdır**, sayılar aynıdır.

| Adım | Süre | Sonuç |
|---|---|---|
| Tip denetimi, lint, mesaj eşitliği (yedi dil) | 30 sn | yeşil |
| Tasarım denetimi, üretim derlemesiyle | 60 sn | **233 geçti, 0 hata**, 1 uyarı (yer tutuculu hukuki sayfalar, kabul edildi), 4 bilgi |
| Teslim sözleşme testleri | 1 sn | 7/7 |
| Referans mimari sözleşme testleri | 2 sn | 65/65 |
| HTTP duman testi (üretim sunucusu) | 9 sn | **193/193** |
| CSP ihlali ve konsol hatası (12 ziyaret) | 95 sn | **0 / 0** |
| Gerçek tarayıcı akışı | 646 sn | **315/315** |

Etiketten sonra yapılan doğrulamalar (bu satırlar, etiketlenen commit'ten sonra gelen bir belge commit'iyle eklendi):

- **Canlı** (`https://syncflow.agency`, dağıtımdan sonra): `live-check` ilk koşu (dağıtımdan hemen sonra) 46 geçti, 1 hata (adı yakalanmadı), sonraki iki koşu **47 geçti, 0 uyarı, 0 hata**; `qa:csp` **0 ihlal, 0 konsol hatası**; GitHub lisansı MIT olarak algıladı.
- **Temiz klon** (GitHub'dan `git clone --depth 1 --branch release-2026-10-19b`, `npm ci` 115 sn): `arch:verify` 3 sn; `release:verify` **8/8 yeşil, 791 sn**, aynı sayılar (tarayıcı akışı 315/315, yeniden yükleme gerekmedi). Windows 11, Node 24.12; macOS ve Linux denenmedi.

### 7.2 `release-2026-10-19` (yerel, temiz derleme)

Aynı etiketin GitHub'dan **temiz klonda** denemesi (19.10.2026): 7/8 adım yeşil, tarayıcı akışı **313/315** (düşen iki kontrolün adı o gün yakalanamadı), aynı adım tek başına tekrarlanınca 315/315; ayrıntı ve sonrasında yapılan düzeltme: [ADR 0033](adr/0033-public-front-page-license-and-gate-output.md) §1 ve §3.

| Adım | Sonuç |
|---|---|
| Tip denetimi, lint, mesaj eşitliği (yedi dil) | yeşil |
| Tasarım denetimi, üretim derlemesiyle (`faz2-denetim --build`) | **233 geçti, 0 hata**, 1 uyarı (yer tutuculu hukuki sayfalar, kabul edildi) |
| Teslim sözleşme testleri | 7/7 |
| Referans mimari sözleşme testleri | 65/65 |
| HTTP duman testi (üretim sunucusu) | **193/193** |
| CSP ihlali ve konsol hatası (12 ziyaret) | **0 / 0** |
| Gerçek tarayıcı akışı (Chrome, iki ekran, yedi dil) | **315/315** (CLS 0, Arapça sağdan sola, kapı, simülatörler, briefing, çizim, bütçe bloğu, numuneler, bağlantılar) |

Canlıda ayrıca: `live-check` 47/0/0, W3C Nu HTML denetleyicisi `/privacy`, `/imprint` ve iki numune sayfasında (toplam 28 sayfa) 0 hata, axe 0 ihlal.

### 7.3 `main` + ADR 0034 (etiketsiz; yerel, 19.10.2026, 794 sn)

Telegram bildirimi ve teslimi ([ADR 0034](adr/0034-telegram-lead-alert.md)) ve Node 20.19'da düşen teslim testlerinin düzeltilmesi. **Yeni etiket atılmadı:** kanıt etiketi `release-2026-10-19b` kalır (dışarıya giden mesajlar ona bağlıdır); bu değişiklik o etiketin sayılarını değiştirmez, üstüne kontrol ekler. Aşağıdaki sayılar bu commit'e aittir, etikete değil.

| Adım | Süre | Sonuç |
|---|---|---|
| Tip denetimi, lint, mesaj eşitliği (yedi dil) | 22 sn | yeşil |
| Tasarım denetimi, üretim derlemesiyle | 13 sn (derleme önbellekten; ilk derleme ayrıca alınmıştı) | **241 geçti, 0 hata**, 1 uyarı (yer tutuculu hukuki sayfalar, kabul edildi), 4 bilgi (233 + 8 yeni Telegram kapısı) |
| Teslim sözleşme testleri | 2 sn | **16/16** (7 SMTP + 9 Telegram) |
| Referans mimari sözleşme testleri | 1 sn | 65/65 |
| HTTP duman testi (üretim sunucusu) | 8 sn | **193/193** |
| CSP ihlali ve konsol hatası (12 ziyaret) | 98 sn | **0 / 0** |
| Gerçek tarayıcı akışı | 650 sn | **315/315** |

Kapı dışında ayrıca (19.10.2026): `npm run delivery:verify` **Node 20.19.0 ve 24.12.0'da 16/16**, `npm run arch:verify` Node 20.19.0'da 65/65 (`npx -p node@20.19.0`); `npm run delivery:e2e` (önce `npm run build`; üretim derlemesi, sahte webhook ve sahte Telegram) **18/18**. **Doğrulanmadı:** Telegram'ın gerçek bir mesajı kabul etmesi (jeton verilmedi): `npm run telegram:check -- --send`.

Commit `9d690d1` push edildikten sonra (bu satırlar, o commit'ten sonra gelen bir belge commit'iyle eklendi):

- **Canlı** (`https://syncflow.agency`, dağıtımdan sonra): Vercel durumu `success` ("Deployment has completed"); `live-check` **47 geçti, 0 uyarı, 0 hata**; `qa:csp` **0 ihlal, 0 konsol hatası**; `qa:browser --only=briefing` **9/9** (Telegram değişkenleri tanımsız olduğundan form hâlâ dürüst e-posta taslağı modunda: API'ye hiçbir şey gitmedi, hiçbir şey "alındı" diye gösterilmedi); `/privacy`, `/tr/privacy`, `/de/privacy` ve ana sayfadaki rıza satırı Telegram'ı işleyici olarak adlandırıyor.
- O anda Telegram değişkenleri canlıda tanımlı değildi; sahip aynı akşam girdi (aşağıdaki madde).
- **Telegram bağlandıktan sonra** (sahip `TELEGRAM_BOT_TOKEN` ve `TELEGRAM_CHAT_ID`'yi Production'a girip Redeploy etti; Vercel durumu `success`): canlı ana sayfada `data-direct` işareti kalktı (0), son adımın düğmesi "Send the briefing"; `live-check` **47/0/0**; `qa:browser --only=briefing` **2/2** (bağlı kip: form API'ye gönderir, taslak notu yok); `qa:csp` **0 / 0** (Turnstile widget'ı yüklüyken de). Gerçek Chrome'da, gerçek Turnstile jetonuyla gönderilen **tek, açıkça TEST etiketli başvuru** (`TEST, not a real briefing`): API **200 `{"ok":true}`**, başarı paneli "Briefing received.", taslak ya da yerel-kayıt notu yok. Tek teslim yolu Telegram olduğundan 200, Telegram'ın mesajı kabul ettiği (`ok:true`) anlamına gelir; **telefonda görünmesi sahibin teyidine bağlıdır.**

## 8. Gizli bilgi kuralları

- Sırlar yalnızca Vercel ortam değişkenlerinde durur; sohbette paylaşılan iki Vercel API anahtarı iş bitince silindi (18.10.2026). Turnstile gizli anahtarı bir sohbette göründü: kaygı varsa Cloudflare'de **Rotate secret key** ile yenilenir, yenisi Vercel'e girilir.
- Takım yetkisiyle belirteç üretildiğinde en dar kapsam (yalnızca `syncflow-web`) ve kısa ömür seçilir, iş bitince silinir.

## 9. Sonradan bağlamak için (kodu değiştirmez)

- **Formu bağlamak:** [go-live-checklist.md](go-live-checklist.md) §2–3 (yol A: n8n, yol B: ayrılmış gönderici hesapla SMTP), sonra yeniden dağıtım.
- **Hukuki sayfaları tamamlamak:** [legal-facts-intake.md](legal-facts-intake.md) tablosunu doldurmak; yer tutucular kalkınca `noindex` da kalkar.
- **Yeni sürüm kilidi:** değişiklikten sonra `npm run release:verify`, `git push`, canlı doğrulama, sonra `git tag -a release-<tarih> -m "…"` ve `git push origin release-<tarih>`.
