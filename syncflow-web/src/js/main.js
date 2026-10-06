// Giriş noktası: scripts/build-js.mjs bunu assets/js/main.js içine paketler (IIFE, minify).
// Her modül ayrı korunur; biri hata verse bile talep akışı (lead) çalışmaya devam eder.
import { initLead } from './lead.js';
import { initSims } from './sims.js';
import { initReveal } from './reveal.js';

const run = (fn) => {
  try { fn(); } catch (e) { /* sessiz: süs animasyonları asla işlevi bozmasın */ }
};

// Talep akışı yalnızca dinleyici bağlar ve düzen okumaz: hemen çalışır.
run(initLead);

// Süs animasyonları ilk boyamadan SONRA ve ayrı görevlerde başlar. Böylece ilk boyama (FCP/LCP) gecikmez,
// sayfanın ilk düzen hesabı bizim script'imizin içinde yapılmaz (zorunlu reflow yok) ve uzun görev (TBT) oluşmaz.
// requestAnimationFrame ilk kareyi bekler; setTimeout o karenin boyanmasından sonra çalışmayı garanti eder.
const afterPaint = (fn) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => setTimeout(fn, 0)) : setTimeout(fn, 0));
afterPaint(() => {
  run(initReveal);
  afterPaint(() => run(initSims));
});
