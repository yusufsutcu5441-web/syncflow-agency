// Contract tests of the optional SMTP delivery (lib/server/smtp.ts, docs/adr/0027-optional-smtp-delivery.md).
//   npm run delivery:verify
// A small SMTP server on loopback (no TLS, which the module allows for loopback only) takes the place of Gmail, so the real conversation is tested:
// the login, the envelope, the headers and body that arrive, a header-injection attempt, a refused password and a refused connection.
import assert from 'node:assert/strict';
import net from 'node:net';
import test from 'node:test';
import { buildBriefingMail, sendBriefingMail, smtpSettings } from '../../lib/server/smtp.ts';

const LEAD = {
  projectType: 'platform',
  budget: 't2',
  timeline: 'w6',
  role: 'decider',
  tier: 'high',
  name: 'Jane Doe',
  company: 'Acme Holding, Chief Marketing Officer',
  email: 'jane@acme.com',
  message: 'We need the platform live before the autumn.',
  locale: 'en',
  market: 'us',
};
const LABELS = { project: 'A platform and automation', budget: '$100,000 – $250,000', timeline: 'Within six weeks', role: 'I decide', market: 'us' };
const CONTACT = 'contact@syncflow.agency';

/** A minimal SMTP server: EHLO, AUTH PLAIN / LOGIN, MAIL, RCPT, DATA, QUIT. Records what it was given. */
function fakeSmtp({ user = 'sender@syncflow.agency', password = 'secret-app-password' } = {}) {
  const received = { auth: [], from: [], to: [], messages: [] };
  const server = net.createServer((socket) => {
    let buffer = '';
    let inData = false;
    let data = '';
    let authStep = null;
    const send = (line) => socket.write(`${line}\r\n`);
    socket.on('error', () => undefined);
    send('220 fake.test ESMTP');
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      for (;;) {
        if (inData) {
          // The terminator can arrive split across two chunks, so it is looked for in everything received so far.
          data += buffer;
          buffer = '';
          const end = data.indexOf('\r\n.\r\n');
          if (end === -1) return;
          buffer = data.slice(end + 5);
          inData = false;
          received.messages.push(data.slice(0, end));
          data = '';
          send('250 2.0.0 queued');
          continue;
        }
        const newline = buffer.indexOf('\r\n');
        if (newline === -1) return;
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 2);
        if (authStep === 'plain') {
          authStep = null;
          const [, u, p] = Buffer.from(line, 'base64').toString('utf8').split('\0');
          received.auth.push([u, p]);
          send(u === user && p === password ? '235 2.7.0 accepted' : '535 5.7.8 credentials rejected');
        } else if (authStep === 'login-user') {
          received.auth.push([Buffer.from(line, 'base64').toString('utf8')]);
          authStep = 'login-pass';
          send('334 UGFzc3dvcmQ6');
        } else if (authStep === 'login-pass') {
          const u = received.auth.at(-1)[0];
          const p = Buffer.from(line, 'base64').toString('utf8');
          received.auth.at(-1).push(p);
          authStep = null;
          send(u === user && p === password ? '235 2.7.0 accepted' : '535 5.7.8 credentials rejected');
        } else if (/^EHLO|^HELO/i.test(line)) {
          socket.write('250-fake.test\r\n250-AUTH PLAIN LOGIN\r\n250 8BITMIME\r\n');
        } else if (/^AUTH PLAIN/i.test(line)) {
          const inline = line.slice('AUTH PLAIN'.length).trim();
          if (inline) {
            const [, u, p] = Buffer.from(inline, 'base64').toString('utf8').split('\0');
            received.auth.push([u, p]);
            send(u === user && p === password ? '235 2.7.0 accepted' : '535 5.7.8 credentials rejected');
          } else {
            authStep = 'plain';
            send('334 ');
          }
        } else if (/^AUTH LOGIN/i.test(line)) {
          authStep = 'login-user';
          send('334 VXNlcm5hbWU6');
        } else if (/^MAIL FROM:/i.test(line)) {
          received.from.push(line);
          send('250 2.1.0 ok');
        } else if (/^RCPT TO:/i.test(line)) {
          received.to.push(line);
          send('250 2.1.5 ok');
        } else if (/^DATA/i.test(line)) {
          inData = true;
          send('354 go ahead');
        } else if (/^QUIT/i.test(line)) {
          send('221 bye');
          socket.end();
        } else {
          send('250 ok');
        }
      }
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port, received })));
}

const settingsFor = (port, overrides = {}) =>
  smtpSettings({ SMTP_HOST: '127.0.0.1', SMTP_PORT: String(port), SMTP_SECURE: 'false', SMTP_USER: 'sender@syncflow.agency', SMTP_PASSWORD: 'secret-app-password', ...overrides }, CONTACT);

test('without a login nothing is configured, and a login alone is enough with Gmail as the default host', () => {
  assert.equal(smtpSettings({}, CONTACT), null);
  assert.equal(smtpSettings({ SMTP_USER: 'sender@syncflow.agency' }, CONTACT), null);
  assert.equal(smtpSettings({ SMTP_PASSWORD: 'x' }, CONTACT), null);
  const gmail = smtpSettings({ SMTP_USER: 'sender@syncflow.agency', SMTP_PASSWORD: 'abcd efgh ijkl mnop' }, CONTACT);
  assert.deepEqual(gmail, { host: 'smtp.gmail.com', port: 465, secure: true, user: 'sender@syncflow.agency', password: 'abcdefghijklmnop', from: 'sender@syncflow.agency', to: CONTACT });
});

test('the From address, the inbox and the port can be set, and an invalid address disables the path instead of sending somewhere wrong', () => {
  const custom = smtpSettings({ SMTP_USER: 'resend', SMTP_PASSWORD: 'key', SMTP_HOST: 'smtp.example.com', SMTP_PORT: '587', SMTP_FROM: 'briefing@syncflow.agency', BRIEFING_INBOX: 'founders@syncflow.agency' }, CONTACT);
  assert.equal(custom.port, 587);
  assert.equal(custom.secure, false);
  assert.equal(custom.from, 'briefing@syncflow.agency');
  assert.equal(custom.to, 'founders@syncflow.agency');
  assert.equal(smtpSettings({ SMTP_USER: 'resend', SMTP_PASSWORD: 'key' }, CONTACT), null, 'a login that is not an address needs SMTP_FROM');
  assert.equal(smtpSettings({ SMTP_USER: 'sender@syncflow.agency', SMTP_PASSWORD: 'key', BRIEFING_INBOX: 'not an address' }, CONTACT), null);
  assert.equal(smtpSettings({ SMTP_USER: 'sender@syncflow.agency', SMTP_PASSWORD: 'key', SMTP_FROM: 'a@b.co\r\nBcc: x@y.zz' }, CONTACT)?.from ?? null, null);
});

test('the message is plain text with the visitor as Reply-To and the delivery id as Message-ID', () => {
  const settings = smtpSettings({ SMTP_USER: 'sender@syncflow.agency', SMTP_PASSWORD: 'x' }, CONTACT);
  const mail = buildBriefingMail(LEAD, '3f0c6c1e-0a5b-4d3e-9b53-2d1e8e5f7a10', settings, '2026-10-17T10:00:00.000Z', LABELS);
  assert.equal(mail.subject, '[Briefing][high] Acme Holding, Chief Marketing Officer, Jane Doe');
  assert.equal(mail.to, CONTACT);
  assert.equal(mail.replyTo.address, 'jane@acme.com');
  assert.equal(mail.messageId, '<3f0c6c1e-0a5b-4d3e-9b53-2d1e8e5f7a10@syncflow.agency>');
  assert.equal('html' in mail, false, 'no HTML part');
  for (const piece of ['Jane Doe', 'Acme Holding', 'I decide', 'jane@acme.com', 'A platform and automation', '$100,000 – $250,000', 'Within six weeks', 'We need the platform live before the autumn.', '3f0c6c1e-0a5b-4d3e-9b53-2d1e8e5f7a10']) {
    assert.ok(mail.text.includes(piece), `the text carries ${piece}`);
  }
});

test('a briefing is delivered over a real SMTP conversation with the right login, envelope, headers and body', async () => {
  const { server, port, received } = await fakeSmtp();
  try {
    const settings = settingsFor(port);
    const mail = buildBriefingMail(LEAD, 'delivery-1', settings, '2026-10-17T10:00:00.000Z', LABELS);
    assert.equal(await sendBriefingMail(settings, mail, 4000), 'ok');
    assert.equal(received.auth.length, 1);
    assert.deepEqual(received.auth[0], ['sender@syncflow.agency', 'secret-app-password']);
    assert.match(received.from[0], /<sender@syncflow\.agency>/);
    assert.match(received.to[0], /<contact@syncflow\.agency>/);
    const raw = received.messages[0];
    assert.match(raw, /^Subject: \[Briefing\]\[high\] Acme Holding, Chief Marketing Officer, Jane Doe$/m);
    assert.match(raw, /^Reply-To: .*<jane@acme\.com>$/m);
    assert.match(raw, /^Message-ID: <delivery-1@syncflow\.agency>$/m);
    assert.match(raw, /^X-Briefing-Tier: high$/m);
    assert.match(raw, /^Content-Type: text\/plain/m);
    assert.ok(raw.includes('We need the platform live before the autumn.'));
  } finally {
    server.close();
  }
});

test('the same delivery id sent twice is the same Message-ID, which a mailbox drops as a repeat', async () => {
  const { server, port, received } = await fakeSmtp();
  try {
    const settings = settingsFor(port);
    const mail = buildBriefingMail(LEAD, 'delivery-2', settings, '2026-10-17T10:00:00.000Z', LABELS);
    assert.equal(await sendBriefingMail(settings, mail, 4000), 'ok');
    assert.equal(await sendBriefingMail(settings, mail, 4000), 'ok');
    const ids = received.messages.map((raw) => /^Message-ID: (.+)$/m.exec(raw)?.[1]);
    assert.deepEqual(ids, ['<delivery-2@syncflow.agency>', '<delivery-2@syncflow.agency>']);
  } finally {
    server.close();
  }
});

test('a line break in a name or an address cannot add a header (no Bcc reaches the envelope or the headers)', async () => {
  const { server, port, received } = await fakeSmtp();
  try {
    const settings = settingsFor(port);
    const hostile = { ...LEAD, name: 'Jane\r\nBcc: attacker@evil.test', company: 'Acme\nX-Evil: 1', email: 'jane@acme.com' };
    const mail = buildBriefingMail(hostile, 'delivery-3', settings, '2026-10-17T10:00:00.000Z', LABELS);
    assert.equal(await sendBriefingMail(settings, mail, 4000), 'ok');
    const headerBlock = received.messages[0].split('\r\n\r\n')[0];
    assert.doesNotMatch(headerBlock, /^Bcc:/im);
    assert.doesNotMatch(headerBlock, /^X-Evil:/im);
    assert.equal(received.to.length, 1, 'one recipient only');
    assert.doesNotMatch(received.to.join('\n'), /attacker/);
  } finally {
    server.close();
  }
});

test('a refused password is final (never retried) and an unreachable server is worth a retry', async () => {
  const { server, port } = await fakeSmtp();
  try {
    const wrong = settingsFor(port, { SMTP_PASSWORD: 'not-the-password' });
    const mail = buildBriefingMail(LEAD, 'delivery-4', wrong, '2026-10-17T10:00:00.000Z', LABELS);
    assert.equal(await sendBriefingMail(wrong, mail, 4000), 'final');
  } finally {
    server.close();
  }
  const closed = await new Promise((resolve) => {
    const probe = net.createServer().listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
  const settings = settingsFor(closed);
  const mail = buildBriefingMail(LEAD, 'delivery-5', settings, '2026-10-17T10:00:00.000Z', LABELS);
  assert.equal(await sendBriefingMail(settings, mail, 1500), 'retry');
});
