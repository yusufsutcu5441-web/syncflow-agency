import { motionValue, springValue, styleEffect } from 'framer-motion/dom';

/**
 * Magnetic buttons. A button marked data-magnetic leans toward the pointer and settles back on a spring.
 * The "pull zone" is a little larger than the button (see [data-magnetic]::before in globals.css).
 * Mouse and pen only; touch never triggers it.
 */

const PULL = 0.34;
const MAX_OFFSET = 14;
const SPRING = { stiffness: 210, damping: 15, mass: 0.55 } as const;

const clamp = (value: number) => Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, value));

export function initMagnetic(): () => void {
  const cleanups: Array<() => void> = [];

  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    const targetX = motionValue(0);
    const targetY = motionValue(0);
    const stopEffect = styleEffect(el, { x: springValue(targetX, SPRING), y: springValue(targetY, SPRING) });

    // Measured once when the pointer arrives (the button is at rest then), so the centre does not drift as it moves.
    let centerX = 0;
    let centerY = 0;

    const onEnter = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const rect = el.getBoundingClientRect();
      centerX = rect.left + rect.width / 2;
      centerY = rect.top + rect.height / 2;
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      targetX.set(clamp((event.clientX - centerX) * PULL));
      targetY.set(clamp((event.clientY - centerY) * PULL));
    };
    const onLeave = () => {
      targetX.set(0);
      targetY.set(0);
    };

    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);

    cleanups.push(() => {
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      stopEffect();
      el.style.transform = '';
    });
  });

  return () => cleanups.forEach((fn) => fn());
}
