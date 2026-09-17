/* ============================================================
   DEVTALKS — SPEAKER CARD UNFOLD
   ------------------------------------------------------------
   Each speaker card starts small and turned away from the
   viewer, then unfolds flat as it rises into view: the
   perspective taper unwinds, it grows to full size, and the
   opacity comes up. Cards cascade left to right.

   Same performance rules as js/parallax.js:
   • one rAF loop, and it stops as soon as every card has settled
   • zero layout reads per frame — positions measured on load
     and on resize only
   • IntersectionObserver decides which cards are worth computing
   • will-change is dropped the moment a card finishes moving
   • transform + opacity only, so nothing ever triggers layout

   Tuning knobs are in CONFIG.
   ============================================================ */

(function () {
  'use strict';

  const CONFIG = {
    rotateY:  -24,   // deg the card is turned away before it unfolds
    rotateX:    6,   // deg it is tipped back
    scale:   0.72,   // starting size
    shiftX:    -6,   // % it sits to the left
    shiftY:     34,  // px it sits below its resting place
    fade:    0.28,   // starting opacity
    persp:   1500,   // px — lower is a more aggressive taper
    travel:  0.62,   // how much of a screen height the unfold takes
    stagger:   70    // px of scroll between one card starting and the next
  };

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let vh = window.innerHeight, scrollY = window.scrollY;
  let cards = [], running = false;
  const live = new Set();

  const clamp = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
  // easeOutCubic — fast release, long settle, which is what makes it read
  // as something unfolding rather than sliding
  const ease  = (t) => 1 - Math.pow(1 - t, 3);

  // Layout position, unaffected by the transform already sitting on the card.
  function docTop(el) {
    let y = 0;
    for (let n = el; n; n = n.offsetParent) y += n.offsetTop;
    return y;
  }

  function collect() {
    const els = document.querySelectorAll('.spk');
    if (!els.length) return;
    cards = [];
    els.forEach((el, i) => cards.push({ el: el, i: i, top: docTop(el), settled: false }));
  }

  function draw() {
    live.forEach(c => {
      const p = ease(clamp(
        (scrollY + vh - c.top - c.i * CONFIG.stagger) / (vh * CONFIG.travel)
      ));
      const inv = 1 - p;

      c.el.style.transform =
        'perspective(' + CONFIG.persp + 'px) ' +
        'translate3d(' + (CONFIG.shiftX * inv).toFixed(2) + '%,' +
                         (CONFIG.shiftY * inv).toFixed(1) + 'px,0) ' +
        'rotateY(' + (CONFIG.rotateY * inv).toFixed(2) + 'deg) ' +
        'rotateX(' + (CONFIG.rotateX * inv).toFixed(2) + 'deg) ' +
        'scale(' + (CONFIG.scale + (1 - CONFIG.scale) * p).toFixed(4) + ')';
      c.el.style.opacity = (CONFIG.fade + (1 - CONFIG.fade) * p).toFixed(3);

      // Once a card is fully open it never needs compositing hints again.
      const done = p >= 0.999;
      if (done !== c.settled) {
        c.settled = done;
        c.el.classList.toggle('is-settled', done);
      }
    });
  }

  function frame() {
    scrollY = window.scrollY;
    draw();
    // keep the loop alive only while a visible card still has somewhere to go
    let busy = false;
    live.forEach(c => { if (!c.settled) busy = true; });
    if (busy && !document.hidden) requestAnimationFrame(frame);
    else running = false;
  }

  function start() {
    if (running || document.hidden) return;
    running = true;
    requestAnimationFrame(frame);
  }

  function observe() {
    if (!('IntersectionObserver' in window)) {
      cards.forEach(c => live.add(c));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        const card = cards.find(c => c.el === e.target);
        if (!card) return;
        if (e.isIntersecting) { live.add(card); start(); }
        else live.delete(card);
      });
    }, { rootMargin: '260px 0px' });
    cards.forEach(c => io.observe(c.el));
  }

  function measure() {
    vh = window.innerHeight;
    collect();
    live.clear();
    cards.forEach(c => live.add(c));
    scrollY = window.scrollY;
    draw();
    start();
  }

  function init() {
    const els = document.querySelectorAll('.spk');
    if (!els.length) return;

    // The 3D tilt in main.js writes to the same transform property on these
    // very elements. Stripping the attribute before flourishes() runs lets
    // the unfold own the transform outright instead of the two fighting.
    els.forEach(el => {
      // Two things in main.js write to these elements' transform:
      //   data-tilt  → the pointer-tracking 3D tilt in flourishes()
      //   data-reveal→ the generic scroll reveal, which GSAP drives by
      //                rewriting the whole transform every frame
      // Either one silently overwrites the unfold. Stripping both here —
      // before flourishes() and scrollAnims() ever look for them — lets the
      // unfold own the property outright. It is these cards' reveal now.
      el.removeAttribute('data-tilt');
      el.removeAttribute('data-reveal');
      el.setAttribute('data-unfold', '');
      if (REDUCED) el.classList.add('is-static');
    });
    if (REDUCED) return;

    collect();
    observe();
    scrollY = window.scrollY;
    draw();
    start();

    let rt;
    const schedule = () => { clearTimeout(rt); rt = setTimeout(measure, 180); };
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('orientationchange', schedule, { passive: true });
    document.querySelectorAll('.spk__img img').forEach(img => {
      if (!img.complete) img.addEventListener('load', schedule, { once: true });
    });

    window.addEventListener('scroll', start, { passive: true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
  }

  // main.js fires this after the cards are rendered and before flourishes()
  document.addEventListener('devtalks:content', init, { once: true });
})();
