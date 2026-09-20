/* ============================================================
   DEVTALKS — REVEAL FOOTER
   ------------------------------------------------------------
   The footer is pinned to the bottom of the viewport and the page
   scrolls over it, so it is uncovered rather than scrolled to.
   The last screen of the site is a door opening, not another
   block arriving.

   HOW
   The footer is fixed at z-index 0 and <main> sits above it at
   z-index 1 with the paper ground painted on it. Giving main a
   bottom margin equal to the footer's height adds exactly enough
   scroll for the footer to clear — no scroll hijacking, no
   duplicate copy, and window.scrollY stays the real one, which
   useScrollFlow depends on.

   WHEN NOT TO
   A pinned footer taller than the window can never be fully
   uncovered — you would scroll to the end and still be missing
   its last rows. So the height is measured first, and if it does
   not comfortably fit, the footer stays in normal flow and this
   hook does nothing else. That is the common case on a phone.

   Re-measured on resize and whenever the footer's own box
   changes, because its height is what the whole effect is
   calibrated to.
   ============================================================ */

import { useEffect, type RefObject } from 'react';
import { ScrollTrigger } from '@/lib/gsap';

const FIT = 0.86; // fraction of the viewport the footer must fit inside

export function useFooterReveal(
  footRef: RefObject<HTMLElement>,
  mainRef: RefObject<HTMLElement>
): void {
  useEffect(() => {
    const foot = footRef.current;
    const main = mainRef.current;
    if (!foot || !main) return;

    const apply = () => {
      // Measure in the static state, or we measure a footer that is already
      // pinned and out of flow.
      foot.classList.remove('is-revealing');
      main.style.marginBottom = '';

      const h = foot.offsetHeight;
      if (!(h > 0 && h <= window.innerHeight * FIT)) return;

      foot.classList.add('is-revealing');
      main.style.marginBottom = `${h}px`;

      // The document just got taller by the height of the footer. Anything
      // measured against the old height — every ScrollTrigger on the page —
      // is now wrong by that much.
      ScrollTrigger.refresh();
    };

    apply();

    let t: ReturnType<typeof setTimeout> | null = null;
    const later = () => {
      if (t) clearTimeout(t);
      t = setTimeout(apply, 120);
    };

    window.addEventListener('resize', later, { passive: true });
    window.addEventListener('load', later);

    // The footer's columns wrap at different widths, and web fonts land after
    // first paint; both change the height this is calibrated to.
    const ro = new ResizeObserver(later);
    ro.observe(foot);

    return () => {
      if (t) clearTimeout(t);
      ro.disconnect();
      window.removeEventListener('resize', later);
      window.removeEventListener('load', later);
      foot.classList.remove('is-revealing');
      main.style.marginBottom = '';
    };
  }, [footRef, mainRef]);
}
