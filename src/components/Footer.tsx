/* ============================================================
   DEVTALKS — THE REVEAL FOOTER
   ------------------------------------------------------------
   It sits behind the page and is uncovered as the content scrolls
   off the end; useFooterReveal pins it and adds exactly enough
   scroll for it to clear. If it does not fit inside the viewport
   — the common case on a phone — it stays in normal flow and the
   effect simply does not happen.

   `.foot__huge` is the giant wordmark useScrollAnimations
   parallaxes behind the columns.
   ============================================================ */

import { forwardRef } from 'react';
import { linkProps, socialLinks } from '@/lib/links';
import { SITE } from '@/data/site';

const COLUMNS = [
  {
    head: 'Event',
    links: [
      { href: '#about', label: 'About' },
      { href: '#speakers', label: 'Speakers' },
      { href: '#schedule', label: 'Schedule' },
      { href: '#venue', label: 'Venue' }
    ]
  },
  {
    head: 'Attend',
    links: [
      { href: '#tickets', label: 'Tickets' },
      { href: '#faq', label: 'FAQ' }
    ]
  }
] as const;

export const Footer = forwardRef<HTMLElement>((_props, ref) => {
  const socials = socialLinks();

  return (
    <footer className="foot" id="siteFoot" ref={ref}>
      <div className="foot__glow" aria-hidden="true" />

      <div className="wrap">
        <div className="foot__head">
          <a href="#top" className="foot__mark">
            DEV<span>TALKS</span>
            <b>26</b>
          </a>
          <p className="foot__legal">
            &copy; {new Date().getFullYear()} DevTalks. All rights reserved.
          </p>
        </div>

        <nav className="foot__cols" aria-label="Footer">
          {COLUMNS.map((col) => (
            <div key={col.head}>
              <h4>{col.head}</h4>
              {col.links.map((l) => (
                <a key={l.href} href={l.href}>
                  {l.label}
                </a>
              ))}
              {col.head === 'Attend' && <a {...linkProps(SITE.contactMail)}>Contact</a>}
            </div>
          ))}

          <div>
            <h4>Partners</h4>
            <a href="#sponsors">Sponsors</a>
            <a {...linkProps(SITE.sponsorMail)}>Become a sponsor</a>
          </div>

          <div>
            <h4>Follow</h4>
            <div className="foot__socials">
              {socials.map((s) => (
                <a key={s.key} href={s.href} target="_blank" rel="noopener">
                  {s.label}
                </a>
              ))}
            </div>
          </div>
        </nav>

        <div className="foot__bar">
          <p className="foot__by">
            <span>{SITE.college}</span>
          </p>
          <a href="#top" className="foot__up">
            Back to top
          </a>
        </div>
      </div>

      <div className="foot__huge" aria-hidden="true">
        DEVTALKS
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';
