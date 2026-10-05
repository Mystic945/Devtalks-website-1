/* ============================================================
   8-BIT LOADING SCREEN  (8bitcn)
   ------------------------------------------------------------
   Pasted in as given: a title, a percentage, a twenty-square bar
   and a line of tips. The props and the markup are upstream's.
   What was changed, and why:

     • "use client" is gone. This is Vite, not Next; the directive
       does nothing here except make the bundler warn.
     • auto-progress counts ELAPSED TIME, not ticks. Upstream adds
       5% per setInterval tick, and a background tab throttles
       timers to one a second — so a visitor who opened the site
       in a new tab would come back to a bar that had barely moved.
       Reading the clock means it is simply done by then. It still
       fills in the same twenty steps.
     • `onComplete` — the screen has to be able to say it is done.
     • the cursor is drawn. Upstream blinks a `showCursor` state
       and never renders it; here it is the block after the tip.
     • margins are zeroed on the heading and the tip. Tailwind's
       preflight is off in this project (tailwind.config.ts), so a
       bare <h2> and <p> still carry the browser's margins.
     • the tip is not pulsed. A tip is there to be read, and it is
       on screen for seconds, not minutes; fading it in and out
       spends half of that time unreadable.
   ============================================================ */

import { useEffect, useRef, useState, type ComponentProps } from 'react';

import { cn } from '@/lib/utils';

import { Progress } from '@/components/ui/8bit-progress';

const DEFAULT_TIPS = [
  'Press any key to continue...',
  'Did you know? Saving often prevents lost progress!',
  'Tip: Explore every corner for hidden treasures.',
  'Remember to take breaks during long gaming sessions!',
  'Pro tip: Read the manual for secret moves.'
];

const STEP = 5; // percent per square: twenty squares

export interface LoadingScreenProps extends ComponentProps<'div'> {
  title?: string;
  tips?: string[];
  progress?: number;
  showPercentage?: boolean;
  tipInterval?: number;
  variant?: 'default' | 'fullscreen';
  autoProgress?: boolean;
  autoProgressDuration?: number;
  /** Fires once, when auto-progress reaches 100. */
  onComplete?: () => void;
}

export default function LoadingScreen({
  className,
  title = 'LOADING',
  tips = DEFAULT_TIPS,
  progress = 0,
  showPercentage = true,
  tipInterval = 3000,
  variant = 'default',
  autoProgress = false,
  autoProgressDuration = 5000,
  onComplete,
  ...props
}: LoadingScreenProps) {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  const [internalProgress, setInternalProgress] = useState(autoProgress ? 0 : progress);

  // Held in a ref so a new callback identity never restarts the bar.
  const done = useRef(onComplete);
  done.current = onComplete;

  useEffect(() => {
    if (!autoProgress) {
      setInternalProgress(progress);
      return;
    }

    setInternalProgress(0);
    const started = Date.now();
    const steps = 100 / STEP;
    let finished = false;

    const read = () => {
      const share = Math.min(1, (Date.now() - started) / Math.max(1, autoProgressDuration));
      const next = Math.min(100, Math.floor(share * steps) * STEP);
      setInternalProgress(next);
      if (next >= 100 && !finished) {
        finished = true;
        clearInterval(timer);
        done.current?.();
      }
    };

    // Twice per step, so a late tick cannot make a square arrive a whole
    // step behind the clock.
    const timer = setInterval(read, Math.max(16, autoProgressDuration / steps / 2));

    return () => clearInterval(timer);
  }, [autoProgress, autoProgressDuration, progress]);

  useEffect(() => {
    if (tips.length === 0) return;

    const tipTimer = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tips.length);
    }, tipInterval);

    return () => clearInterval(tipTimer);
  }, [tips, tipInterval]);

  useEffect(() => {
    const cursorTimer = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530);

    return () => clearInterval(cursorTimer);
  }, []);

  const isFullscreen = variant === 'fullscreen';
  const displayProgress = autoProgress ? internalProgress : progress;

  const content = (
    <div className="flex flex-col items-center justify-center gap-6 p-8">
      {/* Title */}
      <h2 className={cn('retro m-0 text-center text-xl md:text-2xl', 'animate-pulse')}>{title}</h2>

      {/* Progress section */}
      <div className="w-full max-w-md space-y-2">
        {showPercentage && (
          <div className="flex justify-end">
            <span className="retro text-xs text-muted-foreground">
              {Math.round(displayProgress)}%
            </span>
          </div>
        )}
        <Progress
          value={displayProgress}
          variant="retro"
          progressBg="bg-primary"
          className="h-4"
        />
      </div>

      {/* Tips section */}
      {tips.length > 0 && (
        <div className="flex min-h-16 w-full max-w-md items-center justify-center">
          <p className="retro m-0 text-center text-[0.625rem] leading-relaxed text-muted-foreground md:text-xs">
            {tips[currentTipIndex % tips.length]}
            <span
              aria-hidden="true"
              className={cn(
                'ml-[0.5em] inline-block h-[1em] w-[0.6em] translate-y-[0.12em] bg-primary',
                !showCursor && 'opacity-0'
              )}
            />
          </p>
        </div>
      )}
    </div>
  );

  if (isFullscreen) {
    return (
      <div
        className={cn('fixed inset-0 z-50 flex items-center justify-center', 'bg-background', className)}
        {...props}
      >
        <div className="w-full max-w-lg px-4">{content}</div>
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)} {...props}>
      {content}
    </div>
  );
}
