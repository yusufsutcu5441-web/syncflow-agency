import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge only knows Tailwind's stock names. It reads an unknown `text-display-xl` as a text COLOUR and would
 * drop it when it meets `text-snow`, so the headline sizes from tailwind.config.js (fontSize) are declared here.
 * Keep this list in step with `fontSize` in that file.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['display-xl', 'display-lg', 'display', 'display-sm', 'numeral', 'lead', 'title'] }],
    },
  },
});

/** Conditional class names, with Tailwind conflicts resolved (last one wins). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
