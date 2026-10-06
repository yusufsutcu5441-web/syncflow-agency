/**
 * Fixed-window rate limiter used by proxy.ts (coarse, all API + page requests) and by the contact route (strict).
 *
 * Two stores:
 *  - Upstash Redis (REST) when UPSTASH_REDIS_REST_URL/TOKEN are set: shared by every instance, so limits hold on
 *    serverless/edge platforms. The client IP is hashed before it is used as a key (data minimisation).
 *  - In-process memory otherwise: correct for one long-lived server, only best-effort on serverless where each
 *    instance counts separately. If the shared store errors, the limiter falls back to memory (fail-open locally,
 *    never fail-closed: a Redis outage must not take the contact form down).
 *
 * Web APIs only (fetch, crypto.subtle), so it works in the Node and Edge runtimes.
 */

export type RateResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  /** Milliseconds until the current window resets. */
  resetMs: number;
};

type RateOptions = { key: string; limit: number; windowMs: number };

type Bucket = { count: number; resetAt: number };

const MAX_KEYS = 20_000;
const memory = new Map<string, Bucket>();
let lastSweep = 0;

function sweep(now: number): void {
  if (now - lastSweep < 30_000 && memory.size < MAX_KEYS) return;
  lastSweep = now;
  for (const [key, bucket] of memory) {
    if (bucket.resetAt <= now) memory.delete(key);
  }
  // Still too big (a flood of distinct keys): evict the oldest 10 % so memory stays bounded.
  if (memory.size >= MAX_KEYS) {
    let evict = Math.ceil(memory.size * 0.1);
    for (const key of memory.keys()) {
      memory.delete(key);
      if (--evict <= 0) break;
    }
  }
}

function memoryHit({ key, limit, windowMs }: RateOptions): RateResult {
  const now = Date.now();
  sweep(now);
  let bucket = memory.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    memory.set(key, bucket);
  }
  bucket.count += 1;
  return {
    ok: bucket.count <= limit,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    resetMs: Math.max(0, bucket.resetAt - now),
  };
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function upstashHit({ key, limit, windowMs }: RateOptions): Promise<RateResult | null> {
  const baseUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!baseUrl || !token) return null;

  try {
    const redisKey = `sf:rl:${await sha256Hex(key)}`;
    const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      // INCR creates the key without a TTL on first use; PEXPIRE ... NX then sets it exactly once per window.
      body: JSON.stringify([
        ['INCR', redisKey],
        ['PEXPIRE', redisKey, String(windowMs), 'NX'],
        ['PTTL', redisKey],
      ]),
      signal: AbortSignal.timeout(1500),
      cache: 'no-store',
    });
    if (!response.ok) return null;

    const rows = (await response.json()) as Array<{ result?: unknown }>;
    const count = Number(rows[0]?.result);
    const ttl = Number(rows[2]?.result);
    if (!Number.isFinite(count)) return null;

    return {
      ok: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      resetMs: Number.isFinite(ttl) && ttl > 0 ? ttl : windowMs,
    };
  } catch {
    return null;
  }
}

export async function rateLimit(options: RateOptions): Promise<RateResult> {
  return (await upstashHit(options)) ?? memoryHit(options);
}

/**
 * Best-effort client address. Order matters: platform headers that the edge overwrites come first.
 * A value is only accepted if it looks like an IP, so it is safe to use inside a cache key.
 * Behind a proxy that does NOT overwrite x-forwarded-for, that header is client-controlled; see README.
 */
export function clientIp(headers: Headers): string {
  const first = (name: string) => headers.get(name)?.split(',')[0]?.trim();
  const candidate = first('x-vercel-forwarded-for') ?? first('cf-connecting-ip') ?? first('x-real-ip') ?? first('x-forwarded-for');
  return candidate && candidate.length <= 45 && /^[0-9a-fA-F:.]+$/.test(candidate) ? candidate : 'unknown';
}

export function rateLimitHeaders(result: RateResult): Record<string, string> {
  return {
    'RateLimit-Limit': String(result.limit),
    'RateLimit-Remaining': String(result.remaining),
    'RateLimit-Reset': String(Math.ceil(result.resetMs / 1000)),
  };
}
