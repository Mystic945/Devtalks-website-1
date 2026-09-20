/* ============================================================
   DEVTALKS — THE REGISTRATIONS TICKER
   ------------------------------------------------------------
   A number that climbs to its target once, and a feed that rolls
   one sign-up line at a time underneath it.

   PLACEHOLDER DATA
   There is no backend on a static site, so FEED below is a demo.
   To wire it to the real thing, replace `useRegistrations` with a
   fetch — the shape it returns is the contract, and nothing else
   in this file has to change.

   THE ROLL
   Two lines exist at once: the one arriving from below and the
   one leaving upward. The arriving line has to be painted at its
   starting position before it can transition away from it, which
   is why it is mounted with an inline transform that a rAF then
   clears. React renders final states; a transition needs a
   starting one.
   ============================================================ */

import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@/lib/dom';
import { STATS } from '@/data/site';
import { Tile } from './Tile';

/** Placeholder sign-ups. Swap for real data when there is any. */
const FEED = [
  'Aarav · COEP',
  'Sana · VIT Pune',
  'Rohit · MIT-WPU',
  'Ishita · PICT',
  'Kabir · DYPIT',
  'Meera · Cummins',
  'Devansh · SPPU',
  'Aditi · VIT Pune'
];

const CLIMB_MS = 1400;
const ROLL_MS = 3400;
/** Must match the transition in styles/hero-bento.css. */
const LEAVE_MS = 520;

/** Seats claimed, as a share of the hall — a plausible placeholder until a
 *  real number arrives. */
const seatsTarget = (): number => {
  const seats = STATS.find((s) => /seat/i.test(s.label));
  return seats ? Math.round(seats.value * 0.41) : 248;
};

function useClimbingCount(end: number): number {
  const [n, setN] = useState(0);

  useEffect(() => {
    let raf = 0;
    let t0 = 0;

    const step = (ts: number) => {
      if (!t0) t0 = ts;
      const k = Math.min((ts - t0) / CLIMB_MS, 1);
      setN(Math.round(end * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [end]);

  return n;
}

interface Line {
  id: number;
  text: string;
}

export function RegistrationsTile() {
  const count = useClimbingCount(seatsTarget());

  const [current, setCurrent] = useState<Line>({ id: 0, text: FEED[0] });
  const [leaving, setLeaving] = useState<Line | null>(null);
  const enterRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    let i = 1;
    let showing: Line = { id: 0, text: FEED[0] };
    let drop: ReturnType<typeof setTimeout> | null = null;

    const id = setInterval(() => {
      if (document.hidden) return;

      const next: Line = { id: i, text: FEED[i % FEED.length] };
      i++;

      setLeaving(showing);
      setCurrent(next);
      showing = next;

      if (drop) clearTimeout(drop);
      drop = setTimeout(() => setLeaving(null), LEAVE_MS);
    }, ROLL_MS);

    return () => {
      clearInterval(id);
      if (drop) clearTimeout(drop);
    };
  }, []);

  /* The arriving line is mounted already translated down, then released on
     the next frame so the CSS transition has something to run from. */
  useEffect(() => {
    const el = enterRef.current;
    if (!el || current.id === 0) return;

    el.style.transform = 'translateY(100%)';
    el.style.opacity = '0';

    const raf = requestAnimationFrame(() => {
      el.style.transform = '';
      el.style.opacity = '';
    });
    return () => cancelAnimationFrame(raf);
  }, [current.id]);

  return (
    <Tile variant="tick">
      <p className="bt__label">
        <span className="bttick__live">
          <i />
          Live
        </span>{' '}
        Registrations
      </p>

      <div className="bttick">
        <span className="bttick__n">{count.toLocaleString('en-IN')}</span>
        <span className="bttick__u">seats claimed</span>
      </div>

      <div className="bttick__feed" aria-hidden="true">
        {leaving && (
          <span key={leaving.id} style={{ transform: 'translateY(-100%)', opacity: 0 }}>
            {leaving.text} just registered
          </span>
        )}
        <span key={current.id} ref={enterRef}>
          {current.text} just registered
        </span>
      </div>
    </Tile>
  );
}
