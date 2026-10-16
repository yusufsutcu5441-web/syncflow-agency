import { scenarioEventId, type ScenarioConfig } from './simulate';

/**
 * The scenarios the reference queue is verified against. The contract tests (tests/arch/queue.test.ts) assert the invariants on every one of
 * them, `npm run arch:verify -- --report` prints the results as a table, and docs/architecture/examples/scenarios.json holds the same results
 * (a test fails if the file and the code disagree), so the evidence in the documentation is what the code does today, not what it once did.
 * All of them are deterministic: a virtual clock, a seeded random generator, no timers, no network.
 */
export const SCENARIOS: readonly ScenarioConfig[] = [
  { name: 'healthy channel', events: 50 },
  { name: 'channel down for 20 s, then restored', events: 40, spacingMs: 250, channel: { down: [[2_000, 22_000]] } },
  {
    name: 'flapping channel (down three times for 3 s)',
    events: 40,
    spacingMs: 250,
    channel: {
      down: [
        [1_000, 4_000],
        [7_000, 10_000],
        [13_000, 16_000],
      ],
    },
  },
  { name: 'acknowledgements lost on 30 % of sends', events: 60, seed: 11, channel: { ackLossRate: 0.3 } },
  { name: 'one poison event among 20 (refused, not retryable)', events: 20, seed: 5, channel: { poison: new Set([scenarioEventId(5, 6)]) } },
  { name: 'one stubborn event among 20 (503 for it alone, retryable)', events: 20, seed: 6, channel: { stubborn: new Set([scenarioEventId(6, 9)]) } },
  { name: 'process restarts twice during an outage', events: 30, spacingMs: 250, channel: { down: [[1_500, 15_000]] }, restartAt: [5_000, 9_000] },
  { name: 'the producer sends every 5th event twice', events: 30, producerRetries: [4, 9, 14, 19, 24, 29] },
  {
    name: 'everything at once',
    events: 80,
    spacingMs: 150,
    seed: 3,
    channel: {
      down: [
        [2_000, 9_000],
        [15_000, 20_000],
      ],
      ackLossRate: 0.25,
      poison: new Set([scenarioEventId(3, 11), scenarioEventId(3, 52)]),
      stubborn: new Set([scenarioEventId(3, 30)]),
    },
    restartAt: [6_000, 17_000],
    producerRetries: [3, 13, 23, 33, 43, 53, 63, 73],
  },
];
