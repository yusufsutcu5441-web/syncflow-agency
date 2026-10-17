# ADR 0026: Arapça ve Çince paylaşım kartları kendi dilinde

- **Durum:** Uygulandı, 17.10.2026.
- **Karar:** sahibin isteği ("dil kontrolünü yap") sırasında bulunan bir eksik: WhatsApp, LinkedIn, X ve iMessage önizlemelerindeki kart (`/og`), Arapça ve Çince sayfalar için **İngilizce** çiziliyordu. Gerekçe eski kodda yazılıydı: kartı çizen satori'ye verilen yazı tipi (Inter Display) Arapça ve Han karakterlerini içermiyor, kutu basardı. Orta Doğu (Dubai) ve Asya pazarları siteyi ilk bu önizlemelerle görür; sayfa metni (`og:title`, `og:description`) kendi dilinde, görseli ise İngilizce olmak, ve görselin `alt` metninin görselde olmayan bir dilde yazılı olması tutarsızdı.

## Ne yapıldı

| Dil | Nasıl çizilir | Neden |
|---|---|---|
| EN, TR, DE, FR, ES | Değişmedi: istek anında satori + Inter Display | Çalışıyordu |
| **Çince** | Aynı satori yolu, **Noto Sans SC alt kümesi** (`assets/og-noto-sans-sc-700.otf`, 8,8 KB; SIL OFL) | Han karakterleri kare ızgarada çizilir; karttaki üç dizenin (başlık iki satır ve alt başlık) karakterlerini içeren alt küme yeter. Boşluk ve harf aralığı Latin'e göre ayarlandı |
| **Arapça** | **Önceden çizilmiş PNG** (`assets/og-ar.png`, 78 KB), `scripts/render-og-card-ar.mjs` ile gerçek bir tarayıcıda (Chrome) bir kez | Satori Arapça harfleri yazı tipinin kendi tablolarıyla **birleştirir** ama sağdan sola satır sırasını **çevirmez**: başlık aynalanmış çıkar (denendi, görüldü). Üstüne yazı tipindeki bir arama türünü (bağlamsal ikame, biçim 3) satori'nin okuyucusu (`opentype.js`) desteklemiyor ve hata atıyor; bu iki özelliği çıkarmak harfleri birleştirir ama sırayı düzeltmez. Tarayıcı ikisini de doğru yapar |
| Japonca | Taslak, yayında değil; İngilizce kartı kullanır | |

`/og?locale=` için önbellek sürümü `v=3` → **`v=4`** (kartlar kenarda bir yıl önbelleğe alınır; eski İngilizce Arapça ve Çince kartlar görünmesin diye).

## Korumalar (kopya değişince bozuk kart çıkmasın)

- `python scripts/check-fonts.py`: Çince kartın üç dizesindeki her karakter alt kümede var mı; `assets/og-ar.json` içindeki özet, `messages/ar.json`'daki güncel Arapça kart dizeleriyle aynı mı (değilse: `node scripts/render-og-card-ar.mjs` çalıştırılır).
- `faz2-denetim.mjs` (G2): iki yazı tipi/PNG dosyası var mı ve `next.config.mjs` `outputFileTracingIncludes` ile `/og` işleviyle paketleniyor mu (paketlenmezse Vercel'de 500 verir ve yerelde görünmez).
- `scripts/smoke.mjs`: yedi dilin yedi kartı birbirinden **farklı** bir resim (Arapça ve Çince artık İngilizce kartın kopyası değil).

## Yeniden üretmek

```
python scripts/build-og-fonts.py <NotoSansArabic-SemiBold.ttf> <NotoSansSC-Bold.otf>   # alt kümeler (assets/)
node scripts/render-og-card-ar.mjs                                                      # Arapça PNG
```
Kaynaklar (SIL OFL 1.1): `notofonts.github.io` (NotoSansArabic, hinted/ttf) ve `noto-cjk` (Sans/SubsetOTF/SC). Lisans bildirimi: `assets/FONT-LICENSES.md`.

## Sınırlar

- Arapça kart statiktir: metin değişirse PNG yeniden çizilmeli (koruma bunu yakalar). İsteğe bağlı olarak dinamik hâle getirmek, satori'nin sağdan sola desteği gelene kadar yapılmadı.
- Kartın alt başlığı ve başlığı, sayfanın kendi (altı dil gözden geçirmesi yapılmamış) çevirileridir.
- Canlı doğrulama dağıtımdan sonra: `/og?locale=ar&v=4` ve `zh` İngilizce karttan farklı ve 1200×630 PNG dönmeli.
