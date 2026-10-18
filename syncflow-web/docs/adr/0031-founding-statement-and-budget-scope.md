# ADR 0031: Kuruluş cümlesi (Studio) ve bütçe adımında "bu düzeyde genellikle yer alanlar" bloğu

- **Durum:** Uygulandı, 18.10.2026.
- **Tetikleyen istek:** sahibin yapıştırdığı üç maddelik metin (başka bir sohbetten): (1) Studio'ya "Founded by an architect who works in the dark…" kuruluş metni, (2) bütçe seçilince altında beliren, açılan kurumsal altyapı bileşenlerini anlatan teknik 3 satır, (3) SMTP ortam değişkenleri ve OG etiketleri; bütçe değişiminde sıfır kayma.
- **Karar:** (1) ve (2) yapıldı; (3) önceki turlarda yapılmıştı ve yeniden doğrulandı.

## 1. Kuruluş cümlesi

- **Metin (EN, olduğu gibi):** "Founded by an architect who works in the dark and designs for low-tolerance enterprise infrastructures. We do not operate on social praise or public noise. We build, measure, and fail closed." Altı çeviri sitenin kendi terimleriyle ("arızada kapalı kal", "mimar", "sıfır güven") yazıldı.
- **Yeri:** Studio bölümünde, giriş cümlesinin altında, "Kuruluş ilkeleri" etiketi ve ince bir kenar çizgisiyle (`components/sections/Studio.tsx`, `.founding` / `.founding-text`). Sunucuda çizilir, JavaScript gerektirmez.
- **Sahibin tanıklığı:** cümle **sahibin kendisi hakkındaki beyanıdır** ("bir mimar", tekil). Bunu ben doğrulayamam; sitenin başka yerleri "kurucu ekip" der (çoğul). Çelişmez ama ikisi aynı kişiye işaret etmeli; farklıysa tek satırlık metin değişikliğidir (`Studio.founding`). Müşteri, sonuç ya da kişi sayısı iddiası içermez ([ADR 0025](0025-honest-trust-signals.md) ile uyumlu).

## 2. Bütçe adımı: bu düzeyde genellikle yer alanlar

- **Ne gösterir:** üç basamaktan biri seçilince seçeneklerin altında üç satırlık teknik açıklama; seçmeden önce bir yönlendirme cümlesi. Seçimi değiştirmek satırları değiştirir.

| Düzey | Satırlar (özet) |
|---|---|
| T1, çekirdek mimari ve iş akışı otomasyonu | Ön yüz: sunucuda çizilen, yerelleştirilmiş, ölçülen performans bütçesi · Otomasyon: imzalı webhook'lar (HMAC-SHA256), idempotent teslim · Sağlamlaştırma: uygulanan CSP, çerez yok, analitik yok |
| T2, kurumsal altyapı ve çok bölgeli ekosistem | Dayanıklılık: yedekli kuyruk şeritleri, sınırlı yeniden deneme (kayıp ve çift uygulama için sınanmış referans kuyruk örnek alınır) · Entegrasyon: imzalı olaylar üzerinden CRM/ERP bağlayıcıları (Salesforce, SAP, HubSpot, Oracle örnek) · Erişim: tek kod tabanından çok dil, pazar, para birimi |
| T3, özel küresel ekosistemler | Güvenlik: sıfır güven zarfı, imzalı (HMAC-SHA256) ve mühürlü (AES-256-GCM) iletiler · Mimari: çok sistemli tasarım, kod yazılmadan önce çizilir ve uzlaşılır · Kapsam: briefing sonrasında birlikte yazılır, sabit paket yok |

- **Dürüstlük çerçevesi:** blok "genellikle yer alanlar" der, "Briefing sonrasında yazılı olarak belirlenir: bir tanımdır, teklif değildir. Ürün adları sahiplerine aittir; ortaklık ima edilmez." notunu taşır. İsteğin örneğindeki **"Edge Caching" yazılmadı:** sayfalar her istekte (CSP nonce'u nedeniyle) sunucuda çizilir, HTML uçta önbelleğe alınmaz; yalnızca değişmez statik dosyalar CDN'dedir, bunu bir bileşen diye vaat etmek yanlış olurdu. Her satırdaki bileşenin **depoda kodu ve testi vardır** ve denetim (G4) bunu doğrular: imza ve mühür (`lib/arch/envelope.ts`), idempotent teslim ve imzalı webhook (`lib/server/deliver.ts`), uygulanan CSP (`lib/security/csp.ts`), kayıp ve çift için sınanan referans kuyruk (`tests/arch`).
- **Sahibin onaylayacağı nokta:** hangi bileşenin hangi bütçe düzeyinde "genellikle" yer aldığı eşlemesi **benim yazımımdır** (basamak başlıkları sahibin: [ADR 0019](0019-enterprise-tier.md); bileşenler sitenin belgelediği yetenekler). Bir ticari kapsam beyanı olduğu için sahibin istediği eşleme budur diye onayı gerekir; farklıysa yalnızca `Briefing.budget.t{1,2,3}s{1,2,3}` metinleri değişir.

## 3. Sıfır kayma nasıl sağlandı

Bloğun hücresi **hiç yükseklik değiştirmez**: yönlendirme cümlesi ve üç düzeyin metni, aynı ızgara hücresinde **görünmez** (`visibility: hidden`, ekran okuyucudan gizli) olarak birlikte çizilir; hücre en uzununun yüksekliğindedir ve görünen metin (polite `role="status"` bölgesi) bunun üstüne çizilir. Dil ve ekran genişliği fark etmeksizin (Almanca/Fransızca uzun, Çince kısa) yükseklik sabittir.

Ölçümde bir tuzak bulundu ve düzeltildi: tarayıcının `layout-shift` ölçümü **tıklamadan sonraki 500 ms'lik kaymaları saymaz**; yalnızca CLS = 0 demek burada yeterli kanıt olmazdı. Bu yüzden test, blok, not, dipnot ve düğmenin **panele göre** konumunu ve bloğun, panelin ve bölümün yüksekliğini seçimlerden önce ve sonra karşılaştırır (mutlak konum değil: seçimde odak kayar, sayfa radyoya kayar ve panelin kendi hafif kaydırmaya bağlı dönüşümü vardır; bunlar düzen değişimi değildir). Sayfanın toplam yüksekliği bilerek dışarıda: formun altındaki `content-visibility` bölümleri yaklaşınca gerçek boyutuna oturur (birkaç piksel), formdan bağımsızdır.

## 4. (3) SMTP ve OG: yeni bir şey yok

- **SMTP:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `BRIEFING_INBOX` ortam değişkenleri ([ADR 0027](0027-optional-smtp-delivery.md)); yer tutucu alan yok. Canlı form, gönderici hesap bilgisi girilene kadar "e-posta taslağı" modunda kalır (dürüst varsayılan).
- **OG:** önizleme açıklaması "Digital architecture at enterprise scale. Finished in silence, measured rather than promised." `og:description` ve `twitter:description` olarak yedi dilde canlıda ([ADR 0029](0029-share-preview-live-check-429-and-declines.md)).

## 5. Doğrulama

Denetim 0 hata (yeni G4: sabit yükseklikli blok yapısı, bileşenlerin depoda karşılığı, yedi dilde metinler), smoke 189/189 (kuruluş cümlesi ve üç düzeyin tüm satırları yedi dilde sayfada), `qa:browser --only=scope,briefing,drawing,cta,anchors,cls` **134/134** (scope grubu 77: yedi dil masaüstünde, dört dil telefonda; her profilde cümle, metin, yer değişimi, kayma), axe 0 ihlal, `qa:csp` 0. Yer tutucular yeniden ölçüldü: Studio `--cv` 6481/5556/3974 → 6693/5741/4173, Briefing 1400/1240/1440 → 1752/1494/1700.

## 6. Sınırlar

- Altı çeviri (kuruluş cümlesi ve 33 yeni satır) ana dil konuşuru tarafından okunmadı.
- Düzey-bileşen eşlemesi ve "bir mimar" cümlesi sahibin onayını bekler (yukarıda).
