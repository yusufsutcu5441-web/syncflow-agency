import 'server-only';
import { getTranslations } from 'next-intl/server';
import type { AppLocale } from '@/i18n/routing';
import { HAS_CONTACT, writeHref } from '@/lib/contact';
import { BRIEFING_ENABLED } from '@/lib/flags';
import { withLocale } from '@/lib/i18n-paths';
import { CONTACT_EMAIL, SECTION_IDS } from '@/lib/site';

/** `email` is the address as plain text, shown under a mail button for a visitor whose browser opens no mail program; empty for any other action. */
export type ClosingCta = { title: string; text: string; label: string; href: string; email: string };

/**
 * The closing call to action of an architectural breakdown and of an R&D specimen (lib/server/breakdown.ts, lib/server/specimen.ts): the briefing
 * while the form is offered (lib/flags.ts), otherwise a plain mail to the studio (lib/contact.ts). With no address configured `href` is empty and
 * the view leaves the button out (components/sections/BreakdownView.tsx).
 */
export async function closingCta(locale: AppLocale): Promise<ClosingCta> {
  const [breakdown, showcase, contact, closing] = await Promise.all([
    getTranslations({ locale, namespace: 'Breakdown' }),
    getTranslations({ locale, namespace: 'Showcase' }),
    getTranslations({ locale, namespace: 'Contact' }),
    getTranslations({ locale, namespace: 'Closing' }),
  ]);
  if (BRIEFING_ENABLED) {
    return { title: breakdown('ctaTitle'), text: breakdown('ctaText'), label: showcase('cta'), href: withLocale(`/#${SECTION_IDS.briefing}`, locale), email: '' };
  }
  return { title: contact('ctaTitle'), text: contact('ctaText'), label: closing('emailLabel'), href: writeHref() ?? '', email: HAS_CONTACT ? CONTACT_EMAIL : '' };
}
