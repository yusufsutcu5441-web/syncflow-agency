# ADR 0009: 2B-2 Niş ve Dil: üç kilitli sektör, Türkçe ve İngilizce odak, yedi dil iddiası yok

- **Durum:** Kabul edildi ve uygulandı, 08.10.2026 (`faz_2b2` dalı). [ADR 0008](0008-2b-2-3-4-scope.md)'deki K1, K2 ve K7'ye sahibinin yanıtı. [ADR 0006](0006-blueprint-adopted.md)'nın vitrin kararını (Gayrimenkul, Klinik, SaaS) ve ana sayfadaki "Küresel erişim" bölümünü **yerine geçer**; 08.10'daki "yedi dil altyapısı aktif" kararının *kod* kısmı (altyapı, taslak çeviriler) korunur, *iddia* kısmı kalkar.
- **Karar:** proje sahibi: (K1) "SaaS kaldırılacak. Doğrudan özgün kuralımız olan 3 ana sektöre kilitleniyoruz: Özel Sağlık/Klinik, Lüks Gayrimenkul, Kurumsal Hukuk ve Danışmanlık." (K2) "Türkçe ve İngilizce odaklı gidiyoruz. Sitede yedi dil iddiası kalkacak." (K7) "Hukuki sayfalarda şimdilik standart taslak (yer tutucu) metinler kalsın, avukat onayı sonrasında gerçek bilgileri gireceğiz."

## Uygulama

| Karar | Ne değişti |
|---|---|
| K1 sektör kilidi | Vitrin tam üç kart: **emlak, klinik, kurumsal hukuk**. SaaS sahnesi (`remotion/scenes/Saas.tsx`) ve üç klip dosyası silindi; yeni bir **Kurumsal Hukuk sahnesi** (`remotion/scenes/Law.tsx`) çizildi ve render edildi: aydınlık bir kapıya uzanan karanlık sütunlu koridor, 8 sn'lik kesintisiz döngü, yalnızca palet renkleri, içinde yazı yok, "konsept render" etiketli (`law.mp4`, `law.webm`, `law.webp`; `saas.*` silindi). Briefing'in 1. ekranındaki "SaaS ürün sitesi" seçeneği **"Hukuk bürosu veya danışmanlık sitesi"** oldu (`projectType` değeri `saas` yerine `law`; n8n belgesi güncellendi). Footer'ın vitrin sütunu üç sektörü bağlıyor. Emlak kartındaki "doğrudan satış ekibinize düşen **nitelikli talepler**" ifadesi, sonuç vaadi olduğu için "talep akışı"na çevrildi. |
| K2 dil | Ana sayfadaki **"Küresel erişim" bölümü kalktı** (küre, yedi şehir, yedi dilli cümle, dil hapları: `Reach.tsx`, `ReachInteractive.tsx`, `lib/reach.ts`, ilgili CSS ve mesajlar silindi); menü dört yerine üç bağlantı. Hero şeridindeki "7 dil, tek standart" **ölçülmüş masaüstü LCP**'ye çevrildi (aynı `lib/metrics.ts` kaynağı). Footer'daki "Erişim" sütunu **"Diller"** oldu ve yalnızca yayındaki dilleri (English, Türkçe) listeler. JSON-LD'den `areaServed: "Worldwide"` çıktı (doğrulanmamış bir küresel iddiaydı). **Hiçbir ortamda yedi dil açılmaz:** geliştirme sunucusu da yalnızca `en,tr` gösterir; diğer beşi yalnızca `NEXT_PUBLIC_PREVIEW_LOCALES=1` ile okunabilir (çeviri incelemesi için). Varsayılan dil İngilizce (`/`) olarak kaldı (sahibi değiştirmedi). |
| K2, altyapı | `i18n/routing.ts` yedi dili ve `messages/{de,fr,es,ar,ja}.json` taslaklarını **uykuda** taşımaya devam ediyor: silinmedi, çünkü geri dönüşü ucuz ve emek harcandı. Taslaklar artık İngilizce'den **geride kalabilir** (eksik anahtar İngilizce'ye düşer, `check:messages` yalnızca sayar); sadece İngilizce kaynağı değişmemiş çeviriler tutuldu, silinen ya da yeniden yazılan metinlerin (29 anahtar) taslak çevirisi atıldı ki eski bir anlam kalmasın. |
| K7 hukuki sayfalar | **Dokunulmadı.** Gizlilik ve Künye yer tutucularla (20 köşeli parantez) ve "taslak" uyarısıyla duruyor; `check:messages --strict` bu yüzden hâlâ kırmızı olur (bilinçli). Avukat onayı ve gerçek bilgiler gelince 2B-4'te doldurulur. |

## Denetim kapıları (kalıcı)

`faz2-denetim.mjs` artık şunları **FAIL** sayar: vitrinde `estate, clinic, law` dışında kart; kodda, mesajlarda, sahnelerde ya da klip dosyalarında "SaaS"; EN/TR metinde yedi dil ya da küresel erişim ifadesi; `Reach` dosyalarının geri gelmesi; JSON-LD'de `areaServed`; `i18n/launch.ts`'nin geliştirmede yedi dili açması. Beşi bilerek bozulmuş bir kopyada ayrı ayrı yakalandı. Duman testi üç sektör, "Reach bölümü yok" ve "çok dilli iddia yok" kontrollerini içerir.

## Dikkat edilmesi gerekenler

1. **Hukuk kartı bir konsepttir.** Metin avukat reklam kurallarını (Avukatlık Kanunu m.55, TBB Reklam Yasağı Yönetmeliği) uygulamanın **müşterinin sorumluluğu** olduğunu söyler ve "uyumlu" demez; kartta müvekkil, sonuç, ücret ya da karşılaştırma yoktur. Yine de **gerçek bir hukuk müşterisi alınmadan önce bir avukata gösterilmelidir**; bu belge hukuki görüş değildir.
2. **Yedi dil iddiasının kalktığı yerler** yalnızca ana sayfa ve JSON-LD değildir: README ve CLAUDE.md'nin dil anlatımları da düzeltildi. Eski ADR'lerin (0002, 0005, 0006) gövdesi tarihsel kayıt olarak olduğu gibi duruyor; başlarına yönlendirme notu eklendi.
3. **K3 (taslak dilleri kim inceleyecek) geçersiz kaldı;** diller yayında olmadığı için gözden geçirme paketi hazırlanmadı. Bir dil yayına alınacağı gün yeniden gündeme gelir (ADR 0002 kontrol listesi).
4. **Hâlâ açık (yanıtlanmadı, uygulanmadı):** K4 teslimde `id` + yeniden deneme, K5 otomatik yanıt, K6 CSP enforce, K8 ek hukuki sayfalar, K9 n8n/Turnstile/WhatsApp bilgileri. Bunlar 2B-3 ve 2B-4'ün konusu.
5. **Ölçüm:** bu pakette Lighthouse ya da başka bir performans ölçümü **çalıştırılmadı** (sahibinin talimatı). Mobil performans hâlâ "ölçülecek"tir; masaüstü sayıları 2B-1 sürümününkidir (içerik ve görsel yapı bu pakette sayfayı kısalttı ama ölçüm yenilenmedi).

## Doğrulama

Ham sonuçlar [docs/perf/faz2b2.md](../perf/faz2b2.md)'de.
