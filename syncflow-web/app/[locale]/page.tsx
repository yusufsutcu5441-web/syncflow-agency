import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { EntryGate } from '@/components/gate/EntryGate';
import { AnchorPrime } from '@/components/sections/AnchorPrime';
import { Architecture } from '@/components/sections/Architecture';
import { BriefingSection } from '@/components/sections/BriefingSection';
import { Closing } from '@/components/sections/Closing';
import { Film } from '@/components/sections/Film';
import { Hero } from '@/components/sections/Hero';
import { Showcase } from '@/components/sections/Showcase';
import { Studio } from '@/components/sections/Studio';
import { isOpenLocale } from '@/i18n/launch';
import { buildJsonLd, jsonLdString } from '@/lib/jsonld';
import { isCrawler } from '@/lib/crawlers';
import { MARKET_PARAM, parseMarket } from '@/lib/market';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HomePage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isOpenLocale(locale)) notFound();
  setRequestLocale(locale);

  // The market lives in the address (?m=us | tr | me | dach | fr | wealth | asia), whitelisted here; a valid one also means the entry gate was passed
  // (docs/adr/0015-entry-gate-and-hero.md). Nothing else from the query string is read.
  const market = parseMarket((await searchParams)[MARKET_PARAM]);
  // Search-engine and link-preview crawlers get the page without the gate (lib/crawlers.ts); the content is the same for everyone.
  const crawler = isCrawler((await headers()).get('user-agent'));

  const meta = await getTranslations({ locale, namespace: 'Meta' });
  const jsonLd = buildJsonLd({ locale, siteName: meta('siteName'), description: meta('organizationDescription') });

  return (
    <>
      <EntryGate entered={market !== null || crawler} market={market} />
      <AnchorPrime />

      <main id="main">
        <Hero />
        <Film />
        <Architecture />
        <Showcase />
        <Studio />
        <BriefingSection />
        <Closing />
      </main>

      {/* Structured data (Organization, WebSite, ProfessionalService). "<" is escaped inside the JSON. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
    </>
  );
}
