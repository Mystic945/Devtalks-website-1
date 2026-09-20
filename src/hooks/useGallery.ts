/* ============================================================
   DEVTALKS — THE UNFURLING PHOTO WALL
   ------------------------------------------------------------
   A panel pins to the screen and opens from a rounded frame to
   full-bleed. A wall of photos in four columns zooms up out of
   the distance and settles as you scroll, the columns sliding
   past each other at different speeds.

   One scroll position drives all of it. Progress p runs 0 -> 1
   over the length of the track:

     0    -> .15   the panel opens (clip-path, not width/height,
                   so the photos never reflow)
     .15  -> 1     the wall zooms from about 0.56x to 1x, and each
                   column drifts on its own vertical path

   The wall used to swing out of a tilted 3D pose as well; that is
   gone, and with it the perspective context and the preserve-3d
   layers, which were the expensive part. The zoom is the same one
   the perspective produced, worked out as a plain scale.

   Reduced motion, or no GSAP: nothing here runs and
   styles/gallery.css shows the finished wall as a single static
   screen.

   Tuning knobs are in CONFIG.
   ============================================================ */

import { useEffect, type RefObject } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { lerp, prefersReducedMotion, seg } from '@/lib/dom';

const CONFIG = {
  unfurl: 0.15, // share of the scroll spent opening the banner
  /** seconds of smoothing between scroll and motion — kept short: any more
   *  and the wall trails the page */
  scrub: 0.12,
  radius: 48 // banner corner radius, px, while it is a frame
} as const;

export function useGallery(
  trackRef: RefObject<HTMLElement>,
  bannerRef: RefObject<HTMLElement>,
  matrixRef: RefObject<HTMLElement>
): void {
  useEffect(() => {
    const track = trackRef.current;
    const banner = bannerRef.current;
    const matrix = matrixRef.current;
    if (!track || !banner || !matrix) return;

    /* The photos are lazy, but the wall spends its first screens tiny, so the
       browser's own "near the viewport" test would fetch them late. Once the
       section is a screen and a half away, load everything. */
    const imgs = Array.from(matrix.querySelectorAll<HTMLImageElement>('img'));
    const eager = () => imgs.forEach((i) => (i.loading = 'eager'));

    let primer: IntersectionObserver | null = null;
    if ('IntersectionObserver' in window) {
      primer = new IntersectionObserver(
        (es) => {
          if (!es[0].isIntersecting) return;
          eager();
          primer?.disconnect();
        },
        { rootMargin: '150% 0px' }
      );
      primer.observe(track);
    } else {
      eager();
    }

    if (prefersReducedMotion()) return () => primer?.disconnect();

    const cols = Array.from(matrix.querySelectorAll<HTMLElement>('.gal__col'));
    const dims = { ix: 0, iy: 0 };
    const last: { clip: string | null; matrix: string | null; cols: string[] } = {
      clip: null,
      matrix: null,
      cols: []
    };

    /* Banner size is measured, never animated. The frame's inset is worked
       out from it: the original look is a 90vw x 80vh window, capped at the
       banner's own 1920px. */
    const measure = () => {
      const W = banner.offsetWidth;
      const H = banner.offsetHeight;
      dims.ix = Math.max(0, (W - Math.min(window.innerWidth * 0.9, 1920)) / 2);
      dims.iy = H * 0.1;
    };

    const render = (p: number) => {
      // -- the banner opening --
      const open = seg(p, 0, CONFIG.unfurl);
      const k = 1 - open;
      const clip =
        open >= 1
          ? 'none'
          : `inset(${(dims.iy * k).toFixed(1)}px ${(dims.ix * k).toFixed(1)}px round ${(
              CONFIG.radius * k
            ).toFixed(1)}px)`;
      if (clip !== last.clip) {
        banner.style.clipPath = clip;
        last.clip = clip;
      }

      // -- the wall zooms up out of the distance --
      // Pushing a flat wall back by z under a 1000px perspective scales it by
      // 1000 / (1000 - z). Working that out here gives the same zoom, from
      // z = -800 (about 0.56x) to z = 0 (1x), without a 3D context.
      const m = seg(p, CONFIG.unfurl, 1);
      const scale = 1000 / (1000 - lerp(-800, 0, m));
      const t = m >= 1 ? 'none' : `scale(${scale.toFixed(4)})`;
      if (t !== last.matrix) {
        matrix.style.transform = t;
        last.matrix = t;
      }

      // -- each column's drift, as a percentage of its own height --
      const y = [lerp(0, -40, m), lerp(-40, 10, m), lerp(0, -40, m), lerp(-30, 20, m)];
      for (let i = 0; i < cols.length; i++) {
        const s = `translateY(${y[i].toFixed(2)}%)`;
        if (s !== last.cols[i]) {
          cols[i].style.transform = s;
          last.cols[i] = s;
        }
      }
    };

    track.classList.add('is-scrubbed');
    measure();
    render(0);

    const state = { p: 0 };
    const ctx = gsap.context(() => {
      // p is a plain number tweened by scroll. scrub gives it a little
      // inertia, which is what makes the wall feel weighted, not wired.
      gsap.to(state, {
        p: 1,
        ease: 'none',
        onUpdate: () => render(state.p),
        scrollTrigger: {
          trigger: track,
          start: 'top top',
          end: 'bottom bottom',
          scrub: CONFIG.scrub
        }
      });

      // will-change only while the section can actually be seen
      ScrollTrigger.create({
        trigger: track,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: (self) => track.classList.toggle('is-live', self.isActive)
      });
    });

    // the track just grew by several screens: everything below it moved
    const onRefresh = () => {
      measure();
      render(state.p);
    };
    ScrollTrigger.addEventListener('refresh', onRefresh);
    ScrollTrigger.refresh();

    return () => {
      ScrollTrigger.removeEventListener('refresh', onRefresh);
      ctx.revert();
      primer?.disconnect();
      track.classList.remove('is-scrubbed', 'is-live');
      banner.style.removeProperty('clip-path');
      matrix.style.removeProperty('transform');
      cols.forEach((c) => c.style.removeProperty('transform'));
    };
  }, [trackRef, bannerRef, matrixRef]);
}
