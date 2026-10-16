'use client';

import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import type { IntegrationLabels, QueueLabels, SecurityLabels } from './types';

/**
 * Mounts a simulator only when its card is near the screen. Until then the server-drawn idle version (the children) stands in, and the live
 * version has exactly the same layout, so nothing moves when it arrives. The simulator code is a separate chunk, requested by a dynamic
 * import (docs/adr/0014: nothing heavy in the first load); a visitor who never scrolls to the card never downloads it.
 */
function useNearScreen<P>(load: () => Promise<{ default: ComponentType<P> }>) {
  const host = useRef<HTMLDivElement>(null);
  const loader = useRef(load);
  const [Live, setLive] = useState<ComponentType<P> | null>(null);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let cancelled = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        loader.current().then(
          (module) => {
            if (!cancelled) setLive(() => module.default);
          },
          () => undefined,
        );
      },
      { rootMargin: '700px 0px' },
    );
    observer.observe(element);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  return [host, Live] as const;
}

export function LazyQueueSim({ labels, children }: { labels: QueueLabels; children: ReactNode }) {
  const [host, Live] = useNearScreen<{ labels: QueueLabels }>(() => import('./FailSafeSim'));
  return (
    <div ref={host} className="sim" data-sim="queue" data-live={Live ? '' : undefined}>
      {Live ? <Live labels={labels} /> : children}
    </div>
  );
}

export function LazySecuritySim({ labels, children }: { labels: SecurityLabels; children: ReactNode }) {
  const [host, Live] = useNearScreen<{ labels: SecurityLabels }>(() => import('./SecurityFlowSim'));
  return (
    <div ref={host} className="sim" data-sim="security" data-live={Live ? '' : undefined}>
      {Live ? <Live labels={labels} /> : children}
    </div>
  );
}

export function LazyIntegrationSim({ labels, children }: { labels: IntegrationLabels; children: ReactNode }) {
  const [host, Live] = useNearScreen<{ labels: IntegrationLabels }>(() => import('./IntegrationSim'));
  return (
    <div ref={host} className="sim" data-sim="integration" data-live={Live ? '' : undefined}>
      {Live ? <Live labels={labels} /> : children}
    </div>
  );
}
