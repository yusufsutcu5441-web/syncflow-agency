import { cn } from '@/lib/utils';

/** Two offset bars: a "sync" of two streams that flow into one. Inherits the text colour. */
export function LogoMark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect x="1.5" y="4" width="15" height="5" rx="2.5" fill="currentColor" />
      <rect x="7.5" y="15" width="15" height="5" rx="2.5" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="text-[1.0625rem] font-medium tracking-display">SyncFlow</span>
    </span>
  );
}
