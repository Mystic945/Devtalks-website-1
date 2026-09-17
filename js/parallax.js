/* ============================================================
   DEVTALKS — PARALLAX
   ------------------------------------------------------------
   1. Speaker media drifts inside its card as the card crosses
      the viewport.
   2. The marquee band speeds up, slows and reverses with scroll
      velocity.

   Built to run on a mid-range phone, so:

   • ONE requestAnimationFrame loop for the whole file. Two
     effects on one loop, not two loops racing each other.
   • ZERO layout reads per frame. Card positions are measured
     once up front and again only on resize — reading
     getBoundingClientRect() every frame is what makes parallax
     stutter, not the maths.
   • Cards are only computed while they are near the viewport
     (IntersectionObserver), and will-change is added and
     removed with them.
   • The loop stops entirely when nothing is on screen and when
     the tab is hidden.
   • Everything is skipped under prefers-reduced-motion.

   Tuning knobs are in CONFIG.
   ============================================================ */

(function () {
  'use strict';

  const CONFIG = {
    // how much of the card height the media travels, total (0.18 = ±9%)
    drift:      0.22,
    // marquee resting speed, px/sec
    marqueeIdle: 48,
    // how hard scrolling pushes the marquee (px/sec per px/sec of scroll)
    marqueePush: 0.55,
    // ceiling on that push, px/sec — stops a flick sending it into a blur
    marqueeMax:  900,
    // how fast the push bleeds back to resting speed (0-1 per frame)
    marqueeDecay: 0.06
  };

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (REDUCED) return;

  /* ---------------- shared state ---------------- */
  let vh       = window.innerHeight;
  let scrollY  = window.scrollY;
  let lastY    = scrollY;
  let lastT    = 0;
  let running  = false;
  let rafId    = null;

  /* ---------------- 1. speaker media ---------------- */
  // {media, top, h, range} — top/h measured once, never per frame
  let cards = [];
  const live = new Set();

  function collectCards() {
    cards = [];
    const frames = document.querySelectorAll('.spk__img');
    if (!frames.length) return;

    // One batched read pass. Never interleave reads and writes here.
    const rects = [];
    frames.forEach(f => rects.push({ f: f, r: f.getBoundingClientRect() }));

    rects.forEach(({ f, r }) => {
      const media = f.querySelector('img, .spk__ini');
      if (!media) return;
      cards.push({
        frame: f,
        media: media,
        top:   r.top + window.scrollY,
        h:     r.height,
        range: r.height * CONFIG.drift
      });
    });
  }

  function observeCards() {
    if (!('IntersectionObserver' in window)) {
      cards.forEach(c => live.add(c));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        const card = cards.find(c => c.frame === e.target);
        if (!card) return;
        if (e.isIntersecting) {
          live.add(card);
          card.frame.classList.add('is-live');
          start();
        } else {
          live.delete(card);
          card.frame.classList.remove('is-live');
        }
      });
    }, { rootMargin: '220px 0px' });   // settle before it's actually visible
    cards.forEach(c => io.observe(c.frame));
  }

  function drawCards() {
    live.forEach(c => {
      // progress 0 → 1 as the card travels bottom-of-screen to top-of-screen
      let p = (scrollY + vh - c.top) / (vh + c.h);
      p = p < 0 ? 0 : p > 1 ? 1 : p;
      const y = (p - 0.5) * c.range;
      c.media.style.transform = 'translate3d(0,' + y.toFixed(2) + 'px,0)';
    });
  }

  /* ---------------- 2. marquee ---------------- */
  let mq = null;   // {track, half, offset, speed, visible}

  function collectMarquee() {
    const track = document.querySelector('.marquee__track');
    if (!track || !track.children.length) return;
    // main.js renders the strip twice, so half the width is one full loop
    const half = track.scrollWidth / 2;
    if (!half) return;

    track.classList.add('is-js');
    mq = { track: track, half: half, offset: 0, speed: CONFIG.marqueeIdle, visible: true };

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => {
        mq.visible = e.isIntersecting;
        if (mq.visible) start();
      }, { rootMargin: '120px 0px' }).observe(track.parentElement || track);
    }
  }

  function drawMarquee(dt, scrollVel) {
    if (!mq || !mq.visible) return;

    // scroll velocity pushes the band along, then bleeds back to resting speed
    const push = Math.max(-CONFIG.marqueeMax, Math.min(CONFIG.marqueeMax,
                   scrollVel * CONFIG.marqueePush));
    const target = CONFIG.marqueeIdle + push;
    mq.speed += (target - mq.speed) * CONFIG.marqueeDecay;

    mq.offset -= mq.speed * dt;
    // wrap in both directions so it can run backwards when scrolling up
    if (mq.offset <= -mq.half) mq.offset += mq.half;
    if (mq.offset > 0)         mq.offset -= mq.half;

    mq.track.style.transform = 'translate3d(' + mq.offset.toFixed(2) + 'px,0,0)';
  }

  /* ---------------- the single loop ---------------- */
  function frame(now) {
    const dt = lastT ? Math.min((now - lastT) / 1000, 0.05) : 0.016;  // cap after a stall
    lastT = now;

    scrollY = window.scrollY;
    const scrollVel = dt > 0 ? (scrollY - lastY) / dt : 0;
    lastY = scrollY;

    drawCards();
    drawMarquee(dt, scrollVel);

    // keep going only while there is something to move
    const busy = live.size > 0 || (mq && mq.visible);
    if (busy && !document.hidden) {
      rafId = requestAnimationFrame(frame);
    } else {
      running = false; rafId = null; lastT = 0;
    }
  }

  function start() {
    if (running || document.hidden) return;
    running = true; lastT = 0; lastY = window.scrollY;
    rafId = requestAnimationFrame(frame);
  }

  /* ---------------- wiring ---------------- */
  function measure() {
    vh = window.innerHeight;
    collectCards();
    if (mq) mq.half = mq.track.scrollWidth / 2;
    drawCards();
  }

  function init() {
    collectCards();
    if (!cards.length) return;
    observeCards();
    collectMarquee();
    drawCards();
    start();

    let rt;
    const schedule = () => { clearTimeout(rt); rt = setTimeout(measure, 180); };

    // Card positions move when images finish loading or the layout reflows.
    document.querySelectorAll('.spk__img img').forEach(img => {
      if (!img.complete) img.addEventListener('load', schedule, { once: true });
    });

    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('orientationchange', schedule, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);

    window.addEventListener('scroll', start, { passive: true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
  }

  // main.js fires this once the speaker cards and marquee exist
  document.addEventListener('devtalks:content', init, { once: true });
})();
