import type { ReactNode } from 'react';

/**
 * The real root layout, which renders <html lang> and <body>, is app/[locale]/layout.tsx: the language attribute
 * must follow the visitor's locale, and Next.js only knows the locale there.
 * This file only exists so that app/not-found.tsx (which renders its own <html>) is allowed.
 * Per-locale concerns (fonts, the Lemon Squeezy script via next/script, structured data) are in that layout.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
