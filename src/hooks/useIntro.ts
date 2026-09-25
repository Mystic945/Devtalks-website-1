/* ============================================================
   DEVTALKS — AUDITORIUM DOOR INTRO
   ------------------------------------------------------------
   Two closed door panels carrying the wordmark part to reveal the
   page. Nothing waits for this: the hero is fully rendered
   underneath and the doors are an overlay that leaves.

   The page takes over while the panels are still clearing, so the
   headline is already rising as the gap widens — that handoff is
   what stops the intro feeling like a loading screen.

   Plays once per browser session. Falls straight through under
   reduced motion, and the pre-paint script in index.html hides
   the panels outright on a repeat visit so there is never a flash
   of a closed door.

   Tuning knobs are in TIMING.
   ============================================================ */

import { useEffect, type RefObject } from 'react';
import { gsap } from '@/lib/gsap';
import { prefersReducedMotion } from '@/lib/dom';

const TIMING = {
  seam: 0.18, // seam light ramps up
  judder: 0.11, // the unlock — panels tighten inward, then release
  shove: 10, // px each panel tightens inward before releasing
  open: 0.85, // panels travel clear of the screen
  handoff: 0.26, // page takes over this long after the panels start moving
  drift: 80 // extra px each wordmark half travels past its panel
} as const;

const KEY = 'devtalks-doors-seen'; // once per browser session

/** Whether the intro has already played this session. Read by <Doors> too,
 *  so its very first render is already `is-gone` on a repeat visit and there
 *  is never a frame with a closed door on screen. */
export const doorsSeen = (): boolean => {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};

const markSeen = (): void => {
  try {
    sessionStorage.setItem(KEY, '1');
  } catch {
    /* private mode — just replay next time */
  }
};

/**
 * @param doorsRef  the overlay element
 * @param onReady   called once the page should take over. Fires exactly once,
 *                  whether the animation ran, was skipped, or was cut short.
 */
export function useIntro(
  doorsRef: RefObject<HTMLElement>,
  onReady: () => void
): void {
  useEffect(() => {
    const el = doorsRef.current;

    let handed = false;
    let backstop: ReturnType<typeof setTimeout> | null = null;

    const handOver = () => {
      if (handed) return;
      handed = true;
      if (backstop) clearTimeout(backstop);
      onReady();
    };

    const finish = () => {
      el?.classList.add('is-gone');
      document.body.classList.remove('is-locked');
      markSeen();
    };

    // No overlay, reduced motion, or already seen this session: hand straight
    // over. The page never depends on the animation.
    if (!el || prefersReducedMotion() || doorsSeen()) {
      finish();
      handOver();
      return;
    }

    document.body.classList.add('is-locked');

    /* NEVER TRAP THE PAGE BEHIND THE INTRO.
       `ready` is what releases the hero timeline and every [data-reveal] on
       the site, and [data-reveal] starts at opacity 0 in CSS. So if this
       timeline never reaches its handOver call, the whole page stays blank
       behind a closed door.

       That is not hypothetical: GSAP advances on requestAnimationFrame, and
       rAF does not run in a background tab or under aggressive power saving.
       A page opened in a background tab on a phone would sit invisible.

       setTimeout is not rAF, so it fires regardless. The static build had
       the same guard for the same reason. */
    backstop = setTimeout(() => {
      finish();
      handOver();
    }, 2600);

    const q = <T extends Element>(sel: string) => el.querySelector<T>(sel);
    const L = q<HTMLElement>('.door--l');
    const R = q<HTMLElement>('.door--r');
    const ML = q<HTMLElement>('.door--l .door__mark');
    const MR = q<HTMLElement>('.door--r .door__mark');
    const seam = q<HTMLElement>('.doors__seam');
    const glow = q<HTMLElement>('.doors__glow');

    const tl = gsap.timeline({
      onComplete: () => {
        finish();
        handOver();
      }
    });

    // 1 — the seam wakes up
    tl.fromTo([seam, glow], { opacity: 0 }, { opacity: 1, duration: TIMING.seam, ease: 'power2.out' }, 0)
      .fromTo(seam, { scaleY: 0.35 }, { scaleY: 1, duration: TIMING.seam + 0.12, ease: 'power3.out' }, 0)

      // 2 — the unlock: panels tighten inward against each other, then
      //     release. This is what gives the open its sense of weight.
      .to(
        [L, R],
        {
          x: (i: number) => (i === 0 ? TIMING.shove : -TIMING.shove),
          duration: TIMING.judder,
          ease: 'power2.in'
        },
        TIMING.seam
      )
      .to(
        [ML, MR],
        {
          x: (i: number) => (i === 0 ? TIMING.shove : -TIMING.shove),
          duration: TIMING.judder,
          ease: 'power2.in'
        },
        TIMING.seam
      )

      // 3 — the doors part. power2.inOut spreads the travel across the whole
      //     duration so you watch them move; a power4.out would throw them 90%
      //     of the way in the first quarter and the rest happens off-screen,
      //     which reads as fast however long the tween actually is.
      .to(L, { xPercent: -101, x: 0, duration: TIMING.open, ease: 'power2.inOut' }, '>')
      .to(R, { xPercent: 101, x: 0, duration: TIMING.open, ease: 'power2.inOut' }, '<')

      // the wordmark halves run slightly ahead of their panels, so the word
      // looks torn apart rather than merely carried away
      .to(ML, { x: -TIMING.drift, duration: TIMING.open, ease: 'power2.inOut' }, '<')
      .to(MR, { x: TIMING.drift, duration: TIMING.open, ease: 'power2.inOut' }, '<')
      .to([ML, MR], { opacity: 0, duration: TIMING.open * 0.62, ease: 'power2.in' }, '<')

      // The seam is light escaping through the gap, so it has to die almost
      // immediately — left to linger it reads as an orange smear over the page.
      .to(glow, { opacity: 0, duration: 0.3, ease: 'power2.in' }, '<')
      .to(seam, { opacity: 0, duration: 0.18, ease: 'power2.in' }, '<')

      // 4 — the page takes over while the doors are still clearing
      .call(handOver, undefined, TIMING.seam + TIMING.judder + TIMING.handoff);

    return () => {
      if (backstop) clearTimeout(backstop);
      tl.kill();
      document.body.classList.remove('is-locked');
    };
    // The refs and the callback are stable for the life of the app; this is a
    // one-shot opening sequence and must never be re-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
