import type { Config } from 'tailwindcss';

/* Tailwind is here ONLY so component libraries (React Bits, Aceternity,
   Magic UI) can be pasted in unchanged. The existing sections keep their
   own CSS in src/styles.

   preflight is OFF on purpose: Tailwind's reset would flatten the
   hand-tuned borders, list styles and button styling that css/paper.css
   and friends depend on. */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        ink:    '#0b0b0b',
        paper:  '#f3eee4',
        paper2: '#FBF8F2',
        paper3: '#E7E0D2',
        spot:   '#ff5a1f',
        spotInk:'#A83A0B',
        grey:   '#a29d94',
        rule:   '#393732',

        /* shadcn's token names, for components pasted from shadcn-shaped
           libraries (the 8-bit loading screen uses these). They read CSS
           variables, as channels so `bg-primary/20` works — and the
           variables are NOT set globally. A component that wants them sets
           them on its own root (see styles/boot.css), so adding these names
           changes nothing anywhere else on the site. */
        background: 'rgb(var(--background) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        primary: 'rgb(var(--primary) / <alpha-value>)',
        'muted-foreground': 'rgb(var(--muted-foreground) / <alpha-value>)'
      },
      /* `animate-pulse` normally runs a keyframe called `pulse`. This site
         already has a `pulse` of its own — the orange ring round the live
         dot, in paper.css and style-devkraft.css — and it loads later, so it
         won. Every pasted component that pulsed got an orange ring instead
         of a fade. Tailwind's is renamed here so the two can never meet. */
      animation: {
        pulse: 'tw-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      },
      keyframes: {
        'tw-pulse': { '50%': { opacity: '0.5' } }
      },
      fontFamily: {
        display: ['Anton', 'Arial Narrow', 'Impact', 'sans-serif'],
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'ui-monospace', 'monospace']
      }
    }
  },
  plugins: []
} satisfies Config;
