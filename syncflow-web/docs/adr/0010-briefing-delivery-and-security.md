# ADR 0010: 2B-3 Briefing ve Güvenlik: teslimde id ve tek yeniden deneme, hız sınırı uyarısı, security.txt, CSP enforce hazırlığı

- **Durum:** Kabul edildi ve uygulandı, 08.10.2026 (`faz_2b3` dalı). [ADR 0008](0008-2b-2-3-4-scope.md)'deki 2B-3 taslağının **girdisiz** kısmıdır. Sahibi "önerilerle ilerle" dedi: K4 evet (id + tek yeniden deneme), K5 hayır (otomatik yanıt yok), K6 hazırlık 2B-3'te, geçiş F7'de, K9 bilgileri gelene kadar gerçek teslim bekler.
- **Yapılmayan:** gerçek n8n/Gmail teslimi (adres, imza sırrı ve Turnstile anahtarları verilmedi), WhatsApp ve takvim bağlantıları (verilmedi), otomatik yanıt e-postası, CSP'yi enforce'a **geçirmek** (kod hazır ve denendi, anahtar F7'de sizde).

## Karar ve uygulama

| Konu | Önce | Şimdi |
|---|---|---|
| Teslim kimliği | Yok | Her başvuru rastgele bir **UUID v4 `id`** taşır (gövdede ve `Idempotency-Key` başlığında; imza gövdeyi kapsadığı için `id` de imzalıdır). |
| Yeniden deneme | Tek deneme, 8 sn zaman aşımı, sonra e-posta taslağı | **En çok iki deneme**, toplam bütçe **< 9,5 sn** (5,0 + 0,4 bekleme + en çok 4,0). Yalnızca zaman aşımı, bağlantı hatası ve `5xx`/`408`/`429` yeniden denenir; `4xx` kesindir. **İki deneme de aynı `id`'yi taşır** ki alıcı çift e-postayı ayıklayabilsin. İki deneme de başarısızsa form `502` alır ve ziyaretçiye hazır e-posta taslağı çıkar (yanıtlar kaybolmaz). Günlük satırları yalnızca `id` içerir, kişisel veri içermez. |
| n8n sözleşmesi | İmza + yük | `docs/n8n-briefing.md`: yük tablosuna `id`, yeniden deneme anlamı, **"Çift kayıt"** (Remove Duplicates düğümü, `{{ $json.id }}`), yanıtın hızlı verilmesi, kontrol listesine "aynı `id` iki kez gelince tek e-posta". |
| Hız sınırı | Upstash yoksa sessizce örnek başına sayar | Üretimde Upstash yapılandırılmamışsa **ilk istekte bir kez** `console.warn` (örnek başına sayıldığı, sunucusuz ortamda en iyi çaba olduğu). Denetim uyarının var olduğunu doğrular. Davranış değişmedi (Redis çökerse yine bellek sayacına düşer, form kapanmaz). |
| `security.txt` | Yok | `public/.well-known/security.txt` (RFC 9116): `Contact: mailto:contact@syncflow.agency`, `Expires: 2027-04-08`, `Preferred-Languages: tr, en`, `Canonical`. Denetim ve duman testi **`Expires`'ın gelecekte ve ≤ 1 yıl içinde** olmasını ister: süresi dolarsa derleme kapısı kırmızıya döner, yenilemeyi unutmak mümkün olmaz. |
| CSP enforce | Yalnızca report-only denendi | Aynı derleme `CSP_MODE=enforce` ile başlatıldı ve **gerçek bloklama altında** denendi (bkz. aşağıda). Varsayılan hâlâ **report-only**; geçiş yalnızca ortam değişkeni (`CSP_MODE=enforce`) ve F7'de sizin kararınız. |

## Doğrulama (ayrıntı: [docs/perf/faz2b3.md](../perf/faz2b3.md))

- Denetim `--build`: **0 hata**, 106 geçti; yeni kapılar (teslim sözleşmesi, süre bütçesi, yeniden deneme kuralı, hız sınırı uyarısı, security.txt) **bozulmuş bir kopyada** dört ihlalle ayrı ayrı yakalandı.
- Duman testi **115/115** hem report-only hem **enforce** kipinde; yeni kontroller: `id` UUID v4 ve `Idempotency-Key` eşleşmesi, geçici `503` bir kez yeniden denenip teslim ediliyor (aynı `id`), sürekli çöken alıcıda iki deneme ve `502` ve 10 sn altı, `security.txt`.
- Gerçek **Turnstile widget'ı** (Cloudflare test anahtarı) **enforce altında 12/12**: betik yalnızca son adımda yükleniyor, CSP ihlali yok, imzalı yük sahte alıcıya ulaşıyor, alıcı ölünce hazır e-posta taslağı çıkıyor.
- Üç tarayıcı seti **enforce altında** geçti (Faz 4 gerileme 42/42, 2B-2 31/31, 2B-1 32/32).

## Dikkat edilmesi gerekenler

1. **Yeniden deneme çift e-posta riski doğurur** ve çözümü alıcıdadır: n8n akışı `id`'ye göre tekrarı ayıklamazsa ilk deneme ulaşıp yalnızca yanıtı gecikmişse iki e-posta gider. Belgede yazıyor ama **n8n tarafı bu makinede doğrulanmadı**; ilk gerçek denemede kontrol listesindeki madde sınanmalı.
2. Bellek içi hız sınırı sunucusuz ortamda örnek başınadır; **Upstash bağlanana kadar bu bir sınırdır**, uyarı yalnızca bunu görünür kılar. Vercel'e geçişte (F8) Upstash önerilir.
3. `security.txt` **`Expires` 2027-04-08'de dolar**; denetim bunu o tarihe yaklaşırken değil, dolduğu gün kırmızıya çevirir (bir yıldan uzak olunca da kırmızı). Yenilemek tek satırlık değişiklik.
4. CSP enforce **bu makinede, yerel HTTP'de** denendi: `upgrade-insecure-requests` ve HSTS etkileşimi HTTPS'te (canlı) ayrıca doğrulanmalı; rapor alıcısının canlıdaki ilk günlerinde izlenmesi önerilir.
5. Bu pakette **performans ölçümü yapılmadı** (sahibinin talimatı); mobil performans hâlâ "ölçülecek".
