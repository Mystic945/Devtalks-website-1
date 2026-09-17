/* ============================================================
   DEVTALKS — THE REEL  (paper edition only)
   ------------------------------------------------------------
   A strip of vertical 9:16 cards running continuously across
   the page, above the FAQ.

   EMPTY BY DESIGN
   REELS in js/data-3.js ships with six blank entries, so the
   strip animates correctly before any footage exists. A blank
   entry renders as a numbered slot with a play mark. Fill in
   src (and optionally poster) and that same slot becomes a
   playing clip — no markup or CSS changes needed.

   THE LOOP
   The track holds the cards twice and slides exactly -50%, so
   the second copy is under the cursor at the moment the first
   finishes and the seam never shows. It is one CSS keyframe on
   one element: the compositor owns it and the main thread never
   sees a frame of it.

   Duration scales with the number of cards, so adding a
   seventh does not make the strip run faster — each card
   crosses the screen at the same speed either way.

   VIDEO, WHEN IT ARRIVES
   Clips are muted, looping and inline, and an IntersectionObserver
   pauses every one of them while the section is off screen.
   Six vertical videos decoding behind the FAQ would undo the
   frame budget the rest of this page was tuned to.
   ============================================================ */

(function () {
  'use strict';

  const CONFIG = {
    secondsPerCard: 5.5,   // how long one card takes to cross the strip
    minCards:       6      // pad the track out if REELS is shorter than this
  };

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
               '<path d="M9 7.5v9l7.5-4.5z" fill="currentColor"/>' +
               '<circle cx="12" cy="12" r="10.2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';

  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function card(item, i) {
    const n = String(i + 1).padStart(2, '0');
    let media;

    if (item.src) {
      media = '<video class="reel__v" muted loop playsinline preload="none"' +
              (item.poster ? ' poster="' + esc(item.poster) + '"' : '') +
              '><source src="' + esc(item.src) + '" type="video/mp4" /></video>';
    } else if (item.poster) {
      media = '<img class="reel__v" src="' + esc(item.poster) + '" alt="" loading="lazy" />';
    } else {
      // the empty slot — a real state, not a broken one
      media = '<span class="reel__slot">' +
                '<span class="reel__play">' + PLAY + '</span>' +
                '<span class="reel__n">' + n + '</span>' +
              '</span>';
    }

    return '<figure class="reel__card"' + (item.src ? '' : ' data-empty') + '>' +
             '<div class="reel__frame">' + media + '</div>' +
             (item.label ? '<figcaption class="reel__cap">' + esc(item.label) + '</figcaption>' : '') +
           '</figure>';
  }

  /* Videos are only worth decoding while the strip is on screen. */
  function gate(section, track) {
    const vids = track.querySelectorAll('video');
    if (!vids.length || !('IntersectionObserver' in window)) return;

    new IntersectionObserver((es) => {
      const on = es[0].isIntersecting && !REDUCED;
      vids.forEach(v => {
        if (on) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
        else v.pause();
      });
    }, { threshold: 0 }).observe(section);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) vids.forEach(v => v.pause());
    });
  }

  function init() {
    const track = document.getElementById('reelTrack');
    const section = document.querySelector('.sec--reel');
    if (!track || !section) return;

    let list = (typeof REELS !== 'undefined' && REELS.length) ? REELS.slice() : [];
    while (list.length < CONFIG.minCards) list.push({ src: '', poster: '', label: '' });

    const strip = list.map(card).join('');

    // twice, so a -50% slide lands exactly on the seam
    track.innerHTML = strip + strip;
    track.setAttribute('aria-hidden', 'true');
    track.style.setProperty('--reel-time', (list.length * CONFIG.secondsPerCard).toFixed(1) + 's');

    section.classList.toggle('is-empty', list.every(r => !r.src && !r.poster));
    gate(section, track);
  }

  document.addEventListener('devtalks:content', () => setTimeout(init, 0), { once: true });
})();
