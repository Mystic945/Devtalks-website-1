/* ============================================================
   DEVTALKS — ONE REEL FRAME
   ------------------------------------------------------------
   EMPTY BY DESIGN
   REELS ships with six blank entries so the strip animates
   correctly before any footage exists. A blank entry renders as a
   numbered slot with a play mark. Fill in `src` (and optionally
   `poster`) and the same slot becomes a playing clip — no markup
   or CSS changes needed.

   Clips are muted, looping and inline, which is the only
   combination browsers will autoplay. `preload="none"` keeps six
   of them from being fetched before anyone has scrolled to them;
   useReelStrip decides when they may actually play.
   ============================================================ */

import { PlayMark } from '@/lib/icons';
import { pad2 } from '@/lib/dom';
import type { Reel } from '@/data/site';

interface Props {
  item: Reel;
  /** 1-based position, printed on an empty slot. */
  n: number;
  /** The viewer's copy gets controls; the strip's does not. */
  big?: boolean;
}

export function ReelMedia({ item, n, big = false }: Props) {
  if (item.src) {
    return (
      <video
        className="reel__v"
        muted
        loop
        playsInline
        preload="none"
        controls={big}
        poster={item.poster || undefined}
      >
        <source src={item.src} type="video/mp4" />
      </video>
    );
  }

  if (item.poster) {
    return <img className="reel__v" src={item.poster} alt={item.label} loading="lazy" />;
  }

  return (
    <span className="reel__slot">
      <span className="reel__play">
        <PlayMark />
      </span>
      <span className="reel__n">{pad2(n)}</span>
    </span>
  );
}
