/* ============================================================
   DEVTALKS — SPEAKER MODAL
   ------------------------------------------------------------
   The full bio. Escape closes it, the scrim closes it, and focus
   goes back to the card that opened it — see useDialog for the
   parts of that which are shared with the reel viewer.

   The markup stays mounted with `is-open` toggled rather than
   being unmounted, because the open and close are CSS
   transitions on this element and a removed element cannot
   transition out.
   ============================================================ */

import { useRef } from 'react';
import { useDialog } from '@/hooks/useDialog';
import { initials } from '@/lib/dom';
import type { Speaker } from '@/data/site';

interface Props {
  /** null when nothing is open. */
  speaker: Speaker | null;
  onClose: () => void;
  opener: React.RefObject<HTMLElement | null>;
}

export function SpeakerModal({ speaker, onClose, opener }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const open = speaker !== null;

  useDialog(ref, open, onClose, opener);

  return (
    <div
      className={`modal${open ? ' is-open' : ''}`}
      id="modal"
      ref={ref}
      aria-hidden={!open}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modalName"
    >
      <div className="modal__scrim" onClick={onClose} />

      <div className="modal__card">
        <button className="modal__x" onClick={onClose} aria-label="Close" data-autofocus>
          &times;
        </button>

        <div className="modal__media">
          {speaker?.photo ? (
            <img src={speaker.photo} alt={speaker.name} />
          ) : (
            speaker && initials(speaker.name)
          )}
        </div>

        <div className="modal__body">
          <div className="modal__tags">
            {speaker?.tags?.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>

          <h3 id="modalName">{speaker?.name}</h3>
          <p className="modal__role">
            {speaker?.role}
            {speaker?.org ? ` · ${speaker.org}` : ''}
          </p>

          <p className="modal__talkLabel">Talk</p>
          <p className="modal__talk">{speaker?.talk}</p>
          <p className="modal__bio">{speaker?.bio}</p>

          <a
            className={`modal__link${speaker?.link ? '' : ' is-hidden'}`}
            href={speaker?.link || undefined}
            target="_blank"
            rel="noopener"
          >
            More about this speaker &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}
