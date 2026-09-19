/* ============================================================
   DEVTALKS — THE GALLERY  (3D unfurling wall)
   ------------------------------------------------------------
   A black banner pins to the screen and opens from a rounded
   frame to full-bleed. A wall of photos in four columns swings
   out of deep 3D and settles as you scroll, the columns sliding
   past each other at different speeds.

   One scroll position drives all of it. Progress p runs 0 -> 1
   over the length of the track:

     0    -> .15   the banner opens (clip-path, not width/height,
                   so the photos never reflow)
     .15  -> 1     the wall unfurls: rotateX 25 -> 4, rotateY -45 -> -8,
                   rotateZ 15 -> 2, translateZ -800 -> 0, and each
                   column's own vertical drift

   The wall is dealt into four columns from GALLERY in
   js/data-3.js and each column is printed twice, so it is long
   enough to travel. The second copy is aria-hidden.

   The transform is written as one string, in the order
   translateZ, rotateX, rotateY, rotateZ. Rotations in 3D do not
   commute, so letting GSAP assemble them in its own order would
   swing the wall on a different path.

   Reduced motion, or no GSAP: nothing here runs and css/gallery.css
   shows the finished wall as a single static screen.
   ============================================================ */

(function () {
  'use strict';

  const CONFIG = {
    unfurl: 0.15,     // share of the scroll spent opening the banner
    scrub:  0.6,      // seconds of smoothing between scroll and motion
    radius: 48        // banner corner radius, px, while it is a frame
  };

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp  = (a, b, t) => a + (b - a) * t;
  const seg   = (p, a, b) => clamp((p - a) / (b - a), 0, 1);

  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  let section, track, banner, matrix, cols = [];
  const dims = { ix: 0, iy: 0 };
  const last = { clip: null, matrix: null, cols: [] };

  /* ══════════════════════════════════════════════════════════
     Markup
     ══════════════════════════════════════════════════════════ */
  function card(item, i, ghost) {
    const n = String(i + 1).padStart(2, '0');
    if (!item.src) {
      return '<div class="gal__card"' + (ghost ? ' aria-hidden="true"' : '') + '>' +
               '<span class="gal__slot">' + n + '</span></div>';
    }
    return '<div class="gal__card"' + (ghost ? ' aria-hidden="true"' : '') + '>' +
             '<img src="' + esc(item.src) + '" alt="' +
               (ghost ? '' : esc(item.label || ('Gallery photo ' + n))) +
             '" loading="lazy" decoding="async" /></div>';
  }

  function build() {
    let list = (typeof GALLERY !== 'undefined' && GALLERY.length) ? GALLERY.slice() : [];
    while (list.length < 8) list.push({ src: '', label: '' });
    // Four columns of equal length: an unbalanced wall leaves a hole at the
    // bottom of the short ones once it has finished travelling.
    list = list.slice(0, list.length - (list.length % 4));

    matrix.innerHTML = [0, 1, 2, 3].map((c) => {
      const mine = [];
      list.forEach((it, i) => { if (i % 4 === c) mine.push([it, i]); });
      return '<div class="gal__col" data-col="' + c + '">' +
               mine.map((m) => card(m[0], m[1], false)).join('') +
               mine.map((m) => card(m[0], m[1], true)).join('') +
             '</div>';
    }).join('');

    cols = Array.prototype.slice.call(matrix.querySelectorAll('.gal__col'));
  }

  /* ══════════════════════════════════════════════════════════
     One frame
     ══════════════════════════════════════════════════════════ */
  /* Banner size is measured, never animated. The frame's inset is worked
     out from it: the original look is a 90vw x 80vh window, capped at the
     banner's own 1920px. */
  function measure() {
    const W = banner.offsetWidth, H = banner.offsetHeight;
    dims.ix = Math.max(0, (W - Math.min(window.innerWidth * 0.9, 1920)) / 2);
    dims.iy = H * 0.1;
  }

  function render(p) {
    // -- the banner opening --
    const open = seg(p, 0, CONFIG.unfurl);
    const k = 1 - open;
    const clip = open >= 1
      ? 'none'
      : 'inset(' + (dims.iy * k).toFixed(1) + 'px ' + (dims.ix * k).toFixed(1) +
        'px round ' + (CONFIG.radius * k).toFixed(1) + 'px)';
    if (clip !== last.clip) { banner.style.clipPath = clip; last.clip = clip; }

    // -- the wall --
    const m = seg(p, CONFIG.unfurl, 1);
    const t = 'translateZ(' + lerp(-800, 0, m).toFixed(1) + 'px) ' +
              'rotateX(' + lerp(25, 4, m).toFixed(2) + 'deg) ' +
              'rotateY(' + lerp(-45, -8, m).toFixed(2) + 'deg) ' +
              'rotateZ(' + lerp(15, 2, m).toFixed(2) + 'deg)';
    if (t !== last.matrix) { matrix.style.transform = t; last.matrix = t; }

    // -- each column's drift, as a percentage of its own height --
    const y = [
      lerp(0, -40, m), lerp(-40, 10, m), lerp(0, -40, m), lerp(-30, 20, m)
    ];
    for (let i = 0; i < cols.length; i++) {
      const s = 'translateY(' + y[i].toFixed(2) + '%)';
      if (s !== last.cols[i]) { cols[i].style.transform = s; last.cols[i] = s; }
    }
  }

  /* ══════════════════════════════════════════════════════════
     Setup
     ══════════════════════════════════════════════════════════ */
  /* The photos are lazy, but the wall spends its first screens tiny and
     tilted, so the browser's own "near the viewport" test would fetch them
     late. Once the section is a screen and a half away, load everything. */
  function prime() {
    const imgs = matrix.querySelectorAll('img');
    if (!('IntersectionObserver' in window)) {
      imgs.forEach((i) => { i.loading = 'eager'; });
      return;
    }
    const io = new IntersectionObserver((es) => {
      if (!es[0].isIntersecting) return;
      imgs.forEach((i) => { i.loading = 'eager'; });
      io.disconnect();
    }, { rootMargin: '150% 0px' });
    io.observe(section);
  }

  function init() {
    section = document.querySelector('.sec--gallery');
    track   = document.getElementById('galTrack');
    banner  = document.getElementById('galBanner');
    matrix  = document.getElementById('galMatrix');
    if (!section || !track || !banner || !matrix) return;

    build();
    prime();

    if (REDUCED || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    track.classList.add('is-scrubbed');
    measure();
    render(0);

    // p is a plain number tweened by scroll. scrub gives it a little
    // inertia, which is what makes the wall feel weighted, not wired.
    const state = { p: 0 };
    gsap.to(state, {
      p: 1, ease: 'none',
      onUpdate: () => render(state.p),
      scrollTrigger: {
        trigger: track,
        start: 'top top',
        end: 'bottom bottom',
        scrub: CONFIG.scrub
      }
    });

    // will-change only while the section can actually be seen
    ScrollTrigger.create({
      trigger: track, start: 'top bottom', end: 'bottom top',
      onToggle: (self) => track.classList.toggle('is-live', self.isActive)
    });

    // the track just grew by several screens: everything below it moved
    ScrollTrigger.addEventListener('refresh', () => { measure(); render(state.p); });
    ScrollTrigger.refresh();
  }

  document.addEventListener('devtalks:content', () => setTimeout(init, 0), { once: true });
})();
