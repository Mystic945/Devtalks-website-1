/* ============================================================
   DEVTALKS — THE BOOT SCREEN
   ------------------------------------------------------------
   The intro. It used to be two auditorium doors parting; it is
   now an 8-bit loading screen: LOADING, a bar that fills in twenty
   squares, and one fact about Möbius strips to read while it does.
   The screen itself is 8bitcn's (components/ui/8bit-loading-screen);
   this file is everything around it — when it plays, how long, how
   it leaves, and what it hands over to.

   IT IS AN EFFECT, NOT A GATE
   Nothing waits for it. The page is fully rendered underneath and
   the landing page's own scene is already loading. So it is kept
   short — three seconds of bar, a beat on READY, half a second to
   leave — long enough to read as a boot sequence and not long
   enough to be in the way. Tune it in TIMING.

   BLACK AND WHITE
   Only. The rest of the site is black, paper and orange; this
   screen is the machine before the site has loaded, so it has no
   palette yet. The orange arrives with the page.

   HOW IT LEAVES
   In blocks. The screen is cut into a coarse grid and the squares
   switch off from the middle outwards, a third of them flashing
   white on the way, so the wordmark behind arrives a tile at a
   time. No easing anywhere: a square is either there or it is not.

   The page is handed over as the first squares go, not after the
   last — so its own entrances are already running as it is
   uncovered, which is what stopped the doors feeling like a wait.

   ONCE PER SESSION, AND NEVER IN THE WAY
   A repeat visit in the same tab session skips it, and so does
   reduced motion. Every step runs on timers, not animation frames,
   and a backstop ends it regardless: a browser that has stopped
   painting must never leave the page locked behind a loading
   screen.
   ============================================================ */

import { useEffect, useMemo, useRef, useState } from 'react';

import LoadingScreen from '@/components/ui/8bit-loading-screen';
import { BOOT_TIPS } from '@/data/site';
import { lockScroll, prefersReducedMotion } from '@/lib/dom';
import { cn } from '@/lib/utils';

// 12.5 kB, inlined, so the first frame of the loader is already in its own
// face — a loading screen that flashes a fallback font has failed at its job.
import pressStart from '@fontsource/press-start-2p/files/press-start-2p-latin-400-normal.woff2?inline';

const TIMING = {
  load: 3000, // the bar: twenty squares, 150ms each
  hold: 360, // READY, bar full
  spread: 360, // the squares switch off over this long…
  tile: 140, // …each taking this long to go
  backstop: 1500 // grace past the scripted end before it is ended regardless
} as const;

const KEY = 'devtalks-boot-seen'; // once per browser session

const seenThisSession = (): boolean => {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};

const markSeen = (): void => {
  try {
    sessionStorage.setItem(KEY, '1');
  } catch {
    /* private mode — it just plays again next time */
  }
};

const FONT_FACE = `@font-face{font-family:'Press Start 2P';font-style:normal;font-weight:400;font-display:block;src:url(${pressStart}) format('woff2');}`;

type Phase = 'load' | 'ready' | 'exit' | 'gone';

interface Props {
  /** Called once the page should take over. Fires exactly once, whether the
   *  screen played, was skipped, or was cut short. */
  onReady: () => void;
}

export function Boot({ onReady }: Props) {
  // Decided during the first render, so a repeat visit never paints a frame
  // of loading screen before an effect could take it away.
  const [phase, setPhase] = useState<Phase>(() =>
    prefersReducedMotion() || seenThisSession() ? 'gone' : 'load'
  );
  const plays = useRef(phase === 'load').current;

  // A different fact each visit: start the list somewhere new.
  const [tips] = useState(() => {
    const at = Math.floor(Math.random() * BOOT_TIPS.length);
    return [...BOOT_TIPS.slice(at), ...BOOT_TIPS.slice(0, at)];
  });

  const handed = useRef(false);
  const ready = useRef(onReady);
  ready.current = onReady;
  const handOver = () => {
    if (handed.current) return;
    handed.current = true;
    ready.current();
  };

  const release = useRef<() => void>(() => {});

  /* The lock, and the backstop. */
  useEffect(() => {
    if (!plays) {
      handOver();
      return;
    }

    lockScroll(true);
    let locked = true;
    const unlock = () => {
      if (!locked) return;
      locked = false;
      lockScroll(false);
    };

    const total = TIMING.load + TIMING.hold + TIMING.spread + TIMING.tile;
    const backstop = setTimeout(() => {
      unlock();
      markSeen();
      handOver();
      setPhase('gone');
    }, total + TIMING.backstop);

    release.current = unlock;
    return () => {
      clearTimeout(backstop);
      unlock();
    };
    // One-shot opening sequence; must never re-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  /* READY → the squares → gone. */
  useEffect(() => {
    if (phase === 'ready') {
      const t = setTimeout(() => setPhase('exit'), TIMING.hold);
      return () => clearTimeout(t);
    }
    if (phase === 'exit') {
      // The page is the visitor's from the first square, not the last.
      release.current();
      markSeen();
      handOver();
      const t = setTimeout(() => setPhase('gone'), TIMING.spread + TIMING.tile + 40);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* The grid the screen leaves in. Square-ish tiles on any screen; the delay
     grows with distance from the middle, with enough noise that it reads as
     a dissolve rather than a ring. */
  const tiles = useMemo(() => {
    if (phase !== 'exit') return null;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cols = w >= h ? 16 : 9;
    const rows = Math.max(1, Math.ceil((cols * h) / w));
    const reach = Math.hypot(cols / 2, rows / 2);
    const cells = Array.from({ length: cols * rows }, (_, i) => {
      const x = (i % cols) + 0.5 - cols / 2;
      const y = Math.floor(i / cols) + 0.5 - rows / 2;
      const far = Math.hypot(x, y) / reach;
      return {
        delay: Math.round(TIMING.spread * (far * 0.7 + Math.random() * 0.3)),
        hot: Math.random() < 0.32
      };
    });
    return { cols, rows, cells };
  }, [phase]);

  if (phase === 'gone') return null;

  return (
    <>
      <style>{FONT_FACE}</style>

      <LoadingScreen
        variant="fullscreen"
        className={cn(
          'boot z-[10000]',
          phase === 'ready' && 'is-ready',
          phase === 'exit' && 'is-leaving'
        )}
        role="status"
        aria-label="Loading DevTalks"
        title={phase === 'load' ? 'LOADING' : 'READY'}
        tips={tips}
        // one fact per visit: long enough that it never changes mid-read
        tipInterval={60_000}
        autoProgress
        autoProgressDuration={TIMING.load}
        onComplete={() => setPhase((p) => (p === 'load' ? 'ready' : p))}
      />

      {tiles && (
        <div
          className="boot-tiles"
          aria-hidden="true"
          style={{
            gridTemplateColumns: `repeat(${tiles.cols}, 1fr)`,
            gridTemplateRows: `repeat(${tiles.rows}, 1fr)`
          }}
        >
          {tiles.cells.map((cell, i) => (
            <i
              key={i}
              className={cell.hot ? 'is-hot' : undefined}
              style={{ animationDelay: `${cell.delay}ms`, animationDuration: `${TIMING.tile}ms` }}
            />
          ))}
        </div>
      )}
    </>
  );
}
