// TEMPORARY (09.10.2026): finds why /api/briefing answers 500 on Vercel. Delete this file once the cause is known.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const describe = (e: unknown) => {
  const x = e as { name?: string; code?: string; message?: string; stack?: string };
  return { name: x?.name, code: x?.code, message: String(x?.message).slice(0, 400), stack: String(x?.stack).split('\n').slice(0, 6) };
};

export async function GET() {
  const out: Record<string, unknown> = {
    node: process.version,
    vercelEnv: process.env.VERCEL_ENV,
    platform: `${process.platform}/${process.arch}`,
  };
  const tries: Record<string, () => Promise<unknown>> = {
    jsdom: () => import('jsdom'),
    dompurify: () => import('dompurify'),
    sanitize: () => import('@/lib/server/sanitize'),
    sanitizeCall: async () => (await import('@/lib/server/sanitize')).toPlainText('<b>x</b>'),
    briefing: () => import('@/lib/briefing'),
    schema: () => import('@/lib/schemas/briefing'),
    rateLimit: () => import('@/lib/security/rate-limit'),
    deliver: () => import('@/lib/server/deliver'),
    turnstile: () => import('@/lib/server/turnstile'),
  };
  for (const [name, run] of Object.entries(tries)) {
    try {
      const value = await run();
      out[name] = typeof value === 'string' ? `ok: ${JSON.stringify(value)}` : 'ok';
    } catch (e) {
      out[name] = describe(e);
    }
  }
  return Response.json(out, { headers: { 'cache-control': 'no-store' } });
}
