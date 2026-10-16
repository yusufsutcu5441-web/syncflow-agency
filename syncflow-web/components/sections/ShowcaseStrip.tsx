'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useClientI18n } from '@/components/i18n/ClientI18n';

/**
 * The showcase cards in a native horizontally scrolling strip with scroll-snap. The page never hijacks the wheel: vertical
 * scrolling stays vertical, the strip moves with a trackpad swipe, touch, the arrow keys (it is focusable) or these two
 * buttons. Works in both writing directions (scrollLeft is negative in right-to-left).
 */
export function ShowcaseStrip({ children }: { children: ReactNode }) {
  const { messages } = useClientI18n();
  const t = messages.Showcase;
  const strip = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const update = useCallback(() => {
    const element = strip.current;
    if (!element) return;
    const max = element.scrollWidth - element.clientWidth;
    const position = Math.abs(element.scrollLeft);
    const start = position < 4;
    const end = position > max - 4;
    // The scroll event fires many times a second and almost always reports the same edges: an equal state must not render again.
    setEdge((previous) => (previous.start === start && previous.end === end ? previous : { start, end }));
  }, []);

  useEffect(() => {
    const element = strip.current;
    if (!element) return;
    // The first measurement waits until the strip is near the screen. It sits in a block the renderer skips until then (content-visibility:
    // auto, docs/adr/0021 §1), and reading its width during hydration would make the browser lay that whole block out.
    const near = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        near.disconnect();
        update();
      },
      { rootMargin: '300px 0px' },
    );
    near.observe(element);
    element.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      near.disconnect();
      element.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [update]);

  const go = (direction: 1 | -1) => {
    const element = strip.current;
    if (!element) return;
    const card = element.querySelector<HTMLElement>('.show-card');
    const step = (card?.getBoundingClientRect().width ?? element.clientWidth) + 20;
    const rtl = getComputedStyle(element).direction === 'rtl';
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollBy({ left: direction * step * (rtl ? -1 : 1), behavior: reduced ? 'auto' : 'smooth' });
  };

  return (
    <div className="mt-12">
      <div className="container-x mb-5 flex justify-end gap-2">
        <button type="button" className="strip-btn" onClick={() => go(-1)} disabled={edge.start} aria-label={t.prev}>
          <ArrowLeft size={18} strokeWidth={1.5} aria-hidden="true" className="icon-dir" />
        </button>
        <button type="button" className="strip-btn" onClick={() => go(1)} disabled={edge.end} aria-label={t.next}>
          <ArrowRight size={18} strokeWidth={1.5} aria-hidden="true" className="icon-dir" />
        </button>
      </div>
      <div ref={strip} className="strip" role="region" aria-label={t.stripLabel} tabIndex={0}>
        {children}
      </div>
    </div>
  );
}
