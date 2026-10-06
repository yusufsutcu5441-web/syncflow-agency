import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getFormatter, getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { preload } from 'react-dom';
import type { ReactNode } from 'react';
import { LemonSqueezy } from '@/components/checkout/LemonSqueezy';
import { Experience } from '@/components/Experience';
import { ClientI18nProvider } from '@/components/i18n/ClientI18n';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { StickyCta } from '@/components/layout/StickyCta';
import { LOCALE_LABELS, routing, type AppLocale } from '@/i18n/routing';
import { USD_FORMAT } from '@/lib/format';
import { pick } from '@/lib/pick';
import { PRICE_USD, SITE_URL } from '@/lib/site';
import '../globals.css';

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0d0d0e',
  colorScheme: 'dark',
};

const pathFor = (locale: AppLocale) => (locale === routing.defaultLocale ? '/' : `/${locale}`);

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};

  const [t, format] = await Promise.all([getTranslations({ locale, namespace: 'Meta' }), getFormatter({ locale })]);
  const price = format.number(PRICE_USD, USD_FORMAT);
  const title = t('title', { price });
  const description = t('description', { price });
  const ogLocale = LOCALE_LABELS[locale];
  // Explicit, redirect-free URL of the share card (app/og/route.tsx). Bump v when the design changes.
  const shareImage = `/og?locale=${locale}&v=1`;

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    applicationName: t('siteName'),
    alternates: {
      canonical: pathFor(locale),
      languages: {
        ...Object.fromEntries(routing.locales.map((code) => [LOCALE_LABELS[code].hreflang, pathFor(code)])),
        'x-default': '/',
      },
    },
    openGraph: {
      type: 'website',
      url: pathFor(locale),
      siteName: t('siteName'),
      title: t('ogTitle'),
      description,
      locale: ogLocale.ogLocale,
      alternateLocale: routing.locales.filter((code) => code !== locale).map((code) => LOCALE_LABELS[code].ogLocale),
      images: [{ url: shareImage, width: 1200, height: 630, alt: t('ogAlt', { price }) }],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('ogTitle'),
      description,
      images: [{ url: shareImage, alt: t('ogAlt', { price }) }],
    },
    robots: { index: true, follow: true },
    formatDetection: { telephone: false, email: false, address: false },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // Preload only the font files this page needs. Fonts are always fetched in CORS mode, hence crossOrigin.
  preload('/fonts/inter-latin-v1.woff2', { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' });
  if (locale === 'tr') preload('/fonts/inter-turkish-v1.woff2', { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' });

  // The per-request CSP nonce set by proxy.ts. Reading request headers also makes every page render per request,
  // which is exactly what a nonce requires (see README: "Security model").
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  const [messages, a11y] = await Promise.all([getMessages(), getTranslations('A11y')]);

  return (
    <html lang={locale}>
      <body>
        <a href="#main" className="skip-link">
          {a11y('skip')}
        </a>

        <div id="site-root">
          {/* Only the few plain strings the interactive widgets read are sent to the browser (no next-intl client runtime). */}
          <ClientI18nProvider locale={locale} messages={pick(messages, ['Switcher', 'Contact', 'ErrorPage'])}>
            <Header />
            {children}
            <Footer />
            <StickyCta />
          </ClientI18nProvider>
        </div>

        {/* Lemon Squeezy checkout overlay: lemon.js through next/script, carrying the CSP nonce. */}
        <LemonSqueezy nonce={nonce} />
        <Experience />
      </body>
    </html>
  );
}
