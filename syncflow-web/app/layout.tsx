import type { ReactNode } from 'react';

/**
 * The real root layout, which renders <html lang dir> and <body>, is app/[locale]/layout.tsx: the language and the
 * writing direction must follow the visitor's locale, and Next.js only knows the locale there.
 * This file only exists so that app/not-found.tsx (which renders its own <html>) is allowed.
 * Per-locale concerns (fonts, the Turnstile loader in the briefing, structured data) are in that layout and its pages.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
