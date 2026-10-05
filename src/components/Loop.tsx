/* ============================================================
   DEVTALKS — THE LOOP
   ------------------------------------------------------------
   Straight after the landing page, where the bento grid used to
   be. A Möbius strip carrying the landing's own four words —
   ideas, code, people, impact — that the scroll rides once round.
   The scene and the choreography are in useMobius.

   Every line of copy carries data-warp: once the stage is live it is
   drawn through WarpText's glass (lib/warpLayer) and the text in the
   page goes transparent underneath it, still there to be read.

   The markup is written to stand on its own. Until the first
   WebGL frame has rendered this is an ordinary section with four
   short paragraphs in it; that is also what reduced motion and a
   browser without WebGL get. The hook adds `is-live`, and only
   then does it become a tall pinned stage.
   ============================================================ */

import { useRef } from 'react';
import { useMobius } from '@/hooks/useMobius';
import { LOOP } from '@/data/site';
import { pad2 } from '@/lib/dom';

export function Loop() {
  const outerRef = useRef<HTMLElement>(null);
  useMobius(outerRef, LOOP.length);

  return (
    <section className="loop" id="loop" ref={outerRef} aria-label="The loop">
      <div className="loop__stage">
        <canvas className="loop__canvas" aria-hidden="true" />

        <div className="loop__intro">
          <p className="loop__line" data-warp>
            Scroll the loop
          </p>
          <span className="loop__cue" aria-hidden="true" />
        </div>

        <div className="loop__cards">
          {LOOP.map((stop, i) => (
            <article
              className="loop__card"
              data-word={stop.word}
              data-side={i % 2 ? 'r' : 'l'}
              key={stop.word}
            >
              <h2 className="loop__title" data-warp>
                {stop.title}
              </h2>
              <p className="loop__body" data-warp>
                {stop.body}
              </p>
            </article>
          ))}
        </div>

        {/* Where you are on the strip. The order is the argument, so the
            stops are numbered. */}
        <div className="loop__rail" aria-hidden="true">
          <i className="loop__track" />
          <ol>
            {LOOP.map((stop, i) => (
              <li key={stop.word}>
                <b>{pad2(i + 1)}</b>
                <span>{stop.word}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Lands above the finished loop once the camera has pulled back.
            One sentence, so one heading; two lines, so two spans. */}
        <div className="loop__finale">
          <h2 className="loop__twist">
            <span data-warp>We don&rsquo;t just bend the rules.</span>{' '}
            <span className="loop__twist-b" data-warp>
              We twist them.
            </span>
          </h2>
        </div>

        <div className="loop__outro">
          <p className="loop__last" data-warp>
            One side. One edge. One room.
          </p>
          <p className="loop__note" data-warp>
            That&rsquo;s a Möbius strip. It&rsquo;s also how this works.
          </p>
        </div>
      </div>
    </section>
  );
}
