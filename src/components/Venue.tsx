/* ============================================================
   DEVTALKS — GETTING THERE
   ------------------------------------------------------------
   Address, times and the two questions every attendee actually
   asks: how do I get there and where do I park.

   The map is a drawn placeholder rather than an embed. An iframe
   here would cost a third-party connection, a cookie banner and
   roughly a megabyte, for a picture of a campus everyone finds
   with the Maps link anyway.
   ============================================================ */

import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { SITE } from '@/data/site';

export function Venue() {
  return (
    <section className="sec sec--venue" id="venue">
      <div className="wrap">
        <div className="sec__head">
          <p className="eyebrow" data-reveal>
            <em>06</em> Getting there
          </p>
          <ScrollReveal
            as="h2"
            containerClassName="big"
            enableBlur={true}
            blurStrength={4}
            baseRotation={2}
            baseOpacity={0.1}
          >
            Venue
          </ScrollReveal>
        </div>

        <div className="venue">
          <div className="venue__info" data-flow>
            <h3>{SITE.venue}</h3>
            <p>{SITE.venueLine2}</p>

            <dl>
              <div>
                <dt>Date</dt>
                <dd>{SITE.dateLabel}</dd>
              </div>
              <div>
                <dt>Time</dt>
                <dd>{SITE.timeLabel}</dd>
              </div>
              <div>
                <dt>Nearest stations</dt>
                <dd>Akurdi &amp; Nigdi — 10 min by auto</dd>
              </div>
              <div>
                <dt>Parking</dt>
                <dd>Free, on campus, gate 2</dd>
              </div>
            </dl>

            <a
              className="btn btn--ghost"
              href={SITE.mapLink}
              target="_blank"
              rel="noopener"
              data-magnetic
            >
              Open in Maps
            </a>
          </div>

          <div className="venue__map" data-flow aria-hidden="true">
            <div className="venue__grid" />
            <div className="venue__pin">
              <i />
              <span>DevTalks</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
