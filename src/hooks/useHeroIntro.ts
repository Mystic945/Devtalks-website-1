/* ============================================================
   DEVTALKS — HERO ENTRANCE
   ------------------------------------------------------------
   The wordmark rises line by line out of its mask, the theme
   follows it word by word, and the supporting rows fade up
   behind both. Runs once, when the door intro hands over.

   The words are already split into `.word > i` by <SplitText>,
   so nothing here rewrites markup React owns — it only reads the
   spans that are already there and animates them.

   Under reduced motion, or if GSAP never loads, every element
   here is left in its finished state rather than its starting
   one: a page that does not animate is still a correct page.
   ============================================================ */

import { useEffect, type RefObject } from 'react';
import { gsap } from '@/lib/gsap';
import { prefersReducedMotion } from '@/lib/dom';

export function useHeroIntro(heroRef: RefObject<HTMLElement>, play: boolean): void {
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || !play) return;

    const lines = hero.querySelectorAll<HTMLElement>('.hero__title .line > span');
    const themeWords = hero.querySelectorAll<HTMLElement>('#heroTheme .word > i');
    const rows = hero.querySelectorAll<HTMLElement>(
      '.hero__tag, .hero__meta, .hero__actions, .count'
    );

    if (prefersReducedMotion()) {
      lines.forEach((s) => {
        s.style.transform = 'none';
      });
      themeWords.forEach((w) => {
        w.style.transform = 'none';
      });
      rows.forEach((r) => {
        r.style.opacity = '1';
        r.style.transform = 'none';
      });
      return;
    }

    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

    // y:0 in the "from" clears the CSS translateY(%) so it does not stack
    // on top of yPercent and double the travel.
    tl.fromTo(lines, { yPercent: 105, y: 0 }, { yPercent: 0, y: 0, duration: 1.3, stagger: 0.1 }, 0)
      .fromTo(
        themeWords,
        { yPercent: 100, y: 0 },
        { yPercent: 0, y: 0, duration: 0.9, stagger: 0.035 },
        0.35
      )
      .to(rows, { opacity: 1, y: 0, duration: 0.9, stagger: 0.09 }, 0.5);

    return () => {
      tl.kill();
    };
  }, [heroRef, play]);
}
