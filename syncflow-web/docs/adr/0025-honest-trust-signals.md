# ADR 0025: Doğrulanabilir güven işaretleri; kanıtsız iddia yok

- **Durum:** Uygulandı, 17.10.2026.
- **Tetikleyen istek:** sahibin yapıştırdığı "Complete Autonomous Fix & Enterprise B2B Launch" metni (başka bir sohbetten): üç maskelenmiş kurumsal başarı hikayesi, uyum ve SLA rozetleri, "kıdemli sistem mimarları kolektifi" manifestosu, formun 503 vermemesi, `vercel.json` ve DNS rehberi.
- **Karar:** istenenlerin **kodla doğrulanabilir** olan kısmı yapıldı; **sahibin söylemesi gereken olgular** (müşteri var mı, sertifika var mı, SLA verilebiliyor mu) icat edilmedi. Aşağıdaki tablo her madde için ne yapıldığını ve nedenini söyler. Geri kalan iş, sahibin vereceği gerçek bilgiye bağlıdır ve nasıl verileceği [docs/case-study-intake.md](../case-study-intake.md) içinde yazılıdır.

## 1. Neden sınır çizildi

Sitenin kendi, sahibin onayladığı sesi şudur: "Client work is never shown without written consent, which is why the showcase holds studio specimens only" ve "Zero defects is the standard we work to, never a promise we could sign for you" (Studio, 16.10.2026). `scripts/smoke.mjs` ve `faz2-denetim.mjs` zaten SOC 2, ISO 27001, SLA, çalışma süresi yüzdesi ve ortaklık rozeti iddialarını **yasaklar** ("no invented enterprise credential in the page"). İstenen madde bu sesle çelişir: yok olan müşterilerin başarı hikayeleri ve alınmamış sertifikalar, 50.000 USD ve üstü proje düşünen bir alıcı için **doğrulanabilir** iddialardır (alıcı sorar, sözleşme ister, denetler). Yanlış çıkarsa zarar, kapanan iş değil, sahibin sorumluluğuna giren bir beyandır. Bu yüzden kod yazılmadı, yerine doğrulanabilir olan yazıldı.

## 2. Madde madde

| İstenen | Yapılan | Neden |
|---|---|---|
| Üç maskelenmiş kurumsal başarı hikayesi (lojistik/arıza güvenli kuyruk "%0 olay kaybı", İsviçre özel varlık/zero-trust, Monako gayrimenkul/Salesforce-SAP) | **Yapılmadı.** Alıcı: `docs/case-study-intake.md` (sahibin dolduracağı şablon) | Sitenin vitrini bilerek stüdyo örnekleri taşıyor ([ADR 0017](0017-atmosphere.md), [ADR 0020](0020-case-study-layer.md)); müşteri sonucu uydurmak sahte referanstır. "%0 olay kaybı" bir **müşteri sonucu** olarak yazılamaz; **referans kuyruğun test sonucu** olarak zaten yazılıdır ve doğrudur (65 sözleşme testi, "hiçbir arızada kayıp ya da çift uygulama yok"). Lojistik ve gayrimenkul örnekleri vitrinde zaten vardır; İsviçre özel varlık sektörü kilitli sektör kümesinde yok ([ADR 0019](0019-enterprise-tier.md)) |
| HMAC-SHA256 ve AES-256 rozetleri | **Yapıldı**, Studio'da "Bu sayfada denetlenebilir" şeridi: simülatör gerçek Web Crypto ile imzalar ve mühürler | Doğru ve ziyaretçinin kendi tarayıcısında doğrulanabilir (`lib/arch/envelope.ts`, `SecurityFlowSim`, testler) |
| GDPR Compliant | **Yapılmadı.** Yerine: "Çerez yok · analitik yok" (doğrulanabilir: ağ sekmesi) | Uyum bir **hukuki durumdur**, kod değil; gizlilik sayfası yer tutuculu ve avukat onayını bekliyor |
| SOC 2 Type II Ready | **Yapılmadı** | Sertifika ya da denetime hazırlık beyanı; denetim yok. Mevcut denetim bu ifadeyi yasaklıyor ve yasak genişletildi |
| %99,99 uptime ve 15 dakikanın altında olay müdahalesi SLA'sı | **Yapılmadı** | Sözleşmesel taahhüt ve 7/24 nöbet gerektirir; siteyi barındıran platformun taahhüdü müşterinin sistemine devredilemez. Sahip bunu bir **teklif şartı** olarak sunacaksa metni yazar, "hedef; sözleşmede tanımlanır" diye ben ekleyebilirim |
| "Kıdemli sistem mimarları kolektifi" manifestosu | **Yapıldı, ilke olarak**: "Beş satır" (çiz, tolerans söyle, kapalı düş, sessiz kal, iddiayı test et) | Her satır sayfanın ya da kodun yaptığı bir şey. Kişi sayısı, kıdem, yıl gibi doğrulanamayan nitelik yazılmadı; sahip isterse gerçek bilgisini verir |
| Form 503 vermesin; fallback / mock-handler | **Yapıldı, ama sahte başarı olmadan:** teslim bağlı değilken panel baştan "yanıtlarınız bir e-posta taslağı olarak açılır" der, son düğme taslağı açar, hiçbir şey "alındı" diye gösterilmez | 503 hatalı bir davranış değil, **kapalı düşme**: anahtarlar yokken bot denetimi yapılamaz. Mock bir "alındı" cevabı, kimsenin almadığı bir mesaja "alındı" demek olurdu (müşteri kaybı + yanıltma). Eski yol (son adımda hata) yerine ziyaretçi dört adımı doldurup çıkmaz sokağa girmez |
| `vercel.json` ve DNS rehberi | **Zaten var:** `vercel.json` doğru, `www` yönlendirmesi `next.config.mjs`'te, DNS adımları `docs/vercel-next-site.md` §10'da. **Eklendi:** `docs/go-live-checklist.md` (tek sayfa, sırayla) | Yeni bir `vercel.json` ayarı gerekmiyordu; eksik olan şey sahibin hesaplarında yapılacaklardı |

## 3. Eklenenler

- **Studio:** "Manifesto" (beş ilke) ve "Bu sayfada denetlenebilir" (üç olgu: HMAC-SHA256 · AES-256-GCM, çerez yok · analitik yok, uygulanan Content-Security-Policy). Yedi dilde, sunucuda çizilir, JavaScript gerektirmez.
- **Briefing:** üç çip (çerez yok · analitik yok; ilk oturumdan önce karşılıklı NDA; bir insan okur, 24 saat içinde yanıtlanır). NDA ve 24 saat sahibin kendi şartlarıdır (CLAUDE.md, Studio metni); yeni bir beyan değil.
- **Doğrudan e-posta kipi:** `lib/server/delivery-status.ts` dört ayarın (Turnstile gizli anahtarı ve site anahtarı, webhook adresi ve sırrı) tanımlı olup olmadığına sunucuda bakar; tanımlı değilse `Briefing` `direct` kipinde çizilir. Anahtarlar girilince **kod değişmeden** normal teslim yoluna döner.
- **Korkuluk:** denetim (`faz2-denetim.mjs` G11) yasak iddia desenlerini Studio, Briefing, Closing, Hero, Showcase, Architecture ve Meta'ya genişletti ve "GDPR compliant", "DSGVO-konform", %99,9 gibi uyum ve çalışma süresi iddialarını da adlandırdı; `smoke` yedi dilin ana sayfasında hem bu şeritlerin varlığını hem de bu iddiaların yokluğunu sınar.
- **Test:** `qa:browser --only=briefing` formun dört adımını yürür, taslak bağlantısının yanıtları taşıdığını ve API'ye hiçbir şey gönderilmediğini sınar.

## 4. Bu çalışmada bulunan iki test hatası (kayda geçsin)

1. **Paralellik testi boş geçiyordu.** CSP enforce edilince ([ADR 0024](0024-csp-enforced.md)) `browser-flow`'un "content-visibility kapalı" başvuru çalışması, sayfaya enjekte ettiği `<style>`ın nonce'u olmadığı için **engelleniyordu**; iki çalışma aynı olduğundan `cls` ve `parity` grupları hiçbir şeyi karşılaştırmadan geçiyordu (ADR 0024'ten sonraki 119/119 ve 5/5 sonuçlarının bu kısmı değersizdi). Düzeltme: yalnızca bu enjeksiyon için `setBypassCSP(true)`. Yeniden koşuldu (aşağıdaki sonuçlar).
2. **Yer tutucu yükseklikler eskiydi.** Studio ve Briefing uzayınca `--cv` tahminleri (Studio: 3670 → 5310 px telefon, 2820 → 4190 px tablet, 2350 → 3260 px masaüstü; Briefing: 1200 → 1400, 1100 → 1240, 1330 → 1440; telefon altbilgi 1340 → 1510) yeniden ölçüldü ve güncellendi. Yanlış tahmin, bölüm ilk çizildiğinde ekranda görünen kaymaya yol açar.

## 5. Sınırlar ve riskler

- Çeviriler (altı dil) bir ana dil konuşuru tarafından okunmadı; kısa ve teknik tutuldu.
- Doğrudan e-posta kipi ziyaretçinin posta uygulamasına bağlıdır (web posta kullanan ziyaretçide `mailto:` bir şey açmayabilir): bu yüzden taslak bağlantısı ayrıca gösterilir ve e-posta adresi her zaman görünür.
- "Uygulanan CSP" olgusu `CSP_MODE=report-only` ile yanlış hâle gelir; `live-check` bunu uyarıyla yakalar.
- Müşteri vakaları, sertifikalar ve SLA ancak sahibin gerçek bilgisiyle eklenir; bu ADR onları **yasaklamaz**, kanıtsız eklenmesini yasaklar.

## Geri alma

`git revert` (Studio, Briefing, mesajlar, CSS ve testler birlikte gider). Yalnızca doğrudan kipi kapatmak için `lib/server/delivery-status.ts` içindeki fonksiyonu `true` döndürecek biçimde değiştirmek yeter; ama bağlı olmayan teslim 503'e geri döner.
