import { MaskText } from '@/components/ui/MaskText';
import { cn } from '@/lib/utils';

/**
 * Blueprint section opener: a mono label ("01 — Architecture"), a large light headline and a short lead.
 * Below the fold, the parts slide up through their masks as they scroll into view (lib/enhance/reveal.ts); the headline
 * is already split into masked words here, on the server, and everything is plainly visible without script.
 */
export function SectionHead({
  id,
  label,
  title,
  subtitle,
  center = false,
  className,
}: {
  id: string;
  label: string;
  title: string;
  subtitle?: string;
  center?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(center && 'text-center', className)}>
      <p className="label" data-reveal="block">
        {label}
      </p>
      <h2 id={id} className={cn('display mt-5 max-w-4xl text-headline', center && 'mx-auto')} data-reveal="words">
        <MaskText>{title}</MaskText>
      </h2>
      {subtitle ? (
        <p className={cn('lead mt-6 max-w-2xl', center && 'mx-auto')} data-reveal="block">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
