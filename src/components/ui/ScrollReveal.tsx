/* ============================================================
   SCROLL REVEAL  (adapted from React Bits)
   ------------------------------------------------------------
   Text that resolves as you scroll through it: each word rises
   out of a blur and up to full opacity, staggered, scrubbed
   against scroll position rather than fired once.

   WHAT WAS CHANGED FROM THE UPSTREAM COMPONENT, AND WHY
   The published version is written for a page that has one or
   two of these. This site has one in every section and fourteen
   more in the schedule, so three things had to change:

   1. ONE ScrollTrigger PER INSTANCE, NOT THREE.
      Upstream builds a separate tween — and therefore a separate
      ScrollTrigger — for rotation, for opacity and for blur. The
      opacity and blur tweens are given identical trigger
      configuration, so they are merged here into a single tween
      that animates both. Rotation keeps its own trigger only
      when a rotation was actually asked for. Across this site
      that is ~22 ScrollTriggers instead of ~66.

   2. will-change IS A LEASE, NOT A LABEL.
      Upstream sets `will-change: opacity` in the tween's from-vars
      and the stylesheet adds `will-change: opacity, filter` to
      every word forever. On this page that is several hundred
      permanently promoted layers. Here the hint is taken while
      the reveal is actually on screen and handed back after.

   3. IT CLEANS UP AFTER ITSELF.
      Upstream's cleanup calls ScrollTrigger.getAll().kill(),
      which would destroy every other scroll effect on the page —
      the gallery scrub, the card stack, the nav links. Everything
      here is built inside a gsap.context and reverted with it.

   Reduced motion renders the finished text and builds nothing.
   ============================================================ */

import React, { useEffect, useMemo, useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { cn } from '@/lib/utils';
import { prefersReducedMotion } from '@/lib/dom';

import './ScrollReveal.css';

export interface ScrollRevealProps {
  children: React.ReactNode;
  scrollContainerRef?: React.RefObject<HTMLElement | Window>;
  enableBlur?: boolean;
  baseOpacity?: number;
  baseRotation?: number;
  blurStrength?: number;
  containerClassName?: string;
  textClassName?: string;
  rotationEnd?: string;
  wordAnimationEnd?: string;
  as?: React.ElementType;
  /** Fired once, the first time the text is fully resolved. Used to hand
   *  over to a follow-on animation — see the typed lines in the schedule. */
  onReveal?: () => void;
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  scrollContainerRef,
  enableBlur = true,
  baseOpacity = 0.1,
  baseRotation = 3,
  blurStrength = 4,
  containerClassName = '',
  textClassName = '',
  rotationEnd = 'bottom bottom',
  wordAnimationEnd = 'bottom bottom',
  as: Component = 'div',
  onReveal
}) => {
  const containerRef = useRef<HTMLElement>(null);

  /* The callback is read through a ref so that a caller passing an inline
     arrow function does not tear down and rebuild the ScrollTrigger on
     every render. */
  const onRevealRef = useRef(onReveal);
  onRevealRef.current = onReveal;

  const splitText = useMemo(() => {
    if (typeof children !== 'string') return children;
    return children.split(/(\s+)/).map((word, index) => {
      if (word.match(/^\s+$/)) return word;
      return (
        <span className="scroll-reveal__word" key={index}>
          {word}
        </span>
      );
    });
  }, [children]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const words = el.querySelectorAll<HTMLElement>('.scroll-reveal__word');

    /* Reduced motion: the declared state is already the finished state, so
       there is nothing to undo — just tell the caller it is "revealed" so
       whatever waits on that still runs. */
    if (prefersReducedMotion()) {
      onRevealRef.current?.();
      return;
    }

    let revealed = false;

    /* Fired from every path that can reach full progress, because no single
       one of them covers all three: scrubbing through the range fires
       onUpdate; jumping past the end (an anchor link, a restored scroll
       position) fires onLeave without a final onUpdate; and a row that is
       already behind the fold when the page loads is simply created at
       progress 1. The flag makes it idempotent. */
    const markRevealed = () => {
      if (revealed) return;
      revealed = true;
      onRevealRef.current?.();
    };

    const ctx = gsap.context(() => {
      const scroller =
        scrollContainerRef && scrollContainerRef.current
          ? scrollContainerRef.current
          : window;

      /* The tilt. Its own trigger, and only when one was asked for — most
         callers on this site pass 0 and skip it entirely. */
      if (baseRotation !== 0) {
        gsap.fromTo(
          el,
          { transformOrigin: '0% 50%', rotate: baseRotation },
          {
            ease: 'none',
            rotate: 0,
            scrollTrigger: {
              trigger: el,
              scroller,
              start: 'top bottom',
              end: rotationEnd,
              scrub: true
            }
          }
        );
      }

      if (!words.length) return;

      /* Opacity and blur in ONE tween: upstream gives them separate tweens
         with identical trigger configuration, which is two ScrollTriggers
         doing one job. */
      const from: gsap.TweenVars = { opacity: baseOpacity };
      const to: gsap.TweenVars = { opacity: 1, ease: 'none', stagger: 0.05 };

      if (enableBlur) {
        from.filter = `blur(${blurStrength}px)`;
        to.filter = 'blur(0px)';
      }

      to.scrollTrigger = {
        trigger: el,
        scroller,
        start: 'top bottom-=15%',
        end: wordAnimationEnd,
        scrub: true,

        onToggle: (self) => {
          // Promote the words only while the reveal is on screen.
          const hint = self.isActive ? 'opacity, filter' : '';
          words.forEach((w) => {
            w.style.willChange = hint;
          });
        },

        onUpdate: (self) => {
          if (self.progress >= 0.999) markRevealed();
        },

        onLeave: () => {
          markRevealed();
          /* Past the end the text is simply text. A filter of any value —
             including blur(0px) — keeps every word on its own composited
             layer, so it is cleared rather than parked at zero. GSAP will
             write it again if the visitor scrolls back up. */
          words.forEach((w) => {
            w.style.filter = '';
            w.style.willChange = '';
          });
        },

        onRefresh: (self) => {
          if (self.progress >= 0.999) markRevealed();
        }
      };

      gsap.fromTo(words, from, to);
    }, el);

    return () => {
      ctx.revert();
    };
  }, [
    scrollContainerRef,
    enableBlur,
    baseRotation,
    baseOpacity,
    rotationEnd,
    wordAnimationEnd,
    blurStrength,
    children
  ]);

  return (
    <Component ref={containerRef} className={cn('scroll-reveal', containerClassName)}>
      <span className={cn('scroll-reveal-text', textClassName)}>{splitText}</span>
    </Component>
  );
};

export default ScrollReveal;
