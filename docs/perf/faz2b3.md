# 2B-3 doğrulaması: briefing teslimi ve güvenlik

- **Tarih:** 08.10.2026
- **Ölçülen kod:** `faz_2b3` dalı ([ADR 0010](../adr/0010-briefing-delivery-and-security.md)). Üretim derlemesi; iki sunucu: `:3100` report-only (`NEXT_PUBLIC_SITE_URL=http://localhost:3100`), `:3101` **`CSP_MODE=enforce`** (Cloudflare Turnstile **test** site anahtarıyla derlenmiş, Cloudflare'in her zaman geçen **test** gizli anahtarı ve sahte alıcı `127.0.0.1:4012`).
- **Bu pakette hiçbir performans ölçümü yapılmadı** (sahibinin talimatı).

| Denetim | Sonuç |
|---|---|
| `node faz2-denetim.mjs --build` | **0 hata**, 106 geçti, 1 uyarı (`generateStaticParams` yok: nonce'lu CSP sayfaları zaten istek başına render ettiği için bilinçli, ADR 0001), 3 bilgi; `npm run build` başarılı; `lint` ve `check:messages` temiz. Yeni kapılar: teslimde `id` + `Idempotency-Key`, süre bütçesi (5000 + 400 + 4000 = **9400 ms**), yeniden deneme kuralı (5xx/408/429, 4xx kesin), hız sınırı uyarısı, security.txt (Contact, Canonical, Expires) |
| Bozulmuş kopyada denetim | **4/4 ihlal yakalandı**: `Idempotency-Key` silindi, ikinci deneme 8 sn yapıldı (bütçe 13,4 sn), security.txt `Expires` geçmişe alındı, hız sınırı uyarısı silindi |
| `npm run smoke` report-only (`:3100`) | **115/115** (önce 109): `id` UUID v4 + `Idempotency-Key`, geçici 503 → bir kez yeniden deneme, **aynı `id`** iki kez, sürekli çöken alıcı → iki deneme, `502`, **10 sn altı**, `security.txt` düz metin ve süresi gelecekte |
| `npm run smoke` **enforce** (`:3101`, `EXPECT_CSP_MODE=enforce`) | **115/115**; `Content-Security-Policy` başlığı var, `…-Report-Only` yok |
| Gerçek Turnstile widget'ı + teslim, **enforce** (`:3101`) | **12/12**: betik yalnızca son adımda yüklenir · katı CSP'de **hiçbir ihlal yok** · token sunucuda Cloudflare ile doğrulanır · imzalı yük `high` sınıfıyla alıcıya ulaşır · alıcı kapalıyken `502` ve hazır e-posta taslağı (cevaplar silinmez; proje türü `Law firm or advisory site`) |
| Tarayıcı testleri **enforce** (`:3101`) | **Faz 4 gerileme 42/42**, **2B-2 31/31**, **2B-1 32/32**: Lenis, spotlight, Border Beam, briefing, telefon, azaltılmış hareket, JS kapalı ve palet/yazı tipi/logo davranışı enforce altında da bozulmuyor |
| `npm run build` | çıkış 0 (iki kez: report-only ve Turnstile test anahtarlı) |

## Ölçülemeyenler ve açık olanlar (dürüstçe)

1. **Gerçek n8n/Gmail teslimi hâlâ doğrulanmadı** (adres, imza sırrı, Turnstile anahtarı verilmedi). Yeniden deneme ve çift kayıt ayıklaması sahte alıcıyla kanıtlandı; **n8n'deki "Remove Duplicates" düğümü bu makinede denenmedi** (menü adı sürüme göre değişebilir). İlk gerçek denemede kontrol listesindeki madde ("aynı `id` ile iki istek, tek e-posta") sınanmalı.
2. **CSP enforce yalnızca yerel HTTP'de denendi.** HTTPS'te `upgrade-insecure-requests` ve HSTS etkileşimi, gerçek alan adında rapor alıcısının ilk günleri ve Turnstile'ın canlı etki alanı (`challenges.cloudflare.com`) ile davranışı canlıda ayrıca doğrulanmalı. Varsayılan hâlâ **report-only**; geçiş F7'de sizde.
3. **Hız sınırı:** Upstash bağlanmadıkça sunucusuz ortamda örnek başınadır; bu pakette yalnızca uyarı eklendi (davranış aynı).
4. `security.txt` `Expires` **2027-04-08**; yenilenmezse denetim kırmızıya döner.
5. Test anahtarları **gerçek anahtar değildir**; `.env` ve sır dosyası commit edilmedi.
6. Yapılmadı: otomatik yanıt e-postası (K5 hayır), başarı ekranı çıkış metinleri ve WhatsApp/takvim bağlantıları (K9 bilgileri verilmedi), n8n kurulumu. Performans ve mobil Lighthouse ölçümü yapılmadı.
