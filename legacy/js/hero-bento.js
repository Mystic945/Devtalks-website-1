/* ============================================================
   DEVTALKS — SPOTLIGHT BENTO HERO
   ------------------------------------------------------------
   The hero tiles start almost unlit. The pointer is a stage
   spotlight: tiles wash with light as it crosses them, their
   rim comes up, and they rise toward the viewer. The grid is
   square and level — the depth comes from the lighting and the
   lift, not from a skewed plane. On a phone there is no
   pointer, so the device's own tilt moves the light instead —
   physically tipping the handset walks the beam across the
   grid.

   PERFORMANCE
   The rule this file follows is the same one the rest of the
   site follows: never read layout in a frame. Tile positions
   are measured once on load and again on resize, and the frame
   loop only ever writes a transform or an opacity, so the
   compositor does everything and the main thread stays free.
   The loop is gated by IntersectionObserver and by
   document.hidden, and it stops itself once the light has come
   to rest — an idle hero costs nothing.

   It also stands in for window.DevTalksHero, because js/main.js
   calls that unconditionally. init() returns false, which is
   main.js's own signal for "no WebGL hero here", and it hides
   the unused canvas.

   Tuning knobs are in CONFIG.
   ============================================================ */

(function () {
  'use strict';

  const CONFIG = {
    radius:     560,   // px: how far the spotlight reaches
    maxTilt:    2.6,   // degrees a tile leans toward the light — small on
                       // purpose: the grid is level, the light does the work
    lift:        34,   // px a lit tile rises toward the viewer
    glowMax:   0.95,   // brightest the wash inside a tile gets
    rimMax:    0.90,
    ease:      0.11,   // how quickly the beam follows the pointer
    tiltGain:  0.024   // deviceorientation degrees -> fraction of the grid
  };

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE    = window.matchMedia('(hover:hover) and (pointer:fine)').matches;

  /* main.js calls window.DevTalksHero.init() whatever page it is on. Returning
     false is its existing "no WebGL hero" path, which hides the canvas. */
  window.DevTalksHero = {
    init: function (canvas) { if (canvas) canvas.style.display = 'none'; return false; },
    reveal: function () {},
    pulse: function () {},
    setLevel: function () {},
    enabled: function () { return false; }
  };

  /* ---------- tech stack icons, inline so there is nothing to download ---------- */
  const ICONS = {
    terminal:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 9l3 3-3 3M13 15h5"/></svg>',
    chip:    '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M4 10h3M4 14h3M17 10h3M17 14h3M10 4v3M14 4v3M10 17v3M14 17v3"/></svg>',
    stack:   '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5M3 16.5l9 5 9-5"/></svg>',
    cloud:   '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18h10a4 4 0 0 0 .4-7.98A6 6 0 0 0 6 9.5 4.25 4.25 0 0 0 7 18z"/></svg>',
    branch:  '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="5" r="2.2"/><circle cx="6" cy="19" r="2.2"/><circle cx="18" cy="9" r="2.2"/><path d="M6 7.2v9.6M18 11.2c0 3.2-3 3.6-6 4.2"/></svg>',
    db:      '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="6" rx="7.5" ry="3"/><path d="M4.5 6v12c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3V6M4.5 12c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3"/></svg>',
    wave:    '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round"><path d="M2 12h2.5M7 5v14M11.5 8.5v7M16 3v18M20.5 9v6"/></svg>',
    shield:  '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7.5 3v5.6c0 4.4-3.1 7.9-7.5 9.4-4.4-1.5-7.5-5-7.5-9.4V6L12 3z"/></svg>'
  };
  const STACK = ['terminal', 'chip', 'stack', 'cloud', 'branch', 'db', 'wave', 'shield'];

  /* Placeholder sign-ups for the live ticker. There is no backend on a static
     site, so this is a demo feed — wire it to the real thing later by calling
     DevTalksBento.setRegistrations(n, ['Name · College', ...]) whenever your
     form or sheet reports a new number. */
  const FEED = [
    'Aarav · COEP', 'Sana · VIT Pune', 'Rohit · MIT-WPU', 'Ishita · PICT',
    'Kabir · DYPIT', 'Meera · Cummins', 'Devansh · SPPU', 'Aditi · VIT Pune'
  ];

  let grid, plane, tiles = [], hint, raf = null, visible = true;
  let gridRect = null, planeW = 0, planeH = 0;
  let target = { x: 0.5, y: 0.42 }, beam = { x: 0.5, y: 0.42 };
  let woken = false, tilting = false;

  /* ══════════════════════════════════════════════════════════
     Content
     ══════════════════════════════════════════════════════════ */
  function fillTiles() {
    const list = (typeof SPEAKERS !== 'undefined') ? SPEAKERS : [];
    const s = list[0];
    const box = document.getElementById('btSpeaker');
    if (box && s) {
      const initials = s.name.split(/\s+/).map(w => w[0]).slice(0, 2).join('');
      box.innerHTML =
        '<div class="btspk">' +
          '<div class="btspk__img">' +
            (s.photo ? '<img src="' + s.photo + '" alt="" loading="lazy" />'
                     : '<span class="btspk__ini">' + initials + '</span>') +
          '</div>' +
          '<div><div class="btspk__name">' + s.name + '</div>' +
          '<div class="btspk__role">' + s.role + (s.org ? ' · ' + s.org : '') + '</div></div>' +
        '</div>' +
        '<p class="btspk__talk">' + s.talk + '</p>';
    }

    const st = document.getElementById('btStack');
    if (st) st.innerHTML = STACK.map(k =>
      '<span aria-hidden="true">' + ICONS[k] + '</span>').join('');

    ticker();
  }

  /* the live ticker: a number that climbs to its target once, then a feed that
     rolls one line at a time */
  function ticker() {
    const n = document.getElementById('btTickN');
    const f = document.getElementById('btTickFeed');
    if (!n) return;

    let end = 248;                                   // placeholder starting count
    if (typeof STATS !== 'undefined') {
      const seats = STATS.find(s => /seat/i.test(s.label));
      if (seats) end = Math.round(seats.value * 0.41);
    }

    let cur = 0, t0 = 0;
    const climb = (ts) => {
      if (!t0) t0 = ts;
      const k = Math.min((ts - t0) / 1400, 1);
      cur = Math.round(end * (1 - Math.pow(1 - k, 3)));
      n.textContent = cur.toLocaleString('en-IN');
      if (k < 1) requestAnimationFrame(climb);
    };
    requestAnimationFrame(climb);

    if (!f || REDUCED) return;
    let i = 0;
    const roll = () => {
      const line = document.createElement('span');
      line.textContent = FEED[i % FEED.length] + ' just registered';
      line.style.transform = 'translateY(100%)';
      line.style.opacity = '0';
      f.appendChild(line);
      requestAnimationFrame(() => {
        line.style.transform = 'translateY(0)';
        line.style.opacity = '1';
        const old = f.firstElementChild;
        if (old !== line) {
          old.style.transform = 'translateY(-100%)';
          old.style.opacity = '0';
          setTimeout(() => old.remove(), 520);
        }
      });
      i++;
    };
    roll();
    setInterval(() => { if (!document.hidden) roll(); }, 3400);
  }

  /* ══════════════════════════════════════════════════════════
     Measuring — once on load, once per resize, never in a frame
     ══════════════════════════════════════════════════════════ */
  function measure() {
    gridRect = grid.getBoundingClientRect();
    planeW = plane.offsetWidth;
    planeH = plane.offsetHeight;
    tiles.forEach(t => {
      t.x = t.el.offsetLeft; t.y = t.el.offsetTop;
      t.w = t.el.offsetWidth; t.h = t.el.offsetHeight;
      t.cx = t.x + t.w / 2;   t.cy = t.y + t.h / 2;
    });
  }

  /* ══════════════════════════════════════════════════════════
     Frame
     ══════════════════════════════════════════════════════════ */
  function frame() {
    raf = requestAnimationFrame(frame);
    if (!visible) { cancelAnimationFrame(raf); raf = null; return; }

    beam.x += (target.x - beam.x) * CONFIG.ease;
    beam.y += (target.y - beam.y) * CONFIG.ease;

    const sx = beam.x * planeW, sy = beam.y * planeH;

    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i];
      const dx = sx - t.cx, dy = sy - t.cy;
      const d  = Math.sqrt(dx * dx + dy * dy);
      let k = 1 - d / CONFIG.radius;
      k = k < 0 ? 0 : k * k;                       // falls off like real light

      // the wash: the gradient never changes, it only slides
      t.glow.style.transform =
        'translate3d(' + (sx - t.x).toFixed(1) + 'px,' + (sy - t.y).toFixed(1) + 'px,0)';
      t.glow.style.opacity = (k * CONFIG.glowMax).toFixed(3);
      t.rim.style.opacity  = (k * CONFIG.rimMax).toFixed(3);

      // and the lean toward it
      const lx = (sx - t.cx) / (t.w * 0.5), ly = (sy - t.cy) / (t.h * 0.5);
      t.el.style.transform =
        'translateZ(' + (k * CONFIG.lift).toFixed(1) + 'px) ' +
        'rotateX(' + (-ly * CONFIG.maxTilt * k).toFixed(2) + 'deg) ' +
        'rotateY(' + ( lx * CONFIG.maxTilt * k).toFixed(2) + 'deg)';

      // will-change only while it is actually the tile under the light
      const lit = k > 0.04;
      if (lit !== t.lit) {
        t.lit = lit;
        t.el.style.willChange = lit ? 'transform' : '';
        t.el.classList.toggle('is-lit', lit);
      }
    }

    // once the beam has settled on its target there is nothing left to draw
    if (Math.abs(target.x - beam.x) < 0.0004 && Math.abs(target.y - beam.y) < 0.0004) {
      cancelAnimationFrame(raf); raf = null;
    }
  }

  const kick = () => { if (!raf && visible) raf = requestAnimationFrame(frame); };

  function wake() {
    if (woken) return;
    woken = true;
    if (hint) hint.classList.add('is-gone');
  }

  /* ══════════════════════════════════════════════════════════
     Input
     ══════════════════════════════════════════════════════════ */
  function bindPointer() {
    window.addEventListener('pointermove', (e) => {
      if (!gridRect) return;
      target.x = (e.clientX - gridRect.left) / gridRect.width;
      target.y = (e.clientY - gridRect.top)  / gridRect.height;
      wake(); kick();
    }, { passive: true });
  }

  /* On a phone the spotlight is driven by how the handset is held. iOS 13+
     will not hand over orientation without a user gesture, so the hint carries
     a button for it; everywhere else it just starts. */
  function bindTilt() {
    const onTilt = (e) => {
      if (e.gamma == null || e.beta == null) return;
      tilting = true;
      target.x = Math.min(Math.max(0.5 + e.gamma * CONFIG.tiltGain, -0.15), 1.15);
      target.y = Math.min(Math.max(0.5 + (e.beta - 42) * CONFIG.tiltGain, -0.15), 1.15);
      wake(); kick();
    };

    const needsAsk = typeof DeviceOrientationEvent !== 'undefined' &&
                     typeof DeviceOrientationEvent.requestPermission === 'function';

    if (!needsAsk) {
      window.addEventListener('deviceorientation', onTilt, { passive: true });
    } else if (hint) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'Enable tilt';
      btn.addEventListener('click', () => {
        DeviceOrientationEvent.requestPermission().then(r => {
          if (r === 'granted') {
            window.addEventListener('deviceorientation', onTilt, { passive: true });
            hint.classList.add('is-gone');
          }
        }).catch(() => {});
      });
      hint.appendChild(btn);
    }

    // a drag across the grid works too, and is the fallback if tilt is refused
    grid.addEventListener('touchmove', (e) => {
      if (!gridRect) return;
      const t = e.touches[0];
      target.x = (t.clientX - gridRect.left) / gridRect.width;
      target.y = (t.clientY - gridRect.top)  / gridRect.height;
      wake(); kick();
    }, { passive: true });

    // and if the phone is flat on a desk and nobody touches anything, the beam
    // drifts slowly on its own rather than leaving the hero dead
    setTimeout(() => {
      if (woken || tilting) return;
      let a = 0;
      setInterval(() => {
        if (woken || document.hidden || !visible) return;
        a += 0.02;
        target.x = 0.5 + Math.cos(a) * 0.30;
        target.y = 0.45 + Math.sin(a * 0.8) * 0.22;
        kick();
      }, 1000 / 30);
    }, 2600);
  }

  /* ══════════════════════════════════════════════════════════
     Setup
     ══════════════════════════════════════════════════════════ */
  function init() {
    grid  = document.getElementById('bentoGrid');
    plane = grid && grid.querySelector('.bento__plane');
    if (!grid || !plane) return;

    hint = document.querySelector('.bento__hint');
    fillTiles();

    tiles = Array.prototype.map.call(plane.querySelectorAll('[data-bt]'), el => ({
      el: el,
      glow: el.querySelector('.bt__glow'),
      rim:  el.querySelector('.bt__rim'),
      lit: false
    })).filter(t => t.glow && t.rim);

    if (REDUCED) return;                // CSS lights the stage and leaves it lit

    // images inside tiles change their height, so measure after they land
    measure();
    window.addEventListener('load', measure);
    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt); rt = setTimeout(measure, 160);
    }, { passive: true });
    window.addEventListener('scroll', () => {
      // the grid moves up the page as you scroll; the pointer mapping needs
      // its live top, and this is the one read outside a frame
      if (gridRect) gridRect = grid.getBoundingClientRect();
    }, { passive: true });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => {
        visible = es[0].isIntersecting;
        if (visible) kick();
      }, { threshold: 0 }).observe(grid);
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(raf); raf = null; }
      else kick();
    });

    if (FINE) bindPointer(); else bindTilt();
    kick();                              // one pass, so nothing starts black
  }

  document.addEventListener('devtalks:content', init, { once: true });

  /* Public hook for a real registrations feed. */
  window.DevTalksBento = {
    setRegistrations: function (n, names) {
      const el = document.getElementById('btTickN');
      if (el && typeof n === 'number') el.textContent = n.toLocaleString('en-IN');
      if (Array.isArray(names) && names.length) FEED.splice(0, FEED.length, ...names);
    }
  };
})();
