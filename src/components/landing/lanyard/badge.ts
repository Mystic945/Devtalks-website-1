/* ============================================================
   KURUKSHETRA — BADGE ARTWORK
   ------------------------------------------------------------
   Paints the front and back of the lanyard's card, and the strap,
   onto canvases and hands back PNG data URLs, which <Lanyard />
   composites into the card model's texture.

   It is a warrior's pass: near-black with the chakra in gold on
   the front, gold with the chakra cut into it on the back, and a
   gold strap. Nothing on it names anything but Kurukshetra.

   Drawn here rather than shipped as images so the words stay in
   step with KURUKSHETRA in data/site.ts, the medallion is the same
   one that turns on the footer (lib/kurukshetraBand), and the type
   is the landing page's own. It runs once, when the lanyard chunk
   loads.

   SIZE
   Each face of card.glb maps to roughly 839 x 1266 px of its
   atlas — a 0.663 aspect. The canvases are 1024 x 1545, the same
   ratio, and the Lanyard fits them with `cover`. The top ~180px is
   left plain: the metal clip sits over it.
   ============================================================ */

import { KURUKSHETRA } from '@/data/site';
import { paintBoss } from '@/lib/kurukshetraBand';

const W = 1024;
const H = 1545;
const M = 72; // side margin

const GROUND = '#0b0b0b';
const UMBER = '#17100d';
const UMBER_2 = '#24140f';
const GOLD_LIT = '#efcb76';
const GOLD = '#deae58';
const GOLD_DEEP = '#b58530';
const GOLD_DARK = '#a97a2b';
const SHINE = '#ffe9b4';
const BONE = '#f3eee4';
const INK = '#2b1a07'; // what is pressed into gold

const SERIF = 'Cinzel, "Trajan Pro", "Times New Roman", serif';
const TEXT = '"EB Garamond", Georgia, serif';
const DEVA = '"Tiro Devanagari Sanskrit", "Nirmala UI", serif';
const MONO = '"JetBrains Mono", ui-monospace, Menlo, monospace';

const NAME = KURUKSHETRA.name.toUpperCase();
const TAU = Math.PI * 2;

export interface BadgeArt {
  front: string;
  back: string;
  band: string;
}

type Ctx = CanvasRenderingContext2D;

async function loadFonts() {
  if (!('fonts' in document)) return;
  try {
    await Promise.all([
      document.fonts.load('900 200px Cinzel', NAME),
      document.fonts.load('500 40px "EB Garamond"', 'THE BATTLE'),
      document.fonts.load('400 60px "Tiro Devanagari Sanskrit"', KURUKSHETRA.devanagari),
      document.fonts.load('600 40px "JetBrains Mono"')
    ]);
  } catch {
    // Fall back to the system faces named in the stacks above.
  }
}

function makeCanvas(w = W, h = H) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d canvas unavailable');
  return { canvas, ctx };
}

/** Font size that makes `text` as wide as `maxW`, never larger than `start`.
 *  Call it with the letter-spacing already set. */
function fitSize(ctx: Ctx, text: string, weight: number, family: string, maxW: number, start: number) {
  ctx.font = `${weight} ${start}px ${family}`;
  return start * Math.min(1, maxW / ctx.measureText(text).width);
}

/** A barcode that is the same on every load: bar widths come from the seed. */
function barcode(ctx: Ctx, x: number, y: number, w: number, h: number, seed: string, color: string) {
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

/** Gold as a sheet of metal: lit at the top, worn unevenly. */
function metal(ctx: Ctx, w: number, h: number, seed: number) {
  const sheet = ctx.createLinearGradient(0, 0, w * 0.25, h);
  sheet.addColorStop(0, '#f6da8c');
  sheet.addColorStop(0.3, GOLD_LIT);
  sheet.addColorStop(0.66, GOLD);
  sheet.addColorStop(1, GOLD_DARK);
  ctx.fillStyle = sheet;
  ctx.fillRect(0, 0, w, h);

  let s = seed >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 46; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const r = 60 + rnd() * 240;
    const tone = rnd() < 0.55 ? '112, 70, 18' : '255, 236, 170';
    const blot = ctx.createRadialGradient(x, y, 0, x, y, r);
    blot.addColorStop(0, `rgba(${tone}, ${0.05 + rnd() * 0.08})`);
    blot.addColorStop(1, `rgba(${tone}, 0)`);
    ctx.fillStyle = blot;
    ctx.fillRect(0, 0, w, h);
  }
}

/** A frame with a bracket in each corner. */
function frame(ctx: Ctx, inset: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 2;
  ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
  ctx.globalAlpha = 1;
  ctx.lineWidth = 5;
  const arm = 54;
  const corners: Array<[number, number, number, number]> = [
    [inset, inset, 1, 1],
    [W - inset, inset, -1, 1],
    [inset, H - inset, 1, -1],
    [W - inset, H - inset, -1, -1]
  ];
  for (const [x, y, dx, dy] of corners) {
    ctx.beginPath();
    ctx.moveTo(x + arm * dx, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + arm * dy);
    ctx.stroke();
  }
  ctx.restore();
}

/** The wheel, as line work: rim, hub, eight spokes, sixteen teeth. */
function wheel(ctx: Ctx, cx: number, cy: number, r: number, color: string) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = r * 0.045;

  [1, 0.86, 0.2].forEach((k) => {
    ctx.beginPath();
    ctx.arc(0, 0, r * k, 0, TAU);
    ctx.stroke();
  });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2);
    ctx.lineTo(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86);
    ctx.stroke();
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    const w = 0.085;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a - w) * r * 1.02, Math.sin(a - w) * r * 1.02);
    ctx.lineTo(Math.cos(a) * r * 1.2, Math.sin(a) * r * 1.2);
    ctx.lineTo(Math.cos(a + w) * r * 1.02, Math.sin(a + w) * r * 1.02);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.07, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function paintFront(): string {
  const { canvas, ctx } = makeCanvas();

  const ground = ctx.createLinearGradient(0, 0, 0, H);
  ground.addColorStop(0, UMBER_2);
  ground.addColorStop(0.5, UMBER);
  ground.addColorStop(1, GROUND);
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, W, H);

  // the light the medallion sits in
  const glow = ctx.createRadialGradient(W / 2, 560, 60, W / 2, 560, 560);
  glow.addColorStop(0, 'rgba(239, 203, 118, 0.3)');
  glow.addColorStop(1, 'rgba(239, 203, 118, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  frame(ctx, 34, GOLD);

  // the line under the clip
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(243, 238, 228, 0.6)';
  ctx.font = `600 28px ${MONO}`;
  ctx.letterSpacing = '9px';
  ctx.fillText(`EDITION ${KURUKSHETRA.year}`, W / 2, 236);

  // the chakra — the same medallion that turns on the footer
  const boss = paintBoss(448);
  ctx.drawImage(boss, W / 2 - 258, 302, 516, 516);

  // the name, in both scripts
  ctx.fillStyle = GOLD;
  ctx.letterSpacing = '0px';
  ctx.font = `400 62px ${DEVA}`;
  ctx.fillText(KURUKSHETRA.devanagari, W / 2, 912);

  ctx.letterSpacing = '7px';
  const size = fitSize(ctx, NAME, 900, SERIF, W - M * 2, 132);
  ctx.font = `900 ${size}px ${SERIF}`;
  const struck = ctx.createLinearGradient(0, 1022 - size, 0, 1022);
  struck.addColorStop(0, SHINE);
  struck.addColorStop(0.45, GOLD_LIT);
  struck.addColorStop(0.75, GOLD);
  struck.addColorStop(1, GOLD_DARK);
  ctx.fillStyle = struck;
  ctx.fillText(NAME, W / 2 + 3, 1022);

  ctx.fillStyle = BONE;
  ctx.letterSpacing = '4px';
  const line = KURUKSHETRA.tagline.toUpperCase();
  const lineSize = fitSize(ctx, line, 500, TEXT, W - M * 2, 40);
  ctx.font = `500 ${lineSize}px ${TEXT}`;
  ctx.fillText(line, W / 2 + 2, 1082);

  ctx.strokeStyle = 'rgba(222, 174, 88, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(M, 1128);
  ctx.lineTo(W - M, 1128);
  ctx.stroke();

  // the pass: a square gold tab
  ctx.fillStyle = GOLD_LIT;
  ctx.fillRect(M, 1166, 452, 86);
  ctx.fillStyle = INK;
  ctx.font = `600 36px ${MONO}`;
  ctx.letterSpacing = '7px';
  ctx.fillText('WARRIOR PASS', M + 226 + 3, 1166 + 56);

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(243, 238, 228, 0.88)';
  ctx.letterSpacing = '3px';
  ctx.font = `400 30px ${MONO}`;
  ctx.fillText(KURUKSHETRA.dateLabel.toUpperCase(), M, 1318);
  const where = KURUKSHETRA.venue.toUpperCase();
  const whereSize = fitSize(ctx, where, 400, MONO, W - M * 2, 30);
  ctx.font = `400 ${whereSize}px ${MONO}`;
  ctx.fillText(where, M, 1362);

  barcode(ctx, M, 1404, W - M * 2, 72, KURUKSHETRA.dateLabel, GOLD);

  return canvas.toDataURL('image/png');
}

function paintBack(): string {
  const { canvas, ctx } = makeCanvas();

  metal(ctx, W, H, 2026);
  frame(ctx, 34, INK);

  // the wheel, cut into the gold: a pale pass, then the ink over it
  wheel(ctx, W / 2 + 3, 640 + 3, 290, 'rgba(255, 241, 196, 0.5)');
  wheel(ctx, W / 2, 640, 290, INK);

  ctx.fillStyle = INK;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.letterSpacing = '6px';
  ctx.font = `600 44px ${MONO}`;
  ctx.fillText('SEE YOU ON THE FIELD', M, 1108);

  ctx.letterSpacing = '2px';
  ctx.font = `400 30px ${MONO}`;
  ctx.fillText(KURUKSHETRA.venue.toUpperCase(), M, 1164);
  ctx.fillText(KURUKSHETRA.dateLabel.toUpperCase(), M, 1208);

  // a dark strip, like a tab on a pass, carrying the strip's four words
  ctx.fillStyle = GROUND;
  ctx.fillRect(0, 1278, W, 58);
  ctx.fillStyle = GOLD_LIT;
  ctx.textAlign = 'center';
  ctx.letterSpacing = '6px';
  ctx.font = `600 26px ${MONO}`;
  ctx.fillText('IDEAS  ·  CODE  ·  PEOPLE  ·  IMPACT', W / 2, 1278 + 38);

  barcode(ctx, M, 1392, W - M * 2, 66, KURUKSHETRA.name, INK);

  return canvas.toDataURL('image/png');
}

/* The strap. The Lanyard repeats this texture four times along the rope, so
   each repeat is a short, thin tile; the wordmark is drawn narrower than it
   looks here to allow for that stretch. */
function paintBand(): string {
  const { canvas, ctx } = makeCanvas(1024, 256);

  const sheet = ctx.createLinearGradient(0, 0, 0, 256);
  sheet.addColorStop(0, GOLD_DEEP);
  sheet.addColorStop(0.5, GOLD_LIT);
  sheet.addColorStop(1, GOLD_DEEP);
  ctx.fillStyle = sheet;
  ctx.fillRect(0, 0, 1024, 256);

  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, 1024, 16);
  ctx.fillRect(0, 240, 1024, 16);
  ctx.fillRect(0, 30, 1024, 4);
  ctx.fillRect(0, 222, 1024, 4);

  // a diamond between one repeat and the next
  ctx.save();
  ctx.translate(74, 128);
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-26, -26, 52, 52);
  ctx.restore();

  ctx.save();
  ctx.translate(574, 128);
  ctx.scale(0.6, 1);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '10px';
  ctx.font = `900 132px ${SERIF}`;
  ctx.fillStyle = INK;
  ctx.fillText(NAME, 0, 8);
  ctx.restore();

  return canvas.toDataURL('image/png');
}

export async function paintBadge(): Promise<BadgeArt> {
  await loadFonts();
  return { front: paintFront(), back: paintBack(), band: paintBand() };
}
