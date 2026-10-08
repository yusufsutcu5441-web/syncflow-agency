# 2B-4 doğrulaması: hukuki sayfalar (yapı)

- **Tarih:** 08.10.2026
- **Ölçülen kod:** `faz_2b4` dalı ([ADR 0011](../adr/0011-legal-pages-structure.md)). Üretim derlemesi (`NEXT_PUBLIC_SITE_URL=http://localhost:3100`, `next start -p 3100`), geliştirme sunucusu `:3000`.
- **Bu pakette hiçbir performans ölçümü yapılmadı** (sahibinin talimatı).
- **Bu rapor hukuki yeterliliği doğrulamaz.** Doğrulanan yalnızca yapı, tarih, bağlantı ve "iddia yok" kurallarıdır; metnin hukuken yeterli olup olmadığını avukat belirler.

| Denetim | Sonuç |
|---|---|
| `npm run build` | çıkış 0 (tip denetimi dahil) |
| `node faz2-denetim.mjs --build` | **0 hata**, 110 geçti, 1 uyarı (`generateStaticParams` yok: nonce'lu CSP sayfaları zaten istek başına render ettiği için bilinçli, ADR 0001), 4 bilgi (biri: hukuki sayfalar yer tutuculu taslak, K7); `npm run build` başarılı; `lint`, `check:messages`, `check:fonts` temiz |
| Bozulmuş kopyada denetim | **5/5 ihlal yakalandı**: bölüm sırasından bir bölüm çıkarıldı, İngilizce bir başlık boşaltıldı, rıza bağlantısı `#privacy-p2`'yi kaybetti, metne "fully GDPR compliant" yazıldı, taslak uyarısı silindi |
| `npm run smoke` | **121/121** (önce 115): `/privacy` ve `/tr/privacy` dokuz bölüm ve `id`'ler, `/imprint` ve `/tr/imprint` beş bölüm, "son düzenleme" satırı ve taslak uyarısı, bölüm sırası, rıza bağlantısının `#privacy-p2` adresi |
| Tarayıcı testi 2B-4 (yeni, `puppeteer-core`; betik depoda yok) | **19/19** (EN ve TR): dokuz başlık bildirim sırasında, dokuz `id`, "Son düzenleme: 8 Ekim 2026 / Last edited: October 8, 2026", taslak uyarısı ve `[köşeli parantezli]` yer tutucular **hâlâ yerinde** (K7), `noindex`, "uyumludur/compliant/garanti" geçmiyor, konsol hatası yok; künyede beş bölüm ve tarih; briefing'in 4. adımındaki rıza bağlantısı `/privacy#privacy-p2`'ye gidiyor ve **tıklayınca bölüm başlığın altına kaydırılmış olarak açılıyor** (EN ve TR); `/de/privacy` 404 |
| Gerileme: Faz 4 / 2B-2 / 2B-1 tarayıcı setleri | **42/42**, **31/31**, **32/32** |
| `npm run lint`, `check:messages` | temiz; `check:messages`: yer tutuculu dize sayısı 20 → **22** (haklar bölümüne iki yer tutucu, bilinçli); `--strict` kırmızı kalır (K7) |

## Ölçülemeyenler ve açık olanlar (dürüstçe)

1. **Hukuki yeterlilik doğrulanmadı ve doğrulanamaz.** Metin KVKK m.10 / GDPR m.13 başlıklarına göre düzenlendi; ama hukuki sebep, VERBİS, DPO/AB temsilcisi, yurt dışı aktarım kuralları ve saklama süresi avukatın kararıdır. **"Taslak" uyarısı ve 22 yer tutucu durur;** sayfa bu hâliyle yayına hazır değildir.
2. **p8 ve p9 işletme iddialarıdır** ("her talebi bir kişi okur", "otomatik yanıt ya da ret yok"): "24 saat" sözü gerçekse ve K5 (otomatik yanıt yok) geçerliyse doğrudur; biri değişirse metin değişmeli.
3. Gerçek bilgiler (K7) ve avukat onayı **yok**; kullanım şartları ve erişilebilirlik beyanı sayfaları yapılmadı (K8).
4. Taslak diller hukuki metni İngilizce gösterir; yayında değiller.
5. Ekran okuyucu ile elle deneme ve `Lighthouse` erişilebilirlik ölçümü bu pakette yapılmadı (yeni sayfa içeriği sade metin ve başlıklardır).
