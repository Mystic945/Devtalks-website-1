/* ============================================================
   DEVTALKS — DIALOG PLUMBING
   ------------------------------------------------------------
   The speaker modal and the reel viewer are the same object with
   different contents: a scrim, a card, Escape to close, the page
   behind it locked, and focus handed back to whatever opened it.
   This is that behaviour, once.

   THE FOCUS FLUSH
   focus() is a no-op on a `visibility: hidden` element. The CSS
   reveals the dialog on the same frame as the class that opens
   it, but the style has to be flushed before the focus call can
   see it. Reading offsetHeight does that synchronously.
   requestAnimationFrame would work too, except rAF is throttled
   in a background tab and the focus would simply never land.

   THE OPENER
   On a touch tap the button that opened the dialog may never have
   taken focus, so document.activeElement would send the visitor
   back to <body> on close. Callers that know what was pressed
   pass it in.
   ============================================================ */

import { useEffect, useRef, type RefObject } from 'react';
import { flushStyles, lockScroll } from '@/lib/dom';

export function useDialog(
  ref: RefObject<HTMLElement>,
  open: boolean,
  onClose: () => void,
  opener?: RefObject<HTMLElement | null>
): void {
  const restoreTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !open) return;

    restoreTo.current =
      opener?.current ?? (document.activeElement as HTMLElement | null);

    lockScroll(true);

    // See "the focus flush" above.
    flushStyles(el);
    el.querySelector<HTMLElement>('[data-autofocus]')?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      onClose();
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      lockScroll(false);
      restoreTo.current?.focus?.();
      restoreTo.current = null;
    };
  }, [ref, open, onClose, opener]);
}
