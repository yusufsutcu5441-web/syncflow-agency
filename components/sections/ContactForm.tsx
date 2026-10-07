'use client';

import { ArrowUpRight, Check, LoaderCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useClientI18n } from '@/components/i18n/ClientI18n';
import { LIMITS, validateContact, type FieldCode, type FieldErrors } from '@/lib/schemas/contact-fields';
import { clsx } from 'clsx';

type Status = 'idle' | 'sending' | 'success' | 'error';
type FormError = 'fix' | 'rate' | 'unavailable' | 'generic';

const FIELD_MESSAGE = {
  required: 'fieldRequired',
  email: 'fieldEmail',
  short: 'fieldShort',
  long: 'fieldLong',
  consent: 'fieldConsent',
  invalid: 'fieldInvalid',
} as const satisfies Record<FieldCode, string>;

const FORM_ERROR_MESSAGE = {
  fix: 'errorFix',
  rate: 'errorRate',
  unavailable: 'errorUnavailable',
  generic: 'errorGeneric',
} as const satisfies Record<FormError, string>;

const EMPTY = { name: '', email: '', company: '', message: '', consent: false, website: '' };

/**
 * Contact form. The browser gives instant feedback with a small dependency-free validator (no zod in the bundle);
 * the server validates (zod, strict), sanitises (DOMPurify) and rate-limits again, and is the only check that is
 * trusted. Server answers carry stable error codes, which are turned into text here, in the visitor's language.
 *
 * Strings are plain lookups from the small client context (see components/i18n/ClientI18n.tsx): none of
 * next-intl's ICU message engine is needed in the browser, which keeps it out of the JavaScript payload.
 */
export function ContactForm({ privacyHref }: { privacyHref: string }) {
  const { locale, messages } = useClientI18n();
  const t = messages.Contact;
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const openedAt = useRef(0);

  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>('idle');
  const [formError, setFormError] = useState<FormError | null>(null);

  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  const set = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    if (key in errors) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const focusFirstInvalid = () =>
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === 'sending') return;

    const found = validateContact(values);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setFormError('fix');
      setStatus('error');
      focusFirstInvalid();
      return;
    }

    setErrors({});
    setFormError(null);
    setStatus('sending');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim().toLowerCase(),
          company: values.company.trim(),
          message: values.message.trim(),
          consent: true,
          locale,
          website: values.website,
          elapsedMs: Math.max(0, Date.now() - openedAt.current),
        }),
      });
      const data = (await response.json().catch(() => null)) as { ok?: boolean; fields?: FieldErrors } | null;

      if (response.ok && data?.ok) {
        setValues(EMPTY);
        setStatus('success');
        return;
      }
      if (response.status === 422 && data?.fields) {
        setErrors(data.fields);
        setFormError('fix');
        focusFirstInvalid();
      } else if (response.status === 429) setFormError('rate');
      else if (response.status === 503) setFormError('unavailable');
      else setFormError('generic');
      setStatus('error');
    } catch {
      setFormError('generic');
      setStatus('error');
    }
  };

  const message = (field: keyof FieldErrors) => {
    const code = errors[field];
    return code ? t[FIELD_MESSAGE[code]] : null;
  };

  if (status === 'success') {
    return (
      <div className="glass flex min-h-[26rem] flex-col items-start justify-center gap-5 p-8 md:p-10" role="status" aria-live="polite">
        <span className="grid size-12 place-items-center rounded-sharp border border-hairline-strong bg-layer-2">
          <Check size={22} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <p className="text-headline">{t.success}</p>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="glass grid gap-5 p-6 md:p-9" aria-labelledby={`${formId}-title`}>
      <p id={`${formId}-title`} className="sr-only">
        {t.title}
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={`${formId}-name`} label={t.name} error={message('name')}>
          <input
            id={`${formId}-name`}
            className="field-input"
            type="text"
            name="name"
            autoComplete="name"
            maxLength={LIMITS.name.max}
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `${formId}-name-error` : undefined}
            required
          />
        </Field>
        <Field id={`${formId}-email`} label={t.email} error={message('email')}>
          <input
            id={`${formId}-email`}
            className="field-input"
            type="email"
            name="email"
            inputMode="email"
            autoComplete="email"
            maxLength={LIMITS.email.max}
            value={values.email}
            onChange={(e) => set('email', e.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? `${formId}-email-error` : undefined}
            required
          />
        </Field>
      </div>

      <Field id={`${formId}-company`} label={t.company} error={message('company')}>
        <input
          id={`${formId}-company`}
          className="field-input"
          type="text"
          name="company"
          autoComplete="organization"
          maxLength={LIMITS.company.max}
          value={values.company}
          onChange={(e) => set('company', e.target.value)}
          aria-invalid={Boolean(errors.company)}
          aria-describedby={errors.company ? `${formId}-company-error` : undefined}
        />
      </Field>

      <Field id={`${formId}-message`} label={t.message} error={message('message')}>
        <textarea
          id={`${formId}-message`}
          className="field-input min-h-36 resize-y"
          name="message"
          rows={5}
          maxLength={LIMITS.message.max}
          value={values.message}
          onChange={(e) => set('message', e.target.value)}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? `${formId}-message-error` : undefined}
          required
        />
      </Field>

      {/* Honeypot: invisible and unreachable for people (and assistive tech), tempting for form-filling bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          {t.honeypot}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={(e) => set('website', e.target.value)} />
        </label>
      </div>

      <div>
        <label className="flex cursor-pointer items-start gap-3 text-sm text-muted">
          <input
            type="checkbox"
            name="consent"
            className="field-check mt-0.5 shrink-0"
            checked={values.consent}
            onChange={(e) => set('consent', e.target.checked)}
            aria-invalid={Boolean(errors.consent)}
            aria-describedby={errors.consent ? `${formId}-consent-error` : undefined}
          />
          <span>
            {t.consent}{' '}
            <Link href={privacyHref} prefetch={false} className="text-platin underline decoration-platin/30 underline-offset-4 transition-colors hover:decoration-platin">
              {t.consentLink}
            </Link>
          </span>
        </label>
        {errors.consent ? (
          <p id={`${formId}-consent-error`} className="field-error">
            {message('consent')}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <button type="submit" className={clsx('btn btn-primary', status === 'sending' && 'pointer-events-none opacity-80')} disabled={status === 'sending'}>
          {status === 'sending' ? (
            <>
              <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
              {t.sending}
            </>
          ) : (
            <>
              {t.submit}
              <ArrowUpRight size={18} strokeWidth={2} aria-hidden="true" />
            </>
          )}
        </button>
        <p role="status" aria-live="polite" className="min-h-6 text-sm text-platin">
          {formError ? t[FORM_ERROR_MESSAGE[formError]] : null}
        </p>
      </div>
    </form>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error: string | null; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
