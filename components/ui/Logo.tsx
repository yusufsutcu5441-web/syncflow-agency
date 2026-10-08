import { cn } from '@/lib/utils';

/**
 * The Blueprint wordmark: "syncflow" in a light weight, ".agency" at 40 % opacity. Text, not a drawing; the drawn brand
 * pack (CLAUDE.md "Onaylı sapmalar") replaces it when it exists. `dir="ltr"` keeps the Latin name in order on right-to-left pages.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span dir="ltr" className={cn('wordmark inline-block whitespace-nowrap', className)}>
      syncflow<span className="wordmark-tld">.agency</span>
    </span>
  );
}
