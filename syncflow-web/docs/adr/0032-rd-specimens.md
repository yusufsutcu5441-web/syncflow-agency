# ADR 0032: Mimari Ar-Ge numuneleri: bu sitenin kendisi ve referans olay kuyruğu

- **Durum:** Uygulandı, 18.10.2026.
- **Tetikleyen istek:** sahibin dördüncü kez yinelediği istek: "vitrin taslaklarını iki yüksek teknik, anonim 'Architectural R&D Specimen'e çevir; syncflow.agency'nin kendi mühendisliğini bir ölçüt vaka olarak belgele (örnek: 'Specimen-01: Zero-Trust Web Crypto Pipeline, 100/100 Lighthouse, 14 ms kare bütçesi'); katı mimari kelime dağarcığı kullan; sonra tam `live-check` çalıştır, 226+ testin 0 hatayla geçtiğini, CLS'nin 0 kaldığını ve dil yönlendirmesinin (Arapça RTL dahil) kusursuz olduğunu doğrula".
- **Karar:** [ADR 0029](0029-share-preview-live-check-429-and-declines.md)'da önerilen **dürüst biçimde yapıldı**: iki numunenin ikisi de stüdyonun **kendi** mühendisliğidir, müşteri işi değildir. Numune 01 bu sitedir; numune 02 referans arıza-güvenli olay kuyruğudur ([docs/architecture/fail-safe-queue.md](../architecture/fail-safe-queue.md)). İstekten ayrıldığı yerler aşağıda ve nedenleriyle.

## 1. İstekten ayrılan noktalar

| İstenen | Yapılan | Neden |
|---|---|---|
| "Vitrin taslaklarını çevir" | Vitrin **olduğu gibi kaldı**; numuneler ayrı sayfalardır (`/specimens/<slug>`) ve Studio'da kartlarla bağlanır | Vitrin taslak değil: 4 sektör örneği × 7 dil = 28 yazılmış sayfa. Yenileri onların yerine değil, yanına eklendi |
| "Anonim" | **Müşteri yok:** sayfalar "müşteri işi değildir ve hiçbir müşteriyi anlatmaz" der | Anonimleştirilmiş müşteri vakası, var olmayan bir iş için sahte referans olurdu ([ADR 0025](0025-honest-trust-signals.md)). Konu stüdyonun kendi işidir: bu site ve referans kuyruk |
| "14 ms kare bütçesi" | **Yazılmadı.** Ölçülen kare aralığı medyan **16,7 ms**, p99 **16,9 ms**; sayfa bunu ve neyi göstermediğini söyler ("kare ritmi, kare işi değil": 60 Hz'de 16,7 ms tek karedir, düşen kare yoktur; her karenin kendi işinin süresi ölçülmedi) | Ölçülmemiş bir rakam yanlış bir iddiadır. **Denetim artık hiçbir dilde hiçbir metinde "14 ms" ifadesine izin vermez** |
| "100/100 Lighthouse" | Mühürlü değerler **koşullarıyla** gösterilir: masaüstü 100, mobil 100 = sakin makinedeki koşuların medyanı (profil satırı); "meşgul makinede aynı derleme daha düşük puan alır, yüklü koşu asla 100 diye yayınlanmaz" sınırlar bölümündedir | [ADR 0023](0023-framework-after-first-paint.md) ve `lib/metrics.ts` ile aynı dürüstlük kuralı |
| "Katı mimari kelime dağarcığı" | Yapıldı: kısıt ve tolerans, güven sınırı, kanıt katmanı A/B, değişmezler (invariant), ölü mektup kuyruğu (dead-letter), tekrar etkisiz (idempotent), devre kesici, zehirli olay, ödünleşimler | Bölümler: Kısıt ve tolerans · Mimari · Doğrulama · Ölçülen sonuç ve sınırlar |

## 2. Numuneler

| | Numune 01: bu site | Numune 02: referans olay kuyruğu |
|---|---|---|
| Başlık | Sıfır güvenli briefing hattı, ölçülen bir performans bütçesine bağlı | Arızaya dayanıklı olay kuyruğu: kalıcı kabul, sınırlı yeniden deneme, tekrar etkisiz sonuç |
| Kanıt katmanı | **A:** bu depoda uygulanır, testleriyle sınanır | **B:** referans uygulama, çalıştırılabilir sözleşme testleriyle doğrulanır |
| Rakamlar | `lib/metrics.ts`'den: Lighthouse 100 · 100, LCP, CLS, kare aralığı; tarih ve profil dipnotta | **Koddan hesaplanır:** `runScenario(SCENARIOS)` ile dokuz deterministik senaryo çalışır; kabul edilen olay, kaybolan, iki kez uygulanan, düşürülen tekrar, ölü mektup |
| Ödünleşimler | Laboratuvar verisi saha verisi değil; kare ritmi kare işi değil; sıkılığın bedeli | En az bir kez tekrar demek; sıra erişilebilirlikten ödün verir; depo bir bağımlılıktır |

- **Rakamlar metne yazılmaz:** yerinde `{median}`, `{p99}`, `{dead}` gibi yer tutucular vardır; yükleyici (`lib/server/specimen.ts`) değerleri `METRICS`'ten ya da simülasyondan basar. Sayfadaki 370 kabul edilen olay, 0 kayıp, 0 iki kez uygulanan, `docs/architecture/examples/scenarios.json`'daki (testlerin koda eşit tuttuğu dosya) toplamlarla aynıdır ve `smoke` bunu karşılaştırır.
- **Altyapı yeniden kullanıldı:** sayfa, mevcut inceleme sayfası bileşeniyle ([BreakdownView](../../components/sections/BreakdownView.tsx), dört bölüm, karolar, dipnot) ve aynı yapısal veriyle çizilir; yalnızca bölüm adları konuya uyarlandı ("ROI" yerine "Ödünleşimler ve sınırlar"). Sitenin sektör kilidi (estate, clinic, law, logistics) ve `/api/breakdown` dokunulmadı.
- **Eklenenler:** `lib/specimens.ts`, `lib/server/specimen.ts`, `app/[locale]/specimens/[slug]/page.tsx` (canonical, hreflang, indekslenebilir, Open Graph), site haritası 35 → **49** adres, Studio'da `#specimens` kartları (`.spec-card`), `Specimen` mesaj alanı (yedi dil, ≈ 100 anahtar).

## 3. Doğrulama

- Denetim (G4, 4 yeni kontrol): rakamlar `METRICS` ve `runScenario(SCENARIOS)`'ten gelir, yükleyicide yazılı kare süresi yoktur; sayfalar site haritasında, canonical ve hreflang'lı; hiçbir dilde "14 ms" yok; numune metinlerinde sertifika/SLA/müşteri sonucu iddiası yok. **227 geçti, 0 hata.**
- `smoke` **193/193** (yedi dilde 14 sayfa: 200, tek h1, dört bölüm, canonical, yapısal veri, hreflang, çevrilmiş metinler, ölçülen ya da hesaplanan rakamlar; ana sayfadan iki kart; bilinmeyen numune ve uykudaki dil 404).
- `qa:browser --only=specimens` **80/80:** yedi dil masaüstünde, dört dil telefonda, her numune; **CLS 0**, `dir` (Arapçada `rtl`), tek h1 ve çevrilmiş başlık, dört karo kırpılmadan, yatay kayma yok, bölüm bağlantısı iniş, Studio kartları ve tıklayınca sayfa. Arapça sağdan sola düzende denendi.
- Yer tutucular: Studio `--cv` 7625 / 6567 / 4807 px (telefon / tablet / masaüstü).

## 4. Sınırlar

- Yaklaşık 700 yeni metnin altı çevirisi (ve Studio kartları) ana dil konuşuru tarafından okunmadı.
- Ölçümler laboratuvar verisidir, tek makine sınıfı; sayfa bunu "Ödünleşimler ve sınırlar" bölümünde söyler. Denetim ve smoke sayıları için "iki yüzden fazla", "yüz seksenden fazla" alt sınırları yazıldı (yalnızca artabilen ifadeler).
- Numune 02 bir referanstır: hiçbir müşterinin sistemine bağlı değildir, hacim, kimlik bilgisi ve hukuki bağlam iddia dışıdır.
- "Specimen-01" biçimli numaralama yalnızca bu iki sayfa içindir; yeni bir numune gelirse numarası `lib/specimens.ts`'e eklenir.
