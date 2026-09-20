/* ============================================================
   DEVTALKS — ONE BENTO TILE
   ------------------------------------------------------------
   Every hero tile is the same three layers: the wash that the
   spotlight slides around inside it, the rim that lights with it,
   and the content. useSpotlight finds them by class, which is why
   they are here once rather than copied into six components.
   ============================================================ */

import type { ReactNode } from 'react';

interface Props {
  /** The tile's modifier: title, spk, tick, cnt, meta or stack. */
  variant: string;
  /** State classes the tile owns itself, e.g. `is-live`. */
  className?: string;
  children: ReactNode;
}

export function Tile({ variant, className, children }: Props) {
  return (
    <article className={`bt bt--${variant}${className ? ` ${className}` : ''}`} data-bt>
      <div className="bt__glow" aria-hidden="true" />
      <div className="bt__rim" aria-hidden="true" />
      <div className="bt__in">{children}</div>
    </article>
  );
}
