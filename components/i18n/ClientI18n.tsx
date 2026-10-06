'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { AppLocale } from '@/i18n/routing';
import type en from '@/messages/en.json';

/**
 * The only i18n the browser needs: the current locale and a few plain strings for the interactive widgets
 * (language switcher, contact form, error page). All formatting (prices, ICU placeholders, rich text) happens on the
 * server, so next-intl's client runtime and its ICU message engine (~13 kB gzip) never reach the browser.
 */
export type ClientMessages = Pick<typeof en, 'Switcher' | 'Contact' | 'ErrorPage'>;

const ClientI18nContext = createContext<{ locale: AppLocale; messages: ClientMessages } | null>(null);

export function ClientI18nProvider({ locale, messages, children }: { locale: AppLocale; messages: ClientMessages; children: ReactNode }) {
  return <ClientI18nContext value={{ locale, messages }}>{children}</ClientI18nContext>;
}

export function useClientI18n() {
  const value = useContext(ClientI18nContext);
  if (!value) throw new Error('useClientI18n must be used inside <ClientI18nProvider>');
  return value;
}
