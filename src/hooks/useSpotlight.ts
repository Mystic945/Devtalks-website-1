/* ============================================================
   DEVTALKS — THE SPOTLIGHT BENTO
   ------------------------------------------------------------
   The hero tiles start almost unlit. The pointer is a stage
   spotlight: tiles wash with light as it crosses them, their rim
   comes up, and they rise toward the viewer. The grid is square
   and level — the depth comes from the lighting and the lift, not
   from a skewed plane. On a phone there is no pointer, so the
   device's own tilt moves the light instead; physically tipping
   the handset walks the beam across the grid.

   PERFORMANCE
   The rule this hook follows is the one the rest of the site
   follows: never read layout in a frame. Tile positions are
   measured once on load and again on resize, and the frame loop
   only ever writes a transform or an opacity, so the compositor
   does everything and the main thread stays free. The loop is
   gated by IntersectionObserver and by document.hidden, and it
   stops itself once the light has come to rest — an idle hero
   costs nothing.

   Tuning knobs are in CONFIG.
   ============================================================ */

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { clamp, isFinePointer, prefersReducedMotion } from '@/lib/dom';

/** What the hero renders from: iOS will not hand over orientation without a
 *  user gesture, so the grid asks for one with a button in its hint line. */
export interface Spotlight {
  needsTiltPermission: boolean;
  requestTilt: () => void;
}

type OrientationCtor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

const CONFIG = {
  radius: 560, // px: how far the spotlight reaches
  /** degrees a tile leans toward the light — small on purpose: the grid is
   *  level, the light does the work */
  maxTilt: 2.6,
  lift: 34, // px a lit tile rises toward the viewer
  glowMax: 0.95, // brightest the wash inside a tile gets
  rimMax: 0.9,
  ease: 0.11, // how quickly the beam follows the pointer
  tiltGain: 0.024 // deviceorientation degrees -> fraction of the grid
} as const;

interface Tile {
  el: HTMLElement;
  glow: HTMLElement;
  rim: HTMLElement;
  lit: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}

export function useSpotlight(gridRef: RefObject<HTMLElement>): Spotlight {
  const [needsTiltPermission, setNeedsTiltPermission] = useState(false);
  /* Set by the effect; the button the hero renders calls through this ref so
     asking for permission does not have to re-run the whole hook. */
  const askRef = useRef<() => void>(() => {});

  useEffect(() => {
    const grid = gridRef.current;
    const plane = grid?.querySelector<HTMLElement>('.bento__plane');
    if (!grid || !plane) return;
    if (prefersReducedMotion()) return; // CSS lights the stage and leaves it lit

    const hint = grid.querySelector<HTMLElement>('.bento__hint');

    const tiles: Tile[] = Array.from(plane.querySelectorAll<HTMLElement>('[data-bt]'))
      .map((el) => ({
        el,
        glow: el.querySelector<HTMLElement>('.bt__glow')!,
        rim: el.querySelector<HTMLElement>('.bt__rim')!,
        lit: false,
        x: 0,
        y: 0,
        w: 0,
        h: 0,
        cx: 0,
        cy: 0
      }))
      .filter((t) => t.glow && t.rim);

    if (!tiles.length) return;

    let gridRect: DOMRect | null = null;
    let planeW = 0;
    let planeH = 0;
    const target = { x: 0.5, y: 0.42 };
    const beam = { x: 0.5, y: 0.42 };
    let raf: number | null = null;
    let visible = true;
    let woken = false;
    let tilting = false;

    const timers: Array<ReturnType<typeof setTimeout>> = [];
    const intervals: Array<ReturnType<typeof setInterval>> = [];
    const observers: IntersectionObserver[] = [];

    /* ---- measuring: once on load, once per resize, never in a frame ---- */
    const measure = () => {
      gridRect = grid.getBoundingClientRect();
      planeW = plane.offsetWidth;
      planeH = plane.offsetHeight;
      for (const t of tiles) {
        t.x = t.el.offsetLeft;
        t.y = t.el.offsetTop;
        t.w = t.el.offsetWidth;
        t.h = t.el.offsetHeight;
        t.cx = t.x + t.w / 2;
        t.cy = t.y + t.h / 2;
      }
    };

    /* ---- the frame ---- */
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!visible) {
        if (raf !== null) cancelAnimationFrame(raf);
        raf = null;
        return;
      }

      beam.x += (target.x - beam.x) * CONFIG.ease;
      beam.y += (target.y - beam.y) * CONFIG.ease;

      const sx = beam.x * planeW;
      const sy = beam.y * planeH;

      for (const t of tiles) {
        const dx = sx - t.cx;
        const dy = sy - t.cy;
        const d = Math.sqrt(dx * dx + dy * dy);
        let k = 1 - d / CONFIG.radius;
        k = k < 0 ? 0 : k * k; // falls off like real light

        // the wash: the gradient never changes, it only slides
        t.glow.style.transform = `translate3d(${(sx - t.x).toFixed(1)}px,${(sy - t.y).toFixed(1)}px,0)`;
        t.glow.style.opacity = (k * CONFIG.glowMax).toFixed(3);
        t.rim.style.opacity = (k * CONFIG.rimMax).toFixed(3);

        // and the lean toward it
        const lx = (sx - t.cx) / (t.w * 0.5);
        const ly = (sy - t.cy) / (t.h * 0.5);
        t.el.style.transform =
          `translateZ(${(k * CONFIG.lift).toFixed(1)}px) ` +
          `rotateX(${(-ly * CONFIG.maxTilt * k).toFixed(2)}deg) ` +
          `rotateY(${(lx * CONFIG.maxTilt * k).toFixed(2)}deg)`;

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
        if (raf !== null) cancelAnimationFrame(raf);
        raf = null;
      }
    };

    const kick = () => {
      if (!raf && visible) raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      if (woken) return;
      woken = true;
      hint?.classList.add('is-gone');
    };

    /* ---- input ---- */
    const onPointerMove = (e: PointerEvent) => {
      if (!gridRect) return;
      target.x = (e.clientX - gridRect.left) / gridRect.width;
      target.y = (e.clientY - gridRect.top) / gridRect.height;
      wake();
      kick();
    };

    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      tilting = true;
      target.x = clamp(0.5 + e.gamma * CONFIG.tiltGain, -0.15, 1.15);
      target.y = clamp(0.5 + (e.beta - 42) * CONFIG.tiltGain, -0.15, 1.15);
      wake();
      kick();
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!gridRect) return;
      const t = e.touches[0];
      target.x = (t.clientX - gridRect.left) / gridRect.width;
      target.y = (t.clientY - gridRect.top) / gridRect.height;
      wake();
      kick();
    };

    const fine = isFinePointer();

    if (fine) {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
    } else {
      // iOS 13+ will not hand over orientation without a user gesture, so the
      // hero renders an "Enable tilt" button when one is needed. Everywhere
      // else it just starts.
      const ctor =
        typeof DeviceOrientationEvent !== 'undefined'
          ? (DeviceOrientationEvent as OrientationCtor)
          : null;
      const needsAsk = typeof ctor?.requestPermission === 'function';

      if (!needsAsk) {
        window.addEventListener('deviceorientation', onTilt, { passive: true });
      } else {
        setNeedsTiltPermission(true);
        askRef.current = () => {
          ctor!
            .requestPermission!()
            .then((r) => {
              if (r !== 'granted') return;
              window.addEventListener('deviceorientation', onTilt, { passive: true });
              setNeedsTiltPermission(false);
              hint?.classList.add('is-gone');
            })
            .catch(() => {});
        };
      }

      // a drag across the grid works too, and is the fallback if tilt is refused
      grid.addEventListener('touchmove', onTouchMove, { passive: true });

      // and if the phone is flat on a desk and nobody touches anything, the
      // beam drifts slowly on its own rather than leaving the hero dead
      timers.push(
        setTimeout(() => {
          if (woken || tilting) return;
          let a = 0;
          intervals.push(
            setInterval(() => {
              if (woken || document.hidden || !visible) return;
              a += 0.02;
              target.x = 0.5 + Math.cos(a) * 0.3;
              target.y = 0.45 + Math.sin(a * 0.8) * 0.22;
              kick();
            }, 1000 / 30)
          );
        }, 2600)
      );
    }

    /* ---- lifecycle ---- */
    // images inside tiles change their height, so measure after they land
    measure();

    let rt: ReturnType<typeof setTimeout> | null = null;
    const onResize = () => {
      if (rt) clearTimeout(rt);
      rt = setTimeout(measure, 160);
    };
    const onScroll = () => {
      // the grid moves up the page as you scroll; the pointer mapping needs
      // its live top, and this is the one layout read outside a frame
      if (gridRect) gridRect = grid.getBoundingClientRect();
    };
    const onLoad = () => measure();
    const onVisibility = () => {
      if (document.hidden) {
        if (raf !== null) cancelAnimationFrame(raf);
        raf = null;
      } else {
        kick();
      }
    };

    window.addEventListener('load', onLoad);
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (es) => {
          visible = es[0].isIntersecting;
          if (visible) kick();
        },
        { threshold: 0 }
      );
      io.observe(grid);
      observers.push(io);
    }

    kick(); // one pass, so nothing starts black

    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      if (rt) clearTimeout(rt);
      timers.forEach(clearTimeout);
      intervals.forEach(clearInterval);
      observers.forEach((io) => io.disconnect());
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('deviceorientation', onTilt);
      grid.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('load', onLoad);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      for (const t of tiles) {
        t.el.removeAttribute('style');
        t.el.classList.remove('is-lit');
        t.glow.removeAttribute('style');
        t.rim.removeAttribute('style');
      }
    };
  }, [gridRef]);

  const requestTilt = useCallback(() => askRef.current(), []);
  return { needsTiltPermission, requestTilt };
}
