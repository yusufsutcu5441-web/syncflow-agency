#!/usr/bin/env node
/**
 * Translation guard. Runs before every build (npm run check / CI).
 *
 * Errors (exit 1):
 *   - invalid JSON, missing or extra keys compared with messages/en.json
 *   - ICU placeholders ({price}) or rich-text tags (<dim>) that differ from English for the same key
 *   - empty strings
 *   - a straight apostrophe ('): ICU treats it as an escape character in some positions, use ’ instead
 * Warnings:
 *   - a value identical to English (possibly untranslated), except brand names and technical terms
 *   - [BRACKETED] launch placeholders still present (legal pages). --strict turns these into errors.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'messages');
const strict = process.argv.includes('--strict');

const SOURCE = 'en';
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
const locales = files.map((f) => f.replace(/\.json$/, ''));
/**
 * Draft languages (docs/adr/0006, 0018, 0035): dormant, not public. The public languages are the ones in NEXT_PUBLIC_LAUNCHED_LOCALES (the same
 * default as i18n/launch.ts: "en,tr"); they must carry every key. Every other file is a draft: a key it lacks falls back to the English text
 * (lib/merge-messages.ts), and the lag is only counted here. A draft may not add keys, and a translation it does carry must keep its
 * placeholders and tags.
 */
const LAUNCHED = (process.env.NEXT_PUBLIC_LAUNCHED_LOCALES ?? 'en,tr')
  .split(',')
  .map((code) => code.trim())
  .filter(Boolean);
const DRAFT = new Set(locales.filter((locale) => locale !== SOURCE && !LAUNCHED.includes(locale)));
const PUBLIC = locales.filter((locale) => !DRAFT.has(locale));

/** Same in every language on purpose. Compared after trimming. */
const SAME_OK = new Set([
  'syncflow.agency',
  'SEO',
  'Briefing',
  'Studio',
  'Türkiye',
  'Performance',
  'Concept',
  'Lenis',
  'Form',
  'LinkedIn',
  'Instagram',
  'WhatsApp',
  'Dubai',
  'Berlin',
  'Paris',
  'Madrid',
  'London',
  'Tokyo',
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  '7',
  '⌘K',
  'hreflang · RTL-native · CJK typography · Locale-aware formatting',
  'H.264 · VP9 · Loads on demand · Space reserved, no layout shift',
  'CLS · LCP · TBT · measured, dated and sourced',
  'Salesforce · SAP · HubSpot · Oracle',
  'Lenis smooth scroll · requestAnimationFrame · GPU-composited transforms',
  '$5k – $10k',
  '$10k – $20k',
  '$20k +',
  '{tool}, {profile}, {date}.',
  // Cognates and brand terms that are the same in more than one language.
  '03 — Studio',
  'Client',
  'Signature',
  'mobile',
  'Showcase',
  '02 — Showcase',
  'Strategic Briefing',
  'Architecture',
  '01 — Architecture',
  'Istanbul',
  'Name',
  'Flexible',
  'Legal',
  'Cookies',
  'Contact',
]);

const verbose = process.argv.includes('--verbose');
const errors = [];
const warnings = [];
/** Keys a dormant draft language does not carry yet (they fall back to English), per language. */
const lagging = new Map();
/** Launch placeholders are expected until the legal pages are filled in: counted, not listed one by one. */
const placeholderKeys = new Map();

function load(locale) {
  try {
    return JSON.parse(readFileSync(join(dir, `${locale}.json`), 'utf8'));
  } catch (error) {
    errors.push(`${locale}.json: invalid JSON (${error.message})`);
    return null;
  }
}

function flatten(node, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') flatten(value, path, out);
    else out[path] = value;
  }
  return out;
}

const tokens = (text) => ({
  placeholders: [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(','),
  tags: [...text.matchAll(/<\/?(\w+)>/g)].map((m) => m[1]).sort().join(','),
});

const en = load(SOURCE);
if (!en) {
  console.error(errors.join('\n'));
  process.exit(1);
}
const enFlat = flatten(en);

for (const locale of locales) {
  const data = locale === SOURCE ? en : load(locale);
  if (!data) continue;
  const flat = flatten(data);

  for (const key of Object.keys(enFlat)) {
    if (DRAFT.has(locale) && key.startsWith('Legal.')) continue;
    if (!(key in flat)) {
      if (DRAFT.has(locale)) lagging.set(locale, (lagging.get(locale) ?? 0) + 1);
      else errors.push(`${locale}: missing key ${key}`);
    }
  }
  for (const key of Object.keys(flat)) {
    if (!(key in enFlat)) errors.push(`${locale}: extra key ${key}`);
  }

  for (const [key, value] of Object.entries(flat)) {
    if (typeof value !== 'string' || value.trim() === '') {
      errors.push(`${locale}: ${key} is empty or not a string`);
      continue;
    }
    if (value.includes("'")) errors.push(`${locale}: ${key} contains a straight apostrophe, use ’ (ICU escape risk)`);

    const source = enFlat[key];
    if (typeof source === 'string') {
      const a = tokens(source);
      const b = tokens(value);
      if (a.placeholders !== b.placeholders) errors.push(`${locale}: ${key} placeholders differ (en: {${a.placeholders}} vs {${b.placeholders}})`);
      if (a.tags !== b.tags) errors.push(`${locale}: ${key} rich-text tags differ (en: <${a.tags}> vs <${b.tags}>)`);

      if (locale !== SOURCE && value.trim() === source.trim() && !SAME_OK.has(value.trim()) && !/^\[.*\]$/.test(value.trim())) {
        warnings.push(`${locale}: ${key} is identical to English: "${value}"`);
      }
    }

    const brackets = value.match(/\[[^\]]+\]/g);
    if (brackets && key.startsWith('Legal.')) {
      const message = `${locale}: ${key} still has launch placeholders ${brackets.join(' ')}`;
      if (strict) errors.push(message);
      else placeholderKeys.set(message, locale);
    }
  }
}

const total = Object.keys(enFlat).length;
console.log(`messages: ${locales.length} locales (${locales.join(', ')}), ${total} keys in each public language (${PUBLIC.join(', ')})`);
if (lagging.size) console.log(`  draft languages lag behind English (fall back to it, not public): ${[...lagging].map(([l, n]) => `${l} ${n}`).join(', ')} keys`);
for (const w of warnings) console.log(`  warn  ${w}`);
if (verbose) for (const m of placeholderKeys.keys()) console.log(`  todo  ${m}`);
for (const e of errors) console.log(`  ERROR ${e}`);

if (errors.length) {
  console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exit(1);
}
const todo = placeholderKeys.size;
console.log(`\nOK: key trees of the public languages (${PUBLIC.join(', ')}) match English, drafts add no keys, placeholders and tags match everywhere. ${warnings.length} warning(s).`);
if (todo) console.log(`TODO before the briefing form is switched on: ${todo} strings of the long legal draft still contain [BRACKETED] placeholders. The draft is shown only while the form is on (docs/adr/0035); the short notices that ship by default have none (list them with --verbose; --strict fails on them).`);
