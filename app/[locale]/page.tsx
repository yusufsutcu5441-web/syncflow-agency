import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Architecture } from '@/components/sections/Architecture';
import { BriefingSection } from '@/components/sections/BriefingSection';
import { Closing } from '@/components/sections/Closing';
import { Hero } from '@/components/sections/Hero';
import { Showcase } from '@/components/sections/Showcase';
import { isOpenLocale } from '@/i18n/launch';
import { buildJsonLd, jsonLdString } from '@/lib/jsonld';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isOpenLocale(locale)) notFound();
  setRequestLocale(locale);

  const meta = await getTranslations({ locale, namespace: 'Meta' });
  const jsonLd = buildJsonLd({ locale, siteName: meta('siteName'), description: meta('organizationDescription') });

  return (
    <>
      <main id="main">
        <Hero />
        <Architecture />
        <Showcase />
        <BriefingSection />
        <Closing />
      </main>

      {/* Structured data (Organization, WebSite, ProfessionalService). "<" is escaped inside the JSON. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
    </>
  );
}
