// Site fontlarını (Plus Jakarta Sans, OFL) Remotion'ın public/ klasörüne kopyalar; böylece videolar siteyle aynı fontla çizilir.
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const from = resolve(here, '../../assets/fonts');
const to = resolve(here, '../public/fonts');
mkdirSync(to, { recursive: true });
for (const f of ['plus-jakarta-sans-latin.woff2', 'plus-jakarta-sans-latin-ext.woff2']) {
  const src = join(from, f);
  if (!existsSync(src)) throw new Error('Font bulunamadı: ' + src);
  copyFileSync(src, join(to, f));
}
console.log('fontlar kopyalandı: public/fonts');
