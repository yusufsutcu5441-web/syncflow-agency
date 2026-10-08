'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { AppLocale } from '@/i18n/routing';
import type en from '@/messages/en.json';

/**
 * The only i18n the browser needs: the current locale and the plain strings of the interactive widgets (language
 * switcher, briefing, showcase controls, copy button, error page). All formatting (ICU placeholders, dates, numbers)
 * happens on the server, so next-intl's client runtime and its ICU message engine (~13 kB gzip) never reach the browser.
 * Strings with placeholders are filled with the tiny `fill` helper below.
 */
export type ClientMessages = Pick<typeof en, 'Switcher' | 'Briefing' | 'Showcase' | 'Closing' | 'ErrorPage'>;

const ClientI18nContext = createContext<{ locale: AppLocale; messages: ClientMessages } | null>(null);

export function ClientI18nProvider({ locale, messages, children }: { locale: AppLocale; messages: ClientMessages; children: ReactNode }) {
  return <ClientI18nContext value={{ locale, messages }}>{children}</ClientI18nContext>;
}

export function useClientI18n() {
  const value = useContext(ClientI18nContext);
  if (!value) throw new Error('useClientI18n must be used inside <ClientI18nProvider>');
  return value;
}

/** "Step {current} of {total}" -> "Step 2 of 4". Plain {name} placeholders only (no plural/select: those are formatted on the server). */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}
