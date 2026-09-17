/* ============================================================
   DEVTALKS — THE REEL  (paper edition only)
   ------------------------------------------------------------
   A strip of vertical 9:16 cards running continuously across
   the page, above the FAQ. Clicking one opens it large.

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

   Only the FIRST copy is real. The duplicate is aria-hidden
   with its buttons taken out of the tab order — focusable
   content inside aria-hidden is the usual way a marquee breaks
   a screen reader, and duplicated cards would otherwise be
   announced and tabbed through twice.

   CLICKING A MOVING TARGET
   A click only fires when press and release land on the same
   element, so a card sliding out from under the finger would
   never register one. The strip therefore pauses on hover AND
   holds still for the length of a press. That is the same class
   of bug that killed the speaker-card magnify, handled up front
   rather than after it is reported.

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

  let list = [], view, stage, capEl, countEl, track, section;
  let open = -1, lastFocus = null, opener = null;

  /* ══════════════════════════════════════════════════════════
     The strip
     ══════════════════════════════════════════════════════════ */
  function media(item, n, big) {
    if (item.src) {
      return '<video class="reel__v" muted loop playsinline preload="none"' +
             (big ? ' controls' : '') +
             (item.poster ? ' poster="' + esc(item.poster) + '"' : '') +
             '><source src="' + esc(item.src) + '" type="video/mp4" /></video>';
    }
    if (item.poster) {
      return '<img class="reel__v" src="' + esc(item.poster) + '" alt="' + esc(item.label) + '" loading="lazy" />';
    }
    return '<span class="reel__slot">' +
             '<span class="reel__play">' + PLAY + '</span>' +
             '<span class="reel__n">' + n + '</span>' +
           '</span>';
  }

  function card(item, i, ghost) {
    const n = String(i + 1).padStart(2, '0');
    return '<button type="button" class="reel__card" data-reel="' + i + '"' +
             (ghost ? ' tabindex="-1" aria-hidden="true"' : '') +
             ' aria-label="' + esc(item.label || ('Reel ' + n)) + '">' +
             '<span class="reel__frame">' + media(item, n, false) + '</span>' +
             (item.label ? '<span class="reel__cap">' + esc(item.label) + '</span>' : '') +
           '</button>';
  }

  /* ══════════════════════════════════════════════════════════
     The viewer
     ══════════════════════════════════════════════════════════ */
  function show(i) {
    if (!list.length) return;
    open = (i + list.length) % list.length;          // wrap both ways
    const item = list[open];
    const n = String(open + 1).padStart(2, '0');

    stage.innerHTML = '<div class="rview__frame">' + media(item, n, true) + '</div>';
    capEl.textContent = item.label || '';
    countEl.textContent = n + ' / ' + String(list.length).padStart(2, '0');

    const v = stage.querySelector('video');
    if (v && !REDUCED) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }

    if (view.getAttribute('aria-hidden') === 'true') {
      lastFocus = opener || document.activeElement;
      view.classList.add('is-open');
      view.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-locked');
      // focus() is a no-op on a visibility:hidden element. The CSS shows the
      // viewer on the same frame as the class (see the visibility transition
      // in css/paper.css), but the style has to be flushed before the focus
      // call can see it. Reading offsetHeight does that synchronously —
      // rAF would too, except rAF is throttled in a background tab and the
      // focus would simply never land.
      void view.offsetHeight;
      view.querySelector('.rview__x').focus();
    }
  }

  function close() {
    const v = stage.querySelector('video');
    if (v) v.pause();
    stage.innerHTML = '';
    open = -1;
    view.classList.remove('is-open');
    view.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-locked');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    opener = null;
  }

  /* ══════════════════════════════════════════════════════════
     Hold the strip still long enough to be clicked
     ══════════════════════════════════════════════════════════ */
  function holdToClick() {
    let t = null;
    const hold = () => { clearTimeout(t); track.classList.add('is-held'); };
    const release = () => { clearTimeout(t); t = setTimeout(() => track.classList.remove('is-held'), 260); };

    track.addEventListener('pointerdown', hold, { passive: true });
    window.addEventListener('pointerup', release, { passive: true });
    window.addEventListener('pointercancel', release, { passive: true });

    // keyboard focus moves through the strip too; stop it under the user
    track.addEventListener('focusin', hold);
    track.addEventListener('focusout', release);
  }

  /* Videos are only worth decoding while the strip is on screen. */
  function gate() {
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
    track   = document.getElementById('reelTrack');
    section = document.querySelector('.sec--reel');
    view    = document.getElementById('reelView');
    stage   = document.getElementById('reelStage');
    capEl   = document.getElementById('reelCap');
    countEl = document.getElementById('reelCount');
    if (!track || !section) return;

    list = (typeof REELS !== 'undefined' && REELS.length) ? REELS.slice() : [];
    while (list.length < CONFIG.minCards) list.push({ src: '', poster: '', label: '' });

    // real copy, then a ghost copy that no screen reader or tab stop sees
    track.innerHTML = list.map((it, i) => card(it, i, false)).join('') +
                      list.map((it, i) => card(it, i, true)).join('');
    track.style.setProperty('--reel-time', (list.length * CONFIG.secondsPerCard).toFixed(1) + 's');

    section.classList.toggle('is-empty', list.every(r => !r.src && !r.poster));
    holdToClick();
    gate();

    track.addEventListener('click', (e) => {
      const btn = e.target.closest('.reel__card');
      if (!btn) return;
      // remember the card itself — on a touch tap the button may never
      // have taken focus, so activeElement would send us back to <body>
      opener = btn;
      show(parseInt(btn.getAttribute('data-reel'), 10) || 0);
    });

    if (!view) return;
    view.querySelectorAll('[data-rclose]').forEach(el => el.addEventListener('click', close));
    view.querySelector('[data-rprev]').addEventListener('click', () => show(open - 1));
    view.querySelector('[data-rnext]').addEventListener('click', () => show(open + 1));

    document.addEventListener('keydown', (e) => {
      if (view.getAttribute('aria-hidden') === 'true') return;
      if (e.key === 'Escape')     { e.preventDefault(); close(); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); show(open - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); show(open + 1); }
    });
  }

  document.addEventListener('devtalks:content', () => setTimeout(init, 0), { once: true });

  window.DevTalksReel = { open: show, close: close };
})();
