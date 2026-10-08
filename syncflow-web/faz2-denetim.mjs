#!/usr/bin/env node
/**
 * SyncFlow denetimi. Faz 2: bağımlılıklar, tasarım tokenları (Blueprint, docs/adr/0006; palet ve marka 0007), next-intl iskeleti, CSP.
 * Faz 3: hareket ve kaydırma (Lenis ve Motion ilk yüke girmez, azaltılmış hareket, JS'siz görünürlük).
 * Faz 4: Blueprint ana sayfası, briefing (honeypot, Turnstile, origin, imzalı webhook), vitrin videoları, doğrulanmamış iddia yasağı.
 * Faz 5: 7 dil altyapısı (taslak diller uykuda, RTL, yayın listesi), hreflang/sitemap yalnızca yayındaki dillere.
 * 2B-4 (docs/adr/0011): hukuki sayfaların yapısı (KVKK m.10 / GDPR m.13), tarih, rıza bağlantısı; içerik yer tutuculu taslak kalır.
 * 2B-3 (docs/adr/0010): teslimde id + tek yeniden deneme (bütçe < 10 sn), hız sınırı uyarısı, security.txt süresi.
 * 2B-2 (docs/adr/0009): TR/EN odak, yedi dil iddiası yok, vitrin kilitli üç sektör (emlak, klinik, kurumsal hukuk), SaaS ve "Reach" bölümü yok.
 * 2B-1: tokenlar ve marka (docs/adr/0007): obsidian/platin/şampanya paleti, saf siyah-beyaz yok, Instrument Sans, tek hap ve etiket tarifi, B1/v2 logo.
 * Kullanım (proje kökünden):   node faz2-denetim.mjs [--root yol] [--build] [--json]
 *   --build  `npm run build` çalıştırır (production build)    --json  faz2-denetim.json yazar
 * Hiçbir dosyayı değiştirmez; yalnızca okur ve raporlar. Çıkış kodu: FAIL varsa 1.
 */
/* eslint-disable @typescript-eslint/no-unused-expressions -- kompakt raporlama biçimi: sonuçlar üçlü ifade deyimleriyle eklenir */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const ROOT = path.resolve(args.includes("--root") ? args[args.indexOf("--root") + 1] : process.cwd());
const DO_BUILD = args.includes("--build"), DO_JSON = args.includes("--json");
const results = [];
const add = (group, level, msg, detail = "") => results.push({ group, level, msg, detail });
const abs = (p) => path.join(ROOT, p);
const exists = (p) => fs.existsSync(abs(p));
const read = (p) => fs.readFileSync(abs(p), "utf8");
const readJSON = (p) => JSON.parse(read(p));
const first = (list) => list.find(exists);
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
function walk(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git", "out", "dist"].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, exts, out);
    else if (exts.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
}
const rel = (p) => path.relative(ROOT, p).replaceAll("\\", "/");

/* ───────── 1) Ortam ve bağımlılıklar ───────── */
const G1 = "1. Bağımlılıklar";
const [nMaj, nMin] = process.versions.node.split(".").map(Number);
(nMaj > 20 || (nMaj === 20 && nMin >= 9)) ? add(G1, "PASS", `Node ${process.versions.node} (Next 16 için gerekli: >=20.9.0)`)
  : add(G1, "FAIL", `Node ${process.versions.node}: Next 16 için >=20.9.0 gerekir`);

let nextMajor = null;
if (!exists("package.json")) add(G1, "FAIL", "package.json bulunamadı", ROOT);
else {
  const pkg = readJSON("package.json"), all = { ...pkg.dependencies, ...pkg.devDependencies };
  const want = { next: 16, react: 19, "react-dom": 19, tailwindcss: 4, "@tailwindcss/postcss": 4, "next-intl": 4 };
  for (const [name, major] of Object.entries(want)) {
    if (!all[name]) { add(G1, "FAIL", `${name} package.json'da yok`); continue; }
    let inst = null; try { inst = readJSON(`node_modules/${name}/package.json`).version; } catch {}
    if (!inst) add(G1, "WARN", `${name} (${all[name]}) kurulu değil, npm install gerekebilir`);
    else if (parseInt(inst) !== major) add(G1, "FAIL", `${name} ${inst} kurulu, beklenen ${major}.x`);
    else add(G1, "PASS", `${name} ${inst}`);
    if (name === "next" && inst) nextMajor = parseInt(inst);
  }
  if (all["framer-motion"]) add(G1, "WARN", "framer-motion var; proje `motion` paketini (motion/react) kullanır");
  // Faz 2 kararı (docs/adr/0003): tarayıcıda Remotion çalışmaz. remotion yalnızca devDependencies'te, film render'ı için.
  const runtimeDeps = pkg.dependencies ?? {};
  for (const name of ["@remotion/player", "remotion"]) if (runtimeDeps[name]) add(G1, "FAIL", `${name} çalışma zamanı bağımlılığı: Faz 2'de çıkarıldı, yalnızca devDependencies olabilir (docs/adr/0003)`);
  if (!runtimeDeps["@remotion/player"] && !runtimeDeps.remotion) add(G1, "PASS", "tarayıcı paketine Remotion girmiyor (remotion yalnızca devDependencies)");
  for (const opt of ["motion", "lenis"]) add(G1, all[opt] ? "PASS" : "INFO", all[opt] ? `${opt} ${all[opt]}` : `${opt} henüz yok (Faz 3'te eklenecek)`);
  if (all.typescript) {
    let tv = null; try { tv = readJSON("node_modules/typescript/package.json").version; } catch {}
    add(G1, "INFO", `typescript ${tv || all.typescript}` + (tv && parseInt(tv) >= 7 ? " (7.x: eklenti/ESLint uyumunu doğrulayın)" : ""));
  }
}
if (first(["tailwind.config.ts", "tailwind.config.js", "tailwind.config.mjs"])) add(G1, "INFO", "tailwind.config.* var; Tailwind v4 CSS-first çalışır, yapılandırma globals.css içinde olmalı");
const pc = first(["postcss.config.mjs", "postcss.config.js", "postcss.config.cjs", "postcss.config.ts"]);
pc ? (read(pc).includes("@tailwindcss/postcss") ? add(G1, "PASS", `${pc} @tailwindcss/postcss kullanıyor`) : add(G1, "WARN", `${pc} içinde @tailwindcss/postcss görünmüyor`))
   : add(G1, "WARN", "postcss.config.* bulunamadı");

/* ───────── 2) Tasarım tokenları ───────── */
const G2 = "2. Tasarım tokenları (globals.css)";
const css = first(["src/app/globals.css", "app/globals.css"]);
if (!css) add(G2, "FAIL", "globals.css bulunamadı (src/app veya app altında)");
else {
  const raw = read(css), c = stripComments(raw), low = c.toLowerCase();
  add(G2, "INFO", `Dosya: ${css}` + (css.startsWith("src/") ? "" : " (src/ olmadan: kök app/ düzeni)"));
  /@import\s+["']tailwindcss["']/.test(c) ? add(G2, "PASS", '@import "tailwindcss" var') : add(G2, "FAIL", '@import "tailwindcss" yok');
  /@theme\b/.test(c) ? add(G2, "PASS", "@theme bloğu var") : add(G2, "WARN", "@theme bloğu yok; tokenlar Tailwind yardımcı sınıflarına dönüşmez");

  // Palet (docs/adr/0007): obsidian zemin, iki katman, platin metin, şampanya vurgu. Cam çizgiler sahibin onayladığı #ffffff1a ve #ffffff40.
  const req = { "#0d0d0e": "zemin (obsidian)", "#141416": "katman 1", "#1a1a1e": "katman 2", "#e2e2e6": "metin (platin)", "#d4c5a9": "vurgu (şampanya)" };
  for (const [hex, name] of Object.entries(req)) low.includes(hex) ? add(G2, "PASS", `${hex} ${name}`) : add(G2, "FAIL", `${hex} ${name} tanımlı değil`);
  /#ffffff1a/i.test(c) ? add(G2, "PASS", "cam kenarlık #ffffff1a (%10)") : add(G2, "FAIL", "cam kenarlık #ffffff1a tanımlı değil");
  /#ffffff40/i.test(c) ? add(G2, "PASS", "hover kenarlığı #ffffff40 (%25)") : add(G2, "FAIL", "hover kenarlığı #ffffff40 tanımlı değil");
  /-0?\.02em/.test(c) ? add(G2, "PASS", "display tracking -0.02em") : add(G2, "FAIL", "-0.02em tracking tanımı yok");
  /\[lang=['"]?ar['"]?\][^{]*\{[^}]*(?:--tracking|letter-spacing)/.test(c) || /:lang\(ar\)[^{]*\{[^}]*(?:--tracking|letter-spacing)/.test(c)
    ? add(G2, "PASS", "Arapçada harf aralığı sıfırlanıyor (bitişik yazı bozulmaz)") : add(G2, "FAIL", "Arapça için harf aralığı sıfırlaması yok (letter-spacing bitişik harfleri koparır)");
  const bad = [
    [/-0?\.045em|-0?\.04em/g, "eski sıkı tracking (-0.04/-0.045em); display için -0.02em olmalı", "FAIL"],
    [/font-weight\s*:\s*(?:100|200|300|700|800|900)\b/g, "Instrument Sans'ta olmayan ağırlık (aile 400-600 taşır; 300 sessizce 400 çizilir)", "FAIL"],
    [/font-style\s*:\s*italic/g, "italik yasak", "WARN"],
    [/\b(?:turquoise|aqua|cyan|teal|navy)\b|#(?:00ffff|40e0d0|2dd4bf|14b8a6|06b6d4)\b/gi, "turkuaz/lacivert tonu (palet tek renklidir)", "FAIL"],
  ];
  let clean = true;
  for (const [re, msg, lvl] of bad) { const m = c.match(re); if (m) { clean = false; add(G2, lvl, `${msg}: ${[...new Set(m)].slice(0, 4).join(", ")}`); } }
  if (clean) add(G2, "PASS", "yasaklı değer bulunmadı");

  // Saf siyah ve saf beyaz hiçbir yerde yok (CSS, bileşenler, OG kartı, Remotion sahneleri): koyular obsidian, açıklar platin.
  const PURE = /#(?:000|000000|fff|ffffff)\b|rgba?\(\s*(?:0\s*[ ,]\s*0\s*[ ,]\s*0|255\s*[ ,]\s*255\s*[ ,]\s*255)\b|(?<![-\w])(?:black|white)(?![-\w])/gi;
  const pureHits = [];
  for (const f of [abs(css), ...walk(abs("app"), [".tsx", ".ts"]), ...walk(abs("components"), [".tsx", ".ts"]), ...walk(abs("lib"), [".ts", ".tsx"]), ...walk(abs("remotion"), [".tsx", ".ts"])]) {
    if (rel(f).endsWith("brand-paths.ts")) continue;
    for (const m of stripComments(fs.readFileSync(f, "utf8")).match(PURE) ?? []) pureHits.push(`${rel(f)}: ${m}`);
  }
  pureHits.length ? add(G2, "FAIL", `saf siyah/beyaz kaldı (${pureHits.length}); obsidian #0D0D0E ve platin #E2E2E6 kullanın: ${[...new Set(pureHits)].slice(0, 5).join(" | ")}`)
    : add(G2, "PASS", "saf siyah ve saf beyaz yok (CSS, bileşenler, OG kartı, Remotion sahneleri)");

  // Yazı tipi: Instrument Sans (OFL), kendi sunucumuzdan; Inter kalmadı.
  /@font-face\s*\{[^}]*font-family:\s*['"]Instrument Sans['"][^}]*font-weight:\s*400\s+600/.test(c)
    ? add(G2, "PASS", "@font-face 'Instrument Sans' (400-600) tanımlı") : add(G2, "FAIL", "@font-face 'Instrument Sans' font-weight 400 600 ile tanımlı değil");
  /--font-sans:\s*['"]Instrument Sans['"]/.test(c) ? add(G2, "PASS", "--font-sans Instrument Sans ile başlıyor") : add(G2, "FAIL", "--font-sans Instrument Sans ile başlamıyor");
  const fontFiles = ["public/fonts/instrument-sans-latin-v1.woff2", "public/fonts/instrument-sans-turkish-v1.woff2", "assets/og-instrument-sans-600.ttf"];
  const lostFonts = fontFiles.filter((f) => !exists(f));
  lostFonts.length ? add(G2, "FAIL", `yazı tipi dosyası yok: ${lostFonts.join(", ")} (scripts/build-fonts.py üretir)`) : add(G2, "PASS", "Instrument Sans dosyaları (Latin, Türkçe, OG kartı) var");
  exists("public/fonts/OFL.txt") && /Instrument Sans/.test(read("public/fonts/OFL.txt")) ? add(G2, "PASS", "public/fonts/OFL.txt Instrument Sans lisansı") : add(G2, "FAIL", "public/fonts/OFL.txt Instrument Sans lisansını taşımıyor");
  const oldInter = [...walk(abs("app"), [".tsx", ".ts", ".css"]), ...walk(abs("components"), [".tsx"]), ...walk(abs("remotion"), [".tsx", ".ts"])].filter((f) => /['"]Inter['"]|inter-(?:latin|turkish)|og-inter/.test(fs.readFileSync(f, "utf8"))).map(rel)
    .concat(exists("public/fonts") ? fs.readdirSync(abs("public/fonts")).filter((n) => /^inter-/i.test(n)).map((n) => `public/fonts/${n}`) : []);
  oldInter.length ? add(G2, "FAIL", `eski Inter izi: ${oldInter.slice(0, 4).join(", ")}`) : add(G2, "PASS", "Inter izi kalmadı");

  // Hap düğmeler: tek tarif (.btn), birincil şampanya.
  /--radius-pill:\s*999px/.test(c) ? add(G2, "PASS", "--radius-pill 999px") : add(G2, "FAIL", "--radius-pill: 999px tanımlı değil");
  /\.btn\s*\{[^}]*border-radius:\s*var\(--radius-pill\)/.test(c) ? add(G2, "PASS", ".btn hap (border-radius: var(--radius-pill))") : add(G2, "FAIL", ".btn hap değil");
  /\.btn-primary\s*\{[^}]*background:\s*var\(--color-champagne\)/.test(c) ? add(G2, "PASS", "birincil düğme şampanya, tek vurgu rengi") : add(G2, "FAIL", ".btn-primary şampanya (--color-champagne) değil");

  // Mono etiketler: tek tarif. Büyük harf ve etiket aralığı CSS'te yalnızca bir yerde yazılır.
  const upper = (c.match(/text-transform:\s*uppercase/g) ?? []).length, track = (c.match(/letter-spacing:\s*var\(--tracking-label\)/g) ?? []).length;
  const recipe = c.match(/((?:\.[\w-]+(?: \.[\w-]+)?,?\s*)+)\{[^}]*text-transform:\s*uppercase[^}]*\}/)?.[1] ?? "";
  const members = [".label", ".chip", ".badge", ".lang-trigger", ".lang-item .code"].filter((m) => recipe.includes(m));
  upper === 1 && track === 1 && members.length === 5
    ? add(G2, "PASS", "büyük harfli mono etiket tek tarifte (.label .chip .badge .lang-trigger .lang-item .code)")
    : add(G2, "FAIL", `etiket tarifi dağınık: text-transform:uppercase ${upper}x, letter-spacing:var(--tracking-label) ${track}x, tarifte ${members.length}/5 sınıf`);
  /\.label,[^{]*\{[^}]*font-family:\s*var\(--font-mono\)/.test(c) ? add(G2, "PASS", "etiket tarifi mono yazı tipi (--font-mono)") : add(G2, "FAIL", "etiket tarifi --font-mono kullanmıyor");

  // Marka paketi B1/v2 (brand/README.md): tek renk, eğriye çevrilmiş SVG, koddaki yollar paketle aynı.
  const brandFiles = ["brand/README.md", "brand/favicon.svg", "brand/monogram-b1-platin.svg", "brand/monogram-b1-obsidian.svg", "brand/monogram-b1-small-platin.svg", "brand/lockup-horizontal-platin.svg", "brand/lockup-stacked-platin.svg", "brand/wordmark-platin.svg"];
  const lostBrand = brandFiles.filter((f) => !exists(f));
  lostBrand.length ? add(G2, "FAIL", `marka dosyası yok: ${lostBrand.join(", ")}`) : add(G2, "PASS", "brand/ paketi (B1 monogram, yatay ve yığılmış kilit, wordmark, favicon) depoda");
  const brandSvgs = fs.existsSync(abs("brand")) ? fs.readdirSync(abs("brand")).filter((n) => n.endsWith(".svg") && n !== "construction-b1.svg") : [];
  const offBrand = brandSvgs.filter((n) => { const t = read(`brand/${n}`); return /gradient|filter|shadow|<text|font-family/i.test(t) || [...t.matchAll(/fill="(#[0-9a-fA-F]{6})"/g)].some((m) => !["#E2E2E6", "#0D0D0E"].includes(m[1].toUpperCase())); });
  offBrand.length ? add(G2, "FAIL", `logo dosyası tek renk/eğri kuralını bozuyor: ${offBrand.join(", ")}`) : add(G2, "PASS", `${brandSvgs.length} logo dosyası tek renk (platin ya da obsidian), eğri, gradyansız, canlı yazı tipsiz`);
  const bb = spawnSync(process.execPath, ["scripts/build-brand.mjs", "--check"], { cwd: ROOT, encoding: "utf8" });
  bb.status === 0 ? add(G2, "PASS", "lib/brand-paths.ts, app/icon.svg, apple-icon.png ve logo-512.png marka paketiyle aynı") : add(G2, "FAIL", `marka çıktıları eski: ${(bb.stdout + bb.stderr).trim().split("\n")[0]} (npm run brand:build)`);
  const logo = exists("components/ui/Logo.tsx") ? read("components/ui/Logo.tsx") : "", head = exists("components/layout/Header.tsx") ? read("components/layout/Header.tsx") : "", foot = exists("components/layout/Footer.tsx") ? read("components/layout/Footer.tsx") : "";
  /brand-paths/.test(logo) && /currentColor/.test(logo) && /<Logo\b/.test(head) && /<Logo\s+part="wordmark"/.test(foot) && !/Wordmark\b/.test(head + foot)
    ? add(G2, "PASS", "header B1 yatay kilidi, footer çizili wordmark; metinle yazılmış wordmark kalmadı") : add(G2, "FAIL", "Logo bileşeni brand-paths/currentColor kullanmıyor ya da header/footer çizili logoyu kullanmıyor");
  exists("app/apple-icon.png") && exists("public/brand/logo-512.png") && /logo-512\.png/.test(read("lib/jsonld.ts")) ? add(G2, "PASS", "apple-icon ve JSON-LD logosu raster (B1)") : add(G2, "FAIL", "apple-icon.png / JSON-LD logo-512.png eksik");
}

/* ───────── 3) next-intl TR/EN iskeleti ───────── */
const G3 = "3. next-intl iskeleti";
const base = exists("src/app") ? "src" : ".";
const sub = (p) => (base === "." ? p : `${base}/${p}`);
for (const f of ["i18n/routing.ts", "i18n/request.ts"]) {
  const p = sub(f); exists(p) ? add(G3, "PASS", p) : add(G3, "FAIL", `${p} yok`);
}
// Dil önekli yollar: next-intl'in createNavigation'ı (i18n/navigation.ts) YA DA projenin kendi yardımcısı. Proje ikincisini
// bilerek seçti: lib/i18n-paths.ts (withLocale/stripLocale), next-intl'in istemci çalışma zamanını tarayıcı paketinden uzak tutar.
const navHelper = first([sub("i18n/navigation.ts"), "lib/i18n-paths.ts"]);
navHelper && /withLocale|createNavigation/.test(read(navHelper))
  ? add(G3, "PASS", `${navHelper}: dil önekli yollar`)
  : add(G3, "FAIL", "dil önekli yol yardımcısı yok (i18n/navigation.ts ya da lib/i18n-paths.ts withLocale)");
const proxy = first([sub("proxy.ts"), "proxy.ts", sub("proxy.js"), "proxy.js"]);
const mw = first([sub("middleware.ts"), "middleware.ts", sub("middleware.js"), "middleware.js"]);
if (proxy) { const t = read(proxy); /create\w*Middleware/.test(t) && /routing/.test(t) ? add(G3, "PASS", `${proxy} next-intl createMiddleware(routing) (createIntlMiddleware adı dahil)`) : add(G3, "WARN", `${proxy} içinde createMiddleware(routing) görünmüyor`);
  /matcher/.test(t) ? add(G3, "PASS", "proxy matcher tanımlı") : add(G3, "WARN", "proxy matcher yok (_next, api, statik dosyalar hariç tutulmalı)"); }
else if (mw) add(G3, nextMajor >= 16 ? "WARN" : "INFO", `${mw} bulundu; Next 16'da dosya adı proxy.ts olmalı`);
else add(G3, "FAIL", "proxy.ts (Next 16) / middleware.ts bulunamadı");
const nc = first(["next.config.ts", "next.config.mjs", "next.config.js"]);
nc ? (/createNextIntlPlugin/.test(read(nc)) ? add(G3, "PASS", `${nc} createNextIntlPlugin kullanıyor`) : add(G3, "FAIL", `${nc} createNextIntlPlugin ile sarılmamış`)) : add(G3, "FAIL", "next.config.* yok");
const rt = sub("i18n/routing.ts");
if (exists(rt)) {
  const t = stripComments(read(rt)), m = t.match(/locales\s*:\s*\[([^\]]*)\]/);
  const locs = m ? [...m[1].matchAll(/["']([^"']+)["']/g)].map((x) => x[1]) : [];
  if (!locs.length) add(G3, "WARN", "routing.ts içinde locales okunamadı");
  else { const want7 = ["en", "tr", "de", "fr", "es", "ar", "ja"], miss = want7.filter((l) => !locs.includes(l));
    miss.length ? add(G3, "FAIL", `locales: ${locs.join(", ")} (altyapı yedi dili taşımalı, eksik: ${miss.join(", ")})`) : add(G3, "PASS", `locales: ${locs.join(", ")} (altyapıda yedi dil, uykuda; yalnızca yayın listesindekiler açık)`); }
  /defaultLocale/.test(t) ? add(G3, "PASS", "defaultLocale tanımlı") : add(G3, "FAIL", "defaultLocale yok");
}
// Yayın listesi (docs/adr/0006): üretimde yalnızca NEXT_PUBLIC_LAUNCHED_LOCALES (varsayılan en,tr) yayında; hreflang/sitemap/seçici bundan türer.
if (exists("i18n/launch.ts")) {
  const t = read("i18n/launch.ts");
  /NEXT_PUBLIC_LAUNCHED_LOCALES/.test(t) && /['"]en,tr['"]/.test(t) ? add(G3, "PASS", "i18n/launch.ts: varsayılan yayın listesi en,tr (NEXT_PUBLIC_LAUNCHED_LOCALES ile genişler)") : add(G3, "FAIL", "i18n/launch.ts: NEXT_PUBLIC_LAUNCHED_LOCALES / varsayılan 'en,tr' bulunamadı");
  // 2B-2: geliştirmede de yedi dil açılmaz; diğer beşi yalnızca NEXT_PUBLIC_PREVIEW_LOCALES=1 ile (yayında yedi dil iddiası yok).
  const openAll = stripComments(t).match(/const\s+OPEN_ALL\s*=\s*([^;]+);/)?.[1] ?? "";
  /NEXT_PUBLIC_PREVIEW_LOCALES/.test(openAll) && !/NODE_ENV/.test(openAll) ? add(G3, "PASS", "yedi dil yalnızca NEXT_PUBLIC_PREVIEW_LOCALES=1 ile açılır; geliştirme sunucusu da yalnızca en,tr gösterir") : add(G3, "FAIL", "i18n/launch.ts: OPEN_ALL geliştirmede (NODE_ENV) yedi dili açıyor; yedi dil iddiası kalktı, yalnızca PREVIEW anahtarı açmalı");
  const users = ["app/sitemap.ts", "lib/jsonld.ts", "components/layout/LanguageSwitcher.tsx"].filter((f) => exists(f) && !/launch|OPEN_LOCALES/.test(read(f)));
  users.length ? add(G3, "FAIL", `yayın listesini kullanmayan dosya (kapalı dil sızar): ${users.join(", ")}`) : add(G3, "PASS", "sitemap, JSON-LD ve dil seçici yalnızca yayındaki dilleri listeliyor");
} else add(G3, "FAIL", "i18n/launch.ts yok (hangi dillerin yayında olduğu tek yerden gelmeli)");
const lay = first([sub("app/[locale]/layout.tsx"), "app/[locale]/layout.tsx"]);
if (!lay) add(G3, "FAIL", "app/[locale]/layout.tsx yok");
else { const t = read(lay);
  /generateStaticParams/.test(t) ? add(G3, "PASS", "generateStaticParams var") : add(G3, "WARN", "generateStaticParams yok (statik üretim için gerekli)");
  /hasLocale|notFound/.test(t) ? add(G3, "PASS", "geçersiz locale için koruma var") : add(G3, "WARN", "geçersiz locale koruması (hasLocale/notFound) yok");
  /<html[^>]*lang=\{/.test(t) ? add(G3, "PASS", "<html lang={locale}>") : add(G3, "FAIL", "<html lang> locale'e bağlı değil");
  /\bdir=\{/.test(t) ? add(G3, "PASS", "<html dir={...}> dile bağlı (Arapça RTL)") : add(G3, "FAIL", "<html dir> dile bağlı değil (sabit 'ltr' olamaz: Arapça rtl ister)"); }
if (!first([sub("app/[locale]/page.tsx"), "app/[locale]/page.tsx"])) add(G3, "FAIL", "app/[locale]/page.tsx yok");
// mesaj dosyaları
const flat = (o, p = "", out = {}) => { for (const [k, v] of Object.entries(o)) typeof v === "object" && v ? flat(v, p + k + ".", out) : (out[p + k] = v); return out; };
let tr = null, en = null;
try { tr = flat(readJSON("messages/tr.json")); } catch (e) { add(G3, "FAIL", "messages/tr.json okunamadı: " + e.message); }
try { en = flat(readJSON("messages/en.json")); } catch (e) { add(G3, "FAIL", "messages/en.json okunamadı: " + e.message); }
if (tr && en) {
  const kt = new Set(Object.keys(tr)), ke = new Set(Object.keys(en));
  const mEn = [...kt].filter((k) => !ke.has(k)), mTr = [...ke].filter((k) => !kt.has(k));
  const empty = [...Object.entries(tr), ...Object.entries(en)].filter(([, v]) => typeof v === "string" && !v.trim()).map(([k]) => k);
  add(G3, mEn.length || mTr.length ? "FAIL" : "PASS", `mesaj anahtarı eşleşmesi: tr ${kt.size} / en ${ke.size}` + (mEn.length ? ` | en'de eksik: ${mEn.slice(0, 5).join(", ")}` : "") + (mTr.length ? ` | tr'de eksik: ${mTr.slice(0, 5).join(", ")}` : ""));
  if (empty.length) add(G3, "WARN", `boş çeviri: ${empty.slice(0, 5).join(", ")}`);
  // Taslak diller (de fr es ar ja) uykuda ve yayında değil: İngilizceden geri kalabilirler (eksik anahtar İngilizceden tamamlanır), ama fazlalık anahtar olmamalı.
  for (const l of ["de", "fr", "es", "ar", "ja"]) {
    if (!exists(`messages/${l}.json`)) { add(G3, "FAIL", `messages/${l}.json yok`); continue; }
    let m; try { m = flat(readJSON(`messages/${l}.json`)); } catch (e) { add(G3, "FAIL", `messages/${l}.json okunamadı: ${e.message}`); continue; }
    const missing = [...ke].filter((k) => !k.startsWith("Legal.") && !(k in m)), extra = Object.keys(m).filter((k) => !ke.has(k));
    add(G3, extra.length ? "FAIL" : "PASS", `messages/${l}.json (uykuda taslak): ${Object.keys(m).length} anahtar` + (missing.length ? ` | İngilizceden ${missing.length} anahtar geride (yayında İngilizceye düşer)` : "") + (extra.length ? ` | fazla: ${extra.slice(0, 4).join(", ")}` : ""));
  }
}
// koda gömülü Türkçe metin ve yasaklı sınıf taraması
const srcFiles = walk(abs(base === "." ? "app" : "src"), [".tsx", ".ts"]).concat(walk(abs("components"), [".tsx"]));
const hard = [], banned = {};
const BAN = { "italik": /\bitalic\b/, "ağırlık (Instrument Sans 400-600; yalnız font-normal ve font-medium)": /\bfont-(?:extralight|thin|light|semibold|bold|extrabold|black)\b/,
  "saf siyah/beyaz sınıfı (obsidian ve ink kullanın)": /\b(?:bg|text|border|decoration|ring|fill|stroke|from|to|via|outline|divide)-(?:white|black)(?:\/\d+)?\b/,
  "gölge": /\bshadow-(?:md|lg|xl|2xl)\b/, "tracking-tighter": /\btracking-tighter\b/,
  "fiziksel yön (RTL'de bozulur; start/end kullanın)": /(?<![\w-])(?:ml|mr|pl|pr)-(?!auto\b)[\w.[\]]+|(?<![\w-])(?:left|right)-(?:\d|\[|px|full|1\/2)|\btext-(?:left|right)\b|\brounded-[lr]-|\bborder-[lr](?:-|\b)|\bfloat-(?:left|right)\b|\borigin-(?:left|right)\b/,
  "renkli Tailwind paleti": /\b(?:bg|text|border|from|to|via|ring)-(?:cyan|teal|sky|blue|indigo|violet|purple|fuchsia|pink|emerald|green|lime)-\d{2,3}\b/ };
for (const f of srcFiles) {
  const lines = fs.readFileSync(f, "utf8").split("\n");
  lines.forEach((ln, i) => {
    if (/>[^<>{}]*[çğıöşüÇĞİÖŞÜ][^<>{}]*</.test(ln) && !/^\s*(\/\/|\*)/.test(ln)) hard.push(`${rel(f)}:${i + 1}`);
    for (const [name, re] of Object.entries(BAN)) if (re.test(ln)) (banned[name] ||= []).push(`${rel(f)}:${i + 1}`);
  });
}
hard.length ? add(G3, "WARN", `koda gömülü Türkçe metin (${hard.length} satır): ${hard.slice(0, 4).join(", ")}`) : add(G3, "PASS", "JSX içinde gömülü Türkçe metin bulunmadı");
for (const [n, l] of Object.entries(banned)) add("2. Tasarım tokenları (globals.css)", n.startsWith("fiziksel yön") || n.startsWith("saf siyah") ? "FAIL" : "WARN", `bileşenlerde ${n}: ${l.slice(0, 3).join(", ")}${l.length > 3 ? ` (+${l.length - 3})` : ""}`);

/* ───────── 4) Güvenlik ve depo hijyeni ───────── */
const G4 = "4. Güvenlik ve depo hijyeni";
const adr = walk(abs("docs"), [".md"]).filter((f) => /csp/i.test(f) || /Content-Security-Policy/i.test(fs.readFileSync(f, "utf8")));
adr.length ? add(G4, "PASS", `CSP kararı belgelenmiş: ${rel(adr[0])}`) : add(G4, "WARN", "CSP ADR yok (docs/adr/): nonce mı hash mi statik mi kararı Faz 2 çıktısıdır");
nc && /headers\s*\(/.test(read(nc)) ? add(G4, "PASS", "next.config güvenlik başlıkları için headers() kullanıyor") : add(G4, "INFO", "güvenlik başlıkları henüz tanımlı değil (Faz 7)");
// Faz 2 kararı (docs/adr/0001): CSP Faz 7'ye kadar report-only; CSP_MODE=enforce ile enforce.
const cspFile = first(["lib/security/csp.ts", "src/lib/security/csp.ts"]);
if (cspFile) { const t = read(cspFile);
  /Content-Security-Policy-Report-Only/.test(t) && /CSP_MODE/.test(t) && /report-uri/.test(t)
    ? add(G4, "PASS", `${cspFile}: CSP varsayılan olarak report-only, ihlaller report-uri ile toplanıyor (CSP_MODE=enforce ile enforce)`)
    : add(G4, "FAIL", `${cspFile}: report-only kipi / CSP_MODE / report-uri bulunamadı (docs/adr/0001)`);
}
exists("app/api/csp-report/route.ts") ? add(G4, "PASS", "CSP rapor alıcısı var (app/api/csp-report)") : add(G4, "FAIL", "app/api/csp-report/route.ts yok");
exists(".gitignore") ? (/fonts|woff/i.test(read(".gitignore")) ? add(G4, "PASS", ".gitignore font dosyalarını dışlıyor") : add(G4, "WARN", ".gitignore'da font dosyaları (fonts/woff2) dışlanmıyor; Satoshi lisansı herkese açık dağıtımı yasaklar")) : add(G4, "WARN", ".gitignore yok");
exists(".env") && exists(".gitignore") && !/^\.env/m.test(read(".gitignore")) ? add(G4, "FAIL", ".env var ama .gitignore'da dışlanmamış") : add(G4, "PASS", ".env commit riski yok");
exists("CLAUDE.md") ? add(G4, "PASS", "CLAUDE.md kökte") : add(G4, "WARN", "CLAUDE.md kökte yok");
// Karar 2 (docs/adr/0006): $2.500 teklifi ve Lemon Squeezy kalktı.
{
  const hits = [];
  for (const dir of ["app", "components", "lib", "messages"]) for (const f of walk(abs(dir), [".ts", ".tsx", ".json"])) if (/lemon\s*squeezy|lemonsqueezy|lemon\.js/i.test(fs.readFileSync(f, "utf8"))) hits.push(rel(f));
  hits.length ? add(G4, "FAIL", `Lemon Squeezy izi kaldı (karar: ödeme katmanı kalktı): ${hits.slice(0, 4).join(", ")}`) : add(G4, "PASS", "Lemon Squeezy / ödeme katmanı yok");
}
// Briefing: Strategic Briefing API'sinin zorunlu savunmaları (CLAUDE.md "Güvenlik").
if (exists("app/api/briefing/route.ts")) {
  const t = read("app/api/briefing/route.ts") + (exists("lib/server/turnstile.ts") ? read("lib/server/turnstile.ts") : ""), need = { "origin kontrolü": /isSameOrigin|sec-fetch-site/, "honeypot": /website|honeypot/i, "Turnstile sunucu doğrulaması": /verifyTurnstile|siteverify/, "hız sınırı": /rateLimit\(/, "şema (zod strict)": /briefingSchema/, "gövde boyutu sınırı": /MAX_BODY_BYTES/, "imzalı webhook": /deliverBriefing|deliverLead/ };
  for (const [name, re] of Object.entries(need)) re.test(t) ? add(G4, "PASS", `/api/briefing: ${name}`) : add(G4, "FAIL", `/api/briefing: ${name} yok`);
} else add(G4, "FAIL", "app/api/briefing/route.ts yok");
exists(".env.example") && /TURNSTILE_SECRET_KEY/.test(read(".env.example")) && /NEXT_PUBLIC_TURNSTILE_SITE_KEY/.test(read(".env.example")) && /CONTACT_WEBHOOK_URL/.test(read(".env.example"))
  ? add(G4, "PASS", ".env.example: webhook ve Turnstile anahtarları açıklanmış") : add(G4, "FAIL", ".env.example'da CONTACT_WEBHOOK_URL / TURNSTILE anahtarları yok");
// 2B-4 (docs/adr/0011): hukuki sayfaların YAPISI (KVKK m.10 / GDPR m.13 başlıkları), tarih, rıza bağlantısı. İçeriğin hukuken yeterli olduğunu denetim iddia etmez: yer tutucular (K7) ve "taslak" uyarısı bilerek durur.
{
  const lp = exists("components/sections/LegalPage.tsx") ? read("components/sections/LegalPage.tsx") : "";
  const order = lp.match(/const\s+PRIVACY\s*=\s*\[([^\]]*)\]/)?.[1].match(/'(\w+)'/g)?.map((x) => x.slice(1, -1)) ?? [];
  const need = ["p1", "p2", "p8", "p9", "p3", "p4", "p5", "p6", "p7"];
  const legalTexts = {};
  for (const l of ["en", "tr"]) legalTexts[l] = flat(readJSON(`messages/${l}.json`)["Legal"] ?? {});
  const missingKeys = [];
  for (const l of ["en", "tr"]) for (const k of need) for (const key of [k, `${k}h`]) if (!legalTexts[l][key]) missingKeys.push(`${l}:Legal.${key}`);
  order.join() === need.join() && !missingKeys.length
    ? add(G4, "PASS", "gizlilik metni: sorumlu, amaç ve hukuki sebep, toplama yöntemi ve zorunluluk, otomatik karar, güvenlik/kayıt, çerez, aktarım, saklama, haklar sırasıyla ve EN/TR'de tam")
    : add(G4, "FAIL", `gizlilik metni bölüm sırası/anahtarları eksik (sıra: ${order.join(",") || "okunamadı"}; eksik: ${missingKeys.slice(0, 4).join(", ")})`);
  /id=\{`privacy-\$\{key\}`\}/.test(lp) && /LEGAL_UPDATED/.test(lp) && /t\('updated'/.test(lp) && legalTexts.en.updated && legalTexts.tr.updated
    ? add(G4, "PASS", "yasal sayfalar: her bölümün id'si ve \"son düzenleme\" tarihi var") : add(G4, "FAIL", "LegalPage: bölüm id'leri (privacy-<anahtar>) ya da 'son düzenleme' tarihi yok");
  const bs = exists("components/sections/BriefingSection.tsx") ? read("components/sections/BriefingSection.tsx") : "";
  /#privacy-p2/.test(bs) && order.includes("p2") ? add(G4, "PASS", "rıza kutusundaki bağlantı, rızanın dayandığı bölüme (privacy-p2) gidiyor") : add(G4, "FAIL", "briefing rıza bağlantısı #privacy-p2 bölümüne gitmiyor");
  const claim = /compliant|uyumludur|uyumlu\b|guaranteed|garanti/i, claims = [];
  for (const l of ["en", "tr"]) for (const [k, v] of Object.entries(legalTexts[l])) if (typeof v === "string" && claim.test(v)) claims.push(`${l}:Legal.${k}`);
  claims.length ? add(G4, "FAIL", `hukuki metin uyum/garanti iddiası içeriyor (avukat onayı olmadan yazılmaz): ${claims.slice(0, 4).join(", ")}`) : add(G4, "PASS", "hukuki metinde \"uyumludur\"/\"garanti\" gibi bir yeterlilik iddiası yok");
  const brackets = Object.values(legalTexts.en).filter((v) => typeof v === "string" && /\[[^\]]+\]/.test(v)).length, draft = Boolean(legalTexts.en.draft && legalTexts.tr.draft);
  draft ? add(G4, "INFO", `hukuki sayfalar yer tutuculu taslak: EN'de ${brackets} bölümde köşeli parantezli alan var (K7: avukat onayı ve gerçek bilgiler bekleniyor); "taslak" uyarısı sayfada duruyor. check:messages --strict bu yüzden kırmızıdır, bilinçli.`) : add(G4, "FAIL", "Legal.draft (taslak uyarısı) kalkmış: avukat onayı olmadan kaldırılmaz");
}
// 2B-3 (docs/adr/0010): teslim sözleşmesi, hız sınırı uyarısı, security.txt.
{
  const del = exists("lib/server/deliver.ts") ? read("lib/server/deliver.ts") : "";
  const ms = (name) => Number(del.match(new RegExp(`const\\s+${name}\\s*=\\s*([0-9_]+)`))?.[1]?.replaceAll("_", "") ?? NaN);
  const first = ms("FIRST_ATTEMPT_MS"), pause = ms("PAUSE_MS"), second = ms("SECOND_ATTEMPT_MS"), budget = ms("BUDGET_MS");
  /crypto\.randomUUID\(\)/.test(del) && /['"]idempotency-key['"]/.test(del) && /\bid,/.test(del) ? add(G4, "PASS", "teslim: her başvuru rastgele bir id taşır ve Idempotency-Key başlığı olarak da gider (iki deneme aynı id)") : add(G4, "FAIL", "lib/server/deliver.ts: crypto.randomUUID() id'si, gövdede id ve Idempotency-Key başlığı yok");
  first + pause + second < 10_000 && budget < 10_000 && first > 0 ? add(G4, "PASS", `teslim: en çok iki deneme, en kötü durumda ${first + pause + second} ms (< 10 sn)`) : add(G4, "FAIL", `teslim süre bütçesi 10 sn'yi aşıyor ya da okunamadı (${first}+${pause}+${second}, bütçe ${budget})`);
  /status\s*>=\s*500/.test(del) && /408/.test(del) && /429/.test(del) && /'final'/.test(del) ? add(G4, "PASS", "teslim: yalnızca zaman aşımı, ağ hatası ve 5xx/408/429 yeniden denenir; 4xx kesindir") : add(G4, "FAIL", "teslim: yeniden deneme kuralı (5xx/408/429, 4xx kesin) bulunamadı");
  const rl = exists("lib/security/rate-limit.ts") ? read("lib/security/rate-limit.ts") : "";
  /NODE_ENV\s*===\s*['"]production['"]/.test(rl) && /UPSTASH_REDIS_REST_URL/.test(rl) && /console\.warn\(/.test(rl) ? add(G4, "PASS", "hız sınırı: üretimde Upstash yoksa örnek başına sayıldığı bir kez uyarılır") : add(G4, "FAIL", "lib/security/rate-limit.ts: üretimde Upstash yoksa uyarı yok");
  if (!exists("public/.well-known/security.txt")) add(G4, "FAIL", "public/.well-known/security.txt yok (RFC 9116)");
  else {
    const t = read("public/.well-known/security.txt"), exp = t.match(/^Expires:\s*(\S+)/m)?.[1], days = exp ? (new Date(exp).getTime() - Date.now()) / 86_400_000 : NaN;
    /^Contact:\s*mailto:contact@syncflow\.agency\s*$/m.test(t) && /^Canonical:\s*https:\/\/syncflow\.agency\/\.well-known\/security\.txt\s*$/m.test(t)
      ? add(G4, "PASS", "security.txt: Contact ve Canonical doğru") : add(G4, "FAIL", "security.txt: Contact (mailto:contact@syncflow.agency) ya da Canonical eksik/yanlış");
    days > 0 && days <= 366 ? add(G4, "PASS", `security.txt Expires ${exp} (${Math.round(days)} gün sonra; süresi dolmadan yenilenmeli)`) : add(G4, "FAIL", `security.txt Expires geçmişte ya da bir yıldan uzakta: ${exp} (RFC 9116)`);
  }
}
// 2B-2 (docs/adr/0009): vitrin üç sektöre kilitli (emlak, klinik, kurumsal hukuk); SaaS ve dil/erişim bölümü yok; sitede yedi dil iddiası yok.
{
  const show = exists("components/sections/Showcase.tsx") ? read("components/sections/Showcase.tsx") : "";
  const keys = [...show.matchAll(/\{\s*key:\s*['"](\w+)['"]/g)].map((m) => m[1]);
  keys.length === 3 && ["estate", "clinic", "law"].every((k) => keys.includes(k))
    ? add(G4, "PASS", "vitrin tam üç sektör: estate, clinic, law (kilitli)") : add(G4, "FAIL", `vitrin kartları ${keys.join(", ") || "okunamadı"}; yalnızca estate, clinic, law olmalı (ADR 0009)`);
  const saas = [];
  for (const f of [...walk(abs("app"), [".tsx", ".ts"]), ...walk(abs("components"), [".tsx", ".ts"]), ...walk(abs("lib"), [".ts", ".tsx"]), ...walk(abs("remotion"), [".tsx", ".ts"])]) if (/saas/i.test(fs.readFileSync(f, "utf8"))) saas.push(rel(f));
  for (const l of ["en", "tr"]) if (/saas/i.test(JSON.stringify(readJSON(`messages/${l}.json`)))) saas.push(`messages/${l}.json`);
  if (exists("public/media/clips")) for (const n of fs.readdirSync(abs("public/media/clips"))) if (/saas/i.test(n)) saas.push(`public/media/clips/${n}`);
  saas.length ? add(G4, "FAIL", `SaaS izi kaldı (sektör kilidi: emlak, klinik, kurumsal hukuk): ${saas.slice(0, 4).join(", ")}`) : add(G4, "PASS", "SaaS izi yok (kod, mesajlar, sahneler, videolar)");
  const claim = /seven languages|7 languages|every language it deserves|all seven|yedi dil|7 dil|her dilde|hak ettiği her dil/i, hitsLang = [];
  for (const l of ["en", "tr"]) for (const [k, v] of Object.entries(flat(readJSON(`messages/${l}.json`)))) if (typeof v === "string" && claim.test(v)) hitsLang.push(`${l}:${k}`);
  const reachLeft = ["components/sections/Reach.tsx", "components/sections/ReachInteractive.tsx", "lib/reach.ts"].filter(exists);
  hitsLang.length || reachLeft.length ? add(G4, "FAIL", `yedi dil/küresel erişim iddiası kaldı: ${[...hitsLang, ...reachLeft].slice(0, 4).join(", ")}`) : add(G4, "PASS", "sitede yedi dil ya da küresel erişim iddiası yok (Reach bölümü kalktı)");
  /areaServed/.test(exists("lib/jsonld.ts") ? read("lib/jsonld.ts") : "") ? add(G4, "FAIL", "JSON-LD'de areaServed (\"Worldwide\") iddiası var") : add(G4, "PASS", "JSON-LD'de bölge iddiası yok");
}
// Karar 8 (docs/adr/0006): ölçülmemiş performans iddiası yayınlanmaz. Metinlerde yasaklı ifadeler + metrik kaynağı.
{
  const BANNED = /locked\s*60|60\s*fps\s*locked|kilitli\s*60|120\s?hz|LCP\s*[<≤]\s*1[.,]2|TBT\s*[<≤]\s*50|INP\s*[<≤]\s*100|\bAV1\b|adaptive\s*bitrate|adaptif\s*bitrate|[+−-]\s*(?:212|38|64)\s*%|%\s*(?:212|38|64)\b|before[- ]and[- ]after|before-after|önce-sonra|kusursuz|flawless|%\s*100\s*(?:güvenli|uyumlu)|100%\s*(?:secure|compliant)|garanti/i;
  const hits = [];
  if (exists("messages")) for (const f of fs.readdirSync(abs("messages")).filter((n) => n.endsWith(".json"))) for (const [k, v] of Object.entries(flat(readJSON(`messages/${f}`)))) if (typeof v === "string" && BANNED.test(v)) hits.push(`${f}:${k}`);
  hits.length ? add(G4, "FAIL", `doğrulanmamış/yasak iddia (${hits.length}): ${hits.slice(0, 4).join(", ")}`) : add(G4, "PASS", "metinlerde doğrulanmamış iddia yok (kilitli 60 FPS, 120 Hz, LCP/TBT/INP eşikleri, AV1, örnek yüzdeler, önce-sonra)");
  if (exists("lib/metrics.ts")) {
    const t = read("lib/metrics.ts"), n = (t.match(/measuredAt\s*:/g) ?? []).length, s = (t.match(/source\s*:/g) ?? []).length, p = (t.match(/profile\s*:/g) ?? []).length;
    n > 0 && n === s && n === p ? add(G4, "PASS", `lib/metrics.ts: ${n} metrik, her birinde tarih, profil ve kaynak var`) : add(G4, "FAIL", `lib/metrics.ts: metriklerin tarih/profil/kaynak sayıları tutmuyor (${n}/${p}/${s})`);
  } else add(G4, "FAIL", "lib/metrics.ts yok (yayındaki sayıların tek kaynağı)");
}

/* ───────── 5) Sahne videoları (önceden render edilmiş, docs/adr/0003 ve 0006) ───────── */
const G5 = "5. Sahne videoları (önceden render edilmiş)";
const CLIPS = ["monolith", "estate", "clinic", "law"];
const clipMissing = [];
for (const name of CLIPS) for (const ext of ["mp4", "webm", "webp"]) {
  const p = `public/media/clips/${name}.${ext}`;
  if (!exists(p) || fs.statSync(abs(p)).size === 0) clipMissing.push(p);
}
clipMissing.length
  ? add(G5, "FAIL", `video dosyası eksik ya da boş (${clipMissing.length}): ${clipMissing.slice(0, 3).join(", ")}${clipMissing.length > 3 ? " ..." : ""}`, "npm run film:render")
  : add(G5, "PASS", `${CLIPS.length} sahne × (mp4, webm, webp) = ${CLIPS.length * 3} dosya var`);
exists("components/media/SceneVideo.tsx") && !exists("components/remotion") ? add(G5, "PASS", "oynatıcı <video> tabanlı (SceneVideo); tarayıcıda Remotion yok") : add(G5, "FAIL", "components/media/SceneVideo.tsx yok ya da components/remotion hâlâ var");
if (exists("components/media/SceneVideo.tsx")) {
  const t = read("components/media/SceneVideo.tsx");
  /preload=["']none["']/.test(t) && /IntersectionObserver/.test(t) && /muted/.test(t) && /playsInline/.test(t)
    ? add(G5, "PASS", "videolar preload=none, sessiz, playsInline ve ekran dışında IntersectionObserver ile duruyor") : add(G5, "FAIL", "SceneVideo: preload=\"none\" / muted / playsInline / IntersectionObserver eksik");
}

/* ───────── 6) Hareket ve kaydırma (Faz 3, docs/adr/0004) ───────── */
const G6 = "6. Hareket ve kaydırma (Faz 3)";
// Lenis ve Motion ilk yüke girmemeli: kaynakta yalnızca import() ile kullanılabilirler (import type serbest).
const staticImport = /^\s*import\s+(?!type\b)[^;]*?\bfrom\s+['"](lenis|motion|framer-motion)(?:\/[^'"]*)?['"]/m;
const sideEffectImport = /^\s*import\s+['"](lenis|motion|framer-motion)(?:\/[^'"]*)?['"]/m;
const staticHits = [];
for (const dir of ["app", "components", "lib"]) for (const f of walk(abs(dir), [".ts", ".tsx"])) {
  const text = fs.readFileSync(f, "utf8");
  if (staticImport.test(text) || sideEffectImport.test(text)) staticHits.push(rel(f));
}
staticHits.length
  ? add(G6, "FAIL", `lenis/motion statik import edilmiş (ilk yüke girer): ${staticHits.join(", ")}`, "yalnızca import('lenis') / import('motion/mini') kullanın")
  : add(G6, "PASS", "lenis ve motion yalnızca dinamik import() ile kullanılıyor (ilk yüke giremez)");
for (const [file, re, what] of [
  ["lib/enhance/smooth-scroll.ts", /\(hover: hover\) and \(pointer: fine\)/, "yalnızca (hover: hover) and (pointer: fine)"],
  ["lib/enhance/smooth-scroll.ts", /prefers-reduced-motion/, "azaltılmış hareket"],
  ["lib/enhance/reveal.ts", /prefers-reduced-motion/, "azaltılmış hareket"],
]) exists(file) && re.test(read(file)) ? add(G6, "PASS", `${file}: ${what} kontrolü var`) : add(G6, "FAIL", `${file}: ${what} kontrolü yok`);
const css6 = exists("app/globals.css") ? stripComments(read("app/globals.css")) : "";
/@media\s*\(prefers-reduced-motion:\s*no-preference\)\s*\{\s*\[data-mask=['"]load['"]\][^{]*\{[^}]*animation:\s*mask-rise/.test(css6)
  ? add(G6, "PASS", "hero girişi yalnızca prefers-reduced-motion: no-preference altında çalışıyor")
  : add(G6, "FAIL", "hero giriş animasyonu prefers-reduced-motion: no-preference ile sınırlı değil");
// Blueprint ışığı (docs/adr/0006): imleç ışığı ve manyetik düğme yalnızca ince işaretçide ve azaltılmış hareket yokken; halkalar azaltılmış harekette dolu kalır.
for (const [file, what] of [["lib/enhance/spotlight.ts", "imleç ışığı"], ["lib/enhance/magnetic.ts", "manyetik düğme"], ["lib/enhance/rings.ts", "Lighthouse halkaları"]]) {
  const t = exists(file) ? read(file) : "";
  /prefers-reduced-motion/.test(t) && (file.endsWith("rings.ts") || /\(hover: hover\) and \(pointer: fine\)/.test(t))
    ? add(G6, "PASS", `${file}: ${what} ${file.endsWith("rings.ts") ? "azaltılmış harekette kapalı" : "yalnızca ince işaretçide ve azaltılmış hareket yokken"}`)
    : add(G6, "FAIL", `${file}: ${what} için ${file.endsWith("rings.ts") ? "prefers-reduced-motion" : "(hover: hover) and (pointer: fine) ve prefers-reduced-motion"} kontrolü yok`);
}
// Border Beam yalnızca `rotate` ile döner (bileşik, boyama yok), azaltılmış harekette gizlenir ve en çok 3 tane olur (Blueprint: 60 FPS bütçesi).
{
  const spin = css6.match(/@keyframes\s+beam-spin\s*\{([^}]*\{[^}]*\}[^}]*)\}/);
  spin && /rotate\s*:/.test(spin[1]) && !/(?:^|[;{\s])(?:background|opacity|width|height|top|left|filter|box-shadow)\s*:/.test(spin[1])
    ? add(G6, "PASS", "Border Beam yalnızca rotate ile dönüyor (bileşik, yeniden boyama yok)") : add(G6, "FAIL", "@keyframes beam-spin yalnızca rotate animasyonlamıyor");
  /prefers-reduced-motion:\s*reduce\)\s*\{\s*\.beam-card\s+\.beam\s*\{\s*display:\s*none/.test(css6)
    ? add(G6, "PASS", "Border Beam azaltılmış harekette gizleniyor") : add(G6, "FAIL", "Border Beam azaltılmış harekette gizlenmiyor");
  let beams = 0;
  for (const dir of ["app", "components"]) for (const f of walk(abs(dir), [".tsx"])) beams += (fs.readFileSync(f, "utf8").match(/className="beam-card"/g) ?? []).length;
  beams <= 3 ? add(G6, "PASS", `Border Beam sayısı ${beams} (üst sınır 3)`) : add(G6, "FAIL", `Border Beam sayısı ${beams}: aynı anda en çok 3 olmalı (60 FPS bütçesi)`);
}
// Sürekli (infinite) CSS animasyonları ekran dışında durmalı: öğe data-pause-offscreen taşır, betik bunu IntersectionObserver ile işler.
{
  const infinite = [...css6.matchAll(/\.([\w-]+)\s*\{[^}]*animation:[^;}]*\binfinite\b/g)].map((m) => m[1]);
  const pauseRule = /\[data-pause-offscreen\]\[data-offscreen=['"]true['"]\]\s*\{[^}]*animation-play-state:\s*paused/.test(css6);
  const uiState = exists("lib/enhance/ui-state.ts") ? read("lib/enhance/ui-state.ts") : "";
  const pauseScript = /data-pause-offscreen/.test(uiState) && /IntersectionObserver/.test(uiState);
  const unmarked = [];
  for (const dir of ["app", "components"]) for (const f of walk(abs(dir), [".tsx"])) {
    const text = fs.readFileSync(f, "utf8");
    for (const cls of infinite) for (const m of text.matchAll(new RegExp(`<[^>]*className="[^"]*(?<![\\w-])${cls}(?![\\w-])[^"]*"[^>]*>`, "g"))) {
      if (!/data-pause-offscreen/.test(m[0])) unmarked.push(`${rel(f)} (.${cls})`);
    }
  }
  !pauseRule || !pauseScript
    ? add(G6, "FAIL", "ekran dışı animasyon duraklatma eksik (globals.css kuralı ya da lib/enhance/ui-state.ts IntersectionObserver)")
    : unmarked.length
      ? add(G6, "FAIL", `sürekli animasyonlu öğe data-pause-offscreen taşımıyor: ${unmarked.join(", ")}`)
      : add(G6, "PASS", `sürekli animasyonlar (${infinite.length ? infinite.map((c) => "." + c).join(", ") : "yok"}) ekran dışında IntersectionObserver ile duruyor`);
}
/(^|\})\s*\.mi\s*\{[^}]*(transform|opacity|visibility)/.test(css6)
  ? add(G6, "FAIL", ".mi kuralı kelimeyi başlangıçta gizliyor: JS yokken metin görünmez kalırdı (gizleme yalnızca .is-armed ile, betikle)")
  : add(G6, "PASS", "kelimeler başlangıçta gizlenmiyor (gizleme yalnızca betiğin eklediği .is-armed ile)");
// Ölçülen parça listesi (yalnızca --build sonrası): ilk yükte lenis ve motion yok mu, lazy parçaları kaç KB?
function bundleGate() {
  const manifest = ".next/server/app/[locale]/page_client-reference-manifest.js";
  if (!exists(manifest)) return add(G6, "WARN", "ilk yük parça listesi okunamadı (manifest yok)");
  const entry = read(manifest).match(/"entryJSFiles":\s*(\{[\s\S]*?\})\s*[,}]/);
  const initial = new Set();
  try { for (const list of Object.values(JSON.parse(entry[1]))) for (const f of list) initial.add(f); }
  catch { return add(G6, "WARN", "entryJSFiles ayrıştırılamadı"); }
  const dir = abs(".next/static/chunks");
  const chunks = fs.readdirSync(dir).filter((f) => f.endsWith(".js")).map((f) => {
    const buf = fs.readFileSync(path.join(dir, f));
    return { file: `static/chunks/${f}`, text: buf.toString("utf8"), gz: zlib.gzipSync(buf, { level: 9 }).length };
  });
  const isLenis = (t) => /lenis-smooth|lenis-stopped|lenisVersion/.test(t);
  const isMotion = (t) => /commitStyles/.test(t) && /\.animate\(/.test(t);
  const leaked = chunks.filter((c) => initial.has(c.file) && (isLenis(c.text) || isMotion(c.text)));
  const lazyLenis = chunks.filter((c) => isLenis(c.text) && !initial.has(c.file));
  const lazyMotion = chunks.filter((c) => isMotion(c.text) && !initial.has(c.file));
  const kb = (list) => (list.reduce((sum, c) => sum + c.gz, 0) / 1024).toFixed(1);
  leaked.length
    ? add(G6, "FAIL", `mobil ilk yükte lenis/motion var: ${leaked.map((c) => c.file).join(", ")}`)
    : add(G6, "PASS", `ilk yük parçalarında (${initial.size} dosya) lenis ve motion yok`);
  lazyLenis.length && lazyMotion.length
    ? add(G6, "INFO", `lazy parçalar: lenis ${kb(lazyLenis)} KB, motion ${kb(lazyMotion)} KB (gzip). Lenis yalnızca masaüstünde, motion ilk etkileşimde iner`)
    : add(G6, "WARN", "lenis/motion lazy parçaları işaretçiyle bulunamadı (paket sürümü değişmiş olabilir): ilk yük denetimi geçersiz sayılmalı");
}

/* ───────── 7) Build (isteğe bağlı) ───────── */
if (DO_BUILD) {
  const r = spawnSync("npm", ["run", "build"], { cwd: ROOT, shell: true, encoding: "utf8", maxBuffer: 1 << 26 });
  const tail = ((r.stdout || "") + (r.stderr || "")).trim().split("\n").slice(-12).join("\n");
  add("7. Build", r.status === 0 ? "PASS" : "FAIL", r.status === 0 ? "npm run build başarılı" : "npm run build başarısız", tail);
  if (r.status === 0) bundleGate();
} else add("7. Build", "INFO", "build çalıştırılmadı (--build ile)");

/* ───────── Rapor ───────── */
results.sort((a, b) => a.group.localeCompare(b.group));
const color = process.stdout.isTTY && !process.env.NO_COLOR;
const C = { PASS: "\x1b[32m", WARN: "\x1b[33m", FAIL: "\x1b[31m", INFO: "\x1b[90m", R: "\x1b[0m" };
const sym = { PASS: "✔", WARN: "!", FAIL: "✖", INFO: "i" };
let g = ""; const cnt = { PASS: 0, WARN: 0, FAIL: 0, INFO: 0 };
console.log(`\nSyncFlow denetimi (Faz 2–5, 2B-1, 2B-2, 2B-3 ve 2B-4 kapısı: tokenlar, marka, i18n, TR/EN odak ve sektör kilidi, güvenlik ve briefing, sahne videoları, hareket, doğrulanmamış iddia yasağı)\nKök: ${ROOT}`);
for (const r of results) {
  if (r.group !== g) { g = r.group; console.log(`\n${g}`); }
  cnt[r.level]++;
  console.log(`  ${color ? C[r.level] : ""}${sym[r.level]}${color ? C.R : ""} ${r.msg}`);
  if (r.detail) console.log("      " + r.detail.split("\n").join("\n      "));
}
console.log(`\nÖzet: ${cnt.PASS} geçti, ${cnt.WARN} uyarı, ${cnt.FAIL} hata, ${cnt.INFO} bilgi`);
if (DO_JSON) fs.writeFileSync(abs("faz2-denetim.json"), JSON.stringify({ tarih: new Date().toISOString(), ozet: cnt, sonuclar: results }, null, 2));
process.exit(cnt.FAIL ? 1 : 0);
