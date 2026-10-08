# 2B-2 doğrulaması: niş ve dil

- **Tarih:** 08.10.2026
- **Ölçülen kod:** `faz_2b2` dalı ([ADR 0009](../adr/0009-niche-and-languages.md)): kilitli üç sektör (emlak, klinik, kurumsal hukuk), SaaS ve "Küresel erişim" bölümü yok, TR/EN odak, yeni Kurumsal Hukuk sahnesi. Üretim derlemesi (`NEXT_PUBLIC_SITE_URL=http://localhost:3100 npm run build`, `next start -p 3100`), geliştirme sunucusu `:3000`.
- **Bu pakette hiçbir performans ölçümü yapılmadı** (sahibinin talimatı: Lighthouse, A/B ve uzun günlük analizi çalıştırma). Aşağıdakiler işlev ve kapı testleridir.

## Sonuçlar

| Denetim | Sonuç |
|---|---|
| `npm run build` | çıkış 0 (tip denetimi dahil) |
| `node faz2-denetim.mjs --build` | **0 hata**, 100 geçti, 1 uyarı (`generateStaticParams` yok: nonce'lu CSP sayfaları zaten istek başına render ettiği için bilinçli, ADR 0001), 3 bilgi |
| `npm run lint`, `check:messages`, `check:fonts` | temiz; `check:messages`: 235 anahtar `en` ve `tr`'de eşit, uykudaki taslak diller 11 anahtar geride (İngilizceye düşer) |
| `npm run smoke` | **109/109** (üretim, `en,tr`, sahte webhook, Cloudflare test anahtarıyla gerçek `siteverify`); yeni: üç bölüm ve Reach yok, tam üç sektör ve SaaS yok, çok dilli iddia yok, klip listesi `law` |
| Tarayıcı testi 2B-2 (yeni, `puppeteer-core`; betik depoda yok) | **31/31** üretim ve geliştirme sunucusunda, aşağıya bakın |
| Tarayıcı testi 2B-1 (gerileme) | **32/32** (palet, yazı tipi, hap/etiket, logo, ikon, klip köşeleri; `law` klibinin dört köşesi obsidian) |
| Tarayıcı testi Faz 4 (gerileme) | **42/42**: 60 kontrolün Reach, küre, Arapça, yedi dilli dil seçici ve `/de /fr /es /ja` kontrolleri **ayıklandı** (18 kontrol, artık geçerli değil; yerine yeni testteki "404" ve "iki dil" kontrolleri var); geriye kalanı geçti: Lenis, spotlight, manyetik düğme, Border Beam ve ekran dışı duraklatma, halkalar, video politikası, şerit, klavye ile briefing, telefon, azaltılmış hareket, JS kapalı, CSP |

### 2B-2 tarayıcı testinin kapsamı (EN ve TR'de ayrı ayrı)

Menüde üç bağlantı, Reach bölümü ve küre/dil hapı yok · hero şeridi üç **ölçülmüş** değer (performans, CLS, LCP `0.7 s`/`0,7 s`), dil sayısı yok · vitrinde tam `show-estate, show-clinic, show-law` · üçüncü kartın etiketi kurumsal hukuk · şerit sonunda "önceki" açık, "sonraki" kapalı · hukuk videosu imleç altında oynar (`law.*`) ve imleç ayrılınca durur · footer dil sütununda yalnızca English ve Türkçe, vitrin sütunu üç sektör · dil menüsünde iki dil, "taslak" etiketi yok · sayfa metninde SaaS, yedi dil, "küresel erişim" yok · JSON-LD'de `inLanguage` `["en","tr"]` ve `areaServed` yok · konsol hatası yok. Ayrıca **hem üretim hem geliştirme sunucusunda** `/de /fr /es /ar /ja` 404; sitemap yalnızca iki dil; geliştirme sunucusunda tam briefing akışı, 1. ekranda dört seçenek (SaaS yok) ve `POST`'ta `projectType: "law"`.

### Kanıtlanan korumalar

Denetim, **bilerek bozulmuş bir kopyada** beş ihlali ayrı ayrı yakaladı: dördüncü vitrin kartı olarak SaaS, geri gelen `Reach.tsx`, İngilizce metinde "seven languages", geliştirmede yedi dili açan `OPEN_ALL`, JSON-LD'de `areaServed: "Worldwide"`.

### Gözle kontrol

Hero (üç ölçülmüş değer), üç bağlantılı menü, footer (Diller: English, Türkçe; Kurumsal hukuk), kurumsal hukuk kartı **EN ve TR'de** (afiş, kapak metni, etiket, Türkçe karakterler ş ı ü ğ) ekran görüntüsüyle incelendi.

## Çıkan bulgular ve düzeltmeler

1. **Eski bir test sunucusu yanlış alarm verdi.** Denetimin `--build` adımı çalışan 3100 sunucusunun altındaki `.next` klasörünü yeniden üretince sunucu eski parçaları sunamadı ve 60 kontrolün 10'u (Lenis, spotlight, halkalar...) düştü; sunucu taze derlemeyle yeniden başlatılınca bunların hepsi geçti. Kod hatası değildi; ama bir ölçümün "çalışan sunucunun altından derleme yapılmadığını" varsaydığının hatırlatması: ölçüm ve testler her zaman derlemeden sonra yeniden başlatılmış sunucuda yapılmalı.
2. **İlk 2B-2 testinde briefing denemesi bir kez düştü:** geliştirme sunucusu rotayı ilk istekte derlerken yanıt 2,5 sn'yi aştı. Test sabit beklemek yerine görünümü 12 sn'ye kadar bekliyor (ürün kodu değişmedi); ardından 31/31.

## Ölçülemeyenler ve açık olanlar (dürüstçe)

1. **Performans ölçülmedi.** Hero şeridindeki masaüstü değerleri (100, 0,00, 0,7 s) ve Mimari kartındaki sayılar **2B-1 sürümünün** ölçümüdür ([faz2b1.md](faz2b1.md)); bu paket sayfayı kısalttı (Reach kalktı) ve bir klip yerine bir klip koydu, ama yeniden ölçülmedi. **Mobil performans hâlâ "ölçülecek"**; boş bir makinede `npm run perf` ile ölçülmeli.
2. **Hukuk kartı bir konsepttir** ve bir avukata gösterilmedi; gerçek bir hukuk müşterisi alınmadan önce gösterilmeli (ADR 0009 §1). Hukuki sayfalar sahibinin kararıyla yer tutuculu taslak (20 köşeli parantez, `check:messages --strict` kırmızı, bilinçli).
3. **Uykudaki taslak diller** (de fr es ar ja) yeni metinleri kapsamıyor (Kurumsal Hukuk, hero metriği, Footer "Diller"); İngilizceye düşerler ve kimse onlara bağlanmaz. Arapça sağdan sola yerleşim bu pakette yeniden test edilmedi (önizleme anahtarı gerekir, yayında yok).
4. **Yapılmadı:** 2B-3 (Briefing ve Güvenlik) ve 2B-4 (Hukuki Sayfalar); K4, K5, K6, K8, K9 yanıtsız ([ADR 0008](../adr/0008-2b-2-3-4-scope.md)).
5. Tipik sınırlar: tek makine, yerel sunucu, headless Chrome; Safari, Firefox, gerçek telefon ve ekran okuyucu ile elle deneme yok.
