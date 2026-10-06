import { z } from 'zod';
import { routing } from '@/i18n/routing';
import { hasControlChars } from '@/lib/text-safety';
import { LIMITS, type FieldCode, type FieldErrors } from './contact-fields';

/**
 * Server-side contact contract (zod). Used only by the API route: it never reaches the browser bundle
 * (the browser uses the dependency-free validator in ./contact-fields).
 * The object is strict: unknown keys are rejected instead of silently passed on to the webhook.
 */

/** Single-line fields must not contain control characters or line breaks (header/log injection). Only the message may span lines. */
const singleLine = (value: string) => !/[\r\n\t]/.test(value) && !hasControlChars(value);

export const contactSchema = z.strictObject({
  name: z.string().trim().min(LIMITS.name.min).max(LIMITS.name.max).refine(singleLine),
  email: z.string().trim().toLowerCase().max(LIMITS.email.max).pipe(z.email()),
  company: z.string().trim().max(LIMITS.company.max).refine(singleLine).default(''),
  message: z.string().trim().min(LIMITS.message.min).max(LIMITS.message.max).refine((value) => !hasControlChars(value)),
  consent: z.literal(true),
  locale: z.enum(routing.locales),
  /** Honeypot: real visitors never see or fill this field. */
  website: z.string().max(200).default(''),
  /** Milliseconds between opening the form and submitting it. Scripts that post instantly are discarded. */
  elapsedMs: z.number().int().min(0).max(86_400_000).optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;

/** Turns zod issues into stable codes. Codes (not texts) cross the network, the browser localizes them. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (field !== 'name' && field !== 'email' && field !== 'company' && field !== 'message' && field !== 'consent') continue;
    if (out[field]) continue;

    let code: FieldCode = 'invalid';
    if (issue.code === 'too_small') code = (issue as { minimum?: number | bigint }).minimum === 1 ? 'required' : 'short';
    else if (issue.code === 'too_big') code = 'long';
    else if (issue.code === 'invalid_format') code = 'email';
    else if (issue.code === 'invalid_value' && field === 'consent') code = 'consent';
    else if (issue.code === 'invalid_type') code = field === 'consent' ? 'consent' : 'required';
    out[field] = code;
  }
  return out;
}
