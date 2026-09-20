/* ============================================================
   DEVTALKS — SCROLL-SCRUBBED ARRIVAL
   ------------------------------------------------------------
   An element comes in slightly small and settles at full size as
   it reaches reading height, tied to scroll position rather than
   fired once.

   Reference: the `animated-scroll` card on
   syahrilarfianalmazril.my.id, which grows a pinned panel from
   0.85 to full bleed. Nothing is pinned here on purpose: pinning
   the ticket section would add a screen of scroll in front of
   the one thing on this page people came to click.

   The gallery already performs the full version of this gesture —
   its banner opens from a rounded frame to full bleed in
   src/hooks/useGallery.ts — so this is the same move at the
   scale of one card, rather than a second copy of it.
   ============================================================ */

import { useEffect, type RefObject } from 'react';
import { gsap } from '@/lib/gsap';
import { prefersReducedMotion } from '@/lib/dom';

interface Options {
  /** scale it starts at */
  from?: number;
  /** where the element is when the move starts / ends, as ScrollTrigger reads it */
  start?: string;
  end?: string;
}

export function useScrollScale(
  ref: RefObject<HTMLElement>,
  { from = 0.88, start = 'top bottom', end = 'center 62%' }: Options = {}
): void {
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { scale: from },
        {
          scale: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start,
            end,
            scrub: true,
            onToggle: (self) => {
              el.style.willChange = self.isActive ? 'transform' : '';
            }
          }
        }
      );
    });

    return () => {
      ctx.revert();
      el.style.willChange = '';
    };
  }, [ref, from, start, end]);
}
