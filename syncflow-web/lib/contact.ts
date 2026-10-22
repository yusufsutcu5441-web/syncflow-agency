import { AUDIT_BODY, AUDIT_SUBJECT, buildMailto } from '@/lib/mailto';
import { CONTACT_EMAIL } from '@/lib/site';

/**
 * Every mail link on the site is built here, from the one configured address (lib/site.ts, NEXT_PUBLIC_CONTACT_EMAIL) by the encoder in lib/mailto.ts.
 * No address is written in the code: when none is configured, `mailtoHref` returns null and callers leave the link out instead of printing a dead one.
 * The address is also printed as plain text next to the main calls to action (hero, footer, the closing action of a case page), for a visitor whose
 * browser opens no mail program.
 */
export const HAS_CONTACT = CONTACT_EMAIL !== '';

export { AUDIT_BODY, AUDIT_SUBJECT };

export function mailtoHref(subject?: string, body?: string): string | null {
  return HAS_CONTACT ? buildMailto(CONTACT_EMAIL, subject, body) : null;
}

/** "Request a free 1-page site audit": a mail with the subject and the two prompts already in it. */
export const auditHref = (): string | null => mailtoHref(AUDIT_SUBJECT, AUDIT_BODY);

/** A plain mail to the studio, nothing prefilled. */
export const writeHref = (): string | null => mailtoHref();
