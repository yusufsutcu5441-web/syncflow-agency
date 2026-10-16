#!/usr/bin/env node
/**
 * Sends a signed test briefing to the n8n webhook, exactly the way the site does (lib/server/deliver.ts): compact JSON body,
 * `x-syncflow-signature: sha256=<HMAC-SHA256 hex of the body>`, `idempotency-key: <id>`. Use it to prove the n8n side before (or
 * after) the site's environment variables are set (docs/n8n-briefing.md section 4 and 5).
 *
 *   node scripts/n8n-test.mjs <https://n8n-host/webhook/syncflow-briefing> <secret>          one e-mail should arrive
 *   node scripts/n8n-test.mjs <url> <secret> --twice                                        the same id twice: still ONE e-mail
 *   node scripts/n8n-test.mjs <url> <secret> --bad-signature                                a wrong signature: NO e-mail, the flow stops
 *
 * The subject says "test", so the mail is recognisable in the inbox. Nothing here touches the site.
 */
import { createHmac, randomUUID } from 'node:crypto';

const [url, secret, ...flags] = process.argv.slice(2);
if (!url || !secret || !/^https:\/\//.test(url)) {
  console.error('Usage: node scripts/n8n-test.mjs <https://.../webhook/syncflow-briefing> <secret> [--twice | --bad-signature]');
  process.exit(1);
}

const id = randomUUID();
const body = JSON.stringify({
  type: 'syncflow.briefing',
  id,
  receivedAt: new Date().toISOString(),
  subject: '[Briefing][test] n8n connection test, please ignore',
  projectType: 'showcase',
  budget: 't1',
  timeline: 'w6',
  role: 'decider',
  tier: 'high',
  name: 'n8n test',
  company: 'SyncFlow connection test',
  email: 'n8n-test@example.com',
  message: 'Sent by scripts/n8n-test.mjs to prove the signed webhook and the Gmail step.',
  locale: 'en',
  market: 'us',
});

const sign = (text, key) => `sha256=${createHmac('sha256', key).update(text).digest('hex')}`;

async function send(label, signatureKey) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-syncflow-signature': sign(body, signatureKey), 'idempotency-key': id },
    body,
  });
  console.log(`${label}: HTTP ${response.status}  ${(await response.text()).slice(0, 120)}`);
}

if (flags.includes('--bad-signature')) await send('wrong signature (no e-mail may arrive)', `${secret}-wrong`);
else {
  await send('signed request (one e-mail should arrive)', secret);
  if (flags.includes('--twice')) await send('same id again (still only one e-mail)', secret);
}
console.log(`id ${id}: check the inbox of the Gmail account the workflow sends to.`);
