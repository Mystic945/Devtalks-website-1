/* ============================================================
   DEVTALKS — PARTNERS
   ------------------------------------------------------------
   One row per tier. The first row is the title sponsor and is
   drawn larger; every row after it shares one treatment.

   A partner with no logo file yet prints its name instead, so the
   wall is never a row of empty boxes while the artwork is being
   chased.
   ============================================================ */

import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { TextType } from '@/components/ui/TextType';
import { SPONSORS } from '@/data/site';

export function Sponsors() {
  return (
    <section className="sec sec--sponsors" id="sponsors">
      <div className="wrap">
        <div className="sec__head">
          <p className="eyebrow" data-reveal>
            <em>05</em> Backed by
          </p>
          <ScrollReveal
            as="h2"
            containerClassName="big"
            enableBlur={true}
            blurStrength={4}
            baseRotation={2}
            baseOpacity={0.1}
          >
            Partners
          </ScrollReveal>
          <TextType
            as="p"
            className="sec__sub"
            text="DevTalks runs on sponsor support — it’s what keeps the day free to attend."
            startOnVisible={true}
            loop={true}
            pauseDuration={2500}
            typingSpeed={20}
            deletingSpeed={12}
            showCursor={true}
            cursorCharacter="▍"
          />
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
