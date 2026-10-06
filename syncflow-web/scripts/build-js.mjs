// JS paketleyici (esbuild): src/js/main.js -> assets/js/main.js (IIFE, minify, es2020).
//   npm run build:js            tek seferlik
//   node scripts/build-js.mjs --watch
// OneDrive içinde node_modules istemiyorsan paketleri başka bir klasöre kur ve şunları ver:
//   NODE_PATH=<klasör>\node_modules   (esbuild ve motion oradan çözülür)
//   SF_JS_OUT=<çıktı yolu>            (örn. OneDrive dışı geçici dosya; sonra assets/js/main.js üzerine kopyala)
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, delimiter } from 'node:path';
import { statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url); // CJS çözümlemesi NODE_PATH'i de dikkate alır
const esbuild = require('esbuild');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outfile = process.env.SF_JS_OUT || join(root, 'assets/js/main.js');
const options = {
  entryPoints: [join(root, 'src/js/main.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020'],
  outfile,
  legalComments: 'none',
  banner: { js: '/* SyncFlow (src/js). Motion mini © Motion/Framer, MIT: bkz. THIRD-PARTY-NOTICES.txt */' },
  nodePaths: (process.env.NODE_PATH || '').split(delimiter).filter(Boolean),
  logLevel: 'warning',
};

if (process.argv.includes('--watch')) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log('izleniyor: src/js -> ' + outfile);
} else {
  await esbuild.build(options);
  const raw = statSync(outfile).size;
  const gz = gzipSync(readFileSync(outfile), { level: 9 }).length;
  console.log(`${outfile}  ${(raw / 1024).toFixed(1)} KB ham, ${(gz / 1024).toFixed(1)} KB gzip`);
}
