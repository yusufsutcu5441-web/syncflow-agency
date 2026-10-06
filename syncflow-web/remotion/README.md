# SyncFlow · Remotion (otomatik video demoları)

Sitedeki WhatsApp sohbet simülatörünün aynı senaryolarından 9:16 video (Reels, Shorts, WhatsApp durumu) üretir. Bu klasör **siteden bağımsızdır**: siteyi derlemek için gerekmez, yayına girmez ve `node_modules`'ü kendi içindedir.

## Neden "Remotion uyumlu"?

| Prensip | Sitede | Remotion'da |
|---|---|---|
| **Tek doğruluk kaynağı** | `src/core/scenarios.js` (sohbet metinleri ve zaman çizelgesi), `src/core/tokens.js` (renkler, easing, süreler): saf veri, DOM yok | Aynı dosyalar `src/data.ts` ile içe aktarılır |
| **Zaman çizelgesi = veri** | `at` / `duration` saniyeleri Motion (WAAPI) ile oynatılır | Aynı değerler `useCurrentFrame() / fps` ile kare kare çizilir |
| **Deterministik çizim** | Yalnızca opacity + translate + scale | `interpolate` + `Easing.bezier`: aynı kare her zaman aynı görüntü |
| **Aynı marka** | Plus Jakarta Sans, Navy/Teal | `npm run fonts` siteden fontları kopyalar |

`scripts/check.mjs` (kök) token renklerinin `src/styles/input.css` ile, senaryo yapısının geçerliliğiyle ve hero metninin senaryoyla aynı olduğunu doğrular; böylece site ve videolar ayrışmaz.

## Kurulum ve komutlar

```powershell
cd remotion
npm install            # OneDrive içindeyse projeyi OneDrive dışına taşımanız önerilir (node_modules yüzlerce dosya)
npm run studio         # tarayıcıda önizleme (fontlar otomatik kopyalanır)
npm run still          # tek kare PNG: out/whatsapp-demo.png
npm run render         # out/whatsapp-demo.mp4 (genel senaryo)
npm run render:showcase  # tüm sektörler art arda: out/sector-showcase.mp4
npm run typecheck      # tsc --noEmit
```

Başka senaryo: `npx remotion render src/index.ts WhatsAppDemo out/hukuk.mp4 --props='{"scenarioId":"hukuk"}'`. Kimlikler: `genel`, `saglik`, `gayrimenkul`, `hukuk`, `danismanlik`, `mimarlik`, `diger`.

## Yeni senaryo ya da yeni video eklemek

1. `../src/core/scenarios.js` içine senaryoyu ekleyin (sitede "Sizin Sektörünüz" kartına çip eklemeyi unutmayın; `check.mjs` eşitliği denetler).
2. Yatay (16:9) ya da kare çıktı için `src/Root.tsx` içindeki `width` / `height` değerlerini değiştirin.
3. Yeni bir kompozisyon için `src/Root.tsx` içine `<Composition />` ekleyin; bileşenler `useCurrentFrame()` dışında zamana bağlı hiçbir şey kullanmamalıdır (CSS animasyonu, `setTimeout`, `Date.now()` yok).

## Doğrulama durumu

Bu iskelet Remotion **4.0.533**, React 19, TypeScript 5.9 ile `tsc --noEmit` denetiminden ve gerçek `remotion still` render'ından (yazıyor göstergesi anı ve son durum kareleri) geçti. Tam MP4 render'ı (ffmpeg/kodlama) ve `studio` bu iskelette denenmedi.

## Lisans uyarısı (ajans için önemli)

Remotion kaynağı açık ama **ücretsiz değildir**: bireyler ve en fazla 3 kişilik kâr amaçlı şirketler ticari kullanım dahil ücretsiz kullanabilir; 4+ kişilik kâr amaçlı şirketler için ücretli **Company License** gerekir (geliştirici koltuğu başına yaklaşık $25/ay'dan başlar). Güncel şartlar için [remotion.dev/docs/license/pricing](https://www.remotion.dev/docs/license/pricing) sayfasını yayın/üretim öncesi teyit edin. Site (kök klasör) Remotion'a bağlı değildir; bu klasör olmadan da çalışır.
