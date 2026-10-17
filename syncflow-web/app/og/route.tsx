import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { getTranslations } from 'next-intl/server';
import { isOpenLocale } from '@/i18n/launch';
import { routing, type AppLocale } from '@/i18n/routing';
import { BRAND, BRAND_COLORS } from '@/lib/brand-paths';
import { SITE_URL } from '@/lib/site';

/**
 * Social share card (1200x630): GET /og?locale=tr
 * Headline and subtitle for og:image / twitter:image (LinkedIn, Slack, X, iMessage, WhatsApp previews). Referenced from
 * generateMetadata with an explicit URL, so there is no redirect. The locale is whitelisted (public languages only); anything else falls back
 * to English. Three ways to draw it, by script (docs/adr/0026-share-cards-in-arabic-and-chinese.md):
 *  - English, Turkish, German, French, Spanish: satori on request, with Inter Display (a static SemiBold built by scripts/build-fonts.py).
 *  - Chinese: satori on request, with a subset of Noto Sans SC (SIL OFL, scripts/build-og-fonts.py) that holds exactly the characters of the
 *    card's three strings; scripts/check-fonts.py fails if the copy needs one more.
 *  - Arabic: a PNG (assets/og-ar.png) rendered once by a browser (scripts/render-og-card-ar.mjs), because satori joins Arabic letters but does
 *    not reorder a right-to-left line, so a headline would come out mirrored. scripts/check-fonts.py fails if messages/ar.json changed since.
 *  - Japanese is not public yet and uses the English card.
 * The response is cacheable for a year at the edge (the "v" query value is bumped when a card changes: v=4 since the Arabic and Chinese cards),
 * and /og is rate limited in proxy.ts because rendering an image costs real CPU.
 *
 * Colours are the palette's (obsidian canvas, platin type, docs/adr/0007), the logo is the drawn B1 horizontal lockup.
 * Fonts and the Arabic PNG are read with fs; next.config.mjs lists them in outputFileTracingIncludes so deployments ship them.
 */
export const runtime = 'nodejs';

const WIDTH = 1200;
const HEIGHT = 630;
const PLATIN = BRAND_COLORS.platin;
const LOGO_HEIGHT = 44;
const CACHE = 'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400';

const asset = (name: string) => readFile(join(process.cwd(), 'assets', name));
let inter: Promise<Buffer> | undefined;
let chinese: Promise<Buffer> | undefined;
let arabicCard: Promise<Buffer> | undefined;

export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get('locale') ?? '';
  const locale: AppLocale = isOpenLocale(requested) ? requested : routing.defaultLocale;

  if (locale === 'ar') {
    arabicCard ??= asset('og-ar.png');
    return new Response(new Uint8Array(await arabicCard), { headers: { 'Content-Type': 'image/png', 'Cache-Control': CACHE } });
  }

  const zh = locale === 'zh';
  // Japanese (a draft, not public) and any other locale use the English card.
  const textLocale: AppLocale = ['en', 'tr', 'de', 'fr', 'es', 'zh'].includes(locale) ? locale : 'en';

  inter ??= asset('og-inter-display-600.ttf');
  if (zh) chinese ??= asset('og-noto-sans-sc-700.otf');
  const [meta, hero, interData, chineseData] = await Promise.all([
    getTranslations({ locale: textLocale, namespace: 'Meta' }),
    getTranslations({ locale: textLocale, namespace: 'Hero' }),
    inter,
    zh ? chinese : undefined,
  ]);
  const line1 = hero('title1');
  const line2 = hero('title2');

  const lockup = BRAND.lockupHorizontal;
  // Latin type is set tight; Han characters are drawn on a square grid and want no tracking and a little more leading.
  const tracking = zh ? '0' : '-0.035em';
  const leading = zh ? 1.15 : 1.02;

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
          background: BRAND_COLORS.obsidian,
          backgroundImage: 'radial-gradient(60% 55% at 78% 8%, rgba(226,226,230,0.08), rgba(13,13,14,0) 70%)',
          color: PLATIN,
          fontFamily: zh ? 'Noto Sans SC, Inter Display' : 'Inter Display',
          border: '1px solid rgba(226,226,230,0.10)',
        }}
      >
        <svg width={Math.round((LOGO_HEIGHT * lockup.w) / lockup.h)} height={LOGO_HEIGHT} viewBox={lockup.viewBox}>
          <path d={lockup.d} fill={PLATIN} fillRule="evenodd" />
        </svg>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: zh ? 108 : 104, lineHeight: leading, letterSpacing: tracking, fontWeight: 600 }}>{line1}</div>
          <div style={{ display: 'flex', fontSize: zh ? 108 : 104, lineHeight: leading, letterSpacing: tracking, fontWeight: 600, color: 'rgba(226,226,230,0.6)' }}>{line2}</div>
          <div style={{ display: 'flex', marginTop: 34, fontSize: 32, lineHeight: zh ? 1.5 : 1.3, letterSpacing: zh ? '0' : '-0.01em', color: 'rgba(226,226,230,0.7)' }}>{meta('ogSubtitle')}</div>
        </div>

        <div style={{ display: 'flex', fontSize: 26, color: 'rgba(226,226,230,0.55)', fontFamily: 'Inter Display' }}>{SITE_URL.replace(/^https?:\/\//, '')}</div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        ...(chineseData ? [{ name: 'Noto Sans SC', data: chineseData, weight: 700 as const, style: 'normal' as const }] : []),
        { name: 'Inter Display', data: interData, weight: 600 as const, style: 'normal' as const },
      ],
      headers: { 'Cache-Control': CACHE },
    },
  );
}
