// Kaydırmayla yumuşak belirme (fade-up) ve kademeli (stagger) çocuklar.
//  - Yalnızca opacity + translate: düzen kayması yok.
//  - Yalnızca ilk görünümün ALTINDAKİ öğeler gizlenir; ekranda olanlara dokunulmaz (LCP ve ilk boyama güvende).
//  - JS yüklenmezse hiçbir şey gizli kalmaz (gizleme, JS çalışınca yapılır).
//  - Aynı anda görünür hale gelen öğeler sırayla (stagger) belirir; alt alta duranlar kendi sırasında.
import { animate } from './motion.js';
import { motion as M } from '../core/tokens.js';

export function initReveal() {
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const all = Array.from(document.querySelectorAll('[data-reveal]'));
  document.querySelectorAll('[data-stagger]').forEach((box) => all.push(...box.children));
  const fold = innerHeight * 0.92;
  const pending = all.filter((el) => el.getBoundingClientRect().top > fold);
  if (!pending.length) return;

  const { y, duration, stagger } = M.reveal;
  pending.forEach((el) => {
    el.style.opacity = '0';
    el.style.translate = `0 ${y}px`;
  });

  const io = new IntersectionObserver((entries) => {
    entries
      .filter((e) => e.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left)
      .forEach((e, i) => {
        io.unobserve(e.target);
        animate(e.target, { opacity: [0, 1], translate: [`0 ${y}px`, '0 0'] }, { duration, delay: i * stagger, ease: M.ease });
      });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  pending.forEach((el) => io.observe(el));
}
