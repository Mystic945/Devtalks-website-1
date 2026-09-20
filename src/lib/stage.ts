/* ============================================================
   DEVTALKS — THE RUN OF SHOW, AS REAL INSTANTS
   ------------------------------------------------------------
   The hero's speaker tile follows the schedule: before the doors
   open it shows who is on first; while a talk is running it shows
   that speaker and says so; during a break it shows who is up
   next; once the last talk is done it says the day is over.

   This file is the logic on its own — no DOM, no React — so the
   states can be checked without waiting until November:

     stageState(buildTimeline(SITE, SCHEDULE, SPEAKERS)!,
                new Date('2026-11-14T10:30:00+05:30'))

   TIME
   SCHEDULE rows are wall-clock strings with no date. They are
   anchored to the event's own day AND its own UTC offset, both
   taken from SITE.date, so a visitor in another timezone sees the
   talk that is genuinely running in Pune right now — not the one
   that matches their local clock.
   ============================================================ */

import type { Site, SchedRow, Speaker } from '@/data/site';

export interface TimelineRow {
  start: Date;
  end: Date;
  row: SchedRow;
  /** index into SPEAKERS, or -1 when the row is a break or a panel */
  speaker: number;
}

export interface StageState {
  /** index into SPEAKERS — always a real speaker */
  index: number;
  label: string;
  live: boolean;
  done?: boolean;
}

/** How long the final row runs for, since nothing follows it to end it. */
const LAST_ROW_MS = 30 * 60 * 1000;

/* A row belongs to a speaker if their name appears in either field. That
   covers "Shipping Before You're Ready" / who: "Speaker One" and also
   "Q&A with Speaker One" / who: "Audience", without either row needing a
   field of its own. */
export function speakerFor(row: SchedRow, speakers: readonly Speaker[]): number {
  const hay = `${row.title || ''} ${row.who || ''}`.toLowerCase();
  for (let i = 0; i < speakers.length; i++) {
    const n = (speakers[i].name || '').trim().toLowerCase();
    if (n && hay.indexOf(n) !== -1) return i;
  }
  return -1;
}

/** Returns null when SITE.date is not a parseable offset timestamp — the
 *  caller then leaves the placeholder tile alone rather than guessing. */
export function buildTimeline(
  site: Site,
  schedule: readonly SchedRow[],
  speakers: readonly Speaker[]
): TimelineRow[] | null {
  // "2026-11-14T10:00:00+05:30" -> day "2026-11-14", offset "+05:30"
  const m = String(site.date).match(/^(\d{4}-\d{2}-\d{2})T[\d:]+(Z|[+-]\d{2}:\d{2})$/);
  if (!m) return null;

  const day = m[1];
  const off = m[2] === 'Z' ? '+00:00' : m[2];

  const at = (hhmm: string): Date | null => {
    const d = new Date(`${day}T${hhmm}:00${off}`);
    return isNaN(d.getTime()) ? null : d;
  };

  const rows: TimelineRow[] = [];
  for (const row of schedule) {
    const start = at(row.time);
    if (!start) return null;
    rows.push({ start, end: start, row, speaker: speakerFor(row, speakers) });
  }

  // a row runs until the next one starts; the last gets half an hour
  for (let i = 0; i < rows.length; i++) {
    rows[i].end = rows[i + 1]
      ? rows[i + 1].start
      : new Date(rows[i].start.getTime() + LAST_ROW_MS);
  }
  return rows;
}

export function stageState(rows: readonly TimelineRow[], now: Date): StageState {
  const withSpeaker = rows.filter((r) => r.speaker !== -1);
  if (!withSpeaker.length) return { index: 0, label: 'Next on stage', live: false };

  if (now < withSpeaker[0].start) {
    return { index: withSpeaker[0].speaker, label: 'First on stage', live: false };
  }

  const last = withSpeaker[withSpeaker.length - 1];
  const dayEnd = rows[rows.length - 1].end;

  // Past the last talk but the day is still going — the demo floor and the
  // closing session are still to come, so a "wrap" would be wrong.
  if (now >= last.end && now < dayEnd) {
    return { index: last.speaker, label: 'Talks done for today', live: false };
  }
  if (now >= dayEnd) {
    return { index: last.speaker, label: "That's a wrap", live: false, done: true };
  }

  // inside a row that has a speaker — they are on
  for (const r of rows) {
    if (now >= r.start && now < r.end && r.speaker !== -1) {
      return { index: r.speaker, label: 'On stage now', live: true };
    }
  }

  // between talks — whoever is up next
  for (const r of withSpeaker) {
    if (now < r.start) return { index: r.speaker, label: 'Up next', live: false };
  }

  return { index: last.speaker, label: 'Next on stage', live: false };
}
