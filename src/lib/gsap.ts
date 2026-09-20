/* ============================================================
   DEVTALKS — GSAP, REGISTERED ONCE
   ------------------------------------------------------------
   Every hook imports gsap from here rather than from the package
   directly, so ScrollTrigger is registered exactly once no matter
   which hook happens to run first. Registering it twice is
   harmless but registering it nowhere is not, and "nowhere" is
   what you get when each module assumes another one did it.
   ============================================================ */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* In development only, put both on `window` so a scroll effect can be
   inspected and stepped from the console:
   `ScrollTrigger.getAll().map(t => [t.trigger.className, t.progress])`.
   Stripped from the production bundle by the constant folding on
   `import.meta.env.DEV`. */
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).gsap = gsap;
  (window as unknown as Record<string, unknown>).ScrollTrigger = ScrollTrigger;
}

export { gsap, ScrollTrigger };
