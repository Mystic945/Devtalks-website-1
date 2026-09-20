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

export { gsap, ScrollTrigger };
