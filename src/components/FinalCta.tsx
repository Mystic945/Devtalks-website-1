/* ============================================================
   DEVTALKS — THE LAST ASK
   ------------------------------------------------------------
   One line, one heading, one button, and then the footer is
   uncovered beneath it.
   ============================================================ */

import { SplitText } from '@/components/SplitText';
import { ticketProps } from '@/lib/links';

export function FinalCta() {
  return (
    <section className="final">
      <div className="wrap">
        <p className="final__k" data-reveal>
          Seats are capped at 600
        </p>
        <SplitText className="final__h" text="Come build with us." />
        <a className="btn btn--lg" data-magnetic {...ticketProps()}>
          Get your pass
        </a>
      </div>
    </section>
  );
}
