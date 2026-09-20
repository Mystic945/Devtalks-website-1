/* ============================================================
   DEVTALKS — COUNTDOWN TILE
   ------------------------------------------------------------
   Its own component so the one-second tick re-renders four cells
   rather than the whole hero.

   Three states: counting, the day itself, and — if SITE.date is
   ever edited into something unparseable — nothing at all, which
   is better than a tile that says 00:00:00:00 forever.
   ============================================================ */

import { useCountdown } from '@/hooks/useCountdown';
import { SITE } from '@/data/site';
import { Tile } from './Tile';

const CELLS = [
  { key: 'd', unit: 'days' },
  { key: 'h', unit: 'hrs' },
  { key: 'm', unit: 'min' },
  { key: 's', unit: 'sec' }
] as const;

export function CountdownTile() {
  const cd = useCountdown(SITE.date);

  return (
    <Tile variant="cnt">
      <p className="bt__label">
        <b>03</b> Doors open in
      </p>

      {cd.invalid ? null : cd.over ? (
        <div className="count" id="count">
          <div className="count__cell" style={{ minWidth: 'auto', padding: '12px 20px' }}>
            <strong style={{ fontSize: '1.1rem' }}>HAPPENING NOW</strong>
          </div>
        </div>
      ) : (
        <div className="count" id="count">
          {CELLS.map(({ key, unit }) => (
            <div className="count__cell" key={key}>
              <strong>{cd[key]}</strong>
              <small>{unit}</small>
            </div>
          ))}
        </div>
      )}
    </Tile>
  );
}
