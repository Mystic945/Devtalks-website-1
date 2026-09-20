/* ============================================================
   DEVTALKS — REEL VIEWER
   ------------------------------------------------------------
   One reel, large. Same idiom as the speaker modal — scrim, card,
   close, Escape — with arrow keys stepping through the strip and
   wrapping at both ends.

   The stage is keyed on the index so React replaces the <video>
   rather than reusing it: a reused element keeps the previous
   clip's buffered data and its playback position, which is how a
   gallery ends up showing frame one of the wrong video.
   ============================================================ */

import { useEffect, useRef } from 'react';
import { useDialog } from '@/hooks/useDialog';
import { ReelMedia } from '@/components/ReelMedia';
import { pad2, prefersReducedMotion } from '@/lib/dom';
import type { Reel as ReelItem } from '@/data/site';

interface Props {
  items: readonly ReelItem[];
  /** null when the viewer is closed. */
  index: number | null;
  onClose: () => void;
  onStep: (delta: 1 | -1) => void;
  opener: React.RefObject<HTMLElement | null>;
}

export function ReelViewer({ items, index, onClose, onStep, opener }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const open = index !== null;

  useDialog(ref, open, onClose, opener);

  /* Arrow keys step the strip. Separate from useDialog because only this
     dialog has anything to step through. */
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onStep(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onStep(1);
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onStep]);

  /* Start the clip once it is on screen, and stop it on the way out so a
     closed viewer is never still decoding. */
  useEffect(() => {
    const v = stageRef.current?.querySelector('video');
    if (!v) return;

    if (open && !prefersReducedMotion()) void v.play().catch(() => {});
    return () => v.pause();
  }, [open, index]);

  const item = index === null ? null : items[index];

  return (
    <div
      className={`rview${open ? ' is-open' : ''}`}
      id="reelView"
      ref={ref}
      aria-hidden={!open}
      role="dialog"
      aria-modal="true"
      aria-label="Reel"
    >
      <div className="rview__scrim" onClick={onClose} />

      <div className="rview__inner">
        <button className="rview__x" onClick={onClose} aria-label="Close" data-autofocus>
          &times;
        </button>
        <button
          className="rview__nav rview__nav--prev"
          onClick={() => onStep(-1)}
          aria-label="Previous reel"
        >
          &#8249;
        </button>

        <div className="rview__stage" ref={stageRef}>
          {item && (
            <div className="rview__frame" key={index}>
              <ReelMedia item={item} n={(index ?? 0) + 1} big />
            </div>
          )}
        </div>

        <button
          className="rview__nav rview__nav--next"
          onClick={() => onStep(1)}
          aria-label="Next reel"
        >
          &#8250;
        </button>

        <p className="rview__meta">
          <span>{item?.label || ''}</span>
          <b>{index === null ? '' : `${pad2(index + 1)} / ${pad2(items.length)}`}</b>
        </p>
      </div>
    </div>
  );
}
