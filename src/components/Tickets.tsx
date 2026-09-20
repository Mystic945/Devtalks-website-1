/* ============================================================
   DEVTALKS — THE PASS
   ------------------------------------------------------------
   The tickets section as a single admission stub: a tear-off stub
   on the left, a perforated edge with two punched notches, the
   pass on the right, and the when / time / where strip along the
   bottom.

   DevTalks is free, so there is one pass, not three tiers. The
   date, time and venue printed on it are the same SITE strings
   the hero and the venue section read, so the ticket can never
   disagree with the rest of the page about when or where.
   ============================================================ */

import { useRef } from 'react';
import { useScrollScale } from '@/hooks/useScrollScale';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { TextType } from '@/components/ui/TextType';
import { TagIcon } from '@/lib/icons';
import { linkProps } from '@/lib/links';
import { PASS, SITE } from '@/data/site';

export function Tickets() {
  const passRef = useRef<HTMLDivElement>(null);
  useScrollScale(passRef);

  const href = PASS.url || SITE.registerUrl || '#tickets';
  const cta = linkProps(href);
  const title = `${SITE.eventName} ${SITE.edition}`;

  return (
    <section className="sec sec--tickets" id="tickets">
      <div className="wrap">
        <div className="sec__head">
          <p className="eyebrow" data-reveal>
            <em>04</em> Registration
          </p>
          <ScrollReveal
            as="h2"
            containerClassName="big"
            enableBlur={true}
            blurStrength={4}
            baseRotation={2}
            baseOpacity={0.1}
          >
            Tickets
          </ScrollReveal>
          <TextType
            as="p"
            className="sec__sub"
            text="Free to attend. One pass, full day, lunch included. Seats are capped by the hall."
            startOnVisible={true}
            loop={true}
            pauseDuration={2500}
            typingSpeed={20}
            deletingSpeed={12}
            showCursor={true}
            cursorCharacter="▍"
          />
        </div>

        {/* Two elements, two owners: the reveal tween animates opacity and y
            on `.pass`, useScrollScale animates scale on `.pass__grow`. One
            element carrying both would be two tweens writing one transform. */}
        <div className="pass" data-reveal>
          <div className="pass__grow" ref={passRef}>
            <article className="ticket" aria-label={`${title} — ${PASS.kind}`}>
              {/* ---- the stub ---- */}
              <div className="ticket__stub" aria-hidden="true">
                <span className="stub__pass">
                  <small>{PASS.tag}</small>
                  <b>{PASS.kind}</b>
                </span>
                <span className="stub__price">{PASS.price}</span>
              </div>

              {/* ---- the pass ---- */}
              <div className="ticket__body">
                <div className="ticket__cell ticket__cell--price">
                  <p className="ticket__label">Ticket price</p>
                  <p className="ticket__price">{PASS.price}</p>
                  <p className="ticket__note">{PASS.priceNote}</p>
                  <p className="ticket__chip">
                    <TagIcon />
                    <span>{PASS.chip}</span>
                  </p>
                </div>

                <div className="ticket__cell ticket__cell--cta">
                  <p className="ticket__label">{title}</p>
                  <h3 className="ticket__title">{SITE.theme}</h3>
                  <a className="btn ticket__btn" data-magnetic {...cta}>
                    {PASS.cta}
                  </a>
                  <p className="ticket__fine">*{PASS.fine}</p>
                </div>

                <dl className="ticket__meta">
                  <div>
                    <dt>Date</dt>
                    <dd>{SITE.dateLabel}</dd>
                  </div>
                  <div>
                    <dt>Time</dt>
                    <dd>{SITE.timeLabel}</dd>
                  </div>
                  <div>
                    <dt>Venue</dt>
                    <dd>{SITE.venueShort}</dd>
                  </div>
                </dl>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
