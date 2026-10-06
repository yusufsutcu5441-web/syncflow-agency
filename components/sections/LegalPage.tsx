import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import type { AppLocale } from '@/i18n/routing';
import { withLocale } from '@/lib/i18n-paths';

const PRIVACY = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'] as const;
const IMPRINT = ['i1', 'i2', 'i3', 'i4', 'i5'] as const;

/** Privacy notice / legal notice. Drafts with [BRACKETED] fields to complete (see README: launch checklist). */
export async function LegalPage({ kind }: { kind: 'privacy' | 'imprint' }) {
  const [t, locale] = await Promise.all([getTranslations('Legal'), getLocale() as Promise<AppLocale>]);
  const privacy = kind === 'privacy';

  return (
    <main id="main" className="pb-24 pt-32 md:pb-32 md:pt-44">
      <div className="container-x max-w-3xl">
        <Link href={withLocale('/', locale)} prefetch={false} className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-snow">
          <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />
          {t('back')}
        </Link>

        <h1 className="display mt-10 text-[clamp(2.4rem,6vw,4rem)]">{privacy ? t('privacyTitle') : t('imprintTitle')}</h1>
        <p className="lead mt-6">{privacy ? t('privacyIntro') : t('imprintIntro')}</p>
        <p className="chip mt-8">{t('draft')}</p>

        <div className="mt-14 grid gap-10">
          {privacy
            ? PRIVACY.map((key) => (
                <section key={key}>
                  <h2 className="text-xl font-semibold tracking-tight">{t(`${key}h`)}</h2>
                  <p className="mt-3 text-muted">{t(key)}</p>
                </section>
              ))
            : IMPRINT.map((key) => (
                <section key={key}>
                  <h2 className="text-xl font-semibold tracking-tight">{t(`${key}h`)}</h2>
                  <p className="mt-3 text-muted">{t(key)}</p>
                </section>
              ))}
        </div>
      </div>
    </main>
  );
}
