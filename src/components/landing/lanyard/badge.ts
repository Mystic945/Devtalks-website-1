/* ============================================================
   DEVTALKS — BADGE ARTWORK
   ------------------------------------------------------------
   Paints the front and back of the lanyard's card onto canvases
   and hands back PNG data URLs, which <Lanyard /> composites
   into the card model's texture.

   Drawn here rather than shipped as two images so the words stay
   in step with SITE (name, year, theme, date, venue) and use the
   site's own embedded fonts. It runs once, when the lanyard chunk
   loads.

   SIZE
   Each face of card.glb maps to roughly 839 x 1266 px of its
   atlas — a 0.663 aspect. The canvases are 1024 x 1545, the same
   ratio, and the Lanyard fits them with `cover`. The top ~180px is
   left plain: the metal clip sits over it.
   ============================================================ */

import { SITE } from '@/data/site';

const W = 1024;
const H = 1545;
const BLACK = '#0b0b0b';
const PAPER = '#f3eee4';
const ORANGE = '#ff5a1f';

const DISPLAY = 'Anton, "Arial Narrow", Impact, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, Menlo, monospace';

export interface BadgeArt {
  front: string;
  back: string;
  band: string;
}

async function loadFonts() {
  if (!('fonts' in document)) return;
  try {
    await Promise.all([
      document.fonts.load('400 200px Anton'),
      document.fonts.load('600 40px "JetBrains Mono"')
    ]);
  } catch {
    // Fall back to the system faces named in the stacks above.
  }
}

function makeCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d canvas unavailable');
  return { canvas, ctx };
}

/** Font size that makes `text` as wide as `maxW`, never larger than `start`. */
function fitSize(ctx: CanvasRenderingContext2D, text: string, family: string, maxW: number, start: number) {
  ctx.font = `400 ${start}px ${family}`;
  return start * Math.min(1, maxW / ctx.measureText(text).width);
}

function halftone(ctx: CanvasRenderingContext2D, color: string, alpha: number, step: number, radius: number) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  for (let y = step / 2; y < H; y += step) {
    for (let x = step / 2; x < W; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** A barcode that is the same on every load: bar widths come from the seed. */
function barcode(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: string, color: string) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  const next = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);

  ctx.fillStyle = color;
  let cx = x;
  while (cx < x + w) {
    const bar = 4 + Math.floor(next() * 3) * 4;
    const gap = 4 + Math.floor(next() * 3) * 4;
    ctx.fillRect(cx, y, Math.min(bar, x + w - cx), h);
    cx += bar + gap;
  }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const trial = line ? `${line} ${word}` : word;
    if (ctx.measureText(trial).width > maxW && line) {
      lines.push(line);
      line = word;
    } else {
      line = trial;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function paintFront(): string {
  const { canvas, ctx } = makeCanvas();

  ctx.fillStyle = BLACK;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W / 2, 640, 40, W / 2, 640, 620);
  glow.addColorStop(0, 'rgba(255, 90, 31, 0.22)');
  glow.addColorStop(1, 'rgba(255, 90, 31, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  halftone(ctx, PAPER, 0.1, 22, 2.2);

  // the line under the clip
  ctx.fillStyle = 'rgba(243, 238, 228, 0.55)';
  ctx.font = `600 30px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.letterSpacing = '8px';
  ctx.fillText(`${SITE.eventName.toUpperCase()} / ${SITE.edition}`, W / 2, 232);

  // the wordmark, tipped the way the landing page tips it
  const size = fitSize(ctx, 'TALKS', DISPLAY, W * 0.8, 430);
  ctx.save();
  ctx.translate(W / 2, 640);
  ctx.rotate((-3 * Math.PI) / 180);
  ctx.letterSpacing = '0px';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `400 ${size}px ${DISPLAY}`;
  ctx.fillStyle = PAPER;
  ctx.fillText('DEV', 0, -size * 0.08);
  ctx.fillStyle = ORANGE;
  ctx.fillText('TALKS', 0, size * 0.82);
  ctx.restore();

  // theme
  ctx.strokeStyle = 'rgba(243, 238, 228, 0.28)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(72, 1090);
  ctx.lineTo(W - 72, 1090);
  ctx.stroke();

  ctx.fillStyle = PAPER;
  ctx.textAlign = 'left';
  ctx.letterSpacing = '5px';
  ctx.font = `600 32px ${MONO}`;
  ctx.fillText(SITE.theme.toUpperCase(), 72, 1148);

  // the pass
  ctx.letterSpacing = '0px';
  ctx.fillStyle = ORANGE;
  ctx.beginPath();
  ctx.roundRect(72, 1196, 318, 78, 39);
  ctx.fill();
  ctx.fillStyle = BLACK;
  ctx.font = `600 34px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.letterSpacing = '4px';
  ctx.fillText('ALL ACCESS', 72 + 159, 1196 + 51);

  ctx.textAlign = 'left';
  ctx.letterSpacing = '2px';
  ctx.fillStyle = 'rgba(243, 238, 228, 0.85)';
  ctx.font = `400 30px ${MONO}`;
  ctx.fillText(SITE.dateLabel.toUpperCase(), 72, 1338);
  ctx.fillText(SITE.venueShort.toUpperCase(), 72, 1382);

  barcode(ctx, 72, 1420, W - 144, 78, SITE.date, PAPER);

  return canvas.toDataURL('image/png');
}

function paintBack(): string {
  const { canvas, ctx } = makeCanvas();

  ctx.fillStyle = ORANGE;
  ctx.fillRect(0, 0, W, H);
  halftone(ctx, BLACK, 0.14, 22, 2.4);

  // the year, huge
  const year = SITE.edition.slice(-2);
  const size = fitSize(ctx, year, DISPLAY, W * 0.92, 980);
  ctx.fillStyle = BLACK;
  ctx.textAlign = 'center';
  ctx.letterSpacing = '0px';
  ctx.font = `400 ${size}px ${DISPLAY}`;
  ctx.fillText(year, W / 2, 200 + size * 0.86);

  // the sign-off
  ctx.textAlign = 'left';
  ctx.fillStyle = BLACK;
  ctx.font = `600 44px ${MONO}`;
  ctx.letterSpacing = '5px';
  ctx.fillText('SEE YOU ON STAGE', 72, 1120);

  ctx.font = `400 30px ${MONO}`;
  ctx.letterSpacing = '1px';
  const lines = wrap(ctx, SITE.venue.toUpperCase(), W - 144);
  lines.forEach((l, i) => ctx.fillText(l, 72, 1178 + i * 42));

  ctx.fillText(SITE.dateLabel.toUpperCase(), 72, 1178 + lines.length * 42 + 14);

  // a strip in paper, like a tab on a pass
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 1360, W, 52);
  ctx.fillStyle = BLACK;
  ctx.textAlign = 'center';
  ctx.letterSpacing = '6px';
  ctx.font = `600 26px ${MONO}`;
  ctx.fillText('IDEAS  ·  CODE  ·  PEOPLE  ·  IMPACT', W / 2, 1360 + 35);

  barcode(ctx, 72, 1440, W - 144, 62, SITE.club, BLACK);

  return canvas.toDataURL('image/png');
}

/* The band. The Lanyard repeats this texture four times along the rope, so
   each repeat is a short, thin tile; the wordmark is drawn narrower than it
   looks here to allow for that stretch. */
function paintBand(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d canvas unavailable');

  ctx.fillStyle = ORANGE;
  ctx.fillRect(0, 0, 1024, 256);

  ctx.fillStyle = BLACK;
  ctx.fillRect(0, 0, 1024, 18);
  ctx.fillRect(0, 238, 1024, 18);

  ctx.save();
  ctx.translate(512, 128);
  ctx.scale(0.62, 1);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `400 168px ${DISPLAY}`;
  ctx.fillStyle = BLACK;
  ctx.fillText('DEVTALKS', 0, 6);
  ctx.restore();

  return canvas.toDataURL('image/png');
}

export async function paintBadge(): Promise<BadgeArt> {
  await loadFonts();
  return { front: paintFront(), back: paintBack(), band: paintBand() };
}
