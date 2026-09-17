/* ============================================================
   DEVTALKS — LIVE STAGE + WHAT YOU GET  (paper edition only)
   ------------------------------------------------------------
   Two hero tiles that js/hero-bento.js fills with placeholders,
   rewritten here with real behaviour:

   1. NEXT / ON STAGE NOW
      The speaker tile follows the run of show. Before the doors
      open it shows who is on first; while a talk is running it
      shows that speaker and says so; during a break it shows who
      is up next; once the last talk is done it says the day is
      over. The label above the tile changes with it, because a
      tile that says "Next on stage" while someone is mid-talk is
      worse than no tile.

      Everything comes from SCHEDULE in js/data-3.js — a row is
      matched to a speaker by looking for that speaker's name in
      the row's title or its "who" field, which is how the Q&A
      rows ("Q&A with Speaker One") resolve to the right person
      without needing their own field.

   2. WHAT YOU GET
      Three lines from PERKS, replacing the eight decorative
      stack icons that used to sit there.

   3. WHAT THE DAY GIVES YOU
      The fuller list from OFFERS, in the "What is DevTalks"
      section, where three hand-written notes used to be.

   TIME
   SCHEDULE rows are wall-clock strings with no date. They are
   anchored to the event's own day AND its own UTC offset, both
   taken from SITE.date, so a visitor in another timezone sees
   the talk that is genuinely running in Pune right now — not
   the one that matches their local clock.
   ============================================================ */

(function () {
  'use strict';

  const TICK = 20000;   // ms between checks — the schedule moves in minutes

  /* ---------- icons, in the same weight as the rest of the tile ---------- */
  const ICONS = {
    play: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M10 9l5 3-5 3z"/></svg>',
    cup:  '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 9h2a2.5 2.5 0 0 1 0 5h-2"/><path d="M8 2v2.6M12 2v2.6"/></svg>',
    mic:  '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/></svg>'
  };

  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /* ══════════════════════════════════════════════════════════
     The run of show, as real instants
     ══════════════════════════════════════════════════════════ */
  function buildTimeline() {
    if (typeof SCHEDULE === 'undefined' || typeof SITE === 'undefined') return null;

    // "2026-11-14T10:00:00+05:30" -> day "2026-11-14", offset "+05:30"
    const m = String(SITE.date).match(/^(\d{4}-\d{2}-\d{2})T[\d:]+(Z|[+-]\d{2}:\d{2})$/);
    if (!m) return null;
    const day = m[1], off = m[2] === 'Z' ? '+00:00' : m[2];

    const at = (hhmm) => {
      const d = new Date(day + 'T' + hhmm + ':00' + off);
      return isNaN(d) ? null : d;
    };

    const rows = [];
    for (let i = 0; i < SCHEDULE.length; i++) {
      const start = at(SCHEDULE[i].time);
      if (!start) return null;
      rows.push({ start: start, row: SCHEDULE[i], speaker: speakerFor(SCHEDULE[i]) });
    }
    // a row runs until the next one starts; the last gets half an hour
    for (let i = 0; i < rows.length; i++) {
      rows[i].end = rows[i + 1] ? rows[i + 1].start : new Date(rows[i].start.getTime() + 18e5);
    }
    return rows;
  }

  /* A row belongs to a speaker if their name appears in either field. That
     covers "Shipping Before You're Ready" / who: "Speaker One" and also
     "Q&A with Speaker One" / who: "Audience". */
  function speakerFor(row) {
    if (typeof SPEAKERS === 'undefined') return -1;
    const hay = ((row.title || '') + ' ' + (row.who || '')).toLowerCase();
    for (let i = 0; i < SPEAKERS.length; i++) {
      const n = (SPEAKERS[i].name || '').trim().toLowerCase();
      if (n && hay.indexOf(n) !== -1) return i;
    }
    return -1;
  }

  /* ══════════════════════════════════════════════════════════
     Who is on, right now
     ══════════════════════════════════════════════════════════ */
  function state(rows, now) {
    const withSpeaker = rows.filter(r => r.speaker !== -1);
    if (!withSpeaker.length) return { index: 0, label: 'Next on stage', live: false };

    if (now < withSpeaker[0].start) {
      return { index: withSpeaker[0].speaker, label: 'First on stage', live: false };
    }

    const last = withSpeaker[withSpeaker.length - 1];
    const dayEnd = rows[rows.length - 1].end;

    // Past the last talk but the day is still going — the demo floor and the
    // closing session are still to come, so "That's a wrap" would be wrong.
    if (now >= last.end && now < dayEnd) {
      return { index: last.speaker, label: 'Talks done for today', live: false };
    }
    if (now >= dayEnd) {
      return { index: last.speaker, label: "That's a wrap", live: false, done: true };
    }

    // inside a row that has a speaker — they are on
    for (let i = 0; i < rows.length; i++) {
      if (now >= rows[i].start && now < rows[i].end && rows[i].speaker !== -1) {
        return { index: rows[i].speaker, label: 'On stage now', live: true };
      }
    }

    // between talks — whoever is up next
    for (let i = 0; i < withSpeaker.length; i++) {
      if (now < withSpeaker[i].start) {
        return { index: withSpeaker[i].speaker, label: 'Up next', live: false };
      }
    }
    return { index: last.speaker, label: 'Next on stage', live: false };
  }

  /* ══════════════════════════════════════════════════════════
     Render
     ══════════════════════════════════════════════════════════ */
  function paintSpeaker(st) {
    const box = document.getElementById('btSpeaker');
    const s = (typeof SPEAKERS !== 'undefined') ? SPEAKERS[st.index] : null;
    if (!box || !s) return;

    const initials = s.name.split(/\s+/).map(w => w[0]).slice(0, 2).join('');
    box.innerHTML =
      '<div class="btspk">' +
        '<div class="btspk__img">' +
          (s.photo ? '<img src="' + esc(s.photo) + '" alt="" loading="lazy" />'
                   : '<span class="btspk__ini">' + esc(initials) + '</span>') +
        '</div>' +
        '<div><div class="btspk__name">' + esc(s.name) + '</div>' +
        '<div class="btspk__role">' + esc(s.role) + (s.org ? ' &middot; ' + esc(s.org) : '') + '</div></div>' +
      '</div>' +
      '<p class="btspk__talk">' + esc(s.talk) + '</p>';

    const label = document.querySelector('.bt--spk .bt__label');
    if (label) {
      label.innerHTML = st.live
        ? '<span class="bttick__live"><i></i>Live</span> ' + esc(st.label)
        : '<b>02</b> ' + esc(st.label);
    }
    const tile = document.querySelector('.bt--spk');
    if (tile) tile.classList.toggle('is-live', !!st.live);
  }

  function paintPerks() {
    const box = document.getElementById('btStack');
    if (!box || typeof PERKS === 'undefined') return;
    box.className = 'btperks';
    box.innerHTML = PERKS.map(p =>
      '<div class="btperk">' +
        '<span class="btperk__i" aria-hidden="true">' + (ICONS[p.icon] || '') + '</span>' +
        '<span class="btperk__t">' + esc(p.label) +
          '<em>' + esc(p.note) + '</em>' +
        '</span>' +
      '</div>'
    ).join('');
  }

  function paintOffers() {
    const box = document.getElementById('offerList');
    if (!box || typeof OFFERS === 'undefined') return;
    box.innerHTML = OFFERS.map((o, i) =>
      '<div class="offer">' +
        '<b class="offer__n">' + String(i + 1).padStart(2, '0') + '</b>' +
        '<div><b class="offer__t">' + esc(o.title) + '</b>' +
        '<span class="offer__b">' + esc(o.body) + '</span></div>' +
      '</div>'
    ).join('');
  }

  /* ══════════════════════════════════════════════════════════
     Setup
     ══════════════════════════════════════════════════════════ */
  function init() {
    paintPerks();
    paintOffers();

    const rows = buildTimeline();
    if (!rows) return;            // bad date format — the placeholder tile stays

    let shown = null;
    const run = () => {
      if (document.hidden) return;
      const st = state(rows, new Date());
      const key = st.index + '|' + st.label;
      if (key === shown) return;  // nothing changed; do not touch the DOM
      shown = key;
      paintSpeaker(st);
    };

    run();
    setInterval(run, TICK);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) run(); });
  }

  /* js/hero-bento.js fills these tiles on this event; run after it. */
  document.addEventListener('devtalks:content', () => setTimeout(init, 0), { once: true });

  window.DevTalksStage = {
    now: function () {
      const rows = buildTimeline();
      return rows ? state(rows, new Date()) : null;
    },
    /* Pretend it is a given time, for checking the states without waiting
       until November. DevTalksStage.preview('2026-11-14T10:30:00+05:30') */
    preview: function (iso) {
      const rows = buildTimeline();
      if (!rows) return null;
      const st = state(rows, new Date(iso));
      paintSpeaker(st);
      return st;
    }
  };
})();
