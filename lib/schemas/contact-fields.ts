/**
 * Contact form rules that the BROWSER needs: limits, error codes and a small dependency-free validator that gives
 * instant feedback. It deliberately does not import zod, so none of zod ships to visitors.
 *
 * The authoritative check is lib/schemas/contact.ts (zod, strict object) plus lib/server/sanitize.ts, which run in
 * the API route. Anything this file lets through that the server rejects comes back as a 422 with the same codes.
 */

export const LIMITS = {
  name: { min: 2, max: 80 },
  email: { max: 254 },
  company: { max: 100 },
  message: { min: 10, max: 2000 },
} as const;

export type FieldCode = 'required' | 'email' | 'short' | 'long' | 'consent' | 'invalid';
export type FieldErrors = Partial<Record<'name' | 'email' | 'company' | 'message' | 'consent', FieldCode>>;

export type ContactValues = {
  name: string;
  email: string;
  company: string;
  message: string;
  consent: boolean;
};

// Pragmatic shape check (something@domain.tld, no spaces or markup characters). The server applies zod's stricter rule.
const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

export function validateContact(values: ContactValues): FieldErrors {
  const errors: FieldErrors = {};

  const name = values.name.trim();
  if (!name) errors.name = 'required';
  else if (name.length < LIMITS.name.min) errors.name = 'short';
  else if (name.length > LIMITS.name.max) errors.name = 'long';

  const email = values.email.trim();
  if (!email) errors.email = 'required';
  else if (email.length > LIMITS.email.max || !EMAIL.test(email)) errors.email = 'email';

  if (values.company.trim().length > LIMITS.company.max) errors.company = 'long';

  const message = values.message.trim();
  if (!message) errors.message = 'required';
  else if (message.length < LIMITS.message.min) errors.message = 'short';
  else if (message.length > LIMITS.message.max) errors.message = 'long';

  if (!values.consent) errors.consent = 'consent';

  return errors;
}
