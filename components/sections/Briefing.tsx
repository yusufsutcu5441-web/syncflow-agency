'use client';

import { ArrowLeft, ArrowRight, LoaderCircle } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react';
import { fill, useClientI18n } from '@/components/i18n/ClientI18n';
import {
  BUDGETS,
  LIMITS,
  PROJECT_TYPES,
  ROLES,
  TIMELINES,
  validateContact,
  type Budget,
  type ContactValues,
  type FieldCode,
  type FieldErrors,
  type ProjectType,
  type Role,
  type Timeline,
} from '@/lib/briefing';
import { CONTACT_EMAIL } from '@/lib/site';

type Status = 'idle' | 'sending' | 'success' | 'error';
type FormError = 'fix' | 'rate' | 'verification' | 'unavailable' | 'generic';

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
  verification: 'errorVerification',
  unavailable: 'errorUnavailable',
  generic: 'errorGeneric',
} as const satisfies Record<FormError, string>;

const TOTAL = 4;

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let turnstileLoading: Promise<TurnstileApi> | undefined;
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  turnstileLoading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile missing')));
    script.onerror = () => {
      turnstileLoading = undefined;
      reject(new Error('turnstile failed to load'));
    };
    document.head.appendChild(script);
  });
  return turnstileLoading;
}

/**
 * Strategic Briefing (Blueprint section 5): a glass panel with a four-segment progress line, one question per screen,
 * large selectable cards (no input fields until the last step) and a success view. The browser gives instant feedback with a
 * dependency-free validator (lib/briefing.ts); the server (app/api/briefing) validates with zod, checks Turnstile, sanitises,
 * rate-limits and classifies again and is the only check that is trusted. Nothing is stored in the browser (no cookies,
 * no storage): an unfinished briefing is gone when the tab closes.
 *
 * Smooth scrolling is off here (the panel carries data-lenis-prevent): the application flow scrolls natively (CLAUDE.md).
 * If delivery fails (no webhook, server error) the visitor is offered a prepared e-mail instead of losing the answers.
 */
export function Briefing({ privacyHref, turnstileSiteKey }: { privacyHref: string; turnstileSiteKey?: string }) {
  const { locale, messages } = useClientI18n();
  const t = messages.Briefing;
  const formId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const turnstileBox = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string>(undefined);
  const lastStepAt = useRef(0);
  const firstRender = useRef(true);

  const [step, setStep] = useState(1);
  const [status, setStatus] = useState<Status>('idle');
  const [formError, setFormError] = useState<FormError | null>(null);
  const [pickError, setPickError] = useState(false);
  const [devOnly, setDevOnly] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [projectType, setProjectType] = useState<ProjectType | ''>('');
  const [budget, setBudget] = useState<Budget | ''>('');
  const [timeline, setTimeline] = useState<Timeline | ''>('');
  const [values, setValues] = useState<ContactValues>({ name: '', company: '', email: '', message: '', role: '', consent: false });
  const [website, setWebsite] = useState('');
  const [token, setToken] = useState('');

  const setField = <K extends keyof ContactValues>(key: K, value: ContactValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    if (key in errors) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  // After a step change (and on the success view) the heading takes focus, so keyboard and screen-reader users land on
  // the new question. A failed send does not move focus: the error message is announced where the visitor is.
  const succeeded = status === 'success';
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus({ preventScroll: true });
  }, [step, succeeded]);

  // The last step: remember when it opened (instant submits are bots) and load the Turnstile widget.
  useEffect(() => {
    if (step !== TOTAL || status === 'success') return;
    lastStepAt.current = Date.now();
    if (!turnstileSiteKey) return;
    let cancelled = false;
    void loadTurnstile()
      .then((api) => {
        if (cancelled || !turnstileBox.current || widgetId.current) return;
        widgetId.current = api.render(turnstileBox.current, {
          sitekey: turnstileSiteKey,
          theme: 'dark',
          language: 'auto',
          callback: (value: string) => setToken(value),
          'expired-callback': () => setToken(''),
          'error-callback': () => setToken(''),
        });
      })
      .catch(() => setToken(''));
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = undefined;
    };
  }, [step, status, turnstileSiteKey]);

  const answered = step === 1 ? projectType : step === 2 ? budget : step === 3 ? timeline : 'done';

  const next = () => {
    if (!answered) {
      setPickError(true);
      return;
    }
    setPickError(false);
    setStep((current) => Math.min(TOTAL, current + 1));
  };
  const back = () => {
    setPickError(false);
    setFormError(null);
    setStep((current) => Math.max(1, current - 1));
  };

  const mailto = useCallback(() => {
    const line = (label: string, value: string) => `${label}: ${value}`;
    const body = [
      line(t.mailProject, projectType ? t.step1[projectType] : ''),
      line(t.mailBudget, budget ? t.step2[budget] : ''),
      line(t.mailTiming, timeline ? t.step3[timeline] : ''),
      line(t.mailRole, values.role ? t.step4[values.role] : ''),
      line(t.mailName, values.name.trim()),
      line(t.mailCompany, values.company.trim()),
      line(t.mailEmail, values.email.trim()),
      line(t.mailMessage, values.message.trim()),
    ].join('\n');
    return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(t.mailSubject)}&body=${encodeURIComponent(body)}`;
  }, [t, projectType, budget, timeline, values]);

  const focusFirstInvalid = () =>
    requestAnimationFrame(() => document.getElementById(formId)?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"]')?.focus());

  const submit = async () => {
    if (status === 'sending' || !projectType || !budget || !timeline) return;

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
      const response = await fetch('/api/briefing', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          projectType,
          budget,
          timeline,
          name: values.name.trim(),
          company: values.company.trim(),
          email: values.email.trim().toLowerCase(),
          message: values.message.trim(),
          role: values.role,
          consent: true,
          locale,
          website,
          turnstileToken: token || undefined,
          elapsedMs: Math.max(0, Date.now() - lastStepAt.current),
        }),
      });
      const data = (await response.json().catch(() => null)) as { ok?: boolean; code?: string; fields?: FieldErrors; devOnly?: boolean } | null;

      if (response.ok && data?.ok) {
        setDevOnly(Boolean(data.devOnly));
        setStatus('success');
        return;
      }
      if (response.status === 422 && data?.fields) {
        setErrors(data.fields);
        setFormError('fix');
        focusFirstInvalid();
      } else if (response.status === 429) setFormError('rate');
      else if (data?.code === 'verification') {
        setFormError('verification');
        setToken('');
        if (widgetId.current) window.turnstile?.reset(widgetId.current);
      } else if (response.status === 503 || response.status === 502) setFormError('unavailable');
      else setFormError('generic');
      setStatus('error');
    } catch {
      setFormError('unavailable');
      setStatus('error');
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step < TOTAL) next();
    else void submit();
  };

  const message = (field: keyof FieldErrors) => {
    const code = errors[field];
    return code ? t[FIELD_MESSAGE[code]] : null;
  };

  const progress = (
    <div className="progress" aria-hidden="true">
      {Array.from({ length: TOTAL }, (_, index) => (
        <span key={index} className="progress-seg" data-done={status === 'success' || index < step} />
      ))}
    </div>
  );

  if (status === 'success') {
    const [before = '', after = ''] = t.successBody.split('{email}');
    return (
      <div className="panel panel-done mx-auto mt-14 max-w-[720px] p-8 md:p-12" data-lenis-prevent="">
        {progress}
        <div className="mt-12 flex flex-col items-center text-center" role="status" aria-live="polite">
          <svg width="76" height="76" viewBox="0 0 76 76" fill="none" aria-hidden="true">
            <circle cx="38" cy="38" r="35" className="check-ring" strokeWidth="1.5" />
            <path d="M24 39.5l9.5 9.5L52 29" className="check-ring" strokeWidth="1.5" />
          </svg>
          <h3 ref={headingRef} tabIndex={-1} className="text-headline mt-8 outline-none">
            {t.successTitle}
          </h3>
          <p className="lead mt-5 max-w-xl">
            {before}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-ink underline decoration-white/30 underline-offset-4 hover:decoration-white" dir="ltr">
              {CONTACT_EMAIL}
            </a>
            {after}
          </p>
          <Link href="#showcase" prefetch={false} className="btn btn-ghost mt-9">
            {t.successLink}
            <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" className="icon-dir" />
          </Link>
          {devOnly ? <p className="mt-6 max-w-md text-sm text-faint">{t.devOnly}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <form id={formId} onSubmit={onSubmit} noValidate className="panel mx-auto mt-14 max-w-[720px] p-6 md:p-10" data-lenis-prevent="" aria-label={t.panelLabel}>
      {progress}

      <p className="label mt-8" aria-live="polite">
        {fill(t.stepOf, { current: step, total: TOTAL })}
      </p>

      <div key={step} className="step-in mt-4">
        {step === 1 ? (
          <Choice
            title={t.step1.title}
            lead={t.step1.lead}
            headingRef={headingRef}
            name="projectType"
            value={projectType}
            onChange={(v) => {
              setProjectType(v as ProjectType);
              setPickError(false);
            }}
            options={PROJECT_TYPES.map((id) => ({ id, title: t.step1[id], desc: t.step1[`${id}Desc`] }))}
          />
        ) : null}

        {step === 2 ? (
          <Choice
            title={t.step2.title}
            lead={t.step2.lead}
            headingRef={headingRef}
            name="budget"
            value={budget}
            onChange={(v) => {
              setBudget(v as Budget);
              setPickError(false);
            }}
            options={BUDGETS.map((id) => ({ id, title: t.step2[id], desc: t.step2[`${id}Desc`] }))}
            footnote={t.step2.micro}
          />
        ) : null}

        {step === 3 ? (
          <Choice
            title={t.step3.title}
            lead={t.step3.lead}
            headingRef={headingRef}
            name="timeline"
            value={timeline}
            onChange={(v) => {
              setTimeline(v as Timeline);
              setPickError(false);
            }}
            options={TIMELINES.map((id) => ({ id, title: t.step3[id], desc: t.step3[`${id}Desc`] }))}
          />
        ) : null}

        {step === 4 ? (
          <div>
            <h3 ref={headingRef} tabIndex={-1} className="text-headline outline-none">
              {t.step4.title}
            </h3>
            <p className="body-muted mt-3">{t.step4.lead}</p>

            <div className="mt-9 grid gap-7">
              <Field id={`${formId}-name`} label={t.step4.name} error={message('name')}>
                <input
                  id={`${formId}-name`}
                  className="field-line"
                  type="text"
                  autoComplete="name"
                  maxLength={LIMITS.name.max}
                  value={values.name}
                  onChange={(e) => setField('name', e.target.value)}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? `${formId}-name-error` : undefined}
                  required
                />
              </Field>
              <Field id={`${formId}-company`} label={t.step4.company} error={message('company')}>
                <input
                  id={`${formId}-company`}
                  className="field-line"
                  type="text"
                  autoComplete="organization-title"
                  maxLength={LIMITS.company.max}
                  value={values.company}
                  onChange={(e) => setField('company', e.target.value)}
                  aria-invalid={Boolean(errors.company)}
                  aria-describedby={errors.company ? `${formId}-company-error` : undefined}
                  required
                />
              </Field>
              <Field id={`${formId}-email`} label={t.step4.email} error={message('email')}>
                <input
                  id={`${formId}-email`}
                  className="field-line"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  dir="ltr"
                  maxLength={LIMITS.email.max}
                  value={values.email}
                  onChange={(e) => setField('email', e.target.value)}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? `${formId}-email-error` : undefined}
                  required
                />
              </Field>
              <Field id={`${formId}-message`} label={t.step4.message} error={message('message')}>
                <input
                  id={`${formId}-message`}
                  className="field-line"
                  type="text"
                  maxLength={LIMITS.message.max}
                  value={values.message}
                  onChange={(e) => setField('message', e.target.value)}
                  aria-invalid={Boolean(errors.message)}
                  aria-describedby={errors.message ? `${formId}-message-error` : undefined}
                />
              </Field>

              <fieldset aria-describedby={errors.role ? `${formId}-role-error` : undefined}>
                <legend className="field-label">{t.step4.role}</legend>
                <div className="role-chips mt-3">
                  {ROLES.map((id: Role, index) => (
                    <label key={id} className="role-chip">
                      <input
                        type="radio"
                        name="role"
                        value={id}
                        checked={values.role === id}
                        onChange={() => setField('role', id)}
                        data-invalid={index === 0 && errors.role ? 'true' : undefined}
                      />
                      <span>{t.step4[id]}</span>
                    </label>
                  ))}
                </div>
                {errors.role ? (
                  <p id={`${formId}-role-error`} className="field-error">
                    {message('role')}
                  </p>
                ) : null}
              </fieldset>
            </div>

            {/* Honeypot: invisible and unreachable for people (and assistive tech), tempting for form-filling bots. */}
            <div aria-hidden="true" className="absolute start-[-9999px] h-0 w-0 overflow-hidden">
              <label>
                {t.step4.honeypot}
                <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </label>
            </div>

            <div className="mt-9">
              <label className="flex cursor-pointer items-start gap-3 text-sm text-muted">
                <input
                  type="checkbox"
                  className="field-check"
                  checked={values.consent}
                  onChange={(e) => setField('consent', e.target.checked)}
                  aria-invalid={Boolean(errors.consent)}
                  aria-describedby={errors.consent ? `${formId}-consent-error` : undefined}
                />
                <span>
                  {t.step4.consent}{' '}
                  <Link href={privacyHref} prefetch={false} className="text-ink underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-white">
                    {t.step4.consentLink}
                  </Link>
                </span>
              </label>
              {errors.consent ? (
                <p id={`${formId}-consent-error`} className="field-error">
                  {message('consent')}
                </p>
              ) : null}
              <p className="mt-4 text-xs leading-relaxed text-faint">{t.step4.micro}</p>
            </div>

            {turnstileSiteKey ? <div ref={turnstileBox} className="mt-6 min-h-[65px]" aria-label={t.step4.securityCheck} /> : null}
          </div>
        ) : null}
      </div>

      <div className="mt-8 min-h-6 text-sm text-ink" role="status" aria-live="polite">
        {pickError ? t.choose : null}
        {formError ? t[FORM_ERROR_MESSAGE[formError]] : null}
        {formError === 'unavailable' || formError === 'generic' ? (
          <span className="mt-2 block text-muted">
            {t.fallbackIntro}{' '}
            <a href={mailto()} className="text-ink underline decoration-white/30 underline-offset-4 hover:decoration-white">
              {t.fallbackLink}
            </a>
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        {step > 1 ? (
          <button type="button" className="btn btn-ghost" onClick={back}>
            <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" className="icon-dir" />
            {t.back}
          </button>
        ) : (
          <span />
        )}
        {step < TOTAL ? (
          <button type="submit" className="btn btn-primary">
            {t.next}
            <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" className="icon-dir" />
          </button>
        ) : (
          <button type="submit" className="btn btn-primary" disabled={status === 'sending'}>
            {status === 'sending' ? (
              <>
                <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                {t.sending}
              </>
            ) : (
              <>
                {t.submit}
                <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" className="icon-dir" />
              </>
            )}
          </button>
        )}
      </div>
    </form>
  );
}

function Choice({
  title,
  lead,
  headingRef,
  name,
  value,
  onChange,
  options,
  footnote,
}: {
  title: string;
  lead: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ id: string; title: string; desc: string }>;
  footnote?: string;
}) {
  return (
    <fieldset>
      <legend className="sr-only">{title}</legend>
      <h3 ref={headingRef} tabIndex={-1} className="text-headline outline-none">
        {title}
      </h3>
      <p className="body-muted mt-3">{lead}</p>
      <div className="opts mt-8">
        {options.map((option) => (
          <label key={option.id} className="opt">
            <input type="radio" name={name} value={option.id} checked={value === option.id} onChange={() => onChange(option.id)} />
            <span className="opt-body">
              <span className="opt-title">{option.title}</span>
              <span className="opt-desc">{option.desc}</span>
            </span>
          </label>
        ))}
      </div>
      {footnote ? <p className="mt-5 text-xs text-faint">{footnote}</p> : null}
    </fieldset>
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
