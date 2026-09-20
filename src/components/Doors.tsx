/* ============================================================
   DEVTALKS — AUDITORIUM DOORS
   ------------------------------------------------------------
   Two closed panels carrying the wordmark, over a lit seam. The
   animation lives in useIntro; this is only the scenery.

   A repeat visit in the same session never sees them: the class
   that clears them is decided during the first render, before
   anything reaches the screen, rather than applied by an effect
   afterwards — an effect would mean one painted frame of a closed
   door on every page load after the first.
   ============================================================ */

import { forwardRef, useState } from 'react';
import { doorsSeen } from '@/hooks/useIntro';

const Wordmark = () => (
  <div className="door__mark">
    <span className="door__word">
      DEV<span>TALKS</span>
    </span>
  </div>
);

export const Doors = forwardRef<HTMLDivElement>((_props, ref) => {
  // Read once, at mount. useIntro writes the flag as it finishes, and this
  // must not pick that up and vanish mid-animation.
  const [seen] = useState(doorsSeen);

  return (
    <div
      className={`doors${seen ? ' is-gone' : ''}`}
      id="doors"
      ref={ref}
      aria-hidden="true"
    >
      <div className="door door--l">
        <Wordmark />
      </div>
      <div className="door door--r">
        <Wordmark />
      </div>
      <div className="doors__glow" />
      <div className="doors__seam" />
    </div>
  );
});

Doors.displayName = 'Doors';
