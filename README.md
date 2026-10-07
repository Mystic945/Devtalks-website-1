# DevTalks 2026

The event site for DevTalks 2026 — The Developers Club, D.Y. Patil Institute of
Technology, Pimpri. One page: landing, the loop, line-up, run of show, partners,
venue, FAQ — plus the pass on its own page at `/tickets`.

Built with **Vite + React + TypeScript**. All the motion is GSAP and plain
`requestAnimationFrame`; there is no UI framework and no component library, so
nothing here fights the hand-written CSS the design is made of.

---

## Getting started

```bash
npm install
```

```bash
npm run dev
```

That serves the site at <http://localhost:5173> with hot reload.

| Script              | What it does                                        |
| ------------------- | --------------------------------------------------- |
| `npm run dev`       | Dev server on port 5173                              |
| `npm run build`     | Type-checks, then builds to `dist/`                  |
| `npm run preview`   | Serves the built `dist/` locally, to check a release |
| `npm run typecheck` | Types only, no build                                 |

`npm run build` fails on a type error. That is deliberate — a broken build is
better than a broken deploy.

---

## Editing the content

**Almost everything you will want to change lives in one file:
[`src/data/site.ts`](src/data/site.ts).** Speakers, the schedule, the pass,
sponsors, the FAQ, the marquee, social links, the date and the venue are all
there, and every one of them is typed, so a missing field is a red squiggle
rather than a blank section on the live site.

A few things worth knowing:

- **`SITE.date`** drives the countdown *and* the live "who is on stage" tile.
  Keep the format `YYYY-MM-DDTHH:MM:SS+05:30` — the offset is what makes the
  schedule correct for a visitor in another timezone.
- **`SITE.registerUrl`** is where every "Get tickets" button points. While it is
  `#tickets` the buttons scroll to the ticket section; paste a real form URL in
  and all of them open it in a new tab instead.
- **Speaker photos** go in `public/assets/`. Reference them
  from `site.ts` as `/assets/…`.
- **The reel is parked until after the event.** It is off the page and out of
  the nav, but `Reel.tsx`, its viewer, its hook, its styles and `REELS` are all
  still here. To bring it back: import `Reel` in `App.tsx` and render it where
  the comment marks the spot, add `{ href: '#reel', label: 'Reel' }` to the two
  link lists in `SiteNav.tsx`, and fill in `src` on the `REELS` entries.
- **Partners** are one title partner and six partners, the first two rows of
  `SPONSORS`. Give an entry a `logo` and it shows the image instead of the
  name; a `url` makes the box a link.
- **The venue map** is centred on `SITE.mapLat` / `SITE.mapLng`, and both it
  and the "Open in Maps" button go to `SITE.mapLink`. Change all three
  together. The map is not an embed: it is fifteen OpenStreetMap tiles in a
  grid, washed to white in CSS, with the site's own pin on top — no script, no
  cookies, loaded only when it nears the screen. OpenStreetMap's credit in the
  corner is a condition of using the tiles; leave it there.

---

## How it is laid out

```
src/
  data/site.ts        all the content, typed
  lib/                pure helpers — no React, no side effects
    dom.ts              measuring, clamping, the scroll lock
    stage.ts            the run of show as real instants (testable on its own)
    gsap.ts             GSAP + ScrollTrigger, registered once
    icons.tsx           inline SVG
    links.ts            ticket / social / external link props
  hooks/              one behaviour each, all with real cleanup
  components/         the sections, in the order they are read
  styles/             the original build's sheets, unchanged, plus
                      animations.css — everything added after the port
```

### The rule the whole codebase follows

**One transform, one owner.** A CSS `transform` is a single property, so
whoever writes it last wins. Wherever two effects want to move the same card,
they get one element each — `useScrollFlow` writes to the `.spk-flow` wrapper
and `useTilt` writes to the `.spk` inside it. Breaking this is what made the
speaker cards jitter under the cursor in an earlier build.

Two related habits, for the same reason:

- **Never read layout inside a frame.** Positions are measured once and on
  resize; the frame loops only ever *write* a transform or an opacity, so the
  compositor does the work.
- **Every loop stops itself.** Nothing runs while the tab is hidden or the
  section is off screen.

### The motion layer

The site ships two generations of motion, kept apart on purpose:

- **The original build's**, ported unchanged — card tilt, scroll registration,
  parallax, reveal footer. (Its door intro has been replaced; see *The boot
  screen* below.)
- **The layer added afterwards**, adapted from
  [syahrilarfianalmazril.my.id](https://www.syahrilarfianalmazril.my.id/).
  All of its CSS is in `src/styles/animations.css` and nothing in it edits the
  original sheets, so a diff against the static site stays readable.

| Added | Where | Hook / component |
| --- | --- | --- |
| Card stack (`ShowcaseStack`) | Speakers become a deck | `useCardStack` |
| Crossing ribbons (`infinite-ribbon`) | Under the hero | `Ribbons` |
| Word-by-word blur reveal (`IdentitySequence`) | Every split heading | `useScrollAnimations` |
| Scroll-scrubbed arrival (`animated-scroll`) | The pass | `useScrollScale` |
| Click sparks (`ClickSpark`) | Whole page | `useClickSpark` |
| Edge tab (`CardNav`'s side tab) | Left edge, all pages | `EdgeTab` |
| Icon set into a heading | The hero wordmark | `BoltMark` |
| Word-by-word scroll reveal | Section headings | `ui/ScrollReveal` |
| Typed lines | Section sub-lines | `ui/TextType` |
| Pinned horizontal timeline (`horizontal-timeline`) | The run of show | `useHorizontalTimeline` |

One of the reference's signature effects was **not** added, because the site
already does it: the reveal footer is the same slide-over the reference uses
for its closing CTA.

#### The run of show, sideways

The schedule is built after the reference site's **Professional Journey**
section, and the same way it is: a tall outer box holds the scroll, a
`position: sticky` stage inside it pins to the screen, and a
`width: max-content` track is translated left as you scroll through. Each stop
is a **zero-height anchor** on the rule — the time is positioned above the
line, the title and detail below it — which is what keeps every node dead
level however long a title runs.

Two decisions worth keeping:

- **Sticky, not ScrollTrigger's `pin`.** GSAP can pin for you, but it does it
  by wrapping the element in a generated container and swapping in a spacer.
  On a page that already has a sticky card deck, a pinned WebGL loop and a
  fixed reveal footer, that is one more thing rewriting layout behind
  everyone's back. Sticky is the browser's own pin and it is what the
  reference uses; the hook only measures and moves.
- **The track's distance is derived; the scroll it takes is fixed.**
  `distance = track.scrollWidth − stage.clientWidth + tailPad` is how far the
  track moves. It used to take exactly that much scrolling — nearly five
  screens — which felt long. The pin now lasts four scrolls however many
  stops there are: `scrolls × perScroll` in the hook's `CONFIG`, a scroll
  being taken as half a screen, so two screens in all. Add a row to `SCHEDULE`
  and the track moves a little faster; the section does not get longer. At
  1440×900 that is 3726px of track in 1800px of scroll.

**Below 900px it is a vertical timeline again** — the same markup, laid out as
a column with the spine on the left and every detail visible, because a pinned
sideways scroll on a phone fights the gesture the visitor is already making.
The hook does not run at that width, and it tears down and rebuilds when the
breakpoint is crossed, so no inline height is ever left on a layout that no
longer wants one. `prefers-reduced-motion` gets the same vertical layout.

**Switching the speakers back to a row:** one line —
`const LAYOUT = 'grid'` at the top of
[`src/components/Speakers.tsx`](src/components/Speakers.tsx). Both layouts are
fully styled. The deck falls back to the row on its own below 860px or on a
short screen.

### The boot screen

The intro is an 8-bit loading screen ([`Boot.tsx`](src/components/Boot.tsx)),
which replaced the two auditorium doors. The screen itself is 8bitcn's
loading screen and progress bar, in `src/components/ui/8bit-*.tsx`; `Boot` is
what decides when it plays, for how long, and how it leaves.

- **It is an effect, not a gate.** Nothing waits for it. Three seconds of bar,
  a beat on READY, then the screen switches off in squares from the middle
  outwards — about 3.9s in all. The numbers are `TIMING` at the top of
  `Boot.tsx`.
- **Black and white only.** The site's orange arrives with the site. The
  colours are four variables on `.boot` in `styles/boot.css`.
- **The line under the bar is a fact about Möbius strips**, a different one
  each visit. They are `BOOT_TIPS` in `site.ts`.
- **Once per tab session**, never under reduced motion, and it runs on timers
  with a backstop, so a browser that has stopped painting cannot leave the
  page locked behind it.

Two things to know if you paste in more shadcn-style components:

- `animate-pulse` is mapped to a keyframe called `tw-pulse` in
  `tailwind.config.ts`. The site's own sheets already own the name `pulse`
  (the orange ring round the live dot), and without the rename every pulsing
  component gets that ring instead of a fade.
- Tailwind's preflight is off, so a pasted component needs `border-solid` on
  anything bordered and `m-0` on bare headings and paragraphs.

### The loop

Straight after the landing page, where the bento grid was, is a Möbius strip
you scroll through — [`Loop.tsx`](src/components/Loop.tsx),
[`useMobius.ts`](src/hooks/useMobius.ts), `styles/loop.css` — built after the
camera fly-through on [scrollthroughdoom.netlify.app](https://scrollthroughdoom.netlify.app/).
The strip carries the landing page's four words; the camera comes down out of
the dark, stops at each one while its paragraph surfaces, and pulls back to
show the whole loop. The words and paragraphs are `LOOP` in `site.ts`.

The strip is built over two laps, each offset to its own side, so the text
runs round both faces and meets itself with no seam — a Möbius strip has one
side, and the print proves it. The pale rim is its single edge.

**The band is gold, and it is Kurukshetra's.** The strip matches the one on
the main site: beaten gold with the field of Kurukshetra cut into it in dark
ink, carrying the same four words at the same size. Along each edge a border
of arrowheads (where a ruler used to be); in the gap before each word an
emblem — the chakra, the bow with its arrow nocked, the mace, two swords
behind a shield; and under everything an army on the march: spearmen, archers
and horsemen under the words, chariots, elephants and standard-bearers in the
gaps where there is headroom. It is all drawn with canvas paths in
[`lib/kurukshetraBand.ts`](src/lib/kurukshetraBand.ts) — no images — from a
seeded sequence, so the army is irregular but the same on every visit. To
change the words, edit `LOOP`; the army rearranges itself round them.

It is a plain list until its first WebGL frame renders, and stays one under
reduced motion or without WebGL. On a phone it renders at 1.5× (1.25× on a
four-core handset), fits the whole loop across the width at the start and the
end, lifts the picture into the top half so the words have the bottom, and
stops drawing whenever the scroll is still and no words are on screen.

**The words are warped.** Every line of copy in the section is drawn through
React Bits' [WarpText](https://reactbits.dev) glass — the same fbm
distortion, cursor lens, ripple and RGB split — but as quads in the strip's
own renderer ([`lib/warpLayer.ts`](src/lib/warpLayer.ts)) rather than one
`<WarpText />` per line. The component opens a WebGL context per instance;
eleven of them on top of the strip and the landing page's two is past what a
phone allows, and the browser's answer is to kill the oldest. Any element
with `data-warp` inside the stage is picked up: it stays real text in the
page and only its fill goes transparent once its quad has been painted.
Strength is scaled by font size, so a headline bends fully and a paragraph by
a third. The lens follows the cursor, or a finger on a phone. The knobs are
`WARP` at the top of that file. The numbered rail is left alone on purpose.

The ending is the headline — *We don't just bend the rules. We twist them.* —
which lands above the finished loop once the camera has pulled back.

**Then the strip is the visitor's.** From there to the end of the section
nothing is scripted: the strip can be grabbed and turned. The feel is the
strip in the hero of the main site
([mobius-puce.vercel.app](https://mobius-puce.vercel.app/)), carried over
constant for constant in [`lib/stripPlay.ts`](src/lib/stripPlay.ts) — a
sideways drag rolls it (0.009 rad/px) and yaws it a little, an up-and-down
drag tilts it, it coasts when let go and settles to a slow idle turn, the
loop leans as it is turned hard, and the paper gives under the pointer. On a
phone a sideways swipe turns it and an up-and-down one still scrolls the
page (`touch-action: pan-y`), exactly as there.

Two things are this site's own, both because this strip is a circle between
two blocks of text rather than a flat ellipse in a canvas of its own: the
tilt walls are ±0.3 rad (`PLAY_TILT`) instead of about ±0.5, and as the strip
opens up it is drawn smaller by just enough to stay in the gap between the
headline and the closing line. Scrolling back up eases it back into the
ride.

### The dark edition

The landing page Siya added is black ground / paper ink / orange spot, and
section 10 of `animations.css` carries that through the rest of the site.

It is about a dozen lines, because `paper.css` is consistent about its tokens:
`--black` always means *the ink*, `--paper` always means *the ground*, and a
remap block underneath restates them as `--ink` / `--line` / `--mute` for the
older sheets. Inverting the edition is therefore a matter of swapping what
those two words point at and restating the derived inks for a dark ground.
**Nothing below that block is edited — delete it and the paper edition returns
exactly.**

The landing page is unaffected either way: `landing.css` scopes its own
`--black` / `--paper` to `.landing-page`.

Two things invert rather than darken: the ticket and the footer were black
blocks on paper, so they are now light blocks on dark. That is coherent — they
remain the page's accent blocks — but it is the part worth a second look.

Contrast was measured on rendered elements, not assumed: the worst pair is
7.3:1 (schedule times) and most body copy sits at 11–16:1. The orange is the
one colour that does not simply invert — on paper it had to be darkened to
`#A83A0B` to set type, and on black the brand `#ff5a1f` clears 5.6:1 on its
own, so `--spot-ink` goes back to being the brand colour.

### Styles

`src/styles/index.css` imports the stylesheets in a **load-bearing order**:
`paper.css` re-inks everything above it, the timeline sheet
overrides both, and `animations.css` loads last so it can override any of them
without editing them. There is a note at the top of that file; read it before
reordering anything.

Tailwind is installed but **preflight is off**, and no existing section uses it.
It is there so a component from React Bits / Aceternity / Magic UI can be pasted
in unchanged. Tailwind's reset would flatten the hand-tuned borders, lists and
buttons the design depends on, which is why it stays disabled.

### Accessibility and graceful degradation

Every animated element's **declared** state is its **finished** state. If GSAP
fails to load, or the visitor has `prefers-reduced-motion` set, the page is
static and complete rather than blank. The dialogs trap nothing they should not,
restore focus to whatever opened them, and close on Escape.

---

## Deploying

The site is static. `npm run build` produces `dist/`, which is what gets served.

On Vercel the settings are in [`vercel.json`](vercel.json) — framework `vite`,
build `npm run build`, output `dist`. A push to `main` deploys automatically.

> **Note for the first deploy after the React rewrite:** the Vercel project was
> previously set up to serve raw HTML with no build step. If a deploy goes out
> looking empty, open the project's Build & Development Settings and make sure
> the framework preset is **Vite** (or that "Override" is off so `vercel.json`
> is used).

---

## `legacy/`

The original hand-written static site — the one this was ported from — lives in
[`legacy/`](legacy/). It is complete and still opens on its own; it is kept as
the reference for the design, not as something that is built or deployed. The
React app does not import anything from it.

---

## Licence

See [LICENSE](LICENSE).
