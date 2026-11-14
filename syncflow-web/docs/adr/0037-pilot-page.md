# ADR 0037: `/pilot`: soğuk e-postanın teklifini anlatan sayfa; üç küçük teknik düzeltme

- **Durum:** 14.11.2026'da yerel `pilot-page` dalında uygulandı. **Yayınlanmadı, push edilmedi:** sahibin talimatı "yayınlamadan önce dur, ben kontrol edeceğim".
- **Tetikleyen istek:** sahibin 14.11.2026 brief'i. Gönderilen soğuk e-postalar "30 günlük outbound pilotu, peşin ödeme yok, 3 nitelikli konuşma çıkmazsa hiçbir ücret yok, çıkarsa 2.500 $ kurulum + 500 $/ay" teklifini satıyor; siteyi açan alıcı ise dijital mimari stüdyosunun sayfasını görüyor, teklifle ilgisi olmayan bir sayfa: güven kaybı. İstenen: teklifin kendi sayfası, ana sayfadan ve footer'dan link, mevcut içeriğin silinmemesi, **uydurma müşteri/vaka/logo/yorum yok**.
- **Karar:** `/pilot` adında ayrı bir sayfa (İngilizce `/pilot`, Türkçe `/tr/pilot`). Ana sayfa ve stüdyo içeriği silinmedi; ana sayfaya ve footer'a birer link eklendi.

## 1. Neden `/pilot` (ve neden `/outbound` değil)

`/outbound` ADR 0036'daki "autonomous outbound engines / architecture review" sayfasıdır ve canlıdır. Başka bir teklifi (yazılı inceleme) anlatır; pilot teklifini oraya koymak iki teklifi karıştırırdı. Yeni sayfa kendi yoludur. `/outbound` değişmedi ve ona ana sayfadan link verilmedi (02.11.2026 kararı hâlâ geçerli).

## 2. İçeriğin kaynağı ve sınırı

- **Kaynak:** outbound motorunun `pilot-no-brainer` ilk-mail metni (`syncflow-outbound/lib/template.ts`, 05.11.2026'da kilitlenen "Model B"). Sayfadaki cümleler o metnin cümleleridir ya da düz bir yeniden ifadesidir; ses aynı ("I", doğrudan, somut). Tek ek: `sales/CLOSING_DOCS.md`'deki "nitelikli konuşma" tanımının **köşeli parantezsiz** cümlesi ("Otomatik yanıtlar, abonelikten çıkmalar, 'ilgilenmiyorum' ve profil dışındaki kişiler sayılmaz").
- **Köşeli parantezli (sahibin henüz karar vermediği) şartlar sayfada YOK:** fesih bildirim süresi, itiraz süresi, saatin ne zaman başladığı, "kurucu müşteri" fiyatı, rapor teslimi. Sayfa "tek sayfalık şartlar" gönderileceğini söyler; bunlar orada yer alır.
- **Rakamlar tek yerde:** `PILOT_FACTS` (`lib/pilot.ts`): 30 gün, 3 konuşma, 2.500 $ bir defaya mahsus kurulum, 500 $/ay, aydan aya. Test (`tests/delivery/pilot.test.mjs`) sayfanın başka hiçbir tutar yazmadığını ve maildeki cümlelerin birebir bulunduğunu doğrular. Sayfa 2.500 ve 500'ü "$" ile yazar (mail yalnızca spam denetimi simge kabul etmediği için "USD" yazar).

## 3. Bu sayfa için bırakılan kural (sahibin açık kararı)

- **Fiyat:** ADR 0035 fiyatı varsayılan olarak kapalı tutar (`NEXT_PUBLIC_SHOW_PRICING`) ve CLAUDE.md "sitede fiyat listesi yayınlanmaz" der. Bu sayfa **bir fiyat listesi değil, tek bir teklifin şartıdır** ve sahibin brief'i fiyatı açıkça ister (aynı şart e-postada zaten yazılı). `SHOW_PRICING` bayrağı **değişmedi**: giriş kapısının yatırım basamakları ve briefing formu kapalı kalır. Tutarlar `messages/*.json`'da değil `lib/pilot.ts`'tedir (CLAUDE.md "çeviri dosyalarında sabit tutar yazılmaz" kuralı bu yüzden bozulmaz).
- **Metin `messages/*.json` dışında** (`/outbound` gibi): fiyatlı şartlar, kimsenin okumadığı beş dile makine çevirisiyle yayınlanmaz. Yalnızca İngilizce ve Türkçe, elle yazıldı. Diğer her dilde 404 (`allowed()` + `notFound()`).

## 4. Bırakılmayan kurallar

- **Uydurma kanıt yok.** Müşteri adı, logo, vaka çalışması, alıntı, "güvenen firmalar", sonuç, tamamlanmış pilot sayısı yok. Sayfa bunu açıkça söyler ("Where this stands": "henüz gösterebileceğim bir müşteri sonucu yok"). Brief'in önerdiği "ilk pilotlardayız" çerçevesi **kullanılmadı**: şu an çalışan bir pilot olduğunu doğrulayamıyorum, yazmak yanlış olabilirdi. Bir müşteri yazılı izinle adı geçmesine izin verirse sayfa güncellenir (`docs/case-study-intake.md`).
- **Garanti, "risksiz", "%100", ROI/gelir vaadi yok.** Mailin kendi cümlesi korunur: "Bu, ne zaman ödeyeceğinize dair bir sözdür, ne olacağına dair değil: kimsenin yanıt vereceğini söyleyemem." Test bu kelimeleri iki dilde yasaklar.
- Çağrı düğmesi `mailto:` (`lib/contact.ts` → `pilotHref`), konu tek kelime "pilot" (mailin istediği kelime), gövdede iki istem (şirket, site). Adres koda yazılı değil; ayarlı değilse düğme çizilmez, adres ayrıca düz metin olarak da yazılır.
- CSP: dış kaynak yok; `generateStaticParams` yok (derleme sırasında üretilen sayfa istek başına nonce taşıyamaz, ADR 0036 dersi).

## 5. Yapı

`app/[locale]/pilot/page.tsx` + `pilot.css` (`pilot-` öneki; çerçeve olarak `/outbound`'un `outbound.css`'ini kullanır: stüdyonun üst bar, footer, yapışkan CTA ve kamera katmanını yalnızca bu sayfa ekrandayken gizler). `lib/pilot.ts` (metin + olgular, bağımlılıksız), `lib/mailto.ts` + `lib/contact.ts` (mailto), `app/sitemap.ts` (açık pilot dili başına bir giriş + hreflang çifti), `components/sections/Hero.tsx` (kenar çizgili "Outbound pilot" bandı + link), `components/layout/Footer.tsx` ("Studio" sütununda link), `messages/en.json` ve `tr.json` (Hero.pilot*, Footer.pilot, Sim.security.outInsecure/outNoCrypto; taslak diller İngilizceye düşer), `scripts/smoke.mjs` ve `live-check.mjs` (sitemap sayısı, sayfa denetimleri), `scripts/delivery-verify.mjs` (yeni modül).

## 6. Üç teknik düzeltme (aynı brief)

1. **`00:00:00:00`:** Film bölümündeki bu, bir yer tutucu değil, kaydırma konumunu gösteren canlı bir okumaydı (`lib/enhance/film.ts`, 24 fps, 40 sn). Ama HTML'de sabit yazılıydı: betik çalıştırmayan her okuyucu (tarayıcı olmayan okuyucu, ilk kaydırmadan önceki ekran görüntüsü) onu yer tutucu sanıyordu. Artık HTML'de boş; film gerçekten oynarken (p > 0) betik doldurur, başta boş kalır.
2. **Boş linkler `[](...)`:** vitrin kartlarındaki `card-hit` örtüsü metinsiz bir `<a>` idi. Düz bir `<span>` oldu; tıklamayı `BreakdownHost` kartın tek görünür linkine (pill) yönlendirir. Erişilebilirlik ve davranış aynı; başka sayfada boş link yok (smoke denetler).
3. **"Web Crypto bu tarayıcı bağlamında kullanılamıyor":** `crypto.subtle` yalnızca güvenli bağlamda (https veya localhost) ve Web Crypto'yu uygulayan tarayıcıda vardır. İki ayrı mesaj: güvenli olmayan bağlantı (`window.isSecureContext === false`, ör. http:// ile LAN adresinden açılış) ve Web Crypto olmayan tarayıcı ya da uygulama içi görüntüleyici. Betikle yedek **yazılmadı:** kart, sayıların tarayıcının kendi Web Crypto'su ile hesaplandığını söylüyor; elle yazılmış bir yedek bu cümleyi yanlış yapardı. Eski mesaj yalnızca çalışma sırasında beklenmedik hata için kaldı.

## 7. Açık (sahibe)

- **Footer'da yasal kimlik/adres yok ve eklenmedi:** repoda doğrulanmış bir unvan, adres ya da sicil kaydı yok (`docs/legal-facts-intake.md`: 13 olgu bekliyor). Gerçek bir kayıt varsa sahibi verir; `/imprint` bu olgularla doldurulur, footer'a oradan link verilir.
- Sayfa yolu ve başlık metinleri ("Nothing to pay upfront. Paid only if it delivers conversations.") benim kararımdır; değiştirilebilir.
- Yayın: `main`'e birleştirme ve push sahibin onayına bağlı; sonrasında `npm run live` koşulur.
