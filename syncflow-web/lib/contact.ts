import { CONTACT_EMAIL } from '@/lib/site';

/**
 * Every mail link on the site is built here, from the one configured address (lib/site.ts, NEXT_PUBLIC_CONTACT_EMAIL). No address is
 * written in the code: when none is configured, `mailtoHref` returns null and callers leave the link out instead of printing a dead one.
 *
 * The free site audit request (docs/adr/0035-sales-ready-release.md): the subject and the two prompts of the body are English on purpose,
 * the inbox is read in English whatever language the page is in. Only the button label is translated (Contact.auditCta).
 */
export const HAS_CONTACT = CONTACT_EMAIL !== '';

export const AUDIT_SUBJECT = 'Free site audit request';
export const AUDIT_BODY = 'Website URL:\n\nWhat matters most (speed / SEO / mobile / redesign):\n';

export function mailtoHref(subject?: string, body?: string): string | null {
  if (!HAS_CONTACT) return null;
  const query = [subject ? `subject=${encodeURIComponent(subject)}` : '', body ? `body=${encodeURIComponent(body)}` : ''].filter(Boolean).join('&');
  return `mailto:${CONTACT_EMAIL}${query ? `?${query}` : ''}`;
}

/** "Request a free 1-page site audit": a mail with the subject and the two prompts already in it. */
export const auditHref = (): string | null => mailtoHref(AUDIT_SUBJECT, AUDIT_BODY);

/** A plain mail to the studio, nothing prefilled. */
export const writeHref = (): string | null => mailtoHref();
