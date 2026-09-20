# legacy/ — the original static site

This is the hand-written site the React app was ported from: plain HTML, CSS and
ES5 scripts, with GSAP vendored in `vendor/`. Open `index.html` directly in a
browser and it runs, offline, exactly as it shipped.

It is kept as the **reference for the design**. Nothing in `src/` imports from
here, nothing here is built, and nothing here is deployed.

The port mapped it roughly like this:

| Legacy file           | Where it went now                                  |
| --------------------- | -------------------------------------------------- |
| `js/data-3.js`        | `src/data/site.ts` (same values, now typed)         |
| `js/main.js`          | the section components, plus `useScrollAnimations`  |
| `js/hero-bento.js`    | `src/hooks/useSpotlight.ts`                         |
| `js/bento.js`         | `src/hooks/useTilt.ts`                              |
| `js/flow.js`          | `src/hooks/useScrollFlow.ts` + `useSmoothAnchors`   |
| `js/parallax.js`      | `src/hooks/useParallax.ts`                          |
| `js/live-stage.js`    | `src/lib/stage.ts` + `useLiveStage`                 |
| `js/reel.js`          | `src/components/Reel.tsx` + `useReelStrip`          |
| `js/gallery.js`       | `src/hooks/useGallery.ts`                           |
| `js/doors.js`         | `src/hooks/useIntro.ts`                             |
| `js/footer-reveal.js` | `src/hooks/useFooterReveal.ts`                      |
| `js/ticket.js`        | `src/components/Tickets.tsx`                        |
| `js/register.js`      | the `.spk-flow` wrapper in `src/components/Speakers.tsx` |
| `css/*`               | `src/styles/*` (unchanged)                          |

`js/` also holds several scripts the final site had already stopped loading —
`hero-mic.js`, `hero-stage.js`, `unfold.js`, `doodle-art.js`, `comic-panels.js`
— kept here because they are earlier directions worth being able to look at.
