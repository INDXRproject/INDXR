// INDXR design tokens, copied verbatim from apps/marketing/src/app/styles/tokens.css. Chrome (which
// Remotion renders through) supports oklch() natively, so we use the same values — no hex translation,
// no drift. Keep in sync with tokens.css if the palette moves.
//
// Theme-aware: LIGHT_TOKENS mirror the tokens.css :root block, DARK_TOKENS the [data-theme="dark"]
// block. tokensFor(theme) hands the composition the right set, so one render can be light and another
// dark — the same OKLCH tokens the app swaps by [data-theme], no separate colour system.

export type Theme = 'light' | 'dark'

export interface Tokens {
  bg: string
  surface: string
  border: string
  fg: string
  fgMuted: string
  fgStrong: string
  accent: string
  fgOnAccent: string
  radiusLg: string
}

// tokens.css :root block.
export const LIGHT_TOKENS: Tokens = {
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

// tokens.css [data-theme="dark"] block.
export const DARK_TOKENS: Tokens = {
  bg: 'oklch(0.165 0.008 70)',
  surface: 'oklch(0.215 0.010 70)',
  border: 'oklch(0.330 0.012 70)',
  fg: 'oklch(0.880 0.008 70)',
  fgMuted: 'oklch(0.625 0.012 70)',
  fgStrong: 'oklch(0.965 0.006 70)',
  accent: 'oklch(0.760 0.150 78)',
  fgOnAccent: 'oklch(0.165 0.008 70)',
  radiusLg: '12px',
} as const

export function tokensFor(theme: Theme): Tokens {
  return theme === 'dark' ? DARK_TOKENS : LIGHT_TOKENS
}
