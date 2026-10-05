/* ============================================================
   DEVTALKS — HANDLING THE STRIP
   ------------------------------------------------------------
   Once the scroll has finished with the loop, it is yours: grab it
   and it turns. This is the hand-feel of the strip in the hero of
   the main site (mobius-puce.vercel.app), carried over constant for
   constant so the two behave as one object:

     • dragging sideways ROLLS it — the band runs round the loop,
       0.009 rad per pixel — and yaws it a little, 0.0016
     • dragging up and down TILTS it, 0.004 rad per pixel
     • let go and it coasts: each axis keeps its speed and loses it
       at its own rate, the roll easing back to a slow idle turn
       rather than to a stop
     • tilt and yaw have soft walls — you can pull past them and
       they ease you back, they never clunk
     • turning hard makes the loop LAG: the trailing side lifts and
       swings behind, then settles
     • the paper gives where you press it, and a little where you
       only hover

   Nothing here knows about three.js or the DOM. It takes pointer
   positions in, and gives numbers out; useMobius turns them into a
   pose. That keeps the feel in one place, readable next to the
   reference it was taken from.
   ============================================================ */

import { clamp } from '@/lib/dom';

export const PLAY = {
  roll: 0.009, // rad per px of sideways drag
  yaw: 0.0016, // rad per px of sideways drag
  tilt: 0.004, // rad per px of vertical drag
  idle: 0.09, // rad/s the roll settles to when left alone
  hold: 8, // how fast speed dies while held still
  rollFade: 1.1, // …and after letting go, per axis
  yawFade: 1.4,
  tiltFade: 1.6,
  wall: 3, // how firmly a soft limit eases you back
  yawMax: 0.75,
  lagMax: 0.32,
  lagEase: 2.6,
  press: 0.8, // how far the paper gives under a drag
  hover: 0.28, // …and under a resting cursor
  pressEase: 5
} as const;

export interface Motion {
  roll: number;
  yaw: number;
  tilt: number;
  lag: number;
  push: number;
}

const damp = (a: number, b: number, lambda: number, dt: number): number =>
  a + (b - a) * (1 - Math.exp(-lambda * dt));

export interface StripPlay {
  down(x: number, y: number): void;
  move(x: number, y: number): void;
  up(): void;
  over(on: boolean): void;
  /** Advance by dt seconds. `live` is false until the scroll has let go. */
  step(dt: number, live: boolean, tiltMin: number, tiltMax: number): Motion;
  reset(): void;
  readonly dragging: boolean;
  /** true while anything is still moving, so the frame loop keeps drawing */
  readonly busy: boolean;
}

export function createStripPlay(): StripPlay {
  const p = { dragging: false, x: 0, y: 0, over: 0, dx: 0, dy: 0 };
  const m = { roll: 0, rollV: 0, yaw: 0, yawV: 0, tilt: 0, tiltV: 0, lag: 0, push: 0 };

  return {
    down(x, y) {
      p.dragging = true;
      p.x = x;
      p.y = y;
    },

    move(x, y) {
      if (!p.dragging) return;
      p.dx += x - p.x;
      p.dy += y - p.y;
      p.x = x;
      p.y = y;
    },

    up() {
      p.dragging = false;
    },

    over(on) {
      p.over = on ? 1 : 0;
    },

    step(dt, live, tiltMin, tiltMax) {
      const h = Math.min(dt, 1 / 30);
      const idle = live ? PLAY.idle : 0;
      // a per-frame nudge, as a speed
      const speed = (d: number) => d / Math.max(h, 1 / 120);

      if (!live) {
        p.dragging = false;
        p.dx = 0;
        p.dy = 0;
      }

      if (p.dx !== 0 || p.dy !== 0) {
        const r = PLAY.roll * p.dx;
        const y = PLAY.yaw * p.dx;
        const t = PLAY.tilt * p.dy;
        m.roll += r;
        m.yaw += y;
        m.tilt += t;
        m.rollV += (speed(r) - m.rollV) * 0.5;
        m.yawV += (speed(y) - m.yawV) * 0.5;
        m.tiltV += (speed(t) - m.tiltV) * 0.5;
        p.dx = 0;
        p.dy = 0;
      } else if (p.dragging) {
        // held, but not moving: the throw you were winding up drains away
        const k = Math.exp(-PLAY.hold * h);
        m.rollV *= k;
        m.yawV *= k;
        m.tiltV *= k;
      } else {
        m.rollV = idle + (m.rollV - idle) * Math.exp(-PLAY.rollFade * h);
        m.yawV *= Math.exp(-PLAY.yawFade * h);
        m.tiltV *= Math.exp(-PLAY.tiltFade * h);
        m.roll += m.rollV * h;
        m.yaw += m.yawV * h;
        m.tilt += m.tiltV * h;
      }

      // soft walls
      if (m.tilt > tiltMax) m.tilt = damp(m.tilt, tiltMax, PLAY.wall, h);
      if (m.tilt < tiltMin) m.tilt = damp(m.tilt, tiltMin, PLAY.wall, h);
      if (m.yaw > PLAY.yawMax) m.yaw = damp(m.yaw, PLAY.yawMax, PLAY.wall, h);
      if (m.yaw < -PLAY.yawMax) m.yaw = damp(m.yaw, -PLAY.yawMax, PLAY.wall, h);

      const swing = clamp((m.rollV - idle) * 0.06 + 0.5 * m.yawV, -PLAY.lagMax, PLAY.lagMax);
      m.lag = damp(m.lag, live ? swing : 0, PLAY.lagEase, h);

      const press = live ? (p.dragging ? PLAY.press : PLAY.hover * p.over) : 0;
      m.push = damp(m.push, press, PLAY.pressEase, h);

      return m;
    },

    reset() {
      p.dragging = false;
      p.dx = 0;
      p.dy = 0;
      m.roll = m.rollV = m.yaw = m.yawV = m.tilt = m.tiltV = m.lag = m.push = 0;
    },

    get dragging() {
      return p.dragging;
    },

    get busy() {
      return (
        p.dragging ||
        Math.abs(m.rollV) > 1e-3 ||
        Math.abs(m.yawV) > 1e-3 ||
        Math.abs(m.tiltV) > 1e-3 ||
        Math.abs(m.lag) > 1e-3 ||
        m.push > 1e-3
      );
    }
  };
}
