/* ============================================================
   DEVTALKS 2026 — THE PAGE
   ------------------------------------------------------------
   One page, in the order it is read. Each section owns its own
   markup and its own state; this file owns only the things that
   span the whole document.

   HOW IT ENDS
   The venue is the last section in <main> and the footer follows
   it directly: one closing block, joined by the army band at the
   top of the footer. Nothing is pinned or revealed any more.

   WHY THE HOOKS ARE IN THIS ORDER
   Effects run children-first, so by the time any hook here runs
   every section is in the DOM. useScrollFlow caches every card's
   document-space top, and useScrollTriggerSync, last, re-measures
   everything once the page has reached its real height.

   THE INTRO HANDOFF
   The boot screen (components/Boot) hands over with `ready`, which is
   what starts the scroll reveals. Nothing renders differently
   because of it — it is a starting gun, not a loading state, and
   the page underneath is complete before it fires.
   ============================================================ */


import { useCallback, useEffect, useRef, useState } from 'react';

import { useHeroIntro } from '@/hooks/useHeroIntro';
import { useScrollAnimations } from '@/hooks/useScrollAnimations';
import { useScrollTriggerSync } from '@/hooks/useScrollTriggerSync';
import { useScrollFlow } from '@/hooks/useScrollFlow';
import { useSmoothAnchors } from '@/hooks/useSmoothAnchors';
import { useMagnetic } from '@/hooks/useMagnetic';
import { useParallax } from '@/hooks/useParallax';
import { useClickSpark } from '@/hooks/useClickSpark';
import { useKonami } from '@/hooks/useKonami';

import { Boot } from '@/components/Boot';
import { SiteNav } from '@/components/SiteNav';
import LandingPage from './components/landing/LandingPage';
import { Loop } from '@/components/Loop';
import { Ribbons } from '@/components/Ribbons';
import { EdgeTab } from '@/components/EdgeTab';
import { Speakers } from '@/components/Speakers';
import { Schedule } from '@/components/Schedule';
import TicketsPage from './components/tickets/TicketsPage';
import { Sponsors } from '@/components/Sponsors';
import { Venue } from '@/components/Venue';
import { Faq } from '@/components/Faq';
import { Footer } from '@/components/Footer';

import { SITE } from '@/data/site';

function MainApp() {
  const heroRef = useRef<HTMLElement>(null);
  const sparkRef = useRef<HTMLCanvasElement>(null);

  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);

  /* ↑↑↓↓←→←→BA returns the site to the paper edition it shipped as.
     Announced, because an easter egg with no feedback reads as a bug. */
  const [edition, setEdition] = useState<string | null>(null);
  useKonami((paper) => setEdition(paper ? 'Paper edition unlocked' : 'Dark edition'));

  useEffect(() => {
    if (!edition) return;
    const t = setTimeout(() => setEdition(null), 2600);
    return () => clearTimeout(t);
  }, [edition]);

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
  useScrollFlow();

  useHeroIntro(heroRef, ready);
  useScrollAnimations(ready);

  // Last, deliberately: it re-measures everything the hooks above created.
  useScrollTriggerSync(ready);

  return (
    <>
      <Boot onReady={onReady} />
      <SiteNav />
      <EdgeTab />

      <main id="top">
        <LandingPage />

        {/* Everything after the landing page travels as one opaque sheet.
            It has to be one element with one ground: the landing page is
            stuck to the top of <main>, so any section left transparent
            would show it through — which is exactly what happened when
            these were loose siblings. */}
        <div className="page-body">
          <Loop />
          <Ribbons />
          <Speakers />
          <Schedule />
          <Sponsors />
          {/* The reel goes back in here after the event, once there is footage:
              import { Reel } from '@/components/Reel' and render <Reel />. The
              component, its viewer and its styles are all still in the repo. */}
          <Faq />
          {/* Last: the venue is the top half of the closing block, and the
              footer below it is the other half. */}
          <Venue />
        </div>
      </main>

      <Footer />

      {/* Last in the tree and fixed over everything, so a spark is never
          clipped by a section's own stacking context. */}
      <canvas className="spark" ref={sparkRef} aria-hidden="true" />

      {edition && (
        <p className="edition-toast" role="status">
          {edition}
        </p>
      )}
    </>
  );
}

export default function App() {
  const path = window.location.pathname;

  if (path === '/tickets') {
    return <TicketsPage />;
  }

  return <MainApp />;
}