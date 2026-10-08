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
  return { title: `${t('imprintTitle')} | syncflow.agency`, robots: { index: false, follow: true }, alternates: { canonical: null } };
}

export default async function ImprintPage({ params }: Props) {
  const { locale } = await params;
  if (!isOpenLocale(locale)) notFound();
  setRequestLocale(locale);
  return <LegalPage kind="imprint" />;
}
