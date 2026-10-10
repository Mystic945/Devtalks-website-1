/* ============================================================
   KURUKSHETRA — LANDING LANYARD (loader)
   ------------------------------------------------------------
   The badge on the landing page. This file is the small part that
   ships in the main bundle; everything heavy — three.js, the Rapier
   physics engine and its WASM, the 2.4 MB card model — lives in
   ./lanyard and is fetched only when it is actually going to be
   shown.

   WHEN IT LOADS
   Straight away, behind the boot screen. It used to wait for the intro
   to hand over and then for an idle moment, because the intro was a
   tweened door animation and parsing this much code in the middle of
   it showed as a hitch. The intro is now a loading screen with a
   stepped bar: there is no better moment to do the loading, and a
   late square in a progress bar is not a hitch anyone can see. So the
   code, the physics and the model are all in hand by the time the
   screen clears, and nothing about when the badge appears is left to
   the network.

   WHEN IT APPEARS
   A beat after the page does, on purpose. It is built behind the boot
   screen but held still — no frames, no physics — and let go DROP_DELAY
   after the page is handed over (`is-ready` on <body>, set from App).
   The rope starts out stretched sideways from its hook, so letting go
   is the entrance: the badge swings down into the corner of a page
   the visitor has just started looking at, and movement at the edge
   of a still picture is what catches the eye. Arriving with the page
   it would be one more thing on it; arriving late and unplanned, as it
   did when this waited on the download, it read as a glitch.

   WHEN IT DOES NOT
   • Narrow screens (the same 700px the landing layout switches at).
     A dangling badge over a centred wordmark has nowhere to hang
     there, and a phone should not pay for a physics engine to draw it.
   • prefers-reduced-motion: it is a swinging object, and purely
     decorative.
   • No WebGL: the landing page is complete without it.
   ============================================================ */

import { useEffect, useState, type ComponentType } from 'react';
import type { LanyardProps } from './lanyard/Lanyard';
import type { BadgeArt } from './lanyard/badge';
import './LanyardLayer.css';

const WIDE = '(min-width: 701px)';
const REDUCED = '(prefers-reduced-motion: reduce)';

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** How long after the page appears the badge is let go. Long enough that the
 *  boot screen's last squares have gone and the eye has landed on the
 *  wordmark; short enough to still belong to the arrival. */
const DROP_DELAY = 700;

/** True once the page has been handed over and DROP_DELAY has passed. */
function useReleased(): boolean {
  const [released, setReleased] = useState(false);

  useEffect(() => {
    const body = document.body;
    let timer = 0;

    const observer = new MutationObserver(() => {
      if (body.classList.contains('is-ready')) arm();
    });
    function arm() {
      if (timer) return;
      observer.disconnect();
      timer = window.setTimeout(() => setReleased(true), DROP_DELAY);
    }

    if (body.classList.contains('is-ready')) arm();
    else observer.observe(body, { attributes: true, attributeFilter: ['class'] });

    // The hand-over is guaranteed by the boot screen's own backstop; this is
    // only so the badge can never be held for good.
    const fallback = window.setTimeout(() => setReleased(true), 8000);

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
      window.clearTimeout(fallback);
    };
  }, []);

  return released;
}

interface Loaded {
  Lanyard: ComponentType<LanyardProps>;
  art: BadgeArt;
}

export default function LanyardLayer({ paused }: { paused: boolean }) {
  const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [shown, setShown] = useState(false);
  const released = useReleased();

  useEffect(() => {
    const mq = window.matchMedia(WIDE);
    const onChange = () => setWide(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const enabled = wide && !window.matchMedia(REDUCED).matches;

  useEffect(() => {
    if (!enabled || loaded) return;
    let cancelled = false;

    (async () => {
      if (!hasWebGL()) return;

      const [mod, badge] = await Promise.all([import('./lanyard/Lanyard'), import('./lanyard/badge')]);
      const art = await badge.paintBadge();
      if (!cancelled) setLoaded({ Lanyard: mod.default, art });
    })().catch(() => {
      // The landing page is complete without it.
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, loaded]);

  if (!enabled || !loaded) return null;
  const { Lanyard, art } = loaded;

  return (
    <div className={`landing-lanyard${shown && released ? ' is-on' : ''}`}>
      <Lanyard
        // Camera distance sets the badge's size on screen (bigger z, smaller
        // badge). The rope's anchor is 4 units up, so as the camera backs off
        // it is lowered to keep the rope coming in from above the frame:
        // the top edge of the view is y + z * tan(fov / 2), which has to
        // stay under 4.
        position={[0, -1.6, 30]}
        gravity={[0, -40, 0]}
        fov={20}
        frontImage={art.front}
        backImage={art.back}
        lanyardImage={art.band}
        imageFit="cover"
        // Held until released: built and ready, but not yet let go.
        paused={paused || !released}
        onCreated={() => setShown(true)}
      />
    </div>
  );
}
