// Talep akışı: WhatsApp hazır mesajı, seçim çipleri, alttan açılan form, sabit alt çubuk, takvim bağlantısı.
// Yapılandırma tek noktadan: <body data-wa="905…" data-endpoint="" data-cal="">
const d = document;
const $ = (s, r = d) => r.querySelector(s);
const $$ = (s, r = d) => Array.from(r.querySelectorAll(s));
const safe = (fn, fallback = '') => { try { return fn(); } catch (e) { return fallback; } };

export function initLead() {
  const b = d.body;
  const WA = b.dataset.wa || '';
  const EP = b.dataset.endpoint || '';
  const CAL = b.dataset.cal || '';

  // Kaynak: utm > oturumda saklanan > referrer > doğrudan
  const qs = new URLSearchParams(location.search);
  const utm = ['utm_source', 'utm_medium', 'utm_campaign'].map((k) => qs.get(k)).filter(Boolean).join(' / ');
  if (utm) safe(() => sessionStorage.setItem('sf_src', utm));
  const src = utm || safe(() => sessionStorage.getItem('sf_src')) || safe(() => new URL(d.referrer).hostname) || 'doğrudan';

  const wa = (text) => `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;

  // Kişisel veri içermeyen niyet olayı; yalnızca data-endpoint (n8n/Make webhook) doluysa gönderilir
  const ping = (o) => {
    if (!EP) return;
    safe(() => fetch(EP, {
      method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ ...o, src, page: location.pathname, t: new Date().toISOString() }),
    }).catch(() => {}));
  };

  // Seçim çipleri -> WhatsApp hazır mesajı (sektör / hizmet / bölge / bütçe / paket)
  $$('[data-compose]').forEach((box) => {
    const go = $('[data-go]', box);
    const sel = {};
    const build = () => {
      const lines = [box.dataset.head || 'Merhaba SyncFlow, ücretsiz analiz almak istiyorum.'];
      Object.keys(sel).forEach((k) => lines.push(`${k}: ${sel[k]}`));
      if (box.dataset.pkg) lines.push(`Paket: ${box.dataset.pkg}`);
      lines.push(`Kaynak: ${src}`, `Sayfa: ${location.pathname}`);
      go.href = wa(lines.join('\n'));
    };
    box.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-val]');
      if (!chip || !box.contains(chip)) return;
      const g = chip.dataset.group;
      $$('[data-val]', box).filter((c) => c.dataset.group === g).forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      sel[g] = chip.dataset.val;
      build();
      // Diğer modüller (ör. "Sizin Sektörünüz" kartı) seçime tepki verebilsin
      box.dispatchEvent(new CustomEvent('choose', { bubbles: true, detail: { group: g, value: chip.dataset.val, id: chip.dataset.scenario || '' } }));
    });
    go.addEventListener('click', () => ping({ type: 'wa_click', ...sel, pkg: box.dataset.pkg || '' }));
    box.rebuild = build;
    build();
  });

  // Tek dokunuşluk WhatsApp bağlantıları (sabit çubuk, demo kartları)
  $$('[data-wa]').forEach((a) => {
    const text = a.dataset.waText || 'Merhaba SyncFlow, ücretsiz analiz almak istiyorum.';
    a.href = wa(`${text}\nKaynak: ${src}\nSayfa: ${location.pathname}`);
    a.addEventListener('click', () => ping({ type: 'wa_click', where: a.dataset.where || 'bar' }));
  });

  // Alttan açılan form (<dialog>); desteklenmiyorsa bağlantı #basla bölümüne kayar
  const sheet = $('#leadSheet');
  if (sheet && typeof sheet.showModal === 'function') {
    const box = $('[data-compose]', sheet);
    $$('[data-open-sheet]').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      box.dataset.pkg = a.dataset.pkg || '';
      box.rebuild();
      sheet.showModal();
    }));
    sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); });
    $$('[data-close]', sheet).forEach((x) => x.addEventListener('click', () => sheet.close()));
  }

  // Sabit alt çubuk: Hero CTA görünümden çıkınca açılır, kapanış bölümünde gizlenir
  const bar = $('#stickyCta');
  const hero = $('#heroCta');
  const fin = $('#basla');
  if (bar && hero && fin && 'IntersectionObserver' in window) {
    let past = false;
    let end = false;
    const update = () => { bar.dataset.show = String(past && !end); };
    new IntersectionObserver(([e]) => { past = !e.isIntersecting && e.boundingClientRect.top < 0; update(); }).observe(hero);
    new IntersectionObserver(([e]) => { end = e.isIntersecting; update(); }, { threshold: 0.2 }).observe(fin);
  }

  // İsteğe bağlı takvim bağlantısı
  if (CAL) {
    $$('[data-cal]').forEach((a) => { a.href = CAL; });
    $$('[data-cal-wrap]').forEach((w) => { w.hidden = false; });
  }
}
