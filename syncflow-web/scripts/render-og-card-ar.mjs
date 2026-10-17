#!/usr/bin/env node
/**
 * Renders the Arabic share card (assets/og-ar.png) with a real browser (docs/adr/0026-share-cards-in-arabic-and-chinese.md).
 *
 * The other cards are drawn on request by satori (app/og/route.tsx). Satori joins Arabic letters with the font's own tables but does not reorder a
 * right-to-left line, so an Arabic headline comes out mirrored. A browser does both correctly, so the card is rendered here once, from the same
 * strings the page uses (messages/ar.json: Hero.title1, Hero.title2, Meta.ogSubtitle), and the route serves the PNG. assets/og-ar.json records a hash
 * of those strings; `python scripts/check-fonts.py` fails when the copy has changed since the card was rendered, so a stale card is never shipped.
 *
 *   node scripts/render-og-card-ar.mjs
 *
 * Needs Node >= 22.18 (it imports lib/brand-paths.ts with built-in type stripping), puppeteer-core (a dev dependency) and Chrome (CHROME_PATH or a
 * common install path). The font is the subset of Noto Sans Arabic (SIL OFL) that scripts/build-og-fonts.py cuts, with all its shaping tables.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { BRAND, BRAND_COLORS } from '../lib/brand-paths.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const chrome =
  process.env.CHROME_PATH ??
  ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((candidate) => existsSync(candidate));
if (!chrome) {
  console.error('Chrome not found. Set CHROME_PATH to the browser executable.');
  process.exit(1);
}

const messages = JSON.parse(readFileSync(join(root, 'messages', 'ar.json'), 'utf8'));
const strings = [messages.Hero.title1, messages.Hero.title2, messages.Meta.ogSubtitle];
const font = readFileSync(join(root, 'assets', 'og-noto-sans-arabic-600.ttf')).toString('base64');
const lockup = BRAND.lockupHorizontal;
const logoHeight = 44;
const logoWidth = Math.round((logoHeight * lockup.w) / lockup.h);

const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<style>
  @font-face { font-family: 'Noto Sans Arabic Card'; src: url(data:font/ttf;base64,${font}) format('truetype'); font-weight: 600; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 1200px; height: 630px; background: ${BRAND_COLORS.obsidian}; }
  .card {
    width: 1200px; height: 630px; padding: 72px 84px; display: flex; flex-direction: column; justify-content: space-between;
    background: ${BRAND_COLORS.obsidian}; background-image: radial-gradient(60% 55% at 78% 8%, rgba(226,226,230,0.08), rgba(13,13,14,0) 70%);
    color: ${BRAND_COLORS.platin}; font-family: 'Noto Sans Arabic Card', sans-serif; font-weight: 600; border: 1px solid rgba(226,226,230,0.10);
  }
  .headline { font-size: 100px; line-height: 1.32; letter-spacing: 0; }
  .headline .second { color: rgba(226,226,230,0.6); }
  .subtitle { margin-top: 30px; font-size: 32px; line-height: 1.5; font-weight: 600; letter-spacing: 0; color: rgba(226,226,230,0.7); }
  .domain { font-family: system-ui, 'Segoe UI', Arial, sans-serif; font-weight: 500; font-size: 26px; direction: ltr; text-align: end; color: rgba(226,226,230,0.55); }
</style>
</head>
<body>
  <div class="card">
    <svg width="${logoWidth}" height="${logoHeight}" viewBox="${lockup.viewBox}"><path d="${lockup.d}" fill="${BRAND_COLORS.platin}" fill-rule="evenodd"/></svg>
    <div>
      <div class="headline">${strings[0]}<br><span class="second">${strings[1]}</span></div>
      <div class="subtitle">${strings[2]}</div>
    </div>
    <div class="domain">syncflow.agency</div>
  </div>
</body>
</html>`;

const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1200, height: 630 } });
  writeFileSync(join(root, 'assets', 'og-ar.png'), png);
  const sha256 = createHash('sha256').update(strings.join('\n')).digest('hex');
  writeFileSync(join(root, 'assets', 'og-ar.json'), `${JSON.stringify({ sha256, strings }, null, 2)}\n`);
  console.log(`assets/og-ar.png: ${(png.length / 1024).toFixed(1)} KB; assets/og-ar.json: ${sha256.slice(0, 12)}…`);
} finally {
  await browser.close();
}
