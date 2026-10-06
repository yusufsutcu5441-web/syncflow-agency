import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Marks a button as magnetic. Rendering is plain markup (no JavaScript, no hydration cost); the spring physics are
 * attached after first paint by lib/enhance/magnetic.ts, only for mouse and pen pointers.
 */
export function Magnetic({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span data-magnetic="" className={cn(className)}>
      {children}
    </span>
  );
}
