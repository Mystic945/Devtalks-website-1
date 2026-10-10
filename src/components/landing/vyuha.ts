/* ============================================================
   KURUKSHETRA — THE CHAKRAVYUHA
   ------------------------------------------------------------
   The landing page's scene: the spiral battle formation of the
   Mahabharata, seen from above and tilted back, like a brass
   astrolabe lying on a dark plain.

   WHAT IS IN IT
     • Seven rings of soldiers — shield outward, spear up — each
       ring a few ranks deep. Neighbouring rings turn in opposite
       directions, the inner ones fastest.
     • One gate in every ring, a gap with a fire on either post.
       The gates are staggered ring to ring, so as the rings turn
       the way to the centre keeps opening and closing: that is the
       whole point of a Chakravyuha.
     • Standards along each ring, a chakra turning at the eye, dust
       and a few embers in the air, and now and then a volley of
       arrows crossing overhead.

   HOW IT IS DRAWN
   One WebGL context. Every ring is one instanced mesh — a soldier
   is a single merged geometry with its colours baked into the
   vertices — so the whole army is seven draw calls, and turning a
   ring is turning one group. Nothing is written per soldier after
   the first frame.

   WHAT DRIVES IT
     • Time: the rings never stop turning.
     • The pointer: the view leans a few degrees toward it, with lag.
     • Scroll: `setProgress(0..1)` drops the camera into the eye. The
       rings pass outward and the page arrives on flat black, where
       the Möbius strip begins.

   The scene owns no listeners. The landing page tells it what the
   pointer and the scroll are doing and when it can be seen; see
   LandingPage.tsx.
   ============================================================ */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;

/** The page's ground. The scene falls to exactly this at its edges. */
const GROUND = 0x0b0b0b;

const FIELD = {
  rings: 7,
  /** radius of ring k */
  radius: (k: number) => 2.05 + k * 1.14,
  /** distance between ranks, and between soldiers along a rank */
  rankGap: 0.25,
  pace: 0.21,
  /** seconds for the innermost ring to turn once; each ring out is slower */
  turn: 90,
  turnStep: 26,
  /** where ring k's gate sits, and how wide it is at the path */
  gateAt: (k: number) => 0.6 + k * 0.92,
  gateWidth: 0.6
} as const;

const VIEW = {
  fov: 34,
  /** how far back the camera sits, and how high it looks down from */
  dist: 17.5,
  elev: 0.6,
  /** the least of the field's half-width that a narrow screen must show */
  minHalf: 6.2,
  /** where the dive ends: just over the chakra, looking straight down */
  endDist: 1.3,
  endElev: 1.5
} as const;

export interface VyuhaOptions {
  /** Fewer soldiers and motes: phones, and machines with few cores. */
  lite: boolean;
  /** Reduced motion: draw it, but do not move it. */
  still: boolean;
}

export interface Vyuha {
  /** 0 at rest, 1 once the camera has fallen into the eye. */
  setProgress(p: number): void;
  /** Pointer position over the stage, each axis -1..1. */
  setPointer(x: number, y: number): void;
  /** Where the eye of the formation sits on screen at rest, 0..1 each way. */
  setEye(x: number, y: number): void;
  /** Whether anything can see it. It draws nothing while it cannot. */
  setRunning(on: boolean): void;
  /** Play the arrival: the view settles down onto the field. */
  arrive(): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

/* ------------------------------------------------------------
   small things
   ------------------------------------------------------------ */

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** The same army on every load. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Bake one colour into every vertex, so parts can be merged and still differ. */
function tint<T extends THREE.BufferGeometry>(geo: T, hex: number): T {
  const c = new THREE.Color(hex);
  const n = geo.attributes.position.count;
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

/** A soft round light, for the gate fires and the glow at the eye. */
function glowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.25, 'rgba(255, 255, 255, 0.55)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ------------------------------------------------------------
   the pieces
   Local frame of anything standing in a ring: +X points out of
   the formation, +Z along the ring, +Y up.
   ------------------------------------------------------------ */

function soldierGeometry(): THREE.BufferGeometry {
  const parts = [
    // tunic: dark, so the metal on it is what is seen
    tint(new THREE.CylinderGeometry(0.044, 0.07, 0.32, 5, 1, true).translate(0, 0.16, 0), 0x3a2710),
    // helmet
    tint(new THREE.SphereGeometry(0.054, 6, 4).translate(0, 0.37, 0), 0xcf9f4c),
    // shield, facing out and tipped back to catch the sky, and its boss
    tint(new THREE.CircleGeometry(0.115, 10).rotateY(Math.PI / 2).rotateZ(0.42).translate(0.09, 0.2, 0), 0xe3b860),
    tint(new THREE.CircleGeometry(0.036, 6).rotateY(Math.PI / 2).rotateZ(0.42).translate(0.096, 0.203, 0), 0xffe9b4),
    // spear and its point
    tint(new THREE.CylinderGeometry(0.007, 0.007, 0.72, 3, 1, true).translate(-0.03, 0.36, 0.055), 0x6b4e22),
    tint(new THREE.ConeGeometry(0.018, 0.09, 4).translate(-0.03, 0.765, 0.055), 0xffe9b4)
  ];
  const merged = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return merged;
}

function standardGeometry(): THREE.BufferGeometry {
  const pole = tint(new THREE.CylinderGeometry(0.01, 0.012, 1.12, 4, 1, true).translate(0, 0.56, 0), 0x8a6628);

  // a swallow-tailed pennant, trailing along +Z
  const cloth = new THREE.BufferGeometry();
  const v = [
    0, 1.1, 0, /**/ 0, 0.86, 0, /**/ 0, 1.02, 0.4,
    0, 0.86, 0, /**/ 0, 0.94, 0.26, /**/ 0, 1.02, 0.4
  ];
  cloth.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  cloth.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(12).fill(0), 2));
  cloth.setIndex([0, 1, 2, 3, 4, 5]);
  cloth.computeVertexNormals();
  tint(cloth, 0xd9aa55);

  const finial = tint(new THREE.ConeGeometry(0.03, 0.1, 4).translate(0, 1.17, 0), 0xffe9b4);

  const merged = mergeGeometries([pole, cloth, finial]);
  [pole, cloth, finial].forEach((p) => p.dispose());
  return merged;
}

/** The wheel at the eye: a toothed rim, eight spokes, an open hub. */
function chakraGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [
    new THREE.TorusGeometry(0.64, 0.05, 6, 44).rotateX(Math.PI / 2),
    new THREE.TorusGeometry(0.15, 0.04, 6, 18).rotateX(Math.PI / 2)
  ];
  for (let i = 0; i < 8; i++) {
    parts.push(new THREE.BoxGeometry(0.46, 0.034, 0.05).translate(0.41, 0, 0).rotateY((i / 8) * TAU));
  }
  for (let i = 0; i < 16; i++) {
    parts.push(
      new THREE.ConeGeometry(0.058, 0.2, 4)
        .rotateZ(-Math.PI / 2)
        .translate(0.78, 0, 0)
        .rotateY((i / 16) * TAU)
    );
  }
  const merged = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
  parts.forEach((p) => p.dispose());
  return merged;
}

/* The plain. Its colours are written as they should appear on screen: the
   shader does no colour conversion, so the edge is the page's own black to
   the last bit and there is no seam where the scene stops. */
function groundMaterial(band: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uR: { value: Array.from({ length: FIELD.rings }, (_, k) => FIELD.radius(k)) },
      uBand: { value: band },
      uEye: { value: 1 }
    },
    vertexShader: /* glsl */ `
      varying vec2 vPos;
      void main() {
        vPos = position.xz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vPos;
      uniform float uR[${FIELD.rings}];
      uniform float uBand;
      uniform float uEye;

      void main() {
        float r = length(vPos);
        vec3 ground = vec3(0.0431);
        vec3 umber  = vec3(0.090, 0.063, 0.051);
        vec3 umber2 = vec3(0.141, 0.078, 0.059);

        // the warm void the formation sits in
        vec3 col = mix(ground, umber, smoothstep(13.5, 2.0, r));
        col = mix(col, umber2, smoothstep(6.5, 0.0, r) * 0.85);

        // dawn comes from the left
        float dawn = clamp(0.5 - vPos.x / 20.0, 0.0, 1.0);
        col += vec3(0.085, 0.052, 0.016) * dawn * smoothstep(13.0, 3.0, r);

        // trodden earth under each ring, and a scored line either side of it
        float worn = 0.0;
        float score = 0.0;
        for (int k = 0; k < ${FIELD.rings}; k++) {
          float d = abs(r - uR[k]);
          worn += smoothstep(uBand + 0.16, uBand - 0.06, d);
          score += smoothstep(0.022, 0.0, abs(d - (uBand + 0.2)));
        }
        col += vec3(0.050, 0.032, 0.012) * worn * (0.5 + 0.5 * dawn);
        col += vec3(0.87, 0.68, 0.34) * score * 0.085;

        // the eye
        col += vec3(0.98, 0.74, 0.34) * exp(-r * r / 1.3) * 0.5 * uEye;
        col += vec3(0.87, 0.60, 0.24) * exp(-r * r / 9.0) * 0.09 * uEye;

        // and out to flat ground
        col = mix(col, ground, smoothstep(9.6, 16.5, r));
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
}

function motesMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPx: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute vec3 aSeed;   // rise speed, phase, size
      uniform float uTime;
      uniform float uPx;
      varying float vAlpha;
      varying float vEmber;
      void main() {
        vec3 p = position;
        float h = mod(p.y + uTime * aSeed.x, 6.5);
        p.y = h;
        p.x += sin(uTime * 0.27 + aSeed.y * 6.283) * 0.3;
        p.z += cos(uTime * 0.21 + aSeed.y * 4.1) * 0.22;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aSeed.z * uPx / max(0.4, -mv.z);
        vAlpha = smoothstep(0.0, 0.7, h) * smoothstep(6.5, 3.6, h)
               * (0.55 + 0.45 * sin(uTime * 1.6 + aSeed.y * 40.0));
        vEmber = step(0.86, fract(aSeed.y * 7.13));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      precision mediump float;
      varying float vAlpha;
      varying float vEmber;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        vec3 col = mix(vec3(1.0, 0.86, 0.56), vec3(1.0, 0.36, 0.12), vEmber);
        gl_FragColor = vec4(col * a * vAlpha * 0.8, 1.0);
      }
    `
  });
}

/* A volley: every arrow is one line segment that rides a parabola. The tail
   is the same point a moment earlier, so the segment always lies along the
   flight. */
const ARROWS = 34;
function arrowsMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uT: { value: 99 }, uDur: { value: 2.6 }, uArc: { value: 3.4 } },
    vertexShader: /* glsl */ `
      attribute vec3 aFrom;
      attribute vec3 aTo;
      attribute float aDelay;
      attribute float aEnd;   // 0 tail, 1 head
      uniform float uT;
      uniform float uDur;
      uniform float uArc;
      varying float vAlpha;
      void main() {
        float t = (uT - aDelay) / uDur;
        float tt = clamp(t - (1.0 - aEnd) * 0.08, 0.0, 1.0);
        vec3 p = mix(aFrom, aTo, tt);
        p.y += sin(tt * 3.14159) * uArc;
        vAlpha = step(0.0, t) * step(t, 1.0) * (0.35 + 0.65 * aEnd);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision mediump float;
      varying float vAlpha;
      void main() {
        gl_FragColor = vec4(1.0, 0.91, 0.70, vAlpha * 0.6);
      }
    `
  });
}

/* ------------------------------------------------------------
   the scene
   ------------------------------------------------------------ */

export function createVyuha(canvas: HTMLCanvasElement, { lite, still }: VyuhaOptions): Vyuha {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const cap = lite || coarse ? 1.25 : 1.5;
  let ratio = Math.min(window.devicePixelRatio || 1, cap);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: ratio < 1.5,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(ratio);
  renderer.setClearColor(GROUND, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(GROUND, 14, 31.5);

  const camera = new THREE.PerspectiveCamera(VIEW.fov, 1, 0.1, 120);
  const target = new THREE.Vector3();

  /* ---- light: dawn from the left, a rim from behind, a fire at the eye ---- */
  scene.add(new THREE.HemisphereLight(0xffe2b0, 0x120b05, 0.5));
  const key = new THREE.DirectionalLight(0xffd39a, 3.1);
  key.position.set(-9, 4.2, 3.2);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xc98a3a, 0.9);
  rim.position.set(6.5, 3.2, -8);
  scene.add(rim);
  const hearth = new THREE.PointLight(0xffb45c, 9, 9, 1.8);
  hearth.position.set(0, 0.95, 0);
  scene.add(hearth);

  /* ---- the plain ---- */
  const ranks = lite ? 2 : 3;
  const pace = lite ? FIELD.pace * 1.3 : FIELD.pace;
  const bandHalf = ((ranks - 1) * FIELD.rankGap) / 2 + 0.12;

  const groundGeo = new THREE.CircleGeometry(70, 64).rotateX(-Math.PI / 2);
  const groundMat = groundMaterial(bandHalf);
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.y = -0.002;
  scene.add(ground);

  /* ---- the rings ---- */
  const rnd = seeded(1618);
  const soldierGeo = soldierGeometry();
  const standardGeo = standardGeometry();
  const metal = new THREE.MeshPhongMaterial({
    vertexColors: true,
    shininess: 54,
    specular: 0x7a5c28,
    side: THREE.DoubleSide
  });
  const glow = glowTexture();
  const fireMat = new THREE.PointsMaterial({
    map: glow,
    color: 0xffb468,
    size: 1.25,
    sizeAttenuation: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const rings: Array<{ group: THREE.Group; speed: number }> = [];
  const disposables: Array<{ dispose(): void }> = [soldierGeo, standardGeo, metal, glow, fireMat, groundGeo, groundMat];

  const mat4 = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  for (let k = 0; k < FIELD.rings; k++) {
    const R = FIELD.radius(k);
    const dir = k % 2 === 0 ? 1 : -1;
    const group = new THREE.Group();

    const gate = FIELD.gateWidth / R + 0.03; // half-angle of the gap
    const at = FIELD.gateAt(k);
    const from = at + gate;
    const span = TAU - gate * 2;

    /* soldiers */
    const places: Array<[number, number]> = []; // radius, angle
    for (let j = 0; j < ranks; j++) {
      const rr = R + (j - (ranks - 1) / 2) * FIELD.rankGap;
      const count = Math.max(6, Math.floor((rr * span) / pace));
      for (let i = 0; i < count; i++) {
        // alternate ranks stand in the gaps of the rank in front
        places.push([rr, from + ((i + (j % 2) * 0.5 + 0.25) / count) * span]);
      }
    }
    const army = new THREE.InstancedMesh(soldierGeo, metal, places.length);
    army.frustumCulled = false;
    places.forEach(([rr, a], i) => {
      const r2 = rr + (rnd() - 0.5) * 0.035;
      pos.set(Math.cos(a) * r2, 0, Math.sin(a) * r2);
      quat.setFromAxisAngle(up, -a + (rnd() - 0.5) * 0.22);
      const s = 0.94 + rnd() * 0.16;
      scl.set(s, s * (0.95 + rnd() * 0.12), s);
      army.setMatrixAt(i, mat4.compose(pos, quat, scl));
    });
    army.instanceMatrix.needsUpdate = true;
    group.add(army);

    /* standards along the ring, and a taller pair at the gate */
    const along = 3 + k * 2;
    const flags = new THREE.InstancedMesh(standardGeo, metal, along + 2);
    flags.frustumCulled = false;
    const trail = dir > 0 ? 0 : Math.PI; // the cloth streams behind the march
    for (let i = 0; i < along; i++) {
      const a = from + ((i + 0.5) / along) * span + (rnd() - 0.5) * 0.08;
      pos.set(Math.cos(a) * R, 0, Math.sin(a) * R);
      quat.setFromAxisAngle(up, -a + trail);
      const s = 0.9 + rnd() * 0.25;
      scl.set(s, s, s);
      flags.setMatrixAt(i, mat4.compose(pos, quat, scl));
    }
    const posts = [from - 0.02, from + span + 0.02];
    posts.forEach((a, i) => {
      pos.set(Math.cos(a) * R, 0, Math.sin(a) * R);
      quat.setFromAxisAngle(up, -a + trail);
      scl.set(1.45, 1.45, 1.45);
      flags.setMatrixAt(along + i, mat4.compose(pos, quat, scl));
    });
    flags.instanceMatrix.needsUpdate = true;
    group.add(flags);

    /* a fire on each gate post */
    const fireGeo = new THREE.BufferGeometry();
    fireGeo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        posts.flatMap((a) => [Math.cos(a) * R, 0.5, Math.sin(a) * R]),
        3
      )
    );
    const fires = new THREE.Points(fireGeo, fireMat);
    fires.frustumCulled = false;
    group.add(fires);
    disposables.push(fireGeo);

    scene.add(group);
    rings.push({ group, speed: (dir * TAU) / (FIELD.turn + k * FIELD.turnStep) });
  }

  /* ---- the eye ---- */
  const chakraGeo = chakraGeometry();
  const chakraMat = new THREE.MeshPhongMaterial({
    color: 0xd29b42,
    specular: 0xffd890,
    shininess: 90,
    emissive: 0x3a2406
  });
  const chakra = new THREE.Mesh(chakraGeo, chakraMat);
  chakra.position.y = 0.44;
  scene.add(chakra);

  const haloMat = new THREE.SpriteMaterial({
    map: glow,
    color: 0xffc56e,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    depthTest: false, // it is light, not a thing: the plain must not cut it
    blending: THREE.AdditiveBlending
  });
  const halo = new THREE.Sprite(haloMat);
  halo.position.y = 0.5;
  halo.scale.setScalar(3.2);
  scene.add(halo);
  disposables.push(chakraGeo, chakraMat, haloMat);

  /* ---- dust and embers ---- */
  const moteCount = lite ? 110 : 250;
  const moteGeo = new THREE.BufferGeometry();
  {
    const p = new Float32Array(moteCount * 3);
    const s = new Float32Array(moteCount * 3);
    for (let i = 0; i < moteCount; i++) {
      const a = rnd() * TAU;
      const r = Math.sqrt(rnd()) * 12;
      p[i * 3] = Math.cos(a) * r;
      p[i * 3 + 1] = rnd() * 6.5;
      p[i * 3 + 2] = Math.sin(a) * r;
      s[i * 3] = 0.12 + rnd() * 0.28;
      s[i * 3 + 1] = rnd();
      s[i * 3 + 2] = 26 + rnd() * 54;
    }
    moteGeo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    moteGeo.setAttribute('aSeed', new THREE.BufferAttribute(s, 3));
  }
  const moteMat = motesMaterial();
  const motes = new THREE.Points(moteGeo, moteMat);
  motes.frustumCulled = false;
  scene.add(motes);
  disposables.push(moteGeo, moteMat);

  /* ---- arrows ---- */
  const arrowGeo = new THREE.BufferGeometry();
  const aFrom = new Float32Array(ARROWS * 2 * 3);
  const aTo = new Float32Array(ARROWS * 2 * 3);
  const aDelay = new Float32Array(ARROWS * 2);
  const aEnd = new Float32Array(ARROWS * 2);
  for (let i = 0; i < ARROWS; i++) aEnd[i * 2 + 1] = 1;
  arrowGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ARROWS * 2 * 3), 3));
  arrowGeo.setAttribute('aFrom', new THREE.BufferAttribute(aFrom, 3));
  arrowGeo.setAttribute('aTo', new THREE.BufferAttribute(aTo, 3));
  arrowGeo.setAttribute('aDelay', new THREE.BufferAttribute(aDelay, 1));
  arrowGeo.setAttribute('aEnd', new THREE.BufferAttribute(aEnd, 1));
  const arrowMat = arrowsMaterial();
  const arrows = new THREE.LineSegments(arrowGeo, arrowMat);
  arrows.frustumCulled = false;
  scene.add(arrows);
  disposables.push(arrowGeo, arrowMat);

  /** Loose a volley from one side of the field over to the other. */
  function loose() {
    const a = rnd() * TAU;
    const across = a + Math.PI + (rnd() - 0.5) * 0.7;
    for (let i = 0; i < ARROWS; i++) {
      const fa = a + (rnd() - 0.5) * 0.5;
      const ta = across + (rnd() - 0.5) * 0.6;
      const fr = 9.5 + rnd() * 2.2;
      const tr = 3 + rnd() * 5.5;
      const delay = rnd() * 0.7;
      for (let e = 0; e < 2; e++) {
        const o = (i * 2 + e) * 3;
        aFrom[o] = Math.cos(fa) * fr;
        aFrom[o + 1] = 0.6;
        aFrom[o + 2] = Math.sin(fa) * fr;
        aTo[o] = Math.cos(ta) * tr;
        aTo[o + 1] = 0.1;
        aTo[o + 2] = Math.sin(ta) * tr;
        aDelay[i * 2 + e] = delay;
      }
    }
    arrowGeo.attributes.aFrom.needsUpdate = true;
    arrowGeo.attributes.aTo.needsUpdate = true;
    arrowGeo.attributes.aDelay.needsUpdate = true;
    arrowMat.uniforms.uT.value = 0;
  }

  /* ---- state ---- */
  let width = 1;
  let height = 1;
  let restDist: number = VIEW.dist;

  let goal = 0; // scroll progress asked for
  let p = 0; // and where the view has got to
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const eye = { x: 0.5, y: 0.58 };
  let arrival = still ? 1 : 0; // 0 high above, 1 settled
  let arriving = false;

  let time = 0;
  let volleyIn = 3.5;
  let running = false;
  let raf = 0;
  let last = 0;
  let slow = 0;

  function place() {
    const e = p * p * (3 - 2 * p); // the fall
    const lean = (1 - e) * arrival;
    const off = (1 - arrival) * (1 - arrival);

    const dist = lerp(restDist, VIEW.endDist, e) * (1 + 0.38 * off);
    const elev = Math.min(1.52, lerp(VIEW.elev, VIEW.endElev, e) + 0.3 * off + pointer.y * 0.028 * lean);
    const yaw = pointer.x * 0.075 * lean + Math.sin(time * 0.07) * 0.03 * lean + 0.55 * off;

    target.set(0, lerp(0.25, 0.44, e), 0);
    camera.position.set(
      target.x + dist * Math.cos(elev) * Math.sin(yaw),
      target.y + dist * Math.sin(elev),
      target.z + dist * Math.cos(elev) * Math.cos(yaw)
    );
    camera.lookAt(target);

    // the eye moves to the middle of the screen as the view falls into it
    const centre = smooth(0, 0.55, p);
    const fx = lerp(eye.x, 0.5, centre);
    const fy = lerp(eye.y, 0.5, centre);
    camera.setViewOffset(width, height, (0.5 - fx) * width, (0.5 - fy) * height, width, height);
  }

  function draw() {
    place();
    renderer.render(scene, camera);
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const ms = Math.min(100, now - last || 16.7);
    last = now;
    const dt = ms / 1000;

    /* A machine that cannot keep up gets fewer pixels, not fewer frames. */
    if (ms > 24) slow++;
    else if (slow > 0) slow--;
    if (slow > 40 && ratio > 1) {
      ratio = Math.max(1, ratio - 0.25);
      renderer.setPixelRatio(ratio);
      renderer.setSize(width, height, false);
      slow = 0;
    }

    time += dt;
    p += (goal - p) * (1 - Math.exp(-dt / 0.11));
    if (Math.abs(goal - p) < 0.0004) p = goal;
    pointer.x += (pointer.tx - pointer.x) * (1 - Math.exp(-dt / 0.35));
    pointer.y += (pointer.ty - pointer.y) * (1 - Math.exp(-dt / 0.35));
    if (arriving) {
      arrival = Math.min(1, arrival + dt / 2.6);
      if (arrival >= 1) arriving = false;
    }

    // the rings quicken as the view falls through them
    const haste = 1 + 9 * p * p;
    for (const ring of rings) ring.group.rotation.y += ring.speed * dt * haste;
    chakra.rotation.y -= dt * 0.32 * haste;
    chakra.position.y = 0.44 + Math.sin(time * 0.9) * 0.03;
    halo.material.opacity = 0.3 + Math.sin(time * 1.3) * 0.05;
    hearth.intensity = 9 + Math.sin(time * 2.1) * 1.1;

    moteMat.uniforms.uTime.value = time;
    arrowMat.uniforms.uT.value += dt;
    volleyIn -= dt;
    if (volleyIn <= 0 && p < 0.2) {
      loose();
      volleyIn = 8 + rnd() * 7;
    }

    draw();
  }

  function start() {
    if (running || still) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  return {
    setProgress(v) {
      goal = clamp01(v);
      if (still) {
        p = goal;
        draw();
      }
    },
    setPointer(x, y) {
      pointer.tx = x;
      pointer.ty = y;
    },
    setEye(x, y) {
      eye.x = x;
      eye.y = y;
      if (still) draw();
    },
    setRunning(on) {
      if (on) start();
      else stop();
    },
    arrive() {
      if (still) return;
      arriving = true;
    },
    resize(w, h) {
      width = Math.max(1, Math.round(w));
      height = Math.max(1, Math.round(h));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      // a narrow screen backs off until enough of the field is in view
      const half = Math.tan((VIEW.fov * Math.PI) / 360) * camera.aspect;
      restDist = Math.max(VIEW.dist, VIEW.minHalf / half);
      scene.fog = new THREE.Fog(GROUND, restDist * 0.8, restDist * 1.8);
      moteMat.uniforms.uPx.value = (height / 900) * ratio;
      camera.updateProjectionMatrix();
      draw();
    },
    dispose() {
      stop();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
    }
  };
}
