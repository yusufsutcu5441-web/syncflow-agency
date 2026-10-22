import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getFormatter, getLocale, getTranslations } from 'next-intl/server';
import type { AppLocale } from '@/i18n/routing';
import { HAS_CONTACT, mailtoHref } from '@/lib/contact';
import { withLocale } from '@/lib/i18n-paths';
import { CONTACT_EMAIL, LEGAL_UPDATED } from '@/lib/site';

/**
 * The legal notice and the privacy notice of the sales-ready release (docs/adr/0035-sales-ready-release.md): short, finished, and limited to
 * what the code and the hosting setup actually show. There is no company name, address, register number, retention period or legal basis in
 * them because none of those facts has been supplied (docs/legal-facts-intake.md); the notice says so in one sentence instead of printing a
 * placeholder. Only English and Turkish carry the text; any other language shows the English text, marked with lang="en".
 *
 * Everything the privacy notice says is true of this deployment with the briefing form switched off:
 *  - hosting: the site runs on Vercel (vercel.json, docs/deployment.md), which receives the technical data every web request carries;
 *  - abuse protection: proxy.ts counts requests per IP address in server memory over 60-second windows (lib/security/rate-limit.ts, no shared store);
 *  - cookies and analytics: none are set or loaded, and the CSP (lib/security/csp.ts) allows no third-party script, font, image or media;
 *  - email: a studio promise about the mailbox, as the owner stated it;
 *  - questions and deletion: by email to the configured address.
 * With the form switched on, LegalPage.tsx shows the long notice that describes the form instead.
 */
const NOTICE_TEXT: readonly AppLocale[] = ['en', 'tr'];

const PRIVACY_SECTIONS = [
  ['hostingTitle', 'hosting'],
  ['limitTitle', 'limit'],
  ['cookiesTitle', 'cookies'],
  ['emailTitle', 'email'],
] as const;

export async function LegalNotice({ kind }: { kind: 'privacy' | 'imprint' }) {
  const locale = (await getLocale()) as AppLocale;
  const textLocale: AppLocale = NOTICE_TEXT.includes(locale) ? locale : 'en';
  const [t, format] = await Promise.all([getTranslations({ locale: textLocale, namespace: 'Notice' }), getFormatter({ locale: textLocale })]);

  const privacy = kind === 'privacy';
  const english = textLocale !== locale;
  const mail = mailtoHref();
  // The sentence that names the address is cut at {email}, so the address can be a link (the same way the briefing's no-script line does it).
  const [beforeEmail = '', afterEmail = ''] = t.raw('request').split('{email}');

  const linkClass = 'text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink';

  return (
    <main id="main" className="pb-24 pt-32 md:pb-32 md:pt-44">
      <div className="container-x max-w-3xl" {...(english ? { lang: 'en', dir: 'ltr' } : {})}>
        <Link href={withLocale('/', locale)} prefetch={false} className="footer-link inline-flex items-center gap-2 text-sm">
          <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" className="icon-dir" />
          {t('back')}
        </Link>

        <h1 className="display mt-10 text-headline">{privacy ? t('privacyTitle') : t('imprintTitle')}</h1>
        <p className="lead mt-6">{privacy ? t('privacyLead') : t('imprintLead')}</p>
        <p className="mt-3 text-sm text-faint">{t('updated', { date: format.dateTime(new Date(`${LEGAL_UPDATED}T12:00:00Z`), { dateStyle: 'long', timeZone: 'UTC' }) })}</p>

        <div className="mt-14 grid gap-10">
          {privacy ? (
            <>
              {PRIVACY_SECTIONS.map(([title, text]) => (
                <section key={title}>
                  <h2 className="text-title">{t(title)}</h2>
                  <p className="body-muted mt-3">{t(text)}</p>
                </section>
              ))}
              {HAS_CONTACT && mail ? (
                <section>
                  <h2 className="text-title">{t('requestTitle')}</h2>
                  <p className="body-muted mt-3">
                    {beforeEmail}
                    <a href={mail} dir="ltr" className={linkClass}>
                      {CONTACT_EMAIL}
                    </a>
                    {afterEmail}
                  </p>
                </section>
              ) : null}
            </>
          ) : (
            <>
              {HAS_CONTACT && mail ? (
                <section>
                  <h2 className="text-title">{t('contactLabel')}</h2>
                  <p className="body-muted mt-3">
                    <a href={mail} dir="ltr" className={linkClass}>
                      {CONTACT_EMAIL}
                    </a>
                  </p>
                </section>
              ) : null}
              <p className="body-muted">{t('registration')}</p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
