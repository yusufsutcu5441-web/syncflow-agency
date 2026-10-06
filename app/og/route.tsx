import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { hasLocale } from 'next-intl';
import { getFormatter, getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { USD_FORMAT } from '@/lib/format';
import { PRICE_USD, SITE_URL } from '@/lib/site';

/**
 * Social share card (1200x630): GET /og?locale=tr
 * Headline, price and the risk-reversal line in the visitor's language, for og:image / twitter:image (LinkedIn, Slack,
 * X, iMessage previews). Referenced from generateMetadata with an explicit URL, so there is no redirect and the alt
 * text is localized. The locale is whitelisted; anything else falls back to English. The response is cacheable for a
 * year at the edge (the "v" query value is bumped when the design changes), and /og is rate limited in proxy.ts
 * because rendering an image costs real CPU.
 *
 * Font: a static Inter SemiBold built from the web fonts by scripts/build-og-font.py (the renderer cannot read WOFF2
 * or variable fonts). It is read with fs; next.config.mjs lists it in outputFileTracingIncludes so deployments ship it.
 */
export const runtime = 'nodejs';

const WIDTH = 1200;
const HEIGHT = 630;

let font: Promise<Buffer> | undefined;
const loadFont = () => (font ??= readFile(join(process.cwd(), 'assets', 'og-inter-600.ttf')));

export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get('locale');
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  const [meta, hero, format, data] = await Promise.all([
    getTranslations({ locale, namespace: 'Meta' }),
    getTranslations({ locale, namespace: 'Hero' }),
    getFormatter({ locale }),
    loadFont(),
  ]);
  const price = format.number(PRICE_USD, USD_FORMAT);
  const title = meta('ogTitle');

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '68px 80px',
          background: '#0d0d0e',
          backgroundImage: 'radial-gradient(70% 60% at 50% 0%, rgba(226,232,240,0.17), rgba(13,13,14,0) 72%)',
          color: '#f4f4f5',
          fontFamily: 'Inter',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
            <rect x="1.5" y="4" width="15" height="5" rx="2.5" fill="#f4f4f5" />
            <rect x="7.5" y="15" width="15" height="5" rx="2.5" fill="#f4f4f5" fillOpacity="0.5" />
          </svg>
          <div style={{ fontSize: 38, fontWeight: 600, letterSpacing: '-0.045em' }}>SyncFlow</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: title.length > 50 ? 78 : 94, lineHeight: 1.03, letterSpacing: '-0.045em', fontWeight: 600 }}>{title}</div>
          <div style={{ display: 'flex', marginTop: 30, fontSize: 36, lineHeight: 1.3, letterSpacing: '-0.02em', color: '#a1a1aa' }}>{meta('ogSubtitle', { price })}</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 26, letterSpacing: '-0.01em' }}>
          <div style={{ display: 'flex', padding: '13px 26px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)' }}>{hero('badge')}</div>
          <div style={{ display: 'flex', color: '#a1a1aa' }}>{SITE_URL.replace(/^https?:\/\//, '')}</div>
        </div>
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
