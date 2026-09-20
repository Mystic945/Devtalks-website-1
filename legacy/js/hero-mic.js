/* ============================================================
   DEVTALKS — MIC & WAVEFORM TUNNEL HERO
   ------------------------------------------------------------
   A real microphone sits in the hero — solid geometry, not a
   point cloud. Concentric sound loops radiate out behind it and
   travel toward the viewer, deforming like a voice waveform.
   Scrolling flies the camera past the mic and down the tunnel,
   which flares into a light portal and dissolves into the
   section below.

   WHY THE MIC IS GEOMETRY, NOT POINTS
   A point cloud can suggest a shape but never gives it an edge,
   and at phone size the points just read as grain. The mic is
   real geometry: a ball grille and a tapered barrel drawn as
   glowing contour loops, with a matte black shell inside so the
   far side of the wireframe is hidden, and an inside-out copy of
   that shell behind it to draw a bright line on the silhouette.
   Hidden back faces plus a real outline are what make a
   wireframe read as an object rather than a net.

   Exposes the same window.DevTalksHero interface as js/hero.js
   (init / reveal / enabled), so main.js needs no changes.

   ON "AUDIO-REACTIVE": there is no audio on this page, and
   reading the visitor's microphone would need a permission
   prompt nobody wants on a landing page. So the waveform is
   SIMULATED — layered sines whose amplitude responds to scroll
   velocity, pointer distance and taps. If you later add a clip
   per speaker, call DevTalksHero.setLevel(0..1) each frame from
   a WebAudio AnalyserNode and the loops become genuinely
   audio-reactive with no other change. DevTalksHero.pulse() is
   already wired for taps.

   The tunnel deforms entirely in the vertex shader, so the main
   thread stays free. Rendering pauses via IntersectionObserver
   the moment the canvas leaves the viewport.

   Budget:
     mobile   26 loops x 64 segments + ~2.6k mic line segments
     desktop  34 loops x 96 segments + ~3.6k mic line segments
     7 draw calls.

   Three mic shapes are built in and CONFIG.style picks one:
   'outline' (the line mic, in use), 'studio' (the same handheld
   as a solid red mic with a graphite grille) and 'broadcast'
   (the vintage art-deco mic on a stand). Adding ?mic=studio to
   the URL switches without editing anything, which is handy if
   you want to look at the others again later.

   Tuning knobs are in CONFIG.
   ============================================================ */

window.DevTalksHero = (function () {
  'use strict';

  const CONFIG = {
    ringsMobile:   26, segMobile:  64,
    ringsDesktop:  34, segDesktop: 96,
    ringGap:     0.78,     // spacing between loops, world units
    ringRadius:   2.0,     // resting radius
    pointSize:    30,      // (tunnel only)
    micRed:   0xD4140A,    // the mic's body — deliberately red, not the site
    micSpec:  0xC9744C,    // orange, so it reads as a separate object
    micLattice: 0xFF7A3C,  // the grille mesh over the head
    style: 'outline',      // outline | studio | broadcast  (?mic= overrides)
    flySpeed:     14.0,    // how far the camera travels over one screen of scroll
    ease:        0.06
  };

  let renderer, scene, camera, clock;
  let tunnel, mic, micMats = [], enabled = false, visible = true, raf = null;

  const pointer = { x: 0, y: 0 };
  const smooth  = { x: 0, y: 0 };
  let scrollNorm = 0, lastScroll = 0, velocity = 0;
  let level = 0, levelTarget = 0, pulseEnergy = 0;
  let micOpacity = 0;              // driven by reveal(), then by scroll
  let externalLevel = -1;          // set by setLevel() for real audio

  const isPhone = () => window.innerWidth < 700;

  /* ══════════════════════════════════════════════════════════
     The microphone — built, not sampled

     All numbers are world units; the whole thing is about 3.3
     tall and layout() scales it to fit the shot.
     ══════════════════════════════════════════════════════════ */
  function bodyMaterial(extra) {
    const m = new THREE.MeshPhongMaterial(Object.assign({
      color:     CONFIG.micRed,
      specular:  CONFIG.micSpec,
      shininess: 34,
      emissive:  0x2A0704,        // keeps it from going flat black in shadow
      transparent: true,
      opacity:   0
    }, extra || {}));
    micMats.push(m);
    return m;
  }

  /* The grille mesh, drawn as latitude rings plus a few meridians.
     A full lat-long wireframe sphere looks like a globe; a real grille reads
     as tight horizontal banding, so that is what this draws. It is also the
     same line language as the tunnel, which ties the two together. */
  function grilleLines(R, rings, meridians, phiMax) {
    const PHI = phiMax || Math.PI;
    const pts = [];
    const push = (x1,y1,z1,x2,y2,z2) => pts.push(x1,y1,z1,x2,y2,z2);
    const SEG = 40;

    for (let r = 1; r <= rings; r++) {
      const phi = (r / (rings + 1)) * PHI;              // 0 = top pole
      const y   = Math.cos(phi) * R, rad = Math.sin(phi) * R;
      for (let i = 0; i < SEG; i++) {
        const a0 = (i / SEG) * Math.PI * 2, a1 = ((i + 1) / SEG) * Math.PI * 2;
        push(Math.cos(a0)*rad, y, Math.sin(a0)*rad,
             Math.cos(a1)*rad, y, Math.sin(a1)*rad);
      }
    }
    for (let m = 0; m < meridians; m++) {
      const a = (m / meridians) * Math.PI * 2;
      const A = Math.PI * 0.16, B = Math.min(Math.PI * 0.84, PHI);  // short of the pole
      for (let i = 0; i < SEG / 2; i++) {
        const p0 = A + (i / (SEG/2)) * (B - A), p1 = A + ((i + 1) / (SEG/2)) * (B - A);
        push(Math.sin(p0)*Math.cos(a)*R, Math.cos(p0)*R, Math.sin(p0)*Math.sin(a)*R,
             Math.sin(p1)*Math.cos(a)*R, Math.cos(p1)*R, Math.sin(p1)*Math.sin(a)*R);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
    return geo;
  }

  function lineMaterial(color, opacity) {
    const m = new THREE.LineBasicMaterial({
      color: color, transparent: true, opacity: 0,
      depthTest: true, depthWrite: false
    });
    m.userData.maxOpacity = (opacity === undefined ? 0.62 : opacity);
    micMats.push(m);
    return m;
  }

  /* A matte black shell sitting just inside the line work, so the glowing
     tunnel behind does not shine through the mic and flatten it. */
  function occluder(geo, y) {
    const m = new THREE.MeshBasicMaterial({
      color: 0x050302, transparent: true, opacity: 0, depthWrite: true
    });
    micMats.push(m);
    const mesh = new THREE.Mesh(geo, m);
    if (y !== undefined) mesh.position.y = y;
    // drawn BEFORE the line work so it fills the depth buffer first; the
    // contours then depth-test against it and the far side of the mic is
    // hidden, which is the whole difference between a readable object and a
    // ball of wire
    mesh.renderOrder = 0;
    return mesh;
  }

  /* An inside-out copy of the shell, a hair larger and drawn first. Everything
     of it that the black shell then covers disappears, so all that survives is
     a bright line exactly on the silhouette — the outline that turns a net of
     contours into an object with an edge. */
  function rimShell(geo, y, grow) {
    const m = new THREE.MeshBasicMaterial({
      color: 0xFF8A34, side: THREE.BackSide,
      transparent: true, opacity: 0, depthWrite: false
    });
    m.userData.maxOpacity = 0.95;
    micMats.push(m);
    const mesh = new THREE.Mesh(geo, m);
    if (y !== undefined) mesh.position.y = y;
    mesh.scale.setScalar(grow || 1.035);
    mesh.renderOrder = -1;
    return mesh;
  }

  /* ---------- STYLE A: studio handheld ----------
     The shape everyone reads as "microphone" instantly. Deep red barrel with
     a real taper, graphite ball grille, one chrome ring. */
  function buildStudio(phone) {
    const g = new THREE.Group();
    const seg = phone ? 26 : 44;

    const grille = new THREE.Mesh(
      new THREE.SphereGeometry(0.70, seg, phone ? 20 : 28),
      bodyMaterial({ color: 0x1E1A19, specular: 0x5E524C, shininess: 15,
                     emissive: 0x0C0807 })
    );
    grille.position.y = 1.16;
    grille.scale.y = 0.93;
    g.add(grille);

    const mesh = new THREE.LineSegments(
      grilleLines(0.706, phone ? 12 : 16, phone ? 9 : 12),
      lineMaterial(CONFIG.micLattice, 0.5)
    );
    mesh.position.y = 1.16; mesh.scale.y = 0.93;
    g.add(mesh);

    // chrome ring where the grille screws on
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(0.50, 0.52, 0.13, seg),
      bodyMaterial({ color: 0x4A4644, specular: 0xFFE8D8, shininess: 140,
                     emissive: 0x0E0B09 })
    );
    ring.position.y = 0.62;
    g.add(ring);

    // the barrel, tapering hard — this is what stops it looking like a flask
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.47, 0.285, 2.00, seg),
      bodyMaterial({ color: 0xB2120A, emissive: 0x220503, shininess: 40 })
    );
    body.position.y = -0.45;
    g.add(body);

    const sw = new THREE.Mesh(
      new THREE.BoxGeometry(0.13, 0.30, 0.10),
      bodyMaterial({ color: 0x120808, specular: 0xB07058, shininess: 90 })
    );
    sw.position.set(0, -0.02, 0.41);
    g.add(sw);

    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.30, 0.255, 0.17, seg),
      bodyMaterial({ color: 0x3A3634, specular: 0xE8CFBE, shininess: 130,
                     emissive: 0x0A0807 })
    );
    cap.position.y = -1.54;
    g.add(cap);

    g.rotation.z = 0.20;
    g.userData.height = 3.4;
    return g;
  }

  /* ---------- STYLE B: vintage broadcast ----------
     The art-deco radio mic — the one that says "stage, talk, audience" before
     it says "microphone". Chrome shell, dark grille face, cradled in a yoke on
     a weighted base. */
  function buildBroadcast(phone) {
    const g = new THREE.Group();
    const seg = phone ? 24 : 40;

    // the shell: a lathed profile, then flattened on Z into the classic slab
    const profile = [
      [0.03, 1.32], [0.26, 1.30], [0.44, 1.20], [0.54, 1.02],
      [0.58, 0.72], [0.58, -0.28], [0.54, -0.52], [0.44, -0.68],
      [0.24, -0.76], [0.03, -0.78]
    ].map(p => new THREE.Vector2(p[0], p[1]));

    const shell = new THREE.Mesh(
      new THREE.LatheGeometry(profile, seg),
      bodyMaterial({ color: 0x55504D, specular: 0xFFF0E2, shininess: 150,
                     emissive: 0x100C0A })
    );
    shell.scale.z = 0.44;
    g.add(shell);

    // the grille face, recessed into the front
    const face = new THREE.Mesh(
      new THREE.SphereGeometry(0.44, seg, 18),
      bodyMaterial({ color: 0x1A0A06, specular: 0x7A3418, shininess: 14,
                     emissive: 0x0A0302 })
    );
    face.position.set(0, 0.42, 0.20);
    face.scale.set(1.0, 1.28, 0.35);
    g.add(face);

    const faceLines = new THREE.LineSegments(
      grilleLines(0.452, phone ? 10 : 14, 0), lineMaterial(CONFIG.micLattice, 0.62)
    );
    faceLines.position.set(0, 0.42, 0.20);
    faceLines.scale.set(1.0, 1.28, 0.35);
    g.add(faceLines);

    // red accent band across the waist — the site's one hit of colour on it
    const accent = new THREE.Mesh(
      new THREE.LatheGeometry([
        new THREE.Vector2(0.585, -0.06), new THREE.Vector2(0.585, -0.24)
      ], seg),
      bodyMaterial({ color: 0xC4140A, emissive: 0x2A0503, shininess: 60,
                     side: THREE.DoubleSide })
    );
    accent.scale.z = 0.44;
    g.add(accent);

    // yoke + stand
    const yoke = new THREE.Mesh(
      new THREE.TorusGeometry(0.86, 0.05, 8, phone ? 26 : 44, Math.PI * 0.84),
      bodyMaterial({ color: 0x4A4644, specular: 0xFFE2CE, shininess: 140,
                     emissive: 0x0C0908 })
    );
    yoke.position.y = 0.28;
    yoke.rotation.z = Math.PI * 1.08;
    g.add(yoke);

    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.10, 0.13, 0.62, seg),
      bodyMaterial({ color: 0x3E3A38, specular: 0xE8D2C0, shininess: 120,
                     emissive: 0x0A0807 })
    );
    post.position.y = -1.14;
    g.add(post);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.72, 0.20, seg),
      bodyMaterial({ color: 0x2A2624, specular: 0xD8C0AE, shininess: 110,
                     emissive: 0x080605 })
    );
    base.position.y = -1.55;
    g.add(base);

    g.rotation.z = 0.06;
    g.userData.height = 3.4;
    return g;
  }

  /* ---------- STYLE C: line mic ----------
     No shading at all — the mic drawn as glowing contour loops, exactly the
     language the tunnel already speaks. A black shell inside keeps the loops
     behind it from showing through, so it still reads as a solid object. */
  function buildOutline(phone) {
    const g = new THREE.Group();
    const seg = phone ? 24 : 40;
    const pts = [];
    const ring = (y, r, tilt) => {
      const N = 44;
      for (let i = 0; i < N; i++) {
        const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
        pts.push(Math.cos(a0)*r, y + Math.sin(a0)*(tilt||0), Math.sin(a0)*r,
                 Math.cos(a1)*r, y + Math.sin(a1)*(tilt||0), Math.sin(a1)*r);
      }
    };

    /* ---- proportions ----
       The ball and the barrel used to simply overlap, which left a step where
       the barrel was wider than the ball it was supposed to hang from. They
       now meet at a measured radius: the ellipsoid is exactly COLLAR_R across
       at COLLAR_Y, the barrel starts that same width, and a knurled ferrule
       sits over the seam. Nothing has to hide anything. */
    const HEAD_Y = 1.16, HEAD_R = 0.70, HEAD_SQ = 0.93;
    const COLLAR_R = 0.50;
    // where the ellipsoid is COLLAR_R wide
    const COLLAR_Y = HEAD_Y - HEAD_SQ * Math.sqrt(HEAD_R*HEAD_R - COLLAR_R*COLLAR_R);
    const TOP = COLLAR_Y - 0.06, BOT = -1.52;
    const TOP_R = COLLAR_R, BOT_R = 0.275;
    const radiusAt = (t) => TOP_R + (BOT_R - TOP_R) * t;

    // barrel contours, bunched up near the joint so the eye reads a junction
    // there rather than an evenly spaced grid running off the end of the ball
    const STEPS = 15;
    for (let i = 0; i <= STEPS; i++) {
      const t = Math.pow(i / STEPS, 1.35);
      ring(TOP + (BOT - TOP) * t, radiusAt(t));
    }
    // long edges running the length of it
    for (let m = 0; m < 8; m++) {
      const a = (m / 8) * Math.PI * 2;
      for (let i = 0; i < STEPS; i++) {
        const t0 = Math.pow(i / STEPS, 1.35), t1 = Math.pow((i + 1) / STEPS, 1.35);
        pts.push(Math.cos(a)*radiusAt(t0), TOP + (BOT - TOP)*t0, Math.sin(a)*radiusAt(t0),
                 Math.cos(a)*radiusAt(t1), TOP + (BOT - TOP)*t1, Math.sin(a)*radiusAt(t1));
      }
    }

    /* Per-vertex colour down the barrel: hot where it meets the grille,
       cooling to a deep ember at the cap. One draw call, and it stops the
       wireframe reading as a flat uniform net. */
    const cols = new Float32Array(pts.length);
    const hot = new THREE.Color(0xFFB04A), cool = new THREE.Color(0xC22C06);
    const tmp = new THREE.Color();
    for (let i = 0, n = pts.length / 3; i < n; i++) {
      const t = Math.min(Math.max((TOP - pts[i * 3 + 1]) / (TOP - BOT), 0), 1);
      tmp.copy(hot).lerp(cool, t * t);
      cols[i * 3] = tmp.r; cols[i * 3 + 1] = tmp.g; cols[i * 3 + 2] = tmp.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(cols, 3));
    const barrelMat = lineMaterial(0xFFFFFF, 0.95);
    barrelMat.vertexColors = true;
    const barrel = new THREE.LineSegments(geo, barrelMat);
    barrel.renderOrder = 2;
    g.add(barrel);

    /* ---- the ferrule over the seam ----
       Five rings with a slight bulge plus vertical knurling, which is what
       makes a joint read as a machined collar rather than a place where two
       shapes happen to end. */
    const cPts = [];
    const cRing = (y, r) => {
      const N = 48;
      for (let i = 0; i < N; i++) {
        const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
        cPts.push(Math.cos(a0)*r, y, Math.sin(a0)*r,
                  Math.cos(a1)*r, y, Math.sin(a1)*r);
      }
    };
    const CB = COLLAR_Y - 0.055, CT = COLLAR_Y + 0.075;
    [[CB, 0.497], [CB + 0.033, 0.506], [COLLAR_Y + 0.010, 0.510],
     [CT - 0.033, 0.506], [CT, 0.496]].forEach(v => cRing(v[0], v[1]));
    for (let i = 0; i < (phone ? 20 : 30); i++) {
      const a = (i / (phone ? 20 : 30)) * Math.PI * 2;
      cPts.push(Math.cos(a)*0.509, CB + 0.012, Math.sin(a)*0.509,
                Math.cos(a)*0.509, CT - 0.012, Math.sin(a)*0.509);
    }

    /* ---- the blend ----
       Three extra latitudes on the ball immediately above the ferrule. The
       contour spacing tightens as the ball narrows into the collar, so the
       two shapes flow together instead of butting up against each other. */
    [0.535, 0.575, 0.615].forEach(r => {
      cRing(HEAD_Y - HEAD_SQ * Math.sqrt(HEAD_R*HEAD_R - r*r), r);
    });

    const cGeo = new THREE.BufferGeometry();
    cGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(cPts), 3));
    const collar = new THREE.LineSegments(cGeo, lineMaterial(0xFFE0B0, 1.0));
    collar.renderOrder = 3;
    g.add(collar);

    /* the ball, cut off just above the ferrule so no contours run down inside
       the barrel */
    const head = new THREE.LineSegments(
      grilleLines(HEAD_R, phone ? 13 : 17, phone ? 10 : 14,
                  Math.PI - Math.asin(0.635 / HEAD_R)),
      lineMaterial(0xFFC16A, 1.0)
    );
    head.position.y = HEAD_Y; head.scale.y = HEAD_SQ;
    head.renderOrder = 2;
    g.add(head);

    /* black shells so the tunnel does not shine through, each with a rim
       copy behind it to draw the silhouette */
    const headGeo   = new THREE.SphereGeometry(HEAD_R * 0.985, seg, 18);
    const barrelGeo = new THREE.CylinderGeometry(TOP_R * 0.985, BOT_R * 0.97,
                                                 TOP - BOT, seg);
    const collarGeo = new THREE.CylinderGeometry(0.50, 0.50, CT - CB, seg);
    const barrelY   = (TOP + BOT) * 0.5, collarY = (CT + CB) * 0.5;

    const hr = rimShell(headGeo, HEAD_Y, 1.045);
    hr.scale.y *= HEAD_SQ; g.add(hr);
    g.add(rimShell(barrelGeo, barrelY, 1.03));
    g.add(rimShell(collarGeo, collarY, 1.02));

    const hs = occluder(headGeo, HEAD_Y);
    hs.scale.y = HEAD_SQ; g.add(hs);
    g.add(occluder(barrelGeo, barrelY));
    g.add(occluder(collarGeo, collarY));

    g.rotation.z = 0.20;
    g.userData.height = 3.4;
    return g;
  }

  /* 'none' is a real option: the waveform tunnel carries the hero on its own,
     and an object in front of it is only worth it if it beats what it hides. */
  function buildNone() { const g = new THREE.Group(); g.userData.height = 1; return g; }

  const STYLES = { studio: buildStudio, broadcast: buildBroadcast,
                   outline: buildOutline, none: buildNone };

  function buildMic(phone) {
    let style = CONFIG.style;
    // a page can pick its own: <script>window.DEVTALKS_MIC='none';</script>
    // before this file loads. index-tunnel.html uses that to run with no mic.
    if (window.DEVTALKS_MIC && STYLES[window.DEVTALKS_MIC]) style = window.DEVTALKS_MIC;
    try {                          // ?mic=outline|studio|broadcast|none
      const q = new URLSearchParams(location.search).get('mic');
      if (q && STYLES[q]) style = q;
    } catch (e) {}
    return (STYLES[style] || buildOutline)(phone);
  }

  function lights() {
    // Key from the front-right — this is the light that draws the silhouette.
    const key = new THREE.DirectionalLight(0xFFF1E4, 1.12);
    key.position.set(5, 7, 9);
    scene.add(key);

    // Warm rim from behind-left, so the mic gets a lit edge against the black.
    const rim = new THREE.PointLight(0xFF6A2A, 1.55, 34, 2);
    rim.position.set(-5.5, 2.4, 2.0);
    scene.add(rim);

    // A low fill from the tunnel's direction, so the mic looks lit BY the
    // loops rather than by a lamp that isn't in the picture.
    const fill = new THREE.PointLight(0xF7A93C, 1.1, 26, 2);
    fill.position.set(1.5, -2.0, -4.0);
    scene.add(fill);

    scene.add(new THREE.AmbientLight(0x4A2618, 0.95));
  }

  function setMicOpacity(v) {
    micOpacity = v;
    for (let i = 0; i < micMats.length; i++) {
      const m = micMats[i];
      m.opacity = (m.userData.maxOpacity !== undefined ? m.userData.maxOpacity : 1.0) * v;
      m.visible = v > 0.01;
    }
  }

  /* ══════════════════════════════════════════════════════════
     The tunnel — loops of light, deformed on the GPU
     ══════════════════════════════════════════════════════════ */
  /* Each ring is a closed LOOP of line segments, not a scatter of points.
     Vertices are emitted in pairs (v0,v1)(v1,v2)...(vN-1,v0) so the whole
     tunnel is one THREE.LineSegments — every ring drawn as a continuous
     stroke, still a single draw call. */
  function tunnelGeometry(rings, seg) {
    const total = rings * seg * 2;                 // two vertices per segment
    const pos = new Float32Array(total * 3);
    const rnd = new Float32Array(total);
    const rng = new Float32Array(total);
    const ang = new Float32Array(total);

    let n = 0;
    for (let r = 0; r < rings; r++) {
      const jitter = Math.random();
      for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * Math.PI * 2;
        const a1 = ((i + 1) / seg) * Math.PI * 2;   // wraps to a0 of 0 at the end
        for (let k = 0; k < 2; k++) {
          pos[n * 3] = 0; pos[n * 3 + 1] = 0; pos[n * 3 + 2] = -r * CONFIG.ringGap;
          rng[n] = r; ang[n] = k ? a1 : a0; rnd[n] = jitter;
          n++;
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aRand',  new THREE.BufferAttribute(rnd, 1));
    geo.setAttribute('aRing',  new THREE.BufferAttribute(rng, 1));
    geo.setAttribute('aAngle', new THREE.BufferAttribute(ang, 1));
    return geo;
  }

  const VERT = `
    uniform float uTime, uLevel, uScroll;
    uniform float uRings, uGap, uRadius, uDrift;
    attribute float aRand, aRing, aAngle;
    varying float vGlow, vDepth;

    void main(){
      // loops travel toward the viewer and wrap round at the front
      float z = mod(aRing * uGap + uDrift, uRings * uGap) - uRings * uGap * 0.72 + 4.0;

      // the waveform: layered sines round the loop, scrolling with time and
      // scaled by the current level. Three harmonics is enough to read as a
      // voice trace rather than a clean sine.
      float a = aAngle;
      float w = sin(a * 3.0 + uTime * 1.7 - aRing * 0.22) * 0.55
              + sin(a * 7.0 - uTime * 2.3 + aRing * 0.15) * 0.28
              + sin(a * 13.0 + uTime * 3.1) * 0.14;

      float amp = 0.18 + uLevel * 1.15;
      float r = uRadius + w * amp + sin(uTime * 0.8 + aRing * 0.3) * 0.06;

      // the portal: loops flare outward as the camera dives through
      r *= 1.0 + uScroll * uScroll * 3.4;

      vec3 p = vec3(cos(a) * r, sin(a) * r, z);
      vGlow = abs(w) * (0.5 + uLevel * 1.5) + 0.30;

      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      vDepth = -mv.z;
    }
  `;

  const FRAG = `
    uniform vec3 uColorA, uColorB;
    uniform float uOpacity, uScroll;
    varying float vGlow, vDepth;
    void main(){
      vec3 c = mix(uColorA, uColorB, clamp(vGlow - 0.25, 0.0, 1.0));
      // near loops fade so the camera never punches into a wall of light
      float near = smoothstep(0.1, 3.2, vDepth);
      float fog  = 1.0 - smoothstep(14.0, 30.0, vDepth);
      gl_FragColor = vec4(c, vGlow * near * fog * uOpacity * (1.0 - uScroll * 0.55));
    }
  `;

  function themeColor(name, fallback) {
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v ? new THREE.Color(v) : fallback;
    } catch (e) { return fallback; }
  }

  function tunnelMaterial(rings) {
    return new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 }, uOpacity: { value: 0 },
        uLevel: { value: 0 }, uScroll: { value: 0 },
        uRings: { value: rings }, uGap: { value: CONFIG.ringGap },
        uRadius: { value: CONFIG.ringRadius }, uDrift: { value: 0 },
        uColorA: { value: themeColor('--hero-a', new THREE.Color(0xEC691B)) },
        uColorB: { value: themeColor('--hero-b', new THREE.Color(0xF7A93C)) }
      }
    });
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
        canvas: canvas, alpha: true, antialias: !isPhone(),
        powerPreference: 'high-performance'
      });
    } catch (e) { return false; }

    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setPixelRatio(dpr());
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 90);

    const phone = isPhone();
    const rings = phone ? CONFIG.ringsMobile : CONFIG.ringsDesktop;
    const seg   = phone ? CONFIG.segMobile   : CONFIG.segDesktop;

    tunnel = new THREE.LineSegments(tunnelGeometry(rings, seg), tunnelMaterial(rings));
    scene.add(tunnel);

    micMats = [];
    mic = buildMic(phone);
    setMicOpacity(0);
    scene.add(mic);
    lights();

    layout();
    clock = new THREE.Clock();
    enabled = true;
    bind(canvas);
    loop();
    return true;
  }

  function layout() {
    const phone = isPhone();
    // Desktop: the headline is left-aligned, so the mic stands right of it.
    // Phone: the copy fills the lower two thirds, so the mic takes the top.
    const ox = phone ? 0.1 : 1.8;
    const oy = phone ? 2.4 : 0.0;
    const sc = phone ? 0.68 : 1;

    tunnel.position.set(ox, oy, 0);
    tunnel.scale.setScalar(sc);

    // The mic stands close to a wide lens, well in front of the loops, so the
    // near side of the grille is noticeably larger than the far side. That
    // foreshortening plus the lit rim is what reads as "in front of the
    // screen".
    //
    // It is also pushed off the camera axis rather than sitting on it, because
    // the canvas renders BEHIND the page text: anything overlapping the
    // headline gets covered by it and stops looking like the nearest object.
    //
    // On a phone the clear band above the headline is only about a third of
    // the screen, so the mic is framed on its head — the stem and base run
    // down behind the copy, which is what a real mic in shot would do anyway.
    mic.position.set(ox, oy + (phone ? 1.90 : 0.28), phone ? 4.0 : 4.6);
    mic.userData.baseScale = phone ? 0.67 : 0.96;
    mic.scale.setScalar(mic.userData.baseScale);

    camera.position.set(ox, oy, phone ? 11 : 9.5);
    camera.lookAt(ox, oy, 0);
    camera.userData.homeZ = camera.position.z;
  }

  function bind(canvas) {
    if (window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
      window.addEventListener('pointermove', (e) => {
        pointer.x =  (e.clientX / window.innerWidth  - 0.5) * 2;
        pointer.y = -(e.clientY / window.innerHeight - 0.5) * 2;
      }, { passive: true });
    }

    // a tap anywhere in the hero kicks the waveform
    canvas.parentElement && canvas.parentElement.addEventListener(
      'pointerdown', () => pulse(1), { passive: true });

    lastScroll = window.scrollY;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      velocity = Math.min(Math.abs(y - lastScroll) / 24, 1.2);
      lastScroll = y;
      scrollNorm = Math.min(y / (window.innerHeight || 1), 1);
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
    layout();
  }

  /* ══════════════════════════════════════════════════════════
     Frame
     ══════════════════════════════════════════════════════════ */
  let revealTarget = 0;

  function loop() {
    raf = requestAnimationFrame(loop);
    if (!visible) { cancelAnimationFrame(raf); raf = null; return; }

    const t = clock.getElapsedTime();
    smooth.x += (pointer.x - smooth.x) * CONFIG.ease;
    smooth.y += (pointer.y - smooth.y) * CONFIG.ease;

    // The simulated "voice level": a slow breath, plus whatever the visitor
    // is doing — scrolling, moving the pointer, tapping. Replaced wholesale
    // if setLevel() is being fed from real audio.
    pulseEnergy *= 0.94;
    velocity    *= 0.90;
    levelTarget = 0.18
                + Math.abs(Math.sin(t * 0.55)) * 0.16
                + velocity * 0.45
                + Math.abs(smooth.x) * 0.18
                + pulseEnergy;
    level += ((externalLevel >= 0 ? externalLevel : levelTarget) - level) * 0.12;

    const tu = tunnel.material.uniforms;
    tu.uTime.value  = t;
    tu.uLevel.value = level;
    tu.uScroll.value += (scrollNorm - tu.uScroll.value) * 0.08;
    tu.uDrift.value += (1.6 + level * 2.6) * 0.016;

    const s = tu.uScroll.value;

    // scroll flies the camera down the tunnel, past the mic
    camera.position.z = camera.userData.homeZ - s * CONFIG.flySpeed;
    camera.position.x = tunnel.position.x + smooth.x * 0.5;
    camera.position.y = tunnel.position.y + smooth.y * 0.35;
    camera.lookAt(tunnel.position.x, tunnel.position.y, -6);

    tunnel.rotation.z = t * 0.03 + smooth.x * 0.12;

    // a standing lean toward the viewer, plus a bigger pointer swing than the
    // tunnel gets, so the mic feels like the nearest thing in the scene
    mic.rotation.y = smooth.x * 0.55 + Math.sin(t * 0.25) * 0.09;
    mic.rotation.x = -0.05 + smooth.y * 0.16;
    // it breathes with the level, very slightly — enough to feel alive
    mic.scale.setScalar((mic.userData.baseScale || 1) * (1 + level * 0.022));

    // as the camera dives, the mic swings past the lens and is gone
    const fade = 1 - Math.min(s / 0.34, 1);
    setMicOpacity(revealTarget * fade * fade);

    renderer.render(scene, camera);
  }

  function pulse(amount) {
    pulseEnergy = Math.min(pulseEnergy + (amount || 1) * 0.55, 1.1);
    if (!raf && visible) loop();
  }

  // Feed 0..1 from a WebAudio AnalyserNode to make the loops genuinely
  // audio-reactive. Pass -1 to hand control back to the simulation.
  function setLevel(v) { externalLevel = (typeof v === 'number') ? v : -1; }

  function revealStage() {
    if (!enabled) return;
    const tu = tunnel.material.uniforms.uOpacity;
    if (typeof gsap === 'undefined') { tu.value = 1; revealTarget = 1; return; }
    gsap.to(tu, { value: 1, duration: 1.8, ease: 'power2.out' });
    gsap.to({ v: 0 }, {
      v: 1, duration: 1.5, ease: 'power2.out', delay: 0.15,
      onUpdate: function () { revealTarget = this.targets()[0].v; }
    });
    gsap.from(camera.position, { z: camera.position.z + 7, duration: 2.2, ease: 'power3.out' });
  }

  return {
    init: init, reveal: revealStage, pulse: pulse, setLevel: setLevel,
    enabled: function () { return enabled; }
  };
})();
