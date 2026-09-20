/* ============================================================
   DEVTALKS — MAGNETIC BUTTONS
   ------------------------------------------------------------
   Buttons marked [data-magnetic] lean toward the cursor and
   spring back when it leaves. gsap.quickTo is used rather than a
   tween per pointermove: it writes straight to the same tween
   every frame instead of building a new one sixty times a second.

   Desktop only, by design. There is no cursor to lean toward on
   a phone, and on a narrow laptop the travel reads as a button
   that will not sit still.
   ============================================================ */

import { useEffect } from 'react';
import { gsap } from '@/lib/gsap';
import { isFinePointer, prefersReducedMotion } from '@/lib/dom';

/** Below this width the effect is skipped — see the note above. */
const MIN_WIDTH = 1024;

export function useMagnetic(enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    if (!isFinePointer() || prefersReducedMotion() || window.innerWidth < MIN_WIDTH) return;

    const cleanups: Array<() => void> = [];

    document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
      const x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'elastic.out(1,0.4)' });
      const y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'elastic.out(1,0.4)' });

      const move = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        x((e.clientX - r.left - r.width / 2) * 0.32);
        y((e.clientY - r.top - r.height / 2) * 0.42);
      };
      const leave = () => {
        x(0);
        y(0);
      };

      el.addEventListener('pointermove', move);
      el.addEventListener('pointerleave', leave);

      cleanups.push(() => {
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerleave', leave);
        gsap.killTweensOf(el);
        gsap.set(el, { clearProps: 'transform' });
      });
    });

    return () => cleanups.forEach((fn) => fn());
  }, [enabled]);
}
