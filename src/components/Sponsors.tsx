/* ============================================================
   DEVTALKS — PARTNERS
   ------------------------------------------------------------
   One row per tier. The first row is the title sponsor and is
   drawn larger; every row after it shares one treatment.

   A partner with no logo file yet prints its name instead, so the
   wall is never a row of empty boxes while the artwork is being
   chased.
   ============================================================ */

import { SplitText } from '@/components/SplitText';
import { SPONSORS } from '@/data/site';

export function Sponsors() {
  return (
    <section className="sec sec--sponsors" id="sponsors">
      <div className="wrap">
        <div className="sec__head">
          <p className="eyebrow" data-reveal>
            <em>05</em> Backed by
          </p>
          <SplitText className="big" text="Partners" />
          <p className="sec__sub" data-reveal>
            DevTalks runs on sponsor support — it&rsquo;s what keeps the day free to attend.
          </p>
        </div>

        <div className="sponsors">
          {SPONSORS.map((row, i) => (
            <div
              className={`tierRow${i === 0 ? ' tierRow--title' : ''}`}
              key={row.tier}
              data-flow
            >
              <h3>{row.tier}</h3>
              <div className="logos">
                {row.items.map((it) => {
                  const inner = it.logo ? (
                    <img src={it.logo} alt={it.name} loading="lazy" />
                  ) : (
                    it.name
                  );

                  return it.url ? (
                    <a className="logo" key={it.name} href={it.url} target="_blank" rel="noopener">
                      {inner}
                    </a>
                  ) : (
                    <div className="logo" key={it.name}>
                      {inner}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
