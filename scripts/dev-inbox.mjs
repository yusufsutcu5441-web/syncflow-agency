#!/usr/bin/env node
/**
 * A local "inbox" for the Strategic Briefing, so the whole flow can be tried without n8n/Make/a CRM.
 *
 *   terminal 1:  npm run dev:inbox                     (listens on http://127.0.0.1:4011/lead)
 *   terminal 2:  CONTACT_WEBHOOK_URL=http://127.0.0.1:4011/lead npm run dev
 *                (PowerShell: $env:CONTACT_WEBHOOK_URL='http://127.0.0.1:4011/lead'; npm run dev)
 *
 * Every briefing the site delivers is printed and appended to .dev-inbox.jsonl (git-ignored). If CONTACT_WEBHOOK_SECRET is
 * set in this terminal too, the x-syncflow-signature header is verified, exactly as your real receiver (n8n) should do.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { createServer } from 'node:http';

const PORT = Number(process.env.INBOX_PORT ?? 4011);
const SECRET = process.env.CONTACT_WEBHOOK_SECRET?.trim();

createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/lead') return res.writeHead(404).end();

  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => {
    const body = Buffer.concat(chunks).toString('utf8');
    let verdict = 'signature not checked (no CONTACT_WEBHOOK_SECRET here)';
    if (SECRET) {
      const expected = Buffer.from(`sha256=${createHmac('sha256', SECRET).update(body).digest('hex')}`);
      const received = Buffer.from(String(req.headers['x-syncflow-signature'] ?? ''));
      const ok = expected.length === received.length && timingSafeEqual(expected, received);
      verdict = ok ? 'signature VALID' : 'signature INVALID';
      if (!ok) return res.writeHead(401).end('bad signature');
    }
    appendFileSync('.dev-inbox.jsonl', `${body}\n`);
    console.log(`\n[${new Date().toLocaleTimeString()}] new lead (${verdict})`);
    console.log(JSON.stringify(JSON.parse(body), null, 2));
    res.writeHead(200).end('ok');
  });
}).listen(PORT, '127.0.0.1', () => console.log(`dev inbox waiting on http://127.0.0.1:${PORT}/lead (Ctrl+C to stop)`));
