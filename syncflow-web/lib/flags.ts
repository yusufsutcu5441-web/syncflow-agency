/**
 * Release switches (docs/adr/0035-sales-ready-release.md, docs/adr/0038-studio-only-site.md). All are NEXT_PUBLIC_ variables, so they are inlined at build time:
 * change one on the host and redeploy. All default to OFF; only the exact values "true" and "1" turn a switch on.
 *
 *   NEXT_PUBLIC_SHOW_PRICING        the investment bands and the currency tags of the entry gate (lib/pricing.ts). Off: no amount
 *                                   and no currency anywhere on the site. lib/pricing.ts itself is untouched.
 *   NEXT_PUBLIC_BRIEFING_ENABLED    the Strategic Briefing form: its section on the home page, its links in the header, footer, sticky
 *                                   bar and showcase, and POST /api/briefing. Off: none of them exists and the API answers 404.
 *   NEXT_PUBLIC_SHOW_ENTERPRISE     the enterprise layer (18.11.2026 order: the site is a high-performance web design studio and nothing else): cards IV to VI of
 *                                   the Architecture section (the queue, integration and security simulators), the Studio parts that describe or depend on them
 *                                   (Drawing 01, the HMAC / AES fact, the fifth manifesto line, the R&D specimen cards), the "Outbound pilot" band and footer link.
 *                                   Off, /pilot, /outbound and /specimens/fail-safe-queue answer a 301 to the home page (next.config.mjs) and leave the sitemap.
 *                                   /specimens/studio-site stays public in both modes: it is the Lighthouse evidence of the performance claim, linked from the
 *                                   Lighthouse card. The code, lib/arch and their tests are untouched.
 *
 * The briefing's first step IS the price question (the investment bands), so the form cannot be offered while prices are hidden:
 * BRIEFING_ENABLED is true only when both switches are on. Setting only the briefing switch therefore leaves the form off (a warning
 * is printed at build time so that is never a surprise).
 */
const on = (value: string | undefined): boolean => value === 'true' || value === '1';

export const SHOW_PRICING = on(process.env.NEXT_PUBLIC_SHOW_PRICING);

const briefingRequested = on(process.env.NEXT_PUBLIC_BRIEFING_ENABLED);

export const BRIEFING_ENABLED = briefingRequested && SHOW_PRICING;

export const SHOW_ENTERPRISE = on(process.env.NEXT_PUBLIC_SHOW_ENTERPRISE);

if (briefingRequested && !SHOW_PRICING && process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
  console.warn('[flags] NEXT_PUBLIC_BRIEFING_ENABLED is on but NEXT_PUBLIC_SHOW_PRICING is off: the briefing opens with the investment question, so the form stays OFF. Turn both on to offer it.');
}
