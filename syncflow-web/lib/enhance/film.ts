import { cinemaCapable } from '@/lib/cinema/capable';
import { AMBIENT_GAIN, CINEMA_OFF_EVENT, cinemaState, cinemaStatus } from '@/lib/cinema/state';

/**
 * Scroll-driven film (docs/adr/0014-cinematic-layer.md). The section `[data-film]` is tall and holds a sticky stage; scrolling plays
 * it like a timeline. This module turns scroll position into
 *   - the CSS variable `--p` (0..1) on the section: chapters, posters and the progress bar read it, in CSS alone
 *     (works on phones, without WebGL, under prefers-reduced-motion);
 *   - `data-chapter` (0..3) and the timecode readout, only when they change;
 *   - the shared cinema state the WebGL engine eases towards (scene, ambient/film blend, brightness).
 * It reads the section's rect once per animation frame at most and writes only custom properties: no layout work.
 *
 * The timecode is a scroll-position readout (24 frames per second over a 40 second timeline), not a claim about any real film.
 */
const FPS = 24;
const SECONDS = 40;
const CHAPTERS = 4;
const NEAR_SCREENS = 3;

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (x: number) => x * x * (3 - 2 * x);

function timecode(p: number): string {
  const frames = Math.round(p * FPS * SECONDS);
  const ff = frames % FPS;
  const ss = Math.floor(frames / FPS) % 60;
  const mm = Math.floor(frames / (FPS * 60));
  const two = (n: number) => String(n).padStart(2, '0');
  return `00:${two(mm)}:${two(ss)}:${two(ff)}`;
}

export function initFilm(): () => void {
  const film = document.querySelector<HTMLElement>('[data-film]');
  if (!film) return () => {};
  const tc = film.querySelector<HTMLElement>('[data-film-tc]');

  let raf = 0;
  let lastChapter = -1;
  let lastTc = '';
  let near = false;
  let postersLoaded = false;

  // The poster stills are the film's picture wherever the WebGL layer does not draw it: on devices that never start it, and on
  // capable devices where it could not start or shut itself down later (no WebGL2, a slow GPU, a lost context). Loaded once.
  const loadPosters = () => {
    if (postersLoaded) return;
    postersLoaded = true;
    for (const source of film.querySelectorAll<HTMLSourceElement>('source[data-srcset]')) source.srcset = source.dataset.srcset ?? '';
    for (const img of film.querySelectorAll<HTMLImageElement>('img[data-src]')) img.src = img.dataset.src ?? '';
  };
  const onCinemaOff = () => {
    if (near) loadPosters();
  };

  const update = () => {
    raf = 0;
    const rect = film.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const p = clamp(-rect.top / Math.max(1, rect.height - vh));
    const visible = smooth(clamp(Math.min(1 - rect.top / vh, rect.bottom / vh)));

    film.style.setProperty('--p', p.toFixed(4));

    // Close to the film (three screens ahead): the chapter face (Syne) and, where the WebGL layer will not draw it, the posters
    // start loading. Neither is fetched on first load, so they do not compete with the critical path (docs/adr/0014).
    if (!near && rect.top < vh * NEAR_SCREENS) {
      near = true;
      film.dataset.near = '';
      if (!cinemaCapable() || cinemaStatus.failed) loadPosters();
    }

    const chapter = Math.min(CHAPTERS - 1, Math.floor(p * CHAPTERS));
    if (chapter !== lastChapter) {
      lastChapter = chapter;
      film.dataset.chapter = String(chapter);
    }
    const code = timecode(p);
    if (tc && code !== lastTc) {
      lastTc = code;
      tc.textContent = code;
    }

    // The WebGL engine reads these. Chapter centres sit at p = 0.125, 0.375, 0.625, 0.875, which are scenes 0..3.
    cinemaState.local = p;
    cinemaState.scene = clamp(p * CHAPTERS - 0.5, 0, CHAPTERS - 1);
    cinemaState.amb = 1 - visible;
    cinemaState.gain = AMBIENT_GAIN + (1 - AMBIENT_GAIN) * visible;
  };

  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(update);
  };

  // The CSS sizes each chapter word from its letter count (a conservative estimate). This measures the real width and shrinks a
  // word that still overflows its container, whatever the language or the font that ends up rendering it. It runs once the fonts are
  // loaded and on resize, never while scrolling.
  let fitRaf = 0;
  const fitWords = () => {
    fitRaf = 0;
    for (const word of film.querySelectorAll<HTMLElement>('.chapter-word')) {
      word.style.fontSize = '';
      if (word.scrollWidth - word.clientWidth > 1) {
        const size = parseFloat(getComputedStyle(word).fontSize);
        word.style.fontSize = `${((size * word.clientWidth) / word.scrollWidth) * 0.985}px`;
      }
    }
  };
  const scheduleFit = () => {
    if (!fitRaf) fitRaf = requestAnimationFrame(fitWords);
  };

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('resize', scheduleFit);
  window.addEventListener(CINEMA_OFF_EVENT, onCinemaOff);
  void document.fonts?.ready.then(scheduleFit);
  // Syne arrives later than the first fonts (it is only requested when the film is near): measure again when any font finishes.
  document.fonts?.addEventListener('loadingdone', scheduleFit);
  update();
  scheduleFit();

  return () => {
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    window.removeEventListener('resize', scheduleFit);
    window.removeEventListener(CINEMA_OFF_EVENT, onCinemaOff);
    document.fonts?.removeEventListener('loadingdone', scheduleFit);
    if (raf) cancelAnimationFrame(raf);
    if (fitRaf) cancelAnimationFrame(fitRaf);
    cinemaState.scene = 3;
    cinemaState.amb = 1;
    cinemaState.local = 0;
    cinemaState.gain = AMBIENT_GAIN;
  };
}
