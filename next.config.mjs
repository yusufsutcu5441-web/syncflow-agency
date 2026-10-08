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
  outputFileTracingIncludes: { '/og': ['./assets/og-instrument-sans-600.ttf'] },
  // `ANALYZE=1 npm run build` emits source maps so bundle contents can be inspected (npm run analyze).
  productionBrowserSourceMaps: process.env.ANALYZE === '1',
  // jsdom (used server-side by DOMPurify) must be loaded by Node, not bundled.
  serverExternalPackages: ['jsdom'],
  // Lets a browser on 127.0.0.1 use the dev server (HMR/websocket). No effect in production.
  allowedDevOrigins: ['127.0.0.1'],
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
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
