import { z } from 'zod';
import { routing } from '@/i18n/routing';
import { BUDGETS, LIMITS, PROJECT_TYPES, ROLES, TIMELINES, type FieldCode, type FieldErrors, type FieldName } from '@/lib/briefing';
import { hasControlChars } from '@/lib/text-safety';

/**
 * Server-side briefing contract (zod). Used only by the API route: it never reaches the browser bundle
 * (the browser uses the dependency-free validator in lib/briefing.ts).
 * The object is strict: unknown keys are rejected instead of silently passed on to the webhook.
 */

/** Single-line fields must not contain control characters or line breaks (header/log injection). Only the message may span lines. */
const singleLine = (value: string) => !/[\r\n\t]/.test(value) && !hasControlChars(value);

export const briefingSchema = z.strictObject({
  projectType: z.enum(PROJECT_TYPES),
  budget: z.enum(BUDGETS),
  timeline: z.enum(TIMELINES),
  name: z.string().trim().min(LIMITS.name.min).max(LIMITS.name.max).refine(singleLine),
  company: z.string().trim().min(LIMITS.company.min).max(LIMITS.company.max).refine(singleLine),
  email: z.string().trim().toLowerCase().max(LIMITS.email.max).pipe(z.email()),
  message: z
    .string()
    .trim()
    .max(LIMITS.message.max)
    .refine((value) => !hasControlChars(value))
    .default(''),
  role: z.enum(ROLES),
  consent: z.literal(true),
  locale: z.enum(routing.locales),
  /** Cloudflare Turnstile response token (absent only in local development without keys). */
  turnstileToken: z.string().max(2048).optional(),
  /** Honeypot: real visitors never see or fill this field. */
  website: z.string().max(200).default(''),
  /** Milliseconds between opening the form's last step and submitting it. Scripts that post instantly are discarded. */
  elapsedMs: z.number().int().min(0).max(86_400_000).optional(),
});

export type BriefingInput = z.infer<typeof briefingSchema>;

const FIELDS: readonly string[] = ['name', 'company', 'email', 'message', 'role', 'consent'] satisfies FieldName[];

/**
 * Turns zod issues into stable codes. Codes (not texts) cross the network, the browser localizes them. `raw` is the parsed
 * request body: a field that is missing or blank is "required", whatever the rule that tripped first.
 */
export function toFieldErrors(error: z.ZodError, raw?: unknown): FieldErrors {
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field !== 'string' || !FIELDS.includes(field)) continue;
    const name = field as FieldName;
    if (out[name]) continue;

    const given = body[name];
    const blank = given === undefined || given === null || (typeof given === 'string' && given.trim() === '');

    let code: FieldCode = 'invalid';
    if (blank && name !== 'consent' && name !== 'message') code = 'required';
    else if (issue.code === 'too_small') code = (issue as { minimum?: number | bigint }).minimum === 1 ? 'required' : 'short';
    else if (issue.code === 'too_big') code = 'long';
    else if (issue.code === 'invalid_format') code = 'email';
    else if (issue.code === 'invalid_value' && name === 'consent') code = 'consent';
    else if (issue.code === 'invalid_type') code = name === 'consent' ? 'consent' : 'required';
    out[name] = code;
  }
  return out;
}
