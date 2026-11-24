import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AnchorPrime } from '@/components/sections/AnchorPrime';
import { Architecture } from '@/components/sections/Architecture';
import { BriefingSection } from '@/components/sections/BriefingSection';
import { Closing } from '@/components/sections/Closing';
import { Film } from '@/components/sections/Film';
import { Hero } from '@/components/sections/Hero';
import { Showcase } from '@/components/sections/Showcase';
import { Studio } from '@/components/sections/Studio';
import { isOpenLocale } from '@/i18n/launch';
import { BRIEFING_ENABLED } from '@/lib/flags';
import { buildJsonLd, jsonLdString } from '@/lib/jsonld';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  if (!isOpenLocale(locale)) notFound();
  setRequestLocale(locale);

  // Nothing stands in front of this page: the language gate was removed on 24.11.2026 (docs/adr/0038 section 16), so the first screen is the hero
  // for every visitor and every crawler alike. The language comes from the address (and, on "/" alone, from the browser's Accept-Language: proxy.ts);
  // the market is still readable from "?m=" by the parts that price something (lib/market.ts), which the browser reads for itself.
  const meta = await getTranslations({ locale, namespace: 'Meta' });
  const jsonLd = buildJsonLd({ locale, siteName: meta('siteName'), description: meta('organizationDescription') });

  return (
    <>
      <AnchorPrime />

      <main id="main">
        <Hero />
        <Film />
        <Architecture />
        <Showcase />
        <Studio />
        {/* The briefing form is a release switch (lib/flags.ts, docs/adr/0035): off, the section does not exist and nothing links to it. */}
        {BRIEFING_ENABLED ? <BriefingSection /> : null}
        <Closing />
      </main>

      {/* Structured data (Organization, WebSite, ProfessionalService). "<" is escaped inside the JSON. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
    </>
  );
}
