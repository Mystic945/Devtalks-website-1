/* ============================================================
   DEVTALKS — SITE BEHAVIOUR
   Renders every list from js/data.js, then wires the motion.
   ============================================================ */
(function () {
  'use strict';

  const $  = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.prototype.slice.call((c || document).querySelectorAll(s));
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TOUCH   = !window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  const hasGSAP = typeof gsap !== 'undefined';

  if (hasGSAP && typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);

  const initials = (n) => n.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /* ══════════════════════════════════════════════════════════
     1. CONTENT — fill the page from data.js
     ══════════════════════════════════════════════════════════ */
  function fillContent() {
    // --- Hero / meta ---
    document.title = SITE.eventName + ' ' + SITE.edition + ' — ' + SITE.theme;
    $('#heroYear').textContent   = SITE.edition.slice(-2);
    $('#heroTheme').textContent  = SITE.theme;
    $('#heroTag').textContent    = SITE.tagline;
    $('#heroDate').textContent   = SITE.dateLabel;
    $('#heroVenue').textContent  = SITE.venueShort;
    $('#aboutIntro').textContent = SITE.intro;
    $('#schedSub').textContent   = SITE.timeLabel + ' · ' + SITE.venueShort;
    $('#year').textContent       = new Date().getFullYear();
    if ($('#footCollege')) $('#footCollege').textContent = SITE.college;

    // --- Venue ---
    $('#venueName').textContent = SITE.venue;
    $('#venueAddr').textContent = SITE.venueLine2;
    $('#venueDate').textContent = SITE.dateLabel;
    $('#venueTime').textContent = SITE.timeLabel;
    $('#venueMap').href         = SITE.mapLink;

    // --- Links ---
    if (SITE.registerUrl && SITE.registerUrl !== '#tickets') {
      $$('a[href="#tickets"]').forEach(a => {
        a.href = SITE.registerUrl; a.target = '_blank'; a.rel = 'noopener';
      });
    }
    // Guarded: the alternate index page drops the sponsorship CTA entirely
    if ($('#sponsorCta'))  $('#sponsorCta').href  = SITE.sponsorMail;
    if ($('#footSponsor')) $('#footSponsor').href = SITE.sponsorMail;
    if ($('#footContact')) $('#footContact').href = SITE.contactMail;

    // --- Socials ---
    const socialHTML = Object.keys(SITE.socials)
      .filter(k => SITE.socials[k])
      .map(k => '<a href="' + esc(SITE.socials[k]) + '" target="_blank" rel="noopener">' +
                (k === 'x' ? 'X / Twitter' : k.charAt(0).toUpperCase() + k.slice(1)) + '</a>')
      .join('');
    $('#menuSocials').innerHTML = socialHTML;
    $('#footSocials').innerHTML = socialHTML;

    // --- Marquee (duplicated so the loop is seamless) ---
    const strip = MARQUEE.map(t => '<span>' + esc(t) + '</span>').join('');
    $('#marqueeTrack').innerHTML = strip + strip;

    // --- Stats ---
    $('#stats').innerHTML = STATS.map(s =>
      '<div class="stat"><b data-count="' + s.value + '" data-suffix="' + esc(s.suffix) + '">0</b>' +
      '<span>' + esc(s.label) + '</span></div>'
    ).join('');

    // --- Speakers ---
    $('#speakerGrid').innerHTML = SPEAKERS.map((s, i) => {
      const media = s.photo
        ? '<img src="' + esc(s.photo) + '" alt="' + esc(s.name) + '" loading="lazy" />'
        : '<div class="spk__ini">' + esc(initials(s.name)) + '</div>';
      return '<button class="spk" data-spk="' + i + '" data-reveal data-tilt>' +
               '<div class="spk__img"><span class="spk__no">' + String(i + 1).padStart(2, '0') + '</span>' + media + '</div>' +
               '<div class="spk__body">' +
                 '<h3 class="spk__name">' + esc(s.name) + '</h3>' +
                 '<p class="spk__role">' + esc(s.role) + (s.org ? ' · ' + esc(s.org) : '') + '</p>' +
                 '<p class="spk__talk">' + esc(s.talk) + '</p>' +
               '</div>' +
               '<span class="spk__more" aria-hidden="true">&rarr;</span>' +
             '</button>';
    }).join('');

    // --- Schedule ---
    $('#schedList').innerHTML = SCHEDULE.map(r =>
      '<li class="' + (r.kind === 'break' ? 'is-break' : '') + '" data-reveal>' +
        '<time>' + esc(r.time) + '</time>' +
        '<h3>' + esc(r.title) + '</h3>' +
        '<p>' + esc(r.who) + '</p>' +
      '</li>'
    ).join('');

    // --- Tickets ---
    $('#tierGrid').innerHTML = TICKETS.map(t => {
      const href = t.url || SITE.registerUrl || '#';
      const ext  = t.url ? ' target="_blank" rel="noopener"' : '';
      return '<div class="tier' + (t.featured ? ' tier--feat' : '') + '" data-reveal>' +
               (t.featured ? '<span class="tier__flag">Most popular</span>' : '') +
               '<h3>' + esc(t.name) + '</h3>' +
               '<div class="tier__price"><b>' + esc(t.price) + '</b>' +
                 (t.strike ? '<s>' + esc(t.strike) + '</s>' : '') + '</div>' +
               '<p class="tier__note">' + esc(t.note) + '</p>' +
               '<ul>' + t.perks.map(p => '<li>' + esc(p) + '</li>').join('') + '</ul>' +
               '<a class="btn btn--block' + (t.featured ? '' : ' btn--ghost') + '" href="' + esc(href) + '"' + ext + ' data-magnetic>' +
                 esc(t.cta) + '</a>' +
             '</div>';
    }).join('');

    // --- Sponsors ---
    $('#sponsorWall').innerHTML = SPONSORS.map((row, i) => {
      const logos = row.items.map(it => {
        const inner = it.logo
          ? '<img src="' + esc(it.logo) + '" alt="' + esc(it.name) + '" loading="lazy" />'
          : esc(it.name);
        return it.url
          ? '<a class="logo" href="' + esc(it.url) + '" target="_blank" rel="noopener">' + inner + '</a>'
          : '<div class="logo">' + inner + '</div>';
      }).join('');
      return '<div class="tierRow' + (i === 0 ? ' tierRow--title' : '') + '" data-reveal>' +
               '<h3>' + esc(row.tier) + '</h3>' +
               '<div class="logos">' + logos + '</div>' +
             '</div>';
    }).join('');

    // --- FAQ ---
    $('#faqList').innerHTML = FAQS.map(f =>
      '<div class="faq__item" data-reveal>' +
        '<button class="faq__q" aria-expanded="false">' + esc(f.q) + '<i aria-hidden="true"></i></button>' +
        '<div class="faq__a"><p>' + esc(f.a) + '</p></div>' +
      '</div>'
    ).join('');
  }

  /* ══════════════════════════════════════════════════════════
     2. PRELOADER
     ══════════════════════════════════════════════════════════ */
  function preload(done) {
    // A page can register its own opening sequence (see js/doors.js).
    // If one is present it owns the intro; otherwise the counter below runs.
    if (window.DevTalksIntro && typeof window.DevTalksIntro.run === 'function') {
      window.DevTalksIntro.run(done);
      return;
    }

    const el  = $('#loader');
    const bar = $('#loaderBar');
    const num = $('#loaderNum');
    let pct = 0, loaded = false;

    window.addEventListener('load', () => { loaded = true; });
    setTimeout(() => { loaded = true; }, 4000); // never trap the user

    const tick = setInterval(() => {
      const ceiling = loaded ? 100 : 88;
      pct = Math.min(pct + Math.random() * 9 + 2, ceiling);
      bar.style.width = pct + '%';
      num.textContent = Math.round(pct);

      if (pct >= 100) {
        clearInterval(tick);
        el.classList.add('is-done');
        if (hasGSAP && !REDUCED) {
          gsap.to(el, {
            clipPath: 'inset(0 0 100% 0)', duration: .9, ease: 'expo.inOut',
            onComplete: () => { el.style.display = 'none'; done(); }
          });
        } else {
          el.style.display = 'none';
          done();
        }
      }
    }, 110);
  }

  /* ══════════════════════════════════════════════════════════
     3. TEXT SPLITTING (word-level, keeps it cheap)
     ══════════════════════════════════════════════════════════ */
  function splitWords(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words
      .map(w => '<span class="word"><i>' + esc(w) + '</i></span>')
      .join(' ');
    return $$('.word > i', el);
  }

  /* ══════════════════════════════════════════════════════════
     4. ENTRANCE + SCROLL ANIMATION
     ══════════════════════════════════════════════════════════ */
  function heroIntro() {
    if (!hasGSAP || REDUCED) {
      $$('.hero__title .line > span').forEach(s => s.style.transform = 'none');
      $$('[data-reveal]').forEach(s => { s.style.opacity = 1; s.style.transform = 'none'; });
      return;
    }
    const themeWords = splitWords($('#heroTheme'));
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

    // y:0 in the "from" clears the CSS translateY(%) so it doesn't stack on yPercent
    tl.fromTo('.hero__title .line > span',
        { yPercent: 105, y: 0 }, { yPercent: 0, y: 0, duration: 1.3, stagger: .1 }, 0)
      .fromTo(themeWords,
        { yPercent: 100, y: 0 }, { yPercent: 0, y: 0, duration: .9, stagger: .035 }, .35)
      .to('.hero__tag, .hero__meta, .hero__actions, .count',
        { opacity: 1, y: 0, duration: .9, stagger: .09 }, .5);
  }

  function scrollAnims() {
    if (!hasGSAP || typeof ScrollTrigger === 'undefined' || REDUCED) {
      $$('[data-reveal]').forEach(s => { s.style.opacity = 1; s.style.transform = 'none'; });
      $$('[data-count]').forEach(b => b.textContent = b.dataset.count + (b.dataset.suffix || ''));
      return;
    }

    // Generic reveals (skip the hero, its timeline owns those)
    $$('[data-reveal]').forEach(el => {
      if (el.closest('.hero')) return;
      gsap.to(el, {
        opacity: 1, y: 0, duration: .9, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      });
    });

    // Split headings
    $$('[data-split]').forEach(el => {
      if (el.closest('.hero')) return;
      const words = splitWords(el);
      gsap.fromTo(words, { yPercent: 100, y: 0 }, {
        yPercent: 0, y: 0, duration: 1, ease: 'expo.out', stagger: .03,
        scrollTrigger: { trigger: el, start: 'top 86%', once: true }
      });
    });

    // Counting stats
    $$('[data-count]').forEach(b => {
      const target = parseFloat(b.dataset.count);
      const obj = { v: 0 };
      gsap.to(obj, {
        v: target, duration: 1.8, ease: 'power2.out',
        scrollTrigger: { trigger: b, start: 'top 90%', once: true },
        onUpdate: () => { b.textContent = Math.round(obj.v) + (b.dataset.suffix || ''); }
      });
    });

    // Parallax on the giant footer wordmark
    gsap.to('.foot__huge', {
      yPercent: -14, ease: 'none',
      scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true }
    });

    // Active nav link
    $$('section[id]').forEach(sec => {
      const link = $('.nav__links a[href="#' + sec.id + '"]');
      if (!link) return;
      ScrollTrigger.create({
        trigger: sec, start: 'top 45%', end: 'bottom 45%',
        onToggle: self => link.classList.toggle('is-active', self.isActive)
      });
    });
  }

  /* ══════════════════════════════════════════════════════════
     5. NAV + MOBILE MENU
     ══════════════════════════════════════════════════════════ */
  function nav() {
    const bar = $('#nav'), burger = $('#burger'), menu = $('#menu');

    let last = 0;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      bar.classList.toggle('is-stuck', y > 40);
      last = y;
    }, { passive: true });

    const toggle = (open) => {
      burger.classList.toggle('is-open', open);
      menu.classList.toggle('is-open', open);
      menu.setAttribute('aria-hidden', open ? 'false' : 'true');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.classList.toggle('is-locked', open);
    };

    burger.addEventListener('click', () => toggle(!menu.classList.contains('is-open')));
    $$('#menu a').forEach(a => a.addEventListener('click', () => toggle(false)));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) toggle(false);
    });
  }

  /* ══════════════════════════════════════════════════════════
     6. COUNTDOWN
     ══════════════════════════════════════════════════════════ */
  function countdown() {
    const target = new Date(SITE.date).getTime();
    const box = $('#count');
    if (isNaN(target)) { box.style.display = 'none'; return; }

    const cells = { d: $('#cd-d'), h: $('#cd-h'), m: $('#cd-m'), s: $('#cd-s') };
    const pad = n => String(Math.max(n, 0)).padStart(2, '0');

    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        box.innerHTML = '<div class="count__cell" style="min-width:auto;padding:12px 20px">' +
                        '<strong style="font-size:1.1rem">HAPPENING NOW</strong></div>';
        clearInterval(timer);
        return;
      }
      const s = Math.floor(diff / 1000);
      cells.d.textContent = pad(Math.floor(s / 86400));
      cells.h.textContent = pad(Math.floor(s % 86400 / 3600));
      cells.m.textContent = pad(Math.floor(s % 3600 / 60));
      cells.s.textContent = pad(s % 60);
    };
    tick();
    const timer = setInterval(tick, 1000);
  }

  /* ══════════════════════════════════════════════════════════
     7. SPEAKER MODAL
     ══════════════════════════════════════════════════════════ */
  function modal() {
    const m = $('#modal');
    let lastFocus = null;

    const open = (i) => {
      const s = SPEAKERS[i];
      if (!s) return;
      lastFocus = document.activeElement;

      $('#modalMedia').innerHTML = s.photo
        ? '<img src="' + esc(s.photo) + '" alt="' + esc(s.name) + '" />'
        : esc(initials(s.name));
      $('#modalTags').innerHTML = (s.tags || []).map(t => '<span>' + esc(t) + '</span>').join('');
      $('#modalName').textContent = s.name;
      $('#modalRole').textContent = s.role + (s.org ? ' · ' + s.org : '');
      $('#modalTalk').textContent = s.talk;
      $('#modalBio').textContent  = s.bio;

      const link = $('#modalLink');
      if (s.link) { link.href = s.link; link.classList.remove('is-hidden'); }
      else        { link.classList.add('is-hidden'); }

      m.classList.add('is-open');
      m.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-locked');
      $('.modal__x').focus();
    };

    const close = () => {
      m.classList.remove('is-open');
      m.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-locked');
      if (lastFocus) lastFocus.focus();
    };

    $$('[data-spk]').forEach(btn =>
      btn.addEventListener('click', () => open(parseInt(btn.dataset.spk, 10)))
    );
    $$('[data-close]', m).forEach(el => el.addEventListener('click', close));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && m.classList.contains('is-open')) close();
    });
  }

  /* ══════════════════════════════════════════════════════════
     8. FAQ ACCORDION
     ══════════════════════════════════════════════════════════ */
  function faq() {
    $$('.faq__item').forEach(item => {
      const q = $('.faq__q', item), a = $('.faq__a', item);
      q.addEventListener('click', () => {
        const isOpen = item.classList.contains('is-open');

        $$('.faq__item.is-open').forEach(other => {
          if (other === item) return;
          other.classList.remove('is-open');
          $('.faq__q', other).setAttribute('aria-expanded', 'false');
          const oa = $('.faq__a', other);
          if (hasGSAP && !REDUCED) gsap.to(oa, { height: 0, duration: .4, ease: 'power2.inOut' });
          else oa.style.height = '0px';
        });

        item.classList.toggle('is-open', !isOpen);
        q.setAttribute('aria-expanded', String(!isOpen));

        if (hasGSAP && !REDUCED) {
          gsap.to(a, {
            height: isOpen ? 0 : a.scrollHeight,
            duration: .5, ease: 'power3.inOut',
            onComplete: () => { if (!isOpen) a.style.height = 'auto'; }
          });
        } else {
          a.style.height = isOpen ? '0px' : 'auto';
        }
      });
    });
  }

  /* ══════════════════════════════════════════════════════════
     9. DESKTOP FLOURISHES — cursor, magnetic buttons, card tilt
        All of this is skipped on touch devices on purpose.
     ══════════════════════════════════════════════════════════ */
  function flourishes() {
    if (TOUCH || REDUCED || window.innerWidth < 1024 || !hasGSAP) {
      return;
    }

    // Magnetic buttons
    $$('[data-magnetic]').forEach(el => {
      const x = gsap.quickTo(el, 'x', { duration: .5, ease: 'elastic.out(1,0.4)' });
      const y = gsap.quickTo(el, 'y', { duration: .5, ease: 'elastic.out(1,0.4)' });
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        x((e.clientX - r.left - r.width / 2) * 0.32);
        y((e.clientY - r.top - r.height / 2) * 0.42);
      });
      el.addEventListener('pointerleave', () => { x(0); y(0); });
    });

    // 3D tilt on speaker cards
    $$('[data-tilt]').forEach(card => {
      const rx = gsap.quickTo(card, 'rotationX', { duration: .6, ease: 'power3' });
      const ry = gsap.quickTo(card, 'rotationY', { duration: .6, ease: 'power3' });
      card.style.transformPerspective = '900px';
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        rx((-(e.clientY - r.top - r.height / 2) / r.height) * 11);
        ry(((e.clientX - r.left - r.width / 2) / r.width) * 11);
      });
      card.addEventListener('pointerleave', () => { rx(0); ry(0); });
    });
  }

  /* ══════════════════════════════════════════════════════════
     BOOT
     ══════════════════════════════════════════════════════════ */
  function boot() {
    fillContent();

    // Speaker cards, schedule rows and the marquee now exist. Anything that
    // needs to measure them (see js/parallax.js) hangs off this event.
    document.dispatchEvent(new CustomEvent('devtalks:content'));

    const webgl = window.DevTalksHero.init($('#heroCanvas'));
    if (!webgl) $('#heroCanvas').style.display = 'none';

    nav();
    countdown();
    modal();
    faq();
    flourishes();

    preload(function () {
      document.body.classList.add('is-ready');
      if (webgl) window.DevTalksHero.reveal();
      heroIntro();
      scrollAnims();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
