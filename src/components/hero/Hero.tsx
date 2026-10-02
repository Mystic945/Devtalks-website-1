/* ============================================================
   DEVTALKS — THE HERO
   ------------------------------------------------------------
   Six tiles on a level grid. The cursor is the stage spotlight
   (useSpotlight); on a phone the tilt of the handset moves it
   instead.

   Three of the tiles carry live state — the speaker on stage, the
   registrations ticker, the countdown — and each owns it, so a
   tick re-renders one tile rather than all six. The other three
   are static and never re-render at all, which matters because
   the spotlight writes inline transforms to every one of them
   sixty times a second.

   There is no <canvas> here. An earlier edition had a WebGL hero
   behind the grid; the paper edition does not, and an element
   that only ever carries display:none is not worth shipping.
   ============================================================ */

import type { RefObject } from 'react';

interface Props {
  heroRef: RefObject<HTMLElement>;
}

export function Hero({ heroRef }: Props) {
  return (
    <section className="hero hero--bento" id="hero" ref={heroRef} aria-hidden="true" />
  );
}
