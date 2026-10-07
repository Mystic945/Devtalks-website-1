/* ============================================================
   DEVTALKS — WARP TEXT, SHARED
   ------------------------------------------------------------
   React Bits' <WarpText />, rebuilt as a layer of the loop's own
   renderer instead of one component per line.

   WHY NOT THE COMPONENT
   <WarpText /> creates a WebGL context per instance. The loop
   section has eleven pieces of text, the landing page already
   holds two contexts and the strip holds a third. Phones allow a
   handful of live contexts and, past that, silently kill the
   oldest — which would be the strip or the landing rings. It also
   draws one line per `\n` and shrinks to fit, so it cannot wrap a
   paragraph.

   So this keeps the component's shader — the same fbm glass, the
   same cursor lens with its ripple, the same RGB split at the
   edges — and draws every piece of text as a quad in the strip's
   renderer, after the scene. One context, one draw per line of
   copy.

   ONE PANE OF GLASS
   The original measures its distortion in the box it is given.
   Here every quad samples the noise and the lens in stage space,
   so all the words on screen sit under one continuous sheet of
   moving glass, and the lens bends whichever line it passes over.

   THE DOM STAYS
   Every warped line is still real text in the page, in place,
   selectable and read by screen readers. Its fill goes transparent
   once the quad that replaces it has been painted, and not before,
   so there is never a frame with no words at all.

   The bottom shade under the words lives here too: it has to sit
   between the strip and the text, and both are now in the canvas.
   ============================================================ */

import * as THREE from 'three';

/* The component's knobs, in stage units (1 = the stage's height) rather than
   in the box's own units, so a paragraph and a headline bend by the same
   number of pixels. Tuned to read at rest, not only under a cursor — on a
   phone there is no cursor. */
export const WARP = {
  warp: 0.02, // ambient glass distortion
  scale: 1.7, // size of the moving cells
  speed: 0.55, // ambient undulation
  influence: 0.17, // lens radius
  strength: 0.012, // lens bend
  refraction: 0.0018, // RGB split
  ripple: 1,
  idle: 0.24 // how much lens is left when nobody is pointing
} as const;

const vertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragment = /* glsl */ `
precision highp float;

uniform sampler2D uTex;
uniform float uOpacity;
uniform vec2 uOrigin;   // quad top-left, stage px
uniform vec2 uSize;     // quad size, stage px
uniform vec2 uStage;    // stage size, px
uniform vec2 uPointer;  // stage px, y down
uniform float uActive;
uniform float uTime;
uniform float uWarp;
uniform float uScale;
uniform float uSpeed;
uniform float uInfluence;
uniform float uStrength;
uniform float uRefraction;
uniform float uRipple;
uniform float uAmp;     // this line's share of the bend, by its size

varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return v;
}

vec4 sampleText(vec2 uv) {
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0);
  return texture2D(uTex, uv);
}

void main() {
  // this fragment in stage units: y down, 1.0 = stage height
  vec2 px = uOrigin + vec2(vUv.x, 1.0 - vUv.y) * uSize;
  vec2 sp = px / uStage.y;

  float time = uTime * uSpeed;
  vec2 drift = vec2(time * 0.055, -time * 0.045);
  float n1 = fbm(sp * uScale * 3.1 + drift);
  float n2 = fbm((sp + 19.17) * uScale * 3.4 - drift.yx);
  vec2 ambient = (vec2(n1, n2) - 0.5) * uWarp;

  vec2 delta = sp - uPointer / uStage.y;
  float dist = length(delta);
  float radius = max(uInfluence, 0.001);
  float t = clamp(dist / radius, 0.0, 1.0);
  float lens = smoothstep(radius, 0.0, dist) * uActive;
  float bulge = t * (1.0 - t) * (1.0 - t) * 6.75 * uActive;
  vec2 dir = dist > 0.0001 ? delta / dist : vec2(0.0);

  float wave = sin(t * 11.8 - time * 4.2) * 0.5 + 0.5;
  float ring = (wave - 0.5) * uRipple;
  vec2 bend = -dir * bulge * uStrength + dir * ring * bulge * uStrength * 0.36;

  // stage units -> this quad's uv (uv runs y up, the stage y down)
  vec2 toUv = vec2(uStage.y / uSize.x, -uStage.y / uSize.y);
  vec2 offset = (ambient + bend) * uAmp;
  float len = length(offset);
  vec2 sdir = len > 0.00001 ? offset / len : vec2(0.7071, 0.7071);
  vec2 split = sdir * uRefraction * (0.35 + lens * 1.65) * mix(0.6, 1.0, uAmp) * toUv;
  vec2 uv = vUv + offset * toUv;

  vec4 base = sampleText(uv);
  vec4 rs = sampleText(uv + split);
  vec4 bs = sampleText(uv - split);

  // premultiplied per channel, so the fringes are the right colour
  vec3 col = vec3(rs.r * rs.a, base.g * base.a, bs.b * bs.a);
  float a = max(max(rs.a, base.a), bs.a);
  col += lens * base.a * 0.055;
  gl_FragColor = vec4(col, a) * uOpacity;
}
`;

/* The shade under the words: a vertical ramp of the page ground. */
const scrimFragment = /* glsl */ `
precision highp float;
uniform float uReach;  // share of the height it covers, from the bottom
uniform float uFloor;  // alpha at the bottom edge
uniform float uMid;    // alpha partway up
uniform float uMidAt;  // where "partway" is, as a share of uReach
varying vec2 vUv;
void main() {
  float y = vUv.y / uReach;                 // 0 at the bottom, 1 at the top of the ramp
  float a = y < uMidAt
    ? mix(uFloor, uMid, y / uMidAt)
    : mix(uMid, 0.0, clamp((y - uMidAt) / (1.0 - uMidAt), 0.0, 1.0));
  a *= step(vUv.y, uReach);
  gl_FragColor = vec4(vec3(0.0431) * a, a);   // #0b0b0b, premultiplied
}
`;

interface Item {
  el: HTMLElement;
  group: HTMLElement;
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  tex: THREE.CanvasTexture | null;
  x: number;
  y: number;
  w: number;
  h: number;
  pad: number;
}

/** Layout position inside the stage, from offsets — no transform touches
 *  these, so the lines can be measured while their groups are mid-move. */
function layoutBox(el: HTMLElement, stage: HTMLElement) {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== stage) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

/** Paint one element's text the way the page lays it out: its font, its
 *  width, its line height, its alignment, its colour. */
function paint(el: HTMLElement, w: number, h: number, pad: number, dpr: number) {
  const cs = getComputedStyle(el);
  const fs = parseFloat(cs.fontSize) || 16;
  const ls = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing) || 0;
  let lh = parseFloat(cs.lineHeight);
  if (!Number.isFinite(lh)) lh = fs * 1.2;

  let text = (el.textContent || '').replace(/\s+/g, ' ').trim();
  if (cs.textTransform === 'uppercase') text = text.toUpperCase();

  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.ceil((w + pad * 2) * dpr));
  cv.height = Math.max(1, Math.ceil((h + pad * 2) * dpr));
  const g = cv.getContext('2d');
  if (!g) return cv;

  g.scale(dpr, dpr);
  g.font = `${cs.fontStyle} ${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
  g.fillStyle = cs.color;
  g.textBaseline = 'middle';
  g.textAlign = 'left';

  // Tracked text is set a glyph at a time; untracked text is set whole so
  // it keeps its kerning.
  const width = (s: string) => {
    if (!ls) return g.measureText(s).width;
    const chars = Array.from(s);
    return chars.reduce((sum, c) => sum + g.measureText(c).width, 0) + ls * (chars.length - 1);
  };
  const draw = (s: string, x: number, y: number) => {
    if (!ls) {
      g.fillText(s, x, y);
      return;
    }
    let cx = x;
    for (const c of Array.from(s)) {
      g.fillText(c, cx, y);
      cx += g.measureText(c).width + ls;
    }
  };

  const wrap = (limit: number) => {
    const out: string[] = [];
    let line = '';
    for (const word of text.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (line && width(next) > limit) {
        out.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) out.push(line);
    return out;
  };

  /* Balanced, like text-wrap: balance — the narrowest measure that still
     takes the same number of lines. Never more lines than the page laid
     out, so the box the page measured still holds them; and no lone
     word left on the last line of a headline. */
  let lines = wrap(w + 1);
  if (lines.length > 1) {
    let lo = w * 0.35;
    let hi = w + 1;
    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2;
      if (wrap(mid).length > lines.length) lo = mid;
      else hi = mid;
    }
    lines = wrap(hi);
  }

  const align = cs.textAlign;
  lines.forEach((l, i) => {
    const lw = width(l);
    const x =
      align === 'right' || align === 'end'
        ? pad + w - lw
        : align === 'center'
          ? pad + (w - lw) / 2
          : pad;
    draw(l, x, pad + lh * (i + 0.5));
  });

  return cv;
}

export interface WarpLayer {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  resize(w: number, h: number, portrait: boolean): void;
  rasterize(dpr: number): Promise<boolean>;
  setGroup(group: HTMLElement, opacity: number, dy: number): void;
  pointer(x: number, y: number, on: boolean): void;
  update(now: number): void;
  /** true while any warped line is on screen, so the frame loop keeps going */
  showing(): boolean;
  dispose(): void;
}

export function createWarpLayer(
  stage: HTMLElement,
  els: HTMLElement[],
  groupOf: (el: HTMLElement) => HTMLElement
): WarpLayer {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 1, 0, -1, -10, 10);
  const plane = new THREE.PlaneGeometry(1, 1);

  // shared by reference across every material
  const shared = {
    uStage: { value: new THREE.Vector2(1, 1) },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uActive: { value: 0 },
    uTime: { value: 0 },
    uWarp: { value: WARP.warp },
    uScale: { value: WARP.scale },
    uSpeed: { value: WARP.speed },
    uInfluence: { value: WARP.influence },
    uStrength: { value: WARP.strength },
    uRefraction: { value: WARP.refraction },
    uRipple: { value: WARP.ripple }
  };

  /* ---- the shade ---- */
  const scrimMat = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: scrimFragment,
    uniforms: {
      uReach: { value: 0.52 },
      uFloor: { value: 0.9 },
      uMid: { value: 0.55 },
      uMidAt: { value: 0.4 }
    },
    transparent: true,
    premultipliedAlpha: true,
    depthTest: false,
    depthWrite: false
  });
  const scrim = new THREE.Mesh(plane, scrimMat);
  scrim.renderOrder = 0;
  scene.add(scrim);

  /* ---- one quad per line of copy ---- */
  const items: Item[] = els.map((el) => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: {
        ...shared,
        uTex: { value: null },
        uOpacity: { value: 0 },
        uOrigin: { value: new THREE.Vector2() },
        uSize: { value: new THREE.Vector2(1, 1) },
        uAmp: { value: 1 }
      },
      transparent: true,
      premultipliedAlpha: true,
      depthTest: false,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(plane, mat);
    mesh.renderOrder = 1;
    mesh.visible = false;
    scene.add(mesh);
    return { el, group: groupOf(el), mesh, mat, tex: null, x: 0, y: 0, w: 0, h: 0, pad: 0 };
  });

  const groups = new Map<HTMLElement, { o: number; dy: number }>();
  let W = 1;
  let H = 1;

  const place = (it: Item) => {
    const g = groups.get(it.group) || { o: 0, dy: 0 };
    const qw = it.w + it.pad * 2;
    const qh = it.h + it.pad * 2;
    const top = it.y - it.pad + g.dy;
    it.mesh.scale.set(qw, qh, 1);
    it.mesh.position.set(it.x - it.pad + qw / 2, -(top + qh / 2), 0);
    it.mat.uniforms.uOrigin.value.set(it.x - it.pad, top);
    it.mat.uniforms.uSize.value.set(qw, qh);
    it.mat.uniforms.uOpacity.value = g.o;
    it.mesh.visible = !!it.tex && g.o > 0.002;
  };

  /* ---- the lens: the cursor or a finger, else a slow wander ---- */
  const lens = { x: 0, y: 0, tx: 0, ty: 0, on: false, active: 0 };
  const start = performance.now();

  return {
    scene,
    camera,

    resize(w, h, portrait) {
      W = w;
      H = h;
      camera.left = 0;
      camera.right = w;
      camera.top = 0;
      camera.bottom = -h;
      camera.updateProjectionMatrix();
      shared.uStage.value.set(w, h);

      // the same shade the CSS had, deeper on a tall screen
      const u = scrimMat.uniforms;
      u.uReach.value = portrait ? 0.62 : 0.52;
      // deeper than it was: the band behind the words is gold now, not near-black
      u.uFloor.value = portrait ? 0.97 : 0.94;
      u.uMid.value = portrait ? 0.9 : 0.74;
      u.uMidAt.value = portrait ? 0.45 : 0.4;
      scrim.scale.set(w, h, 1);
      scrim.position.set(w / 2, -h / 2, 0);
    },

    async rasterize(dpr) {
      try {
        await document.fonts?.ready;
      } catch {
        /* paint with whatever face is there */
      }
      for (const it of items) {
        const box = layoutBox(it.el, stage);
        if (box.w <= 0 || box.h <= 0) continue;
        const fs = parseFloat(getComputedStyle(it.el).fontSize) || 16;
        it.x = box.x;
        it.y = box.y;
        it.w = box.w;
        it.h = box.h;
        // room for the glass to push glyphs past the box without clipping
        /* A headline can take the full bend; small type takes far less. The
           lens moves every line by the same number of pixels, and what is a
           ripple across a 90px headline is a third of the height of a 15px
           note — it tore letters out of the closing lines. So the share
           falls off faster than the type does. */
        const amp = Math.min(1, Math.max(0.1, Math.pow(fs / 64, 1.5)));
        it.mat.uniforms.uAmp.value = amp;
        // room for the furthest the glass can push a glyph, so none is clipped
        const reach = (WARP.warp * 0.3 + WARP.strength * 1.4) * H * amp;
        it.pad = Math.ceil(Math.max(12, reach + 6));

        const cv = paint(it.el, box.w, box.h, it.pad, dpr);
        it.tex?.dispose();
        const tex = new THREE.CanvasTexture(cv);
        tex.colorSpace = THREE.NoColorSpace; // the canvas is already sRGB; pass it through
        tex.generateMipmaps = false;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        it.tex = tex;
        it.mat.uniforms.uTex.value = tex;
        place(it);
      }
      return items.some((it) => it.tex);
    },

    setGroup(group, o, dy) {
      groups.set(group, { o, dy });
    },

    pointer(x, y, on) {
      lens.tx = x;
      lens.ty = y;
      lens.on = on;
    },

    update(now) {
      const t = (now - start) / 1000;
      // with nobody pointing, the lens drifts over the middle of the stage
      const ix = W * (0.5 + Math.sin(t * 0.33) * 0.3);
      const iy = H * (0.58 + Math.cos(t * 0.27) * 0.24);
      const damp = lens.on ? 0.12 : 0.035;
      lens.x += ((lens.on ? lens.tx : ix) - lens.x) * damp;
      lens.y += ((lens.on ? lens.ty : iy) - lens.y) * damp;
      lens.active += ((lens.on ? 1 : WARP.idle) - lens.active) * 0.06;

      shared.uTime.value = t;
      shared.uPointer.value.set(lens.x, lens.y);
      shared.uActive.value = lens.active;
      items.forEach(place);
    },

    showing() {
      return items.some((it) => it.mesh.visible);
    },

    dispose() {
      items.forEach((it) => {
        it.tex?.dispose();
        it.mat.dispose();
      });
      scrimMat.dispose();
      plane.dispose();
    }
  };
}
