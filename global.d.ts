import type { routing } from './i18n/routing';
import type en from './messages/en.json';

// Type-safe translation keys: a typo in t('Hero.titel') becomes a compile error.
declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof en;
  }
}
