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
        rule:   '#393732'
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
