// Tests of /outbound's copy and facts (lib/outbound.ts, docs/adr/0036-outbound-route.md).
//   npm run delivery:verify
// What must hold: the replay figures are one dated record and the terminal prints exactly that record; the page says nothing the owner's own rules forbid
// ("100 %", a guarantee, "zero human intervention", a deliverability promise, a score without a date, the old agency wording); every number printed is one of
// the recorded ones; and the call to action is a well-formed review request.
import assert from 'node:assert/strict';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

const load = (name) => import(process.env.DELIVERY_LIB ? pathToFileURL(`${process.env.DELIVERY_LIB}/${name}.js`).href : new URL(`../../lib/${name}.ts`, import.meta.url).href);
const { allCopy, ARCHITECTURE, HERO, OUTBOUND_PATH, REPLAY_FACTS: F, TERMINAL, TERMINAL_LINES } = await load('outbound');
const { buildMailto, REVIEW_BODY, REVIEW_SUBJECT } = await load('mailto');

test('the replay figures are one dated record, and the arithmetic holds', () => {
  assert.match(F.asOf, /^\d{4}-\d{2}-\d{2}$/);
  const [y, m, d] = F.asOf.split('-');
  assert.equal(F.asOfLabel, `${d}.${m}.${y}`, 'the printed date is the recorded date');
  assert.equal(F.bounceRatePct, Math.round((F.bounced / F.mailsSent) * 1000) / 10, 'bounced / mails sent, one decimal');
  assert.ok(F.peopleContacted <= F.mailsSent, 'nobody can have been mailed fewer times than there are people');
  assert.ok(F.source.length > 20, 'a source is named');
});

test('the terminal prints exactly the recorded figures, and says it is a replay of a dated snapshot, not a live feed', () => {
  const delivery = TERMINAL_LINES.find((line) => line.text.startsWith('delivery to date'));
  assert.ok(delivery);
  assert.equal(delivery.text, `delivery to date: ${F.mailsSent} mails to ${F.peopleContacted} people · ${F.bounced} bounced (${F.bounceRatePct}%) · ${F.complaints} complaints`);
  assert.ok(TERMINAL_LINES.some((line) => line.text.startsWith(`${F.queued} e-mails approved and queued by a person`)));
  assert.match(TERMINAL.tag, /REPLAY/);
  assert.match(TERMINAL.tag, /NOT A LIVE FEED/);
  assert.ok(TERMINAL.tag.includes(F.asOfLabel));
  assert.ok(TERMINAL.foot.includes(F.asOfLabel) && TERMINAL.foot.includes('test mails are not counted'));
  assert.equal(TERMINAL_LINES[0].kind, 'cmd');
  assert.match(TERMINAL_LINES.at(-1).text, /no result is promised/, 'the figures are delivery figures: the last line says no result is promised');
});

test('nothing the owner refused is on the page: no "100 %", no guarantee, no "zero human", no deliverability promise, no undated score, no agency wording', () => {
  const banned = [
    [/100\s*%/, '100 %'],
    [/guarante/i, 'guarantee'],
    [/zero[- ]human|no human|without (?:any )?human|hands-free|human[- ]free/i, 'no human involved'],
    [/\bdeliverability\b/i, 'deliverability'],
    [/\b9\.9\b/, 'the mail-tester score (no date, no link)'],
    [/books? meetings?|24\s*\/\s*7/i, 'books meetings 24/7'],
    [/\bagency\b/i, 'agency'],
    [/flawless|bulletproof|unbreakable|impenetrable|foolproof|risk[- ]free/i, 'absolute adjective'],
    [/\bROI\b|revenue|pipeline value|more (?:leads|deals|sales|customers)/i, 'a result promise'],
  ];
  for (const text of allCopy()) for (const [pattern, name] of banned) assert.doesNotMatch(text, pattern, `"${text}" says: ${name}`);
});

test('the page keeps saying that a person is in the loop and that nothing is promised', () => {
  const all = allCopy().join('\n');
  assert.match(all, /approves each batch of first mails/);
  assert.match(all, /does not promise inbox placement or replies/);
  assert.match(all, /not a live feed/i);
});

test('every number on the page is a recorded one', () => {
  const allowed = new Set([
    ...[F.queued, F.mailsSent, F.peopleContacted, F.bounced, F.bounceRatePct, F.complaints].map(String),
    F.businessHours,
    F.asOfLabel,
    '1-150', // the audience's headcount band
    '200', // "200 OK"
    '01', '02', '03', // the three step labels
  ]);
  for (const text of allCopy()) {
    // B2B and PM2 carry a digit in their name; the figure is not a number.
    const stripped = text.replace(/\b[A-Za-z]+\d+[A-Za-z]*\b/g, '');
    for (const token of stripped.match(/\d+(?:[.:,-]\d+)*/g) ?? []) assert.ok(allowed.has(token), `"${token}" in "${text}" is not a recorded figure (add it to REPLAY_FACTS with a date, or remove it)`);
  }
});

test('the emphasised words are really in the lead, the three steps are complete and nothing is empty', () => {
  for (const word of HERO.leadStrong) assert.ok(HERO.lead.includes(word), word);
  assert.equal(ARCHITECTURE.steps.length, 3);
  for (const step of ARCHITECTURE.steps) assert.ok(step.n && step.title && step.body && step.stack && step.points.length === 3, step.title);
  for (const text of allCopy()) assert.ok(text.trim().length > 0);
  assert.equal(OUTBOUND_PATH, '/outbound');
});

test('the review request is a well-formed mailto: English subject, prompts in the body, line breaks %0D%0A', () => {
  assert.equal(REVIEW_SUBJECT, 'Architecture review request');
  const href = buildMailto('contact@syncflow.example', REVIEW_SUBJECT, REVIEW_BODY);
  assert.ok(href.startsWith('mailto:contact@syncflow.example?subject=Architecture%20review%20request&body='));
  const query = new URL(href).searchParams;
  assert.equal(query.get('subject'), REVIEW_SUBJECT);
  assert.equal(query.get('body'), REVIEW_BODY.replace(/\n/g, '\r\n'));
  assert.doesNotMatch(href, /%0A(?<!%0D%0A)/, 'no bare line feed');
  assert.match(REVIEW_BODY, /Who you sell to:/);
});
