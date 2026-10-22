#!/usr/bin/env node
/**
 * The release gate (docs/deployment.md): every check that must be green before a commit is called production-ready, in one command, on THIS machine.
 *
 *   npm run release:verify               full gate: type + lint + messages, audit with a production build, delivery and architecture contract tests,
 *                                        then a production server on :3190 with the HTTP smoke test, the CSP/console check and the complete browser flow
 *   npm run release:verify -- --quick    the same, with the fast browser set (anchors, shift, one simulator pass)
 *
 * The delivery variables are DELIBERATELY not set here: the gate proves the build that ships while the SMTP and legal variables are still placeholders
 * (the briefing in its honest email-draft mode, the legal pages noindex). The server gets Cloudflare's always-pass Turnstile secret so the smoke test's
 * bot-check paths run; no key of the owner is read or needed. Exit code 1 when any step fails; a server it started is always stopped.
 *
 * Two builds are proven (docs/adr/0035-sales-ready-release.md). The FEATURE build has every release switch on (the briefing form, the investment bands, the
 * seven capital-centre languages), so the form, its API and the browser flow are proven end to end. The RELEASE build is what ships by default: every switch
 * off, English and Turkish only, no form, every call to action a mail link; it gets the HTTP smoke test in its own mode. The mailbox is a reserved test
 * address, never a real one.
 */
import { spawn, spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const quick = process.argv.includes('--quick');
const PORT = 3190;
const BASE = `http://localhost:${PORT}`;
const node = process.execPath;
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const rows = [];

// A build of what ships: none of the owner's delivery or bot-check variables, whatever this machine's shell has set.
const CLEAN = { ...process.env };
for (const name of ['NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_FROM', 'BRIEFING_INBOX', 'CONTACT_WEBHOOK_URL', 'CONTACT_WEBHOOK_SECRET', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'TELEGRAM_API_BASE', 'CSP_MODE', 'DEFER_FRAMEWORK', 'NEXT_PUBLIC_CONTACT_EMAIL', 'NEXT_PUBLIC_SHOW_PRICING', 'NEXT_PUBLIC_BRIEFING_ENABLED', 'NEXT_PUBLIC_LAUNCHED_LOCALES', 'NEXT_PUBLIC_PREVIEW_LOCALES', 'EXPECT_LOCALES']) delete CLEAN[name];
const MAILBOX = 'gate@example.test'; // a reserved test domain (RFC 2606): the gate never uses a real address
const SEVEN = 'en,tr,ar,de,fr,es,zh';
const FEATURE_BUILD = { ...CLEAN, NEXT_PUBLIC_CONTACT_EMAIL: MAILBOX, NEXT_PUBLIC_SHOW_PRICING: 'true', NEXT_PUBLIC_BRIEFING_ENABLED: 'true', NEXT_PUBLIC_LAUNCHED_LOCALES: SEVEN };
const RELEASE_BUILD = { ...CLEAN, NEXT_PUBLIC_CONTACT_EMAIL: MAILBOX };

function step(label, command, args, { env = CLEAN, shell = false } = {}) {
  const started = Date.now();
  process.stdout.write(`\n▶ ${label}\n`);
  const run = spawnSync(command, args, { cwd: root, env, encoding: 'utf8', shell, maxBuffer: 64 * 1024 * 1024 });
  const output = `${run.stdout ?? ''}${run.stderr ?? ''}`;
  const lines = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const summary = [...lines].reverse().find((line) => /passed|geçti|pass \d|checks|errors?|OK:|tests \d|ℹ pass/i.test(line)) ?? lines.at(-1) ?? '';
  const ok = run.status === 0;
  const seconds = Math.round((Date.now() - started) / 1000);
  rows.push({ label, ok, seconds, summary: summary.slice(0, 120) });
  process.stdout.write(`  ${ok ? 'PASS' : 'FAIL'}  ${seconds}s  ${summary.slice(0, 120)}\n`);
  if (!ok) {
    // A failing step shows WHAT failed, not only the tail of its output: every FAIL line (first 40), the last 25 lines, and the whole output in a file.
    const logFile = join(tmpdir(), `syncflow-release-verify-step-${rows.length}.log`);
    writeFileSync(logFile, output);
    const failedLines = [...new Set(lines.filter((line) => /(^|\s)(FAIL|✖)(\s|:|$)|\bFAILED\b/.test(line)))];
    if (failedLines.length) process.stdout.write(`  failed lines (${failedLines.length}):\n${failedLines.slice(0, 40).map((line) => `    ${line.slice(0, 240)}`).join('\n')}\n`);
    process.stdout.write(`${lines.slice(-25).join('\n')}\n  full output of this step: ${logFile}\n`);
  }
  return ok;
}

async function waitFor(url, ms) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try {
      if ((await fetch(url)).ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  return false;
}

/** Starts `next start` on a port and waits for it; the caller stops it. */
async function serve(port, env, label) {
  process.stdout.write(`\n▶ production server on :${port} (${label})\n`);
  const child = spawn(node, [join(root, 'node_modules', 'next', 'dist', 'bin', 'next'), 'start', '-p', String(port)], { cwd: root, env: { ...env, TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA' }, stdio: 'ignore' });
  const up = await waitFor(`http://localhost:${port}/?m=us`, 60_000);
  rows.push({ label: `production server on :${port}`, ok: up, seconds: 0, summary: up ? 'up' : 'did not come up in 60 s' });
  process.stdout.write(`  ${up ? 'PASS' : 'FAIL'}  ${up ? 'up' : 'did not come up'}\n`);
  return { child, up };
}

let server;
try {
  step('type check, lint and message parity (npm run check)', npm, ['run', 'check'], { shell: true });
  step('design audit with a production build of the FEATURE build (faz2-denetim --build; every switch on)', node, ['faz2-denetim.mjs', '--build'], { env: FEATURE_BUILD });
  step('delivery contract tests and the mail-link encoder (npm run delivery:verify)', npm, ['run', 'delivery:verify'], { shell: true });
  step('reference architecture contract tests (npm run arch:verify)', npm, ['run', 'arch:verify'], { shell: true });

  if (rows.every((row) => row.ok)) {
    // The audit just built the FEATURE build into .next: the form, the bands and the seven languages, placeholders as shipped (no delivery variables).
    const started = await serve(PORT, FEATURE_BUILD, 'FEATURE build, placeholders as shipped: no delivery variables');
    server = started.child;
    if (started.up) {
      step('HTTP smoke test of the FEATURE build (scripts/smoke.mjs)', node, ['scripts/smoke.mjs', BASE], { env: { ...FEATURE_BUILD, EXPECT_LOCALES: SEVEN } });
      step('CSP violations and console errors, 12 visits (scripts/qa-csp.mjs)', node, ['scripts/qa-csp.mjs', BASE], { env: FEATURE_BUILD });
      step(`real-browser flow (scripts/browser-flow.mjs${quick ? ' --quick' : ''})`, node, ['scripts/browser-flow.mjs', BASE, ...(quick ? ['--quick'] : [])], { env: FEATURE_BUILD });
    }
    server.kill();
    server = undefined;

    // What ships by default: every switch off. Its own build, then the HTTP smoke test in its own mode.
    if (step('production build of the RELEASE build (every switch off: English and Turkish, no form, no price)', npm, ['run', 'build'], { env: RELEASE_BUILD, shell: true })) {
      const release = await serve(PORT + 1, RELEASE_BUILD, 'RELEASE build, every switch off');
      server = release.child;
      if (release.up) step('HTTP smoke test of the RELEASE build (scripts/smoke.mjs)', node, ['scripts/smoke.mjs', `http://localhost:${PORT + 1}`], { env: RELEASE_BUILD });
    }
  }
} finally {
  server?.kill();
}

const failed = rows.filter((row) => !row.ok);
process.stdout.write(`\n${'─'.repeat(100)}\nRelease gate: ${rows.length - failed.length} of ${rows.length} steps green${failed.length ? `, ${failed.length} FAILED` : ''}\n`);
for (const row of rows) process.stdout.write(`  ${row.ok ? 'PASS' : 'FAIL'}  ${String(row.seconds).padStart(4)} s  ${row.label}\n          ${row.summary}\n`);
process.exit(failed.length ? 1 : 0);
