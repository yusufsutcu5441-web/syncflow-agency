# ADR 0001: Content-Security-Policy şimdilik report-only

- **Durum:** Kabul edildi, 07.10.2026 (Faz 2)
- **Karar:** proje sahibi ("CSP kararını report-only olarak bağlayalım"). Uygulama: Faz 2.

## Bağlam

- Politika `lib/security/csp.ts` içinde, her istekte `proxy.ts` tarafından üretilir: `script-src 'self' 'nonce-…' 'strict-dynamic'`, `style-src` nonce + Lemon.js yükleyici hash'i, üçüncü taraf olarak yalnızca `lemonsqueezy.com`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'self'`.
- Nonce her istekte değiştiği için sayfalar istek başına render edilir (`app/[locale]/layout.tsx` nonce'u `headers()` ile okur). CDN'de HTML önbelleği yoktur.
- Yaklaşan değişiklikler politikayı etkiler: Faz 3 hareket kütüphaneleri (satır içi stil), Faz 6 Turnstile (yeni kaynak) ve Lemon Squeezy ödemesinin yerine başvuru akışı (Lemon kaynakları ve hash'i kalkar).
- Politikayı doğrudan enforce etmek, bu değişikliklerde ya da gerçek trafikte bilinmeyen bir kaynağı engelleyip formu ya da ödemeyi bozma riski taşır.

## Karar

1. Politika olduğu gibi **`Content-Security-Policy-Report-Only`** başlığıyla gönderilir. Faz 7'ye kadar enforce edilmez.
2. İhlaller `report-uri /api/csp-report` ile toplanır. Alıcı (`app/api/csp-report/route.ts`) rapor başına tek satır JSON'u sunucu günlüğüne yazar. Tutulan alanlar: yönerge, engellenen/belge/kaynak adresi (sorgu dizesi ve parça atılır), satır ve sütun. Politika metni, betik örneği, IP ve User-Agent saklanmaz (KVKK veri minimizasyonu).
3. Mod tek yerde belirlenir: `CSP_MODE` ortam değişkeni (`report-only` varsayılan, `enforce`). Geçiş kod değişikliği gerektirmez. `scripts/smoke.mjs` modu `EXPECT_CSP_MODE` ile doğrular.
4. Nonce mekanizması aynı kalır. Next.js 16.3.8 nonce'u istek başlığında `content-security-policy` ya da `content-security-policy-report-only` adından birinden okur (`node_modules/next/dist/server/app-render/app-render.js`, satır 209). Bu yüzden report-only kipinde de her betik nonce alır ve raporlar gerçek politikayı yansıtır.
5. `upgrade-insecure-requests` yalnızca enforce kipinde gönderilir (tarayıcılar report-only'de yok sayar ve uyarı yazar). O zamana kadar zorunlu HSTS başlığı yükseltmeyi yapar.

## Enforce'a geçiş ölçütü (Faz 7)

Enforce şu üç koşul birlikte sağlanınca açılır; tarihi proje sahibi verir:

- Üretim derlemesinde tüm rota ve akışlar gezilir ve rapor üretmez: ana sayfa (EN/TR), gizlilik, künye, 404, ödeme/başvuru akışı, iletişim formu.
- Canlıya çıkıştan sonraki ilk dönemin rapor günlüğünde açıklanamayan ihlal kalmaz.
- `EXPECT_CSP_MODE=enforce npm run smoke` yeşildir.

## Sonuçlar

- **+** Form, ödeme ve üçüncü taraf betikler ölçüm sırasında kırılmaz; politika gerçek kullanımla sınanır.
- **−** Report-only iken CSP enjekte edilmiş bir betiği **engellemez**. XSS savunması şunlara dayanır: React'in kaçışı, DOMPurify ile temizlenen form girdisi, kullanıcı HTML'inin hiçbir yerde render edilmemesi. Tıklama hırsızlığına karşı koruma zorunlu `X-Frame-Options` başlığından gelir (report-only'de `frame-ancestors`'a güvenilmez).
- **−** Her istekte yeni nonce sayfaları dinamik tutar. Maliyeti Faz 2 Lighthouse başlangıcında ölçülüdür (`docs/perf/faz2-baseline.md`). Alternatif, Next'in SRI tabanlı hash CSP'sidir (`experimental.sri`) ve statik sayfaya izin verir; Faz 7'de ölçümle değerlendirilir. `'unsafe-inline'` reddedildi.
- **−** Rapor günlüğü yalnızca sunucu günlüğüdür (Vercel'de saklama süresi sınırlıdır). Kalıcı toplama (n8n webhook'u ya da hata izleme) Faz 8'de kararlaştırılır.
- **Açık fark (CLAUDE.md hedefi ile):** CLAUDE.md `X-Frame-Options: DENY` ve `frame-ancestors 'none'` ister; kodda `SAMEORIGIN` ve `'self'` var. Faz 7'de, aynı kökenli çerçeveleme ihtiyacı çıkmazsa `DENY`/`'none'` yapılır.
- Remotion Player'ın `<style>` hash'i politikadan kaldırıldı ([ADR 0003](0003-showcase-film-static-render.md)). Lemon Squeezy hash'i ve kaynakları, ödeme başvuru akışıyla değişene kadar kalır.
