/* ============================================================
   DEVTALKS — THE REEL STRIP
   ------------------------------------------------------------
   Two behaviours the running strip needs to be usable:

   CLICKING A MOVING TARGET
   A click only fires when press and release land on the same
   element, so a card sliding out from under the finger would
   never register one. The strip therefore holds still for the
   length of a press — and for as long as a card holds keyboard
   focus, since tabbing through a moving strip is worse. This is
   the same class of bug that killed the speaker-card magnify,
   handled up front rather than after it is reported.

   VIDEO, WHEN IT ARRIVES
   Clips are muted, looping and inline, and an IntersectionObserver
   pauses every one of them while the section is off screen. Six
   vertical videos decoding behind the FAQ would undo the frame
   budget the rest of this page was tuned to.
   ============================================================ */

import { useEffect, type RefObject } from 'react';
import { prefersReducedMotion } from '@/lib/dom';

/** How long the strip stays still after a press is released. Long enough
 *  that the click has landed, short enough not to feel stuck. */
const RELEASE_MS = 260;

export function useReelStrip(
  sectionRef: RefObject<HTMLElement>,
  trackRef: RefObject<HTMLElement>
): void {
  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    /* ---- hold the strip still long enough to be clicked ---- */
    let t: ReturnType<typeof setTimeout> | null = null;

    const hold = () => {
      if (t) clearTimeout(t);
      track.classList.add('is-held');
    };
    const release = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => track.classList.remove('is-held'), RELEASE_MS);
    };

    track.addEventListener('pointerdown', hold, { passive: true });
    window.addEventListener('pointerup', release, { passive: true });
    window.addEventListener('pointercancel', release, { passive: true });
    track.addEventListener('focusin', hold);
    track.addEventListener('focusout', release);

    /* ---- videos are only worth decoding while the strip is on screen ---- */
    const vids = Array.from(track.querySelectorAll<HTMLVideoElement>('video'));
    let io: IntersectionObserver | null = null;

    const playAll = (on: boolean) => {
      for (const v of vids) {
        if (on) void v.play().catch(() => {});
        else v.pause();
      }
    };

    const onVisibility = () => {
      if (document.hidden) playAll(false);
    };

    if (vids.length && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(
        (es) => playAll(es[0].isIntersecting && !prefersReducedMotion()),
        { threshold: 0 }
      );
      io.observe(section);
      document.addEventListener('visibilitychange', onVisibility);
    }

    return () => {
      if (t) clearTimeout(t);
      track.removeEventListener('pointerdown', hold);
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      track.removeEventListener('focusin', hold);
      track.removeEventListener('focusout', release);
      document.removeEventListener('visibilitychange', onVisibility);
      io?.disconnect();
      playAll(false);
      track.classList.remove('is-held');
    };
  }, [sectionRef, trackRef]);
}
