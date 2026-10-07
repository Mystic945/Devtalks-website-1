/* ============================================================
   DEVTALKS — GETTING THERE
   ------------------------------------------------------------
   Address, times and the two questions every attendee actually
   asks: how do I get there and where do I park.

   THE MAP
   A real one, of the real place, and still not an embed. A Google
   iframe here would cost a third-party script, its cookies and
   roughly a megabyte, to show a map nobody navigates on the page —
   they tap through to Maps. So this is the smallest thing that is
   honestly a map: fifteen map tiles laid in a grid and slid
   so the venue's coordinates sit dead centre, with our own pin on
   top. No script, no cookies, nothing loaded until it is near the
   screen, and the whole box is a link to the place in Google Maps.

   Change the venue in site.ts (mapLat, mapLng, mapLink) and the
   grid works out for itself which tiles it needs: the arithmetic
   below is the standard web-map projection, not a lookup.

   The tiles are OpenStreetMap's own, which need no key and no
   account; they are coloured, and the stylesheet washes them to
   white (animations.css §13). OpenStreetMap asks to be credited, so
   the credit in the corner stays. (CARTO's ready-made white tiles
   were the first choice; they now answer with "API key required".)
   ============================================================ */

import { useMemo, type CSSProperties } from 'react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { SITE } from '@/data/site';

const MAP = {
  /** 16 is "the streets around the campus": about a kilometre across. */
  zoom: 16,
  /** Enough tiles to fill the box at any width it is laid out at. */
  cols: 5,
  rows: 3,
  tile: 256
} as const;

/** Where a latitude/longitude falls on the world's tile grid at a zoom. */
function project(lat: number, lng: number, zoom: number) {
  const n = 2 ** zoom;
  const rad = (lat * Math.PI) / 180;
  return {
    x: ((lng + 180) / 360) * n,
    y: ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n
  };
}

function VenueMap() {
  const { tiles, style } = useMemo(() => {
    const { x, y } = project(SITE.mapLat, SITE.mapLng, MAP.zoom);
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    const midC = (MAP.cols - 1) / 2;
    const midR = (MAP.rows - 1) / 2;

    const list: { key: string; src: string }[] = [];
    for (let r = 0; r < MAP.rows; r++) {
      for (let c = 0; c < MAP.cols; c++) {
        const cx = tx - midC + c;
        const cy = ty - midR + r;
        list.push({
          key: `${cx}/${cy}`,
          src: `https://tile.openstreetmap.org/${MAP.zoom}/${cx}/${cy}.png`
        });
      }
    }

    // How far into the grid the venue is, which is how far the grid has to be
    // pulled back for that point to land on the centre of the box.
    const px = (midC + (x - tx)) * MAP.tile;
    const py = (midR + (y - ty)) * MAP.tile;

    return {
      tiles: list,
      style: {
        '--map-x': `${px.toFixed(1)}px`,
        '--map-y': `${py.toFixed(1)}px`,
        gridTemplateColumns: `repeat(${MAP.cols}, ${MAP.tile}px)`
      } as CSSProperties
    };
  }, []);

  return (
    <div className="venue__map venue__map--live" data-flow>
      <div className="venue__tiles" style={style} aria-hidden="true">
        {tiles.map((t) => (
          <img
            key={t.key}
            src={t.src}
            width={MAP.tile}
            height={MAP.tile}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        ))}
      </div>

      <div className="venue__marker" aria-hidden="true">
        <i />
        <span>DevTalks</span>
      </div>

      {/* The whole map is the link. It sits over the tiles and under the
          credit, whose own links have to stay reachable. */}
      <a
        className="venue__maplink"
        href={SITE.mapLink}
        target="_blank"
        rel="noopener"
        aria-label={`Open ${SITE.venue} in Google Maps`}
      />

      <p className="venue__credit">
        &copy;{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">
          OpenStreetMap
        </a>{' '}
        contributors
      </p>
    </div>
  );
}

export function Venue() {
  return (
    <section className="sec sec--venue" id="venue">
      <div className="wrap">
        <div className="sec__head">
          <p className="eyebrow" data-reveal>
            <em>04</em> Getting there
          </p>
          <ScrollReveal
            as="h2"
            containerClassName="big"
            enableBlur={true}
            blurStrength={4}
            baseRotation={2}
            baseOpacity={0.1}
          >
            Venue
          </ScrollReveal>
        </div>

        <div className="venue">
          <div className="venue__info" data-flow>
            <h3>{SITE.venue}</h3>
            <p>{SITE.venueLine2}</p>

            <dl>
              <div>
                <dt>Date</dt>
                <dd>{SITE.dateLabel}</dd>
              </div>
              <div>
                <dt>Time</dt>
                <dd>{SITE.timeLabel}</dd>
              </div>
              <div>
                <dt>Nearest stations</dt>
                <dd>Akurdi &amp; Nigdi — 10 min by auto</dd>
              </div>
              <div>
                <dt>Parking</dt>
                <dd>Free, on campus, gate 2</dd>
              </div>
            </dl>

            <a
              className="btn btn--ghost"
              href={SITE.mapLink}
              target="_blank"
              rel="noopener"
              data-magnetic
            >
              Open in Maps
            </a>
          </div>

          <VenueMap />
        </div>
      </div>
    </section>
  );
}
