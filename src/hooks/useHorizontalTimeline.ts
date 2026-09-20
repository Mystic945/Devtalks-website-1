/* ============================================================
   DEVTALKS — THE HORIZONTAL RUN OF SHOW
   ------------------------------------------------------------
   The schedule stops being a list you scroll down and becomes a
   line you travel along: the section pins to the screen and the
   day moves sideways past you.

   Reference: the Professional Journey section on
   syahrilarfianalmazril.my.id, which is built the same way — a
   tall outer section for scroll length, a `position: sticky`
   stage inside it, and a `width: max-content` track that is
   translated left as you scroll through.

   WHY STICKY AND NOT ScrollTrigger's pin
   ScrollTrigger can pin for you, but it does it by wrapping the
   element in a generated container and swapping in a spacer. On
   a page that already has a sticky card deck, a scrubbed gallery
   and a fixed reveal footer, that is one more thing rewriting
   layout behind everyone's back. `position: sticky` is the
   browser's own pin, it runs on the compositor, and it is what
   the reference uses. All this hook does is measure and move.

   THE ONE NUMBER THAT MATTERS
   distance = how far the track has to travel for its last card to
   reach the right edge. The section's height is then that plus
   one screen, so the pin lasts exactly as long as the travel and
   not a pixel more. Derive it, never hard-code it: the schedule
   is content, and someone will add a row.

   Tuning knobs are in CONFIG.
   ============================================================ */

import { useEffect, useState, type RefObject } from 'react';
import { ScrollTrigger } from '@/lib/gsap';
import { prefersReducedMotion } from '@/lib/dom';

const CONFIG = {
  /** px of breathing room after the last card before the pin releases */
  tailPad: 80
} as const;

/** Below this the track is laid out as a vertical list instead — see
 *  styles/animations.css. A pinned horizontal scroll on a phone fights the
 *  gesture the visitor is already making. Keep the two in step. */
const WIDE = '(min-width: 900px)';

/** Re-renders when the query flips, so crossing the breakpoint — a resize,
 *  an orientation change — tears the timeline down or builds it rather than
 *  leaving an inline height behind on a layout that no longer wants one. */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

export function useHorizontalTimeline(
  outerRef: RefObject<HTMLElement>,
  stageRef: RefObject<HTMLElement>,
  trackRef: RefObject<HTMLElement>
): void {
  const wide = useMediaQuery(WIDE);

  useEffect(() => {
    const outer = outerRef.current;
    const stage = stageRef.current;
    const track = trackRef.current;
    if (!outer || !stage || !track) return;

    /* The vertical fallback needs no JavaScript at all: the CSS lays the
       track out as a column and nothing here has to run. */
    if (!wide || prefersReducedMotion()) {
      outer.style.height = '';
      track.style.transform = '';
      return;
    }

    let distance = 0;

    /* Measured, never assumed. scrollWidth is the track's full laid-out
       width including the cards that overflow the stage. */
    const measure = () => {
      distance = Math.max(0, track.scrollWidth - stage.clientWidth + CONFIG.tailPad);
      // Scroll length = one screen of pin, plus the travel.
      outer.style.height = `${stage.offsetHeight + distance}px`;
    };

    const draw = (progress: number) => {
      track.style.transform = `translate3d(${(-progress * distance).toFixed(1)}px,0,0)`;
    };

    measure();
    draw(0);

    const trigger = ScrollTrigger.create({
      trigger: outer,
      start: 'top top',
      end: () => `+=${distance}`,
      scrub: true,
      invalidateOnRefresh: true,
      onRefresh: () => {
        measure();
      },
      onUpdate: (self) => draw(self.progress),
      onToggle: (self) => {
        // The track is only worth its own layer while it is actually moving.
        track.style.willChange = self.isActive ? 'transform' : '';
      }
    });

    /* The card widths come from clamp()s on the viewport, so a resize
       changes the travel. ScrollTrigger's own refresh handles the trigger
       positions; this re-reads the track. */
    const ro = new ResizeObserver(() => ScrollTrigger.refresh());
    ro.observe(track);

    return () => {
      ro.disconnect();
      trigger.kill();
      outer.style.height = '';
      track.style.transform = '';
      track.style.willChange = '';
    };
  }, [outerRef, stageRef, trackRef, wide]);
}
