import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import MagicRings from './MagicRings';
import LanyardLayer from './LanyardLayer';
import { prefersReducedMotion } from '@/lib/dom';
import './landing.css';

/* The landing page is `position: sticky` and stays pinned behind the page
   sheet that rides up over it, so it never leaves the viewport as far as an
   IntersectionObserver can tell. Once the sheet has covered it, nothing on
   it can be seen and the rings have no reason to keep drawing. */
function useCovered(ref: RefObject<HTMLElement>) {
  const [covered, setCovered] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let queued = false;
    const check = () => {
      queued = false;
      setCovered(window.scrollY > el.offsetHeight * 0.98);
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(check);
    };

    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [ref]);

  return covered;
}

export default function LandingPage() {
  const pageRef = useRef<HTMLElement>(null);
  const covered = useCovered(pageRef);

  // The landing page is `position: sticky`, so the next section (.page-body)
  // is what actually scrolls up over it — scrollIntoView on that, rather than
  // a fixed pixel amount, lands exactly past the landing screen regardless of
  // its height on this viewport (it varies: 100vh, floored at 700px).
  const scrollPastLanding = useCallback(() => {
    document.querySelector('.page-body')?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start'
    });
  }, []);

  return (
    <section className="landing-page" ref={pageRef}>

      {/* Comic / doodle background */}
      <div className="landing-doodle-field" aria-hidden="true">
        <span className="landing-doodle q1">&lt;/&gt;</span>
        <span className="landing-doodle q2">✦</span>
        <span className="landing-doodle q3">⌁</span>
        <span className="landing-doodle q4">⚙</span>
        <span className="landing-doodle q5">◌</span>
        <span className="landing-doodle q6">↗</span>
        <span className="landing-doodle q7">{'{ AI }'}</span>
        <span className="landing-doodle q9">⌘</span>
        <span className="landing-doodle q10">✧</span>
        <span className="landing-doodle q11">◈</span>
        <span className="landing-doodle q12">01</span>
        <span className="landing-doodle q13">0101</span>
        <span className="landing-doodle q14">→ BUILD</span>
        <span className="landing-doodle q15">[ ]</span>
        <span className="landing-doodle q16">⚡</span>
        <span className="landing-doodle q17">◉</span>
        <span className="landing-doodle q18">&lt;DEV&gt;</span>
      </div>

      <div className="landing-inner">

       

        <div className="landing-title-wrap">

          <MagicRings
            className="landing-rings"
            paused={covered}
            color="#ff5a1f"
            colorTwo="#a83a0b"
            ringCount={5}
            speed={0.8}
            attenuation={20}
            lineThickness={1}
            baseRadius={0.17}
            radiusStep={0.055}
            scaleRate={0.06}
            opacity={0.3}
            noiseAmount={0.03}
            ringGap={1.5}
            edgeFade={0.26}
          />

          <h1 className="landing-title">
            <span>DEV</span>
            <span>TALKS</span>
          </h1>

          <div className="landing-stamp">
            <span>IDEAS</span>
            <span>CODE</span>
            <span>PEOPLE</span>
            <span>IMPACT</span>
          </div>

        </div>

        <div className="landing-bottom">

          <div>
            <p className="landing-manifesto">
              TECHNOLOGY.
              <br />
              <em>UNFILTERED.</em>
            </p>

            <p className="landing-description">
              A space for developers, builders, founders
              <br />
              and curious minds to talk about what comes next.
            </p>
          </div>

          <div className="landing-event-info">
            <span>26 — 27 SEPTEMBER 2026</span>
            <span>PUNE · DEVKRAFT</span>
          </div>

        </div>

      </div>

      <LanyardLayer paused={covered} />

      <button type="button" className="landing-scroll" onClick={scrollPastLanding} aria-label="Scroll to the rest of the page">
        
        <b>↓</b>
      </button>

    </section>
  );
}