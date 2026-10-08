// Sayfadaki sohbet simülatörlerini başlatır:
//  - Hero telefonu: görünür olunca genel senaryoyu bir kez oynatır (otomatik döngü yok; ~4 sn, WCAG 2.2.2 dostu).
//  - "Sizin Sektörünüz" kartı: kullanıcı sektör seçtikçe o sektörün senaryosunu oynatır (kullanıcı tetikli).
import { scenarios } from '../core/scenarios.js';
import { ChatSim } from './chat-sim.js';

const byId = Object.fromEntries(scenarios.map((s) => [s.id, s]));

function whenVisible(el, cb, threshold) {
  if (!('IntersectionObserver' in window)) { cb(); return; }
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { io.disconnect(); cb(); }
  }, { threshold });
  io.observe(el);
}

export function initSims() {
  const hero = document.querySelector('[data-sim="hero"]');
  if (hero) {
    const sim = new ChatSim(hero).render(byId.genel);
    whenVisible(hero, () => sim.play(), 0.6);
  }

  const own = document.querySelector('[data-own]');
  if (own) {
    const sim = new ChatSim(own.querySelector('[data-sim]')).render(byId.genel, { tag: false }).showFinal();
    const setup = own.querySelector('[data-setup]');
    own.addEventListener('choose', (e) => {
      if (e.detail.group !== 'Sektör') return;
      const sc = byId[e.detail.id] || byId.genel;
      sim.render(sc, { tag: false }).play();
      if (setup) setup.textContent = sc.setup;
    });
  }
}
