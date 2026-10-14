/**
 * Strategic Briefing rules that the BROWSER needs: the answer options, the field limits, error codes, a small
 * dependency-free validator for instant feedback, and the priority class. It deliberately does not import zod, so none of
 * zod ships to visitors.
 *
 * The authoritative check is lib/schemas/briefing.ts (zod, strict object) plus lib/server/sanitize.ts, which run in the
 * API route. Anything this file lets through that the server rejects comes back as a 422 with the same codes. The
 * priority class is computed again on the server; what the browser sends about it is never trusted.
 */

export const PROJECT_TYPES = ['showcase', 'platform', 'law', 'unsure'] as const;
/**
 * The budget bands above the minimum (lib/pricing.ts: t1 = 1x to 2x the minimum, t2 = 2x to 5x, t3 = 5x and above), in the currency of the
 * visitor's market. There is deliberately no code for "below the minimum" and no "let's talk first": a request under the minimum is declined
 * in the browser before anything is sent, and the server refuses any other value (docs/adr/0016-qualification-and-markets.md).
 */
export const BUDGETS = ['t1', 't2', 't3'] as const;
export const TIMELINES = ['w4', 'w6', 'w10', 'flex'] as const;
export const ROLES = ['decider', 'team', 'exploring'] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];
export type Budget = (typeof BUDGETS)[number];
export type Timeline = (typeof TIMELINES)[number];
export type Role = (typeof ROLES)[number];
export type Tier = 'high' | 'medium';

/**
 * Priority class that decides the e-mail subject prefix. Every request is already at or above the minimum, so there is no "low" class
 * any more: the two upper bands with someone who decides (or sits in the decision team) = high, everything else = medium.
 */
export function classify({ budget, role }: { budget: Budget; role: Role }): Tier {
  if ((budget === 't3' || budget === 't2') && role !== 'exploring') return 'high';
  return 'medium';
}

export const LIMITS = {
  name: { min: 2, max: 80 },
  company: { min: 2, max: 120 },
  email: { max: 254 },
  message: { max: 300 },
} as const;

export type FieldCode = 'required' | 'email' | 'short' | 'long' | 'consent' | 'invalid';
export type FieldName = 'name' | 'company' | 'email' | 'message' | 'role' | 'consent';
export type FieldErrors = Partial<Record<FieldName, FieldCode>>;

export type ContactValues = {
  name: string;
  company: string;
  email: string;
  message: string;
  role: Role | '';
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

  const company = values.company.trim();
  if (!company) errors.company = 'required';
  else if (company.length < LIMITS.company.min) errors.company = 'short';
  else if (company.length > LIMITS.company.max) errors.company = 'long';

  const email = values.email.trim();
  if (!email) errors.email = 'required';
  else if (email.length > LIMITS.email.max || !EMAIL.test(email)) errors.email = 'email';

  if (values.message.trim().length > LIMITS.message.max) errors.message = 'long';
  if (!values.role) errors.role = 'required';
  if (!values.consent) errors.consent = 'consent';

  return errors;
}
