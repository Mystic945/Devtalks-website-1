/* ============================================================
   DEVTALKS — LANDING LANYARD (loader)
   ------------------------------------------------------------
   The badge on the landing page. This file is the small part that
   ships in the main bundle; everything heavy — three.js, the Rapier
   physics engine and its WASM, the 2.4 MB card model — lives in
   ./lanyard and is fetched only when it is actually going to be
   shown.

   WHEN IT LOADS
   Not while the doors are playing: parsing that much code and
   compiling the physics WASM in the middle of the intro is exactly
   the hitch a slow machine would show. It waits for the intro to hand
   over (`is-ready` on <body>, set from App), then for an idle moment.

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

/** Resolves once the intro has handed over, or after a fallback delay. */
function whenReady(): Promise<void> {
  return new Promise((resolve) => {
    const body = document.body;
    if (body.classList.contains('is-ready')) return resolve();

    const done = () => {
      observer.disconnect();
      window.clearTimeout(fallback);
      resolve();
    };
    const observer = new MutationObserver(() => {
      if (body.classList.contains('is-ready')) done();
    });
    observer.observe(body, { attributes: true, attributeFilter: ['class'] });
    const fallback = window.setTimeout(done, 8000);
  });
}

const whenIdle = () =>
  new Promise<void>((resolve) => {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(() => resolve(), { timeout: 2000 });
    } else {
      window.setTimeout(resolve, 500);
    }
  });

interface Loaded {
  Lanyard: ComponentType<LanyardProps>;
  art: BadgeArt;
}

export default function LanyardLayer({ paused }: { paused: boolean }) {
  const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [shown, setShown] = useState(false);

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
      await whenReady();
      await whenIdle();
      if (cancelled) return;

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
    <div className={`landing-lanyard${shown ? ' is-on' : ''}`}>
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
        paused={paused}
        onCreated={() => setShown(true)}
      />
    </div>
  );
}
