'use client';

import { Pause, Play } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useClientI18n } from '@/components/i18n/ClientI18n';

/**
 * A looping, silent, native video of a scene that was rendered ahead of time (public/media/clips, npm run film:render;
 * docs/adr/0003 and 0006). No animation engine runs in the browser: the file is decoded by the device's own video hardware.
 *
 *  - The still (a WebP) is a lazy <img> under the video, not the video's `poster`: a poster is fetched at page load whatever its
 *    distance from the screen, a lazy image only when its card is near (docs/adr/0020: the stills are 1920 x 1080 now, so
 *    four of them must not weigh on the first load). The video itself is `preload="none"`: it is fetched only when it is going
 *    to play, so a visitor who never looks at it never downloads it. MP4 (H.264) first, WebM (VP9) as the fallback.
 *  - mode "visible": plays while at least 30 % of it is on screen. mode "hover": plays while the pointer is over (or
 *    keyboard focus is inside) its card [data-video-host]. Autoplay needs a fine pointer; touch devices show the poster
 *    and a play button. Reduced motion: never autoplays.
 *  - It stops the moment it leaves the screen or the tab is hidden, so at most the videos in view ever run.
 *  - A visible play/pause button always exists (WCAG 2.2.2: moving content that lasts more than five seconds can be paused).
 */
type Mode = 'visible' | 'hover';

export function SceneVideo({ name, label, mode }: { name: 'monolith' | 'estate' | 'clinic' | 'law' | 'logistics'; label: string; mode: Mode }) {
  const { messages } = useClientI18n();
  const t = messages.Showcase;
  // The four sector scenes are rendered at 1920 x 1080, the architecture monolith at 1280 x 720 (scripts/render-film.mjs).
  const [width, height] = name === 'monolith' ? [1280, 720] : [1920, 1080];
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [canAutoplay, setCanAutoplay] = useState(false);
  const userPaused = useRef(false);

  // `playing` follows the element's own play and pause events (see the <video> below), so these two only give commands.
  const play = useCallback(() => {
    void video.current?.play().catch(() => undefined);
  }, []);
  const pause = useCallback(() => {
    video.current?.pause();
  }, []);

  // Environment: autoplay is for fine pointers without reduced motion (and not when the visitor asked to save data).
  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    const update = () => setCanAutoplay(fine.matches && !reduced.matches && !saveData);
    update();
    fine.addEventListener('change', update);
    reduced.addEventListener('change', update);
    return () => {
      fine.removeEventListener('change', update);
      reduced.removeEventListener('change', update);
    };
  }, []);

  // Visibility.
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(Boolean(entry?.isIntersecting)), { threshold: 0.3 });
    observer.observe(element);
    const onVisibility = () => {
      if (document.hidden) pause();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [pause]);

  // Hover and keyboard focus on the card that hosts the video.
  useEffect(() => {
    if (mode !== 'hover') return;
    const host = video.current?.closest<HTMLElement>('[data-video-host]');
    if (!host) return;
    const on = () => setHovered(true);
    const off = () => setHovered(false);
    const focusOut = (event: FocusEvent) => {
      if (!host.contains(event.relatedTarget as Node | null)) off();
    };
    host.addEventListener('pointerenter', on);
    host.addEventListener('pointerleave', off);
    host.addEventListener('focusin', on);
    host.addEventListener('focusout', focusOut);
    return () => {
      host.removeEventListener('pointerenter', on);
      host.removeEventListener('pointerleave', off);
      host.removeEventListener('focusin', on);
      host.removeEventListener('focusout', focusOut);
    };
  }, [mode]);

  // The policy: play only on screen, only when allowed, only when the visitor has not paused it.
  useEffect(() => {
    if (!onScreen) {
      pause();
      return;
    }
    if (!canAutoplay || userPaused.current) return;
    if (mode === 'visible' || hovered) play();
    else pause();
  }, [onScreen, canAutoplay, hovered, mode, play, pause]);

  const toggle = () => {
    if (playing) {
      userPaused.current = true;
      pause();
    } else {
      userPaused.current = false;
      play();
    }
  };

  return (
    <>
      {/* A plain lazy <img>, not next/image: a decorative still from public/, already a WebP at its display size (docs/adr/0020). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/media/clips/${name}.webp`} alt="" width={width} height={height} loading="lazy" decoding="async" />
      <video
        ref={video}
        muted
        loop
        playsInline
        preload="none"
        aria-label={label}
        className="pointer-events-none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        // The first decoded frame fades the film in over the still (opacity only, on the compositor). Set on the element itself: no re-render.
        onPlaying={(event) => {
          event.currentTarget.dataset.on = '';
        }}
      >
        <source src={`/media/clips/${name}.mp4`} type="video/mp4" />
        <source src={`/media/clips/${name}.webm`} type="video/webm" />
      </video>
      <button type="button" className="frame-control" onClick={toggle} aria-label={playing ? t.pause : t.play}>
        {playing ? <Pause size={14} strokeWidth={1.75} aria-hidden="true" /> : <Play size={14} strokeWidth={1.75} aria-hidden="true" className="icon-dir" />}
      </button>
    </>
  );
}
