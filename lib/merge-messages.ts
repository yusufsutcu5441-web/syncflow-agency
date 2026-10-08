type Messages = { [key: string]: string | Messages };

/**
 * Draft languages carry only the text that was translated; whatever is missing (the legal pages, a late-added string)
 * falls back to English instead of showing a raw key or crashing the page. Own values always win over the fallback.
 */
export function mergeMessages(fallback: Messages, own: Messages): Messages {
  const out: Messages = { ...fallback };
  for (const [key, value] of Object.entries(own)) {
    const base = out[key];
    out[key] = typeof value === 'object' && typeof base === 'object' ? mergeMessages(base, value) : value;
  }
  return out;
}
