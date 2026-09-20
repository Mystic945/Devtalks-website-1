/* ============================================================
   DEVTALKS — REVEAL FOOTER  (paper edition only)
   ------------------------------------------------------------
   The footer is pinned to the bottom of the viewport and the
   page scrolls over it, so it is uncovered rather than scrolled
   to. The last screen of the site is a door opening, not another
   block arriving.

   HOW
   The footer is fixed at z-index 0 and <main> sits above it at
   z-index 1 with the paper ground painted on it. Giving main a
   bottom margin equal to the footer's height adds exactly enough
   scroll for the footer to clear — no scroll hijacking, no
   duplicate copy, and window.scrollY stays the real one, which
   js/flow.js depends on.

   WHEN NOT TO
   A pinned footer taller than the window can never be fully
   uncovered — you would scroll to the end and still be missing
   its last rows. So the height is measured first, and if it does
   not comfortably fit, the footer stays in normal flow and this
   file does nothing else. That is the common case on a phone.

   Re-measured on resize and whenever the footer's own box
   changes, because its height is what the whole effect is
   calibrated to.
   ============================================================ */

(function () {
  'use strict';

  const FIT = 0.86;   // fraction of the viewport the footer must fit inside

  let foot, main, on = false;

  function apply() {
    // measure in the static state, or we measure a footer that is already
    // pinned and out of flow
    foot.classList.remove('is-revealing');
    main.style.marginBottom = '';

    const h = foot.offsetHeight;
    const fits = h > 0 && h <= window.innerHeight * FIT;

    if (!fits) { on = false; return; }

    foot.classList.add('is-revealing');
    main.style.marginBottom = h + 'px';
    on = true;
  }

  function init() {
    foot = document.getElementById('siteFoot');
    main = document.querySelector('main');
    if (!foot || !main) return;

    apply();

    let t = null;
    const later = () => { clearTimeout(t); t = setTimeout(apply, 120); };

    window.addEventListener('resize', later, { passive: true });
    window.addEventListener('load', later);

    // The socials list is written by js/main.js and the columns wrap at
    // different widths; both change the height this is calibrated to.
    if ('ResizeObserver' in window) new ResizeObserver(later).observe(foot);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.DevTalksFooter = { revealing: () => on, remeasure: () => apply() };
})();
