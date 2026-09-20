/* ============================================================
   DEVTALKS — GLASS BENTO CARD TILT
   ------------------------------------------------------------
   Turns the speaker cards into tiltable 3D glass slabs and drops
   a floating topic icon into each one.

   Pointer on desktop, drag on touch. Everything it writes is a
   transform or a custom property, so the compositor does the
   work and layout is never touched.

   It also pulses the hero waveform on tap, so the two sections
   are connected rather than two unrelated effects on one page.

   Tuning knobs are in CONFIG.
   ============================================================ */

(function () {
  'use strict';

  const CONFIG = {
    maxTilt:   13,    // degrees at the corner of a card
    lift:      18,    // px the card rises toward the viewer
    ease:    0.14,    // how quickly it follows
    settle:  0.10     // how quickly it returns
  };

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- topic icons, drawn inline so there is nothing to download ---- */
  const ICONS = {
    terminal: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 9l3 3-3 3M13 15h5"/></svg>',
    chip:     '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M4 10h3M4 14h3M17 10h3M17 14h3M10 4v3M14 4v3M10 17v3M14 17v3"/></svg>',
    opensource:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v6M9 20.2l2.2-5.6M15 20.2l-2.2-5.6"/></svg>',
    stack:    '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5M3 16.5l9 5 9-5"/></svg>',
    wave:     '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><path d="M2 12h2.5M7 5v14M11.5 8.5v7M16 3v18M20.5 9v6M22 12h0"/></svg>'
  };
  const FALLBACK = ['terminal', 'chip', 'opensource'];

  function iconFor(speaker, i) {
    if (speaker && speaker.icon && ICONS[speaker.icon]) return ICONS[speaker.icon];
    const tag = (speaker && speaker.tags && speaker.tags[0] || '').toLowerCase();
    if (/infra|scale|system/.test(tag))       return ICONS.stack;
    if (/ai|research|model|data/.test(tag))   return ICONS.chip;
    if (/open|source/.test(tag))              return ICONS.opensource;
    if (/design|product/.test(tag))           return ICONS.wave;
    if (/startup|engineer|found/.test(tag))   return ICONS.terminal;
    return ICONS[FALLBACK[i % FALLBACK.length]];
  }

  /* ---- tilt ---- */
  function wire(card) {
    let tx = 0, ty = 0, cx = 0, cy = 0, active = false, raf = null;
    let dragging = false, startX = 0, startY = 0;

    const frame = () => {
      const k = active ? CONFIG.ease : CONFIG.settle;
      cx += (tx - cx) * k;
      cy += (ty - cy) * k;
      card.style.transform =
        'perspective(1400px) rotateX(' + (cy * CONFIG.maxTilt).toFixed(2) + 'deg) ' +
        'rotateY(' + (cx * CONFIG.maxTilt).toFixed(2) + 'deg) ' +
        'translate3d(0,0,' + (active ? CONFIG.lift : 0) + 'px)';
      // the sheen follows the tilt, so the glass looks lit from one side
      card.style.setProperty('--sheen-angle', (130 + cx * 55).toFixed(0) + 'deg');

      if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) {
        raf = requestAnimationFrame(frame);
      } else { raf = null; }
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

    const setFromPoint = (clientX, clientY) => {
      const r = card.getBoundingClientRect();
      tx =  ((clientX - r.left) / r.width  - 0.5) * 2;
      ty = -((clientY - r.top)  / r.height - 0.5) * 2;
      kick();
    };

    // desktop: hover to tilt
    if (window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
      card.addEventListener('pointerenter', () => { active = true; card.classList.add('is-tilting'); });
      card.addEventListener('pointermove', (e) => setFromPoint(e.clientX, e.clientY));
      card.addEventListener('pointerleave', () => {
        active = false; card.classList.remove('is-tilting');
        tx = 0; ty = 0; kick();
      });
    } else {
      // touch: drag to tilt. Non-passive only once a drag is under way, so
      // vertical scrolling is never blocked by accident.
      card.addEventListener('touchstart', (e) => {
        const t = e.touches[0];
        startX = t.clientX; startY = t.clientY; dragging = false;
        active = true; card.classList.add('is-tilting'); kick();
      }, { passive: true });

      card.addEventListener('touchmove', (e) => {
        const t = e.touches[0];
        const dx = t.clientX - startX, dy = t.clientY - startY;
        if (!dragging && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) dragging = true;
        if (!dragging) return;          // still looks like a scroll — leave it alone
        e.preventDefault();
        tx = Math.max(-1, Math.min(1, dx / (card.offsetWidth * 0.5)));
        ty = Math.max(-1, Math.min(1, -dy / (card.offsetHeight * 0.5)));
        kick();
      }, { passive: false });

      const end = () => {
        active = false; card.classList.remove('is-tilting');
        tx = 0; ty = 0; kick();
      };
      card.addEventListener('touchend', end, { passive: true });
      card.addEventListener('touchcancel', end, { passive: true });
    }

    // tapping a speaker kicks the hero waveform, tying the two together
    card.addEventListener('pointerdown', () => {
      if (window.DevTalksHero && window.DevTalksHero.pulse) window.DevTalksHero.pulse(0.9);
    }, { passive: true });
  }

  function init() {
    const cards = document.querySelectorAll('.spk');
    if (!cards.length) return;

    const list = (typeof SPEAKERS !== 'undefined') ? SPEAKERS : [];

    cards.forEach((card, i) => {
      // the unfold and the tilt both write transform; on this page the tilt owns it
      card.removeAttribute('data-tilt');
      card.removeAttribute('data-reveal');

      const topic = document.createElement('span');
      topic.className = 'spk__topic';
      topic.setAttribute('aria-hidden', 'true');
      topic.innerHTML = iconFor(list[i], i);
      card.appendChild(topic);

      if (!REDUCED) wire(card);
    });

    // touch has no hover, so the affordance is stated instead of discovered
    const head = document.querySelector('.sec--speakers .sec__head');
    if (head && !document.querySelector('.speakers__hint')) {
      const hint = document.createElement('p');
      hint.className = 'speakers__hint';
      hint.textContent = 'Drag a card sideways to tilt it';
      head.appendChild(hint);
    }
  }

  document.addEventListener('devtalks:content', init, { once: true });
})();
