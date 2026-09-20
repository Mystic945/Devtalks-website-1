/* ============================================================
   DEVTALKS — LINK HELPERS
   ------------------------------------------------------------
   Every "Get tickets" button on the page points at the same
   place, and that place is one field in src/data/site.ts. While
   it is still the in-page anchor the buttons scroll to the
   ticket section; the moment a real form URL is pasted in, every
   one of them opens it in a new tab instead.

   Doing that here rather than rewriting hrefs after render means
   there is no frame where the buttons point at the wrong thing.
   ============================================================ */

import { SITE } from '@/data/site';

export interface LinkProps {
  href: string;
  target?: '_blank';
  rel?: 'noopener';
}

const external = (href: string): boolean => /^https?:/.test(href);

/** Props for a link to an arbitrary destination, opened in a new tab when
 *  it leaves the site. */
export const linkProps = (href: string): LinkProps =>
  external(href) ? { href, target: '_blank', rel: 'noopener' } : { href };

/** Props for any "Get tickets" / "Register" control. */
export const ticketProps = (): LinkProps =>
  linkProps(SITE.registerUrl && SITE.registerUrl !== '#tickets' ? SITE.registerUrl : '#tickets');

/** Social links, in the order they are declared, with the labels the footer
 *  and the mobile menu both print. */
export const socialLinks = (): Array<{ key: string; label: string; href: string }> =>
  Object.entries(SITE.socials)
    .filter(([, href]) => Boolean(href))
    .map(([key, href]) => ({
      key,
      href,
      label: key === 'x' ? 'X / Twitter' : key.charAt(0).toUpperCase() + key.slice(1)
    }));
