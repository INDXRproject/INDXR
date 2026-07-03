## Conventions

**Wrapping and setup.** No provider or root wrapper is required — components read no React context for theming. Dark mode is driven by a `data-theme="dark"` attribute on an ancestor element (usually `<html>`), not by a context provider: wrap a composition in `<div data-theme="dark">…</div>` to preview the dark variant. `ThemeToggle` and any `next-themes`-backed switching is app wiring, not something the design agent needs to reproduce.

**Styling idiom — Tailwind utility classes over CSS custom properties, never raw hex.** Every component styles itself with Tailwind utilities that resolve to the DS's own OKLCH tokens (bridged via `@theme inline`, e.g. `--color-bg: var(--bg)`). Build with these class families, not generic Tailwind colors (`bg-blue-500` etc. do not exist in this palette):

| Purpose | Classes |
|---|---|
| Backgrounds | `bg-bg`, `bg-bg-subtle`, `bg-surface`, `bg-surface-elevated`, `bg-surface-sunken` |
| Borders | `border-border`, `border-border-subtle`, `border-border-strong` |
| Text | `text-fg`, `text-fg-muted`, `text-fg-subtle`, `text-fg-strong`, `text-fg-on-accent` |
| Accent | `bg-accent`, `bg-accent-hover`, `bg-accent-subtle`, `text-accent`, `border-accent` |
| Status | `bg-error` / `text-error` / `border-error`, `bg-warning`, `bg-success` (each has a `-subtle` and `-fg` variant) |

Fonts are **IBM Plex Sans** (body) and **IBM Plex Mono** (code), loaded at runtime by the host app — not shipped in this bundle (`runtimeFontPrefixes: ["IBM Plex"]`), so previews rendered outside the host app fall back until the family loads.

**Where the truth lives.** Read `styles.css` (imports `_ds_bundle.css`, the compiled Tailwind output with every token and utility actually shipped) before styling anything — it is the definitive list of what classes exist. Per-component API and usage are in each component's own `<Name>.d.ts` and `<Name>.prompt.md`.

**One idiomatic build snippet:**

```tsx
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@indxr/shared'
import { Button } from '@indxr/shared'

<Card className="bg-surface border-border">
  <CardHeader>
    <CardTitle className="text-fg">Upgrade to Pro</CardTitle>
  </CardHeader>
  <CardContent className="text-fg-muted text-sm">
    Get unlimited transcripts and priority processing.
  </CardContent>
  <CardFooter>
    <Button className="bg-accent text-fg-on-accent hover:bg-accent-hover">
      Upgrade
    </Button>
  </CardFooter>
</Card>
```
