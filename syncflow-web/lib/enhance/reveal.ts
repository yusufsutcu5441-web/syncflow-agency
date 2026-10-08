import { EASE_LUX, MASK } from '@/lib/motion/tokens';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const ARMED = 'is-armed';
/** How long a revealed element may wait for the Motion chunk before it is simply shown. */
const MOTION_WAIT_MS = 1500;

type Animate = typeof import('motion/mini').animate;
type Controls = ReturnType<Animate>;

/**
 * Masked entrance for text below the fold (docs/adr/0004-motion-and-smooth-scroll.md). Elements opt in with
 * data-reveal="words" (a headline already split into masked words by components/ui/MaskText) or data-reveal="block"
 * (a paragraph, wrapped in one mask here). The words or the block slide up through their mask, once.
 *
 * Rules that keep the page fast, stable and readable:
 *  - Only elements that start BELOW the fold are hidden, and only once they are within one screen of it, so the work is
 *    spread over the visitor's scrolling instead of landing in one task at load. Everything the visitor sees first is
 *    never touched, so the first paint (and the LCP text) is exactly the server's HTML. The hero entrance is pure CSS
 *    for that reason.
 *  - Hiding is done here, in script, after first paint, so with JavaScript off every word is simply visible.
 *  - Fail open: if the Motion chunk is slow or missing, the text is shown, never left hidden.
 *  - Only transform moves (compositor-friendly). The mask is a static clip-path, so no layout and no paint-heavy
 *    property is animated. CLS stays 0 because nothing changes size.
 *  - Motion itself ('motion/mini', the small WAAPI animate) is fetched on the visitor's first scroll, pointer, touch or
 *    key press, not at load, so a visitor who only looks at the first screen never downloads it.
 *  - prefers-reduced-motion: nothing is armed; if the setting turns on later, everything is shown at once.
 */
export function initReveal(): () => void {
  const reducedMotion = window.matchMedia(REDUCED_MOTION);
  if (reducedMotion.matches) return () => {};

  const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
  if (targets.length === 0) return () => {};

  const armed = new Set<HTMLElement>();
  const running = new Set<Controls>();
  let motion: Promise<Animate | null> | null = null;
  let disposed = false;

  const loadMotion = () => (motion ??= import('motion/mini').then((module) => module.animate).catch(() => null));

  const arm = (element: HTMLElement) => {
    if (element.dataset.reveal === 'block') wrapBlock(element);
    element.classList.add(ARMED);
    armed.add(element);
  };

  const disarm = (element: HTMLElement) => {
    armed.delete(element);
    element.classList.remove(ARMED);
    if (element.dataset.reveal === 'block') unwrapBlock(element);
    for (const word of element.querySelectorAll<HTMLElement>('.mi')) word.style.removeProperty('transform');
  };

  const reveal = async (element: HTMLElement) => {
    revealObserver.unobserve(element);
    const animate = await Promise.race([loadMotion(), new Promise<null>((resolve) => window.setTimeout(() => resolve(null), MOTION_WAIT_MS))]);
    if (disposed || !armed.has(element)) return;
    if (!animate) return disarm(element);

    const words = Array.from(element.querySelectorAll<HTMLElement>('.mi'));
    // The distance a word waits below its mask is a CSS variable (Arabic and Japanese need more room than Latin).
    const distance = getComputedStyle(document.documentElement).getPropertyValue('--mask-dist').trim() || `${MASK.distance}%`;
    let remaining = words.length;
    words.forEach((word, index) => {
      const order = Number.parseFloat(word.style.getPropertyValue('--i'));
      const controls = animate(
        word,
        { transform: [`translateY(${distance})`, 'translateY(0%)'] },
        { duration: MASK.duration, delay: MASK.delay + (Number.isFinite(order) ? order : index) * MASK.wordStagger, ease: [...EASE_LUX] },
      );
      running.add(controls);
      void controls.then(() => {
        running.delete(controls);
        if (--remaining === 0 && !disposed) disarm(element);
      });
    });
  };

  // Two observers. The first arms an element only when it comes within one screen below the fold: the work is spread
  // over the visitor's scrolling, and a visitor who never scrolls costs nothing. It is still off screen then, so nothing
  // visible ever changes. The second plays the entrance once the element is on screen.
  const armObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target as HTMLElement;
        armObserver.unobserve(element);
        // Still below the fold: arm it. Anything already in view (or above it) stays exactly as the server rendered it.
        if (entry.boundingClientRect.top >= window.innerHeight) {
          arm(element);
          revealObserver.observe(element);
        }
      }
    },
    { rootMargin: '0px 0px 100% 0px' },
  );
  const revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const element = entry.target as HTMLElement;
        if (entry.isIntersecting && armed.has(element)) void reveal(element);
      }
    },
    { threshold: 0.01, rootMargin: '0px 0px -6% 0px' },
  );
  for (const element of targets) armObserver.observe(element);

  // Fetch Motion once the visitor shows intent, so it is ready before the first armed element scrolls into view.
  const intent = ['scroll', 'wheel', 'pointerdown', 'touchstart', 'keydown'] as const;
  const onIntent = () => {
    void loadMotion();
    for (const name of intent) window.removeEventListener(name, onIntent);
  };
  for (const name of intent) window.addEventListener(name, onIntent, { passive: true });

  const showAll = () => {
    for (const controls of running) controls.cancel();
    running.clear();
    for (const element of [...armed]) disarm(element);
  };
  const onReducedMotion = () => {
    if (reducedMotion.matches) showAll();
  };
  reducedMotion.addEventListener('change', onReducedMotion);

  return () => {
    disposed = true;
    armObserver.disconnect();
    revealObserver.disconnect();
    for (const name of intent) window.removeEventListener(name, onIntent);
    reducedMotion.removeEventListener('change', onReducedMotion);
    showAll();
  };
}

/** Wraps a paragraph's content in one mask so the whole block can slide up through it. */
function wrapBlock(element: HTMLElement): void {
  const mask = document.createElement('span');
  mask.className = 'mw mw-block';
  const inner = document.createElement('span');
  inner.className = 'mi mi-block';
  while (element.firstChild) inner.appendChild(element.firstChild);
  mask.appendChild(inner);
  element.appendChild(mask);
}

function unwrapBlock(element: HTMLElement): void {
  const mask = element.querySelector(':scope > .mw-block');
  const inner = mask?.firstElementChild;
  if (!mask || !inner) return;
  while (inner.firstChild) element.insertBefore(inner.firstChild, mask);
  mask.remove();
}
