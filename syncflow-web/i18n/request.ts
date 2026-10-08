import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { mergeMessages } from '@/lib/merge-messages';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  const english = (await import('../messages/en.json')).default;
  if (locale === 'en') return { locale, messages: english };

  // English fills whatever a translation lacks (see lib/merge-messages.ts), including a language whose file is not written yet.
  const own = await import(`../messages/${locale}.json`).then(
    (module) => module.default,
    () => ({}),
  );
  return { locale, messages: mergeMessages(english, own) };
});
