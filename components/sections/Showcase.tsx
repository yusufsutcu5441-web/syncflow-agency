import { getMessages, getTranslations } from 'next-intl/server';
import { ShowcasePlayer } from '@/components/remotion/ShowcasePlayer';
import { SectionHead } from '@/components/ui/SectionHead';
import { SECTION_IDS } from '@/lib/site';

export async function Showcase() {
  const t = await getTranslations('Showcase');
  const messages = await getMessages();

  return (
    <section id={SECTION_IDS.showcase} className="section" aria-labelledby="showcase-title">
      <div className="container-x">
        <SectionHead
          id="showcase-title"
          eyebrow={t('eyebrow')}
          title={t.rich('title', { dim: (chunks) => <span className="dim">{chunks}</span> })}
          subtitle={t('subtitle')}
        />

        <div className="mt-block" data-reveal="">
          <ShowcasePlayer
            labels={messages.Showcase.scene}
            copy={{
              tabsLabel: t('tabsLabel'),
              tabs: [t('tabArchitecture'), t('tabSpeed'), t('tabDelivery')],
              live: t('live'),
              play: t('play'),
              pause: t('pause'),
              restart: t('restart'),
              loading: t('loading'),
              playerLabel: t('playerLabel'),
              playerDescription: t('playerDescription'),
            }}
          />
        </div>

        <p className="mt-5 max-w-2xl text-sm text-muted" data-reveal="">
          {t('note')}
        </p>
      </div>
    </section>
  );
}
