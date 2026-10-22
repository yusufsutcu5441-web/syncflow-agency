import { getLocale, getTranslations } from 'next-intl/server';
import { SectionHead } from '@/components/ui/SectionHead';
import type { AppLocale } from '@/i18n/routing';
import { HAS_CONTACT } from '@/lib/contact';
import { withLocale } from '@/lib/i18n-paths';
import { briefingDeliveryConnected } from '@/lib/server/delivery-status';
import { CONTACT_EMAIL, SECTION_IDS } from '@/lib/site';
import { Briefing } from './Briefing';

/**
 * Blueprint section 5, "Strategic Briefing & Lead Funnel": the heading and the interactive panel. data-sticky-guard hides
 * the mobile sticky bar while this section is on screen. The Turnstile site key is public by nature and read here, on the server.
 * `direct` is true while delivery is not connected (lib/server/delivery-status.ts): the panel then composes an email draft instead of posting.
 */
export async function BriefingSection() {
  const [t, locale] = await Promise.all([getTranslations('Briefing'), getLocale() as Promise<AppLocale>]);
  // Without JavaScript the panel cannot run: say so and offer the mailbox, so nobody is left with a dead form.
  const [beforeEmail = '', afterEmail = ''] = t.raw('noscript').split('{email}');

  return (
    <section id={SECTION_IDS.briefing} className="section cv cv-briefing" aria-labelledby="briefing-title" data-sticky-guard="">
      <div className="container-x">
        <SectionHead id="briefing-title" label={t('label')} title={t('title')} subtitle={t('subtitle')} center />
        {HAS_CONTACT ? (
          <noscript>
            <p className="body-muted mx-auto mt-10 max-w-xl text-center">
              {beforeEmail}
              <a href={`mailto:${CONTACT_EMAIL}`} dir="ltr" className="text-ink underline decoration-ink/30 underline-offset-4">
                {CONTACT_EMAIL}
              </a>
              {afterEmail}
            </p>
          </noscript>
        ) : null}
        <Briefing
          privacyHref={`${withLocale('/privacy', locale)}#privacy-p2`}
          turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || undefined}
          direct={!briefingDeliveryConnected()}
        />
        {/* The one fact a visitor can check in their own browser. The chips about an NDA and a 24-hour answer (Briefing.chipNda, Briefing.chipPerson) are
            promises the studio cannot back yet, so they are not shown (docs/adr/0035); the keys stay in the message files. */}
        <ul className="trust-chips mx-auto mt-8 max-w-[720px]">
          <li className="chip">{t('chipPrivacy')}</li>
        </ul>
      </div>
    </section>
  );
}
