/* ============================================================
   DEVTALKS — THE BAND, KURUKSHETRA EDITION
   ------------------------------------------------------------
   What is printed on the Möbius strip: one lap of it, painted to
   a canvas and wrapped round the loop twice (once per face).

   It used to be a dark band with a ruler along each edge. It is
   now the strip of the main site (mobius-puce.vercel.app) — beaten
   gold, with the field of Kurukshetra running round it in dark
   ink — carrying the same four words it always did.

   WHAT IS ON IT, TOP TO BOTTOM
     • a border along each edge: a rule and a row of arrowheads
       pointing inward, where the ruler's ticks used to be
     • the four words, the same size and in the same place, now in
       dark ink
     • in the gap before each word, an emblem of the war: the
       chakra, the bow with its arrow nocked, the mace, and two
       swords crossed behind a shield
     • under all of it, an army on the march in the direction the
       words read: spearmen, archers and horsemen under the words,
       and in the gaps — where there is headroom — the tall things:
       chariots, elephants with howdahs, standard-bearers

   HOW IT IS DRAWN
   With paths, not pictures: every figure is a few triangles,
   circles and strokes, the way a frieze is cut. Nothing is loaded.
   The layout is laid out by a seeded random sequence, so the army
   is irregular but identical on every visit, and everything that
   touches the left or right edge is drawn again on the far side,
   because the two ends of this canvas meet on the strip.

   Everything is drawn twice — once pale and a pixel and a half
   off, once dark and true — which is what makes the ink look cut
   into the metal rather than printed on it.
   ============================================================ */

const W = 4096;
const H = 256;
const TAU = Math.PI * 2;

/* The main site's gold, light at the shoulder of the band and deep at its edges. */
const GOLD = ['#b58530', '#efcb76', '#deae58', '#a97a2b'] as const;
const INK = '36, 19, 6'; // the dark of the figures, as rgb channels
const SHINE = 'rgba(255, 241, 196, 0.42)'; // the pale pass under the ink

/* Where things sit on the band. The words span 36–182 at this type size;
   the army has what is left under them. */
const LAY = {
  borderTop: 7,
  borderBottom: H - 9,
  ground: 230, // the line the army stands on: the border's inner rule
  emblemY: 103,
  emblemR: 56
} as const;

/** A small seeded generator, so the frieze is the same every time. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Ctx = CanvasRenderingContext2D;

/* ---------- the pen ---------- */

function pen(g: Ctx) {
  const dot = (x: number, y: number, r: number) => {
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
  };
  const line = (x1: number, y1: number, x2: number, y2: number, w = 2.6) => {
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
  };
  const poly = (...p: number[]) => {
    g.beginPath();
    g.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]);
    g.closePath();
    g.fill();
  };
  const curve = (x1: number, y1: number, cx: number, cy: number, x2: number, y2: number, w = 2.6) => {
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(x1, y1);
    g.quadraticCurveTo(cx, cy, x2, y2);
    g.stroke();
  };
  const ring = (x: number, y: number, r: number, w: number) => {
    g.lineWidth = w;
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.stroke();
  };
  return { dot, line, poly, curve, ring };
}

/* ---------- the army ---------- */

type Kind = 'spear' | 'archer' | 'rider' | 'flag' | 'chariot' | 'elephant';
interface Unit {
  kind: Kind;
  x: number;
  /** a per-figure variation: stride, shield or not */
  v: number;
}

const WIDTH: Record<Kind, number> = {
  spear: 25,
  archer: 40,
  rider: 66,
  flag: 30,
  chariot: 126,
  elephant: 92
};
const TALL: Record<Kind, boolean> = {
  spear: false,
  archer: false,
  rider: false,
  flag: true,
  chariot: true,
  elephant: true
};

function drawUnit(g: Ctx, u: Unit) {
  const { dot, line, poly, curve, ring } = pen(g);
  const y: number = LAY.ground;
  const x = u.x;

  /** A foot soldier: legs mid-stride, a wedge of a torso, a head. */
  const man = (cx: number, base = y, stride = 1) => {
    line(cx, base - 16, cx - 5 * stride, base, 3);
    line(cx, base - 16, cx + 6 * stride, base, 3);
    poly(cx - 7, base - 31, cx + 7, base - 31, cx, base - 14);
    dot(cx, base - 36.5, 4.3);
  };
  /** A horse, nose at the right, about 62 wide from x0. */
  const horse = (x0: number) => {
    g.beginPath();
    g.ellipse(x0 + 27, y - 17, 17, 7.2, 0, 0, TAU);
    g.fill();
    poly(x0 + 38, y - 22, x0 + 48, y - 35, x0 + 53, y - 31, x0 + 44, y - 13); // neck
    poly(x0 + 48, y - 35, x0 + 59, y - 33, x0 + 60, y - 29, x0 + 51, y - 28); // head
    poly(x0 + 48, y - 35, x0 + 49, y - 39, x0 + 51, y - 35); // ear
    line(x0 + 39, y - 13, x0 + 44, y, 2.6);
    line(x0 + 36, y - 12, x0 + 33, y, 2.6);
    line(x0 + 16, y - 13, x0 + 11, y, 2.6);
    line(x0 + 19, y - 12, x0 + 22, y, 2.6);
    curve(x0 + 10, y - 20, x0 + 2, y - 18, x0 + 3, y - 6, 2.4); // tail
  };
  /** A pennant on a pole, streaming back from the direction of march. */
  const standard = (px: number, foot: number, top: number) => {
    line(px, foot, px, top, 2);
    poly(px, top, px, top + 12, px - 22, top + 6);
    dot(px, top - 1.5, 2);
  };

  switch (u.kind) {
    case 'spear': {
      man(x + 9, y, u.v > 0.5 ? 1 : -1);
      line(x + 19, y, x + 19, y - 38, 2);
      poly(x + 19, y - 42, x + 21.6, y - 36.5, x + 16.4, y - 36.5);
      line(x + 15, y - 29, x + 19, y - 25, 2.4);
      if (u.v > 0.35) dot(x + 3, y - 22, 5.2);
      break;
    }
    case 'archer': {
      man(x + 9, y, u.v > 0.5 ? 1 : -1);
      g.lineWidth = 2.4;
      g.beginPath();
      g.arc(x + 13, y - 25, 13, -1.05, 1.05);
      g.stroke();
      line(x + 19.5, y - 36.3, x + 19.5, y - 13.7, 1.1); // string
      line(x + 11, y - 25, x + 33, y - 25, 1.6); // arrow
      poly(x + 38, y - 25, x + 32, y - 28, x + 32, y - 22);
      line(x + 15, y - 29, x + 22, y - 25, 2.4);
      break;
    }
    case 'rider': {
      horse(x + 2);
      poly(x + 23, y - 36, x + 35, y - 36, x + 29, y - 21); // the rider
      dot(x + 29, y - 40, 3.8);
      line(x + 31, y - 31, x + 60, y - 41, 1.8); // lance, levelled
      poly(x + 64, y - 42.4, x + 58, y - 43, x + 59.5, y - 38.2);
      break;
    }
    case 'flag': {
      man(x + 10, y, u.v > 0.5 ? 1 : -1);
      standard(x + 22, y, y - 58);
      line(x + 16, y - 29, x + 22, y - 26, 2.4);
      break;
    }
    case 'chariot': {
      horse(x + 60);
      line(x + 42, y - 17, x + 76, y - 19, 2); // the pole to the yoke
      // the car: a floor and a raised, curved front
      poly(x + 8, y - 13, x + 44, y - 13, x + 44, y - 19, x + 8, y - 19);
      curve(x + 44, y - 16, x + 50, y - 30, x + 41, y - 36, 3);
      line(x + 8, y - 13, x + 8, y - 30, 2.4);
      // the wheel
      ring(x + 24, y - 10, 9.6, 2.4);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU;
        line(x + 24, y - 10, x + 24 + Math.cos(a) * 9, y - 10 + Math.sin(a) * 9, 1.3);
      }
      dot(x + 24, y - 10, 2.6);
      // the archer standing in it, and the standard at its back
      man(x + 26, y - 19, 0.5);
      g.lineWidth = 2.2;
      g.beginPath();
      g.arc(x + 31, y - 44, 12, -1.0, 1.0);
      g.stroke();
      line(x + 37.5, y - 54, x + 37.5, y - 34, 1);
      standard(x + 10, y - 19, y - 64);
      break;
    }
    case 'elephant': {
      g.beginPath();
      g.ellipse(x + 34, y - 24, 25, 14, 0, 0, TAU); // body
      g.fill();
      dot(x + 61, y - 28, 11); // head
      g.beginPath();
      g.ellipse(x + 54, y - 29, 5.5, 9, 0.2, 0, TAU); // ear
      g.fill();
      curve(x + 70, y - 26, x + 78, y - 12, x + 71, y - 4, 5.4); // trunk
      curve(x + 71, y - 4, x + 70, y, x + 76, y - 1, 3.4);
      line(x + 67, y - 21, x + 76, y - 17, 1.8); // tusk
      for (const lx of [14, 26, 42, 52]) poly(x + lx, y - 14, x + lx + 8, y - 14, x + lx + 7, y, x + lx + 1, y);
      curve(x + 9, y - 28, x + 3, y - 22, x + 5, y - 12, 2); // tail
      // the howdah, its canopy, the mahout's head, and a standard
      poly(x + 22, y - 37, x + 46, y - 37, x + 46, y - 45, x + 22, y - 45);
      line(x + 24, y - 45, x + 24, y - 55, 1.6);
      line(x + 44, y - 45, x + 44, y - 55, 1.6);
      poly(x + 19, y - 55, x + 49, y - 55, x + 34, y - 64);
      dot(x + 34, y - 49, 3.4);
      standard(x + 20, y - 45, y - 68);
      break;
    }
  }
}

/** Lay the march out along the band: where each figure stands, and which. */
function muster(spans: Array<[number, number]>): Unit[] {
  const rnd = seeded(1108);
  const units: Unit[] = [];
  /** true where a tall figure would run into a word */
  const underWord = (a: number, b: number) => spans.some(([s, e]) => b > s && a < e);

  let x = 10;
  while (x < W - 30) {
    const roll = rnd();
    let kind: Kind;

    if (!underWord(x, x + WIDTH.chariot)) {
      kind = roll < 0.34 ? 'chariot' : roll < 0.6 ? 'elephant' : roll < 0.86 ? 'flag' : 'spear';
    } else if (!underWord(x, x + WIDTH.flag)) {
      kind = roll < 0.6 ? 'flag' : 'spear';
    } else {
      kind = roll < 0.46 ? 'spear' : roll < 0.68 ? 'archer' : 'rider';
    }
    if (x + WIDTH[kind] > W - 8) break;

    // foot soldiers come in files, the rest alone
    const file = kind === 'spear' ? 2 + Math.floor(rnd() * 3) : kind === 'archer' ? 1 + Math.floor(rnd() * 2) : 1;
    for (let n = 0; n < file; n++) {
      if (x + WIDTH[kind] > W - 8) break;
      if (TALL[kind] && underWord(x, x + WIDTH[kind])) break;
      units.push({ kind, x, v: rnd() });
      x += WIDTH[kind] - (kind === 'spear' ? 4 : 0);
    }
    x += 9 + rnd() * 12;
  }
  return units;
}

/* ---------- the emblems ---------- */

function chakra(g: Ctx, cx: number, cy: number, R: number) {
  const { dot, line, poly, ring } = pen(g);
  // the flames round the rim, leaning the way it turns
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * TAU;
    const p = (r: number, t: number) => [cx + Math.cos(t) * r, cy + Math.sin(t) * r];
    poly(...p(R * 0.8, a - 0.1), ...p(R * 0.8, a + 0.1), ...p(R, a + 0.17));
  }
  ring(cx, cy, R * 0.76, 5);
  ring(cx, cy, R * 0.56, 2);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU + TAU / 24;
    line(cx + Math.cos(a) * R * 0.2, cy + Math.sin(a) * R * 0.2, cx + Math.cos(a) * R * 0.56, cy + Math.sin(a) * R * 0.56, 3);
  }
  dot(cx, cy, R * 0.17);
}

function bow(g: Ctx, cx: number, cy: number, R: number) {
  const { line, poly, curve, dot } = pen(g);
  // the stave, bellied toward the target, tips curled back
  curve(cx - 12, cy - R, cx + 34, cy - R * 0.5, cx + 16, cy, 5.5);
  curve(cx + 16, cy, cx + 34, cy + R * 0.5, cx - 12, cy + R, 5.5);
  curve(cx - 12, cy - R, cx - 20, cy - R - 4, cx - 22, cy - R + 5, 3.4);
  curve(cx - 12, cy + R, cx - 20, cy + R + 4, cx - 22, cy + R - 5, 3.4);
  dot(cx + 16, cy, 4.4); // the grip
  // the string, drawn
  line(cx - 13, cy - R + 1, cx - 38, cy, 1.5);
  line(cx - 13, cy + R - 1, cx - 38, cy, 1.5);
  // the arrow, nocked
  line(cx - 38, cy, cx + 54, cy, 2.6);
  poly(cx + 66, cy, cx + 52, cy - 6, cx + 52, cy + 6);
  for (const dx of [0, 6, 12]) {
    line(cx - 38 + dx, cy, cx - 46 + dx, cy - 7, 1.6);
    line(cx - 38 + dx, cy, cx - 46 + dx, cy + 7, 1.6);
  }
}

function mace(g: Ctx, cx: number, cy: number, R: number) {
  const { line, poly, dot } = pen(g);
  g.save();
  g.translate(cx, cy);
  g.rotate(0.42);
  line(0, R, 0, -R * 0.1, 6); // the haft
  dot(0, R, 5.4); // pommel
  poly(-9, -R * 0.08, 9, -R * 0.08, 7, -R * 0.2, -7, -R * 0.2); // collar
  g.beginPath();
  g.ellipse(0, -R * 0.52, R * 0.36, R * 0.4, 0, 0, TAU); // the head
  g.fill();
  poly(-5, -R * 0.9, 5, -R * 0.9, 0, -R * 1.08); // finial
  dot(0, -R * 1.08, 3.4);
  g.restore();
}

function swords(g: Ctx, cx: number, cy: number, R: number, gold: string) {
  const { dot, line, ring } = pen(g);
  const blade = (flip: number) => {
    g.save();
    g.translate(cx, cy);
    g.scale(flip, 1);
    g.rotate(-0.72);
    // a talwar: a long, shallow crescent
    g.beginPath();
    g.moveTo(-4, R * 0.62);
    g.quadraticCurveTo(-13, -R * 0.2, 2, -R * 1.02);
    g.quadraticCurveTo(-1, -R * 0.2, 4, R * 0.62);
    g.closePath();
    g.fill();
    line(-12, R * 0.62, 12, R * 0.62, 3.6); // guard
    line(0, R * 0.62, 0, R * 0.86, 4.6); // grip
    dot(0, R * 0.9, 4.4); // pommel
    g.restore();
  };
  blade(1);
  blade(-1);
  // the shield in front: cleared to gold, then drawn
  const ink = g.fillStyle;
  g.fillStyle = gold;
  dot(cx, cy + 2, R * 0.47);
  g.fillStyle = ink;
  ring(cx, cy + 2, R * 0.47, 5);
  ring(cx, cy + 2, R * 0.3, 1.8);
  dot(cx, cy + 2, R * 0.1);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU + TAU / 8;
    dot(cx + Math.cos(a) * R * 0.385, cy + 2 + Math.sin(a) * R * 0.385, 2.2);
  }
}

/* ---------- the band ---------- */

export function paintBand(words: string[]): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d');
  if (!g) return cv;
  const rnd = seeded(77);
  g.lineCap = 'round';
  g.lineJoin = 'round';

  /* ---- the metal ---- */
  const metal = g.createLinearGradient(0, 0, 0, H);
  metal.addColorStop(0, GOLD[0]);
  metal.addColorStop(0.3, GOLD[1]);
  metal.addColorStop(0.6, GOLD[2]);
  metal.addColorStop(1, GOLD[3]);
  g.fillStyle = metal;
  g.fillRect(0, 0, W, H);

  // beaten, not rolled: soft patches of dark and light, wrapped across the seam
  for (let i = 0; i < 260; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const r = 34 + rnd() * 120;
    const tone = rnd() < 0.55 ? `112, 70, 18` : `255, 236, 170`;
    const a = 0.04 + rnd() * 0.07;
    const at = [0];
    if (x < r) at.push(W);
    if (x > W - r) at.push(-W);
    for (const ox of at) {
      const blot = g.createRadialGradient(x + ox, y, 0, x + ox, y, r);
      blot.addColorStop(0, `rgba(${tone}, ${a})`);
      blot.addColorStop(1, `rgba(${tone}, 0)`);
      g.fillStyle = blot;
      g.fillRect(x + ox - r, y - r, r * 2, r * 2);
    }
  }
  // the grain of the hammer: short strokes along the band
  for (let i = 0; i < 1500; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    g.strokeStyle = rnd() < 0.5 ? `rgba(96, 58, 14, ${0.03 + rnd() * 0.05})` : `rgba(255, 240, 190, ${0.04 + rnd() * 0.06})`;
    g.lineWidth = 0.8 + rnd() * 0.8;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 16 + rnd() * 70, y + (rnd() - 0.5) * 3);
    g.stroke();
  }

  /* ---- where the words go ---- */
  const slot = W / Math.max(1, words.length);
  g.font = '400 168px Anton, "Arial Narrow", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const track = 10;
  const set = words.map((word, i) => {
    const chars = [...word];
    const widths = chars.map((ch) => g.measureText(ch).width);
    const total = widths.reduce((s, w) => s + w, 0) + track * (chars.length - 1);
    return { chars, widths, total, cx: slot * i + slot / 2 };
  });
  const spans = set.map((s) => [s.cx - s.total / 2 - 12, s.cx + s.total / 2 + 12] as [number, number]);
  const army = muster(spans);

  /* ---- everything inked, twice: pale and offset, then dark and true ---- */
  const inked = (dx: number, dy: number, fill: string) => {
    g.save();
    g.translate(dx, dy);
    g.fillStyle = fill;
    g.strokeStyle = fill;
    const { poly, dot, line } = pen(g);

    // the borders: a rule, arrowheads pointing in, a finer rule
    const step = W / 170;
    for (const [y0, dir] of [[LAY.borderTop, 1], [LAY.borderBottom, -1]] as const) {
      g.fillRect(0, y0 - 1, W, 2.2);
      for (let k = 0; k < 170; k++) {
        const x = k * step;
        poly(x + 3, y0 + dir * 4, x + step - 3, y0 + dir * 4, x + step / 2, y0 + dir * 13);
      }
      g.globalAlpha = 0.55;
      g.fillRect(0, y0 + dir * 17 - 0.7, W, 1.4);
      g.globalAlpha = 1;
    }

    // the words
    g.font = '400 168px Anton, "Arial Narrow", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const s of set) {
      let x = s.cx - s.total / 2;
      s.chars.forEach((ch, k) => {
        g.fillText(ch, x + s.widths[k] / 2, H / 2 + 6);
        x += s.widths[k] + track;
      });
    }

    // an emblem in the gap before each word, with a rule running out to
    // the words on either side
    set.forEach((s, i) => {
      const prev = set[(i + set.length - 1) % set.length];
      const at = slot * i;
      const left = at - slot / 2 + prev.total / 2 + 40;
      const right = at + slot / 2 - s.total / 2 - 40;
      // the first gap straddles the seam, so it is drawn at both ends
      for (const ox of i === 0 ? [0, W] : [0]) {
        const cx = at + ox;
        const R = LAY.emblemR;
        const cy = LAY.emblemY;
        const reach = R + 30;
        if (cx - reach > left + ox) {
          line(left + ox, cy, cx - reach, cy, 2);
          poly(left + ox - 7, cy, left + ox, cy - 5, left + ox + 7, cy, left + ox, cy + 5);
          dot(cx - reach + 8, cy, 3);
        }
        if (cx + reach < right + ox) {
          line(cx + reach, cy, right + ox, cy, 2);
          poly(right + ox - 7, cy, right + ox, cy - 5, right + ox + 7, cy, right + ox, cy + 5);
          dot(cx + reach - 8, cy, 3);
        }
        switch (i % 4) {
          case 0:
            chakra(g, cx, cy, R);
            break;
          case 1:
            bow(g, cx, cy, R);
            break;
          case 2:
            mace(g, cx, cy + 4, R * 1.12);
            break;
          default:
            swords(g, cx, cy + 6, R * 1.22, GOLD[2]);
        }
      }
    });

    // the army, standing on the border's inner rule
    for (const u of army) drawUnit(g, u);

    g.restore();
  };

  inked(1.5, 1.6, SHINE);
  inked(0, 0, `rgba(${INK}, 0.9)`);

  return cv;
}
