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

import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { TextType } from '@/components/ui/TextType';
import { SCHEDULE, SITE } from '@/data/site';

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
            enableBlur={true}
            blurStrength={4}
            baseRotation={2}
            baseOpacity={0.1}
          >
            Schedule
          </ScrollReveal>
          <TextType
            as="p"
            className="sec__sub"
            text={`${SITE.timeLabel} · ${SITE.venueShort}`}
            startOnVisible={true}
            loop={true}
            pauseDuration={2500}
            typingSpeed={25}
            deletingSpeed={15}
            showCursor={true}
            cursorCharacter="▍"
          />
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
