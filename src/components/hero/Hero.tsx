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

import { useRef, type RefObject } from 'react';
import { useSpotlight } from '@/hooks/useSpotlight';
import { SplitText } from '@/components/SplitText';
import { BoltMark, PERK_ICONS } from '@/lib/icons';
import { ticketProps } from '@/lib/links';
import { PERKS, SITE } from '@/data/site';
import { Tile } from './Tile';
import { StageTile } from './StageTile';
import { RegistrationsTile } from './RegistrationsTile';
import { CountdownTile } from './CountdownTile';

interface Props {
  /** Owned by App, because useHeroIntro animates into it. */
  heroRef: RefObject<HTMLElement>;
}

export function Hero({ heroRef }: Props) {
  const gridRef = useRef<HTMLDivElement>(null);
  const { needsTiltPermission, requestTilt } = useSpotlight(gridRef);

  const tickets = ticketProps();

  return (
    <section className="hero hero--bento" id="hero" ref={heroRef}>
      <div className="hero__veil" aria-hidden="true" />

      <div className="bento" id="bentoGrid" ref={gridRef}>
        <div className="bento__plane">
          {/* 01 · the title */}
          <Tile variant="title">
            <p className="bt__label">
              <b>01</b> The event
            </p>

            <h1 className="hero__title">
              <span className="line">
                <span>
                  DEV
                  {/* An icon set into the wordmark, the way the reference
                      sets them into its headings. One line to remove. */}
                  <i className="bolt" aria-hidden="true">
                    <BoltMark />
                  </i>
                </span>
              </span>
              <span className="line">
                <span>
                  TALKS<b>{SITE.edition.slice(-2)}</b>
                </span>
              </span>
            </h1>

            <SplitText as="p" className="hero__theme" id="heroTheme" text={SITE.theme} />
            <p className="hero__tag">{SITE.tagline}</p>

            <div className="hero__actions">
              <a className="btn" data-magnetic {...tickets}>
                Get tickets
              </a>
              <a href="#speakers" className="btn btn--ghost" data-magnetic>
                See speakers
              </a>
            </div>
          </Tile>

          {/* 02 · who is on stage */}
          <StageTile />

          {/* 03 · live registrations */}
          <RegistrationsTile />

          {/* 04 · countdown */}
          <CountdownTile />

          {/* 05 · date and venue */}
          <Tile variant="meta">
            <p className="bt__label">
              <b>04</b> When &amp; where
            </p>
            <div className="hero__meta">
              <span>{SITE.dateLabel}</span>
              <i />
              <span>{SITE.venueShort}</span>
            </div>
          </Tile>

          {/* 06 · what you get */}
          <Tile variant="stack">
            <p className="bt__label">
              <b>05</b> What you get
            </p>
            <div className="btperks">
              {PERKS.map((p) => (
                <div className="btperk" key={p.label}>
                  <span className="btperk__i" aria-hidden="true">
                    {PERK_ICONS[p.icon]}
                  </span>
                  <span className="btperk__t">
                    {p.label}
                    <em>{p.note}</em>
                  </span>
                </div>
              ))}
            </div>
          </Tile>
        </div>

        <p className="bento__hint">
          Move your cursor to light the stage
          {needsTiltPermission && (
            <button type="button" onClick={requestTilt}>
              Enable tilt
            </button>
          )}
        </p>
      </div>

      <div className="hero__scroll" aria-hidden="true">
        <span>SCROLL</span>
        <i />
      </div>
    </section>
  );
}
