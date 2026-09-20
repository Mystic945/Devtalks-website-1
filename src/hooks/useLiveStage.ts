/* ============================================================
   DEVTALKS — WHO IS ON STAGE, RIGHT NOW
   ------------------------------------------------------------
   Polls the run of show and hands the hero tile the speaker it
   should be showing. The timeline itself is built once and the
   comparison is a cheap one, so the tick can be slow — the
   schedule moves in minutes, not seconds.

   Nothing is recomputed while the tab is hidden, and the state
   is re-read the moment it comes back, so a laptop reopened
   after lunch shows the right talk immediately rather than at
   the next tick.

   Returns null when SITE.date cannot be parsed; the hero then
   falls back to simply showing the first speaker.
   ============================================================ */

import { useEffect, useMemo, useState } from 'react';
import { buildTimeline, stageState, type StageState } from '@/lib/stage';
import type { SchedRow, Site, Speaker } from '@/data/site';

const TICK = 20_000; // ms between checks

export function useLiveStage(
  site: Site,
  schedule: readonly SchedRow[],
  speakers: readonly Speaker[]
): StageState | null {
  const rows = useMemo(
    () => buildTimeline(site, schedule, speakers),
    [site, schedule, speakers]
  );

  const [state, setState] = useState<StageState | null>(() =>
    rows ? stageState(rows, new Date()) : null
  );

  useEffect(() => {
    if (!rows) {
      setState(null);
      return;
    }

    const run = () => {
      if (document.hidden) return;
      const next = stageState(rows, new Date());
      // Same speaker, same label: nothing changed, so do not re-render.
      setState((prev) =>
        prev && prev.index === next.index && prev.label === next.label ? prev : next
      );
    };

    run();
    const id = setInterval(run, TICK);
    document.addEventListener('visibilitychange', run);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', run);
    };
  }, [rows]);

  return state;
}
