# ADR 0034: İsteğe bağlı Telegram bildirimi ve teslimi (ücretsiz, n8n'siz), ve Node 20.19'da düşen teslim testleri

- **Durum:** Uygulandı ve doğrulandı, 19.10.2026. Varsayılan davranış **değişmedi**: `TELEGRAM_BOT_TOKEN` ve `TELEGRAM_CHAT_ID` tanımlı değilken kod, bu değişiklikten önceki gibi davranır.
- **Tetikleyen istek:** sahibin "form doldurulduğunda telefonuma ve bilgisayarıma anında bildirim, $0 maliyetle" isteği (19.10.2026). İsteğin yapılmayan parçaları §7'de.
- **Karar:** `webhook → n8n → Gmail` ([n8n-briefing.md](../n8n-briefing.md)) ve SMTP ([ADR 0027](0027-optional-smtp-delivery.md)) yanına, aynı sunucu koduna bağlı, kapalı varsayılan **üçüncü bir yol** eklendi: bir Telegram botu ve özel bir sohbetin sayısal kimliği. İkinci olarak, `delivery:verify` Node 20.19'da çalışır hâle getirildi (§6).
- **Tamamlar:** [ADR 0010](0010-briefing-delivery-and-security.md) (teslim sözleşmesi), [ADR 0025](0025-honest-trust-signals.md) (sahte "alındı" yok), [ADR 0027](0027-optional-smtp-delivery.md).

## 1. Neden

Form bugün dürüst "e-posta taslağı" modunda ([ADR 0025](0025-honest-trust-signals.md)): teslim yolu (SMTP hesabı ya da n8n) sahibin hesaplarında bekliyor. Telegram Bot API ücretsizdir ("by default, bots are able to message their users at no cost", core.telegram.org/bots/faq, 19.10.2026); hesap açmak ve bir jeton almak beş dakikadır, n8n barındırmayı ya da bir posta sırrı saklamayı gerektirmez ve mesaj telefona ve masaüstü uygulamasına anında düşer.

## 2. Davranış (hangi değişkenler tanımlıysa)

| Tanımlı | Ziyaretçi ne görür | Telegram'a ne gider |
|---|---|---|
| hiçbiri | önceki gibi: üretimde 503 ve taslak modu | hiçbir şey |
| yalnızca Telegram | normal "gönder" modu; Telegram kabul ederse 200, etmezse 502 (sahte "alındı" yok) | **tüm başvuru** (ad, e-posta, rol, proje, mesaj, kimlik) |
| webhook ya da SMTP **ve** Telegram | webhook/SMTP kabul ederse 200 | **yalnızca uyarı**: şirket ve unvan satırı, öncelik sınıfı, yatırım düzeyi, proje türü, zamanlama, pazar, teslim kimliği. Ad, e-posta ve mesaj metni **yok** |
| yukarıdakinde webhook/SMTP **başarısız** | Telegram kabul ederse 200 (başvuru sahibe ulaştı) | tüm başvuru, ilk satırda "normal teslim yolu başarısız oldu" ve bir uyarı satırı |
| Telegram jetonu ya da sohbet kimliği biçimce geçersiz | yok sayılır (yol kapalı) | hiçbir şey |

Uyarının başarısızlığı ziyaretçinin yanıtını **değiştirmez**. Üç yol tek **9,5 sn**'lik teslim bütçesini paylaşır (Telegram varken webhook/SMTP 7,0 sn, Telegram 2,5 sn; denetim ve "Çizim 01" 9,5 sn rakamıyla uyumludur).

## 3. Mesajın biçimi ve "doğru durum" kuralı

İlk satır sahibin biçimini izler: `🚨 [SATIŞ ALARMI] - Müşteri: {şirket ve unvan} | Sınıf: {yüksek|orta} | Yatırım: {düzey} | Durum: …`. **Durum yalnızca o anda doğru olanı söyler**: "Başvuru alındı", "Başvuru webhook ile iletildi" ya da "Normal teslim yolu başarısız oldu, başvuru yalnızca buradan geldi". Sitede **ödeme adımı, ödeme bağlantısı ya da paket seçimi yoktur** ve formda 50.000 $ tabanının altında bir seçenek yoktur ([ADR 0019](0019-enterprise-tier.md)); bu yüzden bir form başvurusu hiçbir zaman "ödeme linki gönderildi", "kasa onayı bekleniyor" ya da bir paket fiyatı olarak bildirilmez: doğru olmayan bir durum, uyarıyı okuyanı uyarıyı yok saymaya alıştırır. Test bunu sınar.

## 4. Gizlilik

- **Telegram bir işleyicidir.** Rıza satırı (`Briefing.contact.micro`) ve gizlilik metninin işleyici bölümü (`Legal.p5`) onu yedi dilde adlandırır (araç yazımı çeviri, yerel konuşur ve hukuk incelemesi yok; yer tutucular ve taslak uyarısı durur). Denetim, Telegram kodu varken bu iki metinden birinde adı eksik bir dil olursa düşer.
- **Veri en azdır.** Başka bir yol teslim ediyorsa Telegram'a kişisel veri gitmez (yukarıdaki tablo). Tek yol Telegram'sa tüm başvuru gider ve istek `protect_content` taşır (Telegram istemcilerinden iletmeyi ve kaydetmeyi engellemesi istenir; ekran görüntüsünü engellemez).
- **Gizlilik metni p9 doğru kalır:** "hiçbir şey otomatik gönderilmez, her talebi bir kişi okur". Telegram ziyaretçiye **hiçbir şey göndermez**; yalnızca sahibe bildirir. ([CLAUDE.md](../../CLAUDE.md): p8/p9'daki işletme iddiaları doğru kalmak zorundadır.)
- **Saklama:** sohbetteki mesajlar Telegram'ın bulutunda sizin silmenize kadar durur. `[RETENTION PERIOD]` sahibin kararıdır ([legal-facts-intake.md](../legal-facts-intake.md) madde 9); bu yolu açtıysanız o süre sohbetteki mesajlar için de geçerlidir.
- Özel sohbet kullanın. Sohbet kimliği **sayısal** olmak zorundadır (`@kanal` adı reddedilir: bir başvuruyu herkese açık bir kanala yazabilirdi); grup kimliği (negatif) kabul edilir ama gruptaki herkes her başvuruyu görür.

## 5. Güvenlik

- Jeton yalnızca sunucu ortamındadır (`import 'server-only'` zinciri; `NEXT_PUBLIC_` yok; `npm run audit:secrets` ad ve değerini derleme çıktısında arar).
- Jeton hiçbir günlük satırına ya da hata iletisine yazılmaz (istek adresi jetonu taşır; `telegram.ts` hiç `console` kullanmaz, hata yutulur; test bir başarısız gönderimin hiçbir şey yazdırmadığını sınar).
- **Düz metin:** `parse_mode` yoktur, ziyaretçinin yazdığı hiçbir şey biçimlendirme ya da bağlantı etiketi olarak okunmaz; bağlantı önizlemesi kapalı; denetim karakterleri ve satır ayırıcıları temizlenir, tek satırlık alanlar tek satırdır (bir şirket adı ikinci bir "alarm" satırı açamaz); uzunluklar kod noktasıyla kesilir.
- `redirect: 'error'` (SSRF), `TELEGRAM_API_BASE` yalnızca `https` ya da loopback `http` kabul eder (testlerin sahtesi ve kendi barındırılan Bot API sunucusu için), başka bir değer gerçek `api.telegram.org`'a düşer.
- Sel koruması: `/api/briefing` zaten IP başına 10 dakikada 5, Turnstile, honeypot ve en az doldurma süresi taşır; Telegram ayrıca bir sohbete saniyede yaklaşık bir mesaj ister (aşılırsa 429, `retry`).
- Jeton bir mesajı bot adına gönderebilir ve bota gönderilenleri okuyabilir; **hiçbir posta kutusunu ve sahibin başka sohbetlerini açmaz** (Gmail uygulama parolasından dar). Sızdıysa BotFather'da `/revoke`.

## 6. Yan bulgu: Node 20.19'da düşen teslim testleri

`package.json` `engines` "Node ≥ 20.19" der, README ve dışarıya giden mesajlar da öyle. `delivery:verify` ise `.ts` dosyalarını doğrudan içe aktarıyordu; bu yalnızca **Node 22.18 ve üzerinde** çalışır (tür soyma varsayılan). Node 20.19.0'da denendi: `ERR_UNKNOWN_FILE_EXTENSION` (".ts"), yani **`release-2026-10-19b` ve öncesinin tam kapısı Node 20.19–22.17'de 3. adımda düşer.** `arch:verify` etkilenmez (TypeScript'i kendisi derler; Node 20.19.0'da 65/65 geçti). Düzeltme: `scripts/delivery-verify.mjs` iki modülü TypeScript API'siyle `node_modules/.cache` altındaki geçici bir klasöre derler ve testler oradan içe aktarır (`DELIVERY_LIB`); Node 22.18+ üzerinde testler kaynaktan da doğrudan çalışır. Sonuç: **Node 20.19.0 ve 24.12.0'da 16/16**. Eski etiketler değişmez: onların tam kapısı için gereken en düşük sürüm 22.18'dir (kök `README.md`'nin "Limits" bölümünde yazılıdır).

## 7. Yapılmayanlar (sahibin isteğinin parçaları) ve nedenleri

- **Ziyaretçiye otomatik e-posta dizisi:** gizlilik metni p9 "hiçbir şey otomatik gönderilmez, her talebi bir kişi okur" der ve bu cümle doğru kalmak zorundadır. Otomatik bir dizi, hem o cümleyi yanlış yapar hem de başvuru sonrası ekranın "kurucu ekip kişisel olarak yazar" sözüyle çelişir.
- **Formdan "ödeme", "randevu" olayları:** sitede ödeme adımı ve randevu aracı yoktur; olmayan bir olay için kod yazılmaz. Bir ödeme sağlayıcısı seçilince (sahibin hesabı, kimlik bilgisi) olay sağlayıcının imzalı webhook'u olarak eklenir.
- **Gelen Telegram webhook'u (`setWebhook`) rotası:** hiçbir özellik ona ihtiyaç duymaz ve herkese açık bir uç saldırı yüzeyidir. Bir onay/hatırlatma akışı kurulursa n8n'in Telegram Trigger'ı gelen tarafı üstlenir.
- **Paket/fiyat alanı:** formda tutar yok, yalnızca asgari tutarın katları olan üç düzey var ([ADR 0019](0019-enterprise-tier.md)); uyarı yalnızca seçilen düzeyi yazar.

## 8. Ne yapıldı

| Dosya | İş |
|---|---|
| `lib/server/telegram.ts` | `telegramSettings` (biçim doğrular, geçersizse yolu kapatır), `buildTelegramText` (uyarı ve tam, doğru durum), `sendTelegram` (tek istek; `ok` / `retry` / `final`) |
| `lib/server/deliver.ts` | yol sırası: webhook, yoksa SMTP, yoksa Telegram; Telegram varken uyarı, yol arızasında tam başvuru; tek 9,5 sn bütçe |
| `lib/server/delivery-status.ts` | "teslim bağlı mı": Turnstile **ve** (webhook ya da SMTP ya da geçerli Telegram) |
| `messages/*.json` (7 dil) | `Briefing.contact.micro` ve `Legal.p5`: Telegram işleyici olarak adlandırıldı |
| `tests/delivery/telegram.test.mjs`, `scripts/delivery-verify.mjs` | 9 sözleşme testi (loopback'te sahte Bot API); `delivery:verify` artık TypeScript'i derleyip çalıştırır |
| `scripts/delivery-e2e.mjs` | üretim derlemesine karşı dört ortamda uçtan uca deneme (`npm run delivery:e2e`) |
| `scripts/telegram-check.mjs` | sahibin denetimi: `getMe`, `--find-chat`, `--dry-run`, `--send` (`npm run telegram:check`) |
| `faz2-denetim.mjs` (G4) | sekiz yeni kapı; `scripts/audit-secrets.mjs`, `scripts/release-verify.mjs`, `.env.example` |

## 9. Doğrulama (19.10.2026, Windows 11)

- `npm run delivery:verify`: **16/16** (7 SMTP + 9 Telegram), Node 24.12.0 ve Node 20.19.0. Telegram testleri sahte Bot API'ye karşı gerçek HTTP isteği sınar: yol (`/bot<jeton>/sendMessage`), gövde (`chat_id` dize, `link_preview_options`, `parse_mode` yok, `protect_content` yalnızca tam başvuruda), yanıtların üçe ayrılması (200 `ok:false` ve 400/401/403/404 kesin; 408/429/5xx yeniden denenir), yönlendirmenin izlenmemesi, ulaşılamayan ve hiç yanıt vermeyen sunucu, hostile girdi (kontrol karakteri, satır ayırıcı, çok uzun metin, bölünmemiş vekil çift).
- `npm run delivery:e2e`: **18/18** (gerçek üretim derlemesi, sahte webhook ve sahte Telegram): uyarı kişisel veri taşımaz; webhook çökünce tam başvuru Telegram'a gider; Telegram çökünce ziyaretçi yine 200 alır; her şey çökünce 502; yalnızca Telegram: 200, reddedilen jeton 502 ve yeniden denenmez; bozuk jeton ve hiçbiri: 503.
- Tasarım denetimi: `faz2-denetim --build` **241 geçti, 0 hata** (233 + 8 yeni Telegram kapısı); tam sürüm kapısı **8/8 yeşil, 794 sn** (teslim 16/16, mimari 65/65, smoke 193/193, CSP 0/0, tarayıcı 315/315): `docs/deployment.md` §7.3.
- **Doğrulanmadı:** Telegram'ın bir mesajı gerçekten kabul etmesi (bot jetonu verilmedi; kimlik bilgisi aranmaz). Sahibin ilk denemesi: `npm run telegram:check -- --send`. Telegram `retry_after` ile 429 dönerse tek yeniden deneme çoğu zaman yetmez; bir sel altında uyarılar kaybolabilir (başvuru yine webhook/SMTP ile teslim edilmiştir).

## 10. Riskler ve sınırlar

- **Telegram'ın kendisi bir bağımlılıktır.** Tek yol Telegram'sa onun bir kesintisi başvuruyu 502'ye çevirir ve ziyaretçiye e-posta taslağı önerilir (başvuru kaybolmaz ama otomatik de ulaşmaz). İki yolu birlikte kullanmak bu riski azaltır.
- **Telegram'da idempotency anahtarı yoktur.** Yanıtı kaybolan bir istek yeniden denenirse mesaj iki kez görünür; ikisi de aynı `Ref` kimliğini taşır.
- **Mesajlar bulutta ve sohbette durur.** Telefon kaybı ya da çalınan oturum başvuruları açar; ikinci adım doğrulama ve oturum denetimi sahibin Telegram ayarıdır.
- **Hukuki:** Telegram'ın işleyici olarak nitelendirilmesi, aktarım dayanağı ve saklama süresi avukat kararıdır ([legal-facts-intake.md](../legal-facts-intake.md)); metin bunu yer tutucularla bırakır.
- Çeviriler araç yazımıdır; yedi dildeki iki cümle yerel konuşur incelemesi bekler.

## 11. Geri alma

`TELEGRAM_BOT_TOKEN` ve `TELEGRAM_CHAT_ID` değişkenlerini silmek (ve yeniden dağıtmak) yeterlidir: `telegramSettings` `null` döner, davranış önceki hâle (webhook, SMTP ya da 503 + taslak modu) döner. Kod değişikliği gerekmez.
