/* ============================================================
   DEVTALKS — SMALL DOM + MATH HELPERS
   ------------------------------------------------------------
   The handful of utilities the hooks share. Everything here is
   SSR-safe: nothing touches `window` at module scope, because
   Vite pre-renders nothing today but might tomorrow.
   ============================================================ */

/** Media queries the whole site branches on. Read at call time, never cached
 *  at module scope — a visitor can change either of these mid-session. */
export const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const isFinePointer = (): boolean =>
  window.matchMedia('(hover:hover) and (pointer:fine)').matches;

export const clamp = (v: number, a: number, b: number): number =>
  (v < a ? a : v > b ? b : v);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** clamp((p - a) / (b - a)) — the share of a segment that `p` has covered. */
export const seg = (p: number, a: number, b: number): number =>
  clamp((p - a) / (b - a), 0, 1);

export const pad2 = (n: number | string): string => String(n).padStart(2, '0');

/** "Speaker One" -> "SO". Used wherever a photo is missing. */
export const initials = (name: string): string =>
  name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

/* Document-space top, from layout rather than from a rect.

   This matters more than it looks. The scroll-flow loop WRITES a transform to
   the same elements it measures, so reading getBoundingClientRect() back off
   one returns a position that already includes the translate the loop put
   there — the measurement feeds the transform which feeds the measurement,
   and the element oscillates. offsetTop is layout, which no transform
   touches, so the loop stays open. */
export function docTop(el: HTMLElement): number {
  let y = 0;
  let n: HTMLElement | null = el;
  while (n) {
    y += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  return y;
}

/** Flush pending style changes synchronously.
 *
 *  focus() is a no-op on a `visibility: hidden` element, and the class that
 *  reveals a dialog has not been applied to the box tree yet when the same
 *  tick calls focus(). Reading a layout property forces the flush.
 *  requestAnimationFrame would work too, except rAF is throttled in a
 *  background tab and the focus would simply never land. */
export const flushStyles = (el: HTMLElement): void => {
  void el.offsetHeight;
};

/** Toggle the scroll lock the modal, the reel viewer and the mobile menu
 *  all share. They can be open at the same time in principle, so this
 *  counts rather than sets. */
let lockDepth = 0;
export function lockScroll(on: boolean): void {
  lockDepth = Math.max(0, lockDepth + (on ? 1 : -1));
  document.body.classList.toggle('is-locked', lockDepth > 0);
}
