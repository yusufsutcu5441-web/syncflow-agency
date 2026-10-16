import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BreakdownView } from '@/components/sections/BreakdownView';
import { isOpenLocale, OPEN_LOCALES } from '@/i18n/launch';
import { LOCALE_LABELS, routing, type AppLocale } from '@/i18n/routing';
import { breakdownPath, isBreakdownSlug } from '@/lib/breakdown';
import { withLocale } from '@/lib/i18n-paths';
import { breakdownMetadata, loadBreakdown } from '@/lib/server/breakdown';

type Props = { params: Promise<{ locale: string; slug: string }> };

/**
 * The architectural breakdown of one showcase specimen as a page of its own (docs/adr/0020-case-study-layer.md): indexable, listed in the
 * sitemap, with hreflang to every public language, readable without JavaScript. On the home page the same content opens in a dialog
 * (components/sections/BreakdownDialog.tsx), which reads it from /api/breakdown. An unknown slug, like an unknown language, is a 404.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isOpenLocale(locale) || !isBreakdownSlug(slug)) return {};

  const [{ title, description }, meta] = await Promise.all([breakdownMetadata(slug, locale), getTranslations({ locale, namespace: 'Meta' })]);
  const path = (code: AppLocale) => withLocale(breakdownPath(slug), code);
  const image = `/og?locale=${locale}&v=3`;

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

export default async function BreakdownPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isOpenLocale(locale) || !isBreakdownSlug(slug)) notFound();
  setRequestLocale(locale);

  const data = await loadBreakdown(slug, locale);

  return (
    <main id="main" className="pb-24 pt-32 md:pb-32 md:pt-44">
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
