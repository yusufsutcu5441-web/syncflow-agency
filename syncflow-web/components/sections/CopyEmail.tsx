'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useClientI18n } from '@/components/i18n/ClientI18n';

/**
 * The direct-contact address: a mailto link with a copy button beside it. After copying, the button says "Copied ✓"
 * for a moment and the change is announced politely. Without clipboard access the link still works.
 */
export function CopyEmail({ email }: { email: string }) {
  const { messages } = useClientI18n();
  const t = messages.Closing;
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the mailto link beside the button still works */
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <a href={`mailto:${email}`} dir="ltr" className="text-title underline decoration-ink/25 underline-offset-[6px] transition-colors hover:decoration-ink md:text-[clamp(1.5rem,2.4vw,2.25rem)]">
        {email}
      </a>
      <button type="button" className="btn btn-ghost btn-sm" onClick={copy} aria-label={t.copyLabel}>
        {copied ? <Check size={14} strokeWidth={1.75} aria-hidden="true" /> : <Copy size={14} strokeWidth={1.75} aria-hidden="true" />}
        <span aria-live="polite">{copied ? t.copied : t.copy}</span>
      </button>
    </div>
  );
}
