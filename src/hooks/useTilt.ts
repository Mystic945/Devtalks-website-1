/* ============================================================
   DEVTALKS — SPEAKER CARD TILT
   ------------------------------------------------------------
   Turns a speaker card into a tiltable glass slab. Pointer on
   desktop, drag on touch. Everything it writes is a transform or
   a custom property, so the compositor does the work and layout
   is never touched.

   ONE TRANSFORM, ONE OWNER
   The card sits inside a `.spk-flow` wrapper that useScrollFlow
   writes its registration transform to. A transform is a single
   property — whoever writes last wins — so the two get one
   element each. There used to be a third wrapper for a hover
   magnify; three nested transforms on one card made it jitter
   under the cursor, and the magnify was dropped rather than
   fought with.

   Tuning knobs are in CONFIG.
   ============================================================ */

import { useEffect, type RefObject } from 'react';
import { clamp, isFinePointer, prefersReducedMotion } from '@/lib/dom';

const CONFIG = {
  maxTilt: 13, // degrees at the corner of a card
  lift: 18, // px the card rises toward the viewer
  ease: 0.14, // how quickly it follows
  settle: 0.1 // how quickly it returns
} as const;

/** Horizontal travel, in px, before a touch counts as a tilt rather than a
 *  scroll. Below this the page keeps the gesture. */
const DRAG_SLOP = 8;

export function useTilt(ref: RefObject<HTMLElement>): void {
  useEffect(() => {
    const card = ref.current;
    if (!card || prefersReducedMotion()) return;

    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let active = false;
    let raf: number | null = null;
    let dragging = false;
    let startX = 0;
    let startY = 0;

    const frame = () => {
      const k = active ? CONFIG.ease : CONFIG.settle;
      cx += (tx - cx) * k;
      cy += (ty - cy) * k;

      card.style.transform =
        `perspective(1400px) rotateX(${(cy * CONFIG.maxTilt).toFixed(2)}deg) ` +
        `rotateY(${(cx * CONFIG.maxTilt).toFixed(2)}deg) ` +
        `translate3d(0,0,${active ? CONFIG.lift : 0}px)`;

      // the sheen follows the tilt, so the glass looks lit from one side
      card.style.setProperty('--sheen-angle', `${(130 + cx * 55).toFixed(0)}deg`);

      if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) {
        raf = requestAnimationFrame(frame);
      } else {
        raf = null;
      }
    };

    const kick = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const rest = () => {
      active = false;
      card.classList.remove('is-tilting');
      tx = 0;
      ty = 0;
      kick();
    };

    const cleanups: Array<() => void> = [];
    const on = <K extends keyof HTMLElementEventMap>(
      type: K,
      fn: (e: HTMLElementEventMap[K]) => void,
      opts?: AddEventListenerOptions
    ) => {
      card.addEventListener(type, fn as EventListener, opts);
      cleanups.push(() => card.removeEventListener(type, fn as EventListener, opts));
    };

    if (isFinePointer()) {
      /* ---- desktop: hover to tilt ---- */
      on('pointerenter', () => {
        active = true;
        card.classList.add('is-tilting');
      });
      on('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        ty = -((e.clientY - r.top) / r.height - 0.5) * 2;
        kick();
      });
      on('pointerleave', rest);
    } else {
      /* ---- touch: drag to tilt ----
         Non-passive only once a drag is under way, so vertical scrolling is
         never blocked by accident. */
      on(
        'touchstart',
        (e) => {
          const t = e.touches[0];
          startX = t.clientX;
          startY = t.clientY;
          dragging = false;
          active = true;
          card.classList.add('is-tilting');
          kick();
        },
        { passive: true }
      );

      on(
        'touchmove',
        (e) => {
          const t = e.touches[0];
          const dx = t.clientX - startX;
          const dy = t.clientY - startY;
          if (!dragging && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > DRAG_SLOP) {
            dragging = true;
          }
          if (!dragging) return; // still looks like a scroll — leave it alone
          e.preventDefault();
          tx = clamp(dx / (card.offsetWidth * 0.5), -1, 1);
          ty = clamp(-dy / (card.offsetHeight * 0.5), -1, 1);
          kick();
        },
        { passive: false }
      );

      on('touchend', rest, { passive: true });
      on('touchcancel', rest, { passive: true });
    }

    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      cleanups.forEach((fn) => fn());
      card.classList.remove('is-tilting');
      card.style.removeProperty('transform');
      card.style.removeProperty('--sheen-angle');
    };
  }, [ref]);
}
