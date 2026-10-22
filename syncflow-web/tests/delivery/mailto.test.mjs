// Unit tests of the mail-link encoder (lib/mailto.ts, docs/adr/0035-sales-ready-release.md): every mailto: link of the site is built by it, among them the
// free site audit request in the hero and the footer.
//   npm run delivery:verify
// What must hold (RFC 6068): subject and body are percent-encoded UTF-8, a line break of the body is %0D%0A (never a bare %0A or %0D), nothing in a subject
// can start a second header, and no character of the text can change the shape of the link.
import assert from 'node:assert/strict';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

// scripts/delivery-verify.mjs compiles lib/mailto.ts into a temporary folder (DELIVERY_LIB), so this runs on Node 20.19 too; started by hand on Node 22.18
// or newer, the TypeScript source is loaded as it is.
const load = (name) => import(process.env.DELIVERY_LIB ? pathToFileURL(`${process.env.DELIVERY_LIB}/${name}.js`).href : new URL(`../../lib/${name}.ts`, import.meta.url).href);
const { AUDIT_BODY, AUDIT_SUBJECT, buildMailto } = await load('mailto');

const ADDRESS = 'contact@syncflow.example';
const query = (href) => new URL(href).searchParams;

test('the free site audit request: the exact href (subject and body percent-encoded, line breaks %0D%0A)', () => {
  assert.equal(
    buildMailto(ADDRESS, AUDIT_SUBJECT, AUDIT_BODY),
    'mailto:contact@syncflow.example?subject=Free%20site%20audit%20request&body=Website%20URL%3A%0D%0A%0D%0AWhat%20matters%20most%20%28speed%20%2F%20SEO%20%2F%20mobile%20%2F%20redesign%29%3A%0D%0A',
  );
});

test('the audit request says what the owner decided, word for word', () => {
  assert.equal(AUDIT_SUBJECT, 'Free site audit request');
  assert.equal(AUDIT_BODY, 'Website URL:\n\nWhat matters most (speed / SEO / mobile / redesign):\n');
});

test('a URL parser reads the audit link back as the same subject and the same body, with CRLF line breaks', () => {
  const href = buildMailto(ADDRESS, AUDIT_SUBJECT, AUDIT_BODY);
  const url = new URL(href);
  assert.equal(url.protocol, 'mailto:');
  assert.equal(decodeURIComponent(url.pathname), ADDRESS);
  assert.deepEqual([...url.searchParams.keys()], ['subject', 'body']);
  assert.equal(url.searchParams.get('subject'), AUDIT_SUBJECT);
  assert.equal(url.searchParams.get('body'), AUDIT_BODY.replace(/\n/g, '\r\n'));
});

test('every line break of the body is %0D%0A; a bare %0A or %0D never appears; nothing raw is left in the link', () => {
  const href = buildMailto(ADDRESS, AUDIT_SUBJECT, AUDIT_BODY);
  assert.equal((href.match(/%0D%0A/g) ?? []).length, 3, 'the body has three line breaks');
  assert.equal(/(?<!%0D)%0A/.test(href), false, 'a %0A without its %0D');
  assert.equal(/%0D(?!%0A)/.test(href), false, 'a %0D without its %0A');
  assert.equal(/[\s"<>\\^`{|}]/.test(href), false, 'a raw space, line break or unsafe character');
  assert.equal((href.match(/\?/g) ?? []).length, 1, 'one query');
  assert.equal((href.match(/&/g) ?? []).length, 1, 'one separator between subject and body');
});

test('any kind of line break in the source text (LF, CR, CRLF) becomes the same %0D%0A', () => {
  const href = buildMailto(ADDRESS, undefined, 'a\nb\r\nc\rd');
  assert.equal(href, 'mailto:contact@syncflow.example?body=a%0D%0Ab%0D%0Ac%0D%0Ad');
  assert.equal(query(href).get('body'), 'a\r\nb\r\nc\r\nd');
});

test('characters that could change the link survive a round trip: & # ? % = + / and letters outside ASCII', () => {
  const subject = 'Q&A #1: 100% = 50+50 ? / ş İ ğ ü';
  const body = 'a&b=c#d?e%f+g\nİstanbul şehri';
  const href = buildMailto(ADDRESS, subject, body);
  assert.equal(query(href).get('subject'), subject);
  assert.equal(query(href).get('body'), body.replace(/\n/g, '\r\n'));
  assert.equal((href.match(/&/g) ?? []).length, 1, 'only the separator is a raw &');
  assert.equal(href.includes('#'), false);
  assert.equal((href.match(/\?/g) ?? []).length, 1);
  assert.ok(href.includes('%C5%9F'), 'ş is percent-encoded as UTF-8');
  assert.ok(href.includes('%C4%B0'), 'İ is percent-encoded as UTF-8');
  assert.ok(href.includes('%2B'), '+ is encoded, or a parser would read it as a space');
});

test('the five characters encodeURIComponent leaves bare ( ! \' ( ) * ) are encoded too', () => {
  assert.equal(buildMailto(ADDRESS, "!'()*"), 'mailto:contact@syncflow.example?subject=%21%27%28%29%2A');
});

test('a subject is one line: a line break in it cannot start a second header', () => {
  const href = buildMailto(ADDRESS, 'Hello\r\nBcc: someone@else.example');
  assert.equal(query(href).get('subject'), 'Hello Bcc: someone@else.example');
  assert.equal(/%0D|%0A/.test(href), false);
});

test('a plain address is kept as written; one that carries ? & # % = cannot change the shape of the link', () => {
  assert.equal(buildMailto('first.last+tag@mail.example.co'), 'mailto:first.last+tag@mail.example.co');
  const odd = 'a?b&c#d%e=f@x.example';
  const href = buildMailto(odd, 'Hi');
  assert.equal(href, 'mailto:a%3Fb%26c%23d%25e%3Df@x.example?subject=Hi');
  assert.equal(decodeURIComponent(new URL(href).pathname), odd);
});

test('no subject and no body: a bare link; only a subject: no body parameter', () => {
  assert.equal(buildMailto(ADDRESS), 'mailto:contact@syncflow.example');
  assert.equal(buildMailto(ADDRESS, 'Hi'), 'mailto:contact@syncflow.example?subject=Hi');
  assert.equal(buildMailto(ADDRESS, '', ''), 'mailto:contact@syncflow.example');
});
