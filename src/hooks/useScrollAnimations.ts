/* ============================================================
   DEVTALKS — SCROLL-TRIGGERED MOTION
   ------------------------------------------------------------
   The page-wide reveals, in one place:

     [data-reveal]  fade and rise once, as they reach the fold
     [data-split]   headings that arrive word by word, each word
                    resolving out of a blur as it rises
     [data-count]   statistics that count up to their value
     .foot__huge    the giant footer wordmark, parallaxed
     section[id]    marks the matching nav link active

   The hero is skipped throughout — useHeroIntro owns its
   timeline, and two timelines writing one transform is the bug
   this whole codebase is arranged to avoid.

   NO-MOTION PATH
   [data-reveal] starts at opacity 0 in CSS, so if GSAP is absent
   or motion is reduced this hook still has to put every one of
   them back to visible. That branch is not a nicety; without it
   the page is blank.
   ============================================================ */

import { useEffect } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { prefersReducedMotion } from '@/lib/dom';

export function useScrollAnimations(play: boolean): void {
  useEffect(() => {
    if (!play) return;

    const all = <T extends Element>(sel: string) =>
      Array.from(document.querySelectorAll<T>(sel));

    const reveals = all<HTMLElement>('[data-reveal]');
    const splits = all<HTMLElement>('[data-split]');
    const counts = all<HTMLElement>('[data-count]');

    /* The static page: every animated element in its finished state. Used
       both for reduced motion and as the failsafe below. */
    const showEverything = () => {
      reveals.forEach((el) => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      splits.forEach((el) => {
        el.querySelectorAll<HTMLElement>('.word > i').forEach((w) => {
          w.style.transform = 'none';
          w.style.filter = '';
        });
      });
      counts.forEach((b) => {
        b.textContent = (b.dataset.count ?? '') + (b.dataset.suffix ?? '');
      });
    };

    if (prefersReducedMotion()) {
      showEverything();
      return;
    }

    /* FAILSAFE: [data-reveal] starts at opacity 0 in CSS and is animated up
       by GSAP — and GSAP advances on requestAnimationFrame. Where rAF never
       ticks (a background tab, aggressive power saving, some webviews) the
       tweens never run and the page sits blank rather than merely unanimated.

       So: ask for one frame. If it has not arrived, animation is not
       available here and the page is shown the way reduced motion shows it.
       Content visibility must never depend on an animation. */
    let ticked = false;
    const probe = requestAnimationFrame(() => {
      ticked = true;
    });
    const failsafe = setTimeout(() => {
      if (!ticked) showEverything();
    }, 2500);

    const ctx = gsap.context(() => {
      // Generic reveals (the hero's timeline owns its own)
      reveals.forEach((el) => {
        if (el.closest('.hero')) return;
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true }
        });
      });

      // Split headings — the spans already exist, see <SplitText>.
      //
      // The blur is the one thing added to this tween after the port: each
      // word resolves as it rises, which is the `IdentitySequence` treatment
      // on the reference site. It is cleared to the empty string rather than
      // left at blur(0px), because a filter of any value keeps the element on
      // its own composited layer for the rest of the session.
      splits.forEach((el) => {
        if (el.closest('.hero')) return;
        const words = el.querySelectorAll<HTMLElement>('.word > i');
        if (!words.length) return;
        gsap.fromTo(
          words,
          { yPercent: 100, y: 0, filter: 'blur(4px)' },
          {
            yPercent: 0,
            y: 0,
            filter: 'blur(0px)',
            duration: 1,
            ease: 'expo.out',
            stagger: 0.03,
            scrollTrigger: { trigger: el, start: 'top 86%', once: true },
            onComplete: () => {
              words.forEach((w) => {
                w.style.filter = '';
              });
            }
          }
        );
      });

      // Counting statistics
      counts.forEach((b) => {
        const target = parseFloat(b.dataset.count ?? '0');
        const suffix = b.dataset.suffix ?? '';
        const obj = { v: 0 };
        gsap.to(obj, {
          v: target,
          duration: 1.8,
          ease: 'power2.out',
          scrollTrigger: { trigger: b, start: 'top 90%', once: true },
          onUpdate: () => {
            b.textContent = Math.round(obj.v) + suffix;
          }
        });
      });

      // Parallax on the giant footer wordmark
      if (document.querySelector('.foot__huge')) {
        gsap.to('.foot__huge', {
          yPercent: -14,
          ease: 'none',
          scrollTrigger: {
            trigger: '.foot',
            start: 'top bottom',
            end: 'bottom bottom',
            scrub: true
          }
        });
      }

      // Active nav link
      all<HTMLElement>('section[id]').forEach((sec) => {
        const link = document.querySelector<HTMLElement>(`.nav__links a[href="#${sec.id}"]`);
        if (!link) return;
        ScrollTrigger.create({
          trigger: sec,
          start: 'top 45%',
          end: 'bottom 45%',
          onToggle: (self) => link.classList.toggle('is-active', self.isActive)
        });
      });
    });

    return () => {
      cancelAnimationFrame(probe);
      clearTimeout(failsafe);
      ctx.revert();
    };
  }, [play]);
}
