/* ============================================================
   DEVTALKS — SCROLL FLOW  (paper edition only)
   ------------------------------------------------------------
   Two things, both driven by one rAF loop that only runs while the
   page is moving:

   NATIVE SCROLL
      There used to be a third job here: a wheel handler that took
      over scrolling and eased the page toward a target. It is
      gone. It had to call preventDefault on every wheel tick, which
      pulls scrolling off the browser's compositor thread and onto
      the main thread, and its easing meant the page trailed the
      wheel by close to half a second. Scrolling is now the
      browser's own, so it answers immediately and stays smooth
      even when the main thread is busy. Anchor links still glide,
      using the browser's native smooth scroll.

   1. REGISTRATION
      A card entering the viewport arrives slightly out of
      register — offset, soft, a touch small — and settles as it
      reaches reading height. It is continuous, tied to scroll
      position rather than fired once, which is what makes the
      reference feel like one moving sheet instead of a stack of
      separate reveals.

   2. PRESS DRIFT
      Scroll velocity leans the speaker row a fraction of a
      degree. It is well under the threshold where it reads as a
      skew; you only notice it stop.

   Everything degrades to a static, fully visible page: the
   default state of every element here is its finished state.

   Tuning knobs are in CONFIG.
   ============================================================ */

(function () {
  'use strict';

  const CONFIG = {
    enterFrom:  0.86,   // viewport fraction where registration starts
    enterTo:    0.52,   // ...and where the card is fully in register
    rise:        54,    // px a card travels into register
    shrink:    0.06,    // how much smaller it starts
    soften:       5,    // px of blur it starts with
    leanMax:    0.5,    // degrees the row leans at full scroll speed
    leanVel:     42     // px/frame of scroll velocity that counts as full
  };

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE    = window.matchMedia('(hover:hover) and (pointer:fine)').matches;

  let cards = [], row = null;
  let current = 0, vel = 0, lean = 0;
  let raf = null;

  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  /* ══════════════════════════════════════════════════════════
     2 + 3 · registration and press drift
     ══════════════════════════════════════════════════════════ */
  /* Document-space top, from layout rather than from a rect.

     This matters more than it looks. register() WRITES a transform to
     these same elements, so reading getBoundingClientRect() back off one
     returns a position that already includes the translate this loop put
     there — the measurement feeds the transform which feeds the
     measurement, and the element oscillates. offsetTop is layout, which
     no transform touches, so the loop stays open. */
  function docTop(el) {
    let y = 0, n = el;
    while (n) { y += n.offsetTop; n = n.offsetParent; }
    return y;
  }

  function measure() {
    cards = Array.prototype.map.call(
      document.querySelectorAll('[data-flow]'),
      el => ({ el: el, k: -1, hinted: false, top: docTop(el) })
    );
  }

  /* Anything that changes the page's height — images landing, the FAQ
     opening, a resize — moves every cached top below it. */
  function remeasure() {
    for (let i = 0; i < cards.length; i++) cards[i].top = docTop(cards[i].el);
  }

  function register() {
    const vh = window.innerHeight;
    const from = vh * CONFIG.enterFrom;
    const to   = vh * CONFIG.enterTo;

    const sy = window.scrollY;

    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      const top = c.top - sy;

      // 0 while still below the fold, 1 once it has reached reading height
      let k = (from - top) / (from - to);
      k = clamp(k, 0, 1);
      k = 1 - Math.pow(1 - k, 3);              // ease out, so it lands softly

      // The last 0.5% of an ease-out takes as long as the first half of it.
      // Snap there, or the card parks at 99.8% scale with a trace of blur
      // still on it and this loop never gets to idle.
      if (k > 0.995) k = 1;

      if (c.k !== -1 && Math.abs(k - c.k) < 0.002) continue;
      c.k = k;

      // In register: hand the element back with nothing of ours on it, so
      // hover and focus own their transforms cleanly from here on.
      if (k === 1) {
        c.el.style.transform = '';
        c.el.style.opacity = '';
        c.el.style.filter = '';
        c.el.style.willChange = '';     // and drop the compositor hint with it
        c.hinted = false;
        continue;
      }

      // Hint only once the card is actually travelling. Setting it at k=0
      // would promote every element below the fold at load and hold those
      // layers until the visitor happened to scroll past them.
      if (k > 0 && !c.hinted) { c.el.style.willChange = 'transform, opacity'; c.hinted = true; }

      const y  = (1 - k) * CONFIG.rise;
      const s  = 1 - (1 - k) * CONFIG.shrink;
      const bl = (1 - k) * CONFIG.soften;

      c.el.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0) scale(' + s.toFixed(4) + ')';
      c.el.style.opacity = (0.15 + k * 0.85).toFixed(3);
      c.el.style.filter = bl > 0.35 ? 'blur(' + bl.toFixed(2) + 'px)' : '';
    }

    if (row) {
      const want = clamp(vel / CONFIG.leanVel, -1, 1) * CONFIG.leanMax;
      lean += (want - lean) * 0.12;
      row.style.transform = Math.abs(lean) > 0.01
        ? 'rotate(' + lean.toFixed(3) + 'deg)' : '';
    }
  }

  /* ══════════════════════════════════════════════════════════
     Frame
     ══════════════════════════════════════════════════════════ */
  function frame() {
    raf = requestAnimationFrame(frame);

    const now = window.scrollY;
    vel = now - current;
    current = now;

    register();

    // Idle: the page is still and nothing is mid-flight.
    if (Math.abs(vel) < 0.2 && Math.abs(lean) < 0.02) {
      const settled = cards.every(c => c.k <= 0.001 || c.k === 1);
      if (settled) { cancelAnimationFrame(raf); raf = null; }
    }
  }

  const kick = () => { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); };

  /* ══════════════════════════════════════════════════════════
     Setup
     ══════════════════════════════════════════════════════════ */
  function init() {
    row = document.querySelector('.sec--speakers .speakers');
    measure();

    if (REDUCED) {
      // Keep the composition, drop the movement.
      cards.forEach(c => { c.el.style.opacity = 1; c.el.style.transform = ''; c.el.style.filter = ''; });
      return;
    }

    if (FINE) {
      // Wheel scrolling is the browser's own — see the note at the top.
      // Anchor links glide with the browser's native smooth scroll, which
      // runs on the compositor; programmatic scrolls stay instant so
      // ScrollTrigger can measure the page.
      document.documentElement.style.scrollBehavior = 'auto';

      document.addEventListener('click', (e) => {
        const a = e.target.closest && e.target.closest('a[href^="#"]');
        if (!a) return;
        const id = a.getAttribute('href');
        if (!id || id === '#') return;
        const el = document.querySelector(id);
        if (!el) return;
        e.preventDefault();
        window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top, left: 0, behavior: 'smooth' });
      });
    }

    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', () => { remeasure(); current = window.scrollY; kick(); }, { passive: true });
    window.addEventListener('load', () => { remeasure(); kick(); });

    if ('ResizeObserver' in window) {
      let t = null;
      new ResizeObserver(() => {
        clearTimeout(t);
        t = setTimeout(() => { remeasure(); kick(); }, 80);
      }).observe(document.body);
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(raf); raf = null; }
      else { current = window.scrollY; kick(); }
    });

    kick();
  }

  document.addEventListener('devtalks:content', () => setTimeout(init, 0), { once: true });
})();
