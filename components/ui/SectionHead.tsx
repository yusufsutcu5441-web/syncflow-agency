import type { ReactNode } from 'react';
import { MaskText } from '@/components/ui/MaskText';
import { cn } from '@/lib/utils';

/**
 * Editorial section opener: numbered eyebrow, tight display headline, a short lead on the right (desktop).
 * Below the fold, the three parts slide up through their masks as they scroll into view (lib/enhance/reveal.ts); the
 * headline is already split into masked words here, on the server, and everything is plainly visible without script.
 */
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
        <p className="eyebrow" data-reveal="block">
          {eyebrow}
        </p>
        <h2 id={id} className="display mt-5 text-headline" data-reveal="words">
          <MaskText>{title}</MaskText>
        </h2>
      </div>
      {subtitle ? (
        <p className={cn('lead', stacked && 'mt-7 max-w-xl')} data-reveal="block">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
