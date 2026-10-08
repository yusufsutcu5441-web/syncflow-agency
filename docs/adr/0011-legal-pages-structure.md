# ADR 0011: 2B-4 Hukuki Sayfalar: aydınlatma metninin yapısı, tarih ve rıza bağlantısı; içerik yer tutuculu taslak kalır

- **Durum:** Kabul edildi ve uygulandı, 08.10.2026 (`faz_2b4` dalı). [ADR 0008](0008-2b-2-3-4-scope.md)'deki 2B-4 taslağının **yapı** kısmıdır. Sahibi K7'yi yanıtladı: "Hukuki sayfalarda şimdilik standart taslak (yer tutucu) metinler kalsın, avukat onayı sonrasında gerçek bilgileri gireceğiz." K8 (öneri): kullanım şartları ve erişilebilirlik beyanı sayfaları **yok**.
- **Bu belge hukuki görüş değildir.** Bölüm başlıkları KVKK m.10 ve GDPR m.13'ün istediği bilgi kalemlerine göre düzenlendi; metnin yeterli olup olmadığına, hangi hukuki sebebin kullanılacağına, VERBİS/DPO/AB temsilcisi gerekip gerekmediğine, yurt dışı aktarım kurallarının (KVKK m.9, GDPR Bölüm V) güncel hâline göre yazılıp yazılmadığına **avukat** karar verir.

## Ne değişti

| Parça | Önce | Şimdi |
|---|---|---|
| Bölüm sırası | 7 bölüm: sorumlu, briefing, güvenlik ve kayıtlar, çerezler, işleyiciler, saklama, haklar | **9 bölüm**, bildirim sırasıyla: sorumlu (p1) → briefing: ne, neden, hangi hukuki sebep (p2) → **verinin nasıl toplandığı ve sağlamanın gerekli olup olmadığı (p8, yeni)** → **öncelik sınıfı, otomatik karar yok (p9, yeni)** → güvenlik ve kayıtlar (p3) → çerezler (p4) → işleyiciler ve aktarımlar (p5) → saklama (p6) → haklar ve nasıl kullanılacağı (p7). Anahtar adları korundu (hiçbir şey yeniden adlandırılmadı); sıra `LegalPage.tsx`'teki dizidendir. |
| p8, toplama ve zorunluluk | Yok | Veri doğrudan formdan ve otomatik teknik kayıt olarak toplanır; ad, şirket, e-posta, rol ve seçilen yanıtlar talebi yanıtlamak için gereklidir (olmadan yanıt verilemez), tek cümlelik açıklama isteğe bağlıdır. |
| p9, öncelik sınıfı | Yok | Sunucunun yatırım aralığı ve rolden atadığı iç öncelik sınıfı **yalnızca e-postanın konu satırına** yazılır; otomatik gönderme, ret ya da yanıt yoktur, hukuki sonuç doğuran makine kararı yoktur, her talebi bir kişi okur. Bu, kodun **bugünkü** davranışının dürüst tarifidir (bkz. dikkat 1). |
| p7, haklar | Hak listesi + e-posta | Genişletildi (işlenip işlenmediğini öğrenme ve kopya, düzeltme, silme, kısıtlama, taşınabilirlik, itiraz, rızayı her zaman geri çekme, denetim makamına şikâyet) ve **iki yer tutucu eklendi**: `[BAŞVURU KANALLARI, ör. KEP adresi]` ve `[DENETİM MAKAMI]`. Yer tutuculu bölüm sayısı EN ve TR'de 10'dan **11**'e çıktı. |
| Tarih | Yok | Her iki sayfada "Son düzenleme: 8 Ekim 2026" (`LEGAL_UPDATED`, `lib/site.ts`). Bu **taslağın düzenlenme tarihidir**, metnin geçerli ya da incelenmiş olduğu anlamına gelmez. |
| Rıza bağlantısı | Rıza kutusundaki "Aydınlatma metni" bağlantısı sayfanın başına giderdi | Her bölümün `id`'si var (`privacy-p1` …); bağlantı rızanın dayandığı bölüme gider: `/privacy#privacy-p2` (başlığın altına kaydırılmış olarak açılır). |
| Çerez notu | Vardı (p4) | Değişmedi: kendi çerezi yok, dil adresten gelir ve saklanmaz, analitik/reklam/izleme çerezi yok. |

## Değişmeyenler (sahibinin kararı)

- **Yer tutucular ve "Taslak" uyarısı duruyor** (`Legal.draft`, 22 köşeli parantezli alan: şirket unvanı, adres, teslim hizmeti, aktarım güvenceleri, saklama süresi, hukuki tür, telefon, sicil ve vergi no, sorumlu kişi, başvuru kanalları, denetim makamı). `npm run check:messages -- --strict` bu yüzden **kırmızıdır, bilinçli**. Denetim bunu bilgi olarak yazar ve uyarının kalkmasını **hata sayar**.
- Sayfalar `noindex`; sitemap'te yok. Yeni sayfa eklenmedi (kullanım şartları, erişilebilirlik beyanı).
- Taslak diller (de fr es ar ja) hukuki metinde İngilizceye düşer ve uyarı gösterir; yayında değiller.

## Kapılar (kalıcı)

`faz2-denetim.mjs`: dokuz bölümün sırası ve EN/TR'de eksiksizliği, bölüm `id`'leri ve "son düzenleme" tarihi, rıza bağlantısının `#privacy-p2`'ye gitmesi, hukuki metinde **"uyumludur", "compliant", "garanti"** gibi yeterlilik iddiası olmaması, taslak uyarısının durması (**kalkarsa hata**). Beş ihlal bozulmuş bir kopyada yakalandı. Duman testi ve tarayıcı testi sayfaları, tarihi, `id`'leri, sırayı ve bağlantının gerçekten o bölüme kaydırdığını doğrular.

## Dikkat edilmesi gerekenler

1. **p8 ve p9 işletme iddialarıdır ve doğru kalmak zorundadır.** "Her talebi bir kişi okur" sitenin "24 saat içinde kişisel dönüş" sözüyle aynı gerçeğe dayanır (README kontrol listesi: söz gerçek mi); "otomatik yanıt ya da ret yok" bugünkü koda dayanır (K5: otomatik yanıt yok). **Otomatik yanıt eklenirse ya da düşük sınıfa farklı davranılırsa p9 değişmelidir.**
2. **Hukuki sebep** (p2): talep üzerine adım atma, rıza ve meşru menfaat birlikte yazılı; hangisinin (hangileri) kullanılacağı avukatın kararıdır. Rıza kutusu **işaretsiz** ve zorunlu kalır.
3. Yer tutucuların gerçek karşılıkları gelmeden sayfa yayına hazır **değildir**; `Legal.draft` uyarısı avukat onayından sonra, sahibinin kararıyla kaldırılır.
4. Bu pakette Lighthouse ya da başka bir performans ölçümü **çalıştırılmadı**; mobil performans hâlâ "ölçülecek".
