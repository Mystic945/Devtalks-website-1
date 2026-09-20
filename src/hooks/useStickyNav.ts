/* ============================================================
   DEVTALKS — NAV STATE
   ------------------------------------------------------------
   The bar picks up its solid background once the page has moved
   past the first 40px. Written as a class on the element rather
   than as React state on purpose: a boolean in state would
   re-render the nav on every scroll that crossed the threshold,
   and the nav is the one component that must never be the reason
   a frame is dropped.
   ============================================================ */

import { useEffect, type RefObject } from 'react';

const STUCK_AT = 40; // px

export function useStickyNav(navRef: RefObject<HTMLElement>): void {
  useEffect(() => {
    const bar = navRef.current;
    if (!bar) return;

    const onScroll = () => bar.classList.toggle('is-stuck', window.scrollY > STUCK_AT);

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      bar.classList.remove('is-stuck');
    };
  }, [navRef]);
}
