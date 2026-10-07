import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge only knows Tailwind's stock names. It reads an unknown `text-headline` as a text COLOUR and would
 * drop it when it meets `text-platin`, so the type-scale utilities are declared here.
 * Keep this list in step with the `@utility text-*` type scale in app/globals.css (the single source of the tokens).
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['display', 'headline', 'title', 'lead', 'spec-value', 'spec-label', 'micro'] }],
    },
  },
});

/** Conditional class names, with Tailwind conflicts resolved (last one wins). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
