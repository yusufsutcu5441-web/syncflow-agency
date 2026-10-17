# Gerçek vaka, sertifika ve SLA bilgisi: ne verirseniz ne yazarım

Bu dosya, sosyal kanıtı (müşteri hikayeleri, uyum rozetleri, SLA maddeleri) siteye **gerçek** olarak koymak için sizden gereken bilgiyi listeler. Bilgi gelince kod, çeviri (yedi dil) ve testler benim işim; **olgular sizin**. Gerekçe: [ADR 0025](adr/0025-honest-trust-signals.md).

## 1. Maskelenmiş müşteri vakası (her vaka için)

Bir vaka yalnızca şunların **hepsi** doğruysa yayınlanır:

- [ ] Bu iş gerçekten yapıldı (ya da sürüyor) ve sizin stüdyonuzun işiydi.
- [ ] Müşteri **yazılı** olarak yayına izin verdi (e-posta yeter; kimliği gizli kalacak biçimde). Belge sizde kalır, siteye girmez.
- [ ] Tanımlayıcı ayrıntı yok: ad, şehir, mahalle, benzersiz sistem adı, ihale ya da tarih kırıntısı. Sektör ve bölge düzeyi ("Avrupa'da özel bir gayrimenkul grubu") yeterlidir.
- [ ] Her rakam ölçülmüş ve **nasıl ölçüldüğü** söylenebiliyor (ne, hangi süre, hangi araç, kim ölçtü).

Her vaka için bana şunu verin:

| Alan | Örnek | Not |
|---|---|---|
| Sektör ve bölge (maskeli) | "Küresel lojistik grubu, Avrupa" | Kilitli sektör kümesi dışındaki sektör (ör. özel varlık yönetimi) için önce [ADR 0019](adr/0019-enterprise-tier.md) kararı güncellenir |
| Sorun | Bir cümle | Müşterinin ağzından değil, mimari dille |
| Ne kurdunuz | 3–5 madde | Hangi sistemler, hangi entegrasyon, hangi güvenlik katmanı |
| Sonuç | **Ölçülmüş** rakam + yöntem + tarih | "Olay kaybı 0" gibi bir sonuç ancak ölçülmüşse ve ölçüm süresi söylenirse yazılır |
| Sizin sözünüz | NDA kapsamı | "Müşteri adı NDA gereği paylaşılmaz" cümlesi |
| Yazılı izin | Evet / Hayır | Hayır ise yayınlanmaz |

Sitedeki mevcut dört vaka (`/showcase/<slug>`) **stüdyo örneğidir** ve öyle etiketlidir; gerçek vakalar eklendiğinde yanlarına, "Müşteri çalışması (maskeli)" etiketiyle ayrı bir katman olarak konur. Örnekler gerçek vaka gibi sunulmaz.

## 2. Uyum ve sertifika ifadeleri

| İfade | Yayınlanması için gereken | Yoksa ne yazılır |
|---|---|---|
| **SOC 2 Type II** | Bağımsız denetçinin raporu (stüdyo adına). "Hazır" demek için de denetçinin hazırlık değerlendirmesi | Hiçbir şey. (Doğrulanabilir olanlar zaten yazılı: çerez yok, analitik yok, uygulanan CSP, HMAC-SHA256 ve AES-256-GCM) |
| **ISO 27001** | Belgelendirme kuruluşunun sertifikası | Hiçbir şey |
| **GDPR / KVKK "uyumlu"** | Avukat onaylı gizlilik metni, işleyici listesi (n8n, Google, Cloudflare), veri saklama süresi, başvuru hakları yolu | Hiçbir şey; gizlilik sayfası yer tutuculu ve `noindex`. Avukat metni gelince doldurulur |
| Ortaklık rozeti (Salesforce, SAP, AWS...) | Ortaklık sözleşmesi ve markanın rozet kullanım izni | Hiçbir şey; entegrasyon örnekleri "örnek eşleyici" olarak etiketli |

## 3. SLA ve kapasite

Bunlar **sözleşme şartıdır**, site cümlesi değil. Teklif edecekseniz bana şunu söyleyin; "hedef, sözleşmede tanımlanır" çerçevesiyle yazarım:

- [ ] Hangi hizmet için (müşterinin üretim sistemi; stüdyonun kendi sitesi **değil**).
- [ ] Hedef ve ölçüm yöntemi (ör. "aylık erişilebilirlik hedefi", hangi izleme aracı, kim ölçer).
- [ ] Olay müdahalesi: kim, hangi saatlerde, hangi kanaldan; 7/24 mi, mesai saati mi.
- [ ] İhlalde ne olur (kredi, fesih, yok).

Bunlardan biri belirsizse yazılmaz: "%99,99" ve "15 dakika" gibi sayılar nöbet düzeni olmadan sahte bir taahhüttür.

## 4. Ekip

"Kıdemli mimarlar kolektifi" anlatısı için gerçek olan şunları verin: kaç kişi, rolleri, yıllar, **herkese açık** olabilecek geçmiş. Sitede şu an kişi, sayı ya da kıdem iddiası yoktur; manifesto bilerek yalnızca çalışma ilkelerini anlatır.
