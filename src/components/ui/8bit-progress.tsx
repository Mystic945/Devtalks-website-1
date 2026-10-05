/* ============================================================
   8-BIT PROGRESS
   ------------------------------------------------------------
   The bar 8bit-loading-screen.tsx draws with. The loading screen
   was pasted in from 8bitcn; this file was not part of the paste,
   so it is written here to the same shape: the `retro` variant is
   a row of twenty squares that fill one at a time, inside a
   stepped pixel border made of two overlapping frames.

   Two things differ from upstream, both because of this project:

     • no Radix. Upstream wraps shadcn's <Progress>, which this
       site does not have; a div with role="progressbar" carries
       the same semantics without the dependency.
     • every border says `border-solid` and zeroes the sides it
       does not use. Tailwind's preflight is switched off here
       (see tailwind.config.ts), and without it a border has no
       style and a `medium` width on all four sides.
   ============================================================ */

import type { ComponentProps } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

export const progressVariants = cva('', {
  variants: {
    variant: {
      default: '',
      retro: 'retro'
    },
    font: {
      normal: '',
      retro: 'retro'
    }
  },
  defaultVariants: {
    font: 'retro'
  }
});

export interface BitProgressProps
  extends Omit<ComponentProps<'div'>, 'children'>,
    VariantProps<typeof progressVariants> {
  /** 0–100 */
  value?: number;
  /** Tailwind class for the filled part, e.g. "bg-primary" */
  progressBg?: string;
  /** how many squares the retro bar is cut into */
  segments?: number;
}

function Progress({
  className,
  font,
  variant,
  value = 0,
  progressBg = 'bg-primary',
  segments = 20,
  ...props
}: BitProgressProps) {
  const pct = Math.min(100, Math.max(0, value));
  const filled = Math.round((pct / 100) * segments);

  return (
    <div className={cn('relative w-full', className)}>
      <div
        data-slot="progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        className={cn(
          'relative h-full w-full overflow-hidden bg-primary/20',
          font !== 'normal' && 'retro'
        )}
        {...props}
      >
        {variant === 'retro' ? (
          <div data-slot="progress-indicator" className="flex h-full w-full">
            {Array.from({ length: segments }, (_, i) => (
              <div
                key={i}
                className={cn('mx-[1px] size-full', i < filled ? progressBg : 'bg-transparent')}
              />
            ))}
          </div>
        ) : (
          <div
            data-slot="progress-indicator"
            className={cn('h-full w-full transition-transform', progressBg)}
            style={{ transform: `translateX(-${100 - pct}%)` }}
          />
        )}
      </div>

      {/* The pixel border: two frames, each missing the other's sides, so the
          corners come out notched instead of square. */}
      <div
        className="pointer-events-none absolute inset-0 -my-1 border-x-0 border-y-4 border-solid border-foreground"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 -mx-1 border-x-4 border-y-0 border-solid border-foreground"
        aria-hidden="true"
      />
    </div>
  );
}

export { Progress };
