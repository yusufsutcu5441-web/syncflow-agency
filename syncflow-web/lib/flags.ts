/**
 * Release switches (docs/adr/0035-sales-ready-release.md). Both are NEXT_PUBLIC_ variables, so they are inlined at build time:
 * change one on the host and redeploy. Both default to OFF; only the exact values "true" and "1" turn a switch on.
 *
 *   NEXT_PUBLIC_SHOW_PRICING        the investment bands and the currency tags of the entry gate (lib/pricing.ts). Off: no amount
 *                                   and no currency anywhere on the site. lib/pricing.ts itself is untouched.
 *   NEXT_PUBLIC_BRIEFING_ENABLED    the Strategic Briefing form: its section on the home page, its links in the header, footer, sticky
 *                                   bar and showcase, and POST /api/briefing. Off: none of them exists and the API answers 404.
 *
 * The briefing's first step IS the price question (the investment bands), so the form cannot be offered while prices are hidden:
 * BRIEFING_ENABLED is true only when both switches are on. Setting only the briefing switch therefore leaves the form off (a warning
 * is printed at build time so that is never a surprise).
 */
const on = (value: string | undefined): boolean => value === 'true' || value === '1';

export const SHOW_PRICING = on(process.env.NEXT_PUBLIC_SHOW_PRICING);

const briefingRequested = on(process.env.NEXT_PUBLIC_BRIEFING_ENABLED);

export const BRIEFING_ENABLED = briefingRequested && SHOW_PRICING;

if (briefingRequested && !SHOW_PRICING && process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
  console.warn('[flags] NEXT_PUBLIC_BRIEFING_ENABLED is on but NEXT_PUBLIC_SHOW_PRICING is off: the briefing opens with the investment question, so the form stays OFF. Turn both on to offer it.');
}
