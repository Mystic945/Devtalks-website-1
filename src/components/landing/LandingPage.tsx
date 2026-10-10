/* ============================================================
   KURUKSHETRA — THE LANDING PAGE
   ------------------------------------------------------------
   One screen: the Chakravyuha turning on a dark plain, the
   wordmark and where-and-when over it, the pass on its lanyard.
   Nothing on it names anything but Kurukshetra.

   IT IS A PINNED SCENE
   The section is taller than the screen by a runway (--run in
   landing.css) and the stage inside it is sticky. Scrolling the
   runway does not move the page: it drops the view into the eye
   of the formation. The type and the lanyard clear, the rings go
   past, and the stage arrives on flat black — the Möbius strip's
   own ground — before it is let go. So the landing does not end
   at a seam; it ends by becoming the next section's background.

   WHO DRIVES WHAT
   The scene (vyuha.ts) owns no listeners. This component reads
   the scroll and the pointer once a frame and tells it; the same
   number is written to --dive on the section, which is what the
   stylesheet fades everything else by.

   WHEN IT ARRIVES
   When the boot screen hands the page over (`ready`, from App).
   That is what starts the type, the scene and — a beat later, on
   its own clock — the lanyard.
   ============================================================ */

import { useEffect, useMemo, useRef, useState } from 'react';
import LanyardLayer from './LanyardLayer';
import { createVyuha, type Vyuha } from './vyuha';
import { KURUKSHETRA } from '@/data/site';
import { clamp, pad2, prefersReducedMotion } from '@/lib/dom';

import '@fontsource/cinzel/latin-800.css';
import '@fontsource/cinzel/latin-900.css';
import '@fontsource/eb-garamond/latin-500.css';
import '@fontsource/eb-garamond/latin-500-italic.css';
import '@fontsource/tiro-devanagari-sanskrit/devanagari-400.css';
import './landing.css';

/** The page's chapters, for the rail. The first is this screen. */
const CHAPTERS = [
  { href: '#top', label: 'The Field' },
  { href: '#loop', label: 'The Loop' },
  { href: '#speakers', label: 'Speakers' },
  { href: '#schedule', label: 'Schedule' },
  { href: '#sponsors', label: 'Sponsors' },
  { href: '#faq', label: 'FAQ' },
  { href: '#venue', label: 'Venue' }
] as const;

const RINGS = 7;
const WIDE = '(min-width: 701px)';

/* Where the eye of the formation sits at rest. With the lanyard on the left
   and the type on the right it goes in the clear band between them; on a
   phone there is neither, and it sits under the type. */
const EYE_WIDE: [number, number] = [0.335, 0.62];
const EYE_NARROW: [number, number] = [0.5, 0.74];

/** Phones, and machines with few cores, get a thinner army. */
const isLite = (): boolean =>
  !window.matchMedia(WIDE).matches || (navigator.hardwareConcurrency || 8) <= 4;

/* Five small marks, drawn rather than fetched: chakra, bow, mace, swords,
   conch. One weight, no fills. */
function Glyphs() {
  const spokes = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2);
  return (
    <ul className="kl__glyphs" aria-hidden="true">
      <li>
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="7.4" />
          <circle cx="12" cy="12" r="2.1" />
          {spokes.map((a) => (
            <line
              key={a}
              x1={12 + Math.cos(a) * 2.1}
              y1={12 + Math.sin(a) * 2.1}
              x2={12 + Math.cos(a) * 7.4}
              y2={12 + Math.sin(a) * 7.4}
            />
          ))}
          {spokes.map((a) => (
            <line
              key={`t${a}`}
              x1={12 + Math.cos(a + 0.39) * 8.9}
              y1={12 + Math.sin(a + 0.39) * 8.9}
              x2={12 + Math.cos(a + 0.39) * 10.8}
              y2={12 + Math.sin(a + 0.39) * 10.8}
            />
          ))}
        </svg>
      </li>
      <li>
        <svg viewBox="0 0 24 24">
          <path d="M7 2.5C17.5 6.5 17.5 17.5 7 21.5" />
          <line x1="7" y1="2.5" x2="7" y2="21.5" />
          <line x1="2.5" y1="12" x2="21" y2="12" />
          <path d="M18 9.2 21 12l-3 2.8" />
        </svg>
      </li>
      <li>
        <svg viewBox="0 0 24 24">
          <circle cx="16.2" cy="7.8" r="4.6" />
          <path d="M16.2 3.2v9.2M11.6 7.8h9.2" />
          <line x1="12.9" y1="11.1" x2="4.6" y2="19.4" />
          <circle cx="3.9" cy="20.1" r="1.1" />
          <line x1="19.5" y1="4.5" x2="21.3" y2="2.7" />
        </svg>
      </li>
      <li>
        <svg viewBox="0 0 24 24">
          <line x1="3.5" y1="3.5" x2="17.5" y2="17.5" />
          <line x1="20.5" y1="3.5" x2="6.5" y2="17.5" />
          <line x1="14.6" y1="18.6" x2="18.6" y2="14.6" />
          <line x1="5.4" y1="14.6" x2="9.4" y2="18.6" />
          <line x1="17.5" y1="17.5" x2="20.4" y2="20.4" />
          <line x1="6.5" y1="17.5" x2="3.6" y2="20.4" />
        </svg>
      </li>
      <li>
        <svg viewBox="0 0 24 24">
          <path d="M4.5 13.5C4.5 7.5 10.5 3.6 16 5.4c4.6 1.6 5 8.2 0.6 10.3-3 1.4-6.6 0-6.6-3 0-2 2-3.2 3.7-2.2" />
          <path d="M4.5 13.5c1 4 4.6 7 9.5 7" />
          <path d="M16.6 15.7 20 20.5" />
        </svg>
      </li>
    </ul>
  );
}

export default function LandingPage({ ready }: { ready: boolean }) {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const count = useRef<HTMLElement>(null);
  const scene = useRef<Vyuha | null>(null);

  const still = useMemo(prefersReducedMotion, []);

  const entered = ready;
  const enteredRef = useRef(entered);
  enteredRef.current = entered;

  /* Past the point where the type and the lanyard have cleared. */
  const [deep, setDeep] = useState(false);

  /* ---- the scene, and what it is told ---- */
  useEffect(() => {
    const sec = section.current;
    const box = stage.current;
    const el = canvas.current;
    if (!sec || !box || !el) return;

    let vyuha: Vyuha;
    try {
      vyuha = createVyuha(el, { lite: isLite(), still });
    } catch {
      // No WebGL: the stage keeps its painted ground and everything else works.
      sec.classList.add('is-flat');
      return;
    }
    scene.current = vyuha;

    const wide = window.matchMedia(WIDE);
    const fit = () => {
      vyuha.resize(box.clientWidth, box.clientHeight);
      const [x, y] = wide.matches ? EYE_WIDE : EYE_NARROW;
      vyuha.setEye(x, y);
    };
    const resizes = new ResizeObserver(fit);
    resizes.observe(box);
    fit();

    let queued = false;
    let ring = 0;
    let wasDeep = false;

    const read = () => {
      queued = false;
      const top = -sec.getBoundingClientRect().top;
      const run = sec.offsetHeight - box.offsetHeight;
      const p = run > 1 ? clamp(top / run, 0, 1) : 0;

      sec.style.setProperty('--dive', p.toFixed(4));
      vyuha.setProgress(p);

      // Past the veil there is nothing to see; and before the page is handed
      // over, nobody is looking.
      vyuha.setRunning(enteredRef.current && p < 0.995 && !document.hidden);

      const n = Math.min(RINGS, 1 + Math.floor(p * RINGS));
      if (n !== ring && count.current) {
        ring = n;
        count.current.textContent = `${pad2(n)} / ${pad2(RINGS)}`;
      }
      const isDeep = p > 0.34;
      if (isDeep !== wasDeep) {
        wasDeep = isDeep;
        setDeep(isDeep);
      }
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(read);
    };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      vyuha.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    };

    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('visibilitychange', onScroll);
    sec.addEventListener('kl:enter', read);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onScroll);
      sec.removeEventListener('kl:enter', read);
      resizes.disconnect();
      scene.current = null;
      vyuha.dispose();
    };
  }, [still]);

  /* ---- arrival ---- */
  useEffect(() => {
    if (!entered) return;
    scene.current?.arrive();
    section.current?.dispatchEvent(new Event('kl:enter'));
  }, [entered]);

  return (
    <section
      className={`kl landing-page${entered ? ' is-in' : ''}${deep ? ' is-deep' : ''}`}
      ref={section}
      aria-label={KURUKSHETRA.name}
    >
      <div className="kl__stage" ref={stage}>
        <canvas className="kl__scene" ref={canvas} aria-hidden="true" />
        <div className="kl__shade" aria-hidden="true" />

        <LanyardLayer paused={deep} />

        <div className="kl__copy">
          <p className="kl__deva" lang="sa">
            {KURUKSHETRA.devanagari}
          </p>
          <h1 className="kl__mark">{KURUKSHETRA.name}</h1>
          <p className="kl__tag">
            The Battle of <em>Infinite</em> Possibilities
          </p>
          <Glyphs />
          <p className="kl__date">
            <span>{KURUKSHETRA.dateLabel}</span>
            <i aria-hidden="true">◆</i>
            <span>{KURUKSHETRA.venue}</span>
          </p>
          <div className="kl__actions">
            <a className="kl__btn kl__btn--gold" href={KURUKSHETRA.mainSite} target="_blank" rel="noopener">
              Visit the main site <b aria-hidden="true">↗</b>
            </a>
            <a className="kl__btn" href="#loop">
              Walk the loop <b aria-hidden="true">↓</b>
            </a>
          </div>
        </div>

        <nav className="kl__rail" aria-label="Chapters">
          {CHAPTERS.map((c, i) => (
            <a key={c.href} href={c.href} aria-current={i === 0 ? 'true' : undefined}>
              <i aria-hidden="true" />
              <span>{c.label}</span>
            </a>
          ))}
        </nav>

        <p className="kl__place" aria-hidden="true">
          <i />
          The Field
        </p>
        <p className="kl__count" aria-hidden="true">
          Formation · Chakravyuha <b ref={count}>01 / 07</b>
        </p>

        <a className="kl__cue" href="#loop">
          <span>Scroll to enter the vyuha</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="6.5" />
            <circle cx="12" cy="12" r="1.3" className="kl__cue-dot" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
          <i aria-hidden="true" />
        </a>

        <div className="kl__veil" aria-hidden="true" />
      </div>
    </section>
  );
}
