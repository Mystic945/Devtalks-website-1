/* ============================================================
   DEVTALKS — COMIC ACTION PANELS  (paper edition only)
   ------------------------------------------------------------
   The speed-line panels from the reference sheet:

     SCHEDULE  a set behind the run of show, so the timetable
               reads as a comic page rather than a table with a
               border.

   The footer used to carry three of these panels too. It does
   not any more — it is the one surface on the page that is
   deliberately not comic.

   Each panel's lines are tapered polygons that sharpen to a
   point (js/doodle-art.js rays()), drawn into an SVG sized to
   the panel and clipped by it. That taper is the whole trick:
   parallel strokes read as hatching, converging tapered ones
   read as impact.

   Deterministic — every panel has a fixed seed, so the page is
   the same drawing on every load.
   ============================================================ */

(function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';

  function panelSVG(cfg) {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'rays');
    svg.setAttribute('viewBox', '0 0 100 100');
    // 'slice', not 'none': stretching a square viewBox across a panel four
    // times as wide smears every ray into a wedge. Slice keeps them true and
    // crops the overflow, which the panel was going to clip anyway.
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    const g = document.createElementNS(NS, 'g');
    window.DevTalksDoodleArt.rays({
      cx: cfg.vx, cy: cfg.vy,
      inner: 1, outer: 190,
      count: cfg.count,
      width: cfg.width,
      seed: cfg.seed
    }).forEach((pts) => {
      const poly = document.createElementNS(NS, 'polygon');
      poly.setAttribute('points', pts);
      g.appendChild(poly);
    });

    svg.appendChild(g);
    return svg;
  }

  /* ---- schedule ---------------------------------------------- */
  function schedule() {
    const sec = document.querySelector('.sec--schedule');
    const list = sec && sec.querySelector('.sched');
    if (!list || sec.classList.contains('sched--comic')) return;

    // One wide panel behind the whole run of show, lines converging on the
    // top-left where the day starts.
    const back = document.createElement('div');
    back.className = 'sched__rays';
    back.setAttribute('aria-hidden', 'true');
    back.appendChild(panelSVG({ vx: 4, vy: 4, count: 280, width: 0.45, seed: 409 }));
    list.parentNode.insertBefore(back, list);

    // Every row becomes a panel. The distinction is already in the data:
    // a talk is a scene and gets a full panel, a break is a beat and gets a
    // caption strip. Nothing here varies for the sake of varying.
    Array.prototype.forEach.call(list.children, (li) => {
      li.classList.add('sched__panel');
    });

    sec.classList.add('sched--comic');
  }

  function init() {
    if (!window.DevTalksDoodleArt) return;
    schedule();
  }

  document.addEventListener('devtalks:content', () => setTimeout(init, 0), { once: true });
})();
