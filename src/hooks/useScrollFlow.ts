/* ============================================================
   DEVTALKS — SCROLL REGISTRATION
   ------------------------------------------------------------
   A card entering the viewport arrives slightly out of register —
   offset, soft, a touch small — and settles as it reaches reading
   height. It is continuous, tied to scroll position rather than
   fired once, which is what makes the page feel like one moving
   sheet instead of a stack of separate reveals.

   Scroll velocity also leans the speaker row a fraction of a
   degree. It is well under the threshold where it reads as a
   skew; you only notice it stop.

   NATIVE SCROLL
   There is deliberately no wheel handler here. An earlier version
   took over scrolling and eased the page toward a target, which
   meant calling preventDefault on every wheel tick — that pulls
   scrolling off the compositor thread and onto the main thread,
   and the easing left the page trailing the wheel by close to
   half a second. Scrolling is the browser's own now.

   Everything degrades to a static, fully visible page: the
   default state of every element here is its finished state.

   Tuning knobs are in CONFIG.
   ============================================================ */

import { useEffect } from 'react';
import { clamp, docTop, prefersReducedMotion } from '@/lib/dom';

const CONFIG = {
  enterFrom: 0.86, // viewport fraction where registration starts
  enterTo: 0.52, // ...and where the card is fully in register
  rise: 54, // px a card travels into register
  shrink: 0.06, // how much smaller it starts
  soften: 5, // px of blur it starts with
  leanMax: 0.5, // degrees the row leans at full scroll speed
  leanVel: 42 // px/frame of scroll velocity that counts as full
} as const;

interface Card {
  el: HTMLElement;
  k: number;
  hinted: boolean;
  top: number;
}

export function useScrollFlow(): void {
  useEffect(() => {
    let cards: Card[] = [];
    let row: HTMLElement | null = null;
    let current = 0;
    let vel = 0;
    let lean = 0;
    let raf: number | null = null;

    const measure = () => {
      cards = Array.from(document.querySelectorAll<HTMLElement>('[data-flow]')).map((el) => ({
        el,
        k: -1,
        hinted: false,
        top: docTop(el)
      }));
    };

    /* Anything that changes the page's height — images landing, the FAQ
       opening, a resize — moves every cached top below it. */
    const remeasure = () => {
      for (const c of cards) c.top = docTop(c.el);
    };

    const register = () => {
      const vh = window.innerHeight;
      const from = vh * CONFIG.enterFrom;
      const to = vh * CONFIG.enterTo;
      const sy = window.scrollY;

      for (const c of cards) {
        const top = c.top - sy;

        // 0 while still below the fold, 1 once it has reached reading height
        let k = clamp((from - top) / (from - to), 0, 1);
        k = 1 - Math.pow(1 - k, 3); // ease out, so it lands softly

        // The last 0.5% of an ease-out takes as long as the first half of it.
        // Snap there, or the card parks at 99.8% scale with a trace of blur
        // still on it and this loop never gets to idle.
        if (k > 0.995) k = 1;

        if (c.k !== -1 && Math.abs(k - c.k) < 0.002) continue;
        c.k = k;

        // In register: hand the element back with nothing of ours on it, so
        // hover and focus own their transforms cleanly from here on.
        if (k === 1) {
          c.el.style.transform = '';
          c.el.style.opacity = '';
          c.el.style.filter = '';
          c.el.style.willChange = ''; // and drop the compositor hint with it
          c.hinted = false;
          continue;
        }

        // Hint only once the card is actually travelling. Setting it at k=0
        // would promote every element below the fold at load and hold those
        // layers until the visitor happened to scroll past them.
        if (k > 0 && !c.hinted) {
          c.el.style.willChange = 'transform, opacity';
          c.hinted = true;
        }

        const y = (1 - k) * CONFIG.rise;
        const s = 1 - (1 - k) * CONFIG.shrink;
        const bl = (1 - k) * CONFIG.soften;

        c.el.style.transform = `translate3d(0,${y.toFixed(1)}px,0) scale(${s.toFixed(4)})`;
        c.el.style.opacity = (0.15 + k * 0.85).toFixed(3);
        c.el.style.filter = bl > 0.35 ? `blur(${bl.toFixed(2)}px)` : '';
      }

      if (row) {
        const want = clamp(vel / CONFIG.leanVel, -1, 1) * CONFIG.leanMax;
        lean += (want - lean) * 0.12;
        row.style.transform = Math.abs(lean) > 0.01 ? `rotate(${lean.toFixed(3)}deg)` : '';
      }
    };

    const frame = () => {
      raf = requestAnimationFrame(frame);

      const now = window.scrollY;
      vel = now - current;
      current = now;

      register();

      // Idle: the page is still and nothing is mid-flight.
      if (Math.abs(vel) < 0.2 && Math.abs(lean) < 0.02) {
        const settled = cards.every((c) => c.k <= 0.001 || c.k === 1);
        if (settled && raf !== null) {
          cancelAnimationFrame(raf);
          raf = null;
        }
      }
    };

    const kick = () => {
      if (!raf && !document.hidden) raf = requestAnimationFrame(frame);
    };

    /* ---------------- setup ---------------- */
    /* The press drift leans the speaker row with scroll velocity. It is
       skipped when that row is a deck: a rotation on the container becomes
       the containing block for the sticky cards inside it, which makes them
       stick to a moving target. The deck has its own motion anyway. */
    const speakers = document.querySelector<HTMLElement>('.sec--speakers .speakers');
    row = speakers?.classList.contains('speakers--stack') ? null : speakers;

    measure();

    if (prefersReducedMotion()) {
      // Keep the composition, drop the movement.
      for (const c of cards) {
        c.el.style.opacity = '1';
        c.el.style.transform = '';
        c.el.style.filter = '';
      }
      return;
    }

    const onScroll = () => kick();
    const onResize = () => {
      remeasure();
      current = window.scrollY;
      kick();
    };
    const onLoad = () => {
      remeasure();
      kick();
    };
    const onVisibility = () => {
      if (document.hidden) {
        if (raf !== null) cancelAnimationFrame(raf);
        raf = null;
      } else {
        current = window.scrollY;
        kick();
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('load', onLoad);
    document.addEventListener('visibilitychange', onVisibility);

    let t: ReturnType<typeof setTimeout> | null = null;
    const ro = new ResizeObserver(() => {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        remeasure();
        kick();
      }, 80);
    });
    ro.observe(document.body);

    kick();

    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      if (t) clearTimeout(t);
      ro.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('load', onLoad);
      document.removeEventListener('visibilitychange', onVisibility);
      // give every card back unstyled, or a hot reload inherits mid-flight state
      for (const c of cards) c.el.removeAttribute('style');
    };
  }, []);
}
