/* ============================================================
   DEVTALKS — THE REEL
   ------------------------------------------------------------
   A strip of vertical 9:16 cards running continuously across the
   page. Clicking one opens it large.

   THE LOOP
   The track holds the cards twice and slides exactly -50%, so the
   second copy is under the cursor at the moment the first
   finishes and the seam never shows. It is one CSS keyframe on
   one element: the compositor owns it and the main thread never
   sees a frame of it.

   Only the FIRST copy is real. The duplicate is aria-hidden with
   its buttons taken out of the tab order — focusable content
   inside aria-hidden is the usual way a marquee breaks a screen
   reader, and duplicated cards would otherwise be announced and
   tabbed through twice.

   Pausing for a press, and gating the videos, are in
   useReelStrip.
   ============================================================ */

import { useMemo, useRef, useState } from 'react';
import { useReelStrip } from '@/hooks/useReelStrip';
import { SplitText } from '@/components/SplitText';
import { ReelMedia } from '@/components/ReelMedia';
import { ReelViewer } from '@/components/ReelViewer';
import { pad2 } from '@/lib/dom';
import { REELS, type Reel as ReelItem } from '@/data/site';

const CONFIG = {
  secondsPerCard: 5.5, // how long one card takes to cross the strip
  minCards: 6 // pad the track out if REELS is shorter than this
} as const;

const EMPTY: ReelItem = { src: '', poster: '', label: '' };

export function Reel() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  const [open, setOpen] = useState<number | null>(null);

  const items = useMemo(() => {
    const list = REELS.slice();
    while (list.length < CONFIG.minCards) list.push(EMPTY);
    return list;
  }, []);

  useReelStrip(sectionRef, trackRef);

  const empty = items.every((r) => !r.src && !r.poster);
  const duration = `${(items.length * CONFIG.secondsPerCard).toFixed(1)}s`;

  const card = (item: ReelItem, i: number, ghost: boolean) => (
    <button
      type="button"
      className="reel__card"
      key={`${ghost ? 'ghost' : 'real'}-${i}`}
      tabIndex={ghost ? -1 : undefined}
      aria-hidden={ghost || undefined}
      aria-label={item.label || `Reel ${pad2(i + 1)}`}
      onClick={(e) => {
        // Remember the card itself — on a touch tap the button may never
        // have taken focus, so activeElement would send us back to <body>.
        opener.current = e.currentTarget;
        setOpen(i);
      }}
    >
      <span className="reel__frame">
        <ReelMedia item={item} n={i + 1} />
      </span>
      {item.label && <span className="reel__cap">{item.label}</span>}
    </button>
  );

  return (
    <>
      <section
        className={`sec sec--reel${empty ? ' is-empty' : ''}`}
        id="reel"
        ref={sectionRef}
      >
        <div className="wrap">
          <div className="sec__head">
            <p className="eyebrow" data-reveal>
              <em>07</em> On the floor
            </p>
            <SplitText className="big" text="The reel" />
            <p className="sec__sub" data-reveal>
              Moments from the day, as they happen.
            </p>
          </div>
        </div>

        <div className="reel" data-reveal>
          <div
            className="reel__track"
            ref={trackRef}
            style={{ '--reel-time': duration } as React.CSSProperties}
          >
            {items.map((it, i) => card(it, i, false))}
            {items.map((it, i) => card(it, i, true))}
          </div>
        </div>
      </section>

      <ReelViewer
        items={items}
        index={open}
        opener={opener}
        onClose={() => setOpen(null)}
        onStep={(d) => setOpen((i) => (i === null ? i : (i + d + items.length) % items.length))}
      />
    </>
  );
}
