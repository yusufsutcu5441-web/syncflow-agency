#!/usr/bin/env node
/**
 * Keeps the CSP honest. lemon.js injects one <style> element (the checkout loader's keyframes); the CSP allows
 * exactly that text through its SHA-256 hash (lib/security/csp.ts). If Lemon Squeezy changes the text, this prints
 * the new hash. Until it is updated the checkout still works; only the loader's pulse animation is blocked.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const response = await fetch('https://assets.lemonsqueezy.com/lemon.js');
if (!response.ok) {
  console.error(`could not download lemon.js (${response.status})`);
  process.exit(2);
}
const source = await response.text();
const literal = /\.innerHTML="([^"]+)"/.exec(source)?.[1];
if (!literal) {
  console.log('lemon.js no longer injects a <style> via innerHTML: the style hash in lib/security/csp.ts can be removed.');
  process.exit(0);
}

const hash = `'sha256-${createHash('sha256').update(literal, 'utf8').digest('base64')}'`;
const configured = /LEMON_STYLE_HASH = "([^"]+)"/.exec(readFileSync(join(root, 'lib/security/csp.ts'), 'utf8'))?.[1];

console.log(`current lemon.js style hash : ${hash}`);
console.log(`configured in csp.ts        : ${configured}`);
if (hash === configured) console.log('OK: they match.');
else {
  console.log('MISMATCH: update LEMON_STYLE_HASH in lib/security/csp.ts.');
  process.exit(1);
}
