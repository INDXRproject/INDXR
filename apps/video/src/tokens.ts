// INDXR design tokens (light theme), copied verbatim from apps/marketing/src/app/styles/tokens.css
// :root block. Chrome (which Remotion renders through) supports oklch() natively, so we use the same
// values — no hex translation, no drift. Keep in sync with tokens.css if the palette moves.
export const T = {
  bg: 'oklch(0.985 0.004 70)',
  surface: 'oklch(1 0 0)',
  border: 'oklch(0.880 0.008 70)',
  fg: 'oklch(0.260 0.010 70)',
  fgMuted: 'oklch(0.555 0.010 70)',
  fgStrong: 'oklch(0.165 0.008 70)',
  accent: 'oklch(0.720 0.140 75)',
  fgOnAccent: 'oklch(0.985 0.004 70)',
  radiusLg: '12px',
} as const
