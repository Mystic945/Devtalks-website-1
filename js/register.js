/* ============================================================
   DEVTALKS — REGISTRATION PREP  (paper edition only)
   ------------------------------------------------------------
   Two small structural jobs, done once, before js/flow.js reads
   the page:

   1. Each speaker card gets a wrapper, because two different
      things want to write a transform on it: js/bento.js tilts
      the card every frame, and js/flow.js registers it as it
      scrolls into view. A transform is one property — whoever
      writes last wins — so they get one element each:

          .spk-flow   [data-flow]  scroll registration (JS)
            .spk                   tilt                (JS)

      There was a third wrapper here for a hover magnify. Three
      nested transforms on one card made it jitter under the
      cursor, so the magnify was dropped and its wrapper with
      it.

   2. The grid items that should arrive continuously hand
      themselves from js/main.js's one-shot reveal over to
      js/flow.js's scroll-linked registration. Dropping
      data-reveal is what stops the two from driving the same
      transform. Rows that read better as a list — the schedule,
      the FAQ — keep main.js's reveal on purpose, so the page
      does not animate everything the same way.

   Runs on devtalks:content, which is also when bento.js builds
   the badges, so it is loaded after bento.js and before flow.js.
   ============================================================ */

(function () {
  'use strict';

  /* Items that arrive in register rather than fading in once. Kept to the
     things that read as composed blocks; long lists stay on the reveal. */
  const FLOW = ['.tier', '.note', '.tierRow', '.stats', '.venue__info', '.venue__map'];

  function wrapCards() {
    const cards = document.querySelectorAll('.speakers > .spk');
    Array.prototype.forEach.call(cards, (card) => {
      const flow = document.createElement('div');
      flow.className = 'spk-flow';
      flow.setAttribute('data-flow', '');

      card.parentNode.insertBefore(flow, card);
      flow.appendChild(card);
    });
  }

  function handOver() {
    FLOW.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        el.removeAttribute('data-reveal');   // main.js will now skip it
        el.setAttribute('data-flow', '');
      });
    });
  }

  document.addEventListener('devtalks:content', () => {
    wrapCards();
    handOver();
  }, { once: true });
})();
