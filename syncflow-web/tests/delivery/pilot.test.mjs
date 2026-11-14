// Tests of /pilot's copy and facts (lib/pilot.ts, docs/adr/0037-pilot-page.md).
//   npm run delivery:verify
// What must hold: the page states the offer of the cold e-mail in the e-mail's own words and with its own figures (30 days, nothing upfront, 3 qualified conversations,
// a one-time setup fee of 2,500 and 500 a month, month to month), prints no other amount, and invents no proof (no client, no result, no testimonial, no guarantee).
import assert from 'node:assert/strict';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

const load = (name) => import(process.env.DELIVERY_LIB ? pathToFileURL(`${process.env.DELIVERY_LIB}/${name}.js`).href : new URL(`../../lib/${name}.ts`, import.meta.url).href);
const { allCopy, isPilotLocale, PILOT_FACTS: F, PILOT_LOCALES, PILOT_PATH, pilotCopy, usd } = await load('pilot');
const { buildMailto, PILOT_BODY, PILOT_SUBJECT } = await load('mailto');

test('the figures are the e-mail\'s figures: 30 days, 3 qualified conversations, a one-time setup fee of 2,500, then 500 a month', () => {
  assert.deepEqual({ ...F }, { days: 30, conversations: 3, setupUsd: 2500, monthlyUsd: 500 });
  assert.equal(PILOT_PATH, '/pilot');
  assert.deepEqual([...PILOT_LOCALES], ['en', 'tr']);
  assert.equal(isPilotLocale('en') && isPilotLocale('tr'), true);
  for (const other of ['de', 'fr', 'es', 'ar', 'zh', 'ja', '']) assert.equal(isPilotLocale(other), false, `${other || '(empty)'} has no pilot page`);
  assert.equal(usd('en', F.setupUsd), '$2,500');
  assert.equal(usd('en', F.monthlyUsd), '$500');
  assert.equal(usd('tr', F.setupUsd), '$2.500', 'the Turkish page writes the number in Turkish format');
});

test('the English page says what the e-mail says, sentence by sentence (the pilot-no-brainer step-1 text of the outbound engine)', () => {
  const all = allCopy('en').join('\n');
  for (const sentence of [
    'I build and run outbound for B2B founders. I would like to run it for your company for 30 days with nothing to pay upfront. If the pilot does not produce 3 qualified conversations, you pay nothing at all: no invoice, no fee, no minimum.',
    'Only if it does, a one-time setup fee of $2,500 is invoiced and $500 a month begins, month to month.',
    'A qualified conversation is written down before we start: a named person at a company that fits the profile we agree on, who replies asking to talk or asking for details about your offer.',
    'I am paid on those, not on closed deals, because closing is your craft.',
    'This is a promise about when you pay, not about what will happen: I cannot promise anyone will answer. Everything is written and asynchronous, no discovery calls.',
    'Write “pilot” and I will send them. Write “stop” and I will not write again.',
  ]) assert.ok(all.includes(sentence), `missing: ${sentence}`);
});

test('no amount other than the offer\'s own is printed, in either language', () => {
  for (const locale of PILOT_LOCALES) {
    const amounts = new Set(allCopy(locale).join('\n').match(/\$\s?[\d.,]+/g) ?? []);
    const allowed = new Set([usd(locale, 0), usd(locale, F.setupUsd), usd(locale, F.monthlyUsd)]);
    for (const amount of amounts) assert.ok(allowed.has(amount.trim()), `${locale}: unexpected amount ${amount}`);
    assert.ok(amounts.has(usd(locale, F.setupUsd)) && amounts.has(usd(locale, F.monthlyUsd)), `${locale}: both fees are on the page`);
  }
});

test('the Turkish page carries the same terms: the same figures, the same three conditions, "nothing upfront", "3 qualified conversations"', () => {
  const tr = allCopy('tr').join('\n');
  assert.match(tr, /30 gün/);
  assert.match(tr, /3 nitelikli konuşma/);
  assert.match(tr, /\$2\.500/);
  assert.match(tr, /\$500/);
  assert.match(tr, /fatura yok, ücret yok, asgari tutar yok/);
  assert.match(tr, /aydan aya/);
  assert.match(tr, /nitelikli konuşma/);
  assert.equal(pilotCopy('tr').terms.cards.length, pilotCopy('en').terms.cards.length, 'the same number of conditions in both languages');
  assert.equal(pilotCopy('tr').hero.facts.length, pilotCopy('en').hero.facts.length);
});

test('nothing invented: no proof, no client, no result, no guarantee, no risk-free claim, in either language', () => {
  const banned = [
    [/guarante|garanti/i, 'a guarantee'],
    [/risk[- ]free|risksiz/i, 'risk-free'],
    [/100\s*%/, '100 %'],
    [/\bROI\b|revenue|pipeline value|more (?:leads|deals|sales|customers)/i, 'a result promise'],
    [/trusted by|testimonial/i, 'social proof'],
    [/\bour (?:clients|customers)\b|müşterilerimiz|referanslarımız/i, 'clients we do not have'],
    [/\b\d+\+? (?:clients|customers|companies|pilots|founders)\b/i, 'a number of clients or pilots'],
    [/\b(?:soc ?2|iso ?27001|gdpr[- ]compliant|compliant|99\.9)/i, 'a certificate or uptime claim'],
    [/books? meetings?|24\s*\/\s*7/i, 'books meetings 24/7'],
  ];
  for (const locale of PILOT_LOCALES) for (const text of allCopy(locale)) for (const [pattern, name] of banned) assert.doesNotMatch(text, pattern, `${locale}: "${text}" says: ${name}`);
});

test('the page says outright that there is no client result to show yet (owner, 14.11.2026: no real client exists, and this stays honest)', () => {
  const en = pilotCopy('en').stands.body;
  assert.match(en, /no client results to show yet/);
  assert.match(en, /no case studies, client names, logos or quotes/);
  assert.match(en, /you carry no cost unless the pilot delivers/);
  const tr = pilotCopy('tr').stands.body;
  assert.match(tr, /gösterebileceğim bir müşteri sonucu yok/);
  assert.match(tr, /vaka çalışması, müşteri adı, logo ya da alıntı yok/);
});

test('the highlighted phrases of the lead exist in the lead, and every figure of the fact strip is one of the offer\'s', () => {
  for (const locale of PILOT_LOCALES) {
    const c = pilotCopy(locale);
    for (const word of c.hero.leadStrong) assert.ok(c.hero.lead.includes(word), `${locale}: "${word}" is not in the lead`);
    const strip = c.hero.facts.map((f) => f.value).join(' ');
    assert.ok(strip.includes(usd(locale, F.setupUsd)) && strip.includes(usd(locale, F.monthlyUsd)), `${locale}: the strip shows both fees`);
    assert.ok(strip.includes(usd(locale, 0)), `${locale}: the strip shows the zero upfront`);
  }
});

test('the call to action is a well-formed mail to the one configured address: the one-word subject the e-mail asks for, two plain prompts', () => {
  assert.equal(PILOT_SUBJECT, 'pilot');
  const href = buildMailto('contact@example.test', PILOT_SUBJECT, PILOT_BODY);
  assert.match(href, /^mailto:contact@example\.test\?subject=pilot&body=/);
  assert.ok(href.includes('Company%3A%0D%0A%0D%0AWebsite%3A%0D%0A'), 'every line break is %0D%0A (RFC 6068)');
  assert.doesNotMatch(href, /(?<!%0D)%0A/, 'no bare %0A');
});
