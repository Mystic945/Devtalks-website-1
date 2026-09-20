/* ============================================================
   DEVTALKS — PARALLAX
   ------------------------------------------------------------
   1. Speaker media drifts inside its card as the card crosses the
      viewport.
   2. The marquee band speeds up, slows and reverses with scroll
      velocity.

   Built to run on a mid-range phone, so:

   • ONE requestAnimationFrame loop for the whole hook. Two
     effects on one loop, not two loops racing each other.
   • ZERO layout reads per frame. Card positions are measured once
     up front and again only on resize — reading
     getBoundingClientRect() every frame is what makes parallax
     stutter, not the maths.
   • Cards are only computed while they are near the viewport
     (IntersectionObserver), and will-change is added and removed
     with them.
   • The loop stops entirely when nothing is on screen and when
     the tab is hidden.
   • Everything is skipped under prefers-reduced-motion.

   Tuning knobs are in CONFIG.
   ============================================================ */

import { useEffect } from 'react';
import { prefersReducedMotion } from '@/lib/dom';

const CONFIG = {
  /** how much of the card height the media travels, total (0.22 = ±11%) */
  drift: 0.22,
  /** marquee resting speed, px/sec */
  marqueeIdle: 48,
  /** how hard scrolling pushes the marquee (px/sec per px/sec of scroll) */
  marqueePush: 0.55,
  /** ceiling on that push, px/sec — stops a flick sending it into a blur */
  marqueeMax: 900,
  /** how fast the push bleeds back to resting speed (0-1 per frame) */
  marqueeDecay: 0.06
} as const;

interface Card {
  frame: HTMLElement;
  media: HTMLElement;
  top: number;
  h: number;
  range: number;
}

interface Marquee {
  track: HTMLElement;
  half: number;
  offset: number;
  speed: number;
  /** +1 runs the band leftwards, -1 rightwards. The two crossing ribbons
   *  travel opposite ways; both still answer scroll velocity together. */
  dir: number;
}

export function useParallax(): void {
  useEffect(() => {
    if (prefersReducedMotion()) return;

    let vh = window.innerHeight;
    let scrollY = window.scrollY;
    let lastY = scrollY;
    let lastT = 0;
    let running = false;
    let rafId: number | null = null;

    let cards: Card[] = [];
    const live = new Set<Card>();
    let marquees: Marquee[] = [];
    let bandsVisible = true;
    const observers: Array<IntersectionObserver> = [];

    /* ---------------- 1. speaker media ---------------- */
    const collectCards = () => {
      cards = [];
      const frames = Array.from(document.querySelectorAll<HTMLElement>('.spk__img'));
      if (!frames.length) return;

      // One batched read pass. Never interleave reads and writes here.
      const rects = frames.map((f) => ({ f, r: f.getBoundingClientRect() }));

      for (const { f, r } of rects) {
        const media = f.querySelector<HTMLElement>('img, .spk__ini');
        if (!media) continue;
        cards.push({
          frame: f,
          media,
          top: r.top + window.scrollY,
          h: r.height,
          range: r.height * CONFIG.drift
        });
      }
    };

    const observeCards = () => {
      if (!('IntersectionObserver' in window)) {
        cards.forEach((c) => live.add(c));
        return;
      }
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            const card = cards.find((c) => c.frame === e.target);
            if (!card) continue;
            if (e.isIntersecting) {
              live.add(card);
              card.frame.classList.add('is-live');
              start();
            } else {
              live.delete(card);
              card.frame.classList.remove('is-live');
            }
          }
        },
        { rootMargin: '220px 0px' } // settle before it is actually visible
      );
      cards.forEach((c) => io.observe(c.frame));
      observers.push(io);
    };

    const drawCards = () => {
      live.forEach((c) => {
        // progress 0 -> 1 as the card travels bottom-of-screen to top-of-screen
        let p = (scrollY + vh - c.top) / (vh + c.h);
        p = p < 0 ? 0 : p > 1 ? 1 : p;
        const y = (p - 0.5) * c.range;
        c.media.style.transform = `translate3d(0,${y.toFixed(2)}px,0)`;
      });
    };

    /* ---------------- 2. the marquee bands ---------------- */
    const collectMarquees = () => {
      const tracks = Array.from(document.querySelectorAll<HTMLElement>('.marquee__track'));
      marquees = [];

      for (const track of tracks) {
        if (!track.children.length) continue;

        // each strip is rendered twice, so half the width is one full loop
        const half = track.scrollWidth / 2;
        if (!half) continue;

        track.classList.add('is-js');
        marquees.push({
          track,
          half,
          offset: 0,
          speed: CONFIG.marqueeIdle,
          dir: track.dataset.dir === 'right' ? -1 : 1
        });
      }

      if (!marquees.length || !('IntersectionObserver' in window)) return;

      // One observer for the whole band group — they are always on screen
      // together, and two observers watching one strip is two callbacks for
      // one fact.
      const group =
        marquees[0].track.closest('.ribbons') ??
        marquees[0].track.parentElement ??
        marquees[0].track;

      const io = new IntersectionObserver(
        ([e]) => {
          bandsVisible = e.isIntersecting;
          if (bandsVisible) start();
        },
        { rootMargin: '120px 0px' }
      );
      io.observe(group);
      observers.push(io);
    };

    const drawMarquees = (dt: number, scrollVel: number) => {
      if (!bandsVisible) return;

      // scroll velocity pushes the bands along, then bleeds back to resting
      // speed. Both bands share the push; only their direction differs.
      const push = Math.max(
        -CONFIG.marqueeMax,
        Math.min(CONFIG.marqueeMax, scrollVel * CONFIG.marqueePush)
      );
      const target = CONFIG.marqueeIdle + push;

      for (const mq of marquees) {
        mq.speed += (target - mq.speed) * CONFIG.marqueeDecay;
        mq.offset -= mq.dir * mq.speed * dt;

        // Normalise into (-half, 0] so the loop is seamless whichever way it
        // is running — including backwards, when the page is scrolled up.
        mq.offset %= mq.half;
        if (mq.offset > 0) mq.offset -= mq.half;

        mq.track.style.transform = `translate3d(${mq.offset.toFixed(2)}px,0,0)`;
      }
    };

    /* ---------------- the single loop ---------------- */
    const frame = (now: number) => {
      const dt = lastT ? Math.min((now - lastT) / 1000, 0.05) : 0.016; // cap after a stall
      lastT = now;

      scrollY = window.scrollY;
      const scrollVel = dt > 0 ? (scrollY - lastY) / dt : 0;
      lastY = scrollY;

      drawCards();
      drawMarquees(dt, scrollVel);

      // keep going only while there is something to move
      const busy = live.size > 0 || (marquees.length > 0 && bandsVisible);
      if (busy && !document.hidden) {
        rafId = requestAnimationFrame(frame);
      } else {
        running = false;
        rafId = null;
        lastT = 0;
      }
    };

    function start() {
      if (running || document.hidden) return;
      running = true;
      lastT = 0;
      lastY = window.scrollY;
      rafId = requestAnimationFrame(frame);
    }

    /* ---------------- wiring ---------------- */
    const measure = () => {
      vh = window.innerHeight;
      collectCards();
      for (const mq of marquees) mq.half = mq.track.scrollWidth / 2;
      drawCards();
    };

    collectCards();
    if (!cards.length) return;

    observeCards();
    collectMarquees();
    drawCards();
    start();

    let rt: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (rt) clearTimeout(rt);
      rt = setTimeout(measure, 180);
    };

    // Card positions move when images finish loading or the layout reflows.
    document.querySelectorAll<HTMLImageElement>('.spk__img img').forEach((img) => {
      if (!img.complete) img.addEventListener('load', schedule, { once: true });
    });

    const onVisible = () => {
      if (!document.hidden) start();
    };

    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('orientationchange', schedule, { passive: true });
    window.addEventListener('scroll', start, { passive: true });
    document.addEventListener('visibilitychange', onVisible);
    document.fonts?.ready.then(schedule).catch(() => {});

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (rt) clearTimeout(rt);
      observers.forEach((io) => io.disconnect());
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', schedule);
      window.removeEventListener('scroll', start);
      document.removeEventListener('visibilitychange', onVisible);
      cards.forEach((c) => {
        c.media.style.transform = '';
        c.frame.classList.remove('is-live');
      });
      marquees.forEach((mq) => {
        mq.track.style.removeProperty('transform');
        mq.track.classList.remove('is-js');
      });
    };
  }, []);
}
