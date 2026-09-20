# DevTalks 2026

The event site for DevTalks 2026 — The Developers Club, D.Y. Patil Institute of
Technology, Pimpri. One page: hero, line-up, run of show, pass, partners, venue,
reel, gallery, FAQ.

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
- **Speaker photos and gallery images** go in `public/assets/`. Reference them
  from `site.ts` as `/assets/…`.
- **The reel** ships with six blank entries on purpose, so the strip animates
  before any footage exists. Fill in `src` on an entry and that slot becomes a
  playing clip; nothing else has to change.

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

- **The original build's**, ported unchanged — door intro, spotlight bento,
  card tilt, scroll registration, parallax, gallery scrub, reveal footer.
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

Two of the reference's signature effects were **not** added, because the site
already does them: the gallery banner opening from a rounded frame to full
bleed is `animated-scroll`, and the reveal footer is the same slide-over the
reference uses for its closing CTA.

**Switching the speakers back to a row:** one line —
`const LAYOUT = 'grid'` at the top of
[`src/components/Speakers.tsx`](src/components/Speakers.tsx). Both layouts are
fully styled. The deck falls back to the row on its own below 860px or on a
short screen.

### Styles

`src/styles/index.css` imports the stylesheets in a **load-bearing order**:
`paper.css` re-inks everything above it, the timeline and gallery sheets
override both, and `animations.css` loads last so it can override any of them
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
