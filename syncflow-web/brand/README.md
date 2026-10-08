# SyncFlow marka paketi (Faz 1.3-1.4, v2)
Monogram: B1 (ızgaradan türetilmiş chevron-S), KESİNLEŞTİ. Wordmark: SYNCFLOW; iki aday:
(1) özel çizim, monoline, ızgaradan (dosyalar: wordmark-*, lockup-*)
(2) Satoshi Medium büyük harf: tools/outline_wordmark.py ile kendi bilgisayarınızda eğriye çevrilir.
Renkler: platin #E2E2E6, obsidian #0D0D0E.

## Kurallar
- Tek renk. Koyu zeminde platin, açık zeminde obsidian dosyası. Şampanya logoda kullanılmaz.
- Koruma alanı: 2u (u = monogram yüksekliğinin 1/4,5'i).
- Asgari boyut: monogram 16 px (small sürüm, <=20 px'te), yatay kilit 24 px yükseklik, yığılmış kilit 48 px yükseklik.
- Oran bozulmaz, döndürülmez; gölge, parlama ve gradyan eklenmez.
- Dosyalar eğrilere çevrilmiştir (yazı tipi gerekmez).

## Satoshi sürümünü üretmek
1. Satoshi'yi Fontshare'den indirin (Satoshi-Medium.otf). Font dosyasını repoya EKLEMEYİN.
2. pip install fonttools uharfbuzz
3. python tools/outline_wordmark.py Satoshi-Medium.otf --tracking 0.14 --out satoshi
4. Çıkan satoshi-lockup-horizontal-*.svg dosyaları özel çizim kilitle aynı oran ve hizadadır.
Lisans: Fontshare Free Font EULA metnini (FFL.txt) okuyup logo/marka kullanımına izin verdiğini doğrulayın.

## Durum
Taslaktır. Marka/ad sorgusu (Türkpatent ve uluslararası) tamamlanmadan nihai kabul edilmez.
