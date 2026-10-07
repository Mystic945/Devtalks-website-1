/* ============================================================
   DEVTALKS — THE FOOTER
   ------------------------------------------------------------
   The lower half of the page's closing block. The venue is the
   upper half (it is the last section inside <main>); the army band
   is the seam between them, and it is the first thing in here, so
   the two halves read as one block on one ground with a band of
   gold run through it.

   It used to be pinned behind the page and uncovered as the content
   scrolled away. Joined to the venue it is simply the end of the
   page: there is nothing above it left to scroll off.

   `.foot__huge` is hidden, and kept: useScrollAnimations looks for
   it and would otherwise have nothing to hold.
   ============================================================ */

import { ArmyBand } from '@/components/ArmyBand';
import { linkProps, socialLinks } from '@/lib/links';
import { SITE } from '@/data/site';

const COLUMNS = [
  {
    head: 'Event',
    links: [
      { href: '#speakers', label: 'Speakers' },
      { href: '#schedule', label: 'Schedule' },
      { href: '#venue', label: 'Venue' }
    ]
  },
  {
    head: 'Attend',
    links: [
      { href: '/tickets', label: 'Tickets' },
      { href: '#faq', label: 'FAQ' }
    ]
  }
] as const;

export function Footer() {
  const socials = socialLinks();

  return (
    <footer className="foot foot--joined" id="siteFoot">
      <ArmyBand />
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
}
