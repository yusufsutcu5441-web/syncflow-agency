# Gizlilik ve Künye sayfaları: gerçek bilgi listesi (13 yer tutucu)

`/privacy` ve `/imprint` yedi dilde, KVKK m.10 / GDPR m.13 sırasıyla (9 bölüm) kurulu ve **yapıları tamam**; geriye kalan, yalnızca **sizin bilebileceğiniz 13 olgudur** (şirket unvanı, adres, vergi numarası gibi). Bunları ben uyduramam: uydurulmuş bir unvan, adres ya da vergi numarası, bir hukuki sayfada **yanlış beyan** olur. Bilgi gelince yedi dile işlemek, `Legal.draft` uyarısını ve `noindex`'i kaldırmak, denetimi ve testleri çalıştırmak benim işim.

> **Bu sayfalara "GDPR/CCPA uyumludur" yazılmaz.** Uyum bir hukuki durumdur, kod değil; denetim (`faz2-denetim.mjs`) "compliant / uyumlu / garanti" ifadelerini yasaklar ([ADR 0025](adr/0025-honest-trust-signals.md)). Sayfa, **ne topladığımızı ve neyi toplamadığımızı** doğru anlatır: çerez yok, analitik yok, Cloudflare Turnstile dışında üçüncü taraf yok. Bu doğrulanabilir ve yazılı.

## 1. Sizden gerekenler

| # | Yer tutucu | Nerede görünür | Ne vermelisiniz | Not |
|---|---|---|---|---|
| 1 | `[COMPANY LEGAL NAME]` | Gizlilik p1 (veri sorumlusu), Künye i1 | Ticaret sicilindeki tam unvan | Marka adı ("syncflow.agency") unvan değildir |
| 2 | `[LEGAL FORM]` | Künye i1 | Hukuki biçim (Ltd. Şti., A.Ş., LLC, GmbH, bireysel...) | Türkiye'de ya da yurt dışında kurulu olması içeriği değiştirir (hangi kanun, hangi makam) |
| 3 | `[ADDRESS]` | Gizlilik p1 | Tek satır posta adresi | |
| 4 | `[STREET, POSTAL CODE, CITY, COUNTRY]` | Künye i2 | Yasal merkez adresi, ayrı satırlar | Sanal ofis ya da posta kutusu yeterli olmayabilir; avukatınıza sorun |
| 5 | `[PHONE]` | Künye i3 | Ulaşılabilen bir telefon, uluslararası biçimde | Künye için çoğu ülkede zorunlu |
| 6 | `[REGISTER AND NUMBER]` | Künye i4 | Sicil dairesi ve sicil/MERSİS numarası | Kayıt yoksa "yok" deyin, ben ona göre yazarım |
| 7 | `[VAT ID]` | Künye i4 | Vergi kimlik / KDV numarası | AB'de ücretli işte genellikle gerekir |
| 8 | `[NAME]` | Künye i5 | İçerikten sorumlu gerçek kişi (ad soyad) | Bazı ülkelerde (ör. Almanya) zorunlu, bir kişinin adıdır; ben seçemem |
| 9 | `[RETENTION PERIOD]` | Gizlilik p6 | Başvuruların saklama süresi (ör. "24 ay") | **Sizin kararınız**; sözleşme yapılırsa sözleşme süreleri ayrı yazılır |
| 10 | `[REQUEST CHANNELS, e.g. registered e-mail address]` | Gizlilik p7 | Veri talebi kanalı | Şu an `contact@syncflow.agency`; ayrı bir KEP/özel adres mi? |
| 11 | `[SUPERVISORY AUTHORITY]` | Gizlilik p7 | Yetkili denetim makamı (ör. KVKK Kurulu, bir AB üyesinin makamı) | **Merkezin bulunduğu yere bağlıdır**; avukat kararı |
| 12 | `[TRANSFER SAFEGUARDS, e.g. standard contractual clauses]` | Gizlilik p5 | Yurt dışına aktarımda dayanak (SCC, yeterlilik kararı...) | Aktarım gerçekten var: Cloudflare ve Google ABD'de işler; **avukat kararı** |
| 13 | `[DELIVERY SERVICE: signed webhook, n8n, Gmail]` | Gizlilik p2 | Başvurunun hangi hizmetle ulaştığı | **Seçtiğiniz teslim yoluna bağlı**, aşağıya bakın |

## 2. Teslim yolu seçimi metni değiştirir (madde 13)

Gizlilik metni işleyicileri adlandırır ve bu, **gerçekten kullanılan** yola uymalıdır ([docs/go-live-checklist.md](go-live-checklist.md)):

- **Yol A (imzalı webhook → n8n → Gmail):** işleyiciler Cloudflare (Turnstile), n8n (barındıran taraf kim ise) ve Google. Metin şu an bunu söylüyor.
- **Yol B (doğrudan SMTP, [ADR 0027](adr/0027-optional-smtp-delivery.md)):** n8n **işleyici değildir**; işleyiciler Cloudflare ve posta sağlayıcısı (Google Workspace/Gmail ya da seçtiğiniz SMTP hizmeti). p2 ve p5 buna göre yeniden yazılır.

- **Yol C (Telegram, [ADR 0034](adr/0034-telegram-lead-alert.md)):** Telegram bir işleyicidir ve rıza satırı ile p5 onu yedi dilde adlandırır. Webhook ya da SMTP varken Telegram'a yalnızca uyarı gider (şirket ve unvan satırı, yatırım düzeyi, proje türü, zamanlama); tek yolsa tüm başvuru (ad, e-posta, mesaj) gider. Telegram'ın hukuki unvanı, sunucu konumları, aktarım dayanağı (madde 12) ve sohbetteki mesajların **saklama/silme süresi** (madde 9) sizin ve avukatınızın kararıdır; ben yazamam.

Hangi yolu seçtiğinizi söyleyin; ben p2 ve p5'in işleyici listesini ona göre yedi dilde düzeltirim.

## 3. Hukuki karar gerektirenler (ben yazamam, yazmam)

- **"CCPA/CPRA" ya da başka bir ABD eyalet bölümü:** ABD tüketicisine hizmet verip vermediğiniz ve eşiklerin aşılıp aşılmadığı bir hukuki değerlendirmedir. Mevcut yapı KVKK ve GDPR sırasını izler; bir eyalet bölümü eklemek **avukatla** karar verilir, ben metni yazarım.
- **Uyum beyanı:** hiçbir sayfaya "uyumludur" yazılmaz (yukarıdaki not).
- **Avukat incelemesi:** yer tutucular dolduktan sonra metni bir avukata okutmanızı öneririm; yedi dil için de geçerli (altı dil araç çevirisidir, yerel konuşur ve hukuk incelemesi yok).

## 4. Bilgi gelince ben ne yaparım

1. 13 olguyu `messages/{en,tr,ar,de,fr,es,zh}.json` içindeki `Legal` bölümüne işlerim (yedi dil, aynı değerler; adresler ve numaralar dilden bağımsız).
2. `Legal.draft` uyarısını ve `/privacy` ile `/imprint` üzerindeki `noindex`'i kaldırırım.
3. `npm run check:messages -- --strict` (yer tutucu kalmadığını kanıtlar), denetim `--build`, smoke ve tarayıcı akışını çalıştırırım; canlıya alıp `live-check` ile doğrularım.
4. Yer tutucusuz sayfa arama motorlarına açılır; öncesinde açılmaz (bu bilinçli bir karardır: eksik bir künye yayında durmasın).

Cevap biçimi: yalnızca bu tabloyu doldurun, örneğin `1 = Syncflow Digital Ltd. Şti.`; ben gerisini yaparım.
