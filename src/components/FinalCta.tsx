/* ============================================================
   DEVTALKS — THE LAST ASK
   ------------------------------------------------------------
   One line, one heading, one button, and then the footer is
   uncovered beneath it.
   ============================================================ */

import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { TextType } from '@/components/ui/TextType';
import { ticketProps } from '@/lib/links';

export function FinalCta() {
  return (
    <section className="final">
      <div className="wrap">
        <TextType
          as="p"
          className="final__k"
          text="Seats are capped at 600"
          startOnVisible={true}
          loop={true}
          pauseDuration={2500}
          typingSpeed={25}
          deletingSpeed={15}
          showCursor={true}
          cursorCharacter="▍"
        />
        <ScrollReveal
          as="h2"
          containerClassName="final__h"
          enableBlur={true}
          blurStrength={5}
          baseRotation={1.5}
          baseOpacity={0.08}
        >
          Come build with us.
        </ScrollReveal>
        <a className="btn btn--lg" data-magnetic {...ticketProps()}>
          Get your pass
        </a>
      </div>
    </section>
  );
}
