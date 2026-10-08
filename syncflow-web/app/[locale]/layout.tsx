import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { preload } from 'react-dom';
import type { ReactNode } from 'react';
import { Experience } from '@/components/Experience';
import { ClientI18nProvider } from '@/components/i18n/ClientI18n';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { StickyCta } from '@/components/layout/StickyCta';
import { isOpenLocale, OPEN_LOCALES } from '@/i18n/launch';
import { LOCALE_LABELS, routing, type AppLocale } from '@/i18n/routing';
import { pick } from '@/lib/pick';
import { SITE_URL } from '@/lib/site';
import '../globals.css';

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0D0D0E',
  colorScheme: 'dark',
};

const pathFor = (locale: AppLocale) => (locale === routing.defaultLocale ? '/' : `/${locale}`);

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isOpenLocale(locale)) return {};

  const t = await getTranslations({ locale, namespace: 'Meta' });
  const ogLocale = LOCALE_LABELS[locale];
  // Explicit, redirect-free URL of the share card (app/og/route.tsx). Bump v when the design changes.
  const shareImage = `/og?locale=${locale}&v=3`;

  return {
    metadataBase: new URL(SITE_URL),
    title: t('title'),
    description: t('description'),
    applicationName: t('siteName'),
    // hreflang lists only the languages that are public (i18n/launch.ts), plus x-default.
    alternates: {
      canonical: pathFor(locale),
      languages: {
        ...Object.fromEntries(OPEN_LOCALES.map((code) => [LOCALE_LABELS[code].hreflang, pathFor(code)])),
        'x-default': '/',
      },
    },
    openGraph: {
      type: 'website',
      url: pathFor(locale),
      siteName: t('siteName'),
      title: t('ogTitle'),
      description: t('description'),
      locale: ogLocale.ogLocale,
      alternateLocale: OPEN_LOCALES.filter((code) => code !== locale).map((code) => LOCALE_LABELS[code].ogLocale),
      images: [{ url: shareImage, width: 1200, height: 630, alt: t('ogAlt') }],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('ogTitle'),
      description: t('description'),
      images: [{ url: shareImage, alt: t('ogAlt') }],
    },
    robots: { index: true, follow: true },
    formatDetection: { telephone: false, email: false, address: false },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  // A language that is not public answers 404 (i18n/launch.ts), exactly like an unknown one.
  if (!isOpenLocale(locale)) notFound();
  setRequestLocale(locale);

  // Preload only the font files this page needs. Fonts are always fetched in CORS mode, hence crossOrigin.
  preload('/fonts/instrument-sans-latin-v1.woff2', { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' });
  if (locale === 'tr') preload('/fonts/instrument-sans-turkish-v1.woff2', { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' });

  const [messages, a11y] = await Promise.all([getMessages(), getTranslations('A11y')]);

  return (
    <html lang={locale} dir={LOCALE_LABELS[locale].dir}>
      <body>
        <a href="#main" className="skip-link">
          {a11y('skip')}
        </a>

        <div id="site-root">
          {/* Only the plain strings the interactive widgets read are sent to the browser (no next-intl client runtime). */}
          <ClientI18nProvider locale={locale} messages={pick(messages, ['Switcher', 'Briefing', 'Showcase', 'Closing', 'ErrorPage'])}>
            <Header />
            {children}
            <Footer />
            <StickyCta />
          </ClientI18nProvider>
        </div>

        <Experience />
      </body>
    </html>
  );
}
