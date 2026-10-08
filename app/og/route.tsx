import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { getTranslations } from 'next-intl/server';
import { isOpenLocale } from '@/i18n/launch';
import { routing, type AppLocale } from '@/i18n/routing';
import { SITE_URL } from '@/lib/site';

/**
 * Social share card (1200x630): GET /og?locale=tr
 * Headline and subtitle for og:image / twitter:image (LinkedIn, Slack, X, iMessage previews). Referenced from
 * generateMetadata with an explicit URL, so there is no redirect. The locale is whitelisted (public languages only);
 * anything else falls back to English. Arabic and Japanese cards are set in English: the share-card font (a static Inter
 * SemiBold built by scripts/build-og-font.py) has no Arabic or Japanese glyphs and would print empty boxes; their
 * og:title and og:description (the page text) are still in their own language. The response is cacheable for a year at the
 * edge (the "v" query value is bumped when the design changes), and /og is rate limited in proxy.ts because rendering an
 * image costs real CPU.
 *
 * Font: read with fs; next.config.mjs lists it in outputFileTracingIncludes so deployments ship it.
 */
export const runtime = 'nodejs';

const WIDTH = 1200;
const HEIGHT = 630;
const LATIN_ONLY: readonly AppLocale[] = ['en', 'tr', 'de', 'fr', 'es'];

let font: Promise<Buffer> | undefined;
const loadFont = () => (font ??= readFile(join(process.cwd(), 'assets', 'og-inter-600.ttf')));

export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get('locale') ?? '';
  const locale: AppLocale = isOpenLocale(requested) ? requested : routing.defaultLocale;
  const textLocale: AppLocale = LATIN_ONLY.includes(locale) ? locale : 'en';

  const [meta, hero, data] = await Promise.all([
    getTranslations({ locale: textLocale, namespace: 'Meta' }),
    getTranslations({ locale: textLocale, namespace: 'Hero' }),
    loadFont(),
  ]);
  const line1 = hero('title1');
  const line2 = hero('title2');

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 84px',
          background: '#000000',
          backgroundImage: 'radial-gradient(60% 55% at 78% 8%, rgba(255,255,255,0.10), rgba(0,0,0,0) 70%)',
          color: '#ffffff',
          fontFamily: 'Inter',
          border: '1px solid rgba(255,255,255,0.10)',
        }}
      >
        <div style={{ display: 'flex', fontSize: 34, letterSpacing: '-0.03em' }}>
          syncflow<span style={{ opacity: 0.4 }}>.agency</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 104, lineHeight: 1.02, letterSpacing: '-0.045em', fontWeight: 600 }}>{line1}</div>
          <div style={{ display: 'flex', fontSize: 104, lineHeight: 1.02, letterSpacing: '-0.045em', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{line2}</div>
          <div style={{ display: 'flex', marginTop: 34, fontSize: 32, lineHeight: 1.3, letterSpacing: '-0.01em', color: 'rgba(255,255,255,0.62)' }}>{meta('ogSubtitle')}</div>
        </div>

        <div style={{ display: 'flex', fontSize: 26, color: 'rgba(255,255,255,0.45)' }}>{SITE_URL.replace(/^https?:\/\//, '')}</div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [{ name: 'Inter', data, weight: 600, style: 'normal' }],
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400' },
    },
  );
}
