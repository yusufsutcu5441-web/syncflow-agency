import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LegalPage } from '@/components/sections/LegalPage';
import { isOpenLocale } from '@/i18n/launch';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isOpenLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'Legal' });
  // Legal pages are not search landing pages: keep them out of the index and out of the sitemap.
  return { title: `${t('privacyTitle')} | syncflow.agency`, robots: { index: false, follow: true }, alternates: { canonical: null } };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  if (!isOpenLocale(locale)) notFound();
  setRequestLocale(locale);
  return <LegalPage kind="privacy" />;
}
