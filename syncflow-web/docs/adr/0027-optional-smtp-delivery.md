# ADR 0027: İsteğe bağlı SMTP teslimi (webhook yokken)

- **Durum:** Uygulandı, 17.10.2026. Varsayılan davranış **değişmedi**: SMTP, yalnızca `CONTACT_WEBHOOK_URL` tanımlı değilken ve `SMTP_USER` ile `SMTP_PASSWORD` tanımlıyken devreye girer.
- **Tetikleyen istek:** sahibin "formun 503 vermemesi" ve "Vercel ayarlarını benim adıma hallet" istekleri. Formu bağlamanın en kısa yolu n8n kurmak değil, bir Gmail hesabının uygulama parolasını Vercel'e girmektir; bu yol n8n kurmayı gerektirmez.
- **Karar:** webhook → n8n → Gmail yolu **belgelenmiş ve tercih edilen yol olarak kalır**. Yanına, aynı sunucu koduna bağlı, kapalı varsayılan ikinci bir yol eklendi: başvuru düz metin bir e-posta olarak SMTP ile gönderilir.

## 1. Neden bu bir ödünleşimdir

CLAUDE.md ve [ADR 0010](0010-briefing-delivery-and-security.md) şunu söylüyordu: "Gmail kimlik bilgisi Next uygulamasında tutulmaz". Bu kural bir güvenlik kararıydı: sitenin sunucu ortamına sızan bir değişken, bir posta hesabını açmasın. SMTP yolu bu kuralı **bilerek gevşetir**:

- Bir SMTP parolası, o hesap adına posta gönderebilen bir sırdır. Vercel ortam değişkenlerine erişen biri (ya da sunucu tarafında bir sızıntı) onu okur.
- **Gmail uygulama parolası yalnızca gönderme yetkisi vermez:** aynı hesabın tüm posta kutusunu IMAP ile de açar. Bu yüzden Gmail ile kullanılacaksa hesap, başka posta taşımayan **ayrılmış bir gönderici hesabı** olmalıdır (örn. `site@syncflow.agency`), asıl gelen kutusu değil. Başvuru gerçek gelen kutusuna `BRIEFING_INBOX` ile yönlenir.
- Daha dar bir anahtar yeterliyse (yalnızca gönderen bir SMTP sağlayıcısı: aynı değişkenler, farklı `SMTP_HOST`), o tercih edilir; kod bir sağlayıcıya bağlı değildir.

Bu yüzden yol **kapalı gelir**, belgelerde ödünleşimiyle birlikte anlatılır ve webhook tanımlıysa SMTP **hiç kullanılmaz** (iki yol aynı anda çalışıp çift e-posta üretmez).

## 2. Ne yapıldı

| Dosya | İş |
|---|---|
| `lib/server/smtp.ts` | `smtpSettings(env, contactEmail)`: ayarları doğrular (geçersiz adres yolu **kapatır**, yanlış bir yere göndermez); `buildBriefingMail`: düz metin, `Reply-To` ziyaretçi, `Message-ID` = teslim kimliği, başlık enjeksiyonuna karşı tüm denetim karakterleri temizlenir; `sendBriefingMail`: bir deneme, sonucu `ok` / `retry` / `final` |
| `lib/server/deliver.ts` | webhook varsa webhook; yoksa ve SMTP ayarlıysa SMTP; ikisi de yoksa geliştirmede yerel kabul, üretimde `not_configured` (API 503, kapalı düşme). Aynı yeniden deneme çerçevesi (en çok iki deneme, toplam < 9,5 sn, aynı `id`) iki yol için ortaktır. `DeliveryResult.via` artık `'smtp'` de olabilir |
| `lib/server/delivery-status.ts` | "Teslim bağlı mı" sorusu: Turnstile gizli+site anahtarı **ve** (webhook adresi+sırrı **ya da** SMTP kullanıcı+parola). Böylece SMTP girilince form doğrudan e-posta kipinden normal kipe geçer |
| `tests/delivery/smtp.test.mjs` | `npm run delivery:verify`: loopback'te gerçek bir SMTP konuşması (oturum açma, zarf, başlıklar, gövde), başlık enjeksiyonu denemesi, reddedilen parola (`final`, yeniden denenmez), ulaşılamayan sunucu (`retry`), aynı kimlik = aynı `Message-ID` |
| `next.config.mjs` | `serverExternalPackages` içine `nodemailer` (paketlenmez, Node'dan yüklenir) |
| `.env.example` | `SMTP_USER`, `SMTP_PASSWORD`, isteğe bağlı `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_FROM` / `BRIEFING_INBOX` ve ödünleşim notu |

## 3. Güvenlik özellikleri (kodla sınanan)

- **Yalnızca TLS.** Örtük TLS portu (465) ya da `requireTLS` (STARTTLS zorunlu); düz bağlantıya yalnızca loopback test sunucusu için izin verilir.
- **Başlık enjeksiyonu yok.** Ad, şirket ve adreslerdeki CR/LF ve diğer denetim karakterleri başlığa girmez; test, `Bcc:` sokmaya çalışan bir ad ile yapılır ve zarfa ya da başlığa hiçbir alıcı eklenmediğini doğrular.
- **Düz metin.** HTML parçası yoktur; enjekte edilecek bir işaretleme yoktur.
- **Çift e-posta olmaz.** İkinci deneme aynı `Message-ID`'yi taşır (webhook yolundaki `Idempotency-Key` ile aynı mantık); bir posta kutusu bunu tekrar olarak atar.
- **Sır sunucuda kalır.** `deliver.ts` `import 'server-only'` taşır, `smtp.ts` yalnızca ondan içe aktarılır; hiçbir `NEXT_PUBLIC_` değişkeni yoktur. Mevcut `npm run audit:secrets` aynı derleme taramasını yapar.
- **Kapalı düşme.** Eksik ya da geçersiz ayar → `not_configured` → API 503 → sayfa doğrudan e-posta kipi. Sahte "alındı" yoktur ([ADR 0025](0025-honest-trust-signals.md)).

## 4. Sınırlar ve riskler

- **STARTTLS yolu sınanmadı.** Yerel test sunucusu düz bağlantıdır (loopback istisnası); `requireTLS` davranışı nodemailer'a dayanır. Gmail'in 465 portu örtük TLS olduğu için varsayılan yol bu sınırdan etkilenmez; 587 + STARTTLS kullanan bir sağlayıcıda ilk gerçek gönderim ayrıca doğrulanmalıdır.
- **Gerçek Gmail teslimi bu makinede doğrulanamadı:** parola verilmedi. `npm run delivery:verify` protokolü sınar, Google'ın kabulünü değil.
- **Üretim sunucusuyla uçtan uca denendi (17.10.2026, `next start`, loopback'te sahte SMTP):** doğru parolayla `POST /api/briefing` → 200 `{"ok":true}`, bir mesaj, alıcı `contact@syncflow.agency`, `Reply-To` ziyaretçi, `Message-ID` teslim kimliği, gövde okunur (quoted-printable, "$50,000 – $100,000" ve "6 – 10 weeks" etiketleri çözülmüş); yanlış parolayla 502 `failed`, 1,5 sn'de, **yeniden denemeden** (tek oturum açma denemesi). Bu deneme nodemailer'ın derlenmiş sunucuda yüklendiğini (`serverExternalPackages`) gösterir; Vercel'deki paketlemeyi göstermez, o ilk dağıtımda görülür.
- **Test sahtesinde bir hata bulundu ve düzeltildi:** sahte SMTP sunucusu `\r\n.\r\n` sonlandırıcısını iki parçaya bölünmüş geldiğinde kaçırıyordu (uçtan uca denemede iki deneme de zaman aşımına uğradı, 502). Hata sitede değil sahte sunucudaydı; birim testin sahtesi aynı mantığı taşıyordu ve yalnızca parçalanma şansıyla geçiyordu. İkisi de tüm alınan veride sonlandırıcıyı arayacak şekilde düzeltildi.
- Gmail günlük gönderim sınırı vardır; bu form için yeterlidir, ama bir yük altında 503 değil `failed` (502) döner ve ziyaretçiye e-posta taslağı önerilir.
- Gizlilik metni işleyicileri adlandırır (Cloudflare, n8n, Gmail). SMTP yolunda n8n **işleyici değildir**; hukuki sayfaların 14 yer tutucusundan "teslim hizmeti / işleyiciler" sahibin gerçek seçimiyle doldurulur ([docs/go-live-checklist.md](../go-live-checklist.md)).

## 5. Geri alma

SMTP değişkenlerini silmek yeterlidir: `smtpSettings` `null` döner, davranış önceki hâle (webhook ya da 503 + doğrudan e-posta kipi) döner. Kod değişikliği gerekmez.
