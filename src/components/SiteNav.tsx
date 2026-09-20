/* ============================================================
   DEVTALKS — NAV AND MOBILE MENU
   ------------------------------------------------------------
   The bar, and the full-screen menu the burger opens. They are
   one component because they share one piece of state — whether
   the menu is open — and splitting them would mean lifting that
   state somewhere neither of them lives.

   The menu closes on Escape, on any link inside it, and on the
   burger. While it is open the page behind it is locked.
   ============================================================ */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useStickyNav } from '@/hooks/useStickyNav';
import { lockScroll, pad2 } from '@/lib/dom';
import { socialLinks, ticketProps } from '@/lib/links';

/** The bar's links. The mobile menu adds Venue, which the bar has no room for. */
const NAV_LINKS = [
  { href: '#about', label: 'About' },
  { href: '#speakers', label: 'Speakers' },
  { href: '#schedule', label: 'Schedule' },
  { href: '#tickets', label: 'Tickets' },
  { href: '#sponsors', label: 'Sponsors' },
  { href: '#reel', label: 'Reel' },
  { href: '#gallery', label: 'Gallery' },
  { href: '#faq', label: 'FAQ' }
] as const;

const MENU_LINKS = [
  { href: '#about', label: 'About' },
  { href: '#speakers', label: 'Speakers' },
  { href: '#schedule', label: 'Schedule' },
  { href: '#tickets', label: 'Tickets' },
  { href: '#sponsors', label: 'Sponsors' },
  { href: '#venue', label: 'Venue' },
  { href: '#reel', label: 'Reel' },
  { href: '#gallery', label: 'Gallery' },
  { href: '#faq', label: 'FAQ' }
] as const;

export function SiteNav() {
  const navRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);

  useStickyNav(navRef);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    lockScroll(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      lockScroll(false);
    };
  }, [open, close]);

  const tickets = ticketProps();
  const socials = socialLinks();

  return (
    <>
      <header className="nav" id="nav" ref={navRef}>
        <a href="#top" className="nav__logo" data-magnetic>
          DEV<span>TALKS</span>
          <b>26</b>
        </a>

        <nav className="nav__links" aria-label="Primary">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} data-nav>
              {l.label}
            </a>
          ))}
        </nav>

        <a className="btn btn--sm nav__cta" data-magnetic {...tickets}>
          Get tickets
        </a>

        <button
          className={`burger${open ? ' is-open' : ''}`}
          id="burger"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="menu"
          onClick={() => setOpen((v) => !v)}
        >
          <i />
          <i />
        </button>
      </header>

      <div className={`menu${open ? ' is-open' : ''}`} id="menu" aria-hidden={!open}>
        <nav className="menu__links">
          {MENU_LINKS.map((l, i) => (
            <a key={l.href} href={l.href} onClick={close}>
              <em>{pad2(i + 1)}</em>
              {l.label}
            </a>
          ))}
        </nav>

        <div className="menu__foot">
          <a className="btn btn--block" {...tickets} onClick={close}>
            Get tickets
          </a>
          <div className="menu__socials">
            {socials.map((s) => (
              <a key={s.key} href={s.href} target="_blank" rel="noopener">
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
