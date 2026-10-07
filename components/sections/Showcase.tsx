import { getTranslations } from 'next-intl/server';
import { ShowcaseFilm } from '@/components/showcase/ShowcaseFilm';
import { SectionHead } from '@/components/ui/SectionHead';
import { SECTION_IDS } from '@/lib/site';

export async function Showcase() {
  const t = await getTranslations('Showcase');

  return (
    <section id={SECTION_IDS.showcase} className="section" aria-labelledby="showcase-title">
      <div className="container-x">
        <SectionHead
          id="showcase-title"
          eyebrow={t('eyebrow')}
          title={t.rich('title', { dim: (chunks) => <span className="dim">{chunks}</span> })}
          subtitle={t('subtitle')}
        />

        <div className="mt-block">
          <ShowcaseFilm
            copy={{
              tabsLabel: t('tabsLabel'),
              tabs: [t('tabArchitecture'), t('tabSpeed'), t('tabDelivery')],
              badge: t('badge'),
              play: t('play'),
              pause: t('pause'),
              restart: t('restart'),
              playerLabel: t('playerLabel'),
              playerDescription: t('playerDescription'),
            }}
          />
        </div>

        <p className="mt-5 max-w-2xl text-sm text-muted">{t('note')}</p>
      </div>
    </section>
  );
}
