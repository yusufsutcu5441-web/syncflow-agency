import 'server-only';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { stripControlChars, stripInvisibleChars } from '@/lib/text-safety';

/**
 * Plain-text sanitiser for user input (name, company, message). Every field is treated as TEXT, never as HTML.
 *
 *   1. Control characters and invisible / bidirectional-override characters ("Trojan Source") are removed.
 *   2. Harmless angle-bracket conventions are unwrapped: "Jane <jane@acme.com>" and "<https://acme.com>" become
 *      plain text, so a real visitor who pastes an email signature loses nothing.
 *   3. Anything that still looks like an HTML tag, comment or processing instruction is REJECTED (returns null; the
 *      route answers 422 "invalid"). Explicit beats silent: an HTML parser would swallow everything after an
 *      unterminated "<svg", and a visitor would lose half a message without knowing.
 *   4. What remains goes through DOMPurify (ALLOWED_TAGS: [], in a jsdom window) as the authoritative last line of
 *      defence, the text is read back (entities decoded) and every remaining angle bracket is dropped. Nothing that
 *      comes out can re-form markup downstream.
 *
 * The result is safe as plain text. If it is ever rendered as HTML anywhere, that renderer must still escape it.
 */

let purifier: ReturnType<typeof createDOMPurify> | undefined;

function getPurifier() {
  // Lazy: building a jsdom window costs ~100 ms, so only the first contact request pays for it.
  purifier ??= createDOMPurify(new JSDOM('').window as unknown as Parameters<typeof createDOMPurify>[0]);
  return purifier;
}

/** <jane@acme.com> and <https://acme.com/x>: angle brackets used as delimiters, not as markup. */
const BENIGN_BRACKETS = /<((?:https?:\/\/[^\s<>]+)|(?:[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+))>/g;
/** An opening/closing tag (<b, </p, <svg onload=...), a comment/doctype (<!), or a processing instruction (<?). */
const TAG_LIKE = /<\/?[a-zA-Z][^>]*>?|<[!?]/;

export function toPlainText(input: string, { multiline = false }: { multiline?: boolean } = {}): string | null {
  const prepared = stripInvisibleChars(stripControlChars(input.normalize('NFC'))).replace(BENIGN_BRACKETS, '$1');
  if (TAG_LIKE.test(prepared)) return null;

  const body = getPurifier().sanitize(prepared, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    RETURN_DOM: true,
  }) as unknown as HTMLElement;

  const text = (body.textContent ?? '').replace(/[<>]/g, '');

  if (multiline) {
    // Keep paragraph breaks, collapse everything else.
    return text
      .replace(/\r\n?/g, '\n')
      .replace(/[^\S\n]+/g, ' ')
      .replace(/ ?\n ?/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
  return text.replace(/\s+/g, ' ').trim();
}
