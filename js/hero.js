/* ============================================================
   DEVTALKS — HERO WebGL
   A particle field shaped like a distorted sphere. Reacts to
   pointer + scroll. Heavily downgraded on phones.

   Tuning knobs are in CONFIG right below.
   ============================================================ */

window.DevTalksHero = (function () {
  'use strict';

  const CONFIG = {
    countDesktop: 11000,   // particles on laptop/desktop
    countTablet:  6500,
    countMobile:  3000,    // phones — keep this low, it's the battery bill
    radius:       3.1,
    size:         26,      // base point size multiplier (bigger = fatter dots)
    colorA:       0xE62B1E, // main particle colour  (fallback)
    colorB:       0xFFFFFF, // sparkle highlight     (fallback)
    rotate:       0.055     // idle rotation speed
  };

  /* The particle colours follow the page's own theme: whatever --hero-a /
     --hero-b (or --red) resolve to in the active stylesheet wins, so a second
     index page with a different palette re-tints the hero with no JS change.
     Falls back to CONFIG above if the variables aren't defined. */
  function themeColor(varName, fallback) {
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      if (!v) return fallback;
      const c = new THREE.Color(v);
      return c;
    } catch (e) { return fallback; }
  }

  let renderer, scene, camera, points, material, clock;
  let raf = null, visible = true, enabled = false;
  const pointer   = { x: 0, y: 0 };
  const smoothed  = { x: 0, y: 0 };
  let scrollNorm  = 0;

  const VERT = `
    uniform float uTime;
    uniform float uSize;
    uniform vec2  uMouse;
    uniform float uScroll;
    uniform float uPixelRatio;
    attribute float aScale;
    attribute float aRand;
    varying float vRand;
    varying float vDepth;

    void main(){
      vec3 p = position;
      vec3 dir = normalize(position);
      float t = uTime * 0.22;

      // Layered sine displacement — cheaper than real noise, looks close enough
      float n  = sin(p.x * 1.9 + t)        * cos(p.y * 2.2 - t * 1.15);
      float n2 = sin(p.z * 2.6 + t * 0.75) * 0.6;
      p += dir * (n + n2) * 0.34;

      // Pointer repulsion
      vec2 m = uMouse * 2.6;
      float d = distance(p.xy, m);
      p.xy += normalize(p.xy - m + 0.0001) * (0.75 / (1.0 + d * d * 2.2));

      // Scroll dispersion — field blows apart as you leave the hero
      p += dir * uScroll * 2.2 * (0.45 + aRand);

      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = uSize * aScale * uPixelRatio * (1.0 / max(-mv.z, 0.1));

      vRand  = aRand;
      vDepth = -mv.z;
    }
  `;

  const FRAG = `
    uniform vec3  uColorA;
    uniform vec3  uColorB;
    uniform float uOpacity;
    varying float vRand;
    varying float vDepth;

    void main(){
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      float a = smoothstep(0.5, 0.12, d);
      vec3 c = mix(uColorA, uColorB, smoothstep(0.86, 1.0, vRand));
      float fog = 1.0 - smoothstep(3.0, 10.0, vDepth);
      gl_FragColor = vec4(c, a * fog * uOpacity);
    }
  `;

  function deviceCount() {
    const w = window.innerWidth;
    if (w < 700)  return CONFIG.countMobile;
    if (w < 1100) return CONFIG.countTablet;
    return CONFIG.countDesktop;
  }

  function devicePR() {
    const w = window.innerWidth;
    const dpr = window.devicePixelRatio || 1;
    return w < 700 ? Math.min(dpr, 1.5) : Math.min(dpr, 2);
  }

  function buildGeometry(count) {
    const geo = new THREE.BufferGeometry();
    const pos    = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const rands  = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Even-ish distribution on a sphere shell
      const u = Math.random(), v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi   = Math.acos(2 * v - 1);
      const r     = CONFIG.radius * (0.82 + Math.random() * 0.24);

      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.92;
      pos[i * 3 + 2] = r * Math.cos(phi);

      scales[i] = 0.4 + Math.pow(Math.random(), 2.2) * 1.9;
      rands[i]  = Math.random();
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aScale',   new THREE.BufferAttribute(scales, 1));
    geo.setAttribute('aRand',    new THREE.BufferAttribute(rands, 1));
    return geo;
  }

  function init(canvas) {
    if (!canvas || typeof THREE === 'undefined') return false;

    // Bail out entirely if the user asked for less motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;

    // Bail out if WebGL isn't available
    try {
      const test = document.createElement('canvas');
      if (!(test.getContext('webgl') || test.getContext('experimental-webgl'))) return false;
    } catch (e) { return false; }

    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: false,
        powerPreference: 'high-performance'
      });
    } catch (e) { return false; }

    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setPixelRatio(devicePR());

    scene  = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 60);
    camera.position.set(0, 0, 7.2);

    material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime:       { value: 0 },
        uSize:       { value: CONFIG.size },
        uMouse:      { value: new THREE.Vector2(0, 0) },
        uScroll:     { value: 0 },
        uPixelRatio: { value: devicePR() },
        uOpacity:    { value: 0 },
        uColorA:     { value: themeColor('--hero-a', new THREE.Color(CONFIG.colorA)) },
        uColorB:     { value: themeColor('--hero-b', new THREE.Color(CONFIG.colorB)) }
      }
    });

    points = new THREE.Points(buildGeometry(deviceCount()), material);
    scene.add(points);

    clock = new THREE.Clock();
    enabled = true;

    bind(canvas);
    loop();
    return true;
  }

  function bind(canvas) {
    // Pointer (desktop) — phones skip this, the field just breathes on its own
    if (window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
      window.addEventListener('pointermove', function (e) {
        pointer.x =  (e.clientX / window.innerWidth  - 0.5) * 2;
        pointer.y = -(e.clientY / window.innerHeight - 0.5) * 2;
      }, { passive: true });
    }

    window.addEventListener('scroll', function () {
      const h = window.innerHeight || 1;
      scrollNorm = Math.min(window.scrollY / h, 1);
    }, { passive: true });

    let rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(resize, 180);
    }, { passive: true });

    // Stop rendering when the hero scrolls away or the tab is hidden
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible && !raf) loop();
      }, { threshold: 0 });
      io.observe(canvas.parentElement || canvas);
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { cancelAnimationFrame(raf); raf = null; }
      else if (visible && !raf) loop();
    });
  }

  function resize() {
    if (!enabled) return;
    const pr = devicePR();
    renderer.setPixelRatio(pr);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    material.uniforms.uPixelRatio.value = pr;
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    if (!visible) { cancelAnimationFrame(raf); raf = null; return; }

    const t = clock.getElapsedTime();

    smoothed.x += (pointer.x - smoothed.x) * 0.045;
    smoothed.y += (pointer.y - smoothed.y) * 0.045;

    material.uniforms.uTime.value = t;
    material.uniforms.uMouse.value.set(smoothed.x, smoothed.y);
    material.uniforms.uScroll.value += (scrollNorm - material.uniforms.uScroll.value) * 0.07;

    points.rotation.y = t * CONFIG.rotate;
    points.rotation.x = smoothed.y * 0.18;
    points.rotation.z = smoothed.x * 0.06;

    renderer.render(scene, camera);
  }

  /* Called by the preloader once it finishes — fades the field in */
  function reveal() {
    if (!enabled || typeof gsap === 'undefined') {
      if (material) material.uniforms.uOpacity.value = 1;
      return;
    }
    gsap.to(material.uniforms.uOpacity, { value: 1, duration: 2.2, ease: 'power2.out' });
    gsap.from(camera.position, { z: 13, duration: 2.6, ease: 'power3.out' });
  }

  return { init: init, reveal: reveal, enabled: function () { return enabled; } };
})();
