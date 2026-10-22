/**
 * mailto: links (RFC 6068), built in one place. A plain module with no imports: the site's call-to-action links (lib/contact.ts) and their unit test
 * (tests/delivery/mailto.test.mjs, run by `npm run delivery:verify`) use the same code.
 *
 *  - Subject and body are percent-encoded as UTF-8. Beyond what encodeURIComponent does, the five characters it leaves bare ( ! ' ( ) * ) are encoded too,
 *    so no mail client or URL parser has to guess whether they belong to the link or to the text.
 *  - Every line break of the body is written %0D%0A (RFC 6068 section 5: line breaks in the body "MUST be encoded with %0D%0A"). A bare %0A or %0D never
 *    appears, whatever kind of line break the source text used.
 *  - A subject is one line: a line break inside it becomes a single space (nothing in it can start a second header).
 *  - The address keeps its readable characters (letters, digits and @ . + _ - ~); anything else is percent-encoded, so an address that carries a
 *    ? & # % or = cannot change the shape of the link.
 *
 * The free site audit request (docs/adr/0035-sales-ready-release.md): the subject and the two prompts of the body are English on purpose, the inbox is
 * read in English whatever language the page is in. Only the button label is translated (Contact.auditCta).
 */
export const AUDIT_SUBJECT = 'Free site audit request';
export const AUDIT_BODY = 'Website URL:\n\nWhat matters most (speed / SEO / mobile / redesign):\n';

const encode = (text: string): string => encodeURIComponent(text).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);

export function buildMailto(address: string, subject?: string, body?: string): string {
  const query: string[] = [];
  if (subject) query.push(`subject=${encode(subject.replace(/\s*[\r\n]+\s*/g, ' ').trim())}`);
  if (body) query.push(`body=${encode(body.replace(/\r\n|\r|\n/g, '\r\n'))}`);
  const to = address.replace(/[^A-Za-z0-9@.+_~-]/g, (char) => encodeURIComponent(char));
  return `mailto:${to}${query.length ? `?${query.join('&')}` : ''}`;
}
