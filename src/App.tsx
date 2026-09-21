/* ============================================================
   DEVTALKS 2026 — THE PAGE
   ------------------------------------------------------------
   One page, in the order it is read. Each section owns its own
   markup and its own state; this file owns only the things that
   span the whole document.

   WHY THE HOOKS ARE IN THIS ORDER
   Effects run children-first, so by the time any hook here runs
   every section is in the DOM. Within this component they run top
   to bottom, and two of them care:

     useFooterReveal   changes <main>'s bottom margin, which
                       changes the height of the document
     useScrollFlow     caches every card's document-space top

   so the footer has to be settled before the flow measures, or
   the first scroll measures against a page that has since grown.

   THE INTRO HANDOFF
   The doors hand over with `ready`, which is what starts the hero
   timeline and the scroll reveals. Nothing renders differently
   because of it — it is a starting gun, not a loading state, and
   the page underneath is complete before it fires.
   ============================================================ */


import { useCallback, useEffect, useRef, useState } from 'react';

import { useIntro } from '@/hooks/useIntro';
import { useHeroIntro } from '@/hooks/useHeroIntro';
import { useScrollAnimations } from '@/hooks/useScrollAnimations';
import { useScrollTriggerSync } from '@/hooks/useScrollTriggerSync';
import { useScrollFlow } from '@/hooks/useScrollFlow';
import { useFooterReveal } from '@/hooks/useFooterReveal';
import { useSmoothAnchors } from '@/hooks/useSmoothAnchors';
import { useMagnetic } from '@/hooks/useMagnetic';
import { useParallax } from '@/hooks/useParallax';
import { useClickSpark } from '@/hooks/useClickSpark';

import { Doors } from '@/components/Doors';
import { SiteNav } from '@/components/SiteNav';
import LandingPage from './components/landing/LandingPage';
import { Hero } from '@/components/hero/Hero';
import { Ribbons } from '@/components/Ribbons';
import { EdgeTab } from '@/components/EdgeTab';
import { About } from '@/components/About';
import { Speakers } from '@/components/Speakers';
import { Schedule } from '@/components/Schedule';
import { Tickets } from '@/components/Tickets';
import { Sponsors } from '@/components/Sponsors';
import { Venue } from '@/components/Venue';
import { Reel } from '@/components/Reel';
import { Gallery } from '@/components/Gallery';
import { Faq } from '@/components/Faq';
import { FinalCta } from '@/components/FinalCta';
import { Footer } from '@/components/Footer';

import { SITE } from '@/data/site';

export default function App() {
  const doorsRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const footRef = useRef<HTMLElement>(null);
  const sparkRef = useRef<HTMLCanvasElement>(null);

  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);

  useIntro(doorsRef, onReady);

  useEffect(() => {
    if (ready) document.body.classList.add('is-ready');
  }, [ready]);

  useEffect(() => {
    document.title = `${SITE.eventName} ${SITE.edition} — ${SITE.theme}`;
  }, []);

  useSmoothAnchors();
  useMagnetic();
  useClickSpark(sparkRef);
  useParallax();
  useFooterReveal(footRef, mainRef);
  useScrollFlow();

  useHeroIntro(heroRef, ready);
  useScrollAnimations(ready);

  // Last, deliberately: it re-measures everything the hooks above created.
  useScrollTriggerSync(ready);

  return (
    <>
      <Doors ref={doorsRef} />
      <SiteNav />
      <EdgeTab />

      <main id="top" ref={mainRef}>
        <LandingPage />

        {/* Everything after the landing page travels as one opaque sheet.
            It has to be one element with one ground: the landing page is
            stuck to the top of <main>, so any section left transparent
            would show it through — which is exactly what happened when
            these were loose siblings. */}
        <div className="page-body">
          <Hero heroRef={heroRef} ready={ready} />
          <Ribbons />
          <About />
          <Speakers />
          <Schedule />
          <Tickets />
          <Sponsors />
          <Venue />
          <Reel />
          <Gallery />
          <Faq />
          <FinalCta />
        </div>
      </main>

      <Footer ref={footRef} />

      {/* Last in the tree and fixed over everything, so a spark is never
          clipped by a section's own stacking context. */}
      <canvas className="spark" ref={sparkRef} aria-hidden="true" />
    </>
  );
}
