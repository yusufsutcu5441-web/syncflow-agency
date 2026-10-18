import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BreakdownView } from '@/components/sections/BreakdownView';
import { isOpenLocale, OPEN_LOCALES } from '@/i18n/launch';
import { LOCALE_LABELS, routing, type AppLocale } from '@/i18n/routing';
import { withLocale } from '@/lib/i18n-paths';
import { buildBreakdownJsonLd, jsonLdString } from '@/lib/jsonld';
import { loadSpecimen, specimenMetadata } from '@/lib/server/specimen';
import { isSpecimenSlug, specimenPath } from '@/lib/specimens';

type Props = { params: Promise<{ locale: string; slug: string }> };

/**
 * One architectural R&D specimen as a page of its own (docs/adr/0032-rd-specimens.md): the studio's own engineering, not client work. Indexable,
 * in the sitemap, with hreflang to every public language, readable without JavaScript; drawn by the same component as a showcase breakdown. An
 * unknown slug, like an unknown language, is a 404.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isOpenLocale(locale) || !isSpecimenSlug(slug)) return {};

  const [{ title, description }, meta] = await Promise.all([specimenMetadata(slug, locale), getTranslations({ locale, namespace: 'Meta' })]);
  const path = (code: AppLocale) => withLocale(specimenPath(slug), code);
  const image = `/og?locale=${locale}&v=4`;

  return {
    title,
    description,
    alternates: {
      canonical: path(locale),
      languages: { ...Object.fromEntries(OPEN_LOCALES.map((code) => [LOCALE_LABELS[code].hreflang, path(code)])), 'x-default': path(routing.defaultLocale) },
    },
    openGraph: {
      type: 'article',
      url: path(locale),
      siteName: meta('siteName'),
      title,
      description,
      locale: LOCALE_LABELS[locale].ogLocale,
      alternateLocale: OPEN_LOCALES.filter((code) => code !== locale).map((code) => LOCALE_LABELS[code].ogLocale),
      images: [{ url: image, width: 1200, height: 630, alt: meta('ogAlt') }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [{ url: image, alt: meta('ogAlt') }] },
    robots: { index: true, follow: true },
  };
}

export default async function SpecimenPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isOpenLocale(locale) || !isSpecimenSlug(slug)) notFound();
  setRequestLocale(locale);

  const [data, { title, description }, meta] = await Promise.all([loadSpecimen(slug, locale), specimenMetadata(slug, locale), getTranslations({ locale, namespace: 'Meta' })]);
  const jsonLd = buildBreakdownJsonLd({ locale, siteName: meta('siteName'), title, description, path: withLocale(specimenPath(slug), locale) });

  return (
    <main id="main" className="pb-24 pt-32 md:pb-32 md:pt-44">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <div className="container-x">
        <Link href={data.cta.backHref} prefetch={false} className="footer-link inline-flex items-center gap-2 text-sm">
          <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" className="icon-dir" />
          {data.cta.back}
        </Link>
        <div className="mt-10">
          <BreakdownView data={data} variant="page" />
        </div>
      </div>
    </main>
  );
}
