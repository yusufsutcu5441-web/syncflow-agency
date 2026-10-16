#!/usr/bin/env node
/**
 * SyncFlow denetimi. Faz 2: bağımlılıklar, tasarım tokenları (Blueprint, docs/adr/0006; palet ve marka 0007), next-intl iskeleti, CSP.
 * Faz 3: hareket ve kaydırma (Lenis ve Motion ilk yüke girmez, azaltılmış hareket, JS'siz görünürlük).
 * Faz 4: Blueprint ana sayfası, briefing (honeypot, Turnstile, origin, imzalı webhook), vitrin videoları, doğrulanmamış iddia yasağı.
 * Faz 5: 7 dil altyapısı (taslak diller uykuda, RTL, yayın listesi), hreflang/sitemap yalnızca yayındaki dillere.
 * 2B-4 (docs/adr/0011): hukuki sayfaların yapısı (KVKK m.10 / GDPR m.13), tarih, rıza bağlantısı; içerik yer tutuculu taslak kalır.
 * 2B-3 (docs/adr/0010): teslimde id + tek yeniden deneme (bütçe < 10 sn), hız sınırı uyarısı, security.txt süresi.
 * 16.10.2026 (docs/adr/0021): üretim performansı (content-visibility, CSS bayraklar, yerleşim kararlılığı, sağdan sola CLS) ve kurumsal kanıt (docs/architecture, lib/arch, sözleşme testleri): bölüm 12.
 * 15.10.2026 (docs/adr/0020): vaka incelemeleri (sayfa + diyalog, yedi dil), Stüdyo bölümü, iki etkileşimli simülatör, SVG bayraklar, 1080p sektör klipleri: bölüm 11.
 * 14.10.2026 (docs/adr/0019): kurumsal katman: asgari tutar USD 50.000 (basamaklar 1×/2×/5×), vitrin dört sektör (lojistik eklendi), Mimari bölümünde iki kurumsal sütun (animasyonlu Border Beam sayısı yine en çok 3).
 * 14.10.2026 (docs/adr/0018): yedi sermaye merkezi = yedi dil (en tr ar de fr es zh) ve yedi pazar, Japonca uykuda. "Yedi dil iddiası yok" kuralı pazarlama metni içindir; seçici bir iddia değildir.
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
/** Yayındaki yedi dil (ADR 0018): her birinin mesaj dosyası eksiksiz olmalı. Japonca uykuda taslaktır. */
const PUBLIC_LOCALES = ["en", "tr", "ar", "de", "fr", "es", "zh"];
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
  // Vercel'in Node çalışma zamanı require() ile ES modülü yüklemez (ERR_REQUIRE_ESM). jsdom 27+ ESM-only bir zincir (@exodus/bytes) çeker
  // ve /api/briefing canlıda 500 verir (docs/adr/0013). Sürüm numarasına değil davranışa bakılır: require(esm) kapalıyken yüklenmeli.
  if (all.jsdom) {
    const probe = spawnSync(process.execPath, ["--no-experimental-require-module", "-e", "require('jsdom')"], { cwd: ROOT, encoding: "utf8" });
    let jv = null; try { jv = readJSON("node_modules/jsdom/package.json").version; } catch {}
    if (!jv) add(G1, "WARN", "jsdom kurulu değil, require(esm) denemesi atlandı");
    else if (probe.status === 0) add(G1, "PASS", `jsdom ${jv} require(esm) kapalıyken yükleniyor (Vercel çalışma zamanı böyle)`);
    else add(G1, "FAIL", `jsdom ${jv} require(esm) kapalıyken yüklenmiyor: Vercel'de /api/briefing 500 verir. jsdom 26.x'e dönün (docs/adr/0013). ${(probe.stderr || "").split("\n").find((l) => /ERR_|Error/.test(l)) ?? ""}`.trim());
  }
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
    // Yüklü yüzler: Instrument Sans 400-600, Instrument Serif 400, Syne 400-800, Cabinet Grotesk 500. 100/200/300/900 hiçbirinde yok.
    [/font-weight\s*:\s*(?:100|200|300|900)\b/g, "hiçbir yüklü yazı tipinde olmayan ağırlık (300 sessizce 400 çizilir)", "FAIL"],
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

  // Sinematik tipografi (docs/adr/0014): Instrument Serif (başlık), Syne (bölüm sözcükleri), Cabinet Grotesk (düğme ve gezinti).
  for (const [family, file, weights] of [["Instrument Serif", "public/fonts/instrument-serif-latin-v1.woff2", /font-weight:\s*400\s*;/], ["Syne", "public/fonts/syne-latin-v1.woff2", /font-weight:\s*400\s+800/]]) {
    const face = new RegExp(`@font-face\\s*\\{[^}]*font-family:\\s*['"]${family}['"][^}]*\\}`).exec(c)?.[0] ?? "";
    face && weights.test(face) && exists(file) ? add(G2, "PASS", `@font-face '${family}' tanımlı ve dosyası (${file.split("/").pop()}) var`) : add(G2, "FAIL", `'${family}' için @font-face ya da ${file} eksik`);
  }
  ["OFL-instrument-serif.txt", "OFL-syne.txt"].every((f) => exists(`public/fonts/${f}`) && /SIL OPEN FONT LICENSE/i.test(read(`public/fonts/${f}`)))
    ? add(G2, "PASS", "Instrument Serif ve Syne OFL metinleri public/fonts altında") : add(G2, "FAIL", "OFL-instrument-serif.txt / OFL-syne.txt yok ya da OFL metni içermiyor");
  // Cabinet Grotesk (ITF FFL v2.0): lisans dosyanın herkese açık depoda dağıtılmasını ve budanmasını yasaklar. Derlemede indirilir.
  {
    const tracked = spawnSync("git", ["ls-files", "--", "public/fonts"], { cwd: ROOT, encoding: "utf8" });
    const trackedCabinet = tracked.status === 0 ? tracked.stdout.split("\n").filter((l) => /cabinet/i.test(l)) : [];
    trackedCabinet.length ? add(G2, "FAIL", `Cabinet Grotesk dosyası git'te izleniyor (ITF FFL §02 herkese açık depoyu yasaklar): ${trackedCabinet.join(", ")}`)
      : /cabinet-grotesk/.test(read(".gitignore")) ? add(G2, "PASS", "Cabinet Grotesk git'te değil ve .gitignore'da (ITF FFL §02)") : add(G2, "FAIL", ".gitignore Cabinet Grotesk dosyalarını dışlamıyor");
    const fetcher = exists("scripts/fetch-fonts.mjs") ? read("scripts/fetch-fonts.mjs") : "";
    const pkgJson = readJSON("package.json");
    fetcher && /process\.exit\(0\)/.test(fetcher) && !/process\.exit\(1\)/.test(fetcher) && /prebuild/.test(JSON.stringify(pkgJson.scripts))
      ? add(G2, "PASS", "scripts/fetch-fonts.mjs derlemeden önce çalışır, hata verse bile derlemeyi bozmaz (yedek: Instrument Sans)") : add(G2, "FAIL", "fetch-fonts.mjs yok ya da prebuild'e bağlı değil ya da hata ile çıkıyor");
    /--font-ui:\s*['"]Cabinet Grotesk['"],\s*['"]Instrument Sans['"]/.test(c) ? add(G2, "PASS", "--font-ui Cabinet Grotesk ile başlıyor, yedek Instrument Sans") : add(G2, "FAIL", "--font-ui yedeği Instrument Sans olmayan bir yığın");
    /@font-face\s*\{[^}]*font-family:\s*['"]Cabinet Grotesk['"][^}]*font-display:\s*optional/.test(c) ? add(G2, "PASS", "Cabinet Grotesk font-display: optional (sayfa kayması yok)") : add(G2, "FAIL", "Cabinet Grotesk font-display: optional değil (yüklenince düzeni kaydırır)");
  }
  // Bold ağırlıklar yalnızca Syne kuralında (Syne 400-800); başka ailede sentezlenir ya da 600'e düşer.
  {
    const blocks = c.match(/\{[^{}]*font-weight:\s*(?:700|800)\b[^{}]*\}/g) ?? [];
    const strays = blocks.filter((b) => !/var\(--font-wide\)/.test(b));
    strays.length ? add(G2, "FAIL", `700/800 ağırlık Syne (--font-wide) olmayan kuralda: ${strays.length}`) : add(G2, "PASS", `700/800 ağırlık yalnızca Syne kurallarında (${blocks.length} kural)`);
  }

  // Hap düğmeler: tek tarif (.btn), birincil şampanya.
  /--radius-pill:\s*999px/.test(c) ? add(G2, "PASS", "--radius-pill 999px") : add(G2, "FAIL", "--radius-pill: 999px tanımlı değil");
  /\.btn\s*\{[^}]*border-radius:\s*var\(--radius-pill\)/.test(c) ? add(G2, "PASS", ".btn hap (border-radius: var(--radius-pill))") : add(G2, "FAIL", ".btn hap değil");
  /\.btn-primary\s*\{[^}]*background:\s*var\(--color-champagne\)/.test(c) ? add(G2, "PASS", "birincil düğme şampanya, tek vurgu rengi") : add(G2, "FAIL", ".btn-primary şampanya (--color-champagne) değil");

  // Mono etiketler: tek tarif. Büyük harf ve etiket aralığı CSS'te yalnızca bir yerde yazılır.
  // Syne headlines in capitals (.chapter-word, --font-wide) are not labels: they are left out of the recipe count.
  // The base .chapter-word rule sets the system face until Syne is near, so it does not carry var(--font-wide) itself: it is removed by name.
  const cLabels = c.replace(/\{[^{}]*var\(--font-wide\)[^{}]*\}/g, "{}").replace(/\.chapter-word\s*\{[^{}]*\}/g, "{}");
  const upper = (cLabels.match(/text-transform:\s*uppercase/g) ?? []).length, track = (c.match(/letter-spacing:\s*var\(--tracking-label\)/g) ?? []).length;
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
  else { const want7 = [...PUBLIC_LOCALES, "ja"], miss = want7.filter((l) => !locs.includes(l));
    miss.length ? add(G3, "FAIL", `locales: ${locs.join(", ")} (altyapı yedi yayın dilini ve uykudaki Japoncayı taşımalı, eksik: ${miss.join(", ")})`) : add(G3, "PASS", `locales: ${locs.join(", ")} (yedi dil yayında, Japonca uykuda; yalnızca yayın listesindekiler açık)`); }
  /defaultLocale/.test(t) ? add(G3, "PASS", "defaultLocale tanımlı") : add(G3, "FAIL", "defaultLocale yok");
}
// Yayın listesi (docs/adr/0006): üretimde yalnızca NEXT_PUBLIC_LAUNCHED_LOCALES (varsayılan en,tr,ar,de,fr,es,zh: ADR 0018) yayında; hreflang/sitemap/seçici bundan türer.
if (exists("i18n/launch.ts")) {
  const t = read("i18n/launch.ts");
  /NEXT_PUBLIC_LAUNCHED_LOCALES/.test(t) && /['"]en,tr,ar,de,fr,es,zh['"]/.test(t) ? add(G3, "PASS", "i18n/launch.ts: varsayılan yayın listesi en,tr,ar,de,fr,es,zh (NEXT_PUBLIC_LAUNCHED_LOCALES ile daralır ya da genişler)") : add(G3, "FAIL", "i18n/launch.ts: NEXT_PUBLIC_LAUNCHED_LOCALES / varsayılan 'en,tr,ar,de,fr,es,zh' bulunamadı");
  // Uykudaki dil (Japonca) geliştirmede de açılmaz; yalnızca NEXT_PUBLIC_PREVIEW_LOCALES=1 ile okunur.
  const openAll = stripComments(t).match(/const\s+OPEN_ALL\s*=\s*([^;]+);/)?.[1] ?? "";
  /NEXT_PUBLIC_PREVIEW_LOCALES/.test(openAll) && !/NODE_ENV/.test(openAll) ? add(G3, "PASS", "uykudaki dil yalnızca NEXT_PUBLIC_PREVIEW_LOCALES=1 ile açılır; geliştirme sunucusu da yalnızca yayın listesini gösterir") : add(G3, "FAIL", "i18n/launch.ts: OPEN_ALL geliştirmede (NODE_ENV) uykudaki dili açıyor; yalnızca PREVIEW anahtarı açmalı");
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
  for (const l of PUBLIC_LOCALES) legalTexts[l] = flat(readJSON(`messages/${l}.json`)["Legal"] ?? {});
  const missingKeys = [];
  for (const l of PUBLIC_LOCALES) for (const k of need) for (const key of [k, `${k}h`]) if (!legalTexts[l][key]) missingKeys.push(`${l}:Legal.${key}`);
  order.join() === need.join() && !missingKeys.length
    ? add(G4, "PASS", "gizlilik metni: sorumlu, amaç ve hukuki sebep, toplama yöntemi ve zorunluluk, otomatik karar, güvenlik/kayıt, çerez, aktarım, saklama, haklar sırasıyla ve EN/TR'de tam")
    : add(G4, "FAIL", `gizlilik metni bölüm sırası/anahtarları eksik (sıra: ${order.join(",") || "okunamadı"}; eksik: ${missingKeys.slice(0, 4).join(", ")})`);
  /id=\{`privacy-\$\{key\}`\}/.test(lp) && /LEGAL_UPDATED/.test(lp) && /t\('updated'/.test(lp) && legalTexts.en.updated && legalTexts.tr.updated
    ? add(G4, "PASS", "yasal sayfalar: her bölümün id'si ve \"son düzenleme\" tarihi var") : add(G4, "FAIL", "LegalPage: bölüm id'leri (privacy-<anahtar>) ya da 'son düzenleme' tarihi yok");
  const bs = exists("components/sections/BriefingSection.tsx") ? read("components/sections/BriefingSection.tsx") : "";
  /#privacy-p2/.test(bs) && order.includes("p2") ? add(G4, "PASS", "rıza kutusundaki bağlantı, rızanın dayandığı bölüme (privacy-p2) gidiyor") : add(G4, "FAIL", "briefing rıza bağlantısı #privacy-p2 bölümüne gitmiyor");
  const claim = /compliant|uyumludur|uyumlu\b|guaranteed|\bgaranti(?:li|yoruz|dir)?\b|garantiert\b|garantit\b|garantizamos\b|نضمن|保证|vollständig konform|entièrement conforme|totalmente conforme|完全合规/i, claims = [];
  for (const l of PUBLIC_LOCALES) for (const [k, v] of Object.entries(legalTexts[l])) if (typeof v === "string" && claim.test(v)) claims.push(`${l}:Legal.${k}`);
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
// 2B-2 (docs/adr/0009) ve 14.10.2026 (docs/adr/0019): vitrin dört sektöre kilitli (emlak, klinik, kurumsal hukuk, lojistik); SaaS ve dil/erişim bölümü yok; sitede yedi dil iddiası yok.
{
  const show = exists("components/sections/Showcase.tsx") ? read("components/sections/Showcase.tsx") : "";
  const keys = [...show.matchAll(/\{\s*key:\s*['"](\w+)['"]/g)].map((m) => m[1]);
  keys.length === 4 && ["estate", "clinic", "law", "logistics"].every((k) => keys.includes(k))
    ? add(G4, "PASS", "vitrin tam dört sektör: estate, clinic, law, logistics (kilitli)") : add(G4, "FAIL", `vitrin kartları ${keys.join(", ") || "okunamadı"}; yalnızca estate, clinic, law, logistics olmalı (ADR 0009, 0019)`);
  const saas = [];
  for (const f of [...walk(abs("app"), [".tsx", ".ts"]), ...walk(abs("components"), [".tsx", ".ts"]), ...walk(abs("lib"), [".ts", ".tsx"]), ...walk(abs("remotion"), [".tsx", ".ts"])]) if (/saas/i.test(fs.readFileSync(f, "utf8"))) saas.push(rel(f));
  for (const l of PUBLIC_LOCALES) if (/saas/i.test(JSON.stringify(readJSON(`messages/${l}.json`)))) saas.push(`messages/${l}.json`);
  if (exists("public/media/clips")) for (const n of fs.readdirSync(abs("public/media/clips"))) if (/saas/i.test(n)) saas.push(`public/media/clips/${n}`);
  saas.length ? add(G4, "FAIL", `SaaS izi kaldı (sektör kilidi: emlak, klinik, kurumsal hukuk): ${saas.slice(0, 4).join(", ")}`) : add(G4, "PASS", "SaaS izi yok (kod, mesajlar, sahneler, videolar)");
  const claim = /seven languages|7 languages|every language it deserves|all seven|yedi dil|7 dil|her dilde|hak ettiği her dil/i, hitsLang = [];
  for (const l of PUBLIC_LOCALES) for (const [k, v] of Object.entries(flat(readJSON(`messages/${l}.json`)))) if (typeof v === "string" && claim.test(v)) hitsLang.push(`${l}:${k}`);
  const reachLeft = ["components/sections/Reach.tsx", "components/sections/ReachInteractive.tsx", "lib/reach.ts"].filter(exists);
  hitsLang.length || reachLeft.length ? add(G4, "FAIL", `yedi dil/küresel erişim iddiası kaldı: ${[...hitsLang, ...reachLeft].slice(0, 4).join(", ")}`) : add(G4, "PASS", "sitede yedi dil ya da küresel erişim iddiası yok (Reach bölümü kalktı)");
  /areaServed/.test(exists("lib/jsonld.ts") ? read("lib/jsonld.ts") : "") ? add(G4, "FAIL", "JSON-LD'de areaServed (\"Worldwide\") iddiası var") : add(G4, "PASS", "JSON-LD'de bölge iddiası yok");
}
// Karar 8 (docs/adr/0006): ölçülmemiş performans iddiası yayınlanmaz. Metinlerde yasaklı ifadeler + metrik kaynağı.
{
  const BANNED = /locked\s*60|60\s*fps\s*locked|kilitli\s*60|120\s?hz|LCP\s*[<≤]\s*1[.,]2|TBT\s*[<≤]\s*50|INP\s*[<≤]\s*100|\bAV1\b|adaptive\s*bitrate|adaptif\s*bitrate|[+−-]\s*(?:212|38|64)\s*%|%\s*(?:212|38|64)\b|before[- ]and[- ]after|before-after|önce-sonra|kusursuz|flawless|%\s*100\s*(?:güvenli|uyumlu)|100%\s*(?:secure|compliant)|\bgaranti(?:li|yoruz|dir)?\b/i;
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
const CLIPS = ["monolith", "estate", "clinic", "law", "logistics"];
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
  // Sınır animasyonlu öğedir (<span className="beam">), kart kabuğu değil: kurumsal iki sütun (docs/adr/0019) aynı kabuğu ışınsız kullanır.
  for (const dir of ["app", "components"]) for (const f of walk(abs(dir), [".tsx"])) beams += (fs.readFileSync(f, "utf8").match(/className="beam"/g) ?? []).length;
  beams <= 3 ? add(G6, "PASS", `animasyonlu Border Beam sayısı ${beams} (üst sınır 3)`) : add(G6, "FAIL", `animasyonlu Border Beam sayısı ${beams}: aynı anda en çok 3 olmalı (60 FPS bütçesi)`);
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
  const isEngine = (t) => /#version 300 es/.test(t);
  const engineInInitial = chunks.filter((c) => initial.has(c.file) && isEngine(c.text));
  const lazyEngine = chunks.filter((c) => isEngine(c.text) && !initial.has(c.file));
  engineInInitial.length ? add("8. Sinema katmanı (WebGL, film, dil geçişi)", "FAIL", `WebGL motoru ilk yük parçasında: ${engineInInitial.map((c) => c.file).join(", ")}`)
    : lazyEngine.length ? add("8. Sinema katmanı (WebGL, film, dil geçişi)", "PASS", `WebGL motoru ilk yükte değil, ayrı lazy parça${lazyEngine.length > 1 ? "lar (worker ve ana iş parçacığı yedeği; bir yolda yalnızca biri iner)" : ""}: ${lazyEngine.map((c) => (c.gz / 1024).toFixed(1)).join(" ve ")} KB gzip (shader dahil)`)
      : add("8. Sinema katmanı (WebGL, film, dil geçişi)", "WARN", "WebGL motoru parçası bulunamadı (shader metni işaretçisi değişmiş olabilir)");
  // Simülatörler (docs/adr/0020): canlı sürümleri yalnızca kartları ekrana yaklaşınca iner; ilk yük parçalarında olmaz.
  const isSim = (t) => /syncflow-demo-key-not-a-secret/.test(t) || /q-parcel/.test(t);
  const simInInitial = chunks.filter((c) => initial.has(c.file) && isSim(c.text));
  const lazySim = chunks.filter((c) => isSim(c.text) && !initial.has(c.file));
  simInInitial.length ? add("11. Vaka incelemeleri, Stüdyo, simülatörler ve bayraklar", "FAIL", `simülatör ilk yük parçasında: ${simInInitial.map((c) => c.file).join(", ")}`)
    : lazySim.length ? add("11. Vaka incelemeleri, Stüdyo, simülatörler ve bayraklar", "PASS", `simülatörler ilk yükte değil, ayrı lazy parçalar: ${(lazySim.reduce((s, c) => s + c.gz, 0) / 1024).toFixed(1)} KB gzip`)
      : add("11. Vaka incelemeleri, Stüdyo, simülatörler ve bayraklar", "WARN", "simülatör parçaları bulunamadı (işaretçi metin değişmiş olabilir)");
  const isDialog = (t) => /bd-dialog/.test(t) && /showModal/.test(t);
  const dialogInInitial = chunks.filter((c) => initial.has(c.file) && isDialog(c.text));
  dialogInInitial.length ? add("11. Vaka incelemeleri, Stüdyo, simülatörler ve bayraklar", "FAIL", `inceleme diyaloğu ilk yük parçasında: ${dialogInInitial.map((c) => c.file).join(", ")}`) : add("11. Vaka incelemeleri, Stüdyo, simülatörler ve bayraklar", "PASS", "inceleme diyaloğunun kodu ilk yük parçalarında değil (ilk üzerine gelişte ya da tıklamada iner)");
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

/* ───────── 8) Sinema katmanı (docs/adr/0014): ham WebGL2, scroll ile oynayan film, dil geçişi ───────── */
const G8 = "8. Sinema katmanı (WebGL, film, dil geçişi)";
{
  const need = ["components/cinema/CinemaStage.tsx", "lib/cinema/engine.ts", "lib/cinema/core.ts", "lib/cinema/worker.ts", "lib/cinema/protocol.ts", "lib/cinema/shaders.ts", "lib/cinema/state.ts", "lib/enhance/film.ts", "components/sections/Film.tsx"];
  const lost = need.filter((f) => !exists(f));
  if (lost.length) add(G8, "FAIL", `sinema dosyası yok: ${lost.join(", ")}`);
  else {
    // ADR 0021 §2: sayfa tarafı (engine.ts), çekirdek (core.ts, WebGL burada) ve worker (worker.ts) ayrı dosyalar; çekirdek kontrolleri ikisini birlikte okur.
    const stage = read("components/cinema/CinemaStage.tsx"), pageSide = read("lib/cinema/engine.ts"), core = read("lib/cinema/core.ts"), shaders = read("lib/cinema/shaders.ts");
    const engine = `${pageSide}
${core}`;
    // Motor ve shader'lar yalnızca dinamik import ile (ilk yüke girmez); state ve film.ts küçüktür ve serbesttir.
    const staticUse = [...walk(abs("app"), [".tsx", ".ts"]), ...walk(abs("components"), [".tsx", ".ts"]), ...walk(abs("lib"), [".ts", ".tsx"])]
      .filter((f) => !rel(f).startsWith("lib/cinema/") && /from\s+['"]@\/lib\/cinema\/(?:engine|core|worker|shaders)['"]/.test(read(rel(f)))).map(rel);
    staticUse.length ? add(G8, "FAIL", `motor/shader statik içe aktarılmış (ilk yüke girer): ${staticUse.join(", ")}`)
      : /import\(\s*['"]@\/lib\/cinema\/engine['"]\s*\)/.test(stage) ? add(G8, "PASS", "WebGL motoru yalnızca dinamik import() ile yükleniyor") : add(G8, "FAIL", "CinemaStage motoru import() ile yüklemiyor");
    // The capability check lives in lib/cinema/capable.ts (shared with the film section); the stage must call it.
    const gate = exists("lib/cinema/capable.ts") ? read("lib/cinema/capable.ts") : "";
    /cinemaCapable\(\)/.test(stage) && /prefers-reduced-motion/.test(gate) && /hover: hover\) and \(pointer: fine/.test(gate) && /saveData/.test(gate)
      ? add(G8, "PASS", "motor yalnızca ince işaretçili masaüstünde, azaltılmış hareket ve veri tasarrufu yokken başlıyor (lib/cinema/capable.ts)") : add(G8, "FAIL", "CinemaStage cinemaCapable() çağırmıyor ya da lib/cinema/capable.ts kapısı eksik (reduced-motion, ince işaretçi, saveData)");
    /getContext\(\s*['"]webgl2['"]/.test(engine) && /if \(!context\) return null/.test(engine) && /webglcontextlost/.test(engine)
      ? add(G8, "PASS", "WebGL2 yoksa ya da bağlam kaybolursa motor sessizce çekiliyor (CSS yedeği kalır)") : add(G8, "FAIL", "motorda WebGL2 yokluğu/bağlam kaybı koruması eksik");
    // ADR 0021 §2: motor varsayılan olarak worker + OffscreenCanvas'ta çalışır (context, shader derlemesi ve çizim ana iş parçacığı dışında);
    // worker başlamazsa aynı çekirdek ana iş parçacığında çalışır, CSP worker'a izin verir, çekirdek sayfaya/DOM'a dokunmaz.
    const workerCode = read("lib/cinema/worker.ts"), cspCode = read("lib/security/csp.ts");
    /new Worker\(new URL\('\.\/worker\.ts', import\.meta\.url\)/.test(pageSide) && /transferControlToOffscreen/.test(pageSide) && /startOnMainThread/.test(pageSide) && /import\('\.\/core'\)/.test(pageSide)
      && /runEngine/.test(workerCode) && /type: 'failed'/.test(workerCode) && /'worker-src': \["'self'", 'blob:'\]/.test(cspCode) && !/\b(?:window|document)\b/.test(core.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, ""))
      ? add(G8, "PASS", "motor worker + OffscreenCanvas'ta çalışır (context ve shader derlemesi ana iş parçacığında değil), başlamazsa ana iş parçacığı yedeği var, çekirdek window/document kullanmaz, CSP worker-src izinli") : add(G8, "FAIL", "worker yolu eksik (new Worker, transferControlToOffscreen, ana iş parçacığı yedeği, CSP worker-src ya da çekirdek window/document kullanıyor)");
    /clamp\(col,\s*vec3\(0\.05\d*,\s*0\.05\d*,\s*0\.054\d*\),\s*vec3\(0\.886\d*,\s*0\.886\d*,\s*0\.90\d*\)\)/.test(shaders)
      ? add(G8, "PASS", "POST shader çıktısı paletin (#0D0D0E ... #E2E2E6) içine kıstırılıyor: saf siyah/beyaz üretemez") : add(G8, "FAIL", "POST shader paletin içine kıstırmıyor (saf siyah/beyaz çıkabilir)");
    /document\.hidden/.test(engine) && /destroy\(\)/.test(engine) && /MIN_SCENE_SCALE/.test(engine) ? add(G8, "PASS", "motor sekme gizliyken durur, yavaş karede çözünürlüğü düşürür, çok yavaşsa kendini kapatır") : add(G8, "FAIL", "motorda sekme duraklatma ya da uyarlamalı kalite yok");
    const deps = { ...readJSON("package.json").dependencies, ...readJSON("package.json").devDependencies };
    const heavy = ["three", "@react-three/fiber", "@react-three/drei", "@react-three/postprocessing"].filter((d) => deps[d]);
    heavy.length ? add(G8, "WARN", `${heavy.join(", ")} projede: ilk yükten uzak tutun ve paket boyutu etkisini raporlayın (ADR 0014 ham WebGL2 seçti)`) : add(G8, "PASS", "three.js / React Three Fiber yok: motor ham WebGL2 (ADR 0014)");
    const posters = [0, 1, 2, 3].flatMap((i) => [`public/film/scene-${i}.webp`, `public/film/scene-${i}-portrait.webp`]).filter((f) => !exists(f));
    posters.length ? add(G8, "FAIL", `film posteri yok (WebGL'siz cihazların görüntüsü): ${posters.join(", ")} (scripts/render-posters.mjs üretir)`) : add(G8, "PASS", "film yedeği: dört sahne için yatay ve dikey poster var");
    /cinema-fallback/.test(read("app/globals.css")) && /prefers-reduced-motion/.test(read("app/globals.css")) ? add(G8, "PASS", "CSS yedeği (ışık + 35 mm gren) ve azaltılmış hareket kuralları var") : add(G8, "FAIL", "globals.css'te sinema yedeği ya da azaltılmış hareket kuralı yok");
    const cssText = read("app/globals.css");
    const sw = read("components/layout/LanguageSwitcher.tsx");
    /beginStaging/.test(sw) && /prefers-reduced-motion/.test(sw) && /cinema:glitch/.test(sw) && /lang-veil\[data-phase/.test(cssText) && /\.lang-veil\[data-phase='out'\]\s*\{\s*animation-duration/.test(cssText)
      ? add(G8, "PASS", "dil geçişi: kararma + glitch, hareket azaltmada yalnızca solma; perde React ağacı dışında (dil değişiminde silinmez)") : add(G8, "FAIL", "dil geçişi eksik (beginStaging, reduced-motion, cinema:glitch ya da perde kuralları)");
    /document\.documentElement\.dataset\.(?:cinema|langSwitch)\s*=/.test(engine) ? add(G8, "FAIL", "motor <html> niteliği yazıyor: React dil değişiminde <html> niteliklerini sıfırlar (tuvale yazın)") : add(G8, "PASS", "kalıcı durum <html> üzerinde değil (React dil değişiminde onu sıfırlar)");
  }
}

/* ───────── 9) Giriş kapısı, Hero ve kimlik (docs/adr/0015): çerezsiz kapı, bot baypası, platin amblem ───────── */
const G9 = "9. Giriş kapısı, Hero ve kimlik";
{
  const need = ["components/gate/EntryGate.tsx", "lib/market.ts", "lib/crawlers.ts", "lib/enhance/hero.ts", "lib/enhance/mask-frame.ts"];
  const lost = need.filter((f) => !exists(f));
  if (lost.length) add(G9, "FAIL", `giriş kapısı/hero dosyası yok: ${lost.join(", ")}`);
  else {
    const code = (f) => stripComments(read(f));
    const gate = code("components/gate/EntryGate.tsx"), page = code("app/[locale]/page.tsx"), crawlers = code("lib/crawlers.ts"), schema = code("lib/schemas/briefing.ts");
    const css = stripComments(read("app/globals.css"));
    // 1) Seçim yalnızca adreste: çerez ve tarayıcı depolaması yok (CLAUDE.md "i18n ve pazar").
    const storage = ["components/gate/EntryGate.tsx", "lib/market.ts", "lib/crawlers.ts"].filter((f) => /document\.cookie|localStorage|sessionStorage|indexedDB/.test(code(f)));
    storage.length ? add(G9, "FAIL", `çerez/depolama kullanımı: ${storage.join(", ")} (seçim yalnızca adreste, ?m=)`) : add(G9, "PASS", "kapı ve pazar çerez ve tarayıcı depolaması kullanmıyor: seçim adreste (?m=)");
    // 2) JS'siz çalışır: pazarlar gerçek bağlantı; sunucuda açık gelir.
    /<a\b[^>]*href=\{marketHref\(/.test(gate) && /entered=\{market !== null \|\| crawler\}/.test(page) ? add(G9, "PASS", "pazar seçenekleri gerçek <a href> bağlantısı ve kapı sunucuda render ediliyor (JS'siz de geçilir)") : add(G9, "FAIL", "pazar seçenekleri gerçek bağlantı değil ya da kapı sunucudan gelmiyor");
    // 3) Erişilebilirlik: dialog, aria-modal, Escape, arka plan inert.
    /role="dialog"/.test(gate) && /aria-modal/.test(gate) && /'Escape'/.test(gate) && /setAttribute\('inert'/.test(gate) ? add(G9, "PASS", "kapı role=dialog, aria-modal, Escape ile kapanır, arka plan inert") : add(G9, "FAIL", "kapıda dialog/aria-modal/Escape/inert eksik (kapı tuzak olmamalı)");
    // 4) Yalnızca yayındaki diller; pazar beyaz listeli.
    /OPEN_LOCALES\.map/.test(gate) && !/routing\.locales\.map/.test(gate) ? add(G9, "PASS", "kapı yalnızca yayındaki dilleri sunuyor (i18n/launch.ts)") : add(G9, "FAIL", "kapı yayında olmayan dilleri listeleyebilir (OPEN_LOCALES kullanın)");
    /parseMarket\(/.test(page) && /z\.enum\(MARKETS\)/.test(schema) ? add(G9, "PASS", "pazar beyaz listeli (sayfa parseMarket, başvuru şeması z.enum)") : add(G9, "FAIL", "pazar parametresi beyaz listeyle doğrulanmıyor");
    // 5) Arama motoru botları kapıyı görmez; Lighthouse/PageSpeed bilerek listede yok.
    /isCrawler\(/.test(page) && /googlebot/i.test(crawlers) && !/lighthouse|pagespeed/i.test(crawlers) ? add(G9, "PASS", "arama motoru ve önizleme botları kapıyı atlar (lib/crawlers.ts); Lighthouse ölçtüğü şeyi görür") : add(G9, "FAIL", "bot baypası yok ya da Lighthouse/PageSpeed bota sayılıyor");
    // 6) Lenis kapı açıkken durur.
    /gate:change/.test(code("lib/enhance/smooth-scroll.ts")) && /gate:change/.test(gate) ? add(G9, "PASS", "kapı açıkken Lenis durur (gate:change)") : add(G9, "FAIL", "kapı açıkken Lenis durmuyor (gate:change)");
    // 7) Logo saf platin: şampanya, parlama ya da gölge yok (brand/README.md).
    const logoRule = /\.(?:gate-emblem|hero-monogram|gate-wordmark|hero-wordmark|logo)\b[^{}]*\{[^{}]*(?:champagne|212\s+197\s+169|#d4c5a9|box-shadow|drop-shadow|gradient)[^{}]*\}/i.test(css);
    const logoJsx = [...walk(abs("components"), [".tsx"]), ...walk(abs("app"), [".tsx"])].filter((f) => /<Logo\b[^>]*champagne/.test(fs.readFileSync(f, "utf8"))).map(rel);
    logoRule || logoJsx.length ? add(G9, "FAIL", `logoya şampanya/parlama/gölge/gradyan verilmiş: ${logoJsx.join(", ") || "globals.css"}`) : add(G9, "PASS", "amblem ve wordmark yalnızca platin: logoda şampanya, parlama, gölge, gradyan yok");
    // 8) Hero: sabit sahne yalnızca yetenekli masaüstünde; maske çerçevesi JS'siz açık.
    /@media \(min-width: 64rem\)[^{]*\(hover: hover\)[^{]*\(prefers-reduced-motion: no-preference\)\s*\{[^@]*\.hero-stage\s*\{[^}]*sticky/.test(css) ? add(G9, "PASS", "hero sahnesi yalnızca ince işaretçili, yeterince uzun, hareket azaltmasız masaüstünde sabit") : add(G9, "FAIL", "hero sticky kuralı yetenek koşullarına bağlı değil");
    /var\(--mf,\s*1\)/.test(css) && /prefers-reduced-motion/.test(code("lib/enhance/mask-frame.ts")) ? add(G9, "PASS", "maske çerçeveleri JS'siz ve azaltılmış harekette açık (var(--mf, 1))") : add(G9, "FAIL", "maske çerçevesi JS'siz gizli kalabilir ya da azaltılmış hareketi saymıyor");
    // 9) Kapı açıkken sayfa kilitli, hero girişi bekler.
    /html:has\(\.gate\[data-state='open'\]\)/.test(css) && /animation-play-state:\s*paused/.test(css) ? add(G9, "PASS", "kapı açıkken sayfa kilitli ve hero girişi bekliyor (CSS :has)") : add(G9, "FAIL", "kapı açıkken kaydırma kilidi ya da hero bekletmesi yok");
    // 10) Film yedeği: motor çekilirse posterler yüklenir (ADR 0014 boşluğu).
    /CINEMA_OFF_EVENT/.test(code("lib/enhance/film.ts")) && /reportCinemaOff\(\)/.test(code("lib/cinema/engine.ts")) && /reportCinemaOff\(\)/.test(code("components/cinema/CinemaStage.tsx")) ? add(G9, "PASS", "motor başlamaz ya da kendini kapatırsa film posterlerini yükler (cinema:off)") : add(G9, "FAIL", "motor çekilince film posterleri yüklenmiyor (cinema:off bağlantısı eksik)");
  }
}

/* ───────── 10) Nitelik eşiği, pazarlar ve para birimi (docs/adr/0016) ───────── */
const G10 = "10. Nitelik eşiği, pazarlar ve para birimi";
{
  const need = ["lib/pricing.ts", "lib/market.ts", "lib/briefing.ts", "components/sections/Briefing.tsx", "lib/schemas/briefing.ts"];
  const lost = need.filter((f) => !exists(f));
  if (lost.length) add(G10, "FAIL", `dosya yok: ${lost.join(", ")}`);
  else {
    const code = (f) => stripComments(read(f));
    const pricing = code("lib/pricing.ts"), market = code("lib/market.ts"), briefing = code("lib/briefing.ts"), form = code("components/sections/Briefing.tsx"), schema = code("lib/schemas/briefing.ts");
    // 1) Yedi pazar (ADR 0018), her birinin para birimi ve asgari tutarı; ABD tabanı 25.000 USD (sahibin kararı 13.10.2026). Bir para biriminin tek tabanı olur.
    const markets = [...(/MARKETS\s*=\s*\[([^\]]*)\]/.exec(market)?.[1] ?? "").matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
    const rows = Object.fromEntries([...pricing.matchAll(/\b(us|tr|me|dach|fr|wealth|asia):\s*\{\s*currency:\s*'([A-Z]{3})',\s*floor:\s*([\d_]+)\s*\}/g)].map((m) => [m[1], { currency: m[2], floor: Number(m[3].replaceAll("_", "")) }]));
    JSON.stringify(markets) === JSON.stringify(["us", "tr", "me", "dach", "fr", "wealth", "asia"]) && markets.every((m) => rows[m]) ? add(G10, "PASS", `yedi pazar ve fiyat satırları: ${markets.map((m) => `${m} ${rows[m].currency} ${rows[m].floor}`).join(", ")}`) : add(G10, "FAIL", `pazarlar ya da fiyat satırları tutmuyor (pazarlar: ${markets.join(",")}; satırlar: ${Object.keys(rows).join(",")})`);
    const floors = {}; for (const m of markets) if (rows[m]) (floors[rows[m].currency] ??= new Set()).add(rows[m].floor);
    Object.values(floors).every((set) => set.size === 1) && Object.keys(floors).sort().join(",") === "AED,EUR,TRY,USD" ? add(G10, "PASS", "yedi pazar dört para birimini paylaşır (USD, EUR, AED, TRY) ve her para biriminin tek tabanı var") : add(G10, "FAIL", `aynı para birimi için farklı taban ya da eksik para birimi (${Object.entries(floors).map(([c, set]) => `${c}: ${[...set].join("/")}`).join("; ")})`);
    rows.us?.currency === "USD" && rows.us?.floor === 50000 ? add(G10, "PASS", "ABD asgari tutarı USD 50.000 (sahibin kararı, 14.10.2026; 13.10.2026'da 25.000 idi)") : add(G10, "FAIL", "ABD asgari tutarı USD 50.000 değil (CLAUDE.md kararı değişmeden değiştirilemez)");
    // Basamaklar asgari tutarın 1×-2×, 2×-5× ve 5× üstü (dolarda 50.000-100.000, 100.000-250.000, 250.000+; sahibin kararı 14.10.2026).
    const bands = [...(/const BANDS = \[([\s\S]*?)\] as const/.exec(pricing)?.[1] ?? "").matchAll(/id:\s*'(t\d)',\s*from:\s*(\d+),\s*to:\s*(\d+|null)/g)].map((m) => `${m[1]}:${m[2]}-${m[3]}`).join(" ");
    bands === "t1:1-2 t2:2-5 t3:5-null" ? add(G10, "PASS", "basamaklar asgari tutarın 1×-2×, 2×-5× ve 5× üstü (USD 50.000-100.000, 100.000-250.000, 250.000+)") : add(G10, "FAIL", `basamak katları yanlış (${bands || "okunamadı"}); beklenen t1:1-2 t2:2-5 t3:5-null`);
    // 2) Kur karşılıklarının tarihi ve gözden geçirme günü; geçtiyse uyar (çeyrekte bir).
    const review = /PRICING_NEXT_REVIEW\s*=\s*'(\d{4}-\d{2}-\d{2})'/.exec(pricing)?.[1], asOf = /PRICING_AS_OF\s*=\s*'(\d{4}-\d{2}-\d{2})'/.exec(pricing)?.[1];
    !review || !asOf ? add(G10, "FAIL", "lib/pricing.ts kur tarihini (PRICING_AS_OF) ya da bir sonraki gözden geçirmeyi (PRICING_NEXT_REVIEW) taşımıyor")
      : new Date(review) < new Date() ? add(G10, "WARN", `fiyat karşılıklarının gözden geçirme günü geçti (${review}); kuru yeniden alıp lib/pricing.ts'i güncelleyin`) : add(G10, "PASS", `fiyat karşılıkları ${asOf} kuruyla, bir sonraki gözden geçirme ${review}`);
    // 3) Bütçe kodları yalnızca asgari tutarın üstündeki üç basamak; eski kodlar ve "taban altı" sunucuda yok.
    const budgets = [...(/BUDGETS\s*=\s*\[([^\]]*)\]/.exec(briefing)?.[1] ?? "").matchAll(/'([a-z0-9]+)'/g)].map((m) => m[1]);
    JSON.stringify(budgets) === JSON.stringify(["t1", "t2", "t3"]) && /z\.enum\(BUDGETS\)/.test(schema) && !/under/.test(schema) ? add(G10, "PASS", "sunucu yalnızca t1, t2, t3 kabul eder (taban altı için kod yok)") : add(G10, "FAIL", `bütçe kodları ya da şema yanlış (kodlar: ${budgets.join(",")})`);
    const oldCodes = [...walk(abs("app"), [".ts", ".tsx"]), ...walk(abs("components"), [".tsx"]), ...walk(abs("lib"), [".ts", ".tsx"])].filter((f) => /['"](?:b5|b10|b20|talk)['"]/.test(stripComments(fs.readFileSync(f, "utf8")))).map(rel);
    oldCodes.length ? add(G10, "FAIL", `eski bütçe kodu kaynakta: ${oldCodes.join(", ")}`) : add(G10, "PASS", "eski bütçe kodları (b5, b10, b20, talk) kaynakta yok");
    // 4) Form: yatırım ilk adım ve yalnızca asgari tutar ve üstü üç seçenek var; "altı" seçeneği yok (sahibin kararı 14.10.2026).
    /step === 1[\s\S]{0,260}t\.budget\.title/.test(form) && /BUDGETS\.map/.test(form) && !/'under'/.test(form) && !/declined/.test(form) ? add(G10, "PASS", "formun ilk adımı yatırım ve yalnızca üç basamak sunar (asgari tutar ve üstü); daha düşük bir seçenek yok") : add(G10, "FAIL", "yatırım ilk adım değil ya da formda asgari tutarın altında bir seçenek var");
    // 5) Para birimi ve tutarlar yalnızca lib/pricing.ts'ten: çeviri dosyalarında tutar yok ("fiyat listesi yayınlanmaz").
    const amount = /(?:[$€₺]\s?\d|\d[\d.,]*\s?(?:USD|EUR|AED|TRY|TL|\$|€|₺))|\bAED\s?\d/;
    const withAmounts = PUBLIC_LOCALES.flatMap((l) => Object.entries((function flat(o, p = "", out = {}) { for (const [k, v] of Object.entries(o)) typeof v === "object" && v ? flat(v, `${p}${k}.`, out) : (out[`${p}${k}`] = v); return out; })(readJSON(`messages/${l}.json`))).filter(([, v]) => typeof v === "string" && amount.test(v)).map(([k]) => `${l}:${k}`));
    withAmounts.length ? add(G10, "FAIL", `çeviride sabit tutar var (tutar yalnızca lib/pricing.ts'ten gelir): ${withAmounts.slice(0, 4).join(", ")}`) : add(G10, "PASS", "çeviri dosyalarında sabit tutar yok: tutarlar lib/pricing.ts'ten biçimlenir (Intl)");
    // 6) Her pazarın önerdiği dil yayındaki yedi dilden biridir ve her dil tam bir pazarın dilidir (bire bir; ADR 0018).
    const dl = Object.fromEntries([...(/MARKET_DEFAULT_LOCALE[^=]*=\s*\{([^}]*)\}/.exec(market)?.[1] ?? "").matchAll(/(\w+):\s*'(\w+)'/g)].map((m) => [m[1], m[2]]));
    const dlValues = Object.values(dl);
    markets.every((m) => dl[m] && PUBLIC_LOCALES.includes(dl[m])) && new Set(dlValues).size === PUBLIC_LOCALES.length && PUBLIC_LOCALES.every((l) => dlValues.includes(l)) ? add(G10, "PASS", `pazarların önerdiği diller yayındaki yedi dildir, bire bir (${markets.map((m) => `${m}: ${dl[m]}`).join(", ")})`) : add(G10, "FAIL", "MARKET_DEFAULT_LOCALE yayında olmayan bir dile işaret ediyor, bir dil birden çok pazarda ya da bir pazar eksik");
    // 7) Eski ?m=int bağlantıları hâlâ geçerli (dolar pazarı); API'de 'int' yok.
    /LEGACY[^=]*=\s*\{\s*int:\s*'us',\s*eu:\s*'dach'\s*\}/.test(market) && !/'int'|'eu'/.test(schema) ? add(G10, "PASS", "eski ?m=int ve ?m=eu bağlantıları geçerli kalır (dolar ve Almanca/euro pazarı), API değeri değildir") : add(G10, "FAIL", "eski ?m=int / ?m=eu eşlemesi yok ya da API bu değerleri kabul ediyor");
  }
}

/* ───────── 11) Vaka incelemeleri, Stüdyo, simülatörler ve bayraklar (docs/adr/0020) ───────── */
const G11 = "11. Vaka incelemeleri, Stüdyo, simülatörler ve bayraklar";
{
  const need = [
    "lib/breakdown.ts", "lib/server/breakdown.ts", "app/api/breakdown/route.ts", "app/[locale]/showcase/[slug]/page.tsx", "app/[locale]/showcase/page.tsx",
    "components/sections/BreakdownView.tsx", "components/sections/BreakdownDialog.tsx", "components/sections/BreakdownHost.tsx", "components/sections/Studio.tsx",
    "components/sim/types.ts", "components/sim/QueueView.tsx", "components/sim/SecurityView.tsx", "components/sim/FailSafeSim.tsx", "components/sim/SecurityFlowSim.tsx", "components/sim/LazySims.tsx",
    "components/ui/Flag.tsx", "app/flags.css", "scripts/build-flags.mjs", "docs/adr/0020-case-study-layer.md",
  ];
  const lost = need.filter((f) => !exists(f));
  if (lost.length) add(G11, "FAIL", `ADR 0020 dosyası yok: ${lost.join(", ")}`);
  else {
    const code = (f) => stripComments(read(f));
    const flatten = (o, p = "", out = {}) => { for (const [k, v] of Object.entries(o)) typeof v === "object" && v ? flatten(v, `${p}${k}.`, out) : (out[`${p}${k}`] = v); return out; };
    const SLUGS = ["estate", "clinic", "law", "logistics"];

    // 1) Vaka incelemesi dört sektörle sınırlıdır (kilitli dörtlü) ve her sektörde 14 anahtar, her dilde var.
    const slugs = [...(/BREAKDOWN_SLUGS\s*=\s*\[([^\]]*)\]/.exec(code("lib/breakdown.ts"))?.[1] ?? "").matchAll(/'(\w+)'/g)].map((m) => m[1]);
    const cards = [...code("components/sections/Showcase.tsx").matchAll(/key:\s*'(\w+)',\s*id:/g)].map((m) => m[1]);
    JSON.stringify(slugs) === JSON.stringify(SLUGS) && JSON.stringify(cards) === JSON.stringify(SLUGS) ? add(G11, "PASS", "vaka incelemeleri vitrinin kilitli dörtlüsüyle birebir aynı: estate, clinic, law, logistics") : add(G11, "FAIL", `inceleme sektörleri (${slugs.join(",")}) vitrin kartlarıyla (${cards.join(",")}) ya da kilitli dörtlüyle uyuşmuyor`);
    const KEYS = ["scenario", "c1", "c2", "c3", "s1", "s2", "s3", "i1", "i2", "i3", "m1", "m2", "m3", "note"];
    const COMMON = ["kicker", "specimen", "briefLabel", "navLabel", "challengeTitle", "challengeLead", "solutionTitle", "solutionLead", "integrationTitle", "integrationLead", "integrationNote", "impactTitle", "impactLead", "measuredTitle", "measuredLead", "tilePerformance", "tileLcp", "tileCls", "tileAudit", "metricCaption", "roiTitle", "roiText", "roi1Title", "roi1", "roi2Title", "roi2", "roi3Title", "roi3", "baselineLabel", "howTitle", "howText", "howLink", "ctaTitle", "ctaText", "back", "metaTitle", "metaDescription"];
    const missing = [];
    for (const l of PUBLIC_LOCALES) { const b = readJSON(`messages/${l}.json`).Breakdown ?? {}; for (const slug of SLUGS) for (const k of KEYS) if (!b[slug]?.[k]) missing.push(`${l}:${slug}.${k}`); for (const k of COMMON) if (!b[k]) missing.push(`${l}:${k}`); }
    missing.length ? add(G11, "FAIL", `inceleme metni eksik (${missing.length}): ${missing.slice(0, 4).join(", ")}`) : add(G11, "PASS", `dört sektör × ${KEYS.length} metin ve ${COMMON.length} ortak metin, yedi dilde de var`);

    // 2) Dört başlık sırasıyla: Challenge, Architectural solution, Integration & security, Measured impact & ROI (ve numune etiketi).
    const en = readJSON("messages/en.json").Breakdown;
    [en.challengeTitle, en.solutionTitle, en.integrationTitle, en.impactTitle].join("|") === "Challenge|Architectural solution|Integration & security|Measured impact & ROI" && /not client work/.test(en.specimen) ? add(G11, "PASS", "dört başlık istenen adlarla ve sırayla; her inceleme 'client work değildir' diyor") : add(G11, "FAIL", "dört başlık ya da numune ibaresi istenenle uyuşmuyor");
    const view = code("components/sections/BreakdownView.tsx"), loader = code("lib/server/breakdown.ts");
    /id="bd-impact"/.test(view) && /\bparts\.map/.test(view) && /impact\.tiles\.map/.test(view) ? add(G11, "PASS", "inceleme görünümü üç bölümü ve etki panelini sırayla çiziyor (sayfa ve diyalog aynı bileşeni kullanır)") : add(G11, "FAIL", "BreakdownView dört bölümü sırayla çizmiyor");

    // 3) İnceleme sayılarının tek kaynağı lib/metrics.ts; sektör metinlerinde ve simülatör metinlerinde rakam ya da yüzde yok.
    /METRICS\.lighthousePerformance\b/.test(loader) && /METRICS\.lcpDesktop\b/.test(loader) && /METRICS\.cls\b/.test(loader) && !/\b(?:97|96|570|0\.57)\b/.test(loader) ? add(G11, "PASS", "etki panelinin sayıları lib/metrics.ts'ten okunur; yükleyicide sabit rakam yok") : add(G11, "FAIL", "lib/server/breakdown.ts sayıları METRICS'ten okumuyor ya da sabit rakam taşıyor");
    const digits = [];
    for (const l of PUBLIC_LOCALES) { const m = readJSON(`messages/${l}.json`); for (const [k, v] of Object.entries(flatten({ Breakdown: Object.fromEntries(SLUGS.map((s) => [s, m.Breakdown[s]])) }))) if (typeof v === "string" && /\d/.test(v.replace(/AES-256(?:-GCM)?|HMAC-SHA256/g, ""))) digits.push(`${l}:${k}`); }
    digits.length ? add(G11, "FAIL", `sektör incelemesi metninde rakam var (ölçülmemiş sayı yayınlanmaz): ${digits.slice(0, 4).join(", ")}`) : add(G11, "PASS", "sektör inceleme metinlerinde rakam ya da yüzde yok (yalnızca AES-256 ve HMAC-SHA256 adları); ROI sonucu değil, ölçüm yöntemi anlatılır");
    const FORBIDDEN = /zero[- ]latency|sıfır gecikme|photo-?real|fotogerçek|SOC ?2|ISO ?27001|certified partner|sertifikalı ortak|\bSLA\s*(?:of|:)\s*\d|\buptime\s*(?:of|:)\s*\d|\d\s?%\s*(?:uptime|ROI|faster|daha hızlı)/i;
    const claims = [];
    for (const l of PUBLIC_LOCALES) for (const [k, v] of Object.entries(flatten(readJSON(`messages/${l}.json`)))) if (/^(Breakdown|Sim|Studio)\./.test(k) && typeof v === "string" && FORBIDDEN.test(v)) claims.push(`${l}:${k}`);
    claims.length ? add(G11, "FAIL", `yasak iddia (zero latency, fotogerçekçi, SLA, sertifika, çalışma süresi, yüzde ROI): ${claims.slice(0, 4).join(", ")}`) : add(G11, "PASS", "inceleme, simülatör ve Stüdyo metinlerinde 'zero latency', 'photorealistic', SLA, sertifika, çalışma süresi ya da yüzde ROI iddiası yok");

    // 4) Sağlık ve hukuk incelemeleri meslek reklam kurallarını söyler (müşteri adına uygulama sorumluluğu müşteridir).
    const clinic = en.clinic.note + en.clinic.c3;
    /no prices, discounts/.test(clinic) && /responsibility/.test(en.clinic.note) && /every word is the clinic/.test(en.clinic.note) && /responsibility/.test(en.law.note) && /no client is solicited/.test(en.law.note) ? add(G11, "PASS", "klinik ve hukuk incelemeleri meslek reklam kurallarını anıyor, uygulama sorumluluğunu müşteriye bırakıyor; fiyat, indirim, galeri ve hasta yorumu yok") : add(G11, "FAIL", "klinik ya da hukuk incelemesi reklam kuralı notunu taşımıyor");
    /Salesforce|SAP|Oracle/.test(en.integrationNote) && /no partnership or certification is implied/.test(en.integrationNote) && PUBLIC_LOCALES.every((l) => (readJSON(`messages/${l}.json`).Breakdown.integrationNote ?? "").length > 40) ? add(G11, "PASS", "Salesforce, SAP ve Oracle örnek hedef olarak anılıyor, 'ortaklık ya da sertifika ima edilmez' notu yedi dilde de var") : add(G11, "FAIL", "entegrasyon notu (ortaklık ima edilmez) eksik");

    // 5) API: iki parametre de beyaz listeli, kapalı dil 404, çıktı yankılanmaz; sayfa: bilinmeyen sektör 404; site haritası incelemeleri listeler.
    const api = code("app/api/breakdown/route.ts"), page = code("app/[locale]/showcase/[slug]/page.tsx"), sitemap = code("app/sitemap.ts");
    /isBreakdownSlug\(slug\)/.test(api) && /isOpenLocale\(locale\)/.test(api) && /status:\s*404/.test(api) && /no-store/.test(api) && /default-src 'none'/.test(api) ? add(G11, "PASS", "/api/breakdown iki parametreyi de beyaz listeden geçirir (sektör ve yayındaki dil), 404 verir, önbelleğe girmez ve kilitli CSP gönderir") : add(G11, "FAIL", "/api/breakdown beyaz liste, 404, no-store ya da kilitli CSP eksik");
    /isOpenLocale\(locale\)\s*\|\|\s*!isBreakdownSlug\(slug\)|!isOpenLocale\(locale\)\s*\|\|\s*!isBreakdownSlug\(slug\)/.test(page) && /notFound\(\)/.test(page) && /hrefLang|languages/.test(page) && /canonical/.test(page) ? add(G11, "PASS", "inceleme sayfası: yayında olmayan dil ve bilinmeyen sektör 404, canonical ve hreflang var") : add(G11, "FAIL", "inceleme sayfası geçersiz dil/sektör için 404 vermiyor ya da canonical/hreflang yok");
    /BREAKDOWN_SLUGS/.test(sitemap) && /OPEN_LOCALES/.test(sitemap) ? add(G11, "PASS", "site haritası her yayındaki dil için dört incelemeyi de listeliyor (yalnızca yayındaki diller)") : add(G11, "FAIL", "site haritası incelemeleri listelemiyor");

    // 6) Diyalog: yerel <dialog>, Esc/Geri/arka plan, odak geri döner, Lenis durur; tıklama yakalama aşamasında alınır; kart bağlantısı gerçek <a href>.
    const dialog = code("components/sections/BreakdownDialog.tsx"), host = code("components/sections/BreakdownHost.tsx"), smooth = code("lib/enhance/smooth-scroll.ts"), showcase = code("components/sections/Showcase.tsx");
    /showModal\(\)/.test(dialog) && /popstate/.test(dialog) && /history\.pushState/.test(dialog) && /history\.back\(\)/.test(dialog) && /focus\(/.test(dialog) && /scroll:lock/.test(dialog) && /data-lenis-prevent/.test(dialog) ? add(G11, "PASS", "diyalog yerel <dialog>/showModal; Geri düğmesi ve Esc kapatır, adres inceleme sayfasına döner ve geri gelir, odak açana döner, Lenis durur") : add(G11, "FAIL", "BreakdownDialog showModal/popstate/pushState/focus/scroll:lock/data-lenis-prevent eksik");
    /addEventListener\('click',\s*open,\s*true\)/.test(host) && /stopPropagation\(\)/.test(host) && /metaKey/.test(host) && /import\('\.\/BreakdownDialog'\)/.test(host) ? add(G11, "PASS", "tıklama yakalama aşamasında alınır (Next Link'ten önce), değiştirici tuşlar bağlantının kendi davranışını korur, diyalog kodu ayrı parça (ilk yüke girmez)") : add(G11, "FAIL", "BreakdownHost tıklamayı yakalama aşamasında almıyor ya da diyaloğu dinamik import etmiyor");
    /data-breakdown-link/.test(showcase) && /card-hit/.test(showcase) && /aria-hidden="true"/.test(showcase) && /tabIndex=\{-1\}/.test(showcase) && /breakdownFor/.test(showcase) ? add(G11, "PASS", "her kart gerçek bir bağlantı (JS'siz de açılır) ve tüm kartı kaplayan, ekran okuyucudan gizli bir isabet alanı taşıyor; görünür düğme erişilebilir bağlantı") : add(G11, "FAIL", "vitrin kartında inceleme bağlantısı ya da isabet alanı eksik");
    /scroll:lock/.test(smooth) ? add(G11, "PASS", "Lenis diyalog açıkken durur (scroll:lock)") : add(G11, "FAIL", "smooth-scroll.ts scroll:lock olayını dinlemiyor");

    // 7) Simülatörler: gerçek Web Crypto (HMAC-SHA256, AES-256-GCM), üçüncü taraf yok, ilk yükte değil (dinamik import), azaltılmış hareket.
    const sec = code("components/sim/SecurityFlowSim.tsx"), queue = code("components/sim/FailSafeSim.tsx"), lazy = code("components/sim/LazySims.tsx");
    // ADR 0021: akış kendi kriptosunu yazmaz, testle doğrulanan lib/arch/envelope'u çağırır; gerçek Web Crypto orada çalışır.
    const env = code("lib/arch/envelope.ts");
    /crypto\.subtle\.sign\('HMAC'/.test(env) && /name: 'AES-GCM', length: 256/.test(env) && /crypto\.subtle\.decrypt/.test(env) && /timingSafeEqual/.test(env) && /from '@\/lib\/arch\/envelope'/.test(sec) && /signEvent|verifyEnvelope/.test(sec) && /seal\(|open\(/.test(sec) && /prefers-reduced-motion/.test(sec) ? add(G11, "PASS", "güvenlik akışı gerçek Web Crypto çalıştırır (lib/arch/envelope üzerinden, testle doğrulanan aynı kod): HMAC-SHA256 imza, sabit zamanlı karşılaştırma, AES-256-GCM mühürleme ve açma; azaltılmış harekette gecikmesiz") : add(G11, "FAIL", "SecurityFlowSim gerçek HMAC-SHA256/AES-256-GCM çalıştırmıyor");
    const simImports = [...walk(abs("components/sim"), [".ts", ".tsx"])].flatMap((f) => [...stripComments(fs.readFileSync(f, "utf8")).matchAll(/from\s+'([^'.@][^']*)'/g)].map((m) => `${path.basename(f)}:${m[1]}`)).filter((s) => !/:(react|lucide-react)$/.test(s));
    simImports.length ? add(G11, "FAIL", `simülatör üçüncü taraf paket içe aktarıyor: ${simImports.join(", ")}`) : add(G11, "PASS", "simülatörlerde react dışında paket yok (Web Crypto tarayıcının kendisi)");
    /import\('\.\/FailSafeSim'\)/.test(lazy) && /import\('\.\/SecurityFlowSim'\)/.test(lazy) && /IntersectionObserver/.test(lazy) ? add(G11, "PASS", "simülatörler yalnızca kartları ekrana yaklaşınca dinamik import ile iner (IntersectionObserver)") : add(G11, "FAIL", "LazySims simülatörleri dinamik import etmiyor");
    const staticImport = walk(abs("."), [".ts", ".tsx"]).map(rel).filter((f) => /^(app|components|lib)\//.test(f) && !/^components\/sim\/(LazySims|FailSafeSim|SecurityFlowSim)\.tsx$/.test(f) && /from\s+'(?:@\/components\/sim\/|\.\/)(?:FailSafeSim|SecurityFlowSim)'/.test(stripComments(read(f))));
    staticImport.length ? add(G11, "FAIL", `canlı simülatör statik içe aktarılıyor (ilk yüke girer): ${staticImport.join(", ")}`) : add(G11, "PASS", "canlı simülatörler hiçbir yerde statik içe aktarılmıyor");
    /QueueView/.test(queue) && /lost\s*=\s*snap\.accepted - snap\.delivered - waiting - inFlight/.test(queue) && /duplicates/.test(queue) ? add(G11, "PASS", "kuyruk simülatörü 'kayıp'ı modelden hesaplar (kabul edilen eksi hesaba katılanlar) ve mükerrer teslimi (idempotency) sayar") : add(G11, "FAIL", "FailSafeSim kayıp ve mükerrer sayacı eksik");
    const sim = readJSON("messages/en.json").Sim;
    /model of the pattern, not a measurement/.test(sim.queue.caption) && /throwaway keys/.test(sim.security.caption) && /no partnership/.test(sim.security.caption) && /does not describe, measure or certify/.test(sim.security.caption) ? add(G11, "PASS", "iki simülatör de kendini 'modeldir, ölçüm değildir' diye etiketliyor; ortaklık ya da sertifika ima edilmez") : add(G11, "FAIL", "simülatör açıklaması model/ölçüm değil uyarısını taşımıyor");
    const sigCode = code("lib/server/deliver.ts");
    /sha256=/.test(sigCode) && /sha256=/.test(sec) && /Idempotency|idempotency/i.test(sigCode) ? add(G11, "PASS", "simülatördeki imza biçimi sitenin kendi teslim imzasıyla aynı (sha256=<hex>, idempotency anahtarı): 'aynı desen' cümlesi doğru") : add(G11, "FAIL", "simülatörün imza biçimi lib/server/deliver.ts ile uyuşmuyor ('aynı desen' cümlesi yanlış olur)");

    // 8) Stüdyo: sayfadaki "nasıl yaptık" toleransları koddaki sabitlerle tutuyor (sabit değişirse metin eskir).
    const engine = `${read("lib/cinema/engine.ts")}
${read("lib/cinema/core.ts")}`, tokens = read("lib/motion/tokens.ts"), css = read("app/globals.css"), capable = read("lib/cinema/capable.ts");
    const checks = [
      [/devicePixelRatio\s*\|\|\s*1,\s*1\.25\)/.test(engine), "piksel oranı üst sınırı 1,25"],
      [/let sceneScale\s*=\s*0\.5/.test(engine) && /MIN_SCENE_SCALE\s*=\s*0\.3/.test(engine), "sahne geçişi %50'den %30'a"],
      [/frameCount % 90 === 0/.test(engine) && /avg > 0\.024/.test(engine), "90 karelik ortalama 24 ms'yi aşarsa geri çekilme"],
      [/powerPreference:\s*'high-performance'/.test(engine), "yüksek performanslı GPU isteği"],
      [/LENIS\s*=\s*\{\s*duration:\s*1\.2\s*\}/.test(tokens) && /EASE_LUX\s*=\s*\[0\.16,\s*1,\s*0\.3,\s*1\]/.test(tokens), "Lenis süresi 1,2 sn ve cubic-bezier(0.16, 1, 0.3, 1)"],
      [/scroll-padding-top:\s*88px/.test(css), "başlık payı 88 px"],
      [/\(hover: hover\) and \(pointer: fine\)/.test(read("lib/enhance/smooth-scroll.ts")) && /prefers-reduced-motion/.test(read("lib/enhance/smooth-scroll.ts")), "Lenis yalnızca ince işaretçide ve azaltılmış hareket yokken"],
      [/saveData/.test(capable) && /innerWidth >= 900/.test(capable), "sinema katmanı kapısı"],
    ];
    const enS = readJSON("messages/en.json").Studio, tolText = [enS.n1Tolerances, enS.n1s4, enS.n2Tolerances, enS.n3Tolerances, enS.n3s2].join(" ");
    const said = ["1.25", "50 %", "30 %", "24 ms", "90", "16.7 ms", "1.2 s", "0.16, 1, 0.3, 1", "88 px"].filter((t) => !tolText.includes(t));
    const stale = checks.filter(([ok]) => !ok).map(([, name]) => name);
    stale.length || said.length ? add(G11, "FAIL", `Stüdyo toleransları kodla tutmuyor${stale.length ? ` (kodda değişmiş: ${stale.join("; ")})` : ""}${said.length ? ` (metinde yok: ${said.join(", ")})` : ""}`) : add(G11, "PASS", "Stüdyo'daki toleranslar koddaki sabitlerle tutuyor: piksel oranı 1,25, sahne 0,5→0,3, 24 ms/90 kare, Lenis 1,2 sn ve eğrisi, 88 px, ince işaretçi");
    /METRICS\.frameMedian/.test(code("components/sections/Studio.tsx")) && /METRICS\.frameP99/.test(code("components/sections/Studio.tsx")) ? add(G11, "PASS", "Stüdyo'daki tek ölçüm (kare süresi) lib/metrics.ts'ten okunur, tarihi ve profiliyle") : add(G11, "FAIL", "Stüdyo kare süresini lib/metrics.ts'ten okumuyor");
    const studio = Object.entries(flatten(readJSON("messages/en.json").Studio)).map(([, v]) => v).join(" ");
    /Zero defects, as a method/.test(enS.p1Title) && /never a promise/.test(enS.p1Text) && !/guarantee|%\s*100|100\s*%|flawless|perfect/i.test(studio) && /mutual NDA can be signed/.test(enS.p2Text) ? add(G11, "PASS", "Stüdyo 'sıfır hata'yı yöntem olarak anlatıyor, söz vermiyor; NDA 'imzalanabilir' diyor; garanti/%100/kusursuz yok") : add(G11, "FAIL", "Stüdyo metni sıfır hatayı garanti gibi sunuyor ya da NDA ifadesi yok");

    // 9) Bayraklar: SVG (Windows'ta bayrak emojisi çizilmez), emoji yok, her dilin bir bayrağı var, kapı ve seçici kullanır; palette kalır.
    const regional = /[\u{1F1E6}-\u{1F1FF}]/u;
    const emoji = [...walk(abs("app"), [".ts", ".tsx", ".css"]), ...walk(abs("components"), [".tsx"]), ...walk(abs("lib"), [".ts", ".tsx"]), ...walk(abs("messages"), [".json"]), ...walk(abs("i18n"), [".ts"])].filter((f) => regional.test(fs.readFileSync(f, "utf8"))).map(rel);
    emoji.length ? add(G11, "FAIL", `bayrak emojisi var (Windows'ta iki harf olarak görünür; SVG kullanın): ${emoji.join(", ")}`) : add(G11, "PASS", "bayrak emojisi yok: bayraklar SVG resimli CSS arka planı (Windows'ta da aynı görünür)");
    const routing = read("i18n/routing.ts"), flagSrc = code("components/ui/Flag.tsx"), flagCss = read("app/flags.css");
    const flags = [...routing.matchAll(/flag:\s*'(\w+)'/g)].map((m) => m[1]);
    flags.length === 8 && ["us", "tr", "ae", "de", "fr", "es", "cn", "jp"].every((f) => flags.includes(f)) && ["us", "tr", "ae", "de", "fr", "es", "cn", "jp"].every((f) => flagCss.includes(`.flag[data-flag='${f}']`)) ? add(G11, "PASS", "her dilin bir bayrağı var (en us, tr tr, ar ae, de de, fr fr, es es, zh cn) ve hepsi app/flags.css'te çizili") : add(G11, "FAIL", "LOCALE_LABELS bayrakları ya da app/flags.css çizimleri eksik");
    /Flag/.test(code("components/layout/LanguageSwitcher.tsx")) && /Flag/.test(code("components/gate/EntryGate.tsx")) && /Flag/.test(code("components/layout/Footer.tsx")) ? add(G11, "PASS", "dil seçici, giriş kapısı (pazar kartları ve dil çipleri) ve footer bayrakları kullanıyor") : add(G11, "FAIL", "bayraklar seçicide, kapıda ya da footer'da kullanılmıyor");
    /#(?:fff(?:fff)?|000(?:000)?)\b|%23(?:fff(?:fff)?|000(?:000)?)\b|\b(?:white|black)\b/i.test(flagCss + code("scripts/build-flags.mjs")) ? add(G11, "FAIL", "bayraklar saf siyah ya da beyaz taşıyor (beyaz = platin, siyah = grafit)") : add(G11, "PASS", "bayraklar paletin içinde: beyaz yerine platin, siyah yerine grafit");
    // Bayrak bir CSS arka planıdır (ADR 0021 §3): bileşen tek, boş bir öğe çizer (satır içi SVG = bayrak başına 3-7 düğüm ve her yazı tipi değişiminde yeniden stil), üretici ile CSS aynıdır.
    /<svg|<path|<rect|<circle|<polygon/.test(flagSrc) || !/data-flag=\{code\}/.test(flagSrc) ? add(G11, "FAIL", "Flag.tsx tek bir boş öğe çizmeli (data-flag); satır içi SVG DOM'u şişirir") : add(G11, "PASS", "Flag.tsx tek bir boş öğe çizer, resim app/flags.css'te (satır içi SVG yok)");
    const flagsCheck = spawnSync(process.execPath, ["scripts/build-flags.mjs", "--check"], { cwd: ROOT, encoding: "utf8" });
    flagsCheck.status === 0 ? add(G11, "PASS", "app/flags.css üreticisiyle (scripts/build-flags.mjs) aynı") : add(G11, "FAIL", "app/flags.css üreticisinden sapmış: npm run flags:build", (flagsCheck.stderr || flagsCheck.stdout || "").trim());

    // 10) Sahne videoları: dört sektör sahnesi 1920 × 1080 (Remotion --scale=1.5), posterler tembel <img>; şampanya dışında yeni renk yok.
    const webp = (f) => { const b = fs.readFileSync(abs(f)); const t = b.toString("ascii", 12, 16); return t === "VP8 " ? [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff] : t === "VP8L" ? [1 + (((b[22] & 0x3f) << 8) | b[21]), 1 + (((b[24] & 0x0f) << 10) | (b[23] << 2) | ((b[22] & 0xc0) >> 6))] : t === "VP8X" ? [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)] : [0, 0]; };
    const mp4 = (f) => { const b = fs.readFileSync(abs(f)); const at = b.indexOf("tkhd"); if (at < 0) return [0, 0]; const v = b[at + 4]; const o = at + (v === 1 ? 92 : 80); return [b.readUInt32BE(o) / 65536, b.readUInt32BE(o + 4) / 65536]; };
    const wrong = [];
    for (const name of ["estate", "clinic", "law", "logistics", "monolith"]) {
      const want = name === "monolith" ? [1280, 720] : [1920, 1080];
      for (const [f, size] of [[`public/media/clips/${name}.webp`, webp(`public/media/clips/${name}.webp`)], [`public/media/clips/${name}.mp4`, mp4(`public/media/clips/${name}.mp4`)]]) if (size[0] !== want[0] || size[1] !== want[1]) wrong.push(`${f} ${size.join("x")} (beklenen ${want.join("x")})`);
    }
    wrong.length ? add(G11, "FAIL", `klip ya da poster çözünürlüğü tutmuyor: ${wrong.slice(0, 4).join("; ")}`) : add(G11, "PASS", "dört sektör klibi ve posteri 1920×1080 (MP4 ve WebP başlıklarından okundu), mimari monolit 1280×720");
    /SCALE\s*=\s*\{[^}]*estate:\s*1\.5[^}]*clinic:\s*1\.5[^}]*law:\s*1\.5[^}]*logistics:\s*1\.5/.test(read("scripts/render-film.mjs")) ? add(G11, "PASS", "render betiği dört sektör sahnesini --scale=1.5 ile işliyor (sahne koordinatları değişmeden)") : add(G11, "FAIL", "scripts/render-film.mjs sektör sahneleri için ölçek 1,5 taşımıyor");
    const sv = code("components/media/SceneVideo.tsx");
    /loading="lazy"/.test(sv) && !/\bposter=/.test(sv) ? add(G11, "PASS", "klip görüntüsü tembel <img> (video poster'ı sayfa yüklenirken indirilirdi); video preload=none") : add(G11, "FAIL", "SceneVideo hâlâ poster= kullanıyor ya da tembel <img> yok");
  }
}

/* ───────── 12) Üretim performansı ve kurumsal kanıt (docs/adr/0021) ───────── */
const G12 = "12. Üretim performansı ve kurumsal kanıt";
{
  const need = [
    "docs/adr/0021-production-performance-and-enterprise-proof.md", "lib/cv.ts", "lib/enhance/content-visibility.ts", "components/sections/AnchorPrime.tsx",
    "components/sim/Reserve.tsx", "components/sim/IntegrationView.tsx", "components/sim/IntegrationSim.tsx",
    "lib/arch/types.ts", "lib/arch/event.ts", "lib/arch/envelope.ts", "lib/arch/queue.ts", "lib/arch/mappers.ts", "lib/arch/simulate.ts", "lib/arch/scenarios.ts", "lib/arch/index.ts",
    "tests/arch/event.test.ts", "tests/arch/envelope.test.ts", "tests/arch/queue.test.ts", "tests/arch/mappers.test.ts", "tests/arch/docs.test.ts",
    "docs/architecture/README.md", "docs/architecture/fail-safe-queue.md", "docs/architecture/security-envelope.md", "docs/architecture/integrations.md", "docs/architecture/canonical-event.schema.json",
    "scripts/arch-verify.mjs", "scripts/browser-flow.mjs", "scripts/perf-gate.mjs", "scripts/perf-budget.json",
  ];
  const lost = need.filter((f) => !exists(f));
  if (lost.length) add(G12, "FAIL", `ADR 0021 dosyası yok: ${lost.join(", ")}`);
  else {
    const code = (f) => stripComments(read(f));
    const css = read("app/globals.css");

    // 1) content-visibility: altı blok yakına gelene kadar atlanır; hero ve film atlanmaz; ölçülmüş yer tutucu boyut hatırlanır
    const cvRule = (css.match(/\.cv\s*\{[^}]*\}/) ?? [""])[0];
    /content-visibility:\s*auto/.test(cvRule) && /contain-intrinsic-block-size:\s*auto\b/.test(cvRule) && /\.cv\[data-cv-prime\]/.test(css) && /:has\(:target\)/.test(css)
      ? add(G12, "PASS", "film altındaki bloklar yakına gelene kadar atlanır: content-visibility: auto, hatırlanan boyut (contain-intrinsic-block-size: auto), çapa ve derin bağlantı için çizim kilidi")
      : add(G12, "FAIL", ".cv kuralı content-visibility: auto, contain-intrinsic-block-size: auto, .cv[data-cv-prime] ya da :has(:target) eksik");
    const owners = [["components/sections/Architecture.tsx", "architecture"], ["components/sections/Showcase.tsx", "showcase"], ["components/sections/Studio.tsx", "studio"], ["components/sections/BriefingSection.tsx", "briefing"], ["components/sections/Closing.tsx", "closing"], ["components/layout/Footer.tsx", "footer"]];
    const missing = owners.filter(([f, name]) => !new RegExp(`className="[^"]*\\bcv cv-${name}\\b`).test(read(f))).map(([, name]) => name);
    missing.length === 0 && !/className="[^"]*\bcv\b/.test(read("components/sections/Hero.tsx")) && !/className="[^"]*\bcv\b/.test(read("components/sections/Film.tsx"))
      ? add(G12, "PASS", "altı blok (Architecture, Showcase, Studio, Briefing, Closing, footer) cv sınıfını taşır; hero ve film (betikle ölçülen yapışkan sahneler) taşımaz")
      : add(G12, "FAIL", `cv sınıfı eksik: ${missing.join(", ") || "-"}, ya da hero/film cv taşıyor`);
    const users = ["lib/enhance/smooth-scroll.ts", "components/sections/BreakdownDialog.tsx", "components/gate/EntryGate.tsx", "lib/enhance/content-visibility.ts", "components/sections/AnchorPrime.tsx"].filter((f) => !/holdLayoutBefore/.test(code(f)));
    users.length === 0 ? add(G12, "PASS", "her kaydırma yolu (Lenis, yerel çapa, diyalog bağlantısı, kapının hash kaydırması, yumuşak gezinti) hedefin üstündeki bölümleri önce gerçek hale getirir (lib/cv.ts)") : add(G12, "FAIL", `holdLayoutBefore kullanmayan kaydırma yolu: ${users.join(", ")}`);
    // Suspense bölümleri akıtır ve gizli bloğa koyar: JS'siz ve tarayıcı olmayan okuyucu için içerik görünmez olur (ADR 0021 §7)
    !/Suspense/.test(code("app/[locale]/page.tsx")) ? add(G12, "PASS", "ana sayfa bölümleri Suspense ile sarılmaz: sayfa ilk yanıtta eksiksizdir (Suspense bölümleri gizli bloğa akıtıyordu)") : add(G12, "FAIL", "ana sayfada Suspense var: bölümler script ile açılan gizli bloklara akar");

    // 2) ilk ekran: kapı başlığı ve lead kayar (opaklık yok), eklentiler dört görevde başlar, halkalar gözlemciyle kurulur
    const gate = read("components/gate/EntryGate.tsx");
    /className="gate-title gate-slide"/.test(gate) && /className="lead gate-slide"/.test(gate) && !/@keyframes gate-slide\s*\{[^}]*opacity/.test(css)
      ? add(G12, "PASS", "kapı başlığı ve lead ilk karede görünür (gate-slide yalnızca kayar, opaklık ya da gecikme yok): ölçülen LCP ilk karedir")
      : add(G12, "FAIL", "kapı başlığı/lead hâlâ solma ile geliyor ya da gate-slide opaklık içeriyor");
    const idx = code("lib/enhance/index.ts");
    /GROUPS/.test(idx) && /yieldToMain/.test(idx) && /scheduler\??\.yield|scheduler/.test(idx) && /initContentVisibility/.test(idx)
      ? add(G12, "PASS", "eklentiler tek görevde değil dört yield'li görevde başlar (TBT bir görevi 50 ms üstünden sayar)")
      : add(G12, "FAIL", "lib/enhance/index.ts eklentileri yield'li gruplarda başlatmıyor");
    !/host\.getBoundingClientRect\(\)\.top\s*</.test(code("lib/enhance/rings.ts")) && /armObserver/.test(code("lib/enhance/rings.ts"))
      ? add(G12, "PASS", "halkalar yüklemede geometri okumaz (atlanan bloğu çizdirirdi): gözlemciyle kurulur")
      : add(G12, "FAIL", "rings.ts yüklemede hâlâ getBoundingClientRect okuyor");
    /new IntersectionObserver/.test(code("components/sections/ShowcaseStrip.tsx")) && /previous\.start === start/.test(code("components/sections/ShowcaseStrip.tsx"))
      ? add(G12, "PASS", "ShowcaseStrip ilk ölçümünü yakına gelince yapar ve aynı değer için yeniden çizmez")
      : add(G12, "FAIL", "ShowcaseStrip hâlâ yüklemede ölçüyor ya da eşit durumda yeniden çiziyor");
    /useMemo/.test(code("components/i18n/ClientI18n.tsx")) && /useMemo/.test(code("components/sections/Briefing.tsx")) && /moneyFormats/.test(code("lib/pricing.ts"))
      ? add(G12, "PASS", "i18n bağlamı ve briefing türetilmiş değerleri useMemo/useCallback ile sabit; para biçimleyicisi dil+para birimi başına bir kez kurulur")
      : add(G12, "FAIL", "ClientI18n/Briefing memoization ya da pricing biçimleyici önbelleği eksik");
    /built\s*\?/.test(code("components/layout/LanguageSwitcher.tsx")) && /aria-controls=\{built/.test(read("components/layout/LanguageSwitcher.tsx"))
      ? add(G12, "PASS", "dil menüsü ilk ilgide kurulur (kapalıyken inert ve görünmez, her dilde yazı tipi araması isterdi); tetikleyici olmayan menüyü göstermez")
      : add(G12, "FAIL", "dil menüsü hâlâ yüklemede çiziliyor");

    // 3-4) yerleşim kararlılığı: simülatör boyu, RTL
    const views = ["components/sim/QueueView.tsx", "components/sim/SecurityView.tsx", "components/sim/IntegrationView.tsx"];
    const noReserve = views.filter((f) => !/Reserve/.test(code(f)) || !/inert=\{!/.test(code(f))).map((f) => f.split("/").pop());
    noReserve.length === 0 && /aria-hidden="true"/.test(code("components/sim/Reserve.tsx")) && /\.reserve-ghost\s*\{[^}]*visibility:\s*hidden/.test(css)
      ? add(G12, "PASS", "üç simülatör de boşta ve canlı aynı boyda: değişen her satır en uzun seçeneğinin yerini tutar (görünmez, erişilebilirlik ağacının dışında), kontrol satırı baştan çizilir ve inert")
      : add(G12, "FAIL", `simülatör boyu korunmuyor: ${noReserve.join(", ") || "Reserve/ghost kuralı"}`);
    const clip = ["frame", "beam-card", "show-card"].filter((c) => !new RegExp(`\\.${c}\\s*\\{[^}]*overflow:\\s*clip`).test(css));
    clip.length === 0 ? add(G12, "PASS", "medya çerçevesi ve onu taşıyan kartlar overflow: clip kullanır (kaydırma kapsayıcısı sağdan sola sayfada resim yakınlaştırmasını yerleşim kayması saydırıyordu)") : add(G12, "FAIL", `overflow: clip eksik: ${clip.join(", ")}`);
    /<Reserve live/.test(read("components/sim/QueueView.tsx")) && /key=\{state\.status\}/.test(read("components/sim/QueueView.tsx")) && /key=\{state\.status\}/.test(read("components/sim/SecurityView.tsx"))
      ? add(G12, "PASS", "canlı satırlar metin değiştirmez, yeni öğe olur (sağdan sola Chrome büyüyen metni yerleşim kayması sayıyordu); canlı bölge kalıcı sarmalayıcıdadır")
      : add(G12, "FAIL", "canlı durum satırları key ile yeni öğe olmuyor ya da canlı bölge sarmalayıcıda değil");

    // 5) kurumsal kanıt: bağımlılıksız referans, ortak kod, belgeler, testler
    const archFiles = fs.readdirSync(abs("lib/arch")).filter((f) => f.endsWith(".ts"));
    const external = archFiles.flatMap((f) => [...stripComments(read(`lib/arch/${f}`)).matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]).filter((spec) => !spec.startsWith("./")).map((spec) => `${f}: ${spec}`));
    external.length === 0 ? add(G12, "PASS", "lib/arch bağımlılıksızdır (yalnızca kendi dosyaları ve Web Crypto): Node'da, sunucuda ve tarayıcıda aynı kod çalışır") : add(G12, "FAIL", `lib/arch dış içe aktarma yapıyor: ${external.join("; ")}`);
    const sec = code("components/sim/SecurityFlowSim.tsx");
    /from '@\/lib\/arch\/envelope'/.test(sec) && !/crypto\.subtle\.(sign|importKey|encrypt|decrypt|generateKey)/.test(sec)
      ? add(G12, "PASS", "güvenlik akışı simülatörü kendi kriptosunu yazmaz: testle doğrulanan lib/arch/envelope çağrılır")
      : add(G12, "FAIL", "SecurityFlowSim hâlâ kendi Web Crypto çağrılarını yazıyor");
    /mapEvent|TARGETS/.test(code("components/sim/IntegrationView.tsx")) && /TARGETS/.test(code("lib/arch/mappers.ts"))
      ? add(G12, "PASS", "entegrasyon modeli eşlemeyi referans eşleyicilerden hesaplar (belge, sayfa ve testler aynı tabloyu okur)")
      : add(G12, "FAIL", "entegrasyon modeli lib/arch/mappers kullanmıyor");
    const t = spawnSync(process.execPath, ["scripts/arch-verify.mjs"], { cwd: ROOT, encoding: "utf8" });
    const passed = Number((/ℹ pass (\d+)/.exec(t.stdout || "") ?? [])[1] ?? 0);
    const failedTests = Number((/ℹ fail (\d+)/.exec(t.stdout || "") ?? [])[1] ?? 1);
    t.status === 0 && passed >= 60 && failedTests === 0 ? add(G12, "PASS", `sözleşme testleri geçti (npm run arch:verify): ${passed} test; kuyruk senaryolarında kayıp 0, tekrar etkisi 0, sıra korunur; belgeler kodla aynı`) : add(G12, "FAIL", "npm run arch:verify başarısız", `${(t.stdout || "").split("\n").filter((l) => /✖|fail/.test(l)).slice(0, 6).join("\n")}\n${(t.stderr || "").slice(0, 400)}`);
    const en = readJSON("messages/en.json");
    const integ = en.Sim?.integration;
    integ && /\{count\}/.test(integ.status) && /\{object\}/.test(integ.status) && /\{field\}/.test(integ.status) && /no partnership, certification or conformance is implied/.test(integ.caption) && /not generated from, or validated against, a vendor system/.test(integ.caption)
      ? add(G12, "PASS", "entegrasyon modeli altyazısı örnek şekil olduğunu, satıcı sisteminden üretilmediğini/doğrulanmadığını ve ortaklık/sertifika/uyum ima etmediğini söyler; durum cümlesi üç yer tutucu taşır")
      : add(G12, "FAIL", "Sim.integration altyazısı ya da durum cümlesi eksik");
    const readme = read("docs/architecture/README.md");
    ["Implemented in this repository", "Reference implementation, verified by tests", "Not claimed"].every((p) => readme.includes(p)) && /No uptime, availability, throughput, latency, delivery rate or SLA is stated/.test(readme)
      ? add(G12, "PASS", "docs/architecture üç kanıt katmanını ayırır (depoda uygulanan, testle doğrulanan referans, iddia edilmeyen) ve uptime/SLA/uyum/satıcı sertifikası iddia etmez")
      : add(G12, "FAIL", "docs/architecture/README.md katmanları ya da 'Not claimed' bölümünü taşımıyor");

    // 6) QA: betikler ve bütçe
    const pkg = readJSON("package.json");
    ["arch:verify", "arch:examples", "qa:browser", "qa:browser:quick", "perf:gate", "flags:check"].every((n) => pkg.scripts?.[n]) && pkg.devDependencies?.["puppeteer-core"] && !pkg.dependencies?.["puppeteer-core"]
      ? add(G12, "PASS", "arch:verify, arch:examples, qa:browser, perf:gate, flags:check betikleri var; puppeteer-core yalnızca devDependency (tarayıcı indirmez, üretim paketine girmez)")
      : add(G12, "FAIL", "package.json betikleri ya da puppeteer-core devDependency eksik");
    const budget = readJSON("scripts/perf-budget.json");
    ["mobile", "desktop"].every((p) => ["dom", "layoutMs", "taskMs", "cls", "fcpMs"].every((k) => typeof budget[p]?.[k] === "number"))
      ? add(G12, "PASS", "perf bütçesi (mobil ve masaüstü) DOM, yerleşim, görev süresi, CLS ve ilk boyama için sayı taşır; npm run perf:gate -- --baseline eski yapıyla A/B kıyaslar")
      : add(G12, "FAIL", "scripts/perf-budget.json eksik bütçe");
  }
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
