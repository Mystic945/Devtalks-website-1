/* ============================================================
   DEVTALKS — RUN OF SHOW
   ------------------------------------------------------------
   A vertical timeline. Break rows carry `is-break`, which is what
   styles/paper-hover-timeline.css uses to draw them differently
   from a talk.

   HOW A ROW ARRIVES
   Modelled on the reference site's Professional Journey, where an
   entry is a title, a time and an organisation:

     the title     resolves word by word out of a blur as the row
                   climbs to reading height (ScrollReveal)
     the detail    types itself in, but only once the title above
                   it has fully resolved (TextType, gated on the
                   reveal's onReveal)
     the time      is simply there — it is a label, and a label
                   that animates is a label you cannot scan

   The rows no longer carry data-reveal. They used to fade in as a
   block, and a block fade underneath a per-word fade is the same
   text fading twice.

   COST
   Each row is exactly ONE ScrollTrigger: the titles pass
   baseRotation={0}, which skips the rotation tween entirely, and
   ScrollReveal merges opacity and blur into a single tween. The
   typed lines start on visibility and stop for good when they
   finish, so nothing is left running behind the fold.
   ============================================================ */

import { useCallback, useState } from 'react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { TextType } from '@/components/ui/TextType';
import { SCHEDULE, SITE, type SchedRow } from '@/data/site';

function ScheduleRow({ row }: { row: SchedRow }) {
  const [revealed, setRevealed] = useState(false);
  const onReveal = useCallback(() => setRevealed(true), []);

  return (
    <li className={row.kind === 'break' ? 'is-break' : ''}>
      <time>{row.time}</time>

      <ScrollReveal
        as="h3"
        /* No tilt on a timeline row: the spine beside it is dead straight,
           and a heading that leans off it reads as a rendering fault. */
        baseRotation={0}
        baseOpacity={0.12}
        blurStrength={3}
        /* Resolved by the time the row reaches reading height, rather than
           while it is still at the bottom edge of the screen. */
        wordAnimationEnd="top center"
        onReveal={onReveal}
      >
        {row.title}
      </ScrollReveal>

      <TextType
        as="p"
        text={row.who}
        start={revealed}
        startOnVisible
        loop={false}
        typingSpeed={18}
        initialDelay={90}
        cursorCharacter="▍"
        hideCursorWhenDone
      />
    </li>
  );
}

export function Schedule() {
  return (
    <section className="sec sec--schedule" id="schedule">
      <div className="wrap">
        <div className="sec__head">
          <p className="eyebrow" data-reveal>
            <em>03</em> Run of show
          </p>

          <ScrollReveal
            as="h2"
            containerClassName="big"
            enableBlur
            blurStrength={4}
            baseRotation={2}
            baseOpacity={0.1}
          >
            Schedule
          </ScrollReveal>

          {/* Types once and settles. It used to loop, which left a caret
              blinking beside fourteen rows that are also typing. */}
          <TextType
            as="p"
            className="sec__sub"
            text={`${SITE.timeLabel} · ${SITE.venueShort}`}
            startOnVisible
            loop={false}
            typingSpeed={22}
            cursorCharacter="▍"
            hideCursorWhenDone
          />
        </div>

        <ol className="sched">
          {SCHEDULE.map((r) => (
            <ScheduleRow key={`${r.time}-${r.title}`} row={r} />
          ))}
        </ol>
      </div>
    </section>
  );
}
