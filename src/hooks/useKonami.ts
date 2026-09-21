/* ============================================================
   DEVTALKS — THE KONAMI CODE
   ------------------------------------------------------------
   ↑ ↑ ↓ ↓ ← → ← → B A puts the site back into its paper edition:
   cream ground, black ink, the comic drop shadows. That edition
   is not a mock-up — it is the design this site shipped as, and
   every rule of it is still in the stylesheets underneath. The
   dark edition is one guarded block on top, so the cheat code
   only has to take the guard away.

   WHY A REF AND NOT STATE
   The sequence is matched on every keypress. Holding the
   progress in state would re-render the whole page on each
   arrow key, which is a lot of work to recognise a wrong guess.

   TYPING SAFETY
   Ignored while a field has focus, so nobody's "a" in a form
   counts toward the code.
   ============================================================ */

import { useEffect, useRef } from 'react';

const SEQUENCE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a'
] as const;

const isTyping = (t: EventTarget | null): boolean => {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return (
    el.isContentEditable ||
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT'
  );
};

export function useKonami(onUnlock: (nowPaper: boolean) => void): void {
  const step = useRef(0);
  const cb = useRef(onUnlock);
  cb.current = onUnlock;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;

      const want = SEQUENCE[step.current];
      const got = e.key.length === 1 ? e.key.toLowerCase() : e.key;

      if (got !== want) {
        // A wrong key is not necessarily a reset: it might be the first key
        // of a fresh attempt.
        step.current = got === SEQUENCE[0] ? 1 : 0;
        return;
      }

      step.current += 1;
      if (step.current < SEQUENCE.length) return;

      step.current = 0;
      const nowPaper = document.documentElement.classList.toggle('paper-edition');
      cb.current(nowPaper);
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
