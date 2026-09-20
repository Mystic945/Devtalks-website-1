/* ============================================================
   DEVTALKS — RUN OF SHOW
   ------------------------------------------------------------
   The day as a line you travel along rather than a list you
   scroll down: the section pins and the schedule moves sideways
   past you, one stop at a time.

   Built after the Professional Journey section on
   syahrilarfianalmazril.my.id — a rule across the middle of the
   screen, a node on it per entry, the time above the line and
   the title below it, and the supporting detail fading in when
   an entry is pointed at. The travel itself is in
   useHorizontalTimeline.

   Each card is a zero-height anchor on the rule, exactly as the
   reference builds it: everything inside is positioned off the
   line rather than stacked in flow, which is what keeps every
   node dead level however long the titles are.

   Under 900px the same markup lays itself out as the vertical
   timeline it always was — a pinned sideways scroll on a phone
   fights the gesture the visitor is already making. That is CSS
   only; the hook does not run at all.
   ============================================================ */

import { useRef } from 'react';
import { useHorizontalTimeline } from '@/hooks/useHorizontalTimeline';
import { SplitText } from '@/components/SplitText';
import { SCHEDULE, SITE } from '@/data/site';

export function Schedule() {
  const outerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLOListElement>(null);

  useHorizontalTimeline(outerRef, stageRef, trackRef);

  return (
    <section className="sec sec--schedule" id="schedule">
      {/* The outer box is only there to hold scroll. Its height is written
          by the hook, from the distance the track actually has to travel. */}
      <div className="hsched" ref={outerRef}>
        <div className="hsched__stage" ref={stageRef}>
          {/* The heading rides inside the pinned stage, as it does on the
              reference: it stays on screen for the whole journey instead of
              scrolling away and leaving a bare line behind. */}
          <div className="hsched__head">
            <div className="wrap">
              <div className="sec__head">
                <p className="eyebrow" data-reveal>
                  <em>03</em> Run of show
                </p>
                <SplitText className="big" text="Schedule" />
                <p className="sec__sub" data-reveal>
                  {SITE.timeLabel} &middot; {SITE.venueShort}
                </p>
              </div>
            </div>
          </div>

          <div className="hsched__rule" aria-hidden="true" />

          <ol className="hsched__track" ref={trackRef}>
            {SCHEDULE.map((row) => (
              <li
                className={`hstop${row.kind === 'break' ? ' is-break' : ''}`}
                key={`${row.time}-${row.title}`}
                tabIndex={0}
              >
                <span className="hstop__node" aria-hidden="true" />
                <time className="hstop__time">{row.time}</time>

                {/* Title and detail flow inside one absolutely-positioned
                    box, so a two-line title pushes its own detail down
                    without moving the node off the rule. */}
                <div className="hstop__body">
                  <h3 className="hstop__title">{row.title}</h3>
                  <p className="hstop__who">{row.who}</p>
                </div>
              </li>
            ))}
          </ol>

          {/* The rule runs off both edges of the screen rather than stopping
              at them, so the line reads as longer than the day. */}
          <div className="hsched__fade hsched__fade--l" aria-hidden="true" />
          <div className="hsched__fade hsched__fade--r" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
