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

   It also stays off the landing page: that screen speaks only as
   Kurukshetra, in black and gold, and its one button goes to the
   main site. The tab comes in once the landing has scrolled away.

   Desktop only — styles/animations.css hides it under 1180px,
   where there is no margin beside the content to put it in and
   the nav's own button is a thumb away.
   ============================================================ */

import { useEffect, useRef, useState } from 'react';
import { ticketProps } from '@/lib/links';

export function EdgeTab() {
  const ref = useRef<HTMLAnchorElement>(null);
  // The landing is the first thing on screen, so it starts out of the way.
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const targets = [document.getElementById('tickets'), document.querySelector('.landing-page')].filter(
      (el): el is HTMLElement => el instanceof HTMLElement
    );
    if (!targets.length) return;

    const onScreen = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) onScreen.add(entry.target);
          else onScreen.delete(entry.target);
        }
        setHidden(onScreen.size > 0);
      },
      // A sliver of the section counts: the tab should be gone before the
      // pass has finished arriving, not after.
      { threshold: [0, 0.12] }
    );

    targets.forEach((t) => io.observe(t));
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
