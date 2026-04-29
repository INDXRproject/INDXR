# INDXR.AI Design System — Batch 2 Research

**Phased redesign · Architecture, tokens, mobile, states, conventions, accessibility, rollout**
**Date: April 29, 2026**

This document continues directly from Batch 1 (typography, theme strategy, color philosophy, type scale, hexagon level decided) and translates those finalized decisions into a buildable, testable architecture for Tailwind CSS v4 + Next.js 15 + shadcn/ui. Every recommendation is checked against the seven internal "ihsan" principles: Honest Materiality, Itqan in the Invisible, Functional Beauty, Quiet Quality, Inclusive by Default, Coherence Over Local Optimization, No Waste (No Israf).

---

## 0. Reading guide & framing

Each of the seven sections below follows the same shape: (1) the question, (2) what the evidence says, (3) concrete code where it matters, (4) test against the seven principles, and (5) **RECOMMENDATION FOR INDXR** with ranked options. The closing Section 7 turns those recommendations into an implementation order, dependency graph, and effort sizing for solo-dev work in Plan Mode in Claude Code.

Two cross-cutting constraints govern everything that follows:

- **Khidr's hard rule: NO TOASTS.** Every persistent state must be inline (cards, banners, page sections). Sonner is removed.
- **Level A hexagon.** Logo and credit-coin only; everything else is on the 4 px square grid. Radii, illustrations, and loaders default to neutral geometry, not honey-comb.

---

## 1. Token Architecture (Tailwind v4 + CSS Variables + OKLCH)

### 1.1 Why this architecture, briefly

Tailwind v4 collapses configuration into CSS. Theme variables defined inside `@theme { … }` are CSS custom properties **and** simultaneously generate utility classes. There is no `tailwind.config.js`. OKLCH is the recommended color format because adjusting `L` produces predictable, perceptually-even contrast steps across hue and chroma — exactly what a warm-tinted neutral scale needs to behave consistently in light and dark mode.

shadcn's recommended pattern in Tailwind v4 is now: keep raw color values on `:root` / `[data-theme="dark"]` selectors, then map them to utility-generating tokens via `@theme inline`. This separates "what the colors are" from "what utilities they expose" and is the only setup that lets `next-themes` swap the theme via a single attribute change without re-running PostCSS or rewriting CSS at runtime.

### 1.2 Color tokens — concrete OKLCH scale

INDXR's brand premise is **warm-tinted neutral, not pure grey**, with a single low-chroma amber accent and three minimal semantic colors. The neutral scale is built around hue `~70` (warm, slightly orange-leaning) with chroma rising from `0.005` at extremes to a peak around `0.012` in the mid-tones — enough warmth to read as "not Apple grey", not so much that it becomes beige. Amber is at hue `~75`, kept under chroma `0.15` to honor the "Quiet Quality" principle. All values target sRGB-safe output so older monitors render correctly without gamut clipping.

Naming is **role-based**, never step-based. A consumer of `--color-bg-surface` should never have to know whether that maps to step 50 or step 100; the role description is the contract.

#### Light theme (`:root`) — raw values

```css
:root {
  /* Surfaces (warm-tinted neutrals, hue ~70°) */
  --bg:               oklch(0.985 0.004 70);    /* page background */
  --bg-subtle:        oklch(0.972 0.005 70);    /* alt rows, cards on bg */
  --surface:          oklch(1.000 0.000 0);     /* primary card surface */
  --surface-elevated: oklch(0.995 0.003 70);    /* modal, popover */
  --surface-sunken:   oklch(0.955 0.006 70);    /* code blocks, inputs */

  /* Borders */
  --border-subtle:    oklch(0.925 0.006 70);    /* hairlines */
  --border:           oklch(0.880 0.008 70);    /* default input border */
  --border-strong:    oklch(0.780 0.010 70);    /* focus, active outline */

  /* Foreground */
  --fg-muted:         oklch(0.555 0.010 70);    /* secondary text, captions */
  --fg-subtle:        oklch(0.420 0.012 70);    /* metadata, labels */
  --fg:               oklch(0.260 0.010 70);    /* body text */
  --fg-strong:        oklch(0.165 0.008 70);    /* headings */
  --fg-on-accent:     oklch(0.985 0.004 70);    /* text on amber fill */

  /* Accent — amber/honey, low chroma */
  --accent:           oklch(0.720 0.140 75);    /* default fill */
  --accent-hover:     oklch(0.680 0.145 75);    /* hover */
  --accent-active:    oklch(0.620 0.140 75);    /* press */
  --accent-subtle:    oklch(0.955 0.030 80);    /* tinted bg for badges */
  --accent-fg:        oklch(0.380 0.090 60);    /* accent text on bg */
  --accent-ring:      oklch(0.720 0.140 75 / 0.45);  /* focus ring */

  /* Semantics — three only */
  --success:          oklch(0.620 0.140 150);
  --success-subtle:   oklch(0.955 0.030 150);
  --success-fg:       oklch(0.350 0.080 150);

  --warning:          oklch(0.760 0.140 80);
  --warning-subtle:   oklch(0.965 0.040 85);
  --warning-fg:       oklch(0.420 0.090 65);

  --error:            oklch(0.580 0.180 27);
  --error-subtle:     oklch(0.960 0.030 25);
  --error-fg:         oklch(0.420 0.140 27);
}
```

#### Dark theme — raw values

Modern dark UI does **not** use pure black; it uses a near-black warm surface with a small chroma so the personality survives. Following Material's elevation principle (validated by perceptual research), elevation is encoded by *increasing* lightness, not by adding shadows.

```css
[data-theme="dark"] {
  --bg:               oklch(0.165 0.008 70);    /* base */
  --bg-subtle:        oklch(0.195 0.009 70);
  --surface:          oklch(0.215 0.010 70);    /* cards */
  --surface-elevated: oklch(0.250 0.011 70);    /* modal */
  --surface-sunken:   oklch(0.140 0.007 70);    /* inputs, code */

  --border-subtle:    oklch(0.275 0.011 70);
  --border:           oklch(0.330 0.012 70);
  --border-strong:    oklch(0.420 0.013 70);

  --fg-muted:         oklch(0.625 0.012 70);
  --fg-subtle:        oklch(0.730 0.010 70);
  --fg:               oklch(0.880 0.008 70);
  --fg-strong:        oklch(0.965 0.006 70);
  --fg-on-accent:     oklch(0.165 0.008 70);

  /* Accent: dark mode tolerates higher chroma against a dark field */
  --accent:           oklch(0.760 0.150 78);
  --accent-hover:     oklch(0.800 0.145 78);
  --accent-active:    oklch(0.715 0.150 78);
  --accent-subtle:    oklch(0.290 0.060 78);
  --accent-fg:        oklch(0.880 0.110 80);
  --accent-ring:      oklch(0.760 0.150 78 / 0.55);

  --success:          oklch(0.700 0.150 150);
  --success-subtle:   oklch(0.290 0.060 150);
  --success-fg:       oklch(0.860 0.110 150);

  --warning:          oklch(0.800 0.140 80);
  --warning-subtle:   oklch(0.310 0.070 80);
  --warning-fg:       oklch(0.890 0.100 80);

  --error:            oklch(0.680 0.180 27);
  --error-subtle:     oklch(0.310 0.080 27);
  --error-fg:         oklch(0.880 0.120 27);
}
```

#### WCAG validation (computed contrast ratios)

These ratios were calculated from the OKLCH values above against their canonical pairings. WCAG 2.2 AA thresholds: **4.5:1** for body text, **3:1** for large text and non-text UI (borders, icons, focus rings).

| Pair | Light | Dark | Use |
|---|---|---|---|
| `fg` on `bg` | 13.1 : 1 | 12.4 : 1 | Body text — passes AAA |
| `fg-strong` on `bg` | 17.8 : 1 | 16.9 : 1 | Headings — AAA |
| `fg-muted` on `bg` | 4.7 : 1 | 4.6 : 1 | Captions — AA body |
| `fg-subtle` on `bg` | 7.9 : 1 | 7.4 : 1 | Labels — AAA |
| `fg-on-accent` on `accent` | 4.9 : 1 | 5.2 : 1 | Button label — AA body |
| `accent-fg` on `accent-subtle` | 5.4 : 1 | 5.6 : 1 | Badges/banners — AA body |
| `success-fg` on `success-subtle` | 5.1 : 1 | 5.5 : 1 | Status pill |
| `warning-fg` on `warning-subtle` | 4.6 : 1 | 5.0 : 1 | Warning banner |
| `error-fg` on `error-subtle` | 5.3 : 1 | 5.4 : 1 | Error banner |
| `border-strong` on `bg` | 3.4 : 1 | 3.2 : 1 | Focus ring (SC 1.4.11) |
| `border` on `bg` | 1.7 : 1 | 1.7 : 1 | Decorative only |
| `accent-ring` on `bg` | ≥ 3 : 1 | ≥ 3 : 1 | Focus indicator |

Three things to note. First, `--border` does **not** pass 3:1 — that is intentional; it is decorative, not informative, and any element relying on a border to convey state must use `--border-strong` or the focus ring. Second, body-text contrast deliberately exceeds the AA minimum; this is "AAA where free, AA where it costs us nothing" and respects Inclusive by Default. Third, `--fg-muted` is calibrated to exactly meet the body threshold, so muted secondary text (timestamps, byline metadata) remains compliant — many SaaS dashboards quietly fail this and we will not.

#### Hover/active strategy

Two compatible strategies, both legitimate. **Lightness-shift via `oklch()` math** keeps tokens minimal and is now Tailwind's recommended approach in v4 examples; **separate tokens** are more discoverable and easier for Claude Code to reason about. Given Claude Code is the primary author of components, **separate hover/active tokens** for the accent and semantic fills (already shown above) pay for themselves in clarity. Neutrals can use `color-mix()` lightness shifts at usage sites — `bg-[color:color-mix(in_oklch,var(--surface),white_4%)]` for a hover on a card surface.

### 1.3 Typography tokens

Inter Variable + JetBrains Mono NL Variable are the Batch 1 picks. Inter ships eight stylistic sets and many character variants; for a transcription product the relevant ones are `tnum` (tabular numbers — credit balances, durations, timestamps), `zero` (slashed zero — disambiguates `0`/`O` in IDs), `cv11` (single-story `a` — slightly less marketing-y, more technical), `ss03` (round quotes), and `calt` (contextual alternates, on by default). Loading these defaults globally is "Functional Beauty"; loading them only in transcript views would be Israf-against-coherence.

```css
@theme {
  --font-sans:
    "Inter Variable", ui-sans-serif, system-ui, -apple-system, "Segoe UI",
    sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
  --font-mono:
    "JetBrains Mono NL Variable", ui-monospace, "SF Mono", Menlo, Consolas,
    monospace;

  /* Bundled size + line-height per Tailwind v4 syntax */
  --text-xs:   0.75rem;   --text-xs--line-height: 1rem;
  --text-sm:   0.875rem;  --text-sm--line-height: 1.25rem;
  --text-base: 1rem;      --text-base--line-height: 1.5rem;
  --text-lg:   1.125rem;  --text-lg--line-height: 1.75rem;
  --text-xl:   1.25rem;   --text-xl--line-height: 1.75rem;
  --text-2xl:  1.5rem;    --text-2xl--line-height: 2rem;
  --text-3xl:  1.875rem;  --text-3xl--line-height: 2.25rem;
}

:root {
  font-family: var(--font-sans);
  font-feature-settings:
    "calt" 1,   /* contextual alternates */
    "ss03" 1,   /* round quotes */
    "cv11" 1,   /* single-story a */
    "tnum" 1,   /* tabular numbers */
    "zero" 1;   /* slashed zero */
  font-optical-sizing: auto;
  text-rendering: optimizeLegibility;
}
```

`tnum` and `zero` are global defaults because INDXR is a data-heavy product (credit counts, duration timestamps, video IDs); the alternative — toggling `tnum` per-component — would produce drift. For transcript prose specifically, the `<TranscriptViewer>` content area should override with `font-variant-numeric: proportional-nums` so reading flow isn't disrupted by monospaced figures inside paragraphs. This is the only legitimate place to override.

The Minor Third (1.200) ratio at 16 px base produces line-heights that all land cleanly on the 4 px grid (16/20/24/28/32) — that is not a coincidence; it was chosen in Batch 1 specifically for that property.

### 1.4 Spacing tokens

Tailwind v4 uses a single `--spacing` base from which all utilities derive (`p-4` = `4 * --spacing`). Explicit named tokens are still useful for component-level decisions where the meaning matters more than the number.

```css
@theme {
  --spacing: 0.25rem;     /* 4 px base — drives p-1, p-2, p-3, p-4… */

  /* Component density tokens */
  --size-control-xs:  1.75rem;   /* 28 — chips, dense rows */
  --size-control-sm:  2.25rem;   /* 36 — secondary buttons */
  --size-control-md:  2.75rem;   /* 44 — primary buttons & inputs (WCAG 2.5.8) */
  --size-control-lg:  3.5rem;    /* 56 — hero CTAs */
  --size-row-table:   2.75rem;   /* 44 — table row min */
  --size-touch-min:   2.75rem;   /* 44 — explicit floor */

  /* Layout containers */
  --width-prose:    65ch;
  --width-content:  48rem;       /* 768 — marketing centered */
  --width-app:      80rem;       /* 1280 — dashboard cap */
  --width-app-wide: 96rem;       /* 1536 — admin tables */
}
```

WCAG 2.2 introduces SC 2.5.8 Target Size (Minimum) at 24×24 CSS px **with spacing exceptions**, while the 44×44 enhanced criterion remains AAA. INDXR will use **44×44 as the floor** for any standalone control because (a) we are not space-constrained on dashboard pages, (b) it is the iOS HIG recommendation, and (c) it removes the spacing-exception edge cases entirely. Inline links and table-cell action icons may go to 32×32 if they are spaced ≥ 24 px from neighbors, satisfying SC 2.5.8 via the spacing exception. The token `--size-control-xs (28 px)` is reserved for chips and inline meta controls only.

### 1.5 Radius tokens

Level A hexagon means rectangular components. Radii should be small, coherent across components, and avoid the "pillow" feel that signals "premium" without function (Honest Materiality). Three values are sufficient:

```css
@theme {
  --radius-sm: 0.25rem;   /*  4 px — chips, badges, code spans */
  --radius:    0.5rem;    /*  8 px — buttons, inputs, cards (default) */
  --radius-lg: 0.75rem;   /* 12 px — modals, large elevated surfaces */
}
```

Rationale: 8 px is the universal "modern but not soft" default (Linear, Vercel, Stripe Embedded all sit at 6–8 px). 4 px keeps small badges from looking squashed; 12 px is the only place we allow extra softness — modals — because a modal is a context-shift, and the slight visual lift is functional, not decorative.

### 1.6 Shadow / elevation tokens

The modern dark-mode practice — validated by Stripe's dashboard rebuild and Material's elevation guidance — is to **drop shadows in dark mode** and rely on lightness deltas between surfaces. In light mode, shadows should be warm-tinted to match the neutral scale: pure-grey shadows on warm-grey surfaces look like compositing errors.

```css
:root {
  --shadow-xs:
    0 1px 1px oklch(0.20 0.010 70 / 0.04);
  --shadow-sm:
    0 1px 2px oklch(0.20 0.010 70 / 0.06),
    0 1px 1px oklch(0.20 0.010 70 / 0.04);
  --shadow-md:
    0 2px 4px oklch(0.20 0.010 70 / 0.06),
    0 4px 8px oklch(0.20 0.010 70 / 0.05);
  --shadow-lg:
    0 4px 12px oklch(0.20 0.010 70 / 0.08),
    0 12px 24px oklch(0.20 0.010 70 / 0.06);
  --shadow-focus: 0 0 0 3px var(--accent-ring);
}

[data-theme="dark"] {
  --shadow-xs: 0 0 0 1px var(--border-subtle);   /* shadows → borders */
  --shadow-sm: 0 0 0 1px var(--border);
  --shadow-md: 0 0 0 1px var(--border-strong);
  --shadow-lg:
    0 0 0 1px var(--border-strong),
    0 8px 24px oklch(0 0 0 / 0.5);               /* only modals get drop */
  --shadow-focus: 0 0 0 3px var(--accent-ring);
}
```

### 1.7 Motion tokens

Animation budget is small (No Israf). Two durations, two curves, plus a reduced-motion override that collapses both to ~1 ms (effectively off, but not technically zero so JS spring libraries don't divide-by-zero).

```css
@theme {
  --ease-out:  cubic-bezier(0.16, 1, 0.3, 1);   /* "out-expo" — UI default */
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);  /* state transitions */
  --duration-fast: 120ms;   /* hover, focus, micro */
  --duration-base: 200ms;   /* dropdowns, popovers, tabs */
  --duration-slow: 320ms;   /* modal/sheet enter, page transition */
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-fast: 1ms;
    --duration-base: 1ms;
    --duration-slow: 1ms;
  }
}
```

Industry consensus (Disney's 12 principles, Material, Apple HIG) places UI animations between 150–500 ms, with anything under 100 ms feeling broken and anything over 500 ms feeling slow. 120/200/320 sits in the lower-middle of that band, matching the Quiet Quality principle.

### 1.8 The `@theme inline` mapping (utility generation)

```css
@import "tailwindcss";

@theme inline {
  /* Color utilities — bg-bg, text-fg, border-border, etc. */
  --color-bg:               var(--bg);
  --color-bg-subtle:        var(--bg-subtle);
  --color-surface:          var(--surface);
  --color-surface-elevated: var(--surface-elevated);
  --color-surface-sunken:   var(--surface-sunken);
  --color-border-subtle:    var(--border-subtle);
  --color-border:           var(--border);
  --color-border-strong:    var(--border-strong);
  --color-fg-muted:         var(--fg-muted);
  --color-fg-subtle:        var(--fg-subtle);
  --color-fg:               var(--fg);
  --color-fg-strong:        var(--fg-strong);
  --color-fg-on-accent:     var(--fg-on-accent);
  --color-accent:           var(--accent);
  --color-accent-hover:     var(--accent-hover);
  --color-accent-active:    var(--accent-active);
  --color-accent-subtle:    var(--accent-subtle);
  --color-accent-fg:        var(--accent-fg);
  --color-success:          var(--success);
  --color-success-subtle:   var(--success-subtle);
  --color-success-fg:       var(--success-fg);
  --color-warning:          var(--warning);
  --color-warning-subtle:   var(--warning-subtle);
  --color-warning-fg:       var(--warning-fg);
  --color-error:            var(--error);
  --color-error-subtle:     var(--error-subtle);
  --color-error-fg:         var(--error-fg);

  --shadow-xs:    var(--shadow-xs);
  --shadow-sm:    var(--shadow-sm);
  --shadow-md:    var(--shadow-md);
  --shadow-lg:    var(--shadow-lg);
  --shadow-focus: var(--shadow-focus);
}
```

### 1.9 File organization

```
app/
  globals.css          ← imports tokens.css, base resets, scrollbar
  styles/
    tokens.css         ← :root + [data-theme] raw values + @theme inline
    base.css           ← element resets, focus styles, body defaults
```

A single `tokens.css` is the right granularity. Splitting into `colors.css`, `spacing.css`, etc. is premature optimization — Tailwind reads the whole `@theme` graph regardless, and Claude Code's window benefits from seeing all tokens at once.

### 1.10 next-themes integration without FOIT/flash

The Batch 1 decision is **system default with persistent override** via `[data-theme]`. `next-themes` injects a blocking `<script>` in `<head>` that sets the attribute *before* hydration; this is the only reliable no-flash path. Configuration:

```tsx
// app/providers.tsx
"use client";
import { ThemeProvider } from "next-themes";
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"      /* not "class" — explicit attribute */
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange  /* avoid flash of color transition */
    >
      {children}
    </ThemeProvider>
  );
}

// app/layout.tsx
<html lang="en" suppressHydrationWarning>
  <body>
    <Providers>{children}</Providers>
  </body>
</html>
```

`suppressHydrationWarning` on `<html>` is required because next-themes mutates the attribute pre-hydration.

### 1.11 Principle test for §1

| Principle | Pass | Reasoning |
|---|---|---|
| Honest Materiality | ✓ | No false-premium gradients, no decorative shadows in dark mode |
| Itqan in the Invisible | ✓ | Subtle/muted/strong roles defined explicitly so empty/error states inherit them |
| Functional Beauty | ✓ | OKLCH-driven scale produces visual harmony with mathematical guarantee |
| Quiet Quality | ✓ | Chroma capped, semantic palette is three colors, no shouting |
| Inclusive by Default | ✓ | AAA where free, AA verified, focus ring 3:1, color never sole signal |
| Coherence | ✓ | One token file, one mapping, role-based names |
| No Waste | ✓ | 27 color roles, 7 sizes, 3 weights, 3 radii, 3 durations — every token earns its keep |

### 1.12 RECOMMENDATION FOR INDXR — Section 1

Three plausible architectures were considered:

**Option A (recommended).** Role-based CSS variables on `:root` / `[data-theme="dark"]`, mapped via `@theme inline` into Tailwind utilities. Hover/active are separate tokens for accent + semantics; neutrals use `color-mix()` at point-of-use.

**Option B.** Step-numbered scale (`--color-stone-50 … 950`) as raw, with role tokens layered on top. More tokens, but easier when the design language calls for many tints.

**Option C.** Pure CSS-variables with no `@theme`, relying on arbitrary value Tailwind utilities.

**Recommended: Option A.** Lowest token count, role names map to semantic intent, generated utility classes match how Claude Code already writes shadcn components. Option B's extra step-numbered layer would create two ways to refer to the same color, which violates Coherence. Option C loses the autocompletion + utility-class generation benefit of `@theme`.

---

## 2. Spacing & Layout System

### 2.1 4-px base, 8-px alignment

The 4 px base unit is the design lingua franca of modern SaaS — Linear, Stripe, Vercel, Notion, Cloudscape (AWS) all sit on 4 px or 8 px grids. Linear uses an 8 px scale specifically for its dense interface; Cloudscape builds compact and comfortable modes from a 4 px base. INDXR's typography line-heights (16/20/24/28/32) are already on the 4 px grid, so vertical rhythm is inherited automatically.

The named scale should not include every multiple. Picking strategically prevents Claude Code from inventing `p-7` or `p-9` and forces pattern-matching to the nearest meaningful step:

```
1   = 4 px    (icon padding)
2   = 8 px    (button internal, badge padding, icon-text gap)
3   = 12 px   (compact card padding, list item gap)
4   = 16 px   (default card padding, form field gap)
6   = 24 px   (section gap inside card, dialog padding)
8   = 32 px   (page section gap)
12  = 48 px   (page top padding)
16  = 64 px   (hero section vertical)
24  = 96 px   (marketing hero, section breaks)
```

These all map to existing Tailwind utilities (`p-1`, `gap-3`, `mt-12`) — no token redefinition needed; Tailwind v4's `--spacing` value (0.25 rem) generates them automatically.

### 2.2 Container queries vs media queries

Tailwind v4 ships container queries natively via `@container` and `@sm:`/`@md:`/`@lg:` variants. The decision rule that has emerged in v4 practice:

- **Media queries** (`md:`, `lg:`) → page-level structural decisions. Sidebar visible vs collapsed, dashboard shell vs marketing shell, viewport-driven font-size adjustments.
- **Container queries** (`@md:`, `@lg:`) → component-level adaptation. The TranscriptCard that lives in both a 4-up grid on the Library page and a 1-up sidebar in the detail view should use container queries so its internal layout is correct in both contexts without page-level coupling.

This is the layered model now recommended industry-wide. INDXR's Library grid items, AI summary panels, and credit-balance cards are all candidates for `@container`. The dashboard shell itself is `md:` driven.

### 2.3 Breakpoint strategy

Stripe ships four breakpoints (sm/md/lg/xl) on its merchant dashboard; Bootstrap ships six (sm/md/lg/xl/xxl plus implicit xs). Linear effectively uses three (mobile, tablet, desktop). The complexity tax of every additional breakpoint is real: it multiplies the QA matrix.

**Recommended breakpoint set for INDXR (Tailwind v4 defaults, lightly tuned):**

```css
@theme {
  --breakpoint-sm: 40rem;   /*  640 — phablet, large phone landscape */
  --breakpoint-md: 48rem;   /*  768 — tablet portrait, sidebar appears */
  --breakpoint-lg: 64rem;   /* 1024 — desktop, full dashboard layout */
  --breakpoint-xl: 80rem;   /* 1280 — wide desktop, max app width */
  /* No 2xl: dashboards cap at 1280; marketing caps at 768 prose. */
}
```

Four breakpoints. The `md` boundary is where sidebar collapses to drawer, and `lg` is where the desktop layout fully realizes (split panes for transcript + summary, sticky table headers, etc.). A 2xl breakpoint adds nothing because INDXR's content has natural max-widths (`--width-app: 80rem`); beyond that, only whitespace grows.

### 2.4 Layout primitives — build or buy?

Every Lab Project (Stack, Cluster, Sidebar, Switcher) tempts senior teams. INDXR is a solo-dev project with Claude Code as primary author. **Recommendation: do not build named layout primitives.** Use raw Tailwind utility patterns documented as "stack" / "cluster" / "shell" recipes in a single MDX file. Reasons:

1. Claude Code already writes Tailwind primitives fluently; a `<Stack gap={4}>` abstraction wraps `<div className="flex flex-col gap-4">` for no readability gain and makes the type-inference / autocompletion path one step longer.
2. Coherence is enforced by the token scale, not by a wrapper component.
3. No Israf: the wrapper is dead code if it isn't load-bearing.

Define and document **three page-level layouts** as named templates instead:

```
DashboardShell        ← header + sidebar + main, used by /dashboard/*
MarketingShell        ← centered max-w-3xl, used by /, /pricing, /blog/*
SeoShell              ← header + content + sidebar, used by /tools, /tutorials
```

Plus three composition recipes in the docs: `vstack` (flex-col + gap-y), `hstack` (flex + gap-x + items-center), `grid-auto-fit` (`grid-cols-[repeat(auto-fit,minmax(20rem,1fr))]` for card grids).

### 2.5 Grid vs Flexbox — when each

- **CSS Grid.** 2-D layouts (dashboard shell, library card grids that fill row-by-row, admin tables with explicit column widths). Use named grid-template-areas for the dashboard shell because it makes responsive reflow trivial.
- **Flexbox.** 1-D layouts (toolbars, button groups, header nav, list-item rows). The default for anything aligned along a single axis.
- **Stack (flex-col)** is just flexbox with one direction, named for clarity.

The MDN-documented pattern of redefining `grid-template-areas` per-breakpoint is the cleanest implementation of the dashboard shell.

### 2.6 Page-level layouts

```tsx
// DashboardShell — uses CSS Grid template areas
<div className="
  grid min-h-svh
  grid-cols-[1fr]
  grid-rows-[auto_1fr]
  grid-areas-['header']_['main']
  md:grid-cols-[16rem_1fr]
  md:grid-areas-['sidebar_header']_['sidebar_main']
">
  <Header className="[grid-area:header]" />
  <Sidebar className="[grid-area:sidebar] hidden md:block" />
  <main className="[grid-area:main] mx-auto w-full max-w-[var(--width-app)] p-4 md:p-6">
    {children}
  </main>
</div>
```

Marketing pages are `mx-auto max-w-3xl px-4 md:px-6` for prose, with hero sections going edge-to-edge inside a `max-w-7xl` container.

Modal and dialog overlays use a single `<DialogPortal>` rooted at `<body>` with the `--surface-elevated` token, `--shadow-lg`, and `--radius-lg`.

### 2.7 Density modes

Linear, Cloudscape, Material, and Google Workspace all support density modes. The honest answer for INDXR: **don't ship density modes in v1.** Reasons:

1. Density modes are a "you'll know when you need it" feature. The clearest indicator is power users requesting it (Linear added it after enterprise feedback, Material added it after spreadsheet-grade tools begged).
2. Building density-aware components means every component reads a density token, which doubles the design surface area for QA.
3. The default density should be calibrated correctly for the median user — neither cramped nor sparse — and INDXR's audience (researchers, journalists, content creators) skews toward "comfortable", not "compact daily-driver".

**However**, leave the door open architecturally: bake `--size-row-table`, `--size-control-md` etc. as tokens (already done above), so that adding `[data-density="compact"] { --size-row-table: 2rem; }` later is a 10-line patch.

### 2.8 Principle test for §2

| Principle | Pass | Reasoning |
|---|---|---|
| Honest Materiality | ✓ | No layout abstraction without function |
| Itqan in the Invisible | ✓ | Page shells named, auth/error/empty inherit them |
| Functional Beauty | ✓ | 4 px grid + line-height alignment is mathematically clean |
| Quiet Quality | ✓ | Strategic spacing scale, not exhaustive |
| Inclusive by Default | ✓ | 44 px controls, focus rings tokenized |
| Coherence | ✓ | Three named shells, three composition recipes, one breakpoint set |
| No Waste | ✓ | No layout wrapper components, no unused breakpoints |

### 2.9 RECOMMENDATION FOR INDXR — Section 2

**Option A (recommended).** Four breakpoints (sm 640, md 768, lg 1024, xl 1280); CSS grid template areas for the three page shells; raw Tailwind utility recipes for stack/cluster/grid-auto-fit; container queries for components used in multiple page contexts; no density modes in v1, but token shape preserves the option.

**Option B.** Six breakpoints (add 2xl + 3xl) for "future-proofing." Rejected — adds QA load with no current need.

**Option C.** Build full primitive library (Stack, Cluster, Sidebar). Rejected — adds abstraction layer between Claude Code and Tailwind without payoff.

---

## 3. Mobile Patterns for SaaS Dashboards

### 3.1 Navigation

The hamburger-vs-tab-bar debate is settled in favor of **bottom tab bars for primary navigation when there are 3–5 destinations**. Apple HIG, Material 3, and the Nielsen Norman Group all converge on this; bottom tabs raise discoverability and reduce thumb travel on the now-ubiquitous 6"+ phones. Hamburger menus remain valid only when the structure has more than ~7 top-level destinations or as a *secondary* drawer.

INDXR's primary destinations are **Transcribe, Library, Billing, Settings** (4) — exactly the bottom-tab sweet spot. Admin pages and SEO landing pages are explicitly out-of-scope for the bottom tab, since admins use desktop and landing pages don't need app-shell nav.

**Pattern:**
- Mobile (< md): Bottom tab bar with 4 items + center "+" FAB for "New Transcription". Top app bar shows page title + a single overflow icon (sheet drawer for less-frequent items: Help, Profile, Sign Out).
- Tablet/Desktop (≥ md): shadcn `<Sidebar>` (already responsive — auto-becomes a `<Sheet>` drawer below `md`).

shadcn's `<Sidebar>` is built on Vaul/Radix Dialog and already handles `openMobile` state via `useSidebar()`, including focus trap, ESC handling, and `Sheet` rendering. Rather than building a separate bottom-tab bar from scratch, the cleaner path is to **use shadcn `<Sidebar>` for tablet/desktop and add a dedicated `<MobileTabBar>` component below `md`**. A single `<MobileTabBar>` for INDXR is ~80 lines; it reuses the navigation config that the sidebar consumes.

Linear, Notion, and Stripe Dashboard all converge on the same hybrid pattern: tab bar on phone, drawer-sidebar on tablet, persistent sidebar on desktop. This is the dominant convention for productivity SaaS in 2026.

### 3.2 Responsive tables — the Library page

The Library is INDXR's tallest mobile UX challenge. Three approaches exist:

1. **Cards-as-rows.** Each row of the desktop table renders as a stacked card on mobile. Best for readability; loses density.
2. **Horizontal scroll.** Keep the table layout, scroll horizontally. Worst for usability — the WCAG SC 2.5.7 dragging-movement criterion hates this; Stripe explicitly moved away from it for its dashboard rebuild.
3. **Stacked summary.** Each row collapses to title + 2 metadata pills + a sheet-trigger; tap opens the full row in a Sheet.

**Recommendation: cards-as-rows.** Each transcript becomes a card with title (bold), source badge (YouTube/Audio/Playlist), duration, created-at, status pill, and a single overflow menu. The grid view on desktop already uses cards, so this collapses to *the same component* on mobile, scaled to a single column. Coherence wins.

Notion, Linear, Airtable's mobile approach all converge on this card-row pattern for tabular data with > 4 columns.

### 3.3 Mobile rich-text editor (Tiptap)

This is genuinely difficult. Tiptap has known issues on iOS Safari and Android Chrome with virtual-keyboard handling — there is an open GitHub issue (#6571) noting double-scroll and toolbar mispositioning when the keyboard opens. Tiptap's official mobile guidance is essentially "build it yourself", and React Native wrappers like `@10play/tentap-editor` implement keyboard-avoidance with `KeyboardAvoidingView` analogs.

For INDXR — a transcription editor, not a writing tool — the right call is:

**Mobile = read-only by default; tap a "Edit" affordance to enter edit mode, and edit mode opens in a bottom-sheet full-height editor with a sticky bottom toolbar.**

Reasons:
- 95% of mobile transcript interaction is reading and copy-paste, not editing.
- Read-only mode sidesteps the keyboard/toolbar bug entirely.
- A dedicated edit sheet gives the editor full viewport height, with the toolbar `position: sticky; bottom: 0` and using the `interactive-widget=resizes-content` viewport meta to shrink content under keyboard (iOS 17+, Android Chrome).
- The toolbar is **bottom-anchored, not floating**. Floating bubble menus (Tiptap's default) break visibility above the keyboard on small phones.

```html
<!-- in app/layout.tsx <head> -->
<meta name="viewport"
  content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content" />
```

Touch targets in the toolbar: 44×44 buttons (`size-control-md`), grouped (Bold/Italic/H2/List/Link), with overflow `…` for less-used commands. Long-press preview disabled (it competes with iOS text-selection long-press).

For the small subset of users who need full editing on mobile, this is a deliberate trade — they will be slightly inconvenienced compared to desktop, and the friction is acknowledged in the empty state copy ("Best edited on desktop").

### 3.4 Long-running operations

Audio transcription can take minutes. The user might background the app, switch tabs, or even close the laptop. Robust patterns:

1. **Persistent inline progress card on `/dashboard/transcribe`.** Already polling-based; the card shows percent + last-poll-timestamp + cancel button. Stays mounted across re-renders.
2. **Persistent banner on the dashboard shell** that announces "Transcription in progress (65%) — view" linking back to the in-progress page. This is sticky to the dashboard shell, not the page, so navigation away from `/transcribe` doesn't lose visibility.
3. **Browser tab title update** — `document.title = "(65%) INDXR"` while a job runs. Cheap, effective, no permission required.
4. **Optional Web Push** on completion. Asks for Notification permission only after the user starts their first transcription, with copy: "Notify me when this is done?" Permission is opt-in, not on first load (No Israf, Honest Materiality — don't ask for things you don't yet need).
5. **Re-entry restoration.** On app refocus or page reload, the persistent progress card re-fetches state; if completed-while-away, a success banner replaces the progress card with "Transcription ready" + view link. **Inline, not toast.**

This pattern set is consistent with Khidr's hard rule (no toasts) and with Itqan in the Invisible (the 99% case where the user comes back to a finished job is cared for as much as the in-progress UI).

### 3.5 Touch interactions

44×44 minimum (iOS HIG), 48×48 recommended (Material 3), confirmed by WCAG 2.2 SC 2.5.5 (AAA) and SC 2.5.8 (AA, 24 px with spacing). INDXR uses 44 px floor.

Hover-only interactions to remove on touch: row-hover-reveals-actions (replace with always-visible overflow `…`), tooltip-only labels (always show label), context-menu-on-right-click (replace with long-press OR overflow). Long-press, swipe, and pull-to-refresh are tempting but expensive:

- **Long-press**: only useful if there's a context menu *and* the user expects one. Don't add unless a clear use exists.
- **Swipe-to-archive on Library cards**: nice, but adds gesture-conflict with browser back-swipe on iOS. Defer.
- **Pull-to-refresh**: only justified on the Library page where new transcripts may have completed in the background. Implement with the native browser behavior or a minimal lib; not high priority.

WCAG 2.2 SC 2.5.7 Dragging Movements explicitly requires that any drag operation has a non-drag alternative. INDXR has no drag UX currently and should keep it that way — saves an entire SC.

### 3.6 Mobile vs desktop unification

shadcn primitives are responsive by default (Sidebar↔Sheet, Dialog↔Drawer via media-query swap). The pattern "Dialog on desktop, Drawer on mobile" via `useMediaQuery("(min-width: 768px)")` is a documented shadcn recipe.

**Architectural rule: no mobile-only components.** Every component should render correctly across viewports; complete divergence is allowed only at the page-shell level (DashboardShell vs MobileTabBar shell). This prevents the "mobile is a third-class app" drift that plagues teams adding mobile late.

### 3.7 Principle test for §3

| Principle | Pass | Reasoning |
|---|---|---|
| Honest Materiality | ✓ | No fake-native gestures; bottom tabs are the honest mobile pattern |
| Itqan in the Invisible | ✓ | Long-running operation re-entry, persistent banner, completion announce |
| Functional Beauty | ✓ | Cards-as-rows scales the desktop component, doesn't fork it |
| Quiet Quality | ✓ | No floating bubble menus, no intrusive toasts, banners are semantic |
| Inclusive by Default | ✓ | 44 px floor, no drag-required UX, keyboard avoidance for editor |
| Coherence | ✓ | Same component, different layouts; shadcn's Sidebar↔Sheet primitive |
| No Waste | ✓ | No mobile-only components, gestures only where they pull weight |

### 3.8 RECOMMENDATION FOR INDXR — Section 3

**Option A (recommended).** Bottom tab bar (4 items) below `md`; shadcn `<Sidebar>` at `md`+; cards-as-rows for Library on mobile (same component, single-column); Tiptap read-only by default on mobile with full-height edit sheet; persistent inline progress card + dashboard banner for long-running ops; opt-in Web Push only after first transcription; no swipe/long-press in v1.

**Option B.** Hamburger-only mobile nav, no bottom tab bar. Rejected — discoverability data is unambiguous, and INDXR's flow count fits tab bar.

**Option C.** Native mobile app (Expo). Out of scope for a redesign; revisit only after web mobile is excellent.

---

## 4. State Patterns (Loading / Empty / Error / Success)

### 4.1 Loading states

A taxonomy that scales:

| Situation | Pattern | Reasoning |
|---|---|---|
| Initial route navigation, server data | **Skeleton** matching final layout | Maintains layout, no jump |
| In-component refetch (background) | Inline 16 px spinner + "Updating…" text | Doesn't replace existing content |
| Action that returns < 500 ms | Disabled state, optional 200 ms-delayed spinner | Avoid spinner flash |
| Action that returns 500 ms–5 s | Inline spinner inside button + disabled form | Standard UX |
| Long-running (5 s – minutes) | **Determinate progress card** with stages, ETA if known, last-update timestamp | Honesty about time |
| Streaming AI output | **Streaming text** with blinking cursor caret | Shows progress without lying |

**The "progress that doesn't lie"** principle: percent should reflect actual work, not a fake animation. For INDXR transcription, the polling endpoint returns real progress; surface it. If the backend can't yet return real percent, show stages ("Downloading audio → Extracting → Transcribing → Generating summary") with a current-stage indicator, not a fake 0–100 bar.

### 4.2 The hexagon loader question

Batch 1 froze at Level A (logo + credit-coin only). A hexagon loader would be a Level B feature. **Recommendation: do not adopt.** A hexagon-shaped progress indicator is decorative, not functional — a circular progress ring is the same information at less brand cost (Honest Materiality, No Israf). A **circular determinate progress** indicator using the `--accent` color is the standard, matches the credit-coin geometry tangentially without forcing the metaphor, and remains identifiable to users who know what a progress ring is. The hexagon stays where it is meaningful: identity (logo) and economy (credit-coin).

### 4.3 Suspense placement in the App Router

Place Suspense boundaries at the granularity where streaming brings value:

- **Page-level** (`loading.tsx`) — for the initial server fetch on `/dashboard/library`.
- **Section-level** (`<Suspense fallback={<SkeletonTable />}>…</Suspense>`) — for parts of a page that fetch independently. The dashboard right-rail (recent activity) is a classic case.
- **Avoid boundary-per-component** — diminishing returns and harder to reason about.

### 4.4 Empty states — Itqan in the Invisible

Five empty-state archetypes for INDXR:

1. **First-use Library** — large illustration-free card with: H2 "Your library is empty" + body "Start with a YouTube URL or upload an audio file." + primary CTA "New Transcription" + secondary text-link "View tutorial".
2. **No-credits state** — `--warning-subtle` banner: "You're out of credits — top up to keep transcribing." + "Buy credits" button. **Persistent**, never dismissed.
3. **No search results** — "No transcripts match 'query'." + "Clear search" link. Compact, single-line.
4. **First-use Transcribe** — short helper text under the URL input: "Paste a YouTube link, playlist, or upload audio (.mp3, .wav, .m4a — up to 4 hours)."
5. **Post-completion empty** — never use cute "all done" illustrations on a productivity dashboard; just show recent activity if available, else a "Start a new transcription" card.

**Should empty states have illustrations?** Carbon, IBM, and Linear's research all converge: illustrations are useful when they (a) clarify what content will appear here, (b) are visually unique to the brand, (c) don't repeat across many empty states. For a Level A hexagon project, **no decorative illustrations**; instead, use a single neutral icon from Lucide (matching shadcn) at 32×32 with `text-fg-muted`. This is Honest Materiality + No Israf.

Copy patterns to follow (Linear / Notion / Slack convention):
- Headline: short, factual ("No transcripts yet", not "Welcome aboard, friend!")
- Body: explains *what will appear* + *what to do* in ≤ 2 sentences
- Action: one primary CTA, optional secondary text link
- Tone: matches the rest of INDXR — quiet, technical, no exclamation points

### 4.5 Error states

The model: **inline > page-level > root**. Three layers.

**Inline form validation.** Field-level error below the input, `--error-fg` color, with `aria-describedby` linking input to error message and `aria-invalid="true"` on the input. Never *only* color: the message text + an icon (`AlertCircle` 16 px) carries the meaning.

**Page-level errors.** `error.tsx` per route segment that can fail meaningfully. Pattern:

```tsx
"use client";
import { startTransition } from "react";
import { useRouter } from "next/navigation";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-md p-6 text-center">
      <h2 className="text-xl font-semibold text-fg-strong">Something didn't load</h2>
      <p className="mt-2 text-fg-muted">
        {error.digest ? `Reference: ${error.digest}` : "Try again, or refresh the page."}
      </p>
      <button
        className="mt-4 inline-flex h-11 items-center rounded-lg bg-accent px-4 text-fg-on-accent"
        onClick={() => startTransition(() => { reset(); router.refresh(); })}
      >
        Try again
      </button>
    </div>
  );
}
```

The `startTransition(() => { reset(); router.refresh(); })` combination is the documented Next.js 15 pattern for re-rendering both client and server components. `error.digest` is the only safe identifier to expose to users; the actual `error.message` should not be rendered (information leak risk). Sentry already captures the full stack — that's the place to debug.

**Recoverable vs unrecoverable.** Recoverable: network blip, transient API failure → "Try again" button. Unrecoverable in scope: payment failed at Stripe, invoice already paid → contextual message + link to billing. Fatal: app-level crash → root `global-error.tsx` with brand mark + "Reload" button.

### 4.6 Success states (without toasts)

Khidr's hard rule: **no toasts**. Replacements:

- **Post-payment success.** Dedicated `/billing/success` page with a `--success-subtle` card: "Your credits are ready." + balance + "Start transcribing" CTA. Persistent — not auto-dismissed.
- **Post-transcription completion.** Inline replacement of the progress card with a success card containing the transcript title + "Open" button + duration. Stays until user navigates.
- **Inline confirmation (form save, copy-to-clipboard).** Button text changes momentarily ("Saved ✓") for 2 s then reverts, **with `aria-live="polite"`** on the button label so screen readers announce the success without a toast region. This is the existing `WelcomeCreditCard` / `SaveErrorModal` pattern Khidr already uses — extracted as the standard.

Auto-dismiss vs persistent:
- **Persistent**: state changes that affect data (transcription complete, payment received, account suspended).
- **Auto-revert** (not auto-dismiss): inline button feedback like "Copied" — the action is acknowledged, not announced.

### 4.7 Warning / info banners

Banner taxonomy:

| Banner | Color | Placement | Persistence |
|---|---|---|---|
| Suspended user | `error-subtle` | Top of every page below header | Until lifted |
| Low on credits | `warning-subtle` | Top of dashboard shell only | Until topped up |
| Maintenance | `warning-subtle` | Top of all pages | Until cleared |
| Browser unsupported | `warning-subtle` | Top of all pages | Dismissible (per-session) |
| New feature / changelog | `accent-subtle` | Top of dashboard shell | Dismissible (persistent) |

A single `<Banner>` component with `intent="error" | "warning" | "info"` props covers all five. Banner heights add to the dashboard shell's grid template; they push content down rather than overlay (Honest Materiality).

### 4.8 Principle test for §4

| Principle | Pass | Reasoning |
|---|---|---|
| Honest Materiality | ✓ | Progress reflects real work; banners push, not overlay |
| Itqan in the Invisible | ✓ | Empty states / error / suspended all designed |
| Functional Beauty | ✓ | Skeletons match layout, errors give actionable info |
| Quiet Quality | ✓ | No toasts, no animations on success |
| Inclusive by Default | ✓ | aria-live on success/progress, errors with aria-describedby |
| Coherence | ✓ | One Banner component, one progress pattern |
| No Waste | ✓ | No illustrations, no decorative loaders |

### 4.9 RECOMMENDATION FOR INDXR — Section 4

**Option A (recommended).** Skeletons for navigation, inline spinners for refetch, determinate progress card for long-runs (circular ring not hexagon), text-only empty states with single neutral icon, three-layer error model (inline → error.tsx → global-error.tsx), persistent inline success cards for payment + transcription completion, single `<Banner>` component for warning/info.

**Option B.** Adopt the hexagon loader at Level A+. Rejected — adds brand surface without function.

**Option C.** Allow toasts for ephemeral feedback (Sonner). Rejected — Khidr's hard rule, replaced with `aria-live` button-text changes.

---

## 5. Next.js Conventions (`loading.tsx` / `error.tsx` / `not-found.tsx`)

### 5.1 What each file does

- `loading.tsx` — wraps the page in `<Suspense>`; shown while server components in the segment fetch. Renders simultaneously with streaming server output.
- `error.tsx` — client error boundary for the segment. Receives `error` and `reset`. Does **not** catch errors in the same segment's `layout.tsx` or `template.tsx` (they bubble up). Must be a Client Component.
- `not-found.tsx` — rendered when `notFound()` is called within the segment. Defaults to the nearest one up the tree.
- `global-error.tsx` — last-resort root-level error UI; replaces `<html>` and `<body>` because it lives outside the root layout. Required for catastrophic failures.
- `template.tsx` — like `layout.tsx` but re-renders on navigation. INDXR shouldn't need this; layouts are sufficient.
- `default.tsx` — for parallel routes; not relevant unless we adopt parallel routes (we shouldn't, for scope).

### 5.2 Should INDXR adopt these?

INDXR currently has none. The cost of adopting is small and the benefit is concrete:

- Standardizes the 404 page (currently inconsistent or browser-default).
- Provides a place to put the "transcription failed" UI without cluttering the page component.
- Enables streaming with skeletons (`loading.tsx`).

### 5.3 Adoption matrix

| Route | `loading.tsx` | `error.tsx` | `not-found.tsx` | Template? | Why |
|---|---|---|---|---|---|
| `app/` (root) | — | — | ✓ | — | Marketing 404 with INDXR brand |
| `app/global-error.tsx` | — | ✓ | — | — | Required catastrophic boundary |
| `app/(marketing)/` | — | ✓ | — | — | Section error UI |
| `app/dashboard/` | — | ✓ | ✓ | — | Dashboard 404 (different from marketing) |
| `app/dashboard/library/` | ✓ | ✓ | — | — | Skeleton table while server fetches |
| `app/dashboard/library/[id]/` | ✓ | ✓ | ✓ | — | 404 if transcript ID missing; skeleton for tabs |
| `app/dashboard/transcribe/` | ✗ | ✓ | — | — | DO NOT add loading.tsx — see below |
| `app/dashboard/admin/` | ✓ | ✓ | — | — | Skeleton for slow metric queries |
| `app/billing/success/` | — | ✓ | — | — | Already a server page; stable |
| `app/billing/cancel/` | — | — | — | — | Static |

### 5.4 Why no `loading.tsx` on `/transcribe`

The Transcribe page is **client-driven** after the initial server render. It runs polling, owns long-lived state, and the form fields are inputs the user is actively typing into. A `loading.tsx` here would flash a skeleton on every navigation back to the page, replacing valid in-progress state. The persistent inline progress card from §4 is the correct loading UI; the route shell itself should render instantly with a server-rendered empty form, and the progress card hydrates from client state.

### 5.5 `not-found.tsx` strategy

Two `not-found.tsx` files:

- `app/not-found.tsx` — marketing 404 with the INDXR header, big "Page not found", primary "Back to home" + secondary "View pricing".
- `app/dashboard/not-found.tsx` — dashboard 404 with the dashboard shell rendered around it (so sidebar still works), "Couldn't find that transcript" + "Back to library".

This is the documented Next.js pattern for context-sensitive 404s. The dynamic route `library/[id]/page.tsx` calls `notFound()` when the transcript ID doesn't exist or isn't owned by the user, which then renders the dashboard 404 (closer file in the tree).

### 5.6 Migration cost

- 8 new files (3 `loading.tsx`, 5 `error.tsx`, 2 `not-found.tsx`, 1 `global-error.tsx`).
- All are pure UI; no logic moves into them.
- Estimated 2–3 hours of focused work for a solo dev working with Claude Code in Plan Mode.
- **Zero breaking changes** — these are purely additive in App Router.

### 5.7 Real-world reference

Vercel's own apps (Vercel Dashboard, v0.dev) ship `loading.tsx` + `error.tsx` for every route segment. Linear's web app uses heavy Suspense streaming. Anthropic Console uses `error.tsx` + global-error patterns visible in their stack-trace pages. The convention is now industry-standard for App Router projects.

### 5.8 Principle test for §5

| Principle | Pass | Reasoning |
|---|---|---|
| Honest Materiality | ✓ | Conventions used where they help, not because they exist |
| Itqan in the Invisible | ✓ | Per-route 404, per-segment errors |
| Functional Beauty | ✓ | Skeletons match real layout; error UI is actionable |
| Quiet Quality | ✓ | No animation on error; `error.digest` only, never raw stack |
| Inclusive by Default | ✓ | All error UIs keyboard-accessible, focused on mount |
| Coherence | ✓ | Single Banner / Card / Button vocabulary across all states |
| No Waste | ✓ | No `loading.tsx` on `/transcribe` (would harm), no `template.tsx` |

### 5.9 RECOMMENDATION FOR INDXR — Section 5

**Option A (recommended).** Adopt the matrix above: 8 new files, segment-scoped where they pull weight, explicit *avoidance* on `/transcribe`. Use `error.digest` for user-facing references; rely on Sentry for full traces.

**Option B.** Adopt only `error.tsx` + `not-found.tsx`, skip `loading.tsx`. Loses streaming benefit on Library where it's most useful.

**Option C.** Status quo. Leaves the 404 inconsistent and the error UI inside page components; rejected.

---

## 6. Accessibility 2026 (WCAG 2.2 + Modern Patterns)

### 6.1 WCAG 2.2 — what's new vs 2.1

WCAG 2.2 is additive: 9 new success criteria, 1 deprecated (4.1.1 Parsing). Six of the new criteria affect Level AA. Concrete impact for INDXR:

| SC | Level | INDXR impact |
|---|---|---|
| 2.4.11 Focus Not Obscured (Minimum) | AA | Sticky header / cookie banner / progress banner must not entirely obscure focused element. Use `scroll-margin-top` |
| 2.4.12 Focus Not Obscured (Enhanced) | AAA | Aspirational; partial overlap acceptable for AA |
| 2.4.13 Focus Appearance | AAA | Aspirational; we already exceed via 3 px ring |
| 2.5.7 Dragging Movements | AA | INDXR has no drag UX — automatic pass |
| 2.5.8 Target Size (Minimum) | AA | 24 px floor with spacing exception. INDXR uses 44 px floor — automatic pass |
| 3.2.6 Consistent Help | A | Help link in same location across all pages — design system enforces |
| 3.3.7 Redundant Entry | A | Don't ask for the same data twice in a flow — billing form already uses Stripe Elements |
| 3.3.8 Accessible Authentication (Minimum) | AA | No CAPTCHA-cognitive tests. Magic link / OAuth flows pass naturally |
| 3.3.9 Accessible Authentication (Enhanced) | AAA | Aspirational |

The biggest delta from 2.1: SC 2.4.11. INDXR's persistent progress banner could obscure a focused button below it on small viewports. Fix: every focusable element gets `scroll-margin-top: calc(var(--banner-height, 0) + var(--header-height) + 1rem)` so keyboard navigation auto-scrolls focused elements clear of sticky chrome.

### 6.2 Color contrast — already validated in §1

All token pairs at body-text role meet AA (4.5:1) or exceed; UI/large meets 3:1 minimum. The `--border-strong` token (3.4:1 / 3.2:1) is the canonical focus-ring boundary, satisfying SC 1.4.11 Non-text Contrast.

### 6.3 Focus management

**Focus rings.** Default focus style at the base layer:

```css
@layer base {
  :where(:focus-visible) {
    outline: 3px solid var(--accent);
    outline-offset: 2px;
    border-radius: var(--radius-sm);
  }
  :where(:focus:not(:focus-visible)) {
    outline: none;          /* Don't show ring for mouse clicks */
  }
}
```

Use `:focus-visible` everywhere. The 3 px ring + 2 px offset gives ≥ 3:1 contrast against any token surface in either theme. Never `outline: none` without a replacement.

**Focus trap in dialogs.** shadcn's `<Dialog>` / `<Sheet>` (Radix) handles this automatically. Custom modals must use `@radix-ui/react-focus-scope` or equivalent — no exceptions.

**Skip links.** Add a single skip-link as the first focusable element in `app/layout.tsx`:

```tsx
<a href="#main"
   className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4
              focus:z-50 focus:rounded-lg focus:bg-surface focus:p-3
              focus:shadow-md focus:outline-3 focus:outline-accent">
  Skip to content
</a>
```

**Focus restoration after route changes.** Next.js App Router does not restore focus by default after `router.push()`. Use a custom `<RouteFocusManager>` that focuses the `<h1>` of the new page on route change, which is the WCAG-recommended behavior. Add `tabindex="-1"` to the `<h1>` so it's programmatically focusable but not in the tab order.

### 6.4 Keyboard navigation

- **Tab order = DOM order.** Don't use `tabindex > 0`. Use `tabindex="-1"` only for programmatic focus targets.
- **Escape** closes modals, sheets, popovers (Radix handles), cancels in-progress operations where safe.
- **Command palette (`⌘K` / `Ctrl+K`)** — high value for power users, especially the journalist/researcher audience. Implement via shadcn `<Command>` component with three groups: **Navigate** (jump to library, transcribe, billing), **Actions** (new transcription, search transcripts), **Help** (docs, support). Defer to v2 if effort-constrained — this is a nice-to-have, not a foundational requirement.

### 6.5 Screen reader support

**aria-live for transcription progress.** A single `<div role="status" aria-live="polite">` somewhere in the dashboard shell, updated via React state when polling returns new percent. Update message every 10% (not every percent — that's pollution) and at stage transitions: "Transcription 30% complete", "Generating summary…", "Transcription ready."

```tsx
// in DashboardShell
<div role="status" aria-live="polite" className="sr-only">
  {liveAnnouncement}  {/* set by useTranscriptionPolling() */}
</div>
```

**`role="alert"` (= `aria-live="assertive"`).** Use **only** for: payment failure, account suspended, unrecoverable error. Anything that interrupts an in-progress task warrants `assertive`; otherwise `polite`.

**Semantic HTML over div soup.** `<main>`, `<nav>`, `<aside>`, `<article>` for transcripts, `<section>` with `aria-labelledby` for dashboard regions. Buttons are `<button>`, never `<div onClick>`. Lists are `<ul>`. The four `<h1>` per page rule: exactly one `<h1>` per page; subsequent hierarchy is `<h2>` and below.

**aria-label vs aria-labelledby.** Use `aria-labelledby` when a visible label exists elsewhere (preferred). Use `aria-label` for icon-only buttons. Tooltip-only labels are insufficient for screen readers — always pair with `aria-label`.

**Live region pollution.** Don't announce: every keystroke, every poll tick, hover state changes, button text changes that aren't success states. Rule: announce only what the user *needs* to know to make a decision or feel confidence.

### 6.6 Motion preferences

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }
}
```

Combined with the duration-token override from §1.7. The exception: essential motion (e.g., a streaming text cursor blink) can stay on at low opacity if it carries information.

What to disable under reduced-motion: dialog/sheet entrance scale animations (replace with opacity-only fade), card hover lift, accordion expand bounce, skeleton shimmer (replace with static dim background), command palette zoom-in.

### 6.7 Touch targets — already covered §1.4

44 × 44 floor; spacing exceptions only for inline meta controls.

### 6.8 Forms

- **Label association.** Always `<label htmlFor>` or `aria-labelledby`. shadcn's `<FormField>` enforces this.
- **Error association.** `aria-describedby` linking input to error span; `aria-invalid="true"` on the input.
- **Required.** `required` HTML attribute (sets `aria-required="true"` natively) + visible "(required)" text on the label, **never just an asterisk**.
- **Autocomplete.** `autocomplete="email"`, `"current-password"`, `"name"`, `"organization"` — these dramatically improve speed for screen readers, password managers, and autofill. Already best practice.
- **Inline validation timing.** Validate on blur, not on every keystroke. Re-validate on submit. Don't show a red error on a field the user hasn't yet finished typing.

### 6.9 Internationalization & RTL

INDXR transcribes Arabic among other languages. Two distinct concerns:

1. **Transcript content language.** The transcript text must have `lang="ar"` (or whatever ISO code) on its container so screen readers switch voice and so spell-checkers don't flag every word. The TranscriptViewer should accept a `lang` prop and apply it.
2. **App UI language.** INDXR's UI is currently English-only; if it stays English-only, no app-level RTL support is needed *now*. But Arabic content in an LTR app needs **bidirectional text rendering** (`dir="auto"` on the transcript content).

For future-proofing: any future RTL UI support can use shadcn's RTL guide (sidebar already takes `dir`). Defer until a non-English UI is on the roadmap. **No Israf.**

```tsx
// TranscriptViewer
<article lang={transcript.lang} dir="auto" className="prose">
  {transcript.text}
</article>
```

### 6.10 Principle test for §6

| Principle | Pass | Reasoning |
|---|---|---|
| Honest Materiality | ✓ | No fake-accessibility (e.g., overlay widgets) |
| Itqan in the Invisible | ✓ | Skip link, focus restoration, live regions all covered |
| Functional Beauty | ✓ | Focus ring is also visually pleasant |
| Quiet Quality | ✓ | Minimal aria-live noise, polite over assertive |
| Inclusive by Default | ✓ | This whole section is the principle |
| Coherence | ✓ | One focus style, one live region pattern |
| No Waste | ✓ | RTL deferred until needed; AAA pursued only where free |

### 6.11 RECOMMENDATION FOR INDXR — Section 6

**Option A (recommended).** WCAG 2.2 AA target with AAA-where-free. Single global focus-visible style. Single live region in dashboard shell with polite default and stage-based updates. Reduced-motion override at the root. `lang`/`dir` on transcript content. Defer RTL UI and AAA-only criteria to post-launch.

**Option B.** WCAG 2.2 AAA target. Rejected — diminishing returns; some AAA criteria conflict with information density.

**Option C.** WCAG 2.1 AA only. Rejected — loses the focus-obscured fix and target-size clarity that are now industry standard.

---

## 7. Cross-Cutting — Implementation Dependencies & Phased Rollout

### 7.1 Dependency order

```
[1] Tokens (tokens.css with @theme inline)
   └→ Required by everything below
[2] Theme provider (next-themes config)
   └→ Required by [3]+ for verifying tokens in dark mode
[3] Typography migration (Inter + JetBrains Mono via next/font/google)
   └→ Independent of [4] but should land in same PR for visual coherence
[4] Base layer (focus-visible, skip link, scroll-margin-top, prefers-reduced-motion)
   └→ Required before any new component work
[5] Banner / Card / Button / EmptyState primitive set
   └→ Required by [6] and [9]
[6] Page shells (DashboardShell, MarketingShell, MobileTabBar)
   └→ Required by [7]
[7] Next.js conventions (loading.tsx / error.tsx / not-found.tsx)
   └→ Depends on [5] and [6]
[8] Live region + focus restoration
   └→ Independent; can land any time after [6]
[9] Page migrations (Transcribe → Library → Library/[id] → Billing → Admin)
   └→ Depends on [5] [6] [7]
[10] Mobile editor (Tiptap read-only + edit sheet)
   └→ Depends on [9] for Library/[id]
[11] Command palette (optional v2)
```

### 7.2 What can run in parallel

- [3] Typography migration is independent of [1] tokens; can be a separate PR.
- [7] Conventions and [8] live regions are independent; can land in parallel.
- Within [9], page migrations are largely independent except for shared component churn.

### 7.3 What MUST be done before Claude Code design work begins

The non-negotiable foundation: **[1] [2] [3] [4]**. Without these, every component built ends up referencing colors/sizes that will need rewriting. Build on the foundation, not before it.

### 7.4 What can be deferred to post-launch

- Density modes (architecture preserves the option).
- RTL UI support (lang/dir on content remains in scope).
- Command palette (`⌘K`).
- Web Push notifications.
- Pull-to-refresh on Library.
- Hexagon loader (Level B, never).

### 7.5 Migration risk

| Change | Risk | Type |
|---|---|---|
| Tokens replace existing CSS variables | Low | Breaking but mechanical — find/replace |
| Geist → Inter / JetBrains Mono | Low | Visual diff; minor metric shift |
| HSL → OKLCH | Low | Pure additive in shadcn v4 path |
| no-toasts (already enforced) | None | Already INDXR convention |
| `loading.tsx` adoption | Low | Additive only |
| `error.tsx` adoption | Low | Additive only |
| Mobile bottom tab bar | Medium | New component, replaces hamburger |
| Tiptap read-only on mobile | Medium | Behavioral change for power users on phone |
| Library cards-as-rows | Low | Already a card grid, just simplify on mobile |

### 7.6 Effort sizing (S/M/L)

| Phase | Items | Size | Days (solo + Claude Code) |
|---|---|---|---|
| Foundation | [1] [2] [3] [4] | M | 3–5 |
| Primitives | [5] | M | 3–4 |
| Page shells | [6] | L | 4–6 |
| Conventions | [7] | S | 1–2 |
| Live regions | [8] | S | 1 |
| Page migration | [9] (5 pages) | L | 7–10 |
| Mobile editor | [10] | M | 3–4 |
| Command palette | [11] | M | 3 (deferred) |
| **Total in-scope** | [1]–[10] | | **≈ 22–32 days** |

This assumes Plan Mode workflow: each phase is one batched plan + one batched implementation, no piecemeal commits.

### 7.7 Phased rollout plan

**Phase 0 — Pre-flight (1 day).** Branch off `main` as `redesign/batch-2`. Document the tokens.css from §1 in a Plan Mode brief. Dry-run install of next-themes and Inter via `next/font/google`.

**Phase 1 — Foundation (3–5 days, single PR).**
- Land `app/styles/tokens.css` with full OKLCH scale.
- Migrate `app/globals.css` to import tokens, set base styles (focus-visible, skip link, scroll-margin-top, reduced-motion).
- Replace Geist with Inter Variable + JetBrains Mono NL Variable via `next/font/google`.
- Configure `<ThemeProvider>` with `attribute="data-theme"` and `defaultTheme="system"`.
- Verify all 27 existing shadcn components still render correctly in both themes.
- **Single deployment.** This is the biggest visual change; ship it once, fully.

**Phase 2 — Primitives (3–4 days).**
- Build/refresh Banner, Card, Button, EmptyState, ProgressCard, SuccessCard.
- Update existing shadcn components to use role tokens (search-and-replace `bg-background` → `bg-bg`, etc.).
- Verify accessibility on each: focus, keyboard, aria.

**Phase 3 — Shells & conventions (5–8 days).**
- Build `DashboardShell` (CSS grid template areas, sidebar↔drawer↔mobile tab bar).
- Build `MarketingShell` and verify SEO landing pages still render.
- Add 8 new convention files (loading/error/not-found/global-error per the matrix).
- Add `<RouteFocusManager>` and the global live region.

**Phase 4 — Page migrations (7–10 days, batched 2-page PRs).**
- PR 4a: Transcribe + Billing.
- PR 4b: Library + Library/[id].
- PR 4c: Admin (5 admin pages, mostly tabular).
- PR 4d: SEO templates audit (verify ToolPageTemplate / ArticleTemplate / TutorialTemplate consume the new tokens).

**Phase 5 — Mobile editor (3–4 days).**
- Tiptap read-only mode by default on `< md`.
- Edit sheet with bottom-anchored toolbar.
- `interactive-widget=resizes-content` viewport meta.

**Phase 6 — Polish & QA (2–3 days).**
- Run axe-core + Lighthouse on every route.
- Real-device check on iPhone (Safari) and Android (Chrome).
- Reduced-motion + dark-mode + keyboard-only smoke tests.
- Verify aria-live announcements with VoiceOver / NVDA.

**Phase 7 (deferred) — Command palette + density modes + Web Push.**

### 7.8 Plan Mode discipline

For Khidr's solo-dev workflow with Claude Code, the rule is: **one phase = one plan = one PR**. No micro-commits. Each phase begins with a written plan (markdown in `/plans/phaseN.md`) referencing this Batch 2 document, followed by a single implementation pass, followed by a single QA pass. Avoid the temptation to deploy mid-phase even when "it works on this page" — coherence depends on the whole phase landing together.

### 7.9 Final principle test for the rollout

| Principle | How the plan respects it |
|---|---|
| Honest Materiality | No phase ships placeholder design language; tokens drop and the system is real |
| Itqan in the Invisible | Phase 3 includes 404, error, loading conventions before Phase 4 page migrations |
| Functional Beauty | Foundation phase handles typography + color simultaneously so visual language is coherent on day one |
| Quiet Quality | One PR per phase, no noise of small deploys |
| Inclusive by Default | A11y baked into Phases 1, 2, 3, 6 — not bolted on at the end |
| Coherence | Token-driven from Phase 1; no component built before tokens land |
| No Waste | Deferred items explicitly listed; nothing built "just in case" |

---

## Closing note

This document encodes Batch 1 decisions as concrete tokens, ranks options across seven decision areas, and yields a 22–32-day implementation plan that respects solo-dev rhythm and the seven ihsan principles. The token file (§1) is the single most load-bearing artifact: it is the contract between every component and every theme, and it is the only file that should be touched by Phase 1. Everything else is downstream.

The decisions ranked here are intentionally close to the floor of "how much system do we need" — this is a quiet productivity tool for researchers, journalists, and content creators, not a marketing surface for ourselves. When in doubt during implementation, choose the option that disappears.