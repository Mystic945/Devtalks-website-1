/* ============================================================
   DEVTALKS — DOODLE FIELDS  (paper edition only)
   ------------------------------------------------------------
   A developer's margin at real depth, behind three sections:
   the hero, "What is DevTalks", and the speaker line-up. Cogs,
   chips, terminals, cursors, braces, git branches, bugs, radar
   rings, pixel blocks — with the comic marks and the lettered
   SFX plates mixed through them.

   ONE ENGINE, THREE FIELDS
   Each section builds the same scene with its own config, and
   the only differences are density, size and ink — the motion is
   identical everywhere.

   ONE DRAW CALL PER FIELD
   Every mark used to be its own Mesh with its own texture, which
   meant 280 draw calls for 294 marks and nothing batching. Now
   every mark is baked into a single atlas at boot and the field
   is one InstancedMesh: 3 draw calls for the whole page. The
   per-instance UV window and opacity ride on instanced
   attributes, patched into the standard material rather than
   hand-writing a shader, so the material keeps three.js's own
   colour management and blending.

   The cost moves from the GPU's command stream to composing 96
   matrices per frame in JS, which is nothing.

   THE WANDER
   Each mark runs on two clocks, one for X and a slower one for
   Y, so it traces a slow open loop rather than sliding along a
   diagonal. A full wander takes 15-40 seconds: alive, but never
   fast enough to pull the eye off the copy.

   Each field is gated by its own IntersectionObserver, so
   exactly the one you are looking at is running — usually one,
   never three.

   Tuning knobs are in BASE and in the three FIELDS entries.
   ============================================================ */

(function () {
  'use strict';

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const BASE = {
    cols:       12,     // the field is a jittered grid, not a random scatter —
    rows:        8,     // random clusters and leaves bald patches
    jitter:   0.46,     // how far a mark strays from its cell, 0..0.5
    sfxEvery:   17,     // one cell in this many carries a lettered plate
    fill:     0.62,     // fraction of the frustum the grid spans past the edges
    near:      120,     // closest a mark comes to the camera
    far:      -480,     // furthest it drifts back
    minSize:    32,     // world size of the furthest mark
    maxSize:    70,     // ...and of the nearest
    minAlpha:  0.18,
    maxAlpha:  0.38,
    sfxAlpha:  0.55,
    spin:    0.014,     // radians/sec the whole field turns
    tumble:  0.010,     // barely — a mark turning edge-on is a sliver, and
                        // the brief asks for defined marks, not confetti
    bob:        14,     // px a mark rises and falls
    drift:      22,     // px it wanders sideways, on its own slower clock
    rateMin:  0.16,     // the slow end of a mark's personal clock
    rateMax:  0.42,     // ...and the fast end
    lean:     0.08,     // how far the field leans toward the pointer
    ease:     0.045,
    scrollPush: 220,    // px the field recedes over one screen of scroll
    seed:     4242
  };

  /* Per section. The hero carries more ink than the two content sections,
     which set body copy straight onto the field. */
  const FIELDS = [
    {
      sel: '#hero', cls: 'hero__doodles', id: 'heroDoodles',
      minAlpha: 0.30, maxAlpha: 0.58, sfxAlpha: 0.62,
      cols: 12, rows: 8, seed: 4242
    },
    {
      sel: '.sec--about',
      minAlpha: 0.10, maxAlpha: 0.22, sfxAlpha: 0.30,
      minSize: 30, maxSize: 62, cols: 9, rows: 6,
      sfxEvery: 23, scrollPush: 130, seed: 8181
    },
    {
      sel: '.sec--speakers',
      minAlpha: 0.10, maxAlpha: 0.22, sfxAlpha: 0.30,
      minSize: 30, maxSize: 62, cols: 9, rows: 6,
      sfxEvery: 23, scrollPush: 130, seed: 1337
    }
  ];

  const CELL = 256;   // atlas cell side. The marks render at 30-90px on
                      // screen, so 256 is already more than they can show.

  /* ══════════════════════════════════════════════════════════
     The atlas — every mark, once, in one texture
     ══════════════════════════════════════════════════════════ */
  let ATLAS = null;

  function buildAtlas() {
    if (ATLAS) return ATLAS.ok;
    const Art = window.DevTalksDoodleArt;
    if (!Art || typeof THREE === 'undefined') { ATLAS = { ok: false }; return false; }

    const css    = getComputedStyle(document.documentElement);
    const ink    = (css.getPropertyValue('--black')   || '#0b0b0b').trim();
    const orange = (css.getPropertyValue('--orange')  || '#ff5a1f').trim();
    const paper  = (css.getPropertyValue('--paper-2') || '#FBF8F2').trim();

    /* The tech set is listed twice and the comic set once, so cogs and
       terminals are the subject and the sparkles are the seasoning. */
    const order = Art.techNames
      .concat(Art.techNames)
      .concat(Art.names.filter(n => Art.techNames.indexOf(n) === -1));

    const tiles = [];
    order.forEach((n, i) => {
      // one mark in three is the spot colour — enough to belong to the
      // palette without becoming a pattern
      const c = Art.markCanvas(n, i % 3 === 1 ? orange : ink, CELL, 7);
      if (c) tiles.push({ canvas: c, sfx: false });
    });
    const markCount = tiles.length;

    Art.sfxNames.forEach((n) => {
      const c = Art.sfxCanvas(n, ink, paper, CELL);
      if (c) tiles.push({ canvas: c, sfx: true });
    });

    if (!markCount) { ATLAS = { ok: false }; return false; }

    const cols = 8;
    const rows = Math.ceil(tiles.length / cols);
    const sheet = document.createElement('canvas');
    sheet.width  = cols * CELL;
    sheet.height = rows * CELL;
    const g = sheet.getContext('2d');

    const uv = [];
    tiles.forEach((t, i) => {
      const cx = i % cols, cy = (i / cols) | 0;
      g.drawImage(t.canvas, cx * CELL, cy * CELL, CELL, CELL);
      // WebGL UV origin is bottom-left; the canvas is drawn top-down
      uv.push([cx / cols, (rows - 1 - cy) / rows, 1 / cols, 1 / rows]);
    });

    const tex = new THREE.CanvasTexture(sheet);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;

    ATLAS = {
      ok: true, tex: tex, uv: uv,
      marks:  uv.slice(0, markCount).map((_, i) => i),
      plates: uv.slice(markCount).map((_, i) => markCount + i)
    };
    return true;
  }

  /* The per-instance UV window and opacity, patched into the standard
     material. Hand-writing the whole shader would mean re-implementing
     three.js's colour management to get the same ink back. */
  function instanced(map) {
    const mat = new THREE.MeshBasicMaterial({
      map: map,
      transparent: true,
      side: THREE.DoubleSide,   // a mark turning past edge-on shows its back
      depthWrite: false
    });

    mat.onBeforeCompile = function (shader) {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>',
                 '#include <common>\nattribute vec4 aUv;\nattribute float aAlpha;\nvarying float vAlpha;')
        .replace('#include <uv_vertex>',
                 '#include <uv_vertex>\n\tvUv = uv * aUv.zw + aUv.xy;\n\tvAlpha = aAlpha;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>',
                 '#include <common>\nvarying float vAlpha;')
        .replace('#include <map_fragment>',
                 '#include <map_fragment>\n\tdiffuseColor.a *= vAlpha;');
    };
    return mat;
  }

  /* ══════════════════════════════════════════════════════════
     One field
     ══════════════════════════════════════════════════════════ */
  function Field(host, cfg) {
    const C = Object.assign({}, BASE, cfg);

    const canvas = document.createElement('canvas');
    canvas.className = 'doodle-field' + (C.cls ? ' ' + C.cls : '');
    canvas.setAttribute('aria-hidden', 'true');
    if (C.id) canvas.id = C.id;
    host.insertBefore(canvas, host.firstChild);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 1, 2400);
    camera.position.z = 620;

    const group = new THREE.Group();
    scene.add(group);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: false,      // MSAA on three contexts, for soft line art that
                             // is already smooth in its texture, buys nothing
      powerPreference: 'low-power'
    });
    // 1.5 is the knee: past it the fragment cost doubles and the marks,
    // which are blurred line art, look identical.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);

    const items = [];
    let mesh = null;
    let raf = null, visible = false, t0 = 0, spun = 0, scrollK = 0;
    const point = { x: 0, y: 0 }, eased = { x: 0, y: 0 };

    // reused every frame, so the loop allocates nothing
    const _v = new THREE.Vector3();
    const _q = new THREE.Quaternion();
    const _e = new THREE.Euler();
    const _s = new THREE.Vector3();
    const _m = new THREE.Matrix4();

    function size() {
      const r = host.getBoundingClientRect();
      const w = Math.max(1, r.width), h = Math.max(1, r.height);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }

    /* Spread is derived from what the camera can actually see at z=0, not
       from a fixed number — otherwise a tall section gets a band of marks
       across its middle and bare space above and below. */
    function spread() {
      const vh = 2 * Math.tan((camera.fov * Math.PI / 180) / 2) * camera.position.z;
      return { x: vh * camera.aspect * C.fill, y: vh * C.fill };
    }

    function build() {
      const rand = window.DevTalksDoodleArt.rng(C.seed);
      const count = C.cols * C.rows;
      const sp = spread();

      const geo = new THREE.PlaneGeometry(1, 1);
      const uvArr = new Float32Array(count * 4);
      const alArr = new Float32Array(count);

      for (let i = 0; i < count; i++) {
        const isSfx = ATLAS.plates.length && (i % C.sfxEvery === C.sfxEvery - 1);
        const cell = isSfx
          ? ATLAS.plates[(i / C.sfxEvery | 0) % ATLAS.plates.length]
          : ATLAS.marks[i % ATLAS.marks.length];
        const win = ATLAS.uv[cell];

        uvArr[i * 4]     = win[0];
        uvArr[i * 4 + 1] = win[1];
        uvArr[i * 4 + 2] = win[2];
        uvArr[i * 4 + 3] = win[3];

        const z = C.far + rand() * (C.near - C.far);
        const depth = (z - C.far) / (C.near - C.far);        // 0 far, 1 near

        // a jittered grid, covering the whole frustum edge to edge
        const cx = i % C.cols, cy = (i / C.cols) | 0;
        const ux = (cx + 0.5) / C.cols * 2 - 1;
        const uy = (cy + 0.5) / C.rows * 2 - 1;

        alArr[i] = isSfx
          ? C.sfxAlpha * (0.62 + depth * 0.38)
          : C.minAlpha + depth * (C.maxAlpha - C.minAlpha);

        items.push({
          x: (ux + (rand() * 2 - 1) * C.jitter * 2 / C.cols) * sp.x,
          y: (uy + (rand() * 2 - 1) * C.jitter * 2 / C.rows) * sp.y,
          z: z,
          size: (C.minSize + depth * (C.maxSize - C.minSize)) * (isSfx ? 1.25 : 1),
          rx: 0,
          rz: (rand() * 2 - 1) * 0.42,
          phase:  rand() * Math.PI * 2,
          phaseX: rand() * Math.PI * 2,
          spinX: (rand() - 0.5) * C.tumble * (isSfx ? 0.35 : 1),
          spinZ: (rand() - 0.5) * C.tumble * (isSfx ? 0.5 : 1.6),
          rate:  C.rateMin + rand() * (C.rateMax - C.rateMin),
          // a different clock for X, so a mark traces a slow open loop
          // instead of sliding up and down a diagonal
          rateX: (C.rateMin + rand() * (C.rateMax - C.rateMin)) * 0.63
        });
      }

      geo.setAttribute('aUv',    new THREE.InstancedBufferAttribute(uvArr, 4));
      geo.setAttribute('aAlpha', new THREE.InstancedBufferAttribute(alArr, 1));

      mesh = new THREE.InstancedMesh(geo, instanced(ATLAS.tex), count);
      mesh.frustumCulled = false;      // one object covering the whole field
      group.add(mesh);
      write(0);
    }

    /* Compose every instance matrix for time t. */
    function write(t) {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        _v.set(
          it.x + Math.cos(t * it.rateX + it.phaseX) * C.drift,
          it.y + Math.sin(t * it.rate  + it.phase)  * C.bob,
          it.z
        );
        _e.set(it.rx, 0, it.rz);
        _q.setFromEuler(_e);
        _s.set(it.size, it.size, 1);
        mesh.setMatrixAt(i, _m.compose(_v, _q, _s));
      }
      mesh.instanceMatrix.needsUpdate = true;
    }

    function frame(ts) {
      raf = requestAnimationFrame(frame);
      if (!t0) t0 = ts;
      const t = (ts - t0) / 1000;

      eased.x += (point.x - eased.x) * C.ease;
      eased.y += (point.y - eased.y) * C.ease;

      spun += C.spin / 60;
      group.rotation.y = spun + eased.x * C.lean;
      group.rotation.x = -eased.y * C.lean * 0.7;
      group.position.z = -scrollK * C.scrollPush;

      for (let i = 0; i < items.length; i++) {
        items[i].rx += items[i].spinX / 60;
        items[i].rz += items[i].spinZ / 60;
      }
      write(t);

      renderer.render(scene, camera);
    }

    const kick = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); };
    const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = null; t0 = 0; } };

    size();
    build();
    canvas.classList.add('is-on');
    renderer.render(scene, camera);

    // Reduced motion keeps the depth and loses the movement: one still frame
    // of the field, which is a printed page, not an empty one.
    if (REDUCED) return null;

    window.addEventListener('resize', () => {
      size();
      if (!raf) renderer.render(scene, camera);
    }, { passive: true });

    window.addEventListener('pointermove', (e) => {
      point.x = (e.clientX / window.innerWidth) * 2 - 1;
      point.y = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });

    window.addEventListener('scroll', () => {
      if (!visible) return;
      const r = host.getBoundingClientRect();
      scrollK = Math.max(-1, Math.min(1, -r.top / Math.max(window.innerHeight, 1)));
    }, { passive: true });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => {
        visible = es[0].isIntersecting;
        visible ? kick() : stop();
      }, { threshold: 0 }).observe(host);
    } else {
      visible = true; kick();
    }

    document.addEventListener('visibilitychange', () => {
      document.hidden ? stop() : kick();
    });

    return {
      kick: kick, stop: stop, running: () => !!raf,
      /* Frame cost, measured rather than guessed. rAF is throttled in a
         headless or backgrounded tab, so frames-per-second lies there;
         timing N synchronous renders does not. */
      bench: function (n) {
        const t = performance.now();
        for (let i = 0; i < (n || 30); i++) renderer.render(scene, camera);
        return { ms: +((performance.now() - t) / (n || 30)).toFixed(2),
                 calls: renderer.info.render.calls,
                 tris: renderer.info.render.triangles,
                 marks: items.length };
      }
    };
  }

  /* ══════════════════════════════════════════════════════════
     Setup
     ══════════════════════════════════════════════════════════ */
  const fields = [];

  function init() {
    if (!buildAtlas()) return;
    FIELDS.forEach((cfg) => {
      const host = document.querySelector(cfg.sel);
      if (!host || host.querySelector('.doodle-field')) return;
      const f = Field(host, cfg);
      if (f) fields.push(f);
    });
  }

  /* The SFX plates are lettered in Anton; drawing them before the face has
     landed bakes a fallback serif into the atlas permanently. */
  function boot() {
    if (!window.DevTalksDoodleArt) return;
    window.DevTalksDoodleArt.ready().then(init);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.DevTalksDoodles = {
    ready:   () => fields.length > 0,
    running: () => fields.some(f => f.running()),
    count:   () => fields.length,
    bench:   (n) => fields.map(f => f.bench(n))
  };
})();
