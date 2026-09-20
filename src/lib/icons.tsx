/* ============================================================
   DEVTALKS — INLINE ICONS
   ------------------------------------------------------------
   Drawn inline so there is nothing to download and nothing to
   404. They inherit stroke and fill from the CSS that placed
   them, which is why none of them carry a colour.
   ============================================================ */

import type { ReactElement } from 'react';

const line = {
  fill: 'none',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
} as const;

/* ---- hero "What you get" perks ---- */
export const PERK_ICONS: Record<string, ReactElement> = {
  play: (
    <svg viewBox="0 0 24 24" {...line}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M10 9l5 3-5 3z" />
    </svg>
  ),
  cup: (
    <svg viewBox="0 0 24 24" {...line}>
      <path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" />
      <path d="M17 9h2a2.5 2.5 0 0 1 0 5h-2" />
      <path d="M8 2v2.6M12 2v2.6" />
    </svg>
  ),
  mic: (
    <svg viewBox="0 0 24 24" {...line}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
    </svg>
  )
};

/* ---- speaker card topic badges ---- */
const topic = { ...line, strokeWidth: 2 } as const;

export const TOPIC_ICONS = {
  terminal: (
    <svg viewBox="0 0 24 24" {...topic}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M6 9l3 3-3 3M13 15h5" />
    </svg>
  ),
  chip: (
    <svg viewBox="0 0 24 24" {...topic}>
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
      <path d="M4 10h3M4 14h3M17 10h3M17 14h3M10 4v3M14 4v3M10 17v3M14 17v3" />
    </svg>
  ),
  opensource: (
    <svg viewBox="0 0 24 24" {...topic}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v6M9 20.2l2.2-5.6M15 20.2l-2.2-5.6" />
    </svg>
  ),
  stack: (
    <svg viewBox="0 0 24 24" {...topic}>
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M3 13l9 5 9-5M3 16.5l9 5 9-5" />
    </svg>
  ),
  wave: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round">
      <path d="M2 12h2.5M7 5v14M11.5 8.5v7M16 3v18M20.5 9v6M22 12h0" />
    </svg>
  )
} as const;

export type TopicIcon = keyof typeof TOPIC_ICONS;

const FALLBACK: TopicIcon[] = ['terminal', 'chip', 'opensource'];

/** Pick a badge from the speaker's own `icon`, else infer one from their
 *  first tag, else deal from the fallback set so no two neighbours match. */
export function topicIconFor(
  speaker: { icon?: string; tags?: readonly string[] } | undefined,
  i: number
): ReactElement {
  const named = speaker?.icon as TopicIcon | undefined;
  if (named && named in TOPIC_ICONS) return TOPIC_ICONS[named];

  const tag = (speaker?.tags?.[0] || '').toLowerCase();
  if (/infra|scale|system/.test(tag)) return TOPIC_ICONS.stack;
  if (/ai|research|model|data/.test(tag)) return TOPIC_ICONS.chip;
  if (/open|source/.test(tag)) return TOPIC_ICONS.opensource;
  if (/design|product/.test(tag)) return TOPIC_ICONS.wave;
  if (/startup|engineer|found/.test(tag)) return TOPIC_ICONS.terminal;

  return TOPIC_ICONS[FALLBACK[i % FALLBACK.length]];
}

/* ---- the ticket's price tag ---- */
export const TagIcon = (): ReactElement => (
  <svg
    viewBox="0 0 24 24"
    {...topic}
    stroke="currentColor"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z" />
    <circle cx="7.5" cy="7.5" r="1.4" />
  </svg>
);

/* ---- the reel's play mark ---- */
export const PlayMark = (): ReactElement => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M9 7.5v9l7.5-4.5z" fill="currentColor" />
    <circle cx="12" cy="12" r="10.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

/* ---- the bolt set into the hero wordmark ---- */
/* Solid, not stroked: it sits at display size beside Anton caps, and a
   1.8px stroke reads as a hairline crack at that scale. */
export const BoltMark = (): ReactElement => (
  <svg viewBox="0 0 12 24" aria-hidden="true" focusable="false">
    <path d="M7.9 0 0 13.4h4.2L3.1 24 12 9.8H7.3z" />
  </svg>
);
