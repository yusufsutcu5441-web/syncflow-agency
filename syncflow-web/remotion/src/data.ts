// Tek doğruluk kaynağı: site ile aynı senaryo ve token modülleri (saf veri, DOM bağımlılığı yok).
// Senaryo veya renk değiştirmek için ../../src/core altındaki dosyaları düzenleyin; hem site hem videolar güncellenir.
import { scenarios as rawScenarios, durationOf as rawDurationOf } from '../../src/core/scenarios.js';
import { colors, fonts, motion } from '../../src/core/tokens.js';
import type { Scenario } from './types';

export const scenarios = rawScenarios as unknown as Scenario[];
export const durationOf = rawDurationOf as (sc: Scenario) => number;
export const byId = (id: string): Scenario => scenarios.find((s) => s.id === id) ?? scenarios[0];
export { colors, fonts, motion };
