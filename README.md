# DevTalks — website template

A single-page event site. Plain HTML, CSS and JavaScript — **no build step, no npm, no framework**.
Double-click `index.html` and it opens. Everything it needs (three.js, GSAP, the fonts) is inside
this folder, so it also works with no internet.

---

## 1. The only file you normally edit

**`js/data.js`**

Speakers, schedule, ticket tiers, sponsors, FAQ, dates, venue, social links — all of it lives there
as plain text. Change the words between the quote marks and the page updates. You do not need to
touch the HTML.

Rules for editing it:

- Keep the quote marks `"` around text.
- Keep the commas at the end of each line.
- If a quote mark is part of your text, write `\"` instead.
- If the page goes blank after an edit, you deleted a comma or a brace. Press `Ctrl+Shift+J` in
  Chrome, read the red error, fix that line.

---

## 2. Adding real speaker photos

1. Crop the photo **square** (1:1). 800×800 px is plenty.
2. Save it into `assets/speakers/` — e.g. `assets/speakers/asha-rao.jpg`
3. In `js/data.js`, set that speaker's `photo` to `"assets/speakers/asha-rao.jpg"`

Leave `photo` as `""` and the site draws a clean initials tile instead — so an unannounced speaker
still looks deliberate rather than broken.

Sponsor logos work the same way: drop a PNG or SVG into `assets/sponsors/` and set `logo`.
White or light logos work best on the dark background.

---

## 3. Wiring up registration

In `js/data.js`, set `registerUrl` to your Google Form / Konfhub / Luma link:

```js
registerUrl: "https://forms.gle/your-form-id",
```

Every "Get tickets" button on the page then points there and opens in a new tab. Individual ticket
tiers can override it with their own `url` if each tier has a separate form.

---

## 4. Changing the look

All colours and fonts are CSS variables at the top of `css/style.css`:

```css
--red:  #E62B1E;   /* the accent — used everywhere */
--ink:  #0A0A0A;   /* page background */
--display: 'Anton';  /* the big condensed headlines */
--sans:    'Inter';  /* body text */
```

Change `--red` and the entire site re-themes: buttons, marquee, timeline stamps, stat numbers,
sponsor CTA, hero particles fall back to it via `js/hero.js`.

To swap a font, put the `.woff2` file in `fonts/` and update `css/fonts.css`.

---

## 5. The 3D hero

`js/hero.js` draws the particle field. Tuning knobs are at the top of the file:

| Setting | What it does |
|---|---|
| `countDesktop` / `countTablet` / `countMobile` | How many particles. **Phones are deliberately set low (3000).** Raising this is the fastest way to make the site lag on a mid-range Android. |
| `size` | Dot size. Higher = fatter, softer field. |
| `radius` | How wide the sphere spreads. |
| `colorA` / `colorB` | Particle colours (red, and the white sparkle). |
| `rotate` | Idle spin speed. |

Built-in safety behaviour, already handled — don't remove it:

- Renders **nothing** if the visitor has "reduce motion" turned on.
- Renders nothing if the device has no WebGL; the gradient behind it takes over and the page still
  looks finished.
- **Stops rendering entirely** once the hero scrolls off screen, and when the tab is in the
  background. This is the difference between a site that eats a phone battery and one that doesn't.
- Lower pixel ratio and no pointer tracking on phones.

---

## 6. Putting it online

It's static files, so almost anything works:

- **Netlify** — drag the whole folder onto app.netlify.com/drop. Done in ten seconds.
- **GitHub Pages** — push the folder, Settings → Pages → deploy from `main` branch, `/root`.
- **Vercel** — `vercel` in this folder, accept the defaults.
- **College server** — just FTP the folder up.

Before you go live, replace `assets/og.jpg` with a 1200×630 image. That's the picture that shows up
when someone shares the link on WhatsApp or LinkedIn, and it matters more than anything else on this
list for registrations.

---

## 7. What's in the folder

```
index.html            the page — section markup, edit to add/remove sections
css/style.css         all styling; design tokens at the top
css/fonts.css         local @font-face declarations
js/data.js            ← all content lives here
js/hero.js            the WebGL particle hero
js/main.js            renders the data, runs the animations
vendor/               three.js r128, GSAP 3.12.5, ScrollTrigger
fonts/                Anton, Inter, JetBrains Mono (woff2)
assets/speakers/      put speaker photos here
assets/sponsors/      put sponsor logos here
```

---

## 8. Things worth knowing before the club edits this

- **Section numbers** (`01`, `02` …) are written by hand in `index.html`. If you delete a section,
  renumber the rest.
- **The countdown** reads `SITE.date`. Keep the `+05:30` on the end or it'll count in the wrong
  timezone.
- **Accessibility**: the FAQ, mobile menu and speaker modal are keyboard-operable and Escape closes
  them. If you restyle, keep the focus states.
- **Reduced motion**: every animation has a still fallback. Test it — Chrome DevTools →
  Rendering → "Emulate prefers-reduced-motion".
- **Don't add a CDN `<script>` tag.** The whole point of `vendor/` is that the site doesn't break on
  patchy college wifi or when a CDN is blocked.
