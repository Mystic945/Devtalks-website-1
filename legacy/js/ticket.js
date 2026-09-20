/* ============================================================
   DEVTALKS — THE TICKET  (paper edition only)
   ------------------------------------------------------------
   The Tickets section as a single admission stub: a tear-off
   stub on the left, a perforated edge with two punched notches,
   the pass on the right, and the when / time / where strip
   along the bottom.

   DevTalks is free, so there is one pass, not three tiers.
   Everything printed on it comes from PASS and SITE in
   js/data-3.js — the date, time and venue are the same strings
   the hero and the venue section read, so the ticket can never
   disagree with the rest of the page about when or where.

   Rendered synchronously on devtalks:content, before main.js
   binds its magnetic buttons, so the CTA gets that behaviour
   like every other button on the page.
   ============================================================ */

(function () {
  'use strict';

  const TAG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
              'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
              '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.4"/></svg>';

  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function render() {
    const box = document.getElementById('ticket');
    if (!box || typeof PASS === 'undefined' || typeof SITE === 'undefined') return;

    const href = PASS.url || SITE.registerUrl || '#tickets';
    const ext  = /^https?:/.test(href) ? ' target="_blank" rel="noopener"' : '';
    const year = String(SITE.edition || '');
    const name = String(SITE.eventName || 'DevTalks');

    box.innerHTML =
      '<article class="ticket" aria-label="' + esc(name + ' ' + year + ' — ' + PASS.kind) + '">' +

        // ---- the stub ----
        '<div class="ticket__stub" aria-hidden="true">' +
          '<span class="stub__pass">' +
            '<small>' + esc(PASS.tag) + '</small>' +
            '<b>' + esc(PASS.kind) + '</b>' +
          '</span>' +
          '<span class="stub__price">' + esc(PASS.price) + '</span>' +
        '</div>' +

        // ---- the pass ----
        '<div class="ticket__body">' +
          '<div class="ticket__cell ticket__cell--price">' +
            '<p class="ticket__label">Ticket price</p>' +
            '<p class="ticket__price">' + esc(PASS.price) + '</p>' +
            '<p class="ticket__note">' + esc(PASS.priceNote) + '</p>' +
            '<p class="ticket__chip">' + TAG + '<span>' + esc(PASS.chip) + '</span></p>' +
          '</div>' +

          '<div class="ticket__cell ticket__cell--cta">' +
            '<p class="ticket__label">' + esc(name + ' ' + year) + '</p>' +
            '<h3 class="ticket__title">' + esc(SITE.theme) + '</h3>' +
            '<a class="btn ticket__btn" href="' + esc(href) + '"' + ext + ' data-magnetic>' +
              esc(PASS.cta) +
            '</a>' +
            '<p class="ticket__fine">*' + esc(PASS.fine) + '</p>' +
          '</div>' +

          '<dl class="ticket__meta">' +
            '<div><dt>Date</dt><dd>' + esc(SITE.dateLabel) + '</dd></div>' +
            '<div><dt>Time</dt><dd>' + esc(SITE.timeLabel) + '</dd></div>' +
            '<div><dt>Venue</dt><dd>' + esc(SITE.venueShort) + '</dd></div>' +
          '</dl>' +
        '</div>' +

      '</article>';
  }

  document.addEventListener('devtalks:content', render, { once: true });
})();
