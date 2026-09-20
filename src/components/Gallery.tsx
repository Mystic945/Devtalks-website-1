/* ============================================================
   DEVTALKS — IN PICTURES
   ------------------------------------------------------------
   The wall is dealt into four columns and each column is printed
   twice, so it is long enough to travel the whole scroll without
   running out. The second copy is aria-hidden.

   The columns are trimmed to equal length first: an unbalanced
   wall leaves a hole at the bottom of the short ones once it has
   finished moving.

   The opening and the zoom are in useGallery.
   ============================================================ */

import { useMemo, useRef } from 'react';
import { useGallery } from '@/hooks/useGallery';
import { SplitText } from '@/components/SplitText';
import { pad2 } from '@/lib/dom';
import { GALLERY, type GalleryShot } from '@/data/site';

const COLUMNS = 4;
const MIN_SHOTS = 8;
const EMPTY: GalleryShot = { src: '', label: '' };

interface Shot {
  item: GalleryShot;
  n: number;
}

function Card({ item, n, ghost }: Shot & { ghost: boolean }) {
  if (!item.src) {
    return (
      <div className="gal__card" aria-hidden={ghost || undefined}>
        <span className="gal__slot">{pad2(n)}</span>
      </div>
    );
  }

  return (
    <div className="gal__card" aria-hidden={ghost || undefined}>
      <img
        src={item.src}
        alt={ghost ? '' : item.label || `Gallery photo ${pad2(n)}`}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}

export function Gallery() {
  const trackRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const matrixRef = useRef<HTMLDivElement>(null);

  const columns = useMemo<Shot[][]>(() => {
    const list = GALLERY.slice();
    while (list.length < MIN_SHOTS) list.push(EMPTY);

    const even = list.slice(0, list.length - (list.length % COLUMNS));
    return Array.from({ length: COLUMNS }, (_, c) =>
      even
        .map((item, i) => ({ item, n: i + 1 }))
        .filter((_, i) => i % COLUMNS === c)
    );
  }, []);

  useGallery(trackRef, bannerRef, matrixRef);

  return (
    <section className="sec sec--gallery" id="gallery">
      <div className="wrap">
        <div className="sec__head">
          <p className="eyebrow" data-reveal>
            <em>08</em> In pictures
          </p>
          <SplitText className="big" text="Gallery" />
          <p className="sec__sub" data-reveal>
            The day in pictures. Keep scrolling — the wall unfolds as you go.
          </p>
        </div>
      </div>

      <div className="gal" ref={trackRef}>
        <div className="gal__stage">
          <div className="gal__banner" ref={bannerRef}>
            <div className="gal__scene">
              <div className="gal__mask gal__mask--y" />
              <div className="gal__mask gal__mask--x" />

              <div className="gal__matrix" ref={matrixRef} role="group" aria-label="Photo gallery">
                {columns.map((col, c) => (
                  <div className="gal__col" data-col={c} key={c}>
                    {col.map((s) => (
                      <Card key={`real-${s.n}`} {...s} ghost={false} />
                    ))}
                    {col.map((s) => (
                      <Card key={`ghost-${s.n}`} {...s} ghost />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
