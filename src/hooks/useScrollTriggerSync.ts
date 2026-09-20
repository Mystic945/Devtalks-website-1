/* ============================================================
   DEVTALKS — KEEPING SCROLLTRIGGER HONEST
   ------------------------------------------------------------
   ScrollTrigger caches where every trigger starts and ends. Those
   numbers are only as good as the page was when it measured, and
   on this page the height moves twice after the sections mount:

     • useFooterReveal gives <main> a bottom margin the size of
       the footer, which is several hundred pixels
     • the gallery's own track is 5400px tall and the photos
       inside it land late

   The static site did not have this problem: every script ran on
   one `devtalks:content` event, after the whole page existed. In
   React the gallery's effect runs while it mounts — before the
   footer has been measured and before the reveals exist — so
   without this hook every trigger below the gallery is computed
   against a document that is thousands of pixels too short, and
   simply never fires.

   Refreshing is cheap and idempotent, so it is done at each point
   where the page can have grown: once everything is wired, on
   load, when the fonts land, and when a late image resizes its
   own section.
   ============================================================ */

import { useEffect } from 'react';
import { ScrollTrigger } from '@/lib/gsap';

/** Coalesce bursts of refreshes into one — fonts landing and the last image
 *  decoding usually happen in the same handful of frames. */
const SETTLE_MS = 120;

export function useScrollTriggerSync(ready: boolean): void {
  useEffect(() => {
    if (!ready) return;

    let t: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => ScrollTrigger.refresh(), SETTLE_MS);
    };

    // The sections, the reveals and the footer margin are all in place by
    // now: this is the measurement that actually counts.
    refresh();

    window.addEventListener('load', refresh);
    document.fonts?.ready.then(refresh).catch(() => {});

    // Any image that had not decoded yet will change its section's height
    // as it lands.
    const pending = Array.from(document.images).filter((img) => !img.complete);
    pending.forEach((img) => {
      img.addEventListener('load', refresh, { once: true });
      img.addEventListener('error', refresh, { once: true });
    });

    return () => {
      if (t) clearTimeout(t);
      window.removeEventListener('load', refresh);
      pending.forEach((img) => {
        img.removeEventListener('load', refresh);
        img.removeEventListener('error', refresh);
      });
    };
  }, [ready]);
}
