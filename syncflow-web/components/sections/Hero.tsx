import { ArrowRight, Play } from 'lucide-react';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { Logo } from '@/components/ui/Logo';
import { MaskLines } from '@/components/ui/MaskText';
import type { AppLocale } from '@/i18n/routing';
import { writeHref } from '@/lib/contact';
import { BRIEFING_ENABLED, SHOW_ENTERPRISE } from '@/lib/flags';
import { withLocale } from '@/lib/i18n-paths';
import { isPilotLocale, PILOT_PATH } from '@/lib/pilot';
import { CONTACT_EMAIL, SECTION_IDS } from '@/lib/site';

/**
 * Hero (Blueprint section 1, cinematic since docs/adr/0015-entry-gate-and-hero.md): full viewport, obsidian, the B1 emblem at
 * monumental size behind a two-line headline that rises line by line through its masks (CSS only, from the first paint), one
 * primary action and a quiet second one. Everything above the fold is plain server-rendered text, so the largest contentful
 * paint is the headline or the lead as early as the browser can draw it.
 * Since the owner's design review of 24.11.2026 (docs/adr/0038 §17) the first screen carries no measurements: the metric strip,
 * the proof sentence and their dated note moved to the Studio section, which now labels the mobile and the desktop score
 * separately, and nothing stands in front of the hero any more (§16).
 *
 * On a desktop (fine pointer, tall enough, no reduced motion) the section is taller than the screen and its stage is sticky:
 * lib/enhance/hero.ts writes the scroll progress into --hp and CSS alone moves the emblem, fades the copy and the cinema layer
 * brightens, so scrolling feels like moving through the space. On phones and without JavaScript it is the plain one-screen hero.
 */
export async function Hero() {
  const [t, locale, closing] = await Promise.all([getTranslations('Hero'), getLocale() as Promise<AppLocale>, getTranslations('Closing')]);
  // The actions (owner's brief, 22.11.2026, docs/adr/0038 §10): the work first. While the form is off, the primary action scrolls to the showcase and the
  // quiet second one is the plain contact mail (lib/contact.ts, no subject); the free site audit request stays in the footer and the phone bar. While the
  // form is on, the briefing is the primary action and the showcase the second, as before.
  const write = writeHref();

  return (
    <section id="top" className="hero" data-hero="" aria-labelledby="hero-title">
      <div className="hero-stage" data-spotlight="">
        <div className="spot" aria-hidden="true" />

        {/* The identity at scale: the B1 monogram, platin only (brand/README.md allows no second colour, glow, shadow or gradient). */}
        <div className="hero-monogram" aria-hidden="true">
          <Logo part="monogram" />
        </div>
        {/* The drawn wordmark across the stage's foot, platin at 6 % like the footer's: the identity is on the first screen in both parts. */}
        <div className="hero-wordmark" aria-hidden="true">
          <Logo part="wordmark" />
        </div>

        <div className="container-x relative hero-copy">
          <p className="label flex items-center gap-3">
            <span className="live-dot" aria-hidden="true" data-pause-offscreen="" />
            {t('eyebrow')}
          </p>

          {/* data-mask="load": the lines rise through their masks from the first paint, in CSS alone (globals.css). */}
          <h1 id="hero-title" className="display text-hero mt-7 max-w-5xl" data-mask="load">
            <MaskLines lines={[t('title1'), <span key="2" className="dim">{t('title2')}</span>]} />
          </h1>

          <p className="lead mt-9 max-w-2xl">{t('subtitle')}</p>

          <div id="hero-cta" data-sticky-guard="" className="mt-10 flex flex-col gap-3.5 sm:flex-row sm:items-center">
            {BRIEFING_ENABLED ? (
              <Link href={withLocale(`/#${SECTION_IDS.briefing}`, locale)} prefetch={false} className="btn btn-primary w-full sm:w-auto" data-magnetic="">
                <span>{t('ctaPrimary')}</span>
                <ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" className="icon-dir" />
              </Link>
            ) : (
              <Link href={withLocale(`/#${SECTION_IDS.showcase}`, locale)} prefetch={false} className="btn btn-primary w-full sm:w-auto" data-magnetic="">
                <span>{t('ctaSecondary')}</span>
                <ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" className="icon-dir" />
              </Link>
            )}
            {BRIEFING_ENABLED ? (
              <Link href={withLocale(`/#${SECTION_IDS.showcase}`, locale)} prefetch={false} className="btn btn-ghost w-full sm:w-auto">
                <Play size={14} strokeWidth={1.75} aria-hidden="true" className="icon-dir" />
                <span>{t('ctaSecondary')}</span>
              </Link>
            ) : write ? (
              <a href={write} className="btn btn-ghost w-full sm:w-auto">
                <span>{closing('emailLabel')}</span>
              </a>
            ) : null}
          </div>
          {/* The address as plain text beside the mail button: a visitor whose browser opens no mail program can still copy it (one click selects all of it). */}
          {!BRIEFING_ENABLED && write ? (
            <p className="mt-4 text-sm text-faint">
              <bdi dir="ltr" className="select-all text-muted">
                {CONTACT_EMAIL}
              </bdi>
            </p>
          ) : null}

          {/* The cold e-mails offer a 30-day outbound pilot, which this page (the studio's) does not otherwise mention: a visitor who read one finds its page from here
              (docs/adr/0037-pilot-page.md). The page exists in English and Turkish; any other language links to the English one.
              Since docs/adr/0038 the studio is a web design studio and nothing else: the band is part of the enterprise layer and is off unless SHOW_ENTERPRISE is on (lib/flags.ts). */}
          {SHOW_ENTERPRISE ? (
            <div className="mt-9 max-w-2xl border-t border-hairline pt-5" data-pilot-note="">
              <p className="label">{t('pilotLabel')}</p>
              <p className="body-muted mt-2">{t('pilotText')}</p>
              <Link href={withLocale(PILOT_PATH, isPilotLocale(locale) ? locale : 'en')} prefetch={false} className="footer-link mt-3 inline-flex items-center gap-1.5 text-sm">
                {t('pilotCta')}
                <ArrowRight size={15} strokeWidth={1.75} aria-hidden="true" className="icon-dir" />
              </Link>
            </div>
          ) : null}

          {/* No metric strip here any more (owner's design review, 24.11.2026, docs/adr/0038 §17): the first screen is the work and one way
              into it. The measured scores live as a small proof line in the Studio section, where both of them are labelled, and the four
              Lighthouse rings with their numbers are card III of the Architecture section. */}
        </div>

        <div className="scroll-cue" aria-hidden="true" data-pause-offscreen="">
          <span className="rail" />
          <span className="label">{t('scroll')}</span>
        </div>
      </div>
    </section>
  );
}
