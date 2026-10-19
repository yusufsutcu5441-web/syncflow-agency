# ADR 0033: Herkese açık deponun ön yüzü (İngilizce README, MIT lisansı, GitHub meta verisi) ve sürüm kapısının çıktısı ile kararlılığı

- **Durum:** Uygulandı ve doğrulandı, 19.10.2026. Etiket: `release-2026-10-19b`.
- **Karar:** proje sahibi, 19.10.2026: (1) adlı bir kurucu profiliyle (gerçek isim) ilerlenir, anonim iş yapılmaz; (2) depo ön yüzü hemen düzeltilir (İngilizce README, açıklama, konular, ana sayfa alanı), sürüm kapısının kontrolleri sağlamlaştırılır, yeni commit ve etiket atılır; (3) lisans **MIT**.
- **Tamamlar:** [ADR 0025](0025-honest-trust-signals.md) (doğrulanabilir güven işaretleri), [ADR 0030](0030-legal-pages-verification-no-invented-data.md); `docs/deployment.md` (sürüm kapısı).
- **Yerine geçtiği:** yok. Depo kökündeki Türkçe README taslağı ve iki boş dosya kaldırıldı.

## 1. Bağlam

Depo herkese açıktır. Bir mühendis ya da CTO bir bağlantıyla geldiğinde ilk gördüğü sayfa GitHub ön yüzüdür. 19.10.2026'da yapılan **temiz klon denemesi** (GitHub'daki etiket yeni bir klasöre klonlandı, `npm ci`, `npm run release:verify`) şunu gösterdi:

- Komut yabancı bir makinede çalışıyor ve sayılar yeniden üretiliyor (233 denetim, 193 smoke, 7 teslim, 65 mimari sözleşme, 0 CSP ihlali), ama **tam kapı bir koşuda 313/315 verdi** (7/8 adım yeşil); aynı klonda tarayıcı adımı tek başına tekrarlanınca 315/315 geçti. Düşen iki kontrolün adı bilinmiyordu: `release-verify.mjs` düşen adımın yalnızca son 25 satırını yazıyordu.
- Ön yüz yabancı için hazır değildi: kök README Türkçe ve üç satırdı, GitHub açıklaması ve konuları boştu, ana sayfa alanı eski bir Vercel önizleme adresiydi, lisans yoktu (çalıştırma ve inceleme izni açık değildi), kökte iki boş dosya duruyordu (`claude code`, `motor_hedef.py`). Canlı numune sayfası bir çalıştırma komutu ya da depo bağlantısı taşımıyor.

## 2. Karar

1. **Kök `README.md` İngilizce ön yüzdür:** ne olduğu, "kendiniz doğrulayın" komutları (`arch:verify`, `release:verify`), kapının sekiz adımı, bilinen sınırlar, kanıt katmanları (A/B/C), canlı sitenin durumu (teslim bağlı değil, yasal sayfalar taslak, beş dilin çevirisi inceleme bekliyor), depo düzeni, dil politikası, lisans, iletişim. README'de sürüme bağlı sayı yoktur (sürüme bağlı sonuçlar `docs/deployment.md` §7'de); böylece eskimez. Uygulamanın Türkçe ayrıntı belgesi `syncflow-web/README.md` kalır ve en üstte İngilizce ön yüze işaret eder.
2. **Lisans MIT** (`LICENSE`, telif sahibi: git yazarı adı, Yusuf Sütcü, 2026; `package.json` `license: "MIT"`). Lisans metni değişmez MIT'dir (GitHub tanır). **Kapsam dışı** olanlar README'de yazılıdır: yazı tipleri (SIL OFL 1.1, kendi lisans dosyalarıyla), stüdyonun adı, logosu ve marka görselleri (`brand/`, `lib/brand-paths.ts`, `app/` ve `public/brand/` altındaki simgeler), bağımlılıklar (Remotion dahil kendi koşulları).
3. **GitHub meta verisi** (açıklama, ana sayfa alanı `https://syncflow.agency`, konular): bu makinede GitHub API erişimi ya da `gh` yoktur ve kimlik bilgisi aranmaz (ilke); sahibin panelinden uygulanır (kesin metinler ve konular §5'te).
4. **Boş kök dosyalar kaldırıldı** (`claude code`, `motor_hedef.py`; ikisi de sıfır baytlık, hiçbir yerden anılmıyordu, `docs/vercel-next-site.md` güncellendi).
5. **Kapının çıktısı:** `scripts/release-verify.mjs` düşen adımın `FAIL` satırlarını (ilk 40), son 25 satırını ve **tüm çıktısını bir dosyaya** (geçici klasör) yazar. `scripts/browser-flow.mjs` düşen kontrollerin adlarını **özet satırından önce** listeler. `--throttle=N` (ya da `QA_CPU_THROTTLE=N`) her sayfanın işlemcisini N kat yavaşlatır: yüklü bir makinenin sayfaya göründüğü hâl; zamanlamaya duyarlı kontrolleri aramak için.
6. **Aralıklı kontroller:** bkz. §3.

## 3. Aralıklı tarayıcı kontrolleri

Temiz klondaki tam kapı koşusunda tarayıcı adımı 313/315 verdi, aynı adım tek başına tekrarlanınca 315/315 geçti. Düşen iki kontrolün adı yakalanmamıştı (§1). Sebep aranırken:

| Deneme | Sonuç |
|---|---|
| Tüm akış, her sayfanın işlemcisi 4× yavaş (`--throttle=4`) | 315/315 (906 sn) |
| Zamanlamaya en duyarlı altı grup (framework, cinema, anchors, deeplink, cls, sims), 8 çekirdekten 6'sı meşgulken | 59/59 |
| Kalan dokuz grup, 6 meşgul çekirdekle | **254/256: iki kontrol düştü, ikisi de tipografi grubunda:** `de` 1440 px'te yerleşim kayması 0,0457, `es` 820 px'te 0,0133 |
| Aynı dokuz grup, aynı yük, yeniden | 256/256 |
| Yalnızca tipografi grubu, 6 meşgul çekirdek | 14/14 |
| Yalnızca tipografi grubu, 7 meşgul çekirdek | Chrome'un kendisi protokol zaman aşımına düştü (yük gerçekçi değil, kontrolün konusu değil) |

**Sonuç:** kararsızlık gerçek, aralıklı, yüke ve sıraya bağlıdır ve yerleşim kayması ölçümündedir (sayfa yerleşirken, yazı tipi değişimi ve ilk boyamadan sonra gelen hidrasyon sırasında tek bir yüklemede küçük bir kayma). Kontrol bu özelliği zaten doğru ölçüyor; kararsız olan, **tek yükleme**dir. Yapılan:

1. **Tipografi grubunda en çok üç yükleme:** yerleşim kayması yalnızca bu ölçüm yüzünden eşik üstündeyse (yatay kaydırma, taşan başlık ve hero satır sayısı gibi yapısal sorunlar yokken) sayfa yeniden yüklenir; üç yüklemenin üçünde de kayan sayfa **düşer**, sonradan yerleşen **geçer ve özet satırında adıyla bildirilir** (`315/315 browser checks passed (N measurements settled only on a later page load: ...)`). Kararsızlık gizlenmez, görünür kalır.
2. Düşen tipografi kontrolü artık hangi öğenin ne zaman ne kadar kaydığını yazar (`window.__shiftLog`).
3. Tüm düşen kontroller özet satırından önce adlarıyla listelenir; kapı düşen adımın `FAIL` satırlarını ve tam çıktısını yazar (§2.5).

**Yapılmadı ve AÇIK:** (a) kaymanın kök nedeni (yük altında `/de` ve `/es` yüklenirken yazı tipi değişimi mi, hidrasyon mu) araştırılmadı; sayfanın "yerleşim kayması 0" iddiası **sakin makine ölçümüdür** (ADR 0022 §8, ADR 0023). Yazı tipi yedeği için `size-adjust` ve `ascent-override` gibi ölçü eşleştirmeleri bir sonraki iş adayıdır; ölçülmeden eklenmedi. (b) Yeniden yükleme, yavaş bir cihazdaki gerçek ziyaretçinin gördüğü kaymayı **düzeltmez**, yalnızca kapının bir makinenin yüküyle kırmızıya dönmesini engeller. (c) Diğer gruplar için aynı yeniden yükleme eklenmedi: kanıt yok, ve her ekleme kapıyı gevşetir.

## 4. Doğrulama

- `npm run release:verify` (çalışma kopyası, bu değişikliklerle, 19.10.2026): **8/8 adım yeşil**, 844 sn. Tip/lint/mesajlar 30 sn; tasarım denetimi 60 sn, **233 geçti, 0 hata**, 1 uyarı (yer tutuculu hukuki sayfalar, kabul edilmiş), 4 bilgi; teslim 7/7; mimari 65/65; smoke 193/193; CSP 0 ihlal, 0 konsol hatası; tarayıcı akışı 646 sn, **315/315**, yeniden yükleme gerekmedi.
- `eslint` iki betikte temiz; `node --check` temiz.
- Etiket `release-2026-10-19b` (`d7e75ff`) atıldı ve itildi. **Canlı** (dağıtımdan sonra): `live-check` ilk koşuda (dağıtımdan hemen sonra) 46 geçti, 1 hata (adı yakalanmadı: çıktının yalnızca sonu okunmuştu), sonraki iki koşuda 47 geçti, 0 uyarı, 0 hata; `qa:csp` 0 ihlal, 0 konsol hatası; GitHub `license` alanı MIT.
- **Yeni etiket temiz klonda** (GitHub'dan `git clone --depth 1 --branch release-2026-10-19b`, `npm ci` 115 sn, `arch:verify` 3 sn, `release:verify`): **8/8 yeşil, 791 sn**, 233/193/7/65/0/315, yeniden yükleme gerekmedi. Windows 11, Node 24.12; macOS ve Linux denenmedi. Ayrıntı: `docs/deployment.md` §7.1.

## 5. GitHub "About" alanları (sahibin panelinden; metinler)

- **Description:** `Source of syncflow.agency and the reference code behind its claims: a fail-safe event queue, signed webhooks, example integration mappers, and a release gate anyone can run. MIT.`
- **Website:** `https://syncflow.agency`
- **Topics:** `reference-architecture` `idempotency` `dead-letter-queue` `event-driven-architecture` `webhooks` `hmac` `contract-testing` `architecture-decision-records` `nextjs` `typescript` `next-intl`
- **Yol:** depo sayfası → sağ kenardaki "About" yanındaki dişli simgesi → bu üç alan → Save changes. Doğrulama: `curl -s https://api.github.com/repos/yusufsutcu5441-web/syncflow-agency` (`description`, `homepage`, `topics`, `license`).

## 6. Riskler ve AÇIK konular (dürüst kayıt)

- **Lisans geri alınamaz.** Bu commit'ten sonra klonlayanlar kodu MIT ile alır. Bundan önce klonlayanların izni yoktu; yeni lisans onları kapsamaz ve geçmiş sürümleri geriye dönük lisanslamaz.
- **Marka dışarıda tutuldu, bu bir yorumdur.** "MIT" ile kastedilen kaynak koddur; logoyu ve adı dışarıda bırakma kararı bu ADR'yi yazanındır (sahip yalnızca "MIT" dedi). İstenmiyorsa README'deki "Not covered" maddesi ve §12 silinir; MIT metnine dokunmak gerekmez.
- **Telif satırı bir kişi adıdır.** Henüz tüzel kişilik yok (Geçit 0); telif sahibi git yazarı adı olarak yazıldı. Şirket kurulunca `LICENSE` satırı güncellenir (yalnızca ileriye dönük).
- **MIT, çevirilerin doğruluğu hakkında bir şey söylemez.** Beş dilin çevirileri araç taslağıdır ve yerel konuşur incelemesi bekler; README bunu söyler.
- **GitHub meta verisi hâlâ elle** uygulanır; yapılmadıysa depo yine açıklamasızdır. Doğrulama: `curl -s https://api.github.com/repos/yusufsutcu5441-web/syncflow-agency` (`description`, `homepage`, `topics`, `license`).
- **Kapı hâlâ yük altında 15 dakikadır ve Chrome ister;** macOS ve Linux denenmedi. Temiz klon denemesi tek makinede, Windows 11 + Node 24.12'de yapıldı.
