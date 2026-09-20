/* ============================================================
   DEVTALKS — THE CARD STACK
   ------------------------------------------------------------
   The speaker cards stop being a row and become a deck. Each card
   is sticky, so the browser does the pinning on the compositor;
   all this hook adds is the shrink — a card settles back a little
   as the next one comes to rest on top of it, which is what stops
   the deck reading as a flat pile.

   Reference: the ShowcaseStack section on
   syahrilarfianalmazril.my.id.

   ONE TRIGGER, NOT ONE PER CARD
   The obvious shape — a ScrollTrigger per card, triggered by the
   card above it — does not work here, because those cards are
   `position: sticky`. ScrollTrigger measures a trigger's start
   and end once, at refresh, and a sticky element's box at that
   moment depends on where the page happened to be; the ranges
   come out degenerate and the tweens never scrub. So the deck is
   driven by one trigger on the container, whose box never moves,
   and each card's share of that progress is worked out here.

   ONE TRANSFORM, ONE OWNER
   It writes to `.spk-stack__in`, an element that exists only for
   this. The sticky position is the wrapper's, the hover lift is
   `.spk-flow`'s (CSS, from the original build) and the pointer
   tilt is `.spk`'s. Four elements, four owners; see the note at
   the top of src/styles/animations.css.

   Tuning knobs are in CONFIG.
   ============================================================ */

import { useEffect, type RefObject } from 'react';
import { ScrollTrigger } from '@/lib/gsap';
import { clamp, prefersReducedMotion } from '@/lib/dom';

const CONFIG = {
  /** how much smaller a card ends up once the next one covers it */
  shrink: 0.055,
  /** px it settles back by, on top of the shrink */
  lift: 14,
  /** how much of its brightness it gives up, so the top card reads as lit */
  dim: 0.12
} as const;

/** The deck is only worth it where the CSS actually builds one. Below this
 *  animations.css falls the cards back to the original grid, and a shrink on
 *  a grid item is just a wobble. Keep the two in step. */
const MIN_WIDTH = 861;
const MIN_HEIGHT = 641;

/** Ease-out: a card should give way quickly as the next one arrives and then
 *  hold, rather than drifting for the whole of its neighbour's travel. */
const ease = (t: number): number => 1 - Math.pow(1 - t, 2);

export function useCardStack(rootRef: RefObject<HTMLElement>, enabled: boolean): void {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !enabled || prefersReducedMotion()) return;
    if (window.innerWidth < MIN_WIDTH || window.innerHeight < MIN_HEIGHT) return;

    const inners = Array.from(root.querySelectorAll<HTMLElement>('.spk-stack__in'));
    if (inners.length < 2) return;

    /** How far through the deck we are, in cards: 0 at the first card's
     *  resting place, 1 when the second has landed on it, and so on. */
    const steps = inners.length - 1;

    const paint = (progress: number) => {
      const walked = progress * steps;

      for (let i = 0; i < inners.length; i++) {
        // The last card has nothing above it and is never covered.
        const k = i === steps ? 0 : ease(clamp(walked - i, 0, 1));

        const el = inners[i];
        if (k === 0) {
          // Hand the element back clean, so nothing of ours is left on a card
          // that is simply sitting there.
          el.style.transform = '';
          el.style.filter = '';
          continue;
        }

        el.style.transform = `translate3d(0,${(-k * CONFIG.lift).toFixed(1)}px,0) scale(${(
          1 -
          k * CONFIG.shrink
        ).toFixed(4)})`;
        el.style.filter = `brightness(${(1 - k * CONFIG.dim).toFixed(3)})`;
      }
    };

    /* The deck starts working when the container's top reaches the height the
       first card sticks at — read from the CSS rather than repeated here, so
       the two cannot drift apart. */
    const stickyTop = () => {
      const first = root.querySelector<HTMLElement>('.spk-stack');
      return first ? parseFloat(getComputedStyle(first).top) || 0 : 0;
    };

    const trigger = ScrollTrigger.create({
      trigger: root,
      start: () => `top ${stickyTop()}px`,
      end: 'bottom bottom',
      invalidateOnRefresh: true,
      onUpdate: (self) => paint(self.progress),
      onToggle: (self) => {
        // the layers are only worth promoting while the deck is on screen
        for (const el of inners) el.style.willChange = self.isActive ? 'transform' : '';
      }
    });

    paint(trigger.progress);

    return () => {
      trigger.kill();
      for (const el of inners) {
        el.style.transform = '';
        el.style.filter = '';
        el.style.willChange = '';
      }
    };
  }, [rootRef, enabled]);
}
