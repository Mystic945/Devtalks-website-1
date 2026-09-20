/* ============================================================
   DEVTALKS — THE LIVE SPEAKER TILE
   ------------------------------------------------------------
   Follows the run of show: who is on first before the doors open,
   who is on stage while a talk is running, who is up next during
   a break, and that the day is done once the last talk ends.

   The label above the tile changes with it, because a tile that
   says "Next on stage" while someone is mid-talk is worse than
   no tile at all.

   This is its own component so that its twenty-second tick
   re-renders one tile rather than the whole hero — the split
   headings and the spotlight's inline transforms live in the
   siblings, and nothing gains from reconciling them on a timer.
   ============================================================ */

import { useLiveStage } from '@/hooks/useLiveStage';
import { initials } from '@/lib/dom';
import { SCHEDULE, SITE, SPEAKERS } from '@/data/site';
import { Tile } from './Tile';

export function StageTile() {
  const stage = useLiveStage(SITE, SCHEDULE, SPEAKERS);

  // No parseable date: fall back to simply showing who is on first.
  const index = stage?.index ?? 0;
  const label = stage?.label ?? 'Next on stage';
  const live = stage?.live ?? false;
  const speaker = SPEAKERS[index];

  return (
    <Tile variant="spk" className={live ? 'is-live' : undefined}>
      <p className="bt__label">
        {live ? (
          <>
            <span className="bttick__live">
              <i />
              Live
            </span>{' '}
            {label}
          </>
        ) : (
          <>
            <b>02</b> {label}
          </>
        )}
      </p>

      {speaker && (
        <div>
          <div className="btspk">
            <div className="btspk__img">
              {speaker.photo ? (
                <img src={speaker.photo} alt="" loading="lazy" />
              ) : (
                <span className="btspk__ini">{initials(speaker.name)}</span>
              )}
            </div>
            <div>
              <div className="btspk__name">{speaker.name}</div>
              <div className="btspk__role">
                {speaker.role}
                {speaker.org ? ` · ${speaker.org}` : ''}
              </div>
            </div>
          </div>
          <p className="btspk__talk">{speaker.talk}</p>
        </div>
      )}
    </Tile>
  );
}
