# ADR 0028: Çizim 01 (başvuru yolu), "briefing metnini kopyala" düğmesi; uydurma vaka yok

- **Durum:** Uygulandı, 18.10.2026.
- **Tetikleyen istek:** sahibin yapıştırdığı dört maddelik "Enterprise / CTO seviyesi" metni (başka bir sohbetten): anonim kurumsal vaka analizleri, "Copy Encrypted Briefing Text" düğmesi, CAD/SVG altyapı şeması, sürekli erişilebilir "Start a Briefing" düğmesi.
- **Karar:** dört maddenin **ikisi yapıldı, biri zaten vardı (testle kanıtlandı), biri yapılmadı**. Ölçüt [ADR 0025](0025-honest-trust-signals.md) ile aynı: sitede yalnızca doğrulanabilir olan durur.

## 1. Madde madde

| İstenen | Yapılan | Neden |
|---|---|---|
| **1. İki anonim kurumsal vaka analizi** (İsviçre portföy yönetimi / SAP + otomasyon hattı "14 ms kare bütçesi"; küresel lüks perakende / sıfır güven + olay güdümlü API hattı) | **Yapılmadı.** Alıcı: `docs/case-study-intake.md` (sahibin gerçek, yazılı izinli vakayı dolduracağı şablon) | Sahibin kendi sözü (17.10.2026): henüz gerçek vaka yok. Var olmayan müşterilerin mimari dökümünü yazmak, "anonim" etiketi taşısa da, yok olan bir iş için **sahte referans** olur; "14 ms" gibi bir sayı da ölçülmemiş bir müşteri sonucudur. Bu istek 17.10.2026'da da geldi ve aynı gerekçeyle reddedildi. Mimari derinliğin kanıtı olarak sitede zaten var: üç etkileşimli simülatör (Mimari), 28 inceleme sayfası ("müşteri işi değildir" notuyla), `docs/architecture/` ve ölçülü kare süresi (`lib/metrics.ts`). Yenisi: **Çizim 01**, aşağıda |
| **2. "Copy Encrypted Briefing Text" düğmesi** | **Yapıldı, adı dürüst:** "Briefing metnini kopyala" (7 dilde) | Panoya giden metin **düz metindir**; şifrelenmez. "Encrypted" demek, olmayan bir güvenlik özelliğini ilan etmek olurdu (denetim bu adı yasaklar). Düğme, e-posta taslağının açılamadığı ziyaretçiler içindir (kurumsal tarayıcı, web posta) |
| **3. Monokrom CAD/SVG altyapı şeması, "Draw before you build" bölümünde** | **Yapıldı: "Çizim 01"**, Studio'da manifestonun (1. kural: *Draw before you build*) altında | Şema **bu sitenin kendi başvuru formunun gerçek yolunu** çizer: her kutu depodaki koddur. Uydurma bir müşteri sistemi çizmek yerine, söylenen ilkenin kendisine uygulanması |
| **4. Kaydırdıkça erişilebilir kalan "Start a Briefing"** | **Zaten vardı**; **test eklendi** | Üst çubuk `position: fixed` ve "Start a briefing" düğmesini taşır; telefonlarda başparmak bölgesinde yapışkan çubuk (`StickyCta`) var, hero düğmesi ya da form ekrandayken bilerek gizlenir. Yeni bir öğe eklemek aynı eylemi çoğaltırdı. Eksik olan şey **kanıttı**: `qa:browser --only=cta` artık sayfanın %15/%40/%70'inde düğmenin ekranda, tıklanabilir olduğunu ve tek tıkla `#briefing`'e indiğini sınar |

## 2. Çizim 01

- **Nerede:** `components/sections/BriefingDrawing.tsx` (sunucu bileşeni, JavaScript yok), `Studio.tsx` içinde manifesto ile "Bu sayfada denetlenebilir" şeridi arasında; stil `app/globals.css` `.drawing` / `.dwg*`.
- **Ne çizer:** tarayıcı (4 adımlı form, Turnstile belirteci) → **tek rota `/api/briefing`**: kaynak denetimi ve hız sınırı → şema doğrulama (zod, honeypot, doldurma süresi) → bot denetimi (Turnstile siteverify, gizli anahtar yalnızca sunucuda) → temizleme (yalnızca düz metin) ve öncelik sınıfı → teslim (imzalı webhook ya da TLS üzerinden SMTP; iki deneme, 9,5 sn altında, aynı kimlik) → stüdyo posta kutusu. **Kapalı düşme** yolu kesikli çizgiyle: 403 · 429 · 503, ardından ziyaretçiye e-posta taslağı. Köşede künye bloğu ("SOURCE app/api/briefing/route.ts").
- **Estetik:** monokrom, sayfanın belirteçlerinde (obsidiyen/platin, saf siyah-beyaz yok), ızgara zemin, boyut çizgileri, ince çizgi kutular. İki yerleşim: 1024 px ve üstü yatay (yedi kutu), altı dikey (sütun). Notlar mühendislik çizelgelerindeki gibi **İngilizce teknik adlardır** (HMAC-SHA256 gibi); başlık, açıklama (erişilebilirlik için `aria-label`, uzun) ve açıklama satırı **yedi dilde çevrilmiştir** ve çizimin dışında HTML'dedir. Çizim her sayfa yönünde soldan sağa okunur (`direction: ltr`; Arapçada denendi).
- **Rakamlar koddan:** "5 req / 10 min" `app/api/briefing/route.ts` `STRICT_LIMIT` ile, "2 attempts, < 9.5 s" `lib/server/deliver.ts` `BUDGET_MS` ile aynıdır; **denetim (G4) ikisini kodla karşılaştırır**, biri değişirse düşer. Çizimdeki hiçbir iddia (SOC 2, SLA, çalışma süresi) yeni bir beyan değildir.

## 3. Kopyalama düğmesi

- **Nerede:** e-posta taslağı bildiriminin ve "form şu an kullanılamıyor" bildiriminin altında (`Briefing.tsx`), yani `mailto:` açılamayabilecek iki yerde.
- **Ne kopyalar:** `To: contact@syncflow.agency`, `Subject: …`, boş satır, sonra yanıtlar (taslakla aynı gövde); her posta istemcisine ya da web postaya olduğu gibi yapıştırılır.
- **Geri bildirim:** "Kopyalandı. contact@syncflow.agency adresine yazacağınız e-postaya yapıştırın." (`role="status"` bölgesinde, ekran okuyucuya duyurulur).
- **Tarayıcı reddederse:** önce eski seçerek kopyalama komutu denenir; o da olmazsa metin **salt okunur bir alanda, seçmeye hazır** gösterilir ve yanlış "kopyalandı" notu kalkar. Hiçbir koşulda boş bir başarı gösterilmez.
- **Gizlilik:** metin tarayıcıdan dışarı gönderilmez, sunucuya uğramaz, hiçbir yerde saklanmaz; ziyaretçi onu kendisi yapıştırır.

## 4. Doğrulama

- `npm run check`, denetim `--build`: 225 geçti, 0 hata (6 yeni G4 denetimi: iki rakamın koddan doğrulanması, çizimin Studio'da ve JavaScript'siz olması, kopyalama yolları, düğme adının dürüstlüğü), smoke 188/188 (yedi dilde çizimin başlığı, açıklaması ve notları), `qa:browser --only=briefing,drawing,cta,anchors,cls`: **43/43** (kopyalamanın panoya verdiği metin ve reddedilme yolu; iki yerleşimde metnin kutudan taşmaması ve ≥ 9,5 px okunurluk; yapışkan düğme; bağlantılar ve yer tutucular), axe 0 ihlal, `qa:csp` 0 ihlal ve 0 konsol hatası.
- **Bulunan tasarım sözleşmesi ihlali (kayda geçsin):** ızgara zemini önce saf beyazla (`rgb(255 255 255 / …)`) yazılmıştı; denetim yakaladı, platin (#E2E2E6) tonuna çevrildi.
- **Yer tutucular yeniden ölçüldü:** Studio `--cv`: telefon 5310 → 6481, tablet 4190 → 5556, masaüstü 3260 → 3974 px (yanlış tahmin, bölüm ilk çizildiğinde görünen kayma demektir; CLS 0).

## 5. Sınırlar

- Çizimin notları İngilizcedir (bilerek); çevrilen kısım başlık, açıklama ve açıklama satırıdır. Bir ana dil konuşuru bu yeni metinleri okumadı.
- Panoya kopyalama davranışının kendisi tarayıcınındır: testte `navigator.clipboard.writeText` bir kaydedici ile değiştirilir (başsız bir sayfa odağa sahip değildir); gerçek panoya yazma gerçek bir tarayıcıda elle denenmedi.
- Gerçek bir vaka gelirse sahibin yazılı izniyle `docs/case-study-intake.md`'ye göre eklenir; o zaman "Architectural Case Studies" başlığı gerçek içerikle açılır.
