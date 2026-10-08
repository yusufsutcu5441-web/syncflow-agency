'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import type { AppLocale } from '@/i18n/routing';

export type ReachLanguage = {
  code: AppLocale;
  native: string;
  dir: 'ltr' | 'rtl';
  sentence: string;
  /** Link to the site in this language, or null while the language is a draft that is not public. */
  href: string | null;
};

/**
 * The language chips around the globe and the sentence they change. Pointing at (or tabbing to) a chip shows the sentence
 * in that language; a chip for a public language is a real link to the site in it, a chip for a draft is a plain
 * preview. The sentence is announced politely to screen readers. The globe itself is static markup passed in as children.
 */
export function ReachInteractive({
  languages,
  initial,
  chipsLabel,
  draftLabel,
  openLabel,
  children,
}: {
  languages: ReachLanguage[];
  initial: AppLocale;
  chipsLabel: string;
  draftLabel: string;
  openLabel: string;
  children: ReactNode;
}) {
  const [active, setActive] = useState<AppLocale>(initial);
  const current = languages.find((language) => language.code === active) ?? languages[0]!;
  const step = 360 / languages.length;

  return (
    <>
      <div className="reach-orbit">
        {children}
        <div className="reach-chips" role="group" aria-label={chipsLabel}>
          {languages.map((language, index) => {
            const props = {
              className: 'reach-chip',
              lang: language.code,
              dir: language.dir,
              style: { '--a': `${(index * step).toFixed(2)}deg` } as CSSProperties,
              onPointerEnter: () => setActive(language.code),
              onFocus: () => setActive(language.code),
            };
            return language.href ? (
              <a key={language.code} href={language.href} hrefLang={language.code} aria-current={language.code === initial ? 'true' : undefined} title={openLabel} {...props}>
                {language.native}
              </a>
            ) : (
              <button key={language.code} type="button" aria-pressed={language.code === active} title={draftLabel} onClick={() => setActive(language.code)} {...props}>
                {language.native}
              </button>
            );
          })}
        </div>
      </div>

      <p className="reach-sentence mx-auto mt-10 max-w-3xl text-center text-headline" lang={current.code} dir={current.dir} aria-live="polite">
        {current.sentence}
      </p>
    </>
  );
}
