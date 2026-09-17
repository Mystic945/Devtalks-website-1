/* ============================================================
   DEVTALKS — HERO STAGE (three holograms)
   ------------------------------------------------------------
   Three point-cloud speakers stand on a lit stage. Swinging a
   spotlight onto one materialises it like a hologram: it builds
   from the floor upward behind a bright scan line, then settles
   into scanlines, flicker, glitch slices and a lit silhouette
   edge. Its name plate fades up with it. Move the light away and
   it de-materialises.

   Cursor on desktop; deviceorientation on a phone.

   Exposes the same window.DevTalksHero interface as js/hero.js
   (init / reveal / enabled), so main.js needs no changes.

   Budget:
     • all three figures live in ONE BufferGeometry with a figure
       index per point, so the whole cast is a single draw call
     • mobile   3 x 850 figure + 450 floor = 3,000 points
     • desktop  3 x 4,200 + 2,400 floor    = 15,000 points
     • plus 2 cone meshes and 3 name sprites

   The silhouettes are drawn to an offscreen canvas at runtime
   and sampled, so there is no model to download.

   Tuning knobs are in CONFIG.
   ============================================================ */

window.DevTalksHero = (function () {
  'use strict';

  const CONFIG = {
    perFigureMobile:   850,
    perFigureDesktop: 4200,
    floorMobile:       450,
    floorDesktop:     2400,
    figureHeight:      3.9,
    pointSize:          32,
    coneLength:        8.5,
    coneSpread:       1.45,
    swing:            0.62,   // how far the beams travel, radians
    ease:            0.055,   // how lazily they follow the pointer
    revealEase:      0.075,   // how fast a hologram materialises
    lightRadius:       1.9    // how near a beam has to be to wake a figure
  };

  let renderer, scene, camera, clock;
  let figures, floor, cones = [], badges = [];
  let enabled = false, visible = true, raf = null;

  const pointer = { x: 0, y: 0 };
  const smooth  = { x: 0, y: 0 };
  let   tilting = false, scrollNorm = 0;

  const isPhone = () => window.innerWidth < 700;

  const LAMP = { x0: -2.4, x1: 2.4, y: 6.2, z: -0.4, solo: false };

  // local x of each speaker, the live reveal 0..1, and world centres
  const FIG_X   = [0, 0, 0];
  // the middle speaker stands forward, the outer two set back
  const FIG_Z   = [-1.15, 0.55, -1.15];
  const reveal  = [0, 0, 0];
  const centres = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];

  /* ══════════════════════════════════════════════════════════
     Silhouettes — drawn, then sampled
     ══════════════════════════════════════════════════════════ */
  function drawFigure(pose) {
    const W = 220, H = 340;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.strokeStyle = '#fff';
    g.lineCap = 'round'; g.lineJoin = 'round';

    g.beginPath(); g.arc(108, 50, 26, 0, Math.PI * 2); g.fill();
    g.fillRect(99, 72, 18, 18);
    g.beginPath();
    g.moveTo(70, 92); g.lineTo(146, 92);
    g.lineTo(137, 212); g.lineTo(79, 212); g.closePath(); g.fill();
    g.beginPath(); g.arc(74, 101, 15, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(142, 101, 15, 0, Math.PI * 2); g.fill();

    // Three postures, so the stage reads as three people rather than one
    // figure copied across.
    g.lineWidth = 17;
    if (pose === 0) {                       // mid-gesture, arm up
      g.beginPath(); g.moveTo(74, 106); g.lineTo(56, 158); g.lineTo(63, 198); g.stroke();
      g.beginPath(); g.moveTo(142, 104); g.lineTo(176, 126); g.lineTo(198, 92); g.stroke();
    } else if (pose === 1) {                // hands together, mid-sentence
      g.beginPath(); g.moveTo(74, 106); g.lineTo(62, 156); g.lineTo(98, 178); g.stroke();
      g.beginPath(); g.moveTo(142, 106); g.lineTo(154, 156); g.lineTo(118, 178); g.stroke();
    } else {                                // presenting, arm out to the side
      g.beginPath(); g.moveTo(74, 106); g.lineTo(44, 138); g.lineTo(18, 132); g.stroke();
      g.beginPath(); g.moveTo(142, 106); g.lineTo(156, 160); g.lineTo(150, 200); g.stroke();
    }

    g.lineWidth = 21;
    g.beginPath(); g.moveTo(95, 210); g.lineTo(91, 332); g.stroke();
    g.beginPath(); g.moveTo(124, 210); g.lineTo(130, 332); g.stroke();

    return { data: g.getImageData(0, 0, W, H).data, W: W, H: H };
  }

  /* All three figures in ONE geometry — one draw call for the whole cast.
     Each point carries which figure it belongs to, whether it sits on the
     silhouette edge (for the rim light) and how high up the body it is (for
     the materialise sweep and the scanlines). */
  function castGeometry(perFigure, spacing) {
    const total = perFigure * 3;
    const pos  = new Float32Array(total * 3);
    const fig  = new Float32Array(total);
    const edge = new Float32Array(total);
    const yN   = new Float32Array(total);
    const rnd  = new Float32Array(total);
    const scl  = new Float32Array(total);

    let n = 0;
    for (let f = 0; f < 3; f++) {
      const { data, W, H } = drawFigure(f);
      const solid = (x, y) =>
        x >= 0 && y >= 0 && x < W && y < H && data[(y * W + x) * 4 + 3] > 128;

      const hits = [];
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (!solid(x, y)) continue;
          const isEdge = !solid(x - 2, y) || !solid(x + 2, y) ||
                         !solid(x, y - 2) || !solid(x, y + 2);
          hits.push(isEdge ? -(x + y * W) - 1 : (x + y * W));
        }
      }

      const scale = CONFIG.figureHeight / H;
      FIG_X[f] = (f - 1) * spacing;

      for (let i = 0; i < perFigure; i++, n++) {
        const raw = hits[(Math.random() * hits.length) | 0];
        const isEdge = raw < 0;
        const hit = isEdge ? -(raw + 1) : raw;
        const px = hit % W, py = (hit / W) | 0;
        const belly = Math.cos((px / W - 0.5) * Math.PI);

        pos[n * 3]     = (px - W / 2) * scale + FIG_X[f];
        pos[n * 3 + 1] = (H - py) * scale - CONFIG.figureHeight * 0.52;
        pos[n * 3 + 2] = (Math.random() - 0.5) * 0.44 * (0.45 + belly * 0.75)
                         + FIG_Z[f];

        fig[n]  = f;
        edge[n] = isEdge ? 1 : 0;
        yN[n]   = (H - py) / H;
        rnd[n]  = Math.random();
        scl[n]  = 0.45 + Math.pow(Math.random(), 2.0) * 1.5;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aFig',     new THREE.BufferAttribute(fig, 1));
    geo.setAttribute('aEdge',    new THREE.BufferAttribute(edge, 1));
    geo.setAttribute('aY',       new THREE.BufferAttribute(yN, 1));
    geo.setAttribute('aRand',    new THREE.BufferAttribute(rnd, 1));
    geo.setAttribute('aScale',   new THREE.BufferAttribute(scl, 1));
    return geo;
  }

  function floorGeometry(count, spacing) {
    const pos  = new Float32Array(count * 3);
    const fig  = new Float32Array(count);
    const edge = new Float32Array(count);
    const yN   = new Float32Array(count);
    const rnd  = new Float32Array(count);
    const scl  = new Float32Array(count);
    const y0   = -CONFIG.figureHeight * 0.52;
    const rings = Math.floor(count * 0.42);

    for (let i = 0; i < count; i++) {
      let x, z;
      if (i < rings) {
        // emitter discs — a bright pool under each speaker, like a projector
        const f = i % 3;
        const a = Math.random() * Math.PI * 2;
        const r = 0.55 + Math.pow(Math.random(), 0.4) * 0.5;
        x = (f - 1) * spacing + Math.cos(a) * r;
        z = Math.sin(a) * r * 0.6 + FIG_Z[f];
      } else {
        const a = Math.random() * Math.PI * 2;
        const r = Math.pow(Math.random(), 0.55) * 9.5;
        x = Math.cos(a) * r; z = Math.sin(a) * r * 0.6;
      }
      pos[i * 3] = x;
      pos[i * 3 + 1] = y0 + (Math.random() - 0.5) * 0.05;
      pos[i * 3 + 2] = z;
      fig[i] = 3;              // 3 means "floor" — never treated as a hologram
      edge[i] = 0; yN[i] = 0;
      rnd[i] = Math.random();
      scl[i] = 0.3 + Math.random() * 0.8;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aFig',     new THREE.BufferAttribute(fig, 1));
    geo.setAttribute('aEdge',    new THREE.BufferAttribute(edge, 1));
    geo.setAttribute('aY',       new THREE.BufferAttribute(yN, 1));
    geo.setAttribute('aRand',    new THREE.BufferAttribute(rnd, 1));
    geo.setAttribute('aScale',   new THREE.BufferAttribute(scl, 1));
    return geo;
  }

  /* ══════════════════════════════════════════════════════════
     Shader — beams light the stage, reveal builds the hologram
     ══════════════════════════════════════════════════════════ */
  const VERT = `
    uniform float uTime, uSize, uPixelRatio, uScroll, uFalloff, uGlitch;
    uniform vec3  uL1o, uL1d, uL2o, uL2d, uReveal;
    attribute float aFig, aEdge, aY, aRand, aScale;
    varying float vLit, vRand, vDepth, vEdge, vY, vRev, vFig;

    float beam(vec3 p, vec3 o, vec3 d){
      vec3  v = p - o;
      float t = max(dot(v, d), 0.0);
      float r = length(v - d * t);
      return exp(-r * r * uFalloff) * (1.0 - smoothstep(2.0, 12.0, t));
    }
    float hash(float n){ return fract(sin(n) * 43758.5453123); }

    void main(){
      vec3 p = position;

      // which speaker this point belongs to; 3 is the stage floor
      float rev = aFig < 0.5 ? uReveal.x
                : aFig < 1.5 ? uReveal.y
                : aFig < 2.5 ? uReveal.z : 1.0;

      p.x += sin(uTime * 0.6 + aRand * 12.0) * 0.018;
      p.y += cos(uTime * 0.5 + aRand * 9.0)  * 0.018;

      // glitch: whole horizontal slices jump sideways for a frame or two,
      // and only while the hologram is actually present
      float band = floor(aY * 26.0);
      float fire = step(0.972, hash(band + floor(uTime * 5.0) * 7.31));
      p.x += fire * uGlitch * rev * (hash(band * 3.7 + floor(uTime * 5.0)) - 0.5) * 0.9;

      // points not yet materialised sit scattered, and gather as they build
      float built = 1.0 - smoothstep(rev * 1.25, rev * 1.25 + 0.16, aY);
      p += normalize(p + 0.001) * (1.0 - built) * (0.10 + aRand * 0.22) * (1.0 - rev * 0.5);

      p += normalize(p + 0.001) * uScroll * 3.0 * (0.4 + aRand);

      // the lamps are in world space but the cast is offset by its group
      vec3 wp = (modelMatrix * vec4(p, 1.0)).xyz;
      vLit = clamp(beam(wp, uL1o, uL1d) + beam(wp, uL2o, uL2d) * 0.8, 0.0, 1.4);

      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = uSize * aScale * uPixelRatio * (1.0 / max(-mv.z, 0.1));

      vRand = aRand; vDepth = -mv.z; vEdge = aEdge; vY = aY; vRev = rev; vFig = aFig;
    }
  `;

  const FRAG = `
    uniform vec3  uColorA, uColorB;
    uniform float uOpacity, uAmbient, uTime, uScan;
    varying float vLit, vRand, vDepth, vEdge, vY, vRev, vFig;

    void main(){
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      float a = smoothstep(0.5, 0.12, d);

      float alpha = a;
      vec3  c   = mix(uColorA, uColorB, smoothstep(0.55, 1.15, vLit + vRand * 0.25));
      float lit = uAmbient + vLit;

      if (vFig < 2.5) {                       // a speaker, not the floor
        float line  = vRev * 1.25;                       // the build front
        float built = 1.0 - smoothstep(line, line + 0.16, vY);
        float front = exp(-pow((vY - line) * 16.0, 2.0));

        float scan  = mix(1.0, 0.64 + 0.36 * sin(vY * 78.0 - uTime * 2.4), uScan * vRev);
        float flick = 0.86 + 0.14 * sin(uTime * 31.0 + vFig * 2.4)
                                  * sin(uTime * 7.3 + vFig);
        float rim   = 1.0 + vEdge * 1.5 * vRev;          // silhouette catches light

        lit   = lit * scan * flick * rim + front * 2.6 * vRev;
        alpha = a * mix(0.42, 1.0, clamp(built + front * 0.9, 0.0, 1.0))
                  * (0.55 + vRev * 0.45);
        c     = mix(c, uColorB, min(front * 1.3 + vEdge * 0.35, 1.0));
      }

      float fog = 1.0 - smoothstep(10.0, 26.0, vDepth);
      gl_FragColor = vec4(c, alpha * fog * lit * uOpacity);
    }
  `;

  function themeColor(name, fallback) {
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v ? new THREE.Color(v) : fallback;
    } catch (e) { return fallback; }
  }

  function pointsMaterial(ambient, scan) {
    return new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 }, uSize: { value: CONFIG.pointSize },
        uPixelRatio: { value: 1 }, uScroll: { value: 0 }, uOpacity: { value: 0 },
        uAmbient: { value: ambient }, uFalloff: { value: 0.30 },
        uScan: { value: scan }, uGlitch: { value: 1 },
        uReveal: { value: new THREE.Vector3(0, 0, 0) },
        uL1o: { value: new THREE.Vector3() }, uL1d: { value: new THREE.Vector3(0,-1,0) },
        uL2o: { value: new THREE.Vector3() }, uL2d: { value: new THREE.Vector3(0,-1,0) },
        uColorA: { value: themeColor('--hero-a', new THREE.Color(0xEC691B)) },
        uColorB: { value: themeColor('--hero-b', new THREE.Color(0xF7A93C)) }
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
     Cones
     ══════════════════════════════════════════════════════════ */
  const CONE_VERT = `
    varying vec2 vUv; varying vec3 vN, vView;
    void main(){
      vUv = uv; vN = normalize(normalMatrix * normal);
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vView = -mv.xyz; gl_Position = projectionMatrix * mv;
    }
  `;
  const CONE_FRAG = `
    uniform vec3 uColor; uniform float uIntensity;
    varying vec2 vUv; varying vec3 vN, vView;
    void main(){
      float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vView))), 2.2);
      gl_FragColor = vec4(uColor, fres * pow(vUv.y, 1.6) * uIntensity);
    }
  `;

  function makeCone(color) {
    const geo = new THREE.CylinderGeometry(0.06, CONFIG.coneSpread, CONFIG.coneLength, 30, 1, true);
    geo.translate(0, -CONFIG.coneLength / 2, 0);
    const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      vertexShader: CONE_VERT, fragmentShader: CONE_FRAG,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: color }, uIntensity: { value: 0 } }
    }));
    m.renderOrder = 2;
    return m;
  }

  /* ══════════════════════════════════════════════════════════
     Name plates
     ══════════════════════════════════════════════════════════ */
  function badgeTexture(label, name) {
    const W = 512, H = 160;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(12,8,6,0.86)';
    const r = 26;
    g.beginPath();
    g.moveTo(r,4); g.lineTo(W-r,4); g.quadraticCurveTo(W-4,4,W-4,r);
    g.lineTo(W-4,H-r); g.quadraticCurveTo(W-4,H-4,W-r,H-4);
    g.lineTo(r,H-4); g.quadraticCurveTo(4,H-4,4,H-r);
    g.lineTo(4,r); g.quadraticCurveTo(4,4,r,4); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(236,105,27,0.85)'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#EC691B'; g.font = '600 26px "JetBrains Mono", monospace';
    g.fillText(label, 34, 56);
    g.fillStyle = '#F3F2F0'; g.font = '700 46px Inter, Arial, sans-serif';
    g.fillText(name, 34, 116);
    const t = new THREE.CanvasTexture(c);
    t.minFilter = THREE.LinearFilter;
    return t;
  }

  function makeBadges() {
    const list = (typeof SPEAKERS !== 'undefined' && SPEAKERS.length)
      ? SPEAKERS.slice(0, 3)
      : [{ name: 'Speaker One' }, { name: 'Speaker Two' }, { name: 'Speaker Three' }];
    for (let i = 0; i < 3; i++) {
      const s = list[i] || list[0];
      const mat = new THREE.SpriteMaterial({
        map: badgeTexture(String(i + 1).padStart(2, '0') + ' / SPEAKER', s.name),
        transparent: true, opacity: 0, depthWrite: false, depthTest: false
      });
      const sp = new THREE.Sprite(mat);
      sp.renderOrder = 5;
      scene.add(sp);
      badges.push({ sprite: sp, phase: i * 2.1, home: new THREE.Vector3() });
    }
  }

  /* ══════════════════════════════════════════════════════════
     Setup
     ══════════════════════════════════════════════════════════ */
  function dpr() {
    const d = window.devicePixelRatio || 1;
    return isPhone() ? Math.min(d, 1.5) : Math.min(d, 2);
  }

  function init(canvas) {
    if (!canvas || typeof THREE === 'undefined') return false;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    try {
      const t = document.createElement('canvas');
      if (!(t.getContext('webgl') || t.getContext('experimental-webgl'))) return false;
    } catch (e) { return false; }
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas, alpha: true, antialias: false, powerPreference: 'high-performance'
      });
    } catch (e) { return false; }

    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setPixelRatio(dpr());
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 90);

    const phone = isPhone();
    const spacing = 2.95;

    figures = new THREE.Points(
      castGeometry(phone ? CONFIG.perFigureMobile : CONFIG.perFigureDesktop, spacing),
      pointsMaterial(0.16, 1));
    scene.add(figures);

    const flrMat = pointsMaterial(0.10, 0);
    flrMat.uniforms.uSize.value = CONFIG.pointSize * 0.7;
    floor = new THREE.Points(
      floorGeometry(phone ? CONFIG.floorMobile : CONFIG.floorDesktop, spacing), flrMat);
    scene.add(floor);

    cones = [
      makeCone(themeColor('--hero-a', new THREE.Color(0xEC691B))),
      makeCone(themeColor('--hero-b', new THREE.Color(0xF7A93C)))
    ];
    cones.forEach(c => scene.add(c));

    makeBadges();
    layout();

    clock = new THREE.Clock();
    enabled = true;
    bind(canvas);
    loop();
    return true;
  }

  function layout() {
    const phone = isPhone();

    // Desktop: the copy is left-aligned, so the cast slides right.
    // Phone: the copy fills the lower two thirds, so the cast moves up into
    // the empty top third, shrinks, and takes a single overhead beam — two
    // crossing beams in five world-units of width just read as noise.
    const ox = phone ? 0.15 : 6.2;
    const oy = phone ? 6.25 : -1.55;
    const sc = phone ? 0.55 : 1;

    [figures, floor].forEach(o => {
      if (!o) return;
      o.position.set(ox, oy, 0);
      o.scale.setScalar(sc);
    });
    if (figures) {
      figures.material.uniforms.uAmbient.value = phone ? 0.52 : 0.45;
      figures.material.uniforms.uGlitch.value  = phone ? 0.6 : 1;
    }
    if (floor) floor.material.uniforms.uAmbient.value = phone ? 0.13 : 0.10;

    camera.position.set(0, phone ? 1.7 : 0.1, phone ? 13.5 : 12.5);
    camera.lookAt(phone ? 0.2 : 2.8, phone ? 3.1 : -0.6, 0);

    LAMP.x0 = phone ? ox : ox - 2.6;
    LAMP.x1 = phone ? ox : ox + 2.6;
    LAMP.y  = oy + (phone ? 4.0 : 6.0);
    LAMP.z = -0.4;
    LAMP.solo = phone;

    cones.forEach((c, i) => {
      c.scale.setScalar(phone ? 0.62 : 1);
      c.visible = !(phone && i === 1);
      c.material.uniforms.uIntensity.value = 0;
    });

    for (let f = 0; f < 3; f++)
      centres[f].set(FIG_X[f] * sc + ox, oy, FIG_Z[f] * sc);

    badges.forEach((b, i) => {
      const w = phone ? 1.85 : 2.3;
      b.sprite.scale.set(w, w * 0.312, 1);
      // On a phone all three plates share one slot above the cast and
      // cross-fade — three legible name plates will not fit side by side.
      b.home.copy(phone
        ? new THREE.Vector3(ox - 0.15, oy + 0.95, 1.4)
        : new THREE.Vector3(centres[i].x, oy + CONFIG.figureHeight * 0.80, 1.4));
      b.sprite.position.copy(b.home);
    });
  }

  function bind(canvas) {
    if (window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
      window.addEventListener('pointermove', (e) => {
        pointer.x =  (e.clientX / window.innerWidth  - 0.5) * 2;
        pointer.y = -(e.clientY / window.innerHeight - 0.5) * 2;
      }, { passive: true });
    }

    const onTilt = (e) => {
      if (e.gamma == null && e.beta == null) return;
      tilting = true;
      pointer.x = Math.max(-1, Math.min(1, (e.gamma || 0) / 35));
      pointer.y = Math.max(-1, Math.min(1, ((e.beta || 45) - 45) / 40)) * -1;
    };
    const askTilt = () => {
      const D = window.DeviceOrientationEvent;
      if (!D) return;
      if (typeof D.requestPermission === 'function') {
        D.requestPermission()
          .then(s => { if (s === 'granted') window.addEventListener('deviceorientation', onTilt); })
          .catch(() => {});
      } else window.addEventListener('deviceorientation', onTilt);
    };
    if (window.DeviceOrientationEvent &&
        typeof window.DeviceOrientationEvent.requestPermission === 'function') {
      window.addEventListener('touchend', askTilt, { once: true });
    } else askTilt();

    window.addEventListener('scroll', () => {
      scrollNorm = Math.min(window.scrollY / (window.innerHeight || 1), 1);
    }, { passive: true });

    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 180); },
      { passive: true });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => {
        visible = es[0].isIntersecting;
        if (visible && !raf) loop();
      }, { threshold: 0 }).observe(canvas.parentElement || canvas);
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(raf); raf = null; }
      else if (visible && !raf) loop();
    });
  }

  function resize() {
    if (!enabled) return;
    const pr = dpr();
    renderer.setPixelRatio(pr);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    [figures, floor].forEach(o => { if (o) o.material.uniforms.uPixelRatio.value = pr; });
    layout();
  }

  /* ══════════════════════════════════════════════════════════
     Frame
     ══════════════════════════════════════════════════════════ */
  const _o = new THREE.Vector3(), _d = new THREE.Vector3(), _v = new THREE.Vector3();

  function aimCone(cone, x, rz, rx, uo, ud) {
    _o.set(x, LAMP.y, LAMP.z);
    cone.position.copy(_o);
    cone.rotation.set(rx, 0, rz);
    _d.set(0, -1, 0).applyEuler(cone.rotation).normalize();
    uo.value.copy(_o); ud.value.copy(_d);
    return _d.clone();
  }

  // how squarely a beam is pointing at this speaker
  function beamHit(centre, origin, dir) {
    _v.copy(centre).sub(origin);
    const along = Math.max(_v.dot(dir), 0);
    const rad = _v.sub(dir.clone().multiplyScalar(along)).length();
    return Math.exp(-(rad * rad) / (CONFIG.lightRadius * CONFIG.lightRadius));
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    if (!visible) { cancelAnimationFrame(raf); raf = null; return; }

    const t = clock.getElapsedTime();
    smooth.x += (pointer.x - smooth.x) * CONFIG.ease;
    smooth.y += (pointer.y - smooth.y) * CONFIG.ease;

    // With no pointer and no tilt the beams drift on their own, so the
    // holograms still take turns materialising for someone who never moves.
    const idle = (!tilting && Math.abs(pointer.x) < 0.001 && Math.abs(pointer.y) < 0.001)
      ? Math.sin(t * 0.30) * 0.75 : 0;
    const swing = smooth.x * CONFIG.swing + idle;
    const pitch = smooth.y * 0.26;

    const f = figures.material.uniforms, l = floor.material.uniforms;

    const d1 = aimCone(cones[0], LAMP.x0, swing + 0.16, pitch, f.uL1o, f.uL1d);
    const o1 = cones[0].position.clone();
    const d2 = aimCone(cones[1], LAMP.x1, swing - 0.22, pitch, f.uL2o, f.uL2d);
    const o2 = cones[1].position.clone();

    if (LAMP.solo) { f.uL2o.value.copy(f.uL1o.value); f.uL2d.value.set(0, 1, 0); }
    l.uL1o.value.copy(f.uL1o.value); l.uL1d.value.copy(f.uL1d.value);
    l.uL2o.value.copy(f.uL2o.value); l.uL2d.value.copy(f.uL2d.value);

    [f, l].forEach(u => {
      u.uTime.value = t;
      u.uScroll.value += (scrollNorm - u.uScroll.value) * 0.07;
    });

    // each speaker materialises by how squarely a beam is on them
    for (let i = 0; i < 3; i++) {
      let hit = beamHit(centres[i], o1, d1);
      if (!LAMP.solo) hit = Math.max(hit, beamHit(centres[i], o2, d2));
      reveal[i] += (Math.min(hit * 1.25, 1) - reveal[i]) * CONFIG.revealEase;
    }
    f.uReveal.value.set(reveal[0], reveal[1], reveal[2]);

    const yaw = smooth.x * 0.16, tip = smooth.y * 0.08;
    [figures, floor].forEach(o => { o.rotation.y = yaw; o.rotation.x = tip * 0.5; });

    let lead = 0;
    for (let i = 1; i < 3; i++) if (reveal[i] > reveal[lead]) lead = i;

    badges.forEach((b, i) => {
      b.sprite.position.y = b.home.y + Math.sin(t * 0.6 + b.phase) * 0.10;
      b.sprite.position.x = b.home.x + Math.cos(t * 0.4 + b.phase) * 0.06;
      // the plate belongs to its speaker, so it fades up with them
      const own = Math.min(reveal[i] * 1.35, 1);
      b.sprite.material.opacity = (LAMP.solo && i !== lead ? 0 : own) * (1 - scrollNorm);
    });

    const beam = (isPhone() ? 1.75 : 1.45) + Math.abs(smooth.x) * 0.35;
    cones.forEach(c => {
      c.material.uniforms.uIntensity.value = beam * (1 - scrollNorm) * f.uOpacity.value;
    });

    renderer.render(scene, camera);
  }

  /* Called by the door intro once it finishes */
  function revealStage() {
    if (!enabled) return;
    const us = [figures.material.uniforms.uOpacity, floor.material.uniforms.uOpacity];
    if (typeof gsap === 'undefined') { us.forEach(u => u.value = 1); return; }
    us.forEach(u => gsap.to(u, { value: 1, duration: 2.0, ease: 'power2.out' }));
    gsap.from(camera.position, { z: camera.position.z + 6, duration: 2.4, ease: 'power3.out' });
  }

  return { init: init, reveal: revealStage, enabled: function () { return enabled; } };
})();
