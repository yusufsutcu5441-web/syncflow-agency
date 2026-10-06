import { motionValue, scroll, springValue, styleEffect } from 'framer-motion/dom';

/**
 * "Liquid line": a hairline on the left edge that fills as the page scrolls, smoothed by a spring so it
 * flows rather than ticks. Transform-only (scaleY), so it never triggers layout or paint of the page.
 */
export function initScrollLine(): () => void {
  const line = document.createElement('div');
  line.className = 'scroll-line';
  line.setAttribute('aria-hidden', 'true');
  const fill = document.createElement('i');
  line.append(fill);
  document.body.append(line);

  const progress = motionValue(0);
  const smooth = springValue(progress, { stiffness: 110, damping: 26, mass: 0.5 });
  const stopEffect = styleEffect(fill, { scaleY: smooth });
  const stopScroll = scroll((value: number) => progress.set(value));

  return () => {
    stopScroll();
    stopEffect();
    line.remove();
  };
}
