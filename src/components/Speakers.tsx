/* ============================================================
   DEVTALKS — THE LINE-UP
   ------------------------------------------------------------
   Three cards, one stage. Hovering brings a card forward; opening
   one gives the full bio.

   TWO TRANSFORMS, TWO ELEMENTS
   Each card is wrapped in a `.spk-flow` div. useScrollFlow writes
   its registration transform to the wrapper; useTilt writes the
   tilt to the card inside it. A transform is a single property —
   whoever writes last wins — so they get one element each. There
   was briefly a third wrapper for a hover magnify; three nested
   transforms made the card jitter under the cursor and the
   magnify was dropped rather than fought with.

   The tilt is also why the cards carry neither data-reveal nor
   data-tilt: the wrapper owns the arrival, the card owns the
   pointer, and nothing else may write to either.
   ============================================================ */

import { useRef, useState, type CSSProperties } from 'react';
import { useTilt } from '@/hooks/useTilt';
import { useCardStack } from '@/hooks/useCardStack';
import { SplitText } from '@/components/SplitText';
import { SpeakerModal } from '@/components/SpeakerModal';
import { topicIconFor } from '@/lib/icons';
import { initials, pad2 } from '@/lib/dom';
import { SPEAKERS, type Speaker } from '@/data/site';

/* How the three cards are arranged.
 *
 *   'stack'  a deck: each card sticks under the nav and the next comes to
 *            rest on top of it. More presence per speaker, and the talk
 *            line is always readable.
 *   'grid'   the original row of three, with the hover-reveal that dims
 *            and softens the cards you are not pointing at.
 *
 * Both are fully styled; this is the only line that chooses between them.
 * The deck falls back to the grid on its own below 860px or on a short
 * screen — see styles/animations.css. */
const LAYOUT: 'stack' | 'grid' = 'stack';

interface CardProps {
  speaker: Speaker;
  index: number;
  stacked: boolean;
  onOpen: (index: number, el: HTMLElement) => void;
}

function SpeakerCard({ speaker, index, stacked, onOpen }: CardProps) {
  const ref = useRef<HTMLButtonElement>(null);
  useTilt(ref);

  const card = (
    <div className="spk-flow" data-flow={stacked ? undefined : ''}>
      <button
        className="spk"
        ref={ref}
        onClick={() => ref.current && onOpen(index, ref.current)}
      >
        <div className="spk__img">
          <span className="spk__no">{pad2(index + 1)}</span>
          {speaker.photo ? (
            <img src={speaker.photo} alt={speaker.name} loading="lazy" />
          ) : (
            <div className="spk__ini">{initials(speaker.name)}</div>
          )}
        </div>

        <div className="spk__body">
          <h3 className="spk__name">{speaker.name}</h3>
          <p className="spk__role">
            {speaker.role}
            {speaker.org ? ` · ${speaker.org}` : ''}
          </p>
          <p className="spk__talk">{speaker.talk}</p>
        </div>

        <span className="spk__more" aria-hidden="true">
          &rarr;
        </span>

        <span className="spk__topic" aria-hidden="true">
          {topicIconFor(speaker, index)}
        </span>
      </button>
    </div>
  );

  if (!stacked) return card;

  /* Two extra elements, and they earn their keep: the outer one is sticky
     and the inner one is the only thing useCardStack writes a transform to.
     `.spk-flow` below them keeps the CSS hover lift it has always had.
     See the note at the top of styles/animations.css. */
  return (
    <div className="spk-stack" style={{ '--i': index } as CSSProperties}>
      <div className="spk-stack__in">{card}</div>
    </div>
  );
}

export function Speakers() {
  const [open, setOpen] = useState<number | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const deckRef = useRef<HTMLDivElement>(null);

  const stacked = LAYOUT === 'stack';
  useCardStack(deckRef, stacked);

  return (
    <>
      <section className="sec sec--speakers" id="speakers">
        <div className="wrap">
          <div className="sec__head">
            <p className="eyebrow" data-reveal>
              <em>02</em> The line-up
            </p>
            <SplitText className="big" text="Speakers" />
            <p className="sec__sub" data-reveal>
              {stacked
                ? 'Three speakers, one stage. Keep scrolling — they come up one at a time. Tap a card for the full bio.'
                : 'Three speakers, one stage. Hover a card to bring it forward, then tap it for the full bio.'}
            </p>
            {/* Touch has no hover, so the affordance is stated, not discovered. */}
            <p className="speakers__hint">Drag a card sideways to tilt it</p>
          </div>

          <div className={`speakers${stacked ? ' speakers--stack' : ''}`} ref={deckRef}>
            {SPEAKERS.map((s, i) => (
              <SpeakerCard
                key={s.name}
                speaker={s}
                index={i}
                stacked={stacked}
                onOpen={(index, el) => {
                  opener.current = el;
                  setOpen(index);
                }}
              />
            ))}
          </div>
        </div>
      </section>

      <SpeakerModal
        speaker={open === null ? null : SPEAKERS[open]}
        onClose={() => setOpen(null)}
        opener={opener}
      />
    </>
  );
}
