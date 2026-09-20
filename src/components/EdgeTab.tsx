/* ============================================================
   DEVTALKS — THE REGISTRATIONS TAB
   ------------------------------------------------------------
   The call to action pinned to the left edge, so it is reachable
   from anywhere on the page rather than only from the hero and
   the nav. Reference: the vertical "AVAILABLE FOR OPPORTUNITY"
   tab on syahrilarfianalmazril.my.id.

   It takes itself away while the ticket section is on screen.
   Pointing at a thing the visitor is already looking at is noise,
   and the tab would otherwise sit on top of the pass.

   Desktop only — styles/animations.css hides it under 1180px,
   where there is no margin beside the content to put it in and
   the nav's own button is a thumb away.
   ============================================================ */

import { useEffect, useRef, useState } from 'react';
import { ticketProps } from '@/lib/links';

export function EdgeTab() {
  const ref = useRef<HTMLAnchorElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const target = document.getElementById('tickets');
    if (!target || !('IntersectionObserver' in window)) return;

    const io = new IntersectionObserver(
      ([entry]) => setHidden(entry.isIntersecting),
      // A sliver of the section counts: the tab should be gone before the
      // pass has finished arriving, not after.
      { threshold: 0.12 }
    );

    io.observe(target);
    return () => io.disconnect();
  }, []);

  return (
    <a
      className={`edgetab${hidden ? ' is-hidden' : ''}`}
      ref={ref}
      aria-hidden={hidden}
      tabIndex={hidden ? -1 : undefined}
      {...ticketProps()}
    >
      <span className="edgetab__dot" aria-hidden="true" />
      Registrations open
    </a>
  );
}
