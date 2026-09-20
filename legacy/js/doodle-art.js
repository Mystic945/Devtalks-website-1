/* ============================================================
   DEVTALKS — COMIC DOODLE ART  (paper edition only)
   ------------------------------------------------------------
   One source of truth for every comic mark on the page. The 3D
   constellation behind the hero (js/hero-doodles.js), the
   scatter behind the speakers (js/doodle-layer.js) and the
   action-line panels in the footer (js/comic-footer.js) all
   draw from here, so a doodle looks the same wherever it lands.

   Three kinds of thing live in here:

     PATHS  plain ink marks in a 100x100 box. Two families:
            the comic marks — sparkles, bolts, hearts, puffs,
            balloons, speed lines — and TECH, the developer
            vocabulary a dev conference actually doodles: cogs,
            chips, terminals, cursors, braces, bugs, branches.

     SFX    the lettered plates: BANG!, BOOM!, POW!, SPLASH!,
            OOPS!!. A jagged outline generated from a seed, with
            the word set in Anton — the site's own display face,
            so the lettering belongs to the page rather than
            arriving as clip art.

     RAYS   the converging speed lines the footer panels are
            built from. Tapered polygons that sharpen to a
            vanishing point, which is what makes a comic panel
            read as impact rather than as a starburst.

   Deterministic: every generator takes a seed, so a reload
   redraws exactly the same page.
   ============================================================ */

(function () {
  'use strict';

  /* ---------- a tiny seeded RNG, so layouts never jump ---------- */
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5;  s >>>= 0;
      return s / 4294967296;
    };
  }

  /* ══════════════════════════════════════════════════════════
     PATHS — ink marks in a 100x100 box
     ══════════════════════════════════════════════════════════ */
  const PATHS = {
    spark:   { fill: 'M50 6 C55 35 65 45 94 50 C65 55 55 65 50 94 C45 65 35 55 6 50 C35 45 45 35 50 6 Z' },
    zigzag:  { line: 'M8 42 L28 66 L46 28 L64 66 L82 30 L94 48' },
    balloon: { line: 'M18 20 H82 A10 10 0 0 1 92 30 V60 A10 10 0 0 1 82 70 H46 L26 88 L30 70 H18 A10 10 0 0 1 8 60 V30 A10 10 0 0 1 18 20 Z' },
    spiral:  { line: 'M50 50 C50 42 58 40 62 46 C68 54 60 66 48 66 C32 66 24 52 26 38 C29 20 46 10 64 14 C84 18 94 36 92 54' },
    speed:   { line: 'M6 34 C30 26 58 26 84 34 M10 50 C34 42 62 42 88 50 M6 66 C30 58 58 58 84 66' },
    ring:    { line: 'M50 8 A42 42 0 1 1 49.9 8 Z M50 26 V58 M50 70 V78' },
    scribble:{ line: 'M22 34 C10 56 26 82 52 82 C78 82 92 58 82 38 C72 18 44 12 28 26 C16 36 14 56 24 68' },
    plus:    { line: 'M50 14 V86 M14 50 H86 M26 26 L74 74 M74 26 L26 74' },
    arrow:   { line: 'M12 72 C26 34 62 18 90 30 M90 30 L70 26 M90 30 L80 46' },

    /* the reference sheet's marks */
    bolt:    { fill: 'M56 4 L20 54 H44 L36 96 L80 40 H54 Z' },
    heart:   { fill: 'M50 88 C18 66 8 48 8 34 C8 20 19 10 32 10 C40 10 46 14 50 20 C54 14 60 10 68 10 C81 10 92 20 92 34 C92 48 82 66 50 88 Z' },
    puff:    { line: 'M20 66 A14 14 0 0 1 20 38 A16 16 0 0 1 44 22 A17 17 0 0 1 74 26 A15 15 0 0 1 86 52 A13 13 0 0 1 76 66 Z' },
    star5:   { line: 'M50 8 L61 38 H93 L67 57 L77 88 L50 69 L23 88 L33 57 L7 38 H39 Z' },
    dots3:   { line: 'M14 22 H86 A8 8 0 0 1 94 30 V58 A8 8 0 0 1 86 66 H44 L24 84 L28 66 H14 A8 8 0 0 1 6 58 V30 A8 8 0 0 1 14 22 Z M30 44 h.01 M50 44 h.01 M70 44 h.01' },
    winged:  { line: 'M50 78 C28 62 20 50 20 40 C20 30 28 24 36 24 C42 24 47 27 50 32 C53 27 58 24 64 24 C72 24 80 30 80 40 C80 50 72 62 50 78 Z M20 40 C10 30 4 30 2 34 C8 36 12 40 18 46 M80 40 C90 30 96 30 98 34 C92 36 88 40 82 46' },
    dart:    { line: 'M6 82 C24 56 52 38 84 32 M84 32 L66 24 M84 32 L74 50 M6 82 L18 70 M6 82 L20 84' }
  };

  /* ══════════════════════════════════════════════════════════
     TECH — the developer vocabulary
     ------------------------------------------------------------
     The marks a dev conference actually draws in its margins:
     a cog, a chip, a terminal, a cursor, a file, a nib, a robot
     head, a power symbol, radar rings, braces, angle brackets,
     a diamond, pixel blocks, a squiggle, an X, a git branch, a
     cloud, a bug, a stack, and the three primitives.

     Same 100x100 box and same stroke discipline as PATHS above,
     so a tech mark and a comic mark sit together without one
     looking imported.

     Two of them are generated rather than written out. A cog
     drawn by hand as path data is twenty-odd arc segments of
     guesswork; walked around a circle it is exact, and the
     tooth count becomes a number you can change.
     ══════════════════════════════════════════════════════════ */

  /* a circle, as an arc pair — cheaper to read than four beziers */
  function circ(cx, cy, r) {
    return 'M' + (cx - r) + ' ' + cy +
           ' a' + r + ' ' + r + ' 0 1 0 ' + (r * 2) + ' 0' +
           ' a' + r + ' ' + r + ' 0 1 0 ' + (-r * 2) + ' 0';
  }

  /* a proper cog: outer arc across each tooth, inner arc across each valley */
  function cog(cx, cy, rOut, rIn, teeth) {
    const step = (Math.PI * 2) / teeth;
    const pts = [];
    for (let i = 0; i < teeth; i++) {
      const a = i * step;
      [[a, rOut], [a + step * 0.38, rOut],
       [a + step * 0.50, rIn], [a + step * 0.88, rIn]].forEach(([ang, r]) => {
        pts.push((cx + Math.cos(ang) * r).toFixed(1) + ' ' + (cy + Math.sin(ang) * r).toFixed(1));
      });
    }
    return 'M' + pts.join(' L') + ' Z';
  }

  const TECH = {
    cog:      { line: cog(50, 50, 44, 32, 9) + ' ' + circ(50, 50, 15) },
    chip:     { line: 'M32 32 h36 v36 h-36 Z M40 20 v12 M52 20 v12 M64 20 v12 M40 68 v12 M52 68 v12 M64 68 v12 M20 40 h12 M20 52 h12 M20 64 h12 M68 40 h12 M68 52 h12 M68 64 h12' },
    terminal: { line: 'M10 22 h80 a6 6 0 0 1 6 6 v44 a6 6 0 0 1 -6 6 h-80 a6 6 0 0 1 -6 -6 v-44 a6 6 0 0 1 6 -6 Z M26 42 l10 8 -10 8 M52 58 h20' },
    cursor:   { line: 'M30 14 L30 78 L45 63 L56 88 L66 83 L55 59 L74 59 Z' },
    file:     { line: 'M24 8 h34 l20 20 v64 h-54 Z M58 8 v20 h20 M36 48 h30 M36 60 h30 M36 72 h20' },
    nib:      { line: 'M50 6 L74 52 L50 94 L26 52 Z M50 32 V94 M38 52 h24' },
    droid:    { line: 'M22 58 a28 28 0 0 1 56 0 Z M31 34 L23 18 M69 34 L77 18 M38 46 h.6 M62 46 h.6' },
    power:    { line: 'M50 10 V46 M28 24 a30 30 0 1 0 44 0' },
    radar:    { line: circ(50, 50, 42) + ' ' + circ(50, 50, 27) + ' ' + circ(50, 50, 12) },
    braces:   { line: 'M40 10 a12 12 0 0 0 -12 12 v16 a12 12 0 0 1 -12 12 a12 12 0 0 1 12 12 v16 a12 12 0 0 0 12 12 M60 10 a12 12 0 0 1 12 12 v16 a12 12 0 0 0 12 12 a12 12 0 0 0 -12 12 v16 a12 12 0 0 1 -12 12' },
    angle:    { line: 'M34 26 L12 50 L34 74 M66 26 L88 50 L66 74 M58 16 L42 84' },
    diamond:  { line: 'M50 8 L92 50 L50 92 L8 50 Z' },
    pixels:   { line: 'M12 12 h24 v24 h-24 Z M52 12 h24 v24 h-24 Z M12 52 h24 v24 h-24 Z M62 62 h26 v26 h-26 Z' },
    squiggle: { line: 'M6 60 c12 -24 25 -24 37 0 c12 24 25 24 37 0 c6 -12 11 -17 16 -16' },
    xmark:    { line: 'M22 22 L78 78 M78 22 L22 78' },
    branch:   { line: circ(28, 20, 8) + ' M28 28 V72 ' + circ(28, 88, 8) + ' ' +
                      circ(72, 20, 8) + ' M72 28 v8 c0 20 -22 18 -34 26 c-7 5 -10 9 -10 12' },
    cloud:    { line: 'M26 74 a17 17 0 0 1 2 -34 a23 23 0 0 1 44 -6 a18 18 0 0 1 4 40 Z' },
    bug:      { line: 'M34 44 a16 20 0 0 1 32 0 v14 a16 20 0 0 1 -32 0 Z M40 31 L32 18 M60 31 L68 18 M34 46 L15 38 M34 58 L15 62 M34 68 L17 80 M66 46 L85 38 M66 58 L85 62 M66 68 L83 80' },
    stack:    { line: 'M50 10 L88 30 L50 50 L12 30 Z M12 48 L50 68 L88 48 M12 64 L50 84 L88 64' },
    shapes:   { line: circ(30, 32, 18) + ' M56 16 h30 v30 h-30 Z M50 54 L76 92 L24 92 Z' }
  };

  Object.keys(TECH).forEach(k => { PATHS[k] = TECH[k]; });

  /* ══════════════════════════════════════════════════════════
     SFX — a jagged plate with a word set into it
     ══════════════════════════════════════════════════════════ */
  const SFX = {
    bang:   { word: 'BANG!',   spikes: 13, jag: 0.30, seed: 11 },
    boom:   { word: 'BOOM!',   spikes: 11, jag: 0.36, seed: 23 },
    pow:    { word: 'POW!',    spikes: 12, jag: 0.26, seed: 37 },
    splash: { word: 'SPLASH!', spikes: 17, jag: 0.22, seed: 53 },
    oops:   { word: 'OOPS!!',  spikes:  9, jag: 0.14, seed: 71 },
    zap:    { word: 'ZAP!',    spikes: 14, jag: 0.32, seed: 89 }
  };

  /* An irregular star. Alternating long and short radii with the seed
     nudging each point, so no two plates share a silhouette. */
  function plate(spikes, jag, seed, cx, cy, r) {
    const rand = rng(seed);
    const pts = [];
    const n = spikes * 2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const long = i % 2 === 0;
      const k = (long ? 1 : 1 - jag) * (0.86 + rand() * 0.28);
      pts.push([
        (cx + Math.cos(a) * r * k).toFixed(1),
        (cy + Math.sin(a) * r * k).toFixed(1)
      ]);
    }
    return 'M' + pts.map(p => p.join(' ')).join(' L') + ' Z';
  }

  /* ══════════════════════════════════════════════════════════
     RAYS — tapered speed lines converging on a vanishing point
     ══════════════════════════════════════════════════════════ */
  function rays(opt) {
    const o = Object.assign({
      cx: 50, cy: 50,      // the vanishing point
      inner: 2,            // where the taper starts (≈0 makes a true point)
      outer: 200,          // how far past the panel the lines run
      count: 54,
      width: 3.2,          // half-width at the outer end
      from: 0, to: Math.PI * 2,
      seed: 7
    }, opt || {});

    const rand = rng(o.seed);
    const span = o.to - o.from;
    const out = [];

    for (let i = 0; i < o.count; i++) {
      const a = o.from + (i / o.count) * span + (rand() - 0.5) * (span / o.count) * 1.5;
      const len = o.outer * (0.55 + rand() * 0.45);
      const w = o.width * (0.35 + rand() * 0.9);
      const px = -Math.sin(a), py = Math.cos(a);

      const ax = o.cx + Math.cos(a) * o.inner;
      const ay = o.cy + Math.sin(a) * o.inner;
      const bx = o.cx + Math.cos(a) * len;
      const by = o.cy + Math.sin(a) * len;

      out.push(
        ax.toFixed(1) + ',' + ay.toFixed(1) + ' ' +
        (bx + px * w).toFixed(1) + ',' + (by + py * w).toFixed(1) + ' ' +
        (bx - px * w).toFixed(1) + ',' + (by - py * w).toFixed(1)
      );
    }
    return out;
  }

  /* ══════════════════════════════════════════════════════════
     Rendering
     ══════════════════════════════════════════════════════════ */

  /* A path mark, inked onto a transparent canvas. */
  function markCanvas(name, colour, S, lineWidth) {
    const spec = PATHS[name];
    if (!spec) return null;
    S = S || 256;
    const pad = 18;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    const k = (S - pad * 2) / 100;
    g.translate(pad, pad);
    g.scale(k, k);
    g.lineJoin = 'round';
    g.lineCap = 'round';

    let p;
    try { p = new Path2D(spec.fill || spec.line); } catch (e) { return null; }

    if (spec.fill) { g.fillStyle = colour; g.fill(p); }
    else { g.strokeStyle = colour; g.lineWidth = lineWidth || 8; g.stroke(p); }
    return c;
  }

  /* An SFX plate: paper-filled, ink-outlined, word set in Anton. */
  function sfxCanvas(name, ink, paper, S) {
    const s = SFX[name];
    if (!s) return null;
    S = S || 320;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    const cx = S / 2, cy = S / 2, r = S * 0.44;

    let p;
    try { p = new Path2D(plate(s.spikes, s.jag, s.seed, cx, cy, r)); }
    catch (e) { return null; }

    g.fillStyle = paper;
    g.fill(p);
    g.strokeStyle = ink;
    g.lineWidth = S * 0.028;
    g.lineJoin = 'round';
    g.stroke(p);

    // The word. Anton has no italic, so the tilt is the plate's energy.
    const size = Math.round(S * (s.word.length > 5 ? 0.15 : 0.19));
    g.save();
    g.translate(cx, cy);
    g.rotate(-0.09);
    g.font = '400 ' + size + 'px Anton, Impact, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = ink;
    g.fillText(s.word, 0, size * 0.06);
    g.restore();
    return c;
  }

  /* The same path mark as an <svg>, for layers that want real vectors. */
  function markSVG(name, opts) {
    const spec = PATHS[name];
    if (!spec) return null;
    const o = opts || {};
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', spec.fill || spec.line);
    if (spec.fill) {
      p.setAttribute('fill', o.colour || 'currentColor');
    } else {
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', o.colour || 'currentColor');
      p.setAttribute('stroke-width', o.width || 5.5);
      p.setAttribute('stroke-linecap', 'round');
      p.setAttribute('stroke-linejoin', 'round');
    }
    svg.appendChild(p);
    return svg;
  }

  window.DevTalksDoodleArt = {
    PATHS: PATHS,
    SFX: SFX,
    TECH: TECH,
    names: Object.keys(PATHS),
    techNames: Object.keys(TECH),
    sfxNames: Object.keys(SFX),
    plate: plate,
    rays: rays,
    rng: rng,
    markCanvas: markCanvas,
    sfxCanvas: sfxCanvas,
    markSVG: markSVG,

    /* Anton is embedded as a data URI, so it is available almost at once —
       but "almost" still draws the SFX plates in a fallback face. */
    ready: function () {
      return (document.fonts && document.fonts.ready)
        ? document.fonts.ready.catch(() => {})
        : Promise.resolve();
    }
  };
})();
