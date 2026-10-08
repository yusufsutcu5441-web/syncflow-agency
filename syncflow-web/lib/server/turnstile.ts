import 'server-only';

/**
 * Cloudflare Turnstile verification (CLAUDE.md "Güvenlik": the token is checked on the server, never trusted from the
 * browser). TURNSTILE_SECRET_KEY is server-only. The public site key is NEXT_PUBLIC_TURNSTILE_SITE_KEY.
 *
 *   ok             the token is valid
 *   failed         missing/invalid/expired token, or Cloudflare could not be reached (fail closed)
 *   skipped        development without a secret: nothing to verify against
 *   not_configured production without a secret: the form must not accept anything unchecked
 */
export type TurnstileResult = 'ok' | 'failed' | 'skipped' | 'not_configured';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstile(token: string | undefined, ip: string): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    if (process.env.NODE_ENV !== 'production') return 'skipped';
    console.error('[briefing] TURNSTILE_SECRET_KEY is not set; refusing submissions in production.');
    return 'not_configured';
  }
  if (!token) return 'failed';

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== 'unknown') body.set('remoteip', ip);
    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
      redirect: 'error',
    });
    if (!response.ok) return 'failed';
    const data = (await response.json()) as { success?: boolean };
    return data.success === true ? 'ok' : 'failed';
  } catch {
    return 'failed';
  }
}
