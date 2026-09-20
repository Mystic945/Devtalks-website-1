/* ============================================================
   DEVTALKS — WHAT IS DEVTALKS
   ------------------------------------------------------------
   The premise, what the day gives you, and the four numbers that
   describe the event.

   The statistics carry data-count and data-suffix rather than
   their finished text: useScrollAnimations counts them up when
   they reach the fold, and writes the suffix back on every frame
   so "600+" never briefly reads "600".
   ============================================================ */

import { SplitText } from '@/components/SplitText';
import { pad2 } from '@/lib/dom';
import { OFFERS, SITE, STATS } from '@/data/site';

const HEADLINE =
  'Three people who built something real, explaining exactly how — in twenty-five minutes each.';

export function About() {
  return (
    <section className="sec sec--about" id="about">
      <div className="wrap">
        <p className="eyebrow" data-reveal>
          <em>01</em> What is DevTalks
        </p>

        <SplitText className="big" id="aboutHeadline" text={HEADLINE} />

        <div className="about__grid">
          <p className="about__copy" data-reveal>
            {SITE.intro}
          </p>

          <div className="about__notes" data-reveal>
            <h3 className="offers__h">What the day gives you</h3>
            <div className="offers">
              {OFFERS.map((o, i) => (
                <div className="offer" key={o.title}>
                  <b className="offer__n">{pad2(i + 1)}</b>
                  <div>
                    <b className="offer__t">{o.title}</b>
                    <span className="offer__b">{o.body}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* data-flow, not data-reveal: the numbers arrive in register with
            the page rather than fading in once. See useScrollFlow. */}
        <div className="stats" data-flow>
          {STATS.map((s) => (
            <div className="stat" key={s.label}>
              <b data-count={s.value} data-suffix={s.suffix}>
                0
              </b>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
