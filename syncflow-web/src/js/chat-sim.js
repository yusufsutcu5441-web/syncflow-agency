// WhatsApp simülatörü: scenarios.js zaman çizelgesini Motion (WAAPI) ile oynatır.
// Yalnızca opacity + translate + scale animasyonu yapar (compositor dostu), düzen kaymasına yol açmaz;
// sohbet alanı sabit yükseklikli bir kutudur ve gizli öğeler yerini korur (opacity, display değil).
import { animate } from './motion.js';
import { motion as M } from '../core/tokens.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const prefersReduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// JS ile üretilen düğümlerde CSS "yedek" animasyonunu kapat (yedek yalnızca JS yokken devreye girer)
function make(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  n.style.animation = 'none';
  return n;
}

function bubble(kind, st) {
  const p = make('p', `bubble bubble-${kind}`, st.text);
  p.append(make('small', '', st.meta));
  return p;
}

function clockIcon() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'h-3.5 w-3.5');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', '#i-clock');
  svg.append(use);
  return svg;
}

export class ChatSim {
  constructor(root) {
    this.root = root;
    this.chat = root.querySelector('.chat');
    this.items = [];
    this.anims = [];
    this.timers = [];
  }

  // Senaryoyu DOM'a çizer (metinler textContent ile yazılır). Düğümler CSS ile gizli başlar.
  render(sc, { tag = true } = {}) {
    this.stop();
    const set = (sel, v) => { const n = this.root.querySelector(sel); if (n) n.textContent = v; };
    set('[data-avatar]', sc.brand.initial);
    set('[data-name]', sc.brand.name);
    set('[data-status]', sc.brand.status);
    this.chat.replaceChildren();
    this.items = [];
    const steps = sc.steps;
    for (let i = 0; i < steps.length; i++) {
      const st = steps[i];
      if (st.type === 'in' || st.type === 'out') {
        const node = bubble(st.type, st);
        this.chat.append(node);
        this.items.push({ kind: 'bubble', node, st });
      } else if (st.type === 'typing' && steps[i + 1] && steps[i + 1].type === 'out') {
        const out = steps[++i];
        const slot = make('div', 'slot');
        const typing = make('span', 'typing');
        typing.setAttribute('aria-hidden', 'true');
        typing.append(make('i'), make('i'), make('i'));
        const node = bubble('out', out);
        slot.append(typing, node);
        this.chat.append(slot);
        this.items.push({ kind: 'reply', node, typing, st: out, tst: st });
      } else if (st.type === 'tag' && tag) {
        const node = make('p', 'tag');
        node.append(clockIcon(), st.text);
        this.chat.append(node);
        this.items.push({ kind: 'tag', node, st });
      }
    }
    return this;
  }

  hide() {
    this.items.forEach(({ node, typing }) => {
      node.style.opacity = '0';
      if (typing) typing.style.opacity = '0';
    });
  }

  // Animasyonsuz son durum (azaltılmış hareket tercihi, ilk görünüm)
  showFinal() {
    this.stop();
    this.items.forEach(({ node, typing }) => {
      node.style.opacity = '1';
      if (typing) typing.style.opacity = '0';
    });
    return this;
  }

  stop() {
    this.anims.forEach((a) => { if (a.cancel) a.cancel(); else if (a.stop) a.stop(); });
    this.timers.forEach(clearTimeout);
    this.anims = [];
    this.timers = [];
  }

  play() {
    this.stop();
    if (prefersReduced()) return this.showFinal();
    this.hide();
    const { ease, bubble: B, typing: T, tag: G } = M;
    const run = (...args) => { const a = animate(...args); this.anims.push(a); return a; };
    try {
      for (const it of this.items) {
        if (it.kind === 'tag') {
          run(it.node, { opacity: [0, 1], translate: [`0 ${G.y}px`, '0 0'], scale: [G.scaleFrom, 1] }, { duration: G.duration, delay: it.st.at, ease });
          continue;
        }
        if (it.kind === 'reply') {
          // "Yazıyor…" göstergesi: tek animasyon, çok kareli (gecikmeli iki animasyon ilk kareyi bekleme boyunca uygular)
          const dur = T.fade * 2 + it.tst.duration;
          it.typing.classList.add('on');
          run(it.typing, { opacity: [0, 1, 1, 0] }, { duration: dur, delay: it.tst.at, times: [0, T.fade / dur, (T.fade + it.tst.duration) / dur, 1], ease: 'linear' });
          this.timers.push(setTimeout(() => it.typing.classList.remove('on'), (it.tst.at + dur) * 1000 + 80));
        }
        run(it.node, { opacity: [0, 1], translate: [`0 ${B.y}px`, '0 0'], scale: [B.scaleFrom, 1] }, { duration: B.duration, delay: it.st.at, ease });
      }
    } catch (e) {
      this.showFinal();
    }
    return this;
  }
}
