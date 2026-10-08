// Yayın öncesi kontrol: boyut bütçesi, "ölçüldü" rakamlarının güncelliği, yer tutucular, paketlerin güncelliği,
// token/senaryo/sektör çipi eşitliği, istatistik yazımı, ikon tutarlılığı, klinik demosunda yasaklı ifadeler
// ve kırık iç bağlantılar. Bağımlılık gerektirmez.
//   node scripts/check.mjs            -> yer tutucular UYARI
//   node scripts/check.mjs --strict   -> yer tutucular HATA (yayın öncesi bunu çalıştırın)
import { readFileSync, existsSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STRICT = process.argv.includes('--strict');
let fails = 0;
let warns = 0;
const log = (lvl, msg) => {
  if (lvl === 'HATA') fails++;
  if (lvl === 'UYARI') warns++;
  console.log(`${lvl.padEnd(6)} ${msg}`);
};
const read = (p) => readFileSync(join(root, p));
const text = (p) => read(p).toString('utf8');
const gz = (p) => gzipSync(read(p), { level: 9 }).length;
const kb = (n) => n / 1024;
const f1 = (n) => kb(n).toFixed(1).replace('.', ',');
const mtime = (p) => statSync(join(root, p)).mtimeMs;

const PAGES = ['index.html', 'demo/klinik/index.html', 'demo/gayrimenkul/index.html', 'kvkk/index.html', '404.html'];
const CSS = 'assets/css/main.css';
const JS = 'assets/js/main.js';
const FONTS = ['assets/fonts/plus-jakarta-sans-latin.woff2', 'assets/fonts/plus-jakarta-sans-latin-ext.woff2'];

// 1) Boyut bütçesi (gzip)
console.log('\n== Boyut bütçesi (gzip) ==');
const within = (name, bytes, limitKb) => log(kb(bytes) <= limitKb ? 'OK' : 'HATA', `${name}: ${f1(bytes)} KB (bütçe ≤ ${limitKb} KB)`);
within('index.html', gz('index.html'), 12);
within(CSS, gz(CSS), 15);
within(`${JS} (Motion mini dahil)`, gz(JS), 12);
const fontBytes = FONTS.reduce((sum, f) => sum + statSync(join(root, f)).size, 0);
within('fontlar (latin + latin-ext)', fontBytes, 50);
const firstLoad = gz('index.html') + gz(CSS) + gz(JS) + fontBytes;
within('ilk yükleme toplamı (index + CSS + JS + fontlar)', firstLoad, 120);

const codeKb = f1(gz(CSS) + gz(JS));
const klinikKb = f1(gz('demo/klinik/index.html') + gz(CSS) + gz(JS));
const emlakKb = f1(gz('demo/gayrimenkul/index.html') + gz(CSS) + gz(JS));
console.log(`Bilgi: CSS+JS = ${codeKb} KB | demo toplamı (HTML+CSS+JS): klinik ${klinikKb} KB, gayrimenkul ${emlakKb} KB (font hariç)`);

// 2) Paketler güncel mi? (kaynaklar değiştiyse derlemeyi unutma)
console.log('\n== Derleme güncelliği ==');
{
  const jsSrc = ['src/js/main.js', 'src/js/lead.js', 'src/js/chat-sim.js', 'src/js/reveal.js', 'src/js/sims.js', 'src/js/motion.js', 'src/core/tokens.js', 'src/core/scenarios.js'];
  const newestJs = Math.max(...jsSrc.map(mtime));
  log(mtime(JS) + 2000 >= newestJs ? 'OK' : 'UYARI', mtime(JS) + 2000 >= newestJs ? `${JS} kaynaklardan eski değil` : `${JS}, src/js veya src/core'dan eski: npm run build:js çalıştırın`);
  const newestCss = Math.max(mtime('src/styles/input.css'), ...PAGES.map(mtime));
  log(mtime(CSS) + 2000 >= newestCss ? 'OK' : 'UYARI', mtime(CSS) + 2000 >= newestCss ? `${CSS} kaynaklardan eski değil` : `${CSS}, input.css veya HTML'den eski: npm run build:css çalıştırın`);
}

// 3) Sayfadaki "ölçüldü" rakamları güncel mi?
console.log('\n== Sayfadaki rakamların güncelliği ==');
const idx = text('index.html');
const stale = (label, found, expected) => {
  if (!found) return log('UYARI', `${label}: sayfada bulunamadı`);
  if (/__/.test(found)) return log(STRICT ? 'HATA' : 'UYARI', `${label}: yer tutucu (${found}) → ölçülen ${expected} KB ile doldurulmalı`);
  log(found === expected ? 'OK' : 'UYARI', `${label}: sayfada ${found} KB, ölçülen ${expected} KB`);
};
stale('Sorun kartı "CSS+JS yükü"', (idx.match(/Bu sayfanın CSS\+JS yükü: <strong>([^<\s]+) KB/) || [])[1], codeKb);
stale('Demo notu (klinik)', (idx.match(/klinik <strong>([^<\s]+) KB/) || [])[1], klinikKb);
stale('Demo notu (gayrimenkul)', (idx.match(/gayrimenkul <strong>([^<\s]+) KB/) || [])[1], emlakKb);

// 4) Yer tutucular
console.log('\n== Yer tutucular ==');
const TOKENS = ['__DOMAIN__', '905XXXXXXXXX', '5XX XXX XX XX', '__PAGE_KB__', '__KLINIK_KB__', '__EMLAK_KB__'];
let tokenHits = 0;
for (const f of [...PAGES, 'robots.txt', 'sitemap.xml', 'site.webmanifest']) {
  const s = text(f);
  const hits = TOKENS.filter((t) => s.includes(t));
  if (hits.length) { tokenHits++; log(STRICT ? 'HATA' : 'UYARI', `${f}: ${hits.join(', ')}`); }
}
if (!tokenHits) log('OK', 'doldurulmamış yer tutucu yok');

// 5) Paylaşılan çekirdek: tokenlar CSS ile aynı mı, senaryolar geçerli mi, hero metni senaryoyla eşleşiyor mu
console.log('\n== Çekirdek modüller (tokens / scenarios) ==');
const { colors } = await import(pathToFileURL(join(root, 'src/core/tokens.js')).href);
const { scenarios } = await import(pathToFileURL(join(root, 'src/core/scenarios.js')).href);
{
  const css = text('src/styles/input.css');
  const theme = {};
  for (const m of css.matchAll(/--color-(navy|teal)-(\d+):\s*(#[0-9a-fA-F]{6})/g)) theme[`${m[1]}${m[2]}`] = m[3].toLowerCase();
  const bad = Object.entries(colors).filter(([k, v]) => theme[k] !== v.toLowerCase()).map(([k, v]) => `${k}: tokens ${v} ≠ css ${theme[k]}`);
  log(bad.length ? 'HATA' : 'OK', bad.length ? `tokens.js ↔ input.css farkı: ${bad.join('; ')}` : `${Object.keys(colors).length} renk tokenı input.css @theme ile aynı`);
}
{
  const problems = [];
  const ids = new Set();
  for (const sc of scenarios) {
    if (ids.has(sc.id)) problems.push(`yinelenen id: ${sc.id}`);
    ids.add(sc.id);
    if (!sc.brand || !sc.brand.name || !sc.setup || !sc.sector) problems.push(`${sc.id}: brand/setup/sector eksik`);
    const types = sc.steps.map((s) => s.type).join('>');
    if (types !== 'in>typing>out>tag') problems.push(`${sc.id}: adım sırası "${types}" (beklenen in>typing>out>tag)`);
    const ats = sc.steps.map((s) => s.at);
    if (ats.some((a, i) => i && a <= ats[i - 1])) problems.push(`${sc.id}: "at" değerleri artan olmalı`);
    const out = sc.steps.find((s) => s.type === 'out');
    const ty = sc.steps.find((s) => s.type === 'typing');
    if (out && ty && ty.at + ty.duration > out.at + 0.5) problems.push(`${sc.id}: yazıyor göstergesi yanıttan çok sonra bitiyor`);
  }
  if (!ids.has('genel')) problems.push('"genel" senaryosu yok');
  log(problems.length ? 'HATA' : 'OK', problems.length ? problems.join(' | ') : `${scenarios.length} senaryo geçerli (in > typing > out > tag)`);
}
{
  const g = scenarios.find((s) => s.id === 'genel');
  const need = [g.brand.name, ...g.steps.filter((s) => s.text).map((s) => s.text)];
  const missing = need.filter((t) => !idx.includes(t.replace(/&/g, '&amp;')));
  log(missing.length ? 'HATA' : 'OK', missing.length ? `hero statik metni senaryodan farklı: ${missing.join(' | ')}` : 'hero statik (JS\'siz) metni "genel" senaryosuyla aynı');
}

// 5b) Remotion hazırlığı: iskelet tam mı, çekirdek veri saf mı, paket sürümleri sabit mi
console.log('\n== Remotion hazırlığı ==');
{
  const need = ['remotion/package.json', 'remotion/tsconfig.json', 'remotion/src/index.ts', 'remotion/src/Root.tsx', 'remotion/src/WhatsAppDemo.tsx',
    'remotion/src/SectorShowcase.tsx', 'remotion/src/data.ts', 'remotion/src/types.ts', 'remotion/src/fonts.ts', 'remotion/README.md'];
  const missing = need.filter((f) => !existsSync(join(root, f)));
  log(missing.length ? 'HATA' : 'OK', missing.length ? `eksik dosya: ${missing.join(', ')}` : 'Remotion iskeleti tam');
  const data = text('remotion/src/data.ts');
  log(data.includes('../../src/core/scenarios.js') && data.includes('../../src/core/tokens.js') ? 'OK' : 'HATA', 'Remotion senaryo ve tokenları ../../src/core modüllerinden alıyor (tek doğruluk kaynağı)');
  const dom = ['document', 'window', 'localStorage', 'sessionStorage', 'matchMedia', 'navigator', 'requestAnimationFrame'];
  for (const f of ['src/core/tokens.js', 'src/core/scenarios.js']) {
    const code = text(f).replace(/\/\/.*$/gm, '');
    const hit = dom.filter((d) => new RegExp(`\\b${d}\\b`).test(code));
    log(hit.length ? 'HATA' : 'OK', hit.length ? `${f} tarayıcıya bağımlı: ${hit.join(', ')}` : `${f} saf veri (DOM yok), Remotion'da yeniden kullanılabilir`);
  }
  const pj = JSON.parse(text('remotion/package.json'));
  const versions = Object.entries(pj.dependencies || {}).filter(([k]) => k === 'remotion' || k.startsWith('@remotion/')).map(([, v]) => v);
  log(versions.length && new Set(versions).size === 1 ? 'OK' : 'HATA', `remotion paketleri aynı sürüme sabit: ${[...new Set(versions)].join(', ')}`);
}

// 6) Sektör çipleri tüm formlarda aynı ve senaryolarla eşleşiyor mu
console.log('\n== Sektör çipleri ==');
{
  const expected = scenarios.filter((s) => s.id !== 'genel').map((s) => s.sector);
  const groups = [...idx.matchAll(/<div class="chips[^"]*" role="group" aria-label="Sektörünüz">([\s\S]*?)<\/div>/g)].map((m) => [...m[1].matchAll(/data-val="([^"]+)"/g)].map((x) => x[1]));
  log(groups.length === 3 ? 'OK' : 'HATA', `${groups.length} sektör çip grubu bulundu (kapanış formu, sheet, "Sizin Sektörünüz")`);
  groups.forEach((g, i) => log(JSON.stringify(g) === JSON.stringify(expected) ? 'OK' : 'HATA', `grup ${i + 1}: ${g.join(' · ')}`));
  const ownIds = [...(idx.match(/data-own[\s\S]*?<\/article>/) || [''])[0].matchAll(/data-scenario="([^"]+)"/g)].map((m) => m[1]);
  const expIds = scenarios.filter((s) => s.id !== 'genel').map((s) => s.id);
  log(JSON.stringify(ownIds) === JSON.stringify(expIds) ? 'OK' : 'HATA', `"Sizin Sektörünüz" senaryo kimlikleri: ${ownIds.join(', ')}`);
}

// 7) Üst şerit, istatistik yazımı ve ikon tutarlılığı
console.log('\n== Tipografi ve ikon tutarlılığı ==');
{
  log(/class="topbar"/.test(idx) && /topbar-in/.test(idx) ? 'OK' : 'HATA', 'sektör üst şeridi (topbar) mevcut');
  const stats = [...idx.matchAll(/<p class="stat-hero-(?:t|l)">([^<]+)<\/p>/g)].map((m) => m[1].trim());
  const lower = stats.filter((s) => !/^[A-ZÇĞİÖŞÜ0-9%]/.test(s));
  log(stats.length === 6 && !lower.length ? 'OK' : 'HATA', lower.length ? `büyük harfle başlamayan istatistik metni: ${lower.join(' | ')}` : `${stats.length} istatistik metni büyük harf/rakamla başlıyor`);
  const arrow = '<svg aria-hidden="true"><use href="#i-arrow"/></svg></a>';
  const heroCta = (idx.match(/id="heroCta"[\s\S]*?<\/div>/) || [''])[0];
  const sticky = (idx.match(/id="stickyCta"[\s\S]*?<\/div>/) || [''])[0];
  const btnEnds = (html) => [...html.matchAll(/<a class="btn[^>]*>[\s\S]*?<\/a>/g)].map((m) => m[0].endsWith(arrow));
  const hb = btnEnds(heroCta);
  const sb = btnEnds(sticky);
  log(hb.length === 2 && hb.every(Boolean) ? 'OK' : 'HATA', `hero CTA: ${hb.length} buton, hepsinde sona yerleşik ok ikonu: ${hb.every(Boolean)}`);
  log(sb.length === 2 && sb.every(Boolean) ? 'OK' : 'HATA', `sabit çubuk: ${sb.length} buton, hepsinde sona yerleşik ok ikonu: ${sb.every(Boolean)}`);
  const allBtns = [...idx.matchAll(/<a class="btn[^>]*>[\s\S]*?<\/a>/g)].map((m) => m[0]);
  const noIcon = allBtns.filter((b) => !/<svg/.test(b));
  log(noIcon.length ? 'UYARI' : 'OK', noIcon.length ? `ikonsuz buton: ${noIcon.map((b) => b.replace(/<[^>]+>/g, '').trim()).join(' | ')}` : `${allBtns.length} butonun hepsinde ikon var`);
}

// 8) Klinik demosunda yönetmelikçe sakıncalı ifade taraması (SyncFlow notu bölümü hariç)
console.log('\n== Klinik demosu: yasaklı ifade taraması ==');
{
  const plain = text('demo/klinik/index.html')
    .replace(/<details[^>]*data-meta[\s\S]*?<\/details>/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
  const BAN = [/fiyat/, /ücret/, /indirim/, /kampanya/, /promosyon/, /en iyi/, /garanti/, /mucize/, /ağrısız/, /%\s?100/,
    /(önce|öncesi)[\s\-–/&]*(ve\s*)?(sonra|sonrası)/, /hasta yorum/, /memnuniyet/, /referans/];
  const bad = BAN.map((re) => (plain.match(re) || [])[0]).filter(Boolean);
  log(bad.length ? 'HATA' : 'OK', bad.length ? `bulundu: ${bad.join(', ')}` : 'fiyat/kampanya/önce-sonra/yorum/üstünlük ifadesi yok');
  const ensure = ['tel:', 'data-compose', 'KVKK'];
  const raw = text('demo/klinik/index.html');
  ensure.forEach((s) => { if (!raw.includes(s)) log('UYARI', `klinik demosunda "${s}" bulunamadı`); });
  if (!/Son güncelleme: \d{2}\.\d{2}\.\d{4}/.test(raw)) log('UYARI', 'klinik demosunda "Son güncelleme" tarihi yok');
}

// 9) İç bağlantılar ve sayfa içi çapalar
console.log('\n== Bağlantılar ==');
let linkProblems = 0;
for (const f of PAGES) {
  const html = text(f);
  const ids = new Set([...html.matchAll(/\bid=["']([^"']+)["']/g)].map((m) => m[1]));
  for (const m of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)) {
    const u = m[1];
    if (/^(https?:|mailto:|tel:|data:|\/\/)/.test(u) || u.includes('__DOMAIN__')) continue;
    if (u.startsWith('#')) {
      if (u.length > 1 && !ids.has(u.slice(1))) { linkProblems++; log('HATA', `${f}: #${u.slice(1)} hedefi yok`); }
      continue;
    }
    const clean = u.split('#')[0].split('?')[0];
    if (!clean) continue;
    let target = clean.startsWith('/') ? join(root, clean) : resolve(root, dirname(f), clean);
    if (clean.endsWith('/') || (existsSync(target) && statSync(target).isDirectory())) target = join(target, 'index.html');
    if (!existsSync(target)) { linkProblems++; log('HATA', `${f}: kırık bağlantı → ${u}`); }
  }
}
if (!linkProblems) log('OK', `${PAGES.length} sayfada kırık iç bağlantı/çapa yok`);

console.log(`\nSonuç: ${fails} hata, ${warns} uyarı${STRICT ? ' (strict)' : ''}`);
process.exit(fails ? 1 : 0);
