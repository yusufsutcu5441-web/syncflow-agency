'use client';

import { clsx } from 'clsx';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useClientI18n } from '@/components/i18n/ClientI18n';
import { useMediaQuery } from '@/lib/hooks/use-media-query';
import { FPS, SCENE_COUNT, SCENE_FRAMES, SCENE_STARTS } from '@/remotion/config';

type Copy = {
  tabsLabel: string;
  tabs: readonly [string, string, string];
  badge: string;
  play: string;
  pause: string;
  restart: string;
  playerLabel: string;
  playerDescription: string;
};

type Layout = 'wide' | 'tall';

/**
 * Files written by `npm run film:render` (scripts/render-film.mjs). One set per launch language and layout:
 * <name>.mp4 (H.264: smaller for this film and hardware-decoded on phones, so it is played wherever it can be),
 * <name>.webm (VP9: the fallback for browsers without H.264) and <name>.webp (poster: the architecture scene, fully drawn).
 */
const media = (locale: string, layout: Layout, extension: 'webm' | 'mp4' | 'webp') => `/media/showcase/architecture-${locale}-${layout}.${extension}`;

const noop = () => {};

/**
 * The architecture film, played from pre-rendered files. The page carries no animation runtime: a poster image is the
 * only thing that ships with the HTML, and the video is fetched when it is wanted.
 *  - Mouse devices: starts when the film is at least 30 % on screen, pauses when scrolled away.
 *  - Touch devices, prefers-reduced-motion and Save-Data: nothing is downloaded and nothing autoplays; the visitor
 *    presses Play (or a scene tab) and only then does the video load.
 *  - The scene tabs seek to the start of a scene; play/pause and restart are real, labelled buttons.
 *  - The frame has a fixed aspect ratio, so nothing shifts while the poster is swapped for the video (CLS 0).
 *  - Phones get the portrait 4:5 file, larger screens the 16:9 one (remotion/config.ts).
 */
export function ShowcaseFilm({ copy }: { copy: Copy }) {
  const { locale } = useClientI18n();
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const userPaused = useRef(false);
  const pendingSeek = useRef<number | null>(null);
  const descriptionId = useId();

  const [onScreen, setOnScreen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [scene, setScene] = useState(0);
  // The layout whose first frame is on screen. The poster shows until the video of the CURRENT layout is playing.
  const [shownLayout, setShownLayout] = useState<Layout | null>(null);

  const wide = useMediaQuery('(min-width: 768px)', true);
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)');
  const layout: Layout = wide ? 'wide' : 'tall';
  const ready = shownLayout === layout;

  const play = useCallback(() => {
    void videoRef.current?.play().catch(noop);
  }, []);

  /** Points the video at the file for the current layout (first time, or after the layout flipped) and starts loading. */
  const begin = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.dataset.layout === layout) return;
    const h264 = video.canPlayType('video/mp4; codecs="avc1.640028"');
    video.muted = true; // React renders `muted` as a property only; set it before any play() so autoplay rules are met
    video.dataset.layout = layout;
    video.src = media(locale, layout, h264 === 'probably' || h264 === 'maybe' ? 'mp4' : 'webm');
    video.load();
  }, [layout, locale]);

  const seekTo = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    if (video.readyState >= 1) video.currentTime = seconds;
    else pendingSeek.current = seconds; // metadata is not in yet: applied in onLoadedMetadata
  };

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(Boolean(entry?.isIntersecting)), { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Autoplay only where it costs nothing: a mouse device, no reduced-motion preference, no Save-Data.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    if (!onScreen || reduced) {
      video.pause();
    } else if (finePointer && !saveData && !userPaused.current) {
      begin();
      play();
    }
  }, [onScreen, reduced, finePointer, begin, play]);

  // The viewport crossed 768 px while a film was loaded (phone rotated): swap to the file of the other layout.
  useEffect(() => {
    const video = videoRef.current;
    if (!video?.dataset.layout || video.dataset.layout === layout) return;
    const resume = !video.paused && !userPaused.current;
    begin();
    if (resume) play();
  }, [layout, begin, play]);

  // Progress line and active scene follow the video while it plays.
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => {
      const video = videoRef.current;
      if (video && video.duration > 0) {
        if (progressRef.current) progressRef.current.style.transform = `scaleX(${Math.min(1, video.currentTime / video.duration)})`;
        const next = Math.min(SCENE_COUNT - 1, Math.floor((video.currentTime * FPS) / SCENE_FRAMES));
        setScene((current) => (current === next ? current : next));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.dataset.layout && !video.paused) {
      userPaused.current = true;
      video.pause();
    } else {
      userPaused.current = false;
      begin();
      play();
    }
  };

  const goTo = (index: number) => {
    userPaused.current = false;
    begin();
    seekTo((SCENE_STARTS[index] ?? 0) / FPS);
    play();
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
        {/* The poster ships with the HTML. <picture> lets the browser pick the portrait or the wide image before any script runs. */}
        <picture>
          <source media="(min-width: 768px)" srcSet={media(locale, 'wide', 'webp')} />
          <img src={media(locale, 'tall', 'webp')} alt="" decoding="async" loading="lazy" className="absolute inset-0 h-full w-full object-contain" />
        </picture>

        <video
          ref={videoRef}
          className={clsx('absolute inset-0 h-full w-full object-contain transition-opacity duration-300', ready ? 'opacity-100' : 'opacity-0')}
          muted
          loop
          playsInline
          preload="none"
          disablePictureInPicture
          disableRemotePlayback
          tabIndex={-1}
          aria-hidden="true"
          onLoadedMetadata={(event) => {
            if (pendingSeek.current === null) return;
            event.currentTarget.currentTime = pendingSeek.current;
            pendingSeek.current = null;
          }}
          onPlaying={() => {
            setShownLayout(layout);
            setPlaying(true);
          }}
          onPause={() => setPlaying(false)}
          onError={(event) => {
            // canPlayType said yes but the browser could not decode the MP4: fall back to the WebM once.
            const video = event.currentTarget;
            if (!video.src.endsWith('.mp4')) return;
            video.src = media(locale, layout, 'webm');
            video.load();
            if (!userPaused.current) play();
          }}
        />

        <i className="tick tick-tl" aria-hidden="true" />
        <i className="tick tick-tr" aria-hidden="true" />
        <i className="tick tick-bl" aria-hidden="true" />
        <i className="tick tick-br" aria-hidden="true" />
        <div className="pointer-events-none absolute right-6 top-5 hidden items-center sm:flex" aria-hidden="true">
          <span className="eyebrow">{copy.badge}</span>
        </div>
      </div>

      <p id={descriptionId} className="sr-only">
        {copy.playerDescription}
      </p>

      <div className="relative border-t border-hairline">
        <span
          ref={progressRef}
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px origin-left bg-platin"
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
                onClick={() => goTo(index)}
                className={clsx(
                  'min-h-10 cursor-pointer rounded-sharp border px-1 py-1.5 text-center text-[0.8125rem] font-medium leading-tight tracking-title transition-colors duration-300 sm:h-9 sm:min-h-0 sm:px-4 sm:py-0 sm:text-sm',
                  scene === index ? 'border-hairline-strong bg-layer-2 text-platin' : 'border-transparent text-muted hover:text-platin',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex shrink-0 gap-2">
            <button type="button" className="btn btn-ghost size-10 !h-10 !px-0" aria-label={playing ? copy.pause : copy.play} onClick={toggle}>
              {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
            </button>
            <button type="button" className="btn btn-ghost hidden size-10 !h-10 !px-0 sm:inline-flex" aria-label={copy.restart} onClick={() => goTo(0)}>
              <RotateCcw size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
