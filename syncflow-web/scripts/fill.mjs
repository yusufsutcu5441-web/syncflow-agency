// Yer tutucuları tek komutla doldurur (HTML, robots, sitemap, manifest).
//   node scripts/fill.mjs --wa=905321234567 --domain=syncflow.com.tr --tel="+90 532 123 45 67"
// Sonra: node scripts/check.mjs --strict
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)=(.*)$/);
  return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
}));

const map = [];
if (args.wa) {
  if (!/^90\d{10}$/.test(args.wa)) throw new Error('--wa, 90 ile başlayan 12 haneli olmalı (örn. 905321234567)');
  map.push(['905XXXXXXXXX', args.wa]);
}
if (args.domain) {
  const host = String(args.domain).replace(/^https?:\/\//, '').replace(/\/$/, '');
  map.push(['merhaba@__DOMAIN__', 'merhaba@' + host.replace(/^www\./, '')]); // e-posta için www. atılır; önce bu değişir
  map.push(['__DOMAIN__', host]);
}
if (args.tel) map.push(['+90 5XX XXX XX XX', String(args.tel)]);
if (!map.length) {
  console.log('Kullanım: node scripts/fill.mjs --wa=905321234567 --domain=syncflow.com.tr --tel="+90 532 123 45 67"');
  process.exit(0);
}

const EXT = new Set(['.html', '.txt', '.xml', '.webmanifest']);
const SKIP = new Set(['node_modules', '.git', 'scripts']);
let changed = 0;
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (!EXT.has(extname(p))) continue;
    const before = readFileSync(p, 'utf8');
    let after = before;
    for (const [from, to] of map) after = after.split(from).join(to);
    if (after !== before) { writeFileSync(p, after); changed++; console.log('güncellendi: ' + p.slice(root.length + 1)); }
  }
})(root);
console.log(`${changed} dosya güncellendi. Sonra: node scripts/check.mjs --strict`);
