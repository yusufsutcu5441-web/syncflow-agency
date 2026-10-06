'use client';

import type { CallbackListener, PlayerRef } from '@remotion/player';
import { Pause, Play, RotateCcw } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useId, useRef, useState } from 'react';
import { useMediaQuery } from '@/lib/hooks/use-media-query';
import { clsx } from 'clsx';
import { SCENE_COUNT, SCENE_FRAMES, SCENE_STARTS, TOTAL_FRAMES, type SceneLabels } from './config';

// The Remotion runtime (~100 kB) is a separate chunk, fetched only when this section nears the viewport.
const ArchitecturePlayer = dynamic(() => import('./ArchitecturePlayer'), { ssr: false });

type Copy = {
  tabsLabel: string;
  tabs: readonly [string, string, string];
  live: string;
  play: string;
  pause: string;
  restart: string;
  loading: string;
  playerLabel: string;
  playerDescription: string;
};

/** Frame shown for visitors who prefer reduced motion: the architecture scene, fully drawn, not playing. */
const STILL_FRAME = 118;

/**
 * Interactive Remotion composition.
 *  - Loads lazily (IntersectionObserver), plays only while on screen, and pauses when scrolled away.
 *  - Scene buttons seek the composition; play/pause and restart are real, labelled buttons.
 *  - prefers-reduced-motion: no autoplay, a finished still frame is shown, the visitor can opt in with Play.
 *  - The frame box has a fixed aspect ratio, so nothing shifts while the player loads (CLS 0).
 *  - Phones get the portrait canvas, larger screens the 16:9 one (see components/remotion/config.ts).
 */
export function ShowcasePlayer({ labels, copy }: { labels: SceneLabels; copy: Copy }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const userPaused = useRef(false);
  const descriptionId = useId();

  const [near, setNear] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [player, setPlayer] = useState<PlayerRef | null>(null);
  const [playing, setPlaying] = useState(false);
  const [scene, setScene] = useState(0);

  const wide = useMediaQuery('(min-width: 768px)', true);
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const layout = wide ? 'wide' : 'tall';

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const preload = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setNear(true);
          preload.disconnect();
        }
      },
      { rootMargin: '700px 0px' },
    );
    const visibility = new IntersectionObserver(([entry]) => setOnScreen(Boolean(entry?.isIntersecting)), { threshold: 0.3 });
    preload.observe(el);
    visibility.observe(el);
    return () => {
      preload.disconnect();
      visibility.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!player) return;
    if (reduced || !onScreen || userPaused.current) player.pause();
    else player.play();
  }, [player, onScreen, reduced]);

  useEffect(() => {
    if (!player) return;
    const onFrame: CallbackListener<'frameupdate'> = ({ detail }) => {
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${detail.frame / (TOTAL_FRAMES - 1)})`;
      const next = Math.min(SCENE_COUNT - 1, Math.floor(detail.frame / SCENE_FRAMES));
      setScene((current) => (current === next ? current : next));
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    player.addEventListener('frameupdate', onFrame);
    player.addEventListener('play', onPlay);
    player.addEventListener('pause', onPause);
    return () => {
      player.removeEventListener('frameupdate', onFrame);
      player.removeEventListener('play', onPlay);
      player.removeEventListener('pause', onPause);
    };
  }, [player]);

  const toggle = () => {
    if (!player) return;
    if (player.isPlaying()) {
      userPaused.current = true;
      player.pause();
    } else {
      userPaused.current = false;
      player.play();
    }
  };

  const goTo = (index: number) => {
    if (!player) return;
    userPaused.current = false;
    player.seekTo(SCENE_STARTS[index] ?? 0);
    player.play();
    setScene(index);
  };

  return (
    <div className="glass overflow-hidden">
      <div
        ref={frameRef}
        role="img"
        aria-label={copy.playerLabel}
        aria-describedby={descriptionId}
        className="relative aspect-[4/5] w-full bg-obsidian md:aspect-video"
      >
        {near ? <ArchitecturePlayer playerRef={setPlayer} labels={labels} layout={layout} initialFrame={reduced ? STILL_FRAME : 0} /> : null}

        {player ? null : (
          <div className="absolute inset-0 grid place-items-center">
            <span className="eyebrow">{copy.loading}</span>
          </div>
        )}

        <i className="tick tick-tl" aria-hidden="true" />
        <i className="tick tick-tr" aria-hidden="true" />
        <i className="tick tick-bl" aria-hidden="true" />
        <i className="tick tick-br" aria-hidden="true" />
        <div className="pointer-events-none absolute right-6 top-5 hidden items-center gap-2.5 sm:flex" aria-hidden="true">
          <span className="live-dot" />
          <span className="eyebrow">{copy.live}</span>
        </div>
      </div>

      <p id={descriptionId} className="sr-only">
        {copy.playerDescription}
      </p>

      <div className="relative border-t border-white/10">
        <span
          ref={progressRef}
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px origin-left bg-snow"
          style={{ transform: 'scaleX(0)' }}
        />
        <div className="flex items-center justify-between gap-3 p-3 md:p-4">
          {/* Phones: three equal tabs on one row (long labels wrap to two lines). From sm: inline pills. */}
          <div role="group" aria-label={copy.tabsLabel} className="grid min-w-0 flex-1 grid-cols-3 gap-1 sm:flex sm:flex-none sm:flex-wrap sm:gap-1.5">
            {copy.tabs.map((label, index) => (
              <button
                key={label}
                type="button"
                aria-pressed={scene === index}
                disabled={!player}
                onClick={() => goTo(index)}
                className={clsx(
                  'min-h-10 cursor-pointer rounded-full border px-1 py-1.5 text-center text-[0.8125rem] font-medium leading-tight tracking-tight transition-colors duration-300 disabled:cursor-default sm:h-9 sm:min-h-0 sm:px-4 sm:py-0 sm:text-sm',
                  scene === index ? 'border-white/25 bg-white/10 text-snow' : 'border-transparent text-muted hover:text-snow',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex shrink-0 gap-2">
            <button type="button" className="btn btn-ghost size-10 !h-10 !px-0" aria-label={playing ? copy.pause : copy.play} disabled={!player} onClick={toggle}>
              {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
            </button>
            <button type="button" className="btn btn-ghost hidden size-10 !h-10 !px-0 sm:inline-flex" aria-label={copy.restart} disabled={!player} onClick={() => goTo(0)}>
              <RotateCcw size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
