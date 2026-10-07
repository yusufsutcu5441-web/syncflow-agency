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

/** Same in every language on purpose. Compared after trimming. */
const SAME_OK = new Set([
  'SyncFlow',
  'Next.js',
  'Remotion',
  'Lemon Squeezy',
  'Stack',
  'Retainer',
  'FAQ',
  'Design',
  'Brief',
  'Briefing',
  'Checkout',
  'Next.js + Remotion',
  'EN · TR',
  'Privacy',
  'Contact',
  'Architecture',
  'Architektur',
  // Correct in more than one language (loan words, international terms, section numbering).
  'SyncFlow Standard', // product name, identical to the Lemon Squeezy checkout
  'Launch',
  'Name',
  'Cookies',
  'Server Components',
  '04 — FAQ',
  '05 — Contact',
]);

const verbose = process.argv.includes('--verbose');
const errors = [];
const warnings = [];
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
    if (!(key in flat)) errors.push(`${locale}: missing key ${key}`);
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
console.log(`messages: ${locales.length} locales (${locales.join(', ')}), ${total} keys each`);
for (const w of warnings) console.log(`  warn  ${w}`);
if (verbose) for (const m of placeholderKeys.keys()) console.log(`  todo  ${m}`);
for (const e of errors) console.log(`  ERROR ${e}`);

if (errors.length) {
  console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exit(1);
}
const todo = placeholderKeys.size;
console.log(`\nOK: key trees, placeholders and tags match in every locale. ${warnings.length} warning(s).`);
if (todo) console.log(`TODO before launch: ${todo} legal strings still contain [BRACKETED] placeholders (list them with --verbose; --strict fails on them).`);
