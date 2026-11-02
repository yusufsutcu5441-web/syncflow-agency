'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { TerminalLine } from '@/lib/outbound';

const REDUCED = '(prefers-reduced-motion: reduce)';
const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(REDUCED);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};
const reducedNow = () => window.matchMedia(REDUCED).matches;

/** Where the typing is. `null` = every line is complete: the state the server renders, and the one a visitor with reduced motion keeps. */
type Progress = { line: number; chars: number } | null;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * A replay of a real run (lib/outbound.ts), typed out once when it scrolls into view. The finished text is what the server renders and what the first client
 * render shows, so there is no hydration mismatch and the page reads fine without JavaScript; typing only changes which part of each line is visible.
 * The part not typed yet stays in the layout (visibility: hidden, not removed), so the box never changes height and nothing shifts (CLS).
 * Reduced motion: no typing and no replay button. The tag in the bar says it is a replay and not a live feed.
 */
export function ReplayTerminal({ lines, label, barTitle, tag, foot, replay }: { lines: readonly TerminalLine[]; label: string; barTitle: string; tag: string; foot: string; replay: string }) {
  const [progress, setProgress] = useState<Progress>(null);
  // The server (and the first client render) assume motion is fine; a visitor with reduced motion gets the finished text and no replay button right after hydration.
  const reduced = useSyncExternalStore(subscribeReduced, reducedNow, () => false);
  const root = useRef<HTMLDivElement>(null);
  const run = useRef(0);
  const cancel = useCallback(() => {
    run.current += 1;
  }, []);

  const play = useCallback(async () => {
    const token = ++run.current;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const { kind, text } = line;
      const command = kind === 'cmd';
      for (let chars = 0; chars <= text.length; chars += command ? 1 : 2) {
        if (run.current !== token) return;
        setProgress({ line: i, chars });
        await sleep(command ? 38 : 18);
      }
      if (run.current !== token) return;
      setProgress({ line: i, chars: text.length });
      await sleep(command ? 420 : 240);
    }
  }, [lines]);

  useEffect(() => {
    if (reduced) return;
    const node = root.current;
    if (!node || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          observer.disconnect();
          void play();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancel();
    };
  }, [play, reduced, cancel]);

  return (
    <div className="ob-term" role="region" aria-label={label} ref={root}>
      <div className="ob-term-bar">
        <span className="ob-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>{barTitle}</span>
        <span className="ob-tag">{tag}</span>
      </div>
      <div className="ob-term-body">
        {lines.map((line, i) => {
          const shown = progress === null || i < progress.line ? line.text.length : i === progress.line ? progress.chars : 0;
          return (
            <div key={i} className={`ob-line ob-${line.kind}`} data-pending={progress !== null && shown === 0 ? '' : undefined}>
              <span>{line.text.slice(0, shown)}</span>
              <span className="ob-ghost" aria-hidden="true">
                {line.text.slice(shown)}
              </span>
              {progress !== null && i === progress.line ? <i className="ob-caret" aria-hidden="true" /> : null}
            </div>
          );
        })}
      </div>
      <div className="ob-term-foot">
        <span>{foot}</span>
        {!reduced ? (
          <button type="button" className="ob-btn ob-btn-sm" onClick={() => void play()}>
            {replay}
          </button>
        ) : null}
      </div>
    </div>
  );
}
