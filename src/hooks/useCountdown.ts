/* ============================================================
   DEVTALKS — COUNTDOWN
   ------------------------------------------------------------
   Days, hours, minutes and seconds until the doors open, from
   SITE.date. Returns `over` once the moment has passed, and
   `invalid` if the date cannot be parsed at all — the hero hides
   the tile in that case rather than printing four zeroes forever.
   ============================================================ */

import { useEffect, useState } from 'react';
import { pad2 } from '@/lib/dom';

export interface Countdown {
  d: string;
  h: string;
  m: string;
  s: string;
  over: boolean;
  invalid: boolean;
}

const split = (target: number, now: number): Countdown => {
  const diff = target - now;
  if (diff <= 0) return { d: '00', h: '00', m: '00', s: '00', over: true, invalid: false };

  const s = Math.floor(diff / 1000);
  return {
    d: pad2(Math.floor(s / 86400)),
    h: pad2(Math.floor((s % 86400) / 3600)),
    m: pad2(Math.floor((s % 3600) / 60)),
    s: pad2(s % 60),
    over: false,
    invalid: false
  };
};

export function useCountdown(isoDate: string): Countdown {
  const target = new Date(isoDate).getTime();
  const valid = !isNaN(target);

  const [value, setValue] = useState<Countdown>(() =>
    valid
      ? split(target, Date.now())
      : { d: '00', h: '00', m: '00', s: '00', over: false, invalid: true }
  );

  useEffect(() => {
    if (!valid) return;

    // Re-sync on mount as well as on the interval: the state initialiser ran
    // at first render, which may have been a while ago on a slow boot.
    setValue(split(target, Date.now()));

    const id = setInterval(() => {
      const next = split(target, Date.now());
      setValue(next);
      if (next.over) clearInterval(id);
    }, 1000);

    return () => clearInterval(id);
  }, [target, valid]);

  return value;
}
