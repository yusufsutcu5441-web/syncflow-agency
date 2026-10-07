import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Editorial section opener: numbered eyebrow, tight display headline, a short lead on the right (desktop). */
export function SectionHead({
  id,
  eyebrow,
  title,
  subtitle,
  stacked = false,
  className,
}: {
  id: string;
  eyebrow: string;
  title: ReactNode;
  subtitle?: string;
  /** Lead goes under the headline instead of beside it. */
  stacked?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(!stacked && 'grid gap-7 md:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] md:items-end md:gap-16', className)}>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={id} className="display mt-5 text-headline">
          {title}
        </h2>
      </div>
      {subtitle ? <p className={cn('lead', stacked && 'mt-7 max-w-xl')}>{subtitle}</p> : null}
    </div>
  );
}
