/* ============================================================
   DEVTALKS — THE ARMY BAND
   ------------------------------------------------------------
   The seam between the venue and the footer: a band of the strip's
   gold run edge to edge across the page, with Kurukshetra on it.

   It is not the strip laid flat — that carries the four words, and
   its army is small and marches under them. This band carries only
   the war:

     • TWO HOSTS. The left half is an army marching right; the right
       half is the same painting mirrored, so a second army marches
       left. They advance on each other for ever.
     • THE BOSS. Where they would meet, a round shield of the same
       gold sits over the band, taller than the band itself — the
       buckle on the belt that joins the two halves of the page.
       The chakra is cut into it, and it turns, slowly.
     • Volleys of arrows overhead, flying the way each host marches.

   The figures, the metal and the border are the strip's own
   (lib/kurukshetraBand), so the two are plainly one object's kin;
   the composition is this band's.

   HOW IT MOVES
   Each half is two copies of one image in a row, slid by one
   copy's width for ever. The hosts walk in under the boss and are
   never seen to arrive, which is what lets a loop that never ends
   look like an advance. Only transforms move, so nothing is
   repainted while it runs.

   WHAT IT COSTS, AND WHEN
   Nothing until it is needed. It is not painted until the footer
   is within a screen or so of the viewport, and it runs only while
   it is on screen. Under reduced motion it is painted and stands
   still.

   (Three other designs were tried for this seam and set aside: the
   Chakravyuha drawn behind the footer, a sunrise behind the host's
   silhouettes, and a chariot riding between the hosts.)
   ============================================================ */

import { useEffect, useRef, useState } from 'react';
import { paintBoss, paintFrieze } from '@/lib/kurukshetraBand';

interface Art {
  frieze: string;
  boss: string;
}

const toUrl = (canvas: HTMLCanvasElement): Promise<string | null> =>
  new Promise((resolve) => {
    // a browser that cannot write WebP hands back a PNG instead
    canvas.toBlob((blob) => resolve(blob ? URL.createObjectURL(blob) : null), 'image/webp', 0.92);
  });

/** One host: two copies of the image, in a row that can be slid. */
function Half({ side, src }: { side: 'l' | 'r'; src: string | undefined }) {
  return (
    <div className={`army__half army__half--${side}`}>
      <div className="army__row">
        {src && (
          <>
            <img src={src} alt="" draggable={false} decoding="async" />
            <img src={src} alt="" draggable={false} decoding="async" />
          </>
        )}
      </div>
    </div>
  );
}

export function ArmyBand() {
  const ref = useRef<HTMLDivElement>(null);
  const [art, setArt] = useState<Art | null>(null);
  const [onScreen, setOnScreen] = useState(false);

  /* Paint it once, when the footer is getting close. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let cancelled = false;
    const made: string[] = [];

    const paint = async () => {
      const [frieze, boss] = await Promise.all([toUrl(paintFrieze()), toUrl(paintBoss())]);
      if (frieze) made.push(frieze);
      if (boss) made.push(boss);
      if (cancelled || !frieze || !boss) {
        made.forEach((u) => URL.revokeObjectURL(u));
        return;
      }
      setArt({ frieze, boss });
    };

    const near = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        near.disconnect();
        paint();
      },
      { rootMargin: '900px 0px' }
    );
    near.observe(el);

    return () => {
      cancelled = true;
      near.disconnect();
      made.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  /* Move only while it can be seen. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const seen = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    seen.observe(el);
    return () => seen.disconnect();
  }, []);

  return (
    <div className={`army${art && onScreen ? ' is-marching' : ''}`} ref={ref} aria-hidden="true">
      <Half side="l" src={art?.frieze} />
      <Half side="r" src={art?.frieze} />
      <div className="army__boss">{art && <img src={art.boss} alt="" draggable={false} />}</div>
    </div>
  );
}
