import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { MaskText } from '@/components/ui/MaskText';
import type { AppLocale } from '@/i18n/routing';
import { withLocale } from '@/lib/i18n-paths';
import { CONTACT_EMAIL, SECTION_IDS, SOCIAL } from '@/lib/site';
import { CopyEmail } from './CopyEmail';

/**
 * Blueprint section 6, closing: the manifesto, revealed line by line, and the direct-contact block. LinkedIn, Instagram
 * and WhatsApp appear only when an address has been configured (lib/site.ts SOCIAL): none are invented.
 */
export async function Closing() {
  const [t, locale] = await Promise.all([getTranslations('Closing'), getLocale() as Promise<AppLocale>]);

  const links = [
    { id: 'briefing', label: t('briefing'), href: withLocale(`/#${SECTION_IDS.briefing}`, locale), external: false },
    ...(SOCIAL.linkedin ? [{ id: 'linkedin', label: t('linkedin'), href: SOCIAL.linkedin, external: true }] : []),
    ...(SOCIAL.instagram ? [{ id: 'instagram', label: t('instagram'), href: SOCIAL.instagram, external: true }] : []),
    ...(SOCIAL.whatsapp ? [{ id: 'whatsapp', label: t('whatsapp'), href: SOCIAL.whatsapp, external: true }] : []),
  ];

  return (
    <section className="section pb-24 md:pb-32" aria-labelledby="closing-title">
      <div className="container-x">
        <p id="closing-title" className="text-headline max-w-5xl" data-reveal="words">
          <MaskText>{`${t('manifesto1')} ${t('manifesto2')}`}</MaskText>
          <span className="dim mt-3 block">
            <MaskText>{t('manifesto3')}</MaskText>
          </span>
        </p>

        <div className="mt-24 border-t border-hairline pt-12 md:mt-32 md:pt-16">
          <h2 className="text-title" data-reveal="block">
            {t('contactTitle')}
          </h2>
          <p className="label mt-8">{t('emailLabel')}</p>
          <div className="mt-3">
            <CopyEmail email={CONTACT_EMAIL} />
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
            {links.map((link) => (
              <li key={link.id}>
                {link.external ? (
                  <a href={link.href} target="_blank" rel="noopener noreferrer" className="footer-link inline-flex items-center gap-1.5">
                    {link.label}
                    <ArrowUpRight size={15} strokeWidth={1.75} aria-hidden="true" className="icon-dir" />
                  </a>
                ) : (
                  <Link href={link.href} prefetch={false} className="footer-link inline-flex items-center gap-1.5">
                    {link.label}
                    <ArrowUpRight size={15} strokeWidth={1.75} aria-hidden="true" className="icon-dir" />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
