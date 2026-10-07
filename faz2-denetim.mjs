#!/usr/bin/env node
/**
 * SyncFlow Faz 2 denetimi: bağımlılıklar, tasarım tokenları, next-intl TR/EN iskeleti.
 * Kullanım (proje kökünden):   node faz2-denetim.mjs [--root yol] [--build] [--json]
 *   --build  `npm run build` çalıştırır (production build)    --json  faz2-denetim.json yazar
 * Hiçbir dosyayı değiştirmez; yalnızca okur ve raporlar. Çıkış kodu: FAIL varsa 1.
 */
/* eslint-disable @typescript-eslint/no-unused-expressions -- kompakt raporlama biçimi: sonuçlar üçlü ifade deyimleriyle eklenir */
import fs from "node:fs";
import path from "node:path";
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
  const req = { "#0D0D0E": "obsidian zemin", "#141416": "katman 1", "#1A1A1E": "katman 2", "#E2E2E6": "platin", "#D4C5A9": "şampanya" };
  for (const [hex, name] of Object.entries(req)) low.includes(hex.toLowerCase()) ? add(G2, "PASS", `${hex} ${name}`) : add(G2, "FAIL", `${hex} ${name} tanımlı değil`);
  /rgb\(\s*255\s+255\s+255\s*\/\s*0?\.06\s*\)|#ffffff0f|rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0?\.06\s*\)/i.test(c)
    ? add(G2, "PASS", "hairline çizgi %6 beyaz") : add(G2, "FAIL", "hairline rgb(255 255 255 / 0.06) tanımlı değil");
  /-0?\.02em/.test(c) ? add(G2, "PASS", "display tracking -0.02em") : add(G2, "FAIL", "-0.02em tracking tanımı yok");
  const bad = [
    [/-0?\.045em|-0?\.04em/g, "eski sıkı tracking (-0.04/-0.045em); display için -0.02em olmalı", "FAIL"],
    [/#ffffff1a|rgb\(\s*255\s+255\s+255\s*\/\s*0?\.1\s*\)/gi, "%10 beyaz çizgi (#ffffff1a); %6 olmalı", "FAIL"],
    [/#000(?:000)?(?![0-9a-f])/gi, "saf siyah (#000/#000000) yasak", "FAIL"],
    [/font-weight\s*:\s*(?:100|200|300|600|700|800|900)\b/g, "400-500 dışında ağırlık", "WARN"],
    [/text-transform\s*:\s*uppercase/g, "arayüzde büyük harf dönüşümü yasak", "WARN"],
    [/font-style\s*:\s*italic/g, "italik yasak", "WARN"],
    [/backdrop-filter/g, "backdrop-filter mobilde pahalı", "WARN"],
    [/border-radius\s*:\s*(?:[5-9]|\d{2,})\s*px/g, "köşe yarıçapı 4 px üstünde", "WARN"],
    [/\b(?:turquoise|aqua|cyan|teal|navy)\b|#(?:00ffff|40e0d0|2dd4bf|14b8a6|06b6d4)\b/gi, "turkuaz/lacivert tonu", "FAIL"],
  ];
  let clean = true;
  for (const [re, msg, lvl] of bad) { const m = c.match(re); if (m) { clean = false; add(G2, lvl, `${msg}: ${[...new Set(m)].slice(0, 4).join(", ")}`); } }
  if (clean) add(G2, "PASS", "yasaklı değer bulunmadı");
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
  else { const extra = locs.filter((l) => !["tr", "en"].includes(l));
    (locs.includes("tr") && locs.includes("en")) ? add(G3, extra.length ? "WARN" : "PASS", `locales: ${locs.join(", ")}` + (extra.length ? ` (lansman yalnızca tr+en; ${extra.join(", ")} hukuk/çeviri incelemesine kadar kapalı kalmalı)` : ""))
      : add(G3, "FAIL", `locales: ${locs.join(", ")} (tr ve en gerekli)`); }
  /defaultLocale/.test(t) ? add(G3, "PASS", "defaultLocale tanımlı") : add(G3, "FAIL", "defaultLocale yok");
}
const lay = first([sub("app/[locale]/layout.tsx"), "app/[locale]/layout.tsx"]);
if (!lay) add(G3, "FAIL", "app/[locale]/layout.tsx yok");
else { const t = read(lay);
  /generateStaticParams/.test(t) ? add(G3, "PASS", "generateStaticParams var") : add(G3, "WARN", "generateStaticParams yok (statik üretim için gerekli)");
  /hasLocale|notFound/.test(t) ? add(G3, "PASS", "geçersiz locale için koruma var") : add(G3, "WARN", "geçersiz locale koruması (hasLocale/notFound) yok");
  /<html[^>]*lang=\{/.test(t) ? add(G3, "PASS", "<html lang={locale}>") : add(G3, "FAIL", "<html lang> locale'e bağlı değil");
  /\bdir=/.test(t) ? add(G3, "PASS", "dir özniteliği var (RTL hazırlığı)") : add(G3, "WARN", "dir özniteliği yok: Arapça gelecekte RTL gerektirir"); }
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
}
// koda gömülü Türkçe metin ve yasaklı sınıf taraması
const srcFiles = walk(abs(base === "." ? "app" : "src"), [".tsx", ".ts"]).concat(walk(abs("components"), [".tsx"]));
const hard = [], banned = {};
const BAN = { "büyük harf (uppercase)": /\buppercase\b/, "italik": /\bitalic\b/, "kalın/ince ağırlık": /\bfont-(?:thin|extralight|light|semibold|bold|extrabold|black)\b/,
  "büyük köşe yarıçapı": /\brounded-(?:lg|xl|2xl|3xl|full)\b/, "gölge": /\bshadow-(?:md|lg|xl|2xl)\b/, "backdrop-blur": /\bbackdrop-blur/, "tracking-tighter": /\btracking-tighter\b/,
  "renkli Tailwind paleti": /\b(?:bg|text|border|from|to|via|ring)-(?:cyan|teal|sky|blue|indigo|violet|purple|fuchsia|pink|emerald|green|lime)-\d{2,3}\b/ };
for (const f of srcFiles) {
  const lines = fs.readFileSync(f, "utf8").split("\n");
  lines.forEach((ln, i) => {
    if (/>[^<>{}]*[çğıöşüÇĞİÖŞÜ][^<>{}]*</.test(ln) && !/^\s*(\/\/|\*)/.test(ln)) hard.push(`${rel(f)}:${i + 1}`);
    for (const [name, re] of Object.entries(BAN)) if (re.test(ln)) (banned[name] ||= []).push(`${rel(f)}:${i + 1}`);
  });
}
hard.length ? add(G3, "WARN", `koda gömülü Türkçe metin (${hard.length} satır): ${hard.slice(0, 4).join(", ")}`) : add(G3, "PASS", "JSX içinde gömülü Türkçe metin bulunmadı");
for (const [n, l] of Object.entries(banned)) add("2. Tasarım tokenları (globals.css)", "WARN", `bileşenlerde ${n}: ${l.slice(0, 3).join(", ")}${l.length > 3 ? ` (+${l.length - 3})` : ""}`);

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

/* ───────── 5) Showcase filmi (docs/adr/0003) ───────── */
const G5 = "5. Showcase filmi (önceden render edilmiş)";
const filmLocales = exists("messages") ? fs.readdirSync(abs("messages")).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")) : [];
const filmMissing = [];
for (const l of filmLocales) for (const y of ["wide", "tall"]) for (const ext of ["mp4", "webm", "webp"]) {
  const p = `public/media/showcase/architecture-${l}-${y}.${ext}`;
  if (!exists(p) || fs.statSync(abs(p)).size === 0) filmMissing.push(p);
}
filmMissing.length
  ? add(G5, "FAIL", `film dosyası eksik ya da boş (${filmMissing.length}): ${filmMissing.slice(0, 3).join(", ")}${filmMissing.length > 3 ? " ..." : ""}`, "npm run film:render")
  : add(G5, "PASS", `${filmLocales.length} dil × 2 oran × (mp4, webm, webp) = ${filmLocales.length * 6} film dosyası var`);
exists("components/showcase/ShowcaseFilm.tsx") && !exists("components/remotion") ? add(G5, "PASS", "oynatıcı <video> tabanlı; components/remotion yok") : add(G5, "FAIL", "components/showcase/ShowcaseFilm.tsx yok ya da components/remotion hâlâ var");

/* ───────── 6) Build (isteğe bağlı) ───────── */
if (DO_BUILD) {
  const r = spawnSync("npm", ["run", "build"], { cwd: ROOT, shell: true, encoding: "utf8", maxBuffer: 1 << 26 });
  const tail = ((r.stdout || "") + (r.stderr || "")).trim().split("\n").slice(-12).join("\n");
  add("6. Build", r.status === 0 ? "PASS" : "FAIL", r.status === 0 ? "npm run build başarılı" : "npm run build başarısız", tail);
} else add("6. Build", "INFO", "build çalıştırılmadı (--build ile)");

/* ───────── Rapor ───────── */
results.sort((a, b) => a.group.localeCompare(b.group));
const color = process.stdout.isTTY && !process.env.NO_COLOR;
const C = { PASS: "\x1b[32m", WARN: "\x1b[33m", FAIL: "\x1b[31m", INFO: "\x1b[90m", R: "\x1b[0m" };
const sym = { PASS: "✔", WARN: "!", FAIL: "✖", INFO: "i" };
let g = ""; const cnt = { PASS: 0, WARN: 0, FAIL: 0, INFO: 0 };
console.log(`\nSyncFlow Faz 2 denetimi\nKök: ${ROOT}`);
for (const r of results) {
  if (r.group !== g) { g = r.group; console.log(`\n${g}`); }
  cnt[r.level]++;
  console.log(`  ${color ? C[r.level] : ""}${sym[r.level]}${color ? C.R : ""} ${r.msg}`);
  if (r.detail) console.log("      " + r.detail.split("\n").join("\n      "));
}
console.log(`\nÖzet: ${cnt.PASS} geçti, ${cnt.WARN} uyarı, ${cnt.FAIL} hata, ${cnt.INFO} bilgi`);
if (DO_JSON) fs.writeFileSync(abs("faz2-denetim.json"), JSON.stringify({ tarih: new Date().toISOString(), ozet: cnt, sonuclar: results }, null, 2));
process.exit(cnt.FAIL ? 1 : 0);
