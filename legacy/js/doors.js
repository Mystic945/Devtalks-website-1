/* ============================================================
   DEVTALKS — AUDITORIUM DOOR INTRO
   ------------------------------------------------------------
   Registers itself as window.DevTalksIntro. js/main.js hands the
   opening sequence to whatever is registered here instead of
   running its own preloader.

   Nothing on the page waits for this. The hero is fully rendered
   underneath; the doors are an overlay that leaves.

   Tuning knobs are in TIMING below.
   ============================================================ */

window.DevTalksIntro = (function () {
  'use strict';

  /* Budget: the whole sequence clears in about a second. The page spends
     roughly 300ms booting before this runs, and during that time the viewer
     is already looking at a closed door with the wordmark on it — so the
     numbers below are what's left, not the whole first impression. */
  const TIMING = {
    seam:    0.18,   // seam light ramps up
    judder:  0.11,   // the unlock — panels tighten inward, then release
    shove:   10,     // px each panel tightens inward before releasing
    open:    0.85,   // panels travel clear of the screen
    handoff: 0.26,   // page takes over this long after the panels start moving
    drift:   80      // extra px each wordmark half travels past its panel
  };

  const KEY = 'devtalks-doors-seen';   // once per browser session

  function seen() {
    try { return sessionStorage.getItem(KEY) === '1'; } catch (e) { return false; }
  }
  function markSeen() {
    try { sessionStorage.setItem(KEY, '1'); } catch (e) { /* private mode — just replay */ }
  }

  function finish(el) {
    if (el) el.classList.add('is-gone');
    document.body.classList.remove('is-locked');
    markSeen();
  }

  function run(done) {
    const el = document.getElementById('doors');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // No overlay, no GSAP, reduced motion, or already seen this session:
    // hand straight over. The page never depends on the animation.
    if (!el || reduced || typeof gsap === 'undefined' || seen()) {
      finish(el);
      done();
      return;
    }

    document.body.classList.add('is-locked');

    const L = el.querySelector('.door--l');
    const R = el.querySelector('.door--r');
    const ML = el.querySelector('.door--l .door__mark');
    const MR = el.querySelector('.door--r .door__mark');
    const seam = el.querySelector('.doors__seam');
    const glow = el.querySelector('.doors__glow');

    let handed = false;
    const handOver = () => { if (!handed) { handed = true; done(); } };

    const tl = gsap.timeline({
      onComplete: () => { finish(el); handOver(); }
    });

    // 1 — the seam wakes up
    tl.fromTo([seam, glow],
        { opacity: 0 },
        { opacity: 1, duration: TIMING.seam, ease: 'power2.out' }, 0)
      .fromTo(seam, { scaleY: .35 }, { scaleY: 1, duration: TIMING.seam + .12, ease: 'power3.out' }, 0)

    // 2 — the unlock: panels tighten inward against each other, then release.
    //     This is what gives the open its sense of weight.
      .to([L, R], { x: (i) => (i === 0 ? TIMING.shove : -TIMING.shove),
                    duration: TIMING.judder, ease: 'power2.in' }, TIMING.seam)
      .to([ML, MR], { x: (i) => (i === 0 ? TIMING.shove : -TIMING.shove),
                      duration: TIMING.judder, ease: 'power2.in' }, TIMING.seam)

    // 3 — the doors part. power2.inOut spreads the travel across the whole
    //     duration so you watch them move; a power4.out would throw them 90%
    //     of the way in the first quarter and the rest happens off-screen,
    //     which reads as fast however long the tween actually is.
      .to(L, { xPercent: -101, x: 0, duration: TIMING.open, ease: 'power2.inOut' }, '>')
      .to(R, { xPercent: 101,  x: 0, duration: TIMING.open, ease: 'power2.inOut' }, '<')

    // the wordmark halves run slightly ahead of their panels, so the word
    // looks torn apart rather than merely carried away
      .to(ML, { x: -TIMING.drift, duration: TIMING.open, ease: 'power2.inOut' }, '<')
      .to(MR, { x:  TIMING.drift, duration: TIMING.open, ease: 'power2.inOut' }, '<')
      .to([ML, MR], { opacity: 0, duration: TIMING.open * .62, ease: 'power2.in' }, '<')

    // The seam is light escaping through the gap, so it has to die almost
    // immediately — left to linger it reads as an orange smear over the page.
      .to(glow, { opacity: 0, duration: .30, ease: 'power2.in' }, '<')
      .to(seam, { opacity: 0, duration: .18, ease: 'power2.in' }, '<')

    // 4 — the page takes over while the doors are still clearing, so the
    //     headline is already rising as the gap widens
      .call(handOver, null, TIMING.seam + TIMING.judder + TIMING.handoff);
  }

  return { run: run };
})();
