'use client';

import { useState } from 'react';
import type { TargetSystem } from '@/lib/arch/mappers';
import { IntegrationView } from './IntegrationView';
import type { IntegrationLabels } from './types';

/**
 * The live integration model: the four tabs work. The mapping itself is computed by the reference mappers (lib/arch/mappers.ts) and is
 * identical to the server's drawing of the first tab; only the choice of system is state (docs/adr/0021 §5).
 */
export default function IntegrationSim({ labels }: { labels: IntegrationLabels }) {
  const [system, setSystem] = useState<TargetSystem>('salesforce');
  return <IntegrationView labels={labels} system={system} onSelect={setSystem} />;
}
