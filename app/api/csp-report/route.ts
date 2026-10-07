// Plain Node runtime, and a report must never be cached.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 8 * 1024;
const MAX_REPORTS = 10;
const FIELD_MAX = 300;

type Raw = Record<string, unknown>;
const isRaw = (value: unknown): value is Raw => typeof value === 'object' && value !== null;
const first = (report: Raw, ...keys: string[]) => keys.map((key) => report[key]).find((value) => value !== undefined);
const text = (value: unknown) => (typeof value === 'string' && value !== '' ? value.slice(0, FIELD_MAX) : undefined);
const count = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);

/**
 * "https://a.test/x?y=1#z" becomes "https://a.test/x". A query string or fragment can carry personal data, so it never
 * reaches the log. Keywords the browser reports ("inline", "eval") pass through as they are.
 */
function withoutQuery(value: unknown): string | undefined {
  const raw = text(value);
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    return url.protocol === 'data:' ? 'data:' : `${url.origin}${url.pathname}`;
  } catch {
    return raw.replace(/[?#].*$/, '');
  }
}

/** Reads both report shapes: the legacy report-uri one ({"csp-report": {...}}) and the Reporting API one ({"body": {...}}). */
function normalise(entry: unknown) {
  if (!isRaw(entry)) return null;
  const report = entry['csp-report'] ?? entry.body ?? entry;
  if (!isRaw(report)) return null;
  return {
    directive: text(first(report, 'effective-directive', 'effectiveDirective', 'violated-directive', 'violatedDirective')),
    blocked: withoutQuery(first(report, 'blocked-uri', 'blockedURL', 'blockedUri')),
    document: withoutQuery(first(report, 'document-uri', 'documentURL', 'documentUri')),
    source: withoutQuery(first(report, 'source-file', 'sourceFile')),
    line: count(first(report, 'line-number', 'lineNumber')),
    column: count(first(report, 'column-number', 'columnNumber')),
    disposition: text(report.disposition),
  };
}

const done = (status: number) => new Response(null, { status, headers: { 'Cache-Control': 'no-store' } });

/**
 * Receives Content-Security-Policy(-Report-Only) violation reports (docs/adr/0001-csp-report-only.md) and writes one
 * JSON line per report to the server log. Only a short allow-list of fields is kept: no query strings, no policy text,
 * no script samples, no client address. Always answers without a body. The coarse per-address limit in proxy.ts applies.
 */
export async function POST(request: Request) {
  const type = (request.headers.get('content-type') ?? '').toLowerCase();
  if (!type.includes('json') && !type.includes('csp-report')) return done(415);
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return done(413);

  // content-length can be absent or lie (chunked bodies), so the real size is checked again after reading.
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return done(413);

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return done(400);
  }

  for (const entry of (Array.isArray(json) ? json : [json]).slice(0, MAX_REPORTS)) {
    const report = normalise(entry);
    // One JSON.stringify per line: newlines inside a value are escaped, so a report cannot forge extra log lines.
    if (report) console.warn(`[csp-report] ${JSON.stringify(report)}`);
  }
  return done(204);
}
