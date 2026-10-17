import { fileURLToPath } from 'node:url';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/**
 * Static security headers, applied to every response (pages, API, assets).
 *
 * The Content-Security-Policy is NOT set here on purpose. It carries a per-request nonce, so it is
 * generated in proxy.ts (see lib/security/csp.ts). Setting a second, nonce-less CSP here would be
 * intersected with it by the browser and block the nonce'd scripts.
 */
const securityHeaders = [
  // 2 years, all subdomains, preload-eligible. Browsers ignore this header over plain http (local dev).
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Since Next 16.3 `next dev` writes AGENTS.md / CLAUDE.md for AI coding agents, and when a CLAUDE.md already exists it
  // inserts its own rules block INTO it. CLAUDE.md is the project contract (written by hand), so keep it untouched.
  agentRules: false,
  // The OG image route reads this font with fs; tell the file tracer so serverless deployments ship it.
  outputFileTracingIncludes: { '/og': ['./assets/og-inter-display-600.ttf', './assets/og-noto-sans-sc-700.otf', './assets/og-ar.png'] },
  // `ANALYZE=1 npm run build` emits source maps so bundle contents can be inspected (npm run analyze).
  productionBrowserSourceMaps: process.env.ANALYZE === '1',
  // jsdom (used server-side by DOMPurify) must be loaded by Node, not bundled. Keep jsdom on 26.x: 27+ require() an ES-only
  // dependency chain, which Vercel's runtime refuses (ERR_REQUIRE_ESM), so /api/briefing answered 500 (docs/adr/0013).
  // faz2-denetim.mjs checks that jsdom loads with require(esm) disabled.
  serverExternalPackages: ['jsdom', 'nodemailer'],
  // Lets a browser on 127.0.0.1 use the dev server (HMR/websocket). No effect in production.
  allowedDevOrigins: ['127.0.0.1'],
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // React and Next start after the first paint (docs/adr/0023): the adapter moves their scripts behind one small loader INSIDE `next build`, before
  // Vercel's own adapter (NEXT_ADAPTER_PATH, which this one hands over to) hashes and packs the output. Next resolves the path, so it is absolute.
  adapterPath: fileURLToPath(new URL('./scripts/sf-adapter.mjs', import.meta.url)),
  // `www` joins the apex permanently (308, path and query kept). The domain itself is added in Vercel (Project -> Settings -> Domains) and
  // the DNS record is `CNAME www cname.vercel-dns.com` at the registrar (docs/vercel-next-site.md section 10): this rule is what happens
  // once a visitor arrives, so adding the domain in Vercel as a plain domain is enough, no redirect has to be set in the dashboard.
  async redirects() {
    return [{ source: '/:path*', has: [{ type: 'host', value: 'www.syncflow.agency' }], destination: 'https://syncflow.agency/:path*', permanent: true }];
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Font files are versioned by name (-v1): cache them for a year, never revalidate.
      { source: '/fonts/:file*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
      // The scene videos keep their names when they are re-rendered (npm run film:render), so not "immutable":
      // one week from the cache, then revalidated in the background.
      { source: '/media/:file*', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }] },
    ];
  },
};

export default withNextIntl(nextConfig);
