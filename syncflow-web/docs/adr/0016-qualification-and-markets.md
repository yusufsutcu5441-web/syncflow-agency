# ADR 0016: Nitelik eşiği, dört pazar ve para birimi

- **Durum:** Kabul edildi ve uygulandı, 13.10.2026 (dal `feat/high-ticket-markets`).
- **Karar:** proje sahibi, 13.10.2026. İstek: pazarlık yapanları ilk adımda eleyen bir asgari bütçe eşiği, yalnızca yüksek sermayeli alıcıya hitap eden bir dil, ABD / Avrupa / Orta Doğu / Türkiye pazarları, para birimine ($, €, AED) ve pazara göre teklif yapısı. Sahibin dört yanıtı: (1) kilitli üçlü sektör kalır, dil yükselir; (2) eşikler **$25.000 ve güncel kur karşılıkları, çeyrekte bir gözden geçirmeyle**; (3) teklif yapısı = yerel para biriminde bütçe basamakları, sitede fiyat yayınlanmaz; (4) görsel taraf prosedürel sinema katmanının rafine edilmesi ([ADR 0017](0017-atmosphere.md)).
- **Yerine geçtiği:** CLAUDE.md'nin 07.10.2026 "Fiyat" kararı (yurt dışı taban $10.000, Türkiye ₺100.000–₺500.000+), Blueprint'in bütçe basamakları ($5k–$10k, $10k–$20k, $20k+, "önce konuşalım"), "düşük" öncelik sınıfı ve [ADR 0015](0015-entry-gate-and-hero.md) §2'nin iki pazarı (`tr`, `int`).
- **Tamamlar:** [ADR 0010](0010-briefing-delivery-and-security.md) (teslim sözleşmesi), [ADR 0015](0015-entry-gate-and-hero.md) (kapı ve pazar).
- **Güncelleme (14.10.2026, sahibin kararı):** formun ilk adımından **"asgari tutarın altı" seçeneği ve nazik ret paneli kaldırıldı**; yalnızca asgari tutar ve üstü üç basamak kaldı ("Daha düşük bütçe seçeneği bırakma"). Filtre artık sorunun kendisidir (soru asgari tutarı adıyla söyler) ve sunucunun `budget` reddidir. Bu belgenin aşağıdaki "altı seçilirse nazik ret" anlatımları **tarihsel kayıttır**. Aynı gün: vitrin etiketleri "Architectural Specimen" ve "Production Prototype" oldu, metin dili bir kez daha sadeleştirildi ([ADR 0017](0017-atmosphere.md) §5), canlı ölçüm mühürlendi ([docs/perf/live-2026-10-14.md](../perf/live-2026-10-14.md)).
- **Güncelleme (14.10.2026, [ADR 0018](0018-seven-capital-centres.md)):** dört pazar yedi pazara çıktı (`eu` ikiye bölündü: `dach` ve `fr`; `wealth` ve `asia` eklendi); dört para birimi ve her birinin tek tabanı değişmedi (USD 25.000, EUR 22.500, AED 92.000, TRY 1.225.000). Tutarlar sayfanın dilinin sayı biçimiyle yazılır; Arapçada ISO kodu.

## Bağlam

Briefing'in ilk sürümü dört adımdı: proje türü, yatırım aralığı, zamanlama, iletişim. Yatırım ikinci adımdaydı, $5k–$10k "düşük" sınıftı ama kabul ediliyordu ve "önce konuşalım" seçeneği bütçesini söylemeyenleri de içeri alıyordu. Hedef, stüdyonun zamanını yalnızca kapsamı uyan başvurulara ayırmak ve bunu ziyaretçiye saygıyla, ilk adımda söylemekti. Kısıtlar: sitede fiyat listesi yayınlanmaz; dil yalnızca EN ve TR; çerez ve depolama yok; "küresel erişim" ya da kanıtsız üstünlük iddiası yok; hukuki sayfalar yer tutuculu taslak.

## Karar

### 1. Asgari tutar ve pazar karşılıkları (`lib/pricing.ts`, tek kaynak)

Asgari proje bütçesi **USD 25.000**. Diğer pazarlarda **güncel kur karşılığı, yuvarlak adımla**:

| Pazar | Para birimi | Asgari tutar | Hesap (kaynak: open.er-api.com, USD tabanı, 12.10.2026 23:57 UTC) |
|---|---|---|---|
| ABD (`us`) | USD | 25.000 | tanım |
| Avrupa (`eu`) | EUR | 22.500 | 0,895156 → 22.378,9, en yakın 500 |
| Orta Doğu (`me`) | AED | 92.000 | 3,6725 (resmî sabit kur) → 91.812,5, en yakın 1.000 |
| Türkiye (`tr`) | TRY | 1.225.000 | 49,355625 → 1.233.890,6, en yakın 25.000 |

Kur ve tarih (`PRICING_AS_OF`) dosyadadır; **gözden geçirme üç ayda bir** (`PRICING_NEXT_REVIEW` = 12.01.2027), kur %5'ten fazla oynarsa daha erken. Gözden geçirme günü geçerse denetim uyarır. **Türkiye için bu, önceki ₺100.000–₺500.000+ kararının kasıtlı ve büyük bir değişikliğidir** (sahibin "güncel kur karşılığı" seçiminin sonucu); ₺1.225.000, eski aralığın üst sınırının 2,4 katıdır.

Basamaklar asgari tutarın katlarıdır: `t1` = 1×–2×, `t2` = 2×–4×, `t3` = 4× ve üstü (ABD'de $25.000–$50.000, $50.000–$100.000, $100.000 +). Tutarlar `Intl.NumberFormat` ile biçimlenir (`narrowSymbol`: $, €, ₺, AED); **çeviri dosyalarında sabit tutar yazılmaz** (denetim sınar).

### 2. Nitelik adımı: yatırım ilk soru

Briefing'in sırası: **(1) yatırım**, (2) proje türü, (3) zamanlama, (4) iletişim. İlk adımın sorusu asgari tutarı adıyla söyler ("Stüdyomuz {floor} ve üzerindeki projelerde çalışır. Sizinki nerede duruyor?") ve **yalnızca üç basamağı** sunar (asgari tutar ve üstü). *(Tarihsel, 14.10.2026'da kaldırıldı: ilk sürüm ayrıca bir "asgari tutarın altı" seçeneği ve altı seçilince çıkan nazik bir ret paneli sunuyordu, Devam'ı kilitliyordu ve hiçbir şey göndermiyordu.)* "Önce konuşalım" kalktı: bütçesini söylemeyen içeri girmez.

**Sunucu da reddeder:** `budget` yalnızca `t1`, `t2`, `t3`dür (`z.enum(BUDGETS)`). Eski kodlar (`b5`, `b10`, `b20`, `talk`), `under`, boş ve uydurma her değer 422 alır ve hiçbir zaman teslim edilmez (smoke bunu her biri için sınar). Taban altı için **bir kod yoktur**, bu yüzden bir betik formu atlasa bile içeri giremez; ama sunucu yalnızca kodun varlığını görür, tutarın doğruluğunu değil (kimse gerçek parayı doğrulayamaz).

### 3. Öncelik sınıfı

Her başvuru asgari tutarın üstünde olduğundan **"düşük" sınıf kalktı**: `t3` ya da `t2` ve karar veren ya da karar ekibi = `high`, geri kalanı `medium`. Gizlilik metninin 9. bölümü buna göre güncellendi (metin doğru kalmak zorundadır: otomatik karar yok). Ret paneli 14.10.2026'da kalktığı için onu anlatan cümle de çıkarıldı.

### 4. Dört pazar ve kapı

`lib/market.ts`: `us`, `eu`, `me`, `tr`. Kapı dört gerçek bağlantı sunar (`/?m=us`, `/?m=eu`, `/?m=me`, `/tr?m=tr`); her kartta para birimi ve varsayılan dil yazar (yapılandırmadan türetilir, çevrilecek metin yoktur). **Dil yalnızca EN ve TR:** ABD, Avrupa ve Orta Doğu İngilizce, Türkiye Türkçe okur; Arapça, Almanca ve diğerleri uykuda taslaktır ve **bu karar onları açmaz**. Eski `?m=int` bağlantıları (12.10.2026'da yayındaydı) geçerli kalır ve dolar pazarına eşlenir; API'de `int` yoktur.

Briefing pazarı `useSyncExternalStore` ile okur: sunucu çıktısı dilin varsayılan pazarıdır (Türkçe sayfa Türkiye, diğeri ABD), böylece HTML ile ilk istemci çizimi aynıdır; ziyaretçinin gerçek pazarı (adres, sonra kapının bellek içi hatırası) hidrasyondan hemen sonra yerine geçer. Kapı pazarı seçince `market:change` olayı yayılır. **Başvuruya giden `market`, bütçenin hangi pazarın para biriminde yanıtlandığıdır** (artık her zaman gelir; API'de isteğe bağlıdır), çünkü alıcı `t2`'yi ancak onunla okuyabilir ([docs/n8n-briefing.md](../n8n-briefing.md)).

**Pazarın etkisi bununla sınırlıdır:** para birimi, asgari tutar, önerilen dil, başvuru etiketi. Hukuki metin, vitrin ve sektör dili pazara göre değişmez.

### 5. Metin yükseltmesi (EN ve TR baştan)

Kilitli üçlü sektör (özel sağlık, lüks gayrimenkul, kurumsal hukuk ve danışmanlık) kalır; metin, sermaye sahibine ve kurumsal alıcıya hitap eder: "adı işini taşıyan sahipler, ortaklar ve yöneticiler", sessiz, kesin, ölçülü bir ton. Yatırım evleri ve danışmanlık yapıları hukuk ve danışmanlık kartında anılır, ve kart "mesleğinizi düzenleyen reklam ve iletişim kurallarını uygulamak sizin sorumluluğunuzdadır" der. **Yazılmayanlar:** "milyon dolarlık", "küresel", "dünya çapında", "en iyi", "ödüllü", "garanti" ve benzeri kanıtsız ya da üstünlük ifadeleri; sağlık metinlerinde fiyat, indirim, önce-sonra, hasta yorumu; "ajans / web tasarımcısı" dili. 24 saatlik geri dönüş sözü sahibin kararıyla korunur ve yalnızca gerçekse yayınlanmalıdır.

İngilizcesi değişen ya da kalkan anahtarların taslak çevirileri **silindi** (74 anahtar geride, İngilizceye düşer; proje kuralı). Briefing anahtarları anlamlı adlara taşındı (`budget`, `project`, `timing`, `contact`).

### 6. Gizlilik metni (taslak)

`Legal.p2` pazarı ve yatırım basamağını sayar, `p4` pazarın adreste durduğunu ve saklanmadığını söyler, `p9` öncelik sınıfını ("düşük" sınıf kalktı) anlatır (ret paneli kalkınca onunla ilgili cümle çıkarıldı). **Hepsi taslaktır ve avukat onayı bekler**; dört pazar için gizlilik rejimleri (GDPR, ABD eyalet yasaları, BAE) ve sağlık ile hukuk reklam kuralları ülkeye göre değişir ve **hukuki sayfalar hâlâ yer tutuculudur**.

### 7. Lira işareti

`₺` (U+20BA) Instrument Sans'ta yoktur; Türkçe briefing'in tutarları çalışma zamanında biçimlenir ve işareti sistem yazı tipi çizer (`check-fonts.py` bunu açık istisna olarak listeler). Metin ağırlığı ve boyutu aynıdır, işaretin kendisi sistemin tasarımıdır.

### 8. Kapı

Denetim bölüm 10: dört pazar ve fiyat satırları, ABD tabanı 25.000, kur tarihi ve gözden geçirme günü, bütçe kodları yalnızca `t1`-`t3` ve eski kodlar kaynakta yok, formun ilk adımı yatırım ve yalnızca üç seçenek (altı seçeneği yok), çeviride sabit tutar yok, pazar dilleri yalnızca EN ve TR, eski `?m=int` eşlemesi. Smoke 158/158: dört pazar bağlantısı, para birimleri, sunucu tarafı $ ve ₺ basamakları, eski bütçe metinlerinin yokluğu, yedi bütçe değerinin 422'si, `us/eu/me` etiketlerinin teslimi, `int`in 422'si.

## Doğrulama durumu (13.10.2026)

**Doğrulanan** (üretim derlemesi, yerel sunucu, başsız Chrome 154): `npm run check`, denetim 148 geçti 0 hata, build, smoke 158/158. Tarayıcıda: kapıda dört pazar ve kartlardaki "USD · English" vb.; Orta Doğu seçilince İngilizce çipi; Enter ile `/?m=me`; Orta Doğu'da AED basamakları ("AED 92,000 – AED 184,000", …, "Below AED 92,000"); taban altı seçilince nazik ret metni ve Devam kilidi (sonradan kaldırılan davranış); bir basamak seçip Devam ile "What are we building?"; Türkiye'de ₺ basamakları ("₺1.225.000 – ₺2.450.000", …, "₺1.225.000 altı"); konsol hatası yok.

**Doğrulanmayan:** ret panelinin görsel kontrolü (yalnızca metin ve durum sınandı); briefing'in telefonda görünümü; `narrowSymbol` biçiminin diğer tarayıcılarda (özellikle AED); gerçek n8n teslimi; avukat incelemesi. (Canlı alan adında dört pazar, ₺ ve $ basamakları ve bot baypası 14.10.2026'da HTTP düzeyinde doğrulandı; Lighthouse sonuçları [docs/perf/live-2026-10-14.md](../perf/live-2026-10-14.md).)

## Açık kalemler

1. **~~Ret için "kaynak"~~ (kalktı, 14.10.2026):** ret paneli kaldırıldığı için bu kalem de düştü. Asgari tutarın altındaki ziyaretçi için artık hiçbir şey sunulmaz; soru asgari tutarı söyler, altında kalan ya en düşük basamağı işaretler ya da formu bırakır. **Risk:** en düşük basamağı bütçesi yetmese de işaretleyen bir başvuru içeri girer; sunucu yalnızca kodu görür, parayı doğrulayamaz.
2. **Hukuk:** dört pazar için gizlilik ve sağlık/hukuk reklam çerçevesi; hukuki sayfalar yer tutuculu.
3. **Kur gözden geçirmesi** her üç ayda (12.01.2027); denetim gün geçince uyarır.
4. **Dil:** Orta Doğu için Arapça ve AB için yerel diller (Almanca vb.) açılmadı; yerel çeviri ve hukuk incelemesi gerekir.
5. **Türkiye eşiği** ($25.000 ≈ ₺1.225.000) eski kararın çok üstünde; satış tarafında beklenen etki bu ADR'nin kapsamı dışında.
