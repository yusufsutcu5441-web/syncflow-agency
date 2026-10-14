# ADR 0018: Yedi sermaye merkezi: yedi dil, yedi pazar

- **Durum:** Kabul edildi ve uygulandı, 14.10.2026 (dal `feat/seven-markets`).
- **Karar:** proje sahibi, 14.10.2026. İstek: "Sitede tam 7 dil ve pazar entegrasyonu olacaktı (EN, TR, AR, DE, FR, ES, ZH). Giriş kapısını (EntryGate) ve dil/pazar seçiciyi bu 7 küresel sermaye merkezi ile baştan inşa et"; her pazarın dili lüks mimari ve sermaye terminolojisine uygun eksiksiz yazılacak, para birimleri ve briefing akışı buna göre bağlanacak; "hemen uygula ve test et". Sahibin iki soruya yanıtı: yayın için **"Hepsini kur ve şimdi canlıya al"** (önerilen "önizlemede kur, canlı liste EN+TR kalsın" seçilmedi) ve Çince için **"Basitleştirilmiş Çince, Japonca uykuda"**.
- **Yerine geçtiği:** [ADR 0009](0009-niche-and-languages.md)'un dil kararı (08.10.2026: "Türkçe ve İngilizce odak, yedi dil iddiası yok") ve [ADR 0016](0016-qualification-and-markets.md)'nın "dört pazar, dil yalnızca EN ve TR" kısmı. [ADR 0002](0002-launch-locales-and-market.md)'nin "yeni dil açma kontrol listesi" (yerel konuşur çeviri + hukuk incelemesi) bu kez **uygulanmadı**: sahibi bu riski bilerek üstlendi (aşağıda "Riskler").
- **Tamamlar:** [ADR 0015](0015-entry-gate-and-hero.md) (giriş kapısı), [ADR 0016](0016-qualification-and-markets.md) (eşik ve para birimi).

## Bağlam

Kapı dört pazar sunuyordu (ABD, Avrupa, Orta Doğu, Türkiye) ve yalnızca İngilizce ile Türkçe yayındaydı; Arapça, Almanca, Fransızca, İspanyolca ve Japonca uykuda taslaktı. Sahibi, sitenin başından beri yedi dil ve yedi pazarla çalışacağını belirtti ve listeyi verdi: yedinci dil Japonca değil **Çince**. Depoda Çince yoktu (yedinci altyapı dili `ja` idi).

## Karar

### 1. Yedi merkez

| Kart | Dil (kartta kendi yazısıyla) | Pazar (`?m=`) | Bölge (kartta, sayfanın dilinde) | Para birimi | Asgari tutar | Yol |
|---|---|---|---|---|---|---|
| 01 | English | `us` | ABD ve küresel | USD | 25.000 | `/` |
| 02 | Türkçe | `tr` | Türkiye | TRY | 1.225.000 | `/tr` |
| 03 | العربية | `me` | Orta Doğu, Dubai | AED | 92.000 | `/ar` (sağdan sola) |
| 04 | Deutsch | `dach` | DACH ve İsviçre | EUR | 22.500 | `/de` |
| 05 | Français | `fr` | Monako ve Fransa | EUR | 22.500 | `/fr` |
| 06 | Español | `wealth` | Küresel servet | USD | 25.000 | `/es` |
| 07 | 中文 | `asia` | Asya merkezleri | USD | 25.000 | `/zh` (`zh-Hans`) |

Sıra ve numaralar sahibinin listesidir. Kapının başlığı her dilde o dilin sermaye terimiyle yazıldı: *capital center* (en), *sermaye merkezi* (tr), *المركز المالي* (ar), *Finanzplatz* (de), *place financière* (fr), *plaza financiera* (es), *资本中心* (zh).

### 2. Dil altyapısı

- `routing.locales = ['en','tr','ar','de','fr','es','zh','ja']`; sekiz dil, **yedisi yayında**. `zh`, Basitleştirilmiş Çince'dir: `<html lang="zh-Hans">`, hreflang `zh-Hans`, `og:locale` `zh_CN`, yol `/zh`. `ja` uykuda taslaktır (`NEXT_PUBLIC_PREVIEW_LOCALES=1` ile okunur).
- `i18n/launch.ts`: varsayılan yayın listesi `en,tr,ar,de,fr,es,zh` (`NEXT_PUBLIC_LAUNCHED_LOCALES`). hreflang, sitemap, JSON-LD, dil seçici, footer, 404 ve kapı kartları bu listeden türer.
- `LOCALE_LABELS.intl`: sayfanın sayı ve para biçimi (`en-US`, `tr-TR`, `ar-AE-u-nu-latn`, `de-DE`, `fr-FR`, `es-US`, `zh-CN`). Arapça Latin rakam kullanır; Halka sayaçları da Latin rakamla sayar (sunucu çıktısıyla aynı).

### 3. Pazar modeli (`lib/market.ts`)

- `MARKETS = ['us','tr','me','dach','fr','wealth','asia']`; `MARKET_DEFAULT_LOCALE` dil ile pazarı **bire bir** eşler (denetim sınar). Dil ile pazar yine ayrı kavramdır: ziyaretçi kapıdaki dil çipleriyle ya da üst bardaki seçiciyle her pazarı her yayındaki dilde okuyabilir (`/de?m=wealth` Almanca sayfa, dolar pazarı).
- Eski bağlantılar: `?m=int` → `us` (12.10.2026'dan), `?m=eu` → `dach` (13.10.2026'daki "Avrupa, İngilizce, EUR" pazarı Almanca bölge ile Fransa'ya bölündü). **API bu eski değerleri kabul etmez** (sıkı enum; smoke her ikisinin 422 aldığını sınar), tarayıcı bunları adresten eşler.
- `defaultMarket(locale)`: pazar seçilmemişse sayfanın dilinin pazarı (`en` `us`, `tr` `tr`, `ar` `me`, `de` `dach`, `fr` `fr`, `es` `wealth`, `zh` `asia`; `ja` `asia`). Başvuruya `market` etiketi eklenir (`docs/n8n-briefing.md`).

### 4. Para birimi (`lib/pricing.ts`)

Yedi pazar **dört para birimini** paylaşır; bir para biriminin **tek tabanı** vardır (denetim sınar): USD 25.000, EUR 22.500, AED 92.000, TRY 1.225.000 (kur ve tarih ADR 0016'daki gibi, sonraki gözden geçirme 12.01.2027). Tutarlar yalnızca `lib/pricing.ts`'ten, sayfanın dilinin sayı biçimiyle yazılır: `$25,000` (en, es, zh), `₺1.225.000` (tr), `22.500 €` (de), `22 500 €` (fr), `92,000 AED` (ar: dirhemin Arapça kısaltması nokta ile biter ve cümle sonunda çiftlenir, bu yüzden ISO kodu). Çeviri dosyalarında tutar yoktur (denetim sınar). **Fiyat listesi yine yayınlanmaz.**

### 5. Kapı (`components/gate/EntryGate.tsx`)

- Yedi kart, hepsi gerçek `<a href="/<dil>?m=<pazar>">` (JavaScript olmadan da çalışır). Kart: sıra numarası ve para birimi (üst satır), dilin kendi adı kendi yazısında ve yönünde (`lang`, `dir`), bölge sayfanın dilinde. Ziyaretçi kartı seçer, dil çipleri o pazarın dilini önceden seçer ve değiştirilebilir, "Giriş" geçirir. Yalnızca dili yayında olan pazarların kartı görünür (host bir dili kapatırsa kartı da gider).
- Düzen: 4 + 3 kart (telefonda 2 sütun). Amblem genişliği (`--gate-emblem`) ile metin sütunu (`--gate-col`) bağlıdır; metin platin amblemin altına girmez (platin üstüne platin görünmez; ilk denemede başlık ve ilk iki satır amblemin altında kalıyordu, tarayıcı görüntüsünden yakalandı). Kapı yukarıdan kayar (yedi kart telefon ekranından uzundur; önceki `justify-content: flex-end` taşan içeriğin üstünü erişilmez bırakırdı): gövde otomatik kenar boşluğuyla alta yaslanır. Telefonda amblem her boyutta arkada hayalettir (%11).
- Çerez, `localStorage` ve `sessionStorage` yok; seçim adreste (ADR 0015).

### 6. Yazı tipi ve tipografi

- Arapça, Çince ve Japonca **sistem yazı tipi yığınlarıyla** kurulur (`app/globals.css`): Çince için PingFang SC / Hiragino Sans GB / Microsoft YaHei / Noto Sans SC. Bir CJK web yazı tipi, alt küme olsa bile megabaytlardır ve sayfa bütçesine sığmaz; bu üç dilde Latin web yazı tipleri önyüklenmez. Özel Arapça OFL yığını açık bir karardır.
- Çince ve Japonca boşluksuz yazılır: maske girişinin kelime bölmesi (`components/ui/MaskText.tsx`) bu dillerde `Intl.Segmenter` kullanır; kapanış noktalaması satır başına, açılış noktalaması satır sonuna düşmez. (Bölme olmasaydı bir Çince cümle tek bir bölünmez kutu olur, satıra sığmazdı.)
- `check-fonts.py`: `zh` sistem yazı tipli diller arasına girdi; kapıdaki bölge adları ve düğmeler yeni anahtarlarla sınanır.
- Paylaşım kartı (`/og`): Arapça, Çince ve Japonca kartları İngilizce çizilir (kart yazı tipinde bu glifler yok, kutu basardı); sayfanın `og:title` ve `og:description`'ı kendi dilindedir.

### 7. Metinler

`ar`, `de`, `fr`, `es`, `zh` dosyaları baştan yazıldı: yedi yayın dilinde **263 anahtar** (hukuki sayfalar dahil), her dilde aynı tonda ("adı işin kendisi olan" yöneticiler: *Persönlichkeiten, deren Name das Unternehmen ist*, *dirigeants dont le nom est l’entreprise*, *directivos cuyo nombre es el negocio*, *من اسمُهم هو العمل ذاته*, *以姓名立业者*). "Strategic Briefing" yerel karşılığıyla: *Strategisches Briefing*, *Briefing stratégique*, *Briefing Estratégico*, *الإحاطة الاستراتيجية*, *战略简报*. Fransızcada ince dolgusuz boşluk kuralları (`;` `?` `!` `:` öncesi bölünmez boşluk, « » içi) uygulandı. `check-messages.mjs`: yalnızca `ja` taslaktır; yedi yayın dili her anahtarı taşımak zorundadır.

### 8. Hukuki sayfalar

Gizlilik ve künye yedi dilde de çevrildi (aynı yer tutucular, aynı "Taslak" uyarısı); `ja` için İngilizce metin gösterilir ve işaretlenir. **İçerik avukat onayı olmadan hukuki metin değildir**: yedi dilde de yer tutuculu taslak.

### 9. Denetim ve duman testi

- `faz2-denetim.mjs`: yayın dilleri ve uykudaki `ja`, yedi pazar ve bire bir dil eşlemesi, dört para birimi ve her birinin tek tabanı, eski `int`/`eu` eşlemesi; hukuki metinlerde yasak iddia taraması yedi dile genişledi ("Garantien/Garanties" aktarım güvencesi için yanlış alarm veriyordu, kelime sınırıyla düzeltildi).
- `scripts/smoke.mjs`: yedi kartlı kapı ve bağlantıları, her dilin kapısı ve briefing'in kendi sayı biçimiyle asgari tutarı (`22.500 €`, `22 500 €`, `92,000 AED`, ...), `/ar` sağdan sola, `/zh` `zh-Hans`, `/de?m=wealth` bağımsızlığı, yedi dilin gizlilik sayfası, yedi `market` değeri, `locale` yedi dilde kabul.

## Doğrulama (14.10.2026)

`check:messages`, `check:fonts`, `tsc`, ESLint, `audit-secrets`, `brand:check` temiz; `node faz2-denetim.mjs --build` **152 geçti, 0 hata**; `npm run smoke` üretim derlemesinde **189/189**; Chrome 154'te (başsız, 1440×900 ve 390×844) kapı akışı **17/17**: DACH kartı → `/de?m=dach` ve euro basamakları, Asya kartı → `/zh?m=asia` ve dolar basamakları, Orta Doğu kartı + İngilizce çip → `/?m=me` ve `AED 92,000`, yedi dil çipi, Esc, üst bar seçicisinde yedi dil ve İspanyolca'ya geçişte `?m=` korunumu; konsol ve sayfa hatası yok; yatay taşma yok; `/ar`, `/zh`, `/fr`, `/de` ve kapının ekran görüntüleri gözle incelendi.

## Riskler ve AÇIK konular (dürüst kayıt)

- **Çeviriler araç yazımıdır; yerel konuşur gözden geçirmedi.** Ton, terim ve hukuk ifadeleri (özellikle Almanca *Impressum* ve Fransızca *mentions légales* yükümlülükleri, Arapça ve Çince resmî dil) bir yerel editörden geçmelidir. Sahibi yayını bu riskle onayladı.
- **Hukuki sayfalar yedi dilde yer tutuculu taslak.** Ülke rejimleri farklıdır (GDPR, İsviçre FADP, Fransa, BAE, Çin PIPL, KVKK); sağlık reklamı kuralları da (örn. Almanya HWG, Fransa hekim ve klinik reklamı) ülkeye göre değişir. Klinik vitrin metninin yedi dilde bu kurallara uygunluğu doğrulanmadı.
- **İsviçre EUR ile gösteriliyor** (sahibin listesi böyle), oysa para birimi frangıdır: Frank ayrı bir para birimi ve taban olurdu. **"AED / $" olarak yazılan Orta Doğu'da yalnızca AED gösterilir.**
- **Çin anakarası:** `/zh` sayfasının ve briefing'in (Vercel, Cloudflare Turnstile, Google/Gmail, n8n) anakara Çin'den erişilip çalıştığı ve PIPL sınır ötesi aktarım yükümlülüğü **doğrulanmadı**; Turnstile yüklenemezse form son adımda "güvenlik kontrolü geçilemedi" der ve e-posta taslağı yedeği gösterilir.
- Gerçek GPU, Safari, Firefox ve ekran okuyucu (özellikle RTL) denenmedi; Arapça ve Çince sistem yazı tipleri Windows, macOS ve Android'de vardır, sade bir Linux'ta Noto yoksa eksik glif görülebilir.
- Lighthouse yedi dil için **yeniden ölçülmedi**; yayındaki metrik mührü (14.10.2026) yedi dilden önceki canlı ölçümdür.
- `NEXT_PUBLIC_LAUNCHED_LOCALES` host panelinde `en,tr` olarak kalmışsa yeni diller yayına çıkmaz (404); [docs/vercel-next-site.md](../vercel-next-site.md).

## Geri alma

Host'ta `NEXT_PUBLIC_LAUNCHED_LOCALES=en,tr` yapıp yeniden derlemek siteyi önceki hâline döndürür (kapı yalnızca dili açık pazarların kartını gösterir, kapalı dillerin yolları 404 verir). Bu yol bir üretim derlemesiyle sınandı (14.10.2026): `NEXT_PUBLIC_LAUNCHED_LOCALES=en,tr npm run build` ve `npm start` → kapıda yalnızca `us` ve `tr` kartı ve iki dil çipi, `/de`, `/ar`, `/zh`, `/fr`, `/es` ve `/ar?m=me` 404, sitemap 2 adres, hreflang `en`, `tr`, `x-default`, `/tr` 200.
