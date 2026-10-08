/**
 * Only the namespaces a client component actually reads are sent to the browser. Every other string stays on
 * the server, which keeps the JavaScript payload (and the HTML) small.
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(source: T, keys: readonly K[]): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const key of keys) out[key] = source[key];
  return out;
}
