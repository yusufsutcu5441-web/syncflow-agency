#!/usr/bin/env node
/**
 * Secrets safety audit. Run AFTER `next build`.
 *
 * Fails if any server-only secret (name or value) appears in anything the browser can download:
 *   - .next/static/**        (every JavaScript/CSS/media file served to visitors)
 *   - .next/server/app/**\/*.html and *.rsc  (prerendered pages and flight payloads, if any)
 *
 * Values are taken from the current environment and from .env / .env.local / .env.production(.local) when present,
 * so the check is meaningful with real secrets. To prove the audit itself works, build once with canary values:
 *   CONTACT_WEBHOOK_URL=https://example.invalid/CANARY-9f3b  CONTACT_WEBHOOK_SECRET=CANARYSECRET123  npm run build
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SERVER_ONLY = ['CONTACT_WEBHOOK_URL', 'CONTACT_WEBHOOK_SECRET', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'];

function readEnvFile(name) {
  const path = join(root, name);
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const fileEnv = Object.assign({}, ...['.env', '.env.local', '.env.production', '.env.production.local'].map(readEnvFile));
const values = new Map();
for (const name of SERVER_ONLY) {
  const value = process.env[name] ?? fileEnv[name];
  if (value && value.length >= 8) values.set(name, value);
}

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}

const targets = [join(root, '.next', 'static')];
const serverApp = join(root, '.next', 'server', 'app');
const publicFiles = [...targets.flatMap((d) => [...walk(d)]), ...[...walk(serverApp)].filter((f) => /\.(html|rsc|txt)$/.test(f))];

if (publicFiles.length === 0) {
  console.error('Nothing to scan. Run `npm run build` first.');
  process.exit(2);
}

const findings = [];
for (const file of publicFiles) {
  if (/\.(woff2?|png|jpe?g|webp|avif|ico|map)$/.test(file)) continue;
  const content = readFileSync(file, 'utf8');
  for (const name of SERVER_ONLY) {
    if (content.includes(name)) findings.push(`${file.replace(root, '.')}: contains the variable NAME ${name}`);
  }
  for (const [name, value] of values) {
    if (content.includes(value)) findings.push(`${file.replace(root, '.')}: contains the VALUE of ${name}`);
  }
}

console.log(`scanned ${publicFiles.length} browser-visible files; checked ${SERVER_ONLY.length} secret names and ${values.size} secret values`);
if (findings.length) {
  console.error('\nLEAK:\n  ' + findings.join('\n  '));
  process.exit(1);
}
console.log(values.size ? 'OK: no server-only secret name or value reached the client bundle.' : 'OK: no server-only secret NAME reached the client bundle. (No secret values were set, so values were not checked; build with canary values for a full proof.)');
