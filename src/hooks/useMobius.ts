/* ============================================================
   DEVTALKS — THE LOOP (a Möbius strip you scroll through)
   ------------------------------------------------------------
   Reference: scrollthroughdoom.netlify.app. That site pins one
   full-screen WebGL scene and lets the scrollbar fly a camera
   through it — down out of the haze, along an avenue, stopping at
   each chapter while its words surface over the picture. This is
   the same machine with a different subject: the camera comes
   down out of the dark, rides the strip once round, and pulls back
   to show the whole loop.

   WHY A MÖBIUS STRIP
   It has one side and one edge. The four words printed on it —
   IDEAS, CODE, PEOPLE, IMPACT, the landing page's own stamp — run
   along a surface that brings you back to where you started
   without ever turning over. That is the argument of the section,
   so the geometry has to be honest about it:

     • the band is built over TWO laps (t in 0..4π), each lap
       offset a hair to its own side. Because the strip's normal
       flips after one lap, lap two is exactly the reverse face of
       lap one. The text therefore runs continuously round both
       faces and meets itself with no seam — which is the whole
       point of a one-sided surface.
     • the orange rim is the strip's single boundary curve, also
       traced over 4π. It is one closed line.

   THE RIDE
   The camera keeps the current word face-on and upright, so as it
   travels the strip's half-twist turns the world round you rather
   than turning the word. Scroll is eased into dwell points so each
   chapter settles in front of you before the next one slides in.

   ROBUSTNESS
   The section is a plain, readable list until the first frame has
   actually rendered; only then does it gain `is-live` and become
   the tall pinned stage. No WebGL, reduced motion, or a stalled
   requestAnimationFrame all leave the list in place.

   Tuning knobs are in STRIP, RIDE and BEATS.
   ============================================================ */

import { useEffect, type RefObject } from 'react';
import * as THREE from 'three';
import { ScrollTrigger } from '@/lib/gsap';
import { clamp, lerp, prefersReducedMotion, seg } from '@/lib/dom';
import { createWarpLayer } from '@/lib/warpLayer';

/* ---- geometry ---- */
const STRIP = {
  radius: 2.2, // centreline radius
  half: 0.46, // half the band's width
  skin: 0.012, // gap between the two faces; hidden under the rim
  steps: 960, // segments along 4π
  rows: 6, // segments across the band
  rim: 0.016 // rim tube radius
} as const;

/* ---- palette: the landing page's, so the strip sits in the same night ---- */
const INK = {
  ground: 0x0b0b0b,
  band: '#151413',
  paper: '#f3eee4',
  orange: '#ff5a1f',
  ember: '#a83a0b'
} as const;

/* ---- camera ---- */
const RIDE = {
  fov: 38,
  /** world units of band the camera keeps across the narrower screen axis */
  frame: 2.75,
  lead: 0.16 // how far the camera trails behind the point it looks at
} as const;

/* ---- scroll beats, as shares of the section's scroll length ---- */
const BEATS = {
  introOut: [0.015, 0.07], // the opening line fades
  descend: [0.03, 0.17], // overview → first stop
  ride: [0.17, 0.8], // once round the strip
  ascend: [0.8, 0.92], // last stop → overview
  finale: [0.9, 0.95], // the headline lands above the finished loop
  outro: [0.93, 0.98] // and the closing line under it
} as const;

type Vec = THREE.Vector3;

const UP = new THREE.Vector3(0, 1, 0);

/** Centreline frame at parameter t: point, tangent, across-band and normal. */
function frameAt(t: number, P: Vec, T: Vec, B: Vec, N: Vec): void {
  const R = STRIP.radius;
  const c = Math.cos(t);
  const s = Math.sin(t);
  P.set(R * c, 0, R * s);
  T.set(-s, 0, c);
  // across-band direction: half a turn per lap
  const h = t / 2;
  B.set(Math.cos(h) * c, Math.sin(h), Math.cos(h) * s);
  N.crossVectors(T, B).normalize();
}

/** A point on the surface, any (t, s). */
function surface(t: number, s: number, out: Vec): Vec {
  const R = STRIP.radius;
  const h = t / 2;
  const r = R + s * Math.cos(h);
  return out.set(r * Math.cos(t), s * Math.sin(h), r * Math.sin(t));
}

function buildBand(): THREE.BufferGeometry {
  const { steps, rows, half, skin } = STRIP;
  const cols = steps + 1;
  const pos = new Float32Array(cols * (rows + 1) * 3);
  const nor = new Float32Array(cols * (rows + 1) * 3);
  const uv = new Float32Array(cols * (rows + 1) * 2);

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const p = new THREE.Vector3();
  const dt = new THREE.Vector3();
  const ds = new THREE.Vector3();
  const n = new THREE.Vector3();
  const e = 1e-3;

  for (let j = 0; j < cols; j++) {
    const t = (j / steps) * Math.PI * 4;
    for (let k = 0; k <= rows; k++) {
      const s = -half + (k / rows) * half * 2;

      surface(t + e, s, a);
      surface(t - e, s, b);
      dt.subVectors(a, b);
      surface(t, s + e, a);
      surface(t, s - e, b);
      ds.subVectors(a, b);
      n.crossVectors(dt, ds).normalize();

      surface(t, s, p).addScaledVector(n, skin / 2);

      const i = j * (rows + 1) + k;
      pos.set([p.x, p.y, p.z], i * 3);
      nor.set([n.x, n.y, n.z], i * 3);
      // one texture tile per lap; the second lap is the strip's other face
      uv.set([(j / steps) * 2, k / rows], i * 2);
    }
  }

  const index: number[] = [];
  for (let j = 0; j < steps; j++) {
    for (let k = 0; k < rows; k++) {
      const i0 = j * (rows + 1) + k;
      const i1 = (j + 1) * (rows + 1) + k;
      // wound so the front face is the side the normal points to
      index.push(i0, i1, i0 + 1, i1, i1 + 1, i0 + 1);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(index);
  return g;
}

/** The single boundary of the strip: s = +half, traced twice round. */
function buildRim(): THREE.BufferGeometry {
  const pts: Vec[] = [];
  const n = 720;
  for (let i = 0; i < n; i++) {
    pts.push(surface((i / n) * Math.PI * 4, STRIP.half, new THREE.Vector3()));
  }
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  return new THREE.TubeGeometry(curve, 1400, STRIP.rim, 6, true);
}

/** One lap of print: the four words, a ruler along each edge. */
function paintBand(words: string[]): HTMLCanvasElement {
  const W = 4096;
  const H = 256;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d');
  if (!g) return cv;

  g.fillStyle = INK.band;
  g.fillRect(0, 0, W, H);

  // the rulers — fine ticks, a longer one every eighth
  g.fillStyle = 'rgba(243,238,228,0.22)';
  for (let x = 0; x < W; x += 32) {
    const long = x % 256 === 0;
    const len = long ? 18 : 8;
    g.fillRect(x, 10, 2, len);
    g.fillRect(x, H - 10 - len, 2, len);
  }
  g.fillRect(0, 9, W, 1);
  g.fillRect(0, H - 10, W, 1);

  const slot = W / words.length;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '400 168px Anton, "Arial Narrow", sans-serif';

  words.forEach((word, i) => {
    const cx = slot * i + slot / 2;
    g.fillStyle = INK.paper;
    // a little tracking, by hand: canvas letterSpacing is not everywhere yet
    const chars = [...word];
    const track = 10;
    const widths = chars.map((ch) => g.measureText(ch).width);
    const total = widths.reduce((s, w) => s + w, 0) + track * (chars.length - 1);
    let x = cx - total / 2;
    chars.forEach((ch, k) => {
      g.fillText(ch, x + widths[k] / 2, H / 2 + 6);
      x += widths[k] + track;
    });

    // the joint between two words: an orange bead
    g.fillStyle = INK.orange;
    g.beginPath();
    g.arc(slot * i, H / 2, 7, 0, Math.PI * 2);
    g.fill();
  });

  return cv;
}

const easeInOut = (x: number): number =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

const smooth = (a: number, b: number, x: number): number => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Eased travel with a dwell at each stop: slow at u = (k + ½)/n. */
const dwell = (u: number, n: number): number =>
  u + (0.82 * Math.sin(2 * Math.PI * n * u)) / (2 * Math.PI * n);

interface Pose {
  pos: Vec;
  quat: THREE.Quaternion;
}

const look = new THREE.Matrix4();
function pose(pos: Vec, target: Vec, up: Vec, out: Pose): Pose {
  out.pos.copy(pos);
  look.lookAt(pos, target, up);
  out.quat.setFromRotationMatrix(look);
  return out;
}

const newPose = (): Pose => ({ pos: new THREE.Vector3(), quat: new THREE.Quaternion() });

export function useMobius(outerRef: RefObject<HTMLElement>, stops: number): void {
  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;
    const stage = outer.querySelector<HTMLElement>('.loop__stage');
    const canvas = outer.querySelector<HTMLCanvasElement>('.loop__canvas');
    const intro = outer.querySelector<HTMLElement>('.loop__intro');
    const outro = outer.querySelector<HTMLElement>('.loop__outro');
    const finale = outer.querySelector<HTMLElement>('.loop__finale');
    const warped = Array.from(outer.querySelectorAll<HTMLElement>('[data-warp]'));
    const cards = Array.from(outer.querySelectorAll<HTMLElement>('.loop__card'));
    const marks = Array.from(outer.querySelectorAll<HTMLElement>('.loop__rail li'));
    if (!stage || !canvas) return;

    // The list is the reduced-motion edition. Nothing to build.
    if (prefersReducedMotion()) return;

    /* A phone gets a lighter renderer. Its screen is dense enough that 1.5×
       is indistinguishable from 3× on a moving picture, and that alone is
       a quarter of the pixels. A handset with four cores or fewer goes
       lower still. The scene is one mesh, so this is where the cost is. */
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const modest = (navigator.hardwareConcurrency || 8) <= 4;
    const dprCap = coarse ? (modest ? 1.25 : 1.5) : 2;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: !modest,
        alpha: true,
        powerPreference: coarse ? 'default' : 'high-performance'
      });
    } catch {
      return; // no WebGL: the list stays
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(INK.ground, 4, 12);

    const camera = new THREE.PerspectiveCamera(RIDE.fov, 1, 0.05, 60);

    /* Every line of copy over the picture, drawn through WarpText's glass in
       this same renderer — see lib/warpLayer for why not one component per
       line. Each line moves with the block it belongs to. */
    const warp = createWarpLayer(
      stage,
      warped,
      (el) =>
        (el.closest('.loop__card, .loop__intro, .loop__finale, .loop__outro') as HTMLElement) ||
        stage
    );
    let warpReady = false;
    let repaint: ReturnType<typeof setTimeout> | null = null;

    /* ---- the strip ---- */
    const words = cards.map((c) => c.dataset.word || '').filter(Boolean);
    const print = paintBand(words.length ? words : ['IDEAS', 'CODE', 'PEOPLE', 'IMPACT']);
    const tex = new THREE.CanvasTexture(print);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

    const bandGeo = buildBand();
    const bandMat = new THREE.MeshStandardMaterial({
      map: tex,
      emissiveMap: tex,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.42,
      roughness: 0.62,
      metalness: 0.18,
      side: THREE.DoubleSide
    });
    const band = new THREE.Mesh(bandGeo, bandMat);

    const rimGeo = buildRim();
    const rimMat = new THREE.MeshBasicMaterial({ color: INK.orange });
    const rim = new THREE.Mesh(rimGeo, rimMat);

    scene.add(band, rim);

    /* ---- light: a cool room, an orange key, and a lamp on the camera ---- */
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const key = new THREE.DirectionalLight(INK.orange, 1.7);
    key.position.set(-4, 3, 2);
    const fill = new THREE.DirectionalLight(INK.paper, 0.6);
    fill.position.set(4, 5, -3);
    const lamp = new THREE.PointLight(0xffe2cf, 1.4, 14, 1.3);
    scene.add(key, fill, lamp);

    /* The text is printed after the font has actually arrived; until then the
       canvas holds a fallback face, which is fine for the first frame. */
    let alive = true;
    document.fonts
      ?.load('400 168px Anton')
      .then(() => {
        if (!alive) return;
        const fresh = paintBand(words);
        const ctx = print.getContext('2d');
        ctx?.drawImage(fresh, 0, 0);
        tex.needsUpdate = true;
        wake();
      })
      .catch(() => {});

    /* ---- sizing ---- */
    let rideDist = 3.6;
    let introReach = 10.6; // camera-to-centre distance of the opening view
    let outroReach = 8.6; // and of the closing one
    let stageW = 1;
    let stageH = 1;
    let portrait = false;
    let lifted = -1;
    const size = () => {
      const w = stage.clientWidth || window.innerWidth;
      const h = stage.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      const aspect = w / h;
      stageW = w;
      stageH = h;
      portrait = aspect < 0.85;
      camera.aspect = aspect;
      lifted = -1; // re-applied on the next frame
      camera.clearViewOffset();
      camera.updateProjectionMatrix();
      warp.resize(w, h, portrait);

      // the lines rewrap at a new width, so they are painted again
      if (warpReady) {
        if (repaint) clearTimeout(repaint);
        repaint = setTimeout(() => {
          warp.rasterize(renderer.getPixelRatio()).then(wake);
        }, 160);
      }

      const perUnit = 2 * Math.tan(THREE.MathUtils.degToRad(RIDE.fov / 2));
      // keep the same width of band across the narrower axis of any screen
      rideDist = clamp(RIDE.frame / (perUnit * Math.min(aspect, 1)), 3.2, 9.5);

      /* The overviews have to fit the whole loop across the screen's width,
         which on a phone is less than half its height. Without this the
         loop is cropped off both sides at the start and the end. */
      const across = (STRIP.radius + STRIP.half) * 2;
      const fit = (share: number) => across / share / (perUnit * aspect);
      introReach = Math.max(10.6, fit(0.86));
      outroReach = Math.max(8.6, fit(0.9));
      wake();
    };

    /* ---- poses ---- */
    const P = new THREE.Vector3();
    const T = new THREE.Vector3();
    const B = new THREE.Vector3();
    const N = new THREE.Vector3();
    const v1 = new THREE.Vector3();
    const v2 = new THREE.Vector3();

    const rideAt = (t: number, out: Pose) => {
      frameAt(t, P, T, B, N);
      v1.copy(P).addScaledVector(N, rideDist).addScaledVector(T, -RIDE.lead * rideDist);
      v2.copy(P).addScaledVector(T, 0.1);
      return pose(v1, v2, B, out);
    };

    /** reach = distance from the loop's centre; lift = elevation in radians */
    const overview = (angle: number, lift: number, reach: number, out: Pose, aim = -0.15) => {
      const flat = Math.cos(lift) * reach;
      v1.set(Math.sin(angle) * flat, Math.sin(lift) * reach, Math.cos(angle) * flat);
      v2.set(0, aim, 0);
      return pose(v1, v2, UP, out);
    };

    const A = newPose();
    const Bp = newPose();
    const blend = (a: Pose, b: Pose, w: number) => {
      camera.position.lerpVectors(a.pos, b.pos, w);
      camera.quaternion.slerpQuaternions(a.quat, b.quat, w);
    };

    /* ---- the scroll ---- */
    let target = 0;
    let shown = -1;
    let current = 0;
    const n = Math.max(1, stops);

    const draw = (p: number, time: number) => {
      const far = Math.max(14, rideDist + 8);

      // The overviews breathe a little, so the loop is never quite still.
      const sway = Math.sin(time * 0.00018) * 0.22;
      const overIn = overview(-0.55 + sway, 0.65, introReach, A);

      const u = seg(p, BEATS.ride[0], BEATS.ride[1]);
      const t = dwell(u, n) * Math.PI * 2;
      let away = 0; // how far the closing pull-back has got

      if (p < BEATS.ride[0]) {
        const w = easeInOut(seg(p, BEATS.descend[0], BEATS.descend[1]));
        rideAt(0, Bp);
        blend(overIn, Bp, w);
        const f = THREE.MathUtils.smoothstep(p, 0, BEATS.descend[1]);
        (scene.fog as THREE.Fog).near = lerp(introReach - 3.6, rideDist * 0.75, f);
        (scene.fog as THREE.Fog).far = lerp(introReach + 4.4, far, f);
      } else if (p <= BEATS.ride[1]) {
        rideAt(t, Bp);
        camera.position.copy(Bp.pos);
        camera.quaternion.copy(Bp.quat);
        (scene.fog as THREE.Fog).near = rideDist * 0.75;
        (scene.fog as THREE.Fog).far = far;
      } else {
        const w = easeInOut(seg(p, BEATS.ascend[0], BEATS.ascend[1]));
        away = w;
        rideAt(Math.PI * 2, Bp);
        /* Aimed a touch above the loop's centre and held well back, so the
           finished loop sits between the headline and the closing line
           without touching either. */
        const overOut = overview(0.5 - sway, 0.42, outroReach, A, 0.15);
        blend(Bp, overOut, w);
        (scene.fog as THREE.Fog).near = lerp(rideDist * 0.75, outroReach - 1.5, w);
        (scene.fog as THREE.Fog).far = lerp(far, outroReach + 8.5, w);
      }

      lamp.position.copy(camera.position);

      /* On a tall screen the picture is lifted a tenth of the way up while
         riding, so the band sits in the top half and the words underneath
         have the bottom to themselves. It settles back to centre for the
         ending, where the headline needs the top. */
      const lift = portrait ? 0.1 * (1 - away) : 0;
      if (Math.abs(lift - lifted) > 0.0005) {
        lifted = lift;
        if (lift > 0) camera.setViewOffset(stageW, stageH, 0, stageH * lift, stageW, stageH);
        else camera.clearViewOffset();
        camera.updateProjectionMatrix();
      }

      /* ---- the words over the picture ---- */
      const show = (el: HTMLElement | null, o: number, dy: number) => {
        if (!el) return;
        el.style.opacity = o.toFixed(3);
        el.style.transform = `translate3d(0,${dy.toFixed(1)}px,0)`;
        warp.setGroup(el, o, dy);
      };

      const oIn = 1 - seg(p, BEATS.introOut[0], BEATS.introOut[1]);
      show(intro, oIn, -(1 - oIn) * 24);
      const oFin = easeInOut(seg(p, BEATS.finale[0], BEATS.finale[1]));
      show(finale, oFin, (1 - oFin) * 28);
      const oOut = seg(p, BEATS.outro[0], BEATS.outro[1]);
      show(outro, oOut, (1 - oOut) * 24);

      const live = p >= BEATS.ride[0] && p <= BEATS.ride[1];
      cards.forEach((card, k) => {
        const centre = (k + 0.5) / n;
        const o = live ? 1 - smooth(0.055, 0.1, Math.abs(u - centre)) : 0;
        show(card, o, (1 - o) * 22);
        card.style.visibility = o < 0.01 ? 'hidden' : 'visible';
      });

      const at = live ? clamp(Math.floor(u * n), 0, n - 1) : -1;
      if (at !== shown) {
        marks.forEach((m, k) => m.classList.toggle('is-on', k === at));
        shown = at;
      }
      stage.style.setProperty('--loop-p', u.toFixed(4));

      warp.update(time);
      renderer.render(scene, camera);
      // the shade and the words, over the picture, without clearing it
      renderer.autoClear = false;
      renderer.render(warp.scene, warp.camera);
      renderer.autoClear = true;
    };

    /* ---- the frame loop: only while the section is on screen ---- */
    let raf = 0;
    let last = performance.now();
    let visible = false;
    let started = false;

    const tick = (now: number) => {
      raf = 0;
      const dt = Math.min(64, now - last);
      last = now;
      // critically damped-ish follow: smooth on a wheel, honest on a drag
      current += (target - current) * (1 - Math.exp(-dt / 90));
      if (Math.abs(target - current) < 1e-4) current = target;
      draw(current, now);

      if (!started) {
        started = true;
        outer.classList.add('is-live');
        ScrollTrigger.refresh();

        /* Painted only now, against the stage layout. The page's own text
           is hidden only once its replacement exists. */
        warp.rasterize(renderer.getPixelRatio()).then((ok) => {
          if (!ok || !alive) return;
          warpReady = true;
          outer.classList.add('is-warped');
          wake();
        });
      }
      /* Stop drawing once the scroll has settled. The overviews sway, so on
         a desktop they keep going; a phone holds still and saves the
         battery — nobody is watching a loop breathe on a phone. */
      const overviewing = current < BEATS.ride[0] || current > BEATS.ride[1];
      // ...unless there are words on screen: the glass never stops moving.
      const moving = current !== target || (overviewing && !coarse) || warp.showing();
      if (visible && moving) raf = requestAnimationFrame(tick);
    };

    function wake() {
      if (!raf && alive) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) wake();
      },
      { rootMargin: '200px 0px' }
    );
    io.observe(outer);

    const trigger = ScrollTrigger.create({
      trigger: outer,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        target = self.progress;
        wake();
      }
    });

    const ro = new ResizeObserver(size);
    ro.observe(stage);
    size();

    const onLost = (e: Event) => {
      e.preventDefault();
      outer.classList.remove('is-live', 'is-warped');
      ScrollTrigger.refresh();
    };
    canvas.addEventListener('webglcontextlost', onLost);

    /* The lens follows the cursor, and on a phone the finger — a touch that
       is scrolling still reports where it is, so dragging the page drags
       the glass through the words. */
    const aim = (x: number, y: number) => {
      const r = stage.getBoundingClientRect();
      const inside = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      warp.pointer(x - r.left, y - r.top, inside);
      if (inside && visible) wake();
    };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') aim(e.clientX, e.clientY);
    };
    const onTouch = (e: TouchEvent) => {
      const t0 = e.touches[0];
      if (t0) aim(t0.clientX, t0.clientY);
    };
    const onRelease = () => warp.pointer(0, 0, false);
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('touchstart', onTouch, { passive: true });
    window.addEventListener('touchmove', onTouch, { passive: true });
    window.addEventListener('touchend', onRelease, { passive: true });
    window.addEventListener('touchcancel', onRelease, { passive: true });
    document.documentElement.addEventListener('mouseleave', onRelease);

    // First frame, now — this is what turns the list into the stage.
    wake();

    return () => {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      trigger.kill();
      canvas.removeEventListener('webglcontextlost', onLost);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('touchstart', onTouch);
      window.removeEventListener('touchmove', onTouch);
      window.removeEventListener('touchend', onRelease);
      window.removeEventListener('touchcancel', onRelease);
      document.documentElement.removeEventListener('mouseleave', onRelease);
      if (repaint) clearTimeout(repaint);
      outer.classList.remove('is-live', 'is-warped');
      [intro, outro, finale, ...cards].forEach((el) => el?.removeAttribute('style'));
      warp.dispose();
      bandGeo.dispose();
      bandMat.dispose();
      rimGeo.dispose();
      rimMat.dispose();
      tex.dispose();
      renderer.dispose();
    };
  }, [outerRef, stops]);
}
