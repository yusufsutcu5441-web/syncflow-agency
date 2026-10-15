import { notFound, redirect } from 'next/navigation';
import { isOpenLocale } from '@/i18n/launch';
import { withLocale } from '@/lib/i18n-paths';
import { SECTION_IDS } from '@/lib/site';

type Props = { params: Promise<{ locale: string }> };

/** /showcase has no page of its own: the showcase is a section of the home page, so the address leads there instead of to a 404. */
export default async function ShowcaseIndex({ params }: Props) {
  const { locale } = await params;
  if (!isOpenLocale(locale)) notFound();
  redirect(withLocale(`/#${SECTION_IDS.showcase}`, locale));
}
