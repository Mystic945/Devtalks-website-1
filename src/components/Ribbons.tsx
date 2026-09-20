/* ============================================================
   DEVTALKS — CROSSING RIBBONS
   ------------------------------------------------------------
   Two marquee bands crossing at a shallow angle, replacing the
   single flat strip. Reference: the `infinite-ribbon` section on
   syahrilarfianalmazril.my.id.

   Each band is the original `.marquee` markup, so the orange, the
   rules, the type and the dot separators all still come from the
   sheets the static build used — only the arrangement is new, and
   it lives in styles/animations.css.

   `data-dir` is what useParallax reads to run the two bands
   opposite ways. Both still answer scroll velocity together, so a
   flick of the wheel opens the scissors rather than sliding the
   whole thing sideways.

   Each strip is printed twice within its own band: the band slides
   by exactly half its width and wraps, so the seam never shows.
   The whole thing is decorative, which is also what makes printing
   every phrase twice harmless.
   ============================================================ */

import { MARQUEE } from '@/data/site';

interface BandProps {
  variant: 'a' | 'b';
  dir: 'left' | 'right';
  phrases: readonly string[];
}

function Band({ variant, dir, phrases }: BandProps) {
  return (
    <div className={`marquee marquee--${variant}`}>
      <div className="marquee__track" data-dir={dir}>
        {[0, 1].map((copy) =>
          phrases.map((text, i) => <span key={`${copy}-${i}`}>{text}</span>)
        )}
      </div>
    </div>
  );
}

export function Ribbons() {
  /* The lower band reads the strip the other way round. Two bands running
     the same words in opposite directions line up into an X of identical
     text wherever they cross, which looks like a mistake. */
  const reversed = [...MARQUEE].reverse();

  return (
    <div className="ribbons" aria-hidden="true">
      <Band variant="b" dir="right" phrases={reversed} />
      <Band variant="a" dir="left" phrases={MARQUEE} />
    </div>
  );
}
