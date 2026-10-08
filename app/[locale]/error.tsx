'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useClientI18n } from '@/components/i18n/ClientI18n';
import { withLocale } from '@/lib/i18n-paths';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { locale, messages } = useClientI18n();
  const t = messages.ErrorPage;

  useEffect(() => {
    // The digest links this report to the server log entry. No user data is attached.
    console.error('[page error]', error.digest ?? error.message);
  }, [error]);

  return (
    <main id="main" className="grid min-h-[80dvh] place-items-center pb-24 pt-32">
      <div className="container-x">
        <h1 className="display text-headline">{t.title}</h1>
        <p className="lead mt-6 max-w-lg">{t.body}</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <button type="button" className="btn btn-primary" onClick={reset}>
            {t.retry}
          </button>
          <Link href={withLocale('/', locale)} prefetch={false} className="btn btn-ghost">
            {t.home}
          </Link>
        </div>
      </div>
    </main>
  );
}
