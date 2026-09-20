/* ============================================================
   DEVTALKS — CLICK SPARKS
   ------------------------------------------------------------
   A short burst of orange lines wherever the page is clicked.
   One canvas over the whole document, which never takes a
   pointer event and is only ever drawn on while a spark is
   still alive — between bursts this costs exactly nothing,
   because the loop is not running.

   Reference: the ClickSpark component on
   syahrilarfianalmazril.my.id, rebuilt here rather than pulled
   in, because the original is a React component wrapping the
   whole app and this is nine lines of canvas.

   Tuning knobs are in CONFIG.
   ============================================================ */

import { useEffect, type RefObject } from 'react';
import { prefersReducedMotion } from '@/lib/dom';

const CONFIG = {
  count: 8, // lines per burst
  life: 380, // ms a line lives for
  radius: 22, // px from the click the line starts
  length: 13, // px long at full size
  width: 2, // px thick
  colour: '#ff5a1f'
} as const;

interface Spark {
  x: number;
  y: number;
  angle: number;
  born: number;
}

/** Ease-out, so the spark leaves fast and settles — a linear spark
 *  reads as a loading spinner. */
const ease = (t: number): number => 1 - Math.pow(1 - t, 3);

export function useClickSpark(canvasRef: RefObject<HTMLCanvasElement>): void {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prefersReducedMotion()) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let sparks: Spark[] = [];
    let raf: number | null = null;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const frame = () => {
      const now = performance.now();
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      ctx.strokeStyle = CONFIG.colour;
      ctx.lineWidth = CONFIG.width;
      ctx.lineCap = 'round';

      sparks = sparks.filter((s) => now - s.born < CONFIG.life);

      for (const s of sparks) {
        const t = ease((now - s.born) / CONFIG.life);
        const dist = CONFIG.radius * t;
        const len = CONFIG.length * (1 - t);

        const cos = Math.cos(s.angle);
        const sin = Math.sin(s.angle);

        ctx.globalAlpha = 1 - t;
        ctx.beginPath();
        ctx.moveTo(s.x + cos * dist, s.y + sin * dist);
        ctx.lineTo(s.x + cos * (dist + len), s.y + sin * (dist + len));
        ctx.stroke();
      }

      ctx.globalAlpha = 1;

      // Nothing left to draw: stop, and leave the canvas clear.
      if (!sparks.length) {
        raf = null;
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    const onPointerDown = (e: PointerEvent) => {
      // A right-click opens a context menu; sparking under it looks broken.
      if (e.button !== 0) return;

      const born = performance.now();
      // Offset each burst so repeated clicks in one place do not
      // draw the identical asterisk every time.
      const turn = Math.random() * Math.PI * 2;

      for (let i = 0; i < CONFIG.count; i++) {
        sparks.push({
          x: e.clientX,
          y: e.clientY,
          angle: turn + (i / CONFIG.count) * Math.PI * 2,
          born
        });
      }

      if (!raf) raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });

    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointerdown', onPointerDown);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    };
  }, [canvasRef]);
}
