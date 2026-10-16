import { clsx, type ClassValue } from 'clsx';

/**
 * Conditional class names. It used to run the result through tailwind-merge (conflicts resolved, last one wins), which cost 8.6 KB gzip
 * in the first-load JavaScript for two callers that never put two conflicting utilities on one element (Logo, SectionHead): measured
 * with `next experimental-analyze`, docs/adr/0022. Pass classes that do not overlap; when a component really needs an override,
 * give it its own CSS class instead of fighting utilities.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
