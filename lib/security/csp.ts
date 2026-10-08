/**
 * Content-Security-Policy builder (nonce based, "strict-dynamic").
 *
 * Why a nonce and not 'unsafe-inline': Next.js emits inline bootstrap/flight scripts. A nonce lets exactly
 * those run and nothing an attacker could inject. The cost is that pages render per request (no CDN-cached
 * HTML), see the README section "Security model".
 *
 * The only third party is Cloudflare Turnstile (the bot check of the briefing): its script (loaded by our own nonce'd
 * code, so 'strict-dynamic' trusts it; the origin is the fallback for old browsers) and its challenge frame.
 *
 * Only Web APIs are used here (no Node built-ins) so this module also runs unchanged in the Edge runtime.
 */

/** Where browsers POST violation reports (app/api/csp-report/route.ts). */
export const CSP_REPORT_PATH = '/api/csp-report';

/**
 * How the policy is delivered. Report-only until Faz 7 (docs/adr/0001-csp-report-only.md): the browser evaluates the
 * whole policy and reports every violation to CSP_REPORT_PATH, but blocks nothing. Set CSP_MODE=enforce in the
 * environment to start blocking; no code change is needed. Anything else means report-only.
 */
export const CSP_MODE: 'report-only' | 'enforce' = process.env.CSP_MODE === 'enforce' ? 'enforce' : 'report-only';
export const CSP_HEADER = CSP_MODE === 'enforce' ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only';

export const TURNSTILE_ORIGIN = 'https://challenges.cloudflare.com';

/** 128-bit random nonce, base64. */
export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

type CspOptions = {
  nonce: string;
  isDev: boolean;
  /** Adds upgrade-insecure-requests. Skipped for plain-http local previews, where it would break asset loading. */
  isHttps: boolean;
};

export function buildCsp({ nonce, isDev, isHttps }: CspOptions): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    // 'strict-dynamic' makes browsers trust scripts loaded by nonce'd scripts (Next chunks, the Turnstile loader) and
    // ignore host allow-lists; the origin below is the fallback for old browsers without CSP3.
    'script-src': ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", TURNSTILE_ORIGIN, ...(isDev ? ["'unsafe-eval'"] : [])],
    // Dev injects <style> tags without a nonce (HMR), so dev needs 'unsafe-inline'. Production does not.
    'style-src': ["'self'", ...(isDev ? ["'unsafe-inline'"] : [`'nonce-${nonce}'`])],
    // React renders style="" attributes in server HTML. Inline style attributes cannot execute script, so they are
    // allowed separately from <style> elements.
    'style-src-attr': ["'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:'],
    'font-src': ["'self'"],
    'connect-src': ["'self'", TURNSTILE_ORIGIN, ...(isDev ? ['ws://localhost:*', 'ws://127.0.0.1:*'] : [])],
    'frame-src': [TURNSTILE_ORIGIN],
    'media-src': ["'self'"],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'self'"],
    'report-uri': [CSP_REPORT_PATH],
  };

  // Browsers ignore this directive in a report-only policy (and log a warning), so it is only sent when enforcing.
  // Until then the enforced Strict-Transport-Security header does the upgrading.
  if (isHttps && !isDev && CSP_MODE === 'enforce') directives['upgrade-insecure-requests'] = [];

  return Object.entries(directives)
    .map(([name, values]) => (values.length ? `${name} ${values.join(' ')}` : name))
    .join('; ');
}
