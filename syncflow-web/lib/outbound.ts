/**
 * The copy and the facts of /outbound (docs/adr/0036-outbound-route.md). A plain module with no imports: the page, the replay terminal and the unit test
 * (tests/delivery/outbound.test.mjs, run by `npm run delivery:verify`) read the same data.
 *
 * English only, on purpose: the page is written for US software teams and lives at /outbound, not under another language (the page answers 404 for any
 * other locale). It is the one page of the site whose text is not in messages/*.json; the owner approved that on 02.11.2026 together with leaving the
 * showcase-niche decisions (ADR 0009/0019) and the champagne-only accent aside for this route.
 *
 * What did NOT change for this route, because each rests on a fact, a law or a security reason (CLAUDE.md): no "100 %", no guarantee, no promise of
 * results, no number without a value, a date and a source, no pure black or white. The test below fails on the wording that was asked for and refused:
 * "zero human intervention" (a person approves each batch of first mails) and "100 % deliverability".
 */
export const OUTBOUND_PATH = '/outbound';

/**
 * The figures of the replay terminal, read from the outbound engine's own records on 02.11.2026 (its send log and outcome file, through the engine's own
 * pipeline report), counting outreach only: the owner's own test mails are not included.
 * They are a snapshot, labelled as one on the page; replace the whole record (and its date) when they are refreshed, never one number.
 *
 * `bounced` and `complaints` are RECORDED counts, and the page says so (03.11.2026): the engine's mailbox reader recorded no bounce notice for the first 42 sends (it
 * recorded its first outcome after them), while 4 of the 38 follow-ups to those addresses bounced at once. So the counts can only be a floor, and no rate is printed:
 * a percentage of a count known to be low would look like a measurement. Do not put one back until the early gap is closed or measured.
 */
export const REPLAY_FACTS = {
  asOf: '2026-11-02',
  asOfLabel: '02.11.2026',
  source: "the engine's own send log and outcome records, outreach only (the owner's test mails are not counted)",
  queued: 37,
  mailsSent: 466,
  peopleContacted: 287,
  bounced: 11,
  complaints: 0,
  businessHours: '09:00-17:00',
} as const;

export type TerminalKind = 'cmd' | 'out' | 'ok' | 'note';
export type TerminalLine = { kind: TerminalKind; text: string };

const F = REPLAY_FACTS;

/** A real run, step by step. Every line states something the engine does; the figures are REPLAY_FACTS. */
export const TERMINAL_LINES: readonly TerminalLine[] = [
  { kind: 'cmd', text: 'pm2 start syncflow-outbound' },
  { kind: 'ok', text: 'process online, queue restored from disk' },
  { kind: 'out', text: 'authenticating the lead source (Apify)... 200 OK' },
  { kind: 'out', text: 'audience filter: United States · founder / CEO · 1-150 staff · software and tech' },
  { kind: 'out', text: 'checking every address: MX records, free mail, do-not-contact list' },
  { kind: 'out', text: 'no address is ever guessed or derived; only what the source returns is considered' },
  { kind: 'ok', text: `${F.queued} e-mails approved and queued by a person` },
  { kind: 'out', text: `dispatch rule: one mail at a time, only inside the recipient's own business hours (${F.businessHours})` },
  { kind: 'ok', text: 'circuit breaker: closed. Pauses by itself on repeated bounces or any complaint' },
  { kind: 'out', text: `delivery to date: ${F.mailsSent} mails to ${F.peopleContacted} people · ${F.bounced} recorded bounces · ${F.complaints} recorded complaints` },
  { kind: 'note', text: 'feedback is counted from recorded notices only: the earliest sends may be under-counted' },
  { kind: 'note', text: 'delivery figures only: replies depend on the offer and the list, and no result is promised' },
];

export const HERO = {
  eyebrow: 'Outbound infrastructure · B2B software teams',
  title: ['Autonomous B2B', 'outbound engines.'],
  lead: 'Leads sourced, validated and sent by a system that runs unattended and stops itself when bounces or complaints appear. A person defines the audience and approves each batch of first mails; the engine does the repetitive work, and every step leaves a log you can read.',
  leadStrong: ['runs unattended', 'stops itself'],
  cta: 'Request architecture review',
  ctaSecondary: 'See how it is built',
} as const;

export const TERMINAL = {
  label: 'Replay of a real engine run',
  barTitle: 'pm2 · syncflow-outbound',
  tag: `REPLAY · ${F.asOfLabel} · NOT A LIVE FEED`,
  foot: `Figures from ${F.source}, taken ${F.asOfLabel}.`,
  replay: 'Replay',
} as const;

export const ARCHITECTURE = {
  eyebrow: 'Architecture',
  title: 'Three layers. Each one can say no.',
  sub: 'The engine is built so that a bad list or a failing mailbox stops the run instead of burning the sending domain.',
  steps: [
    {
      n: '01 · SOURCE',
      title: 'Signal-based lead sourcing',
      body: 'An audience definition, not a spreadsheet: country, title, headcount and industry go to a B2B lead finder through the Apify API.',
      points: ['People fetched before are excluded from the next run', 'Only addresses the source returns; none are guessed', 'A small first batch, checked before the next one'],
      stack: 'Apify API · filters in code, tested',
    },
    {
      n: '02 · VALIDATE',
      title: 'Circuit breaker and DNS/MX layer',
      body: 'Every address passes a gate before it is queued, and the queue keeps watching after it starts.',
      points: ['MX lookup on every address; free mail refused, work addresses only', 'Do-not-contact list checked before every single send', 'Pauses itself on repeated bounces or any complaint'],
      stack: 'DNS · suppression list · bounce and complaint monitor',
    },
    {
      n: '03 · DISPATCH',
      title: 'Supervised, unattended dispatch',
      body: 'One supervised process holds the queue, the schedule and the log. It runs around the clock and sends only when it should.',
      points: ["Business-hours aware: waits for each recipient's own workday", 'Queue and schedule survive a restart', 'Every send, bounce and reply is logged and readable'],
      stack: 'PM2 daemon · Gmail/SMTP · IMAP reply reader',
    },
  ],
} as const;

export const TRUTH = {
  title: 'What "autonomous" means here',
  body: 'The engine works without anyone babysitting it. It does not remove the person: a human defines the audience, approves each batch of first mails and decides what the offer says. It does not promise inbox placement or replies; it checks, logs and stops when something looks wrong.',
} as const;

export const CLOSING = {
  eyebrow: 'Architecture review',
  title: "Tell us who you sell to. We'll tell you what the engine would do.",
  sub: 'A written review of your audience, domain and sending setup before anything is built. No call required.',
  cta: 'Request architecture review',
  addressLead: 'Or write to',
} as const;

export const META = {
  title: 'Autonomous B2B outbound engines | SyncFlow Labs',
  description: 'Sourcing, validation and dispatch for B2B outbound that run unattended and stop themselves when bounces or complaints appear. A person approves every batch of first mails.',
} as const;

/** Every sentence the page prints, in one list, for the claim test. */
export function allCopy(): string[] {
  return [
    HERO.eyebrow,
    ...HERO.title,
    HERO.lead,
    HERO.cta,
    HERO.ctaSecondary,
    ...TERMINAL_LINES.map((line) => line.text),
    TERMINAL.label,
    TERMINAL.tag,
    TERMINAL.foot,
    ARCHITECTURE.eyebrow,
    ARCHITECTURE.title,
    ARCHITECTURE.sub,
    ...ARCHITECTURE.steps.flatMap((s) => [s.n, s.title, s.body, ...s.points, s.stack]),
    TRUTH.title,
    TRUTH.body,
    CLOSING.eyebrow,
    CLOSING.title,
    CLOSING.sub,
    CLOSING.cta,
    META.title,
    META.description,
  ];
}
