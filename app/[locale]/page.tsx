import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Comparison } from '@/components/sections/Comparison';
import { Contact } from '@/components/sections/Contact';
import { Faq } from '@/components/sections/Faq';
import { Hero } from '@/components/sections/Hero';
import { Pricing } from '@/components/sections/Pricing';
import { Showcase } from '@/components/sections/Showcase';
import { routing } from '@/i18n/routing';
import { buildJsonLd, jsonLdString } from '@/lib/jsonld';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const [meta, pricing] = await Promise.all([getTranslations({ locale, namespace: 'Meta' }), getTranslations({ locale, namespace: 'Pricing' })]);

  const jsonLd = buildJsonLd({
    locale,
    siteName: meta('siteName'),
    description: meta('organizationDescription'),
    offerName: pricing('planName'),
  });

  return (
    <>
      <main id="main">
        <Hero />
        <Showcase />
        <Comparison />
        <Pricing />
        <Faq />
        <Contact />
      </main>

      {/* Structured data (Organization, WebSite, ProfessionalService). "<" is escaped inside the JSON. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
    </>
  );
}
