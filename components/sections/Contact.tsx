import { getLocale, getTranslations } from 'next-intl/server';
import { SectionHead } from '@/components/ui/SectionHead';
import type { AppLocale } from '@/i18n/routing';
import { withLocale } from '@/lib/i18n-paths';
import { SECTION_IDS } from '@/lib/site';
import { ContactForm } from './ContactForm';

export async function Contact() {
  const [t, locale] = await Promise.all([getTranslations('Contact'), getLocale() as Promise<AppLocale>]);
  const privacyHref = withLocale('/privacy', locale);

  return (
    <section id={SECTION_IDS.contact} className="section" aria-labelledby="contact-title">
      <div className="container-x grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
        <SectionHead id="contact-title" stacked eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />
        <div data-sticky-guard="">
          <ContactForm privacyHref={privacyHref} />
        </div>
      </div>
    </section>
  );
}
