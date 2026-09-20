/* ============================================================
   DEVTALKS — FAQ
   ------------------------------------------------------------
   One open at a time. The panel animates on height because the
   answers are different lengths and a fixed max-height would
   either clip the long ones or make the short ones sluggish.

   Once open, the height is set back to `auto`. A panel parked at
   a pixel height would clip the moment the text reflowed — which
   it does on every resize, and again when the web font lands.

   The closed state is the CSS default (height 0, overflow
   hidden), so nothing here has to run for the page to be correct.
   ============================================================ */

import { useEffect, useRef, useState } from 'react';
import { gsap } from '@/lib/gsap';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { prefersReducedMotion } from '@/lib/dom';
import { FAQS, type Faq as FaqEntry } from '@/data/site';

interface ItemProps {
  entry: FaqEntry;
  open: boolean;
  onToggle: () => void;
}

function FaqItem({ entry, open, onToggle }: ItemProps) {
  const panel = useRef<HTMLDivElement>(null);
  const firstRun = useRef(true);

  useEffect(() => {
    const a = panel.current;
    if (!a) return;

    // Mounted closed: CSS already has it right, so do not animate into it.
    if (firstRun.current) {
      firstRun.current = false;
      if (!open) return;
    }

    if (prefersReducedMotion()) {
      a.style.height = open ? 'auto' : '0px';
      return;
    }

    const tween = gsap.to(a, {
      height: open ? a.scrollHeight : 0,
      duration: open ? 0.5 : 0.4,
      ease: open ? 'power3.inOut' : 'power2.inOut',
      onComplete: () => {
        if (open) a.style.height = 'auto';
      }
    });

    return () => {
      tween.kill();
    };
  }, [open]);

  return (
    <div className={`faq__item${open ? ' is-open' : ''}`} data-reveal>
      <button className="faq__q" aria-expanded={open} onClick={onToggle}>
        {entry.q}
        <i aria-hidden="true" />
      </button>
      <div className="faq__a" ref={panel}>
        <p>{entry.a}</p>
      </div>
    </div>
  );
}

export function Faq() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="sec sec--faq" id="faq">
      <div className="wrap">
        <div className="sec__head">
          <p className="eyebrow" data-reveal>
            <em>09</em> Before you ask
          </p>
          <ScrollReveal
            as="h2"
            containerClassName="big"
            enableBlur={true}
            blurStrength={4}
            baseRotation={2}
            baseOpacity={0.1}
          >
            FAQ
          </ScrollReveal>
        </div>

        <div className="faq">
          {FAQS.map((f, i) => (
            <FaqItem
              key={f.q}
              entry={f}
              open={open === i}
              onToggle={() => setOpen(open === i ? null : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
