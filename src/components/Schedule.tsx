/* ============================================================
   DEVTALKS — RUN OF SHOW
   ------------------------------------------------------------
   A vertical timeline. Break rows carry `is-break`, which is what
   styles/paper-hover-timeline.css uses to draw them differently
   from a talk.

   The rows keep data-reveal rather than data-flow on purpose: a
   long list reads better arriving as a list than as fourteen
   separately registering blocks.
   ============================================================ */

import { SplitText } from '@/components/SplitText';
import { SCHEDULE, SITE } from '@/data/site';

export function Schedule() {
  return (
    <section className="sec sec--schedule" id="schedule">
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

        <ol className="sched">
          {SCHEDULE.map((r) => (
            <li
              key={`${r.time}-${r.title}`}
              className={r.kind === 'break' ? 'is-break' : ''}
              data-reveal
            >
              <time>{r.time}</time>
              <h3>{r.title}</h3>
              <p>{r.who}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
