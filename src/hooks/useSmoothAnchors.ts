/* ============================================================
   DEVTALKS — GLIDING ANCHOR LINKS
   ------------------------------------------------------------
   Every in-page link glides instead of jumping, using the
   browser's own smooth scroll — which runs on the compositor, so
   it stays smooth even when the main thread is busy.

   `scroll-behavior` is forced back to `auto` on the document on
   purpose: a CSS-level smooth scroll would also apply to
   programmatic scrolls, and ScrollTrigger measures the page by
   scrolling it. Making only these clicks smooth keeps the two
   from fighting.

   Touch devices keep the native jump — a 400ms glide on a phone
   reads as lag, not polish.
   ============================================================ */

import { useEffect } from 'react';
import { isFinePointer } from '@/lib/dom';

export function useSmoothAnchors(): void {
  useEffect(() => {
    if (!isFinePointer()) return;

    document.documentElement.style.scrollBehavior = 'auto';

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const a = target?.closest?.('a[href^="#"]') as HTMLAnchorElement | null;
      if (!a) return;

      const id = a.getAttribute('href');
      if (!id || id === '#') return;

      const el = document.querySelector<HTMLElement>(id);
      if (!el) return;

      e.preventDefault();
      window.scrollTo({
        top: window.scrollY + el.getBoundingClientRect().top,
        left: 0,
        behavior: 'smooth'
      });
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
}
