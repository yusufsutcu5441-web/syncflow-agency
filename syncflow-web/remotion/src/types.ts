// ../../src/core/scenarios.js saf JavaScript olduğu için tipleri burada tanımlıyoruz.
export type Step =
  | { type: 'in'; at: number; text: string; meta: string }
  | { type: 'out'; at: number; text: string; meta: string }
  | { type: 'typing'; at: number; duration: number }
  | { type: 'tag'; at: number; text: string };

export interface Scenario {
  id: string;
  sector: string;
  brand: { name: string; initial: string; status: string };
  setup: string;
  steps: Step[];
}
