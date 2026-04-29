# INDXR Design System

**Versie:** 1.0  
**Status:** Single source of truth voor alle design-implementatie  
**Datum:** April 2026  
**Bron:** Synthese van Batch 1, 2, 3A, 3B research + Khidr's beslissingen

---

## Hoe dit document te gebruiken

Dit is de **compacte beslis-referentie** voor Claude Code en Claude Design tijdens implementatie. Geen onderbouwing, alleen beslissingen. Voor het *waarom* achter een keuze: zie `wiki/design/research/`.

Volg de hiërarchie: principes (§0) bepalen alles, daarna identity (§1), architectuur (§2), IA (§3), UX patterns (§4), beauty layer (§5), implementatie volgorde (§6).

---

## §0 De zeven principes (de meetlat)

Elk design-besluit wordt getoetst aan deze zeven. Bij twijfel: terug naar `wiki/design/principles.md`.

1. **Honest Materiality** — geen valse premium-suggesties, decoratie moet functioneren
2. **Itqan in het Onzichtbare** — empty/error/edge cases krijgen dezelfde zorg als hero
3. **Functional Beauty (Husn)** — functie EN esthetiek samen, niet kaal voor de zekerheid
4. **Quiet Quality** — terughoudend zonder leeg, ondersteunt het werk van de gebruiker
5. **Inclusive by Default** — WCAG 2.2 AA als minimum, niet als doel
6. **Coherence** — één systeem, geen lokale uitzonderingen
7. **Geen Israf** — niets toevoegen zonder reden — *maar* schoonheid die betekenis draagt is functie

**Conflictresolutie:** Geen vaste rangorde. Per geval afwegen, expliciet documenteren in `wiki/design/decisions/`.

---

## §1 Identity Foundation

### Typografie

```css
--font-sans: "IBM Plex Sans Variable", ui-sans-serif, system-ui, sans-serif;
--font-mono: "IBM Plex Mono Variable", ui-monospace, "SF Mono", Menlo, monospace;
```

**Multi-script vereiste:** Latin extended, Cyrillisch, Grieks, Arabisch, Hebreeuws, Devanagari, Thai, CJK — IBM Plex dekt alles natively. Geen fallback-mismatches.

**OpenType features (globaal):** `"calt" 1, "tnum" 1, "zero" 1` (contextuele alternaties, tabular numbers, slashed zero). In transcript prose: override naar `font-variant-numeric: proportional-nums`.

**Type scale:** 1.200 Minor Third, 16px base, 7 sizes.

| Token | px | rem | line-height | Gebruik |
|---|---|---|---|---|
| `text-xs` | 12 | 0.75 | 16/1.333 | timestamps, captions, code chips |
| `text-sm` | 14 | 0.875 | 20/1.428 | secondary text, table cells, form labels |
| `text-base` | 16 | 1 | 24/1.5 | body, default UI |
| `text-lg` | 19 | 1.1875 | 28/1.473 | quote, lead paragraph |
| `text-xl` | 23 | 1.4375 | 32/1.391 | h3 |
| `text-2xl` | 28 | 1.75 | 36/1.286 | h2 |
| `text-3xl` | 33 | 2.0625 | 40/1.212 | h1 |

**Weights:** 400 (Regular body) · 500 (Medium emphasis, buttons, labels) · 600 (Semibold headings). Geen 700+, geen Italic buiten editor.

### Theme

**Default:** `system` met persistent override (System/Light/Dark) via `next-themes`, attribute `data-theme`. Pre-hydration script vereist tegen FOIT.

```tsx
<ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem disableTransitionOnChange>
```

### Color tokens (OKLCH)

**Filosofie:** Warm-getinte neutralen (geen pure grijs) + lage-saturatie amber accent + minimale 3-color semantic set.

**Light theme (`:root`):**
```css
:root {
  --bg: oklch(0.985 0.004 70);
  --bg-subtle: oklch(0.972 0.005 70);
  --surface: oklch(1 0 0);
  --surface-elevated: oklch(0.995 0.003 70);
  --surface-sunken: oklch(0.955 0.006 70);
  --border-subtle: oklch(0.925 0.006 70);
  --border: oklch(0.880 0.008 70);
  --border-strong: oklch(0.780 0.010 70);
  --fg-muted: oklch(0.555 0.010 70);
  --fg-subtle: oklch(0.420 0.012 70);
  --fg: oklch(0.260 0.010 70);
  --fg-strong: oklch(0.165 0.008 70);
  --fg-on-accent: oklch(0.985 0.004 70);
  --accent: oklch(0.720 0.140 75);
  --accent-hover: oklch(0.680 0.145 75);
  --accent-active: oklch(0.620 0.140 75);
  --accent-subtle: oklch(0.955 0.030 80);
  --accent-fg: oklch(0.380 0.090 60);
  --accent-ring: oklch(0.720 0.140 75 / 0.45);
  --success: oklch(0.620 0.140 150);
  --success-subtle: oklch(0.955 0.030 150);
  --success-fg: oklch(0.350 0.080 150);
  --warning: oklch(0.760 0.140 80);
  --warning-subtle: oklch(0.965 0.040 85);
  --warning-fg: oklch(0.420 0.090 65);
  --error: oklch(0.580 0.180 27);
  --error-subtle: oklch(0.960 0.030 25);
  --error-fg: oklch(0.420 0.140 27);
}
```

**Dark theme (`[data-theme="dark"]`):**
```css
[data-theme="dark"] {
  --bg: oklch(0.165 0.008 70);
  --bg-subtle: oklch(0.195 0.009 70);
  --surface: oklch(0.215 0.010 70);
  --surface-elevated: oklch(0.250 0.011 70);
  --surface-sunken: oklch(0.140 0.007 70);
  --border-subtle: oklch(0.275 0.011 70);
  --border: oklch(0.330 0.012 70);
  --border-strong: oklch(0.420 0.013 70);
  --fg-muted: oklch(0.625 0.012 70);
  --fg-subtle: oklch(0.730 0.010 70);
  --fg: oklch(0.880 0.008 70);
  --fg-strong: oklch(0.965 0.006 70);
  --fg-on-accent: oklch(0.165 0.008 70);
  --accent: oklch(0.760 0.150 78);
  --accent-hover: oklch(0.800 0.145 78);
  --accent-active: oklch(0.715 0.150 78);
  --accent-subtle: oklch(0.290 0.060 78);
  --accent-fg: oklch(0.880 0.110 80);
  --accent-ring: oklch(0.760 0.150 78 / 0.55);
  --success: oklch(0.700 0.150 150);
  --success-subtle: oklch(0.290 0.060 150);
  --success-fg: oklch(0.860 0.110 150);
  --warning: oklch(0.800 0.140 80);
  --warning-subtle: oklch(0.310 0.070 80);
  --warning-fg: oklch(0.890 0.100 80);
  --error: oklch(0.680 0.180 27);
  --error-subtle: oklch(0.310 0.080 27);
  --error-fg: oklch(0.880 0.120 27);
}
```

**WCAG validatie:** Body text 4.5:1+ (passes AAA in beide thema's). UI/borders 3:1+. Focus rings 3:1 via `--accent-ring`. Volledige tabel: zie research/batch-2-architecture.md §1.2.

### Hexagon — Level A+

**Logo:** bestaand 7-hexagon honeycomb, behouden. Varianten nodig: full color (32px marketing, 28px sidebar), favicon (single hex outline), watermark (24px @ 0.4 opacity).

**Credit-coin:** custom hexagon SVG, matched aan logo proporties. Functioneel — toont credits in sidebar, library, billing.

**Beauty patterns:** Zie §5 voor surface-by-surface map.

---

## §2 Architecture

### Tailwind v4 + @theme inline

Volledige tokens in `app/styles/tokens.css` met `@theme inline` mapping. Single file. Geen `tailwind.config.js`.

```css
@import "tailwindcss";

@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  /* ...alle role tokens... */
  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
}
```

### Spacing & Layout

**Base:** `--spacing: 0.25rem` (4px). Tailwind `p-1`, `p-2` enz. werken automatisch.

**Strategische scale** (niet elke veelvoud):
- `1` (4px): icon padding
- `2` (8px): button intern, badge padding, icon-text gap
- `3` (12px): compact card padding
- `4` (16px): default card padding, form field gap
- `6` (24px): section gap binnen card
- `8` (32px): page section gap
- `12` (48px): page top padding
- `16` (64px): hero vertical
- `24` (96px): marketing hero, section breaks

**Component sizing:**
```css
--size-control-xs: 1.75rem;  /* 28 - chips */
--size-control-sm: 2.25rem;  /* 36 - secondary buttons */
--size-control-md: 2.75rem;  /* 44 - primary buttons & inputs (WCAG floor) */
--size-control-lg: 3.5rem;   /* 56 - hero CTAs */
--size-row-table: 2.75rem;   /* 44 */
```

**44px is de floor** voor alle interactieve elementen. Geen uitzonderingen behalve inline meta-controls (chips, table-cell icons) met 24px+ spacing tussen.

**Radius:**
```css
--radius-sm: 0.25rem;  /* 4px - chips, badges */
--radius: 0.5rem;      /* 8px - buttons, inputs, cards (default) */
--radius-lg: 0.75rem;  /* 12px - modals, large surfaces */
```

**Breakpoints (4):**
```css
--breakpoint-sm: 40rem;  /* 640 */
--breakpoint-md: 48rem;  /* 768 - sidebar collapseert */
--breakpoint-lg: 64rem;  /* 1024 - desktop layout */
--breakpoint-xl: 80rem;  /* 1280 - max app width */
```

Geen 2xl. Container queries (`@container`) voor componenten gebruikt in meerdere contexten; media queries voor page-level layout.

**Shadows** (warm-getint in light, borders in dark):
```css
:root {
  --shadow-xs: 0 1px 1px oklch(0.20 0.010 70 / 0.04);
  --shadow-sm: 0 1px 2px oklch(0.20 0.010 70 / 0.06), 0 1px 1px oklch(0.20 0.010 70 / 0.04);
  --shadow-md: 0 2px 4px oklch(0.20 0.010 70 / 0.06), 0 4px 8px oklch(0.20 0.010 70 / 0.05);
  --shadow-lg: 0 4px 12px oklch(0.20 0.010 70 / 0.08), 0 12px 24px oklch(0.20 0.010 70 / 0.06);
  --shadow-focus: 0 0 0 3px var(--accent-ring);
}

[data-theme="dark"] {
  --shadow-xs: 0 0 0 1px var(--border-subtle);
  --shadow-sm: 0 0 0 1px var(--border);
  --shadow-md: 0 0 0 1px var(--border-strong);
  --shadow-lg: 0 0 0 1px var(--border-strong), 0 8px 24px oklch(0 0 0 / 0.5);
  --shadow-focus: 0 0 0 3px var(--accent-ring);
}
```

**Motion:**
```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--duration-fast: 120ms;  /* hover, focus */
--duration-base: 200ms;  /* dropdowns, popovers, tabs */
--duration-slow: 320ms;  /* modal/sheet enter */
```

`prefers-reduced-motion` reduceert alles tot 1ms.

### Layout Shells (3)

Drie page-level layouts:
- **DashboardShell** — header + sidebar + main, voor `/dashboard/*`
- **MarketingShell** — centered max-w-3xl, voor `/`, `/pricing`, `/blog/*`
- **DocsShell** — header + sidebar + content, voor `/docs/*`

CSS Grid template areas voor responsive shifts. Geen wrapper componenten (`<Stack>`, `<Cluster>`) — directe Tailwind utilities.

### Next.js Conventions Adoption Matrix

| Route | loading.tsx | error.tsx | not-found.tsx |
|---|---|---|---|
| `app/` (root) | — | — | ✓ marketing 404 |
| `app/global-error.tsx` | — | ✓ | — |
| `app/(marketing)/` | — | ✓ | — |
| `app/dashboard/` | — | ✓ | ✓ dashboard 404 |
| `app/dashboard/library/` | ✓ skeleton | ✓ | — |
| `app/dashboard/library/[id]/` | ✓ skeleton | ✓ | ✓ |
| `app/dashboard/transcribe/` | ✗ (client-driven) | ✓ | — |
| `app/dashboard/admin/` | ✓ | ✓ | — |
| `app/billing/success/` | — | ✓ | — |

**Geen `loading.tsx` op `/dashboard/transcribe`** — client-driven page, polling state, zou flashen bij elke navigatie terug.

`error.digest` exposeren voor user reference, never `error.message` (info leak).

---

## §3 Information Architecture

### Sitemap (final)

**Marketing (unauth, indexed):**
- `/` (homepage met "how it works" visualisaties)
- `/pricing`
- `/docs` umbrella + alle 31 bestaande SEO URLs ongewijzigd
- `/youtube-transcript-generator` (publieke gratis tool)
- `/support` (tweeledig: hulp + feedback)

**Auth:**
- `/login`, `/signup`, `/forgot-password`, `/onboarding` (label: "Welcome"), `/suspended` (label: "Account paused")

**Product (auth, no-index):**
- `/dashboard` (label: "Home")
- `/dashboard/transcribe` (label: "Transcribe")
- `/dashboard/library` (label: "Library")
- `/dashboard/library/[id]`
- `/dashboard/messages` (label: "Messages")
- `/dashboard/billing` + `/success` + `/cancel`
- `/dashboard/account` (identity, billing, security, danger zone)
- `/dashboard/settings` (preferences, notifications, integrations) — *gesplit van Account per Khidr*
- `/admin/*` (unchanged)

**Removed/merged:**
- `/faq` → 301 naar `/docs/faq`
- `/account/credits` → 301 naar `/dashboard/account` (legacy)
- `/how-it-works` → content naar `/` homepage (visualisaties) en `/docs/getting-started` (instructief)

### Navigation

**Marketing top-nav (5 items):**
```
[INDXR logo]   Pricing   Docs   [Try it free]      Log in    Start free
```

"Try it free" linkt naar `/youtube-transcript-generator` (publieke tool). Tekst kan "Probeer gratis" of "Try the tool" worden — finaliseren in werksessie.

**Geen Changelog in marketing nav** (Khidr's beslissing — niet pre-launch bouwen).

**Dashboard sidebar (6 items):**
```
Home
Transcribe
Library
Messages    [unread badge]
Account
Settings
```

Plus persistent credit-coin onderaan (boven user/help row). Geen `?` icoon (geschrapt).

### Post-login Shell Switch

Na inloggen verandert de hele site-experience:
- Marketing top-nav verdwijnt
- Dashboard shell met sidebar wordt primair
- Geen avatar-dropdown om naar dashboard te navigeren — gebruiker landt direct in `/dashboard`
- Logo blijft hetzelfde, in sidebar header

### Naming

| Surface | Label | URL |
|---|---|---|
| Tool action | Transcribe | `/dashboard/transcribe` |
| Library | Library | `/dashboard/library` |
| Dashboard home | Home | `/dashboard` |
| Inbox/Message Center | Messages | `/dashboard/messages` |
| Account | Account | `/dashboard/account` |
| Settings | Settings | `/dashboard/settings` |
| Onboarding | Welcome | `/onboarding` |
| Suspended | Account paused | `/suspended` |
| Public tool | Try it free | `/youtube-transcript-generator` |

**Categorieën in /docs:**
- Getting started
- Transcribe
- Export
- **Workflows** (vervangt "Integrations" — accurater)
- Account
- FAQ

### Voice rules

1. Directe werkwoorden: *Transcribe, Open, Export, Save*
2. Geen Engelse idiomen die niet vertalen
3. Empty states in volzinnen: "Geen transcripts nog — probeer je eerste video te transcriberen"
4. Errors eerlijk over oorzaak en herstel: "We konden deze video niet bereiken — privé of leeftijds-beperkt? [Meer info]"
5. "Index" als rustig thematisch accent in marketing (1-2x). Niet in product UI.

### Support — tweezijdig

`/support` heeft twee duidelijke ingangen:

1. **"Ik heb hulp nodig"** — problemen, bugs, contact
2. **"Ik heb een suggestie"** — feedback, ideeën, complimenten

Beide schrijven naar backend (één catchall `support@indxr.ai`), beide kunnen leiden tot persoonlijk admin-bericht in Messages met optionele credit-grant.

---

## §4 UX Patterns

### Sidebar State Machine

| Breakpoint | Default | Trigger | Persist |
|---|---|---|---|
| `≥ lg` (1024+) | expanded (240px) | toggleert naar icon-rail (64px) | localStorage |
| `md` (768-1023) | icon-rail | toggleert naar overlay expanded | session |
| `< md` | hidden | toggleert naar off-canvas drawer (320px, scrim) | always reset |

**Single trigger:** `Cmd/Ctrl + B` shortcut + `PanelLeft` icon top-left van topbar.  
**Tooltips** vereist op icon-rail state, `delayDuration={500}`.  
**Off-canvas op mobile** = altijd expanded view (rail-on-mobile faalt 44px touch target).

### Mobile Bottom Tab Bar

4 tabs + drawer voor secundair:

```
Home    Transcribe   Library   Messages·badge
 ◐         ◉           ▤            ✉
```

Account + Settings via avatar-tap rechtsboven → drawer slide van rechts.

Tab bar 56px + `safe-area-inset-bottom`. Active state: filled icon + amber label + 2px top border op tab cell.

### Iconen (Lucide, 1.75-px stroke)

| Item | Icon |
|---|---|
| Home | `Home` |
| Transcribe | `AudioLines` |
| Library | `Library` |
| Messages | `Inbox` (icoon, label blijft "Messages") |
| Account | `CircleUser` |
| Settings | `Settings` |
| Sidebar trigger | `PanelLeft` |
| Credit | custom hexagon SVG (van logo motief) |

### Tiptap — Optimize, Stay

**Niet vervangen.** ProseMirror's MutationObserver handling is gold standard voor Arabisch/CJK/Devanagari. Migratie kost 1-3 weken voor marginale wins of regressies.

**Optimization roadmap:**

1. **Read mode default, edit mode op toggle:**
   - Read: geen toolbar zichtbaar; `BubbleMenu` op selection met Copy, Copy with timestamp, Highlight, Search, Open at timestamp
   - Edit: fixed top toolbar `Bold | Italic | Strike` · `H2 | H3 | List` · `Undo | Redo`

2. **Custom extensions (in priority order):**
   - **TimestampMark** — wraps `[mm:ss]` patterns, klikbaar
   - **SpeakerBlock** — node-level wrapper voor "Speaker A: ..."
   - **InlineNote** — gele-getinte side notes
   - **SearchExtension v2** — bestaand, uitbreiden met regex toggle

3. **Mobile:** read-only by default, "Edit" knop toggleert in edit mode met BubbleMenu (geen fixed toolbar).

4. **Slash commands:** `/` triggers popover met max 5 opties (H2, H3, Bullet, Ordered, Divider). Geen meer.

5. **AI features:** Tiptap Pro deferred — server-genereerde AI summary, geen in-editor AI nodig pre-launch.

6. **StarterKit slimmen:** drop Image, CodeBlock, HorizontalRule (~15KB savings).

### State Patterns (NO TOASTS — hard rule)

**Loading:**
- Initial route + server data → skeleton matching final layout
- In-component refetch → inline 16px spinner + "Updating…"
- < 500ms action → disabled state, optional 200ms-delayed spinner
- 500ms-5s → inline spinner in button + disabled form
- Long-running (5s-minutes) → **determinate progress card** met stages, ETA, last-update timestamp
- Streaming AI → streaming text + blinking cursor

**Loader:** circulaire ring (geen hexagon — Husn vereist niet hier). Hexagon spinner voor pull-to-refresh wel (zie §5).

**Empty states:** hexagonal centrale illustratie + headline + body + primary CTA + secondary link. Hexagon background pattern subtiel.

**Errors:**
- Inline form validation: `aria-describedby` + `aria-invalid="true"` + icon (`AlertCircle` 16px)
- Page-level `error.tsx`: card layout, "Try again" knop, `error.digest` als reference
- Recoverable vs unrecoverable expliciet

**Success (no toasts):**
- Post-payment → `/billing/success` met persistent success card
- Post-transcription → inline replacement van progress card met success card
- Inline form save → button text changes ("Saved 2s ago"), `aria-live="polite"`

**Banners (tax):**
- Suspended user (top alle pages, until lifted)
- Low credits (top dashboard, until topped up)
- Maintenance (top all)
- Browser unsupported (dismissable session)
- Feature/changelog (dismissable persistent)

Single `<Banner>` component met `intent="error"|"warning"|"info"`. Pushen, niet overlay.

### Library Patterns

**View modes:** Rows (default, dense) | Cards (richer thumbnails). Toggle top-right, persist per-user. Geen grid view.

**Filter/sort:** top-bar pattern op desktop (search, "Sort by", chip filters). Bottom-sheet op mobile.

**Card fields (priority):** thumbnail (16:9, 96×54 row, 240×135 card) → title (2 lines truncated) → source badge → duration (Plex Mono) → status (only if ≠ Done) → date (relative) → collection badges (max 2 + N).

Right edge: `MoreHorizontal` → context menu (Open, Export, Add to collection, Rename, Delete).

**Empty state:** hexagonal central illustration + "Geen transcripts nog" + "Plak een YouTube-URL om je eerste transcript te maken" + "Transcribe a video" CTA + "Bekijk hoe het werkt" link.

**Bulk:** multi-select via row checkbox. Floating action bar onderaan bij ≥1 selected.

### Transcript Detail Patterns

**Tabs (NIET segmented control):** Transcript / AI Summary / RAG Export — distinct views.

Mobile: segmented control top.

**Read default, Edit toggle** in topbar (`Pencil` icon). **Geen auto-save** — explicit Save (Cmd/Ctrl+S) met inline "Saved 2s ago" status.

**Export menu:** topbar far-right `Download` icon → popover desktop, bottom sheet mobile. 6-8 formaten, "Copy markdown for Notion" en "Copy with Obsidian wikilinks" first-class.

**Search-within-transcript:** topbar Search icon → slim search bar (geen modal), prev/next arrows + match counter ("3 / 17"). Cmd/Ctrl+F intercepted bij focus.

### Home Pagina Inhoud (per Khidr)

Niet alleen statisch dashboard. Centrale dagelijkse plek:

1. **Credits balance** prominent (grote numerals + "Buy more" ghost)
2. **"Transcribe a video"** primary CTA (full-width sticky bottom op mobile tot eerste scroll)
3. **Last messages preview** (max 2-3 unread van support/feedback responses)
4. **Recent transcripts** (3 row preview, quick access)
5. **Library statistics** (totaal, collections)

Het verbindt persoonlijke berichten van admin met dagelijks gebruik — Itqan in het Onzichtbare.

### Messages — Tweezijdig Met Backend

- Lijstweergave (sender, timestamp, title, body, unread/read state)
- Archive action, mark all as read
- Eén zender: INDXR/Khidr (persoonlijk)
- Reply/archive: visible buttons (geen swipe gestures — Inclusive)
- Inline credit-grant badge bij reply: "+10 credits added"
- Mobile: full-screen detail (geen bottom sheet voor lange replies)

---

## §5 Beauty Layer — Hexagon Pattern Map

### Surface-by-Surface

| Surface | Density | Opacity (light/dark) | Pattern |
|---|---|---|---|
| Marketing homepage hero | low (cells ~120px) | 0.05 / 0.07 | honeycomb tessellation, fade naar transparent at edges |
| Pricing page hero | low | 0.04 / 0.06 | same |
| Login/signup | medium | 0.06 / 0.08 | full-bleed honeycomb achter form card |
| 404/not-found | medium-high | 0.08 / 0.10 | scattered hexagons, slight rotation |
| `loading.tsx` (full-page) | low + animated | 0.05 / 0.07 | single hex center, slow rotation |
| `error.tsx` boundary | medium | 0.07 / 0.09 | static array |
| Empty state Library | low | 0.04 / 0.06 | central hex met kleine illustration |
| Empty state Messages | low | 0.04 / 0.06 | same family |
| Account paused | medium | 0.06 / 0.08 | calm honeycomb |
| `/docs` landing | very low | 0.03 / 0.05 | edge-only fade |
| Welcome (first-login) | medium | 0.06 / 0.08 | honeycomb met één highlighted (amber) cell |
| Footer | very low | 0.03 / 0.04 | thin border-row hexagons boven footer text |
| Sidebar header | very low | 0.04 / 0.06 | small hex pattern achter logo only |

### Waar GEEN patterns

- Transcribe form working area
- Library list rows
- Transcript editor canvas
- Settings forms
- Data tables / dense tabular surfaces
- Modals

### Implementation

```css
:root {
  --pattern-hex-opacity-light: 0.05;
  --pattern-hex-opacity-dark: 0.07;
  --pattern-hex-cell: 96px;
}

.bg-hex-pattern {
  background-image: url('/patterns/hexagon-grid.svg');
  background-size: var(--pattern-hex-cell);
  background-repeat: repeat;
  opacity: var(--pattern-hex-opacity-light);
}

@media (prefers-color-scheme: dark) {
  .bg-hex-pattern { opacity: var(--pattern-hex-opacity-dark); }
}
```

Single SVG asset met `prefers-color-scheme` rules embedded voor stroke color shift.

**Cell sizes:** 96px primary, 128px voor marketing hero. Below 64px = noise. Above 160px = sparse occasional shapes.

### Andere Beauty Mechanisms

1. **Warm gradient washes** — OKLCH amber accent @ 0.04 opacity, radial gradients achter hero sections. Geen linear-gradient skew (vermijd AI-slop purple-gradient cliché).
2. **Section dividers** — 32px hexagon icon centered tussen major sections (marketing + /docs landing).
3. **Drop caps** in long-form `/docs` articles — eerste letter Plex Sans 600, ~3.5em, 4px right padding, slightly amber-tinted. Single Itqan moment per article.
4. **Empty-state illustrations** — simple monochromatic line illustrations (Linear/Notion/Carbon stijl), 1 per empty state, ~160×120px, gedraaid rond hexagon.
5. **Card corners** — 8px radius, 1px border in `--border-subtle`, geen shadow.
6. **Cursor on brand mark** — subtiele 0.6s rotation (~12°) on marketing logo hover. Single playful Itqan moment.
7. **Hexagonal pull-to-refresh spinner** — rotating hexagon (Library only).
8. **Honeycomb loading skeleton** — hex-corner-clipped placeholders i.p.v. rectangular shimmer voor library cards.

---

## §6 Implementatie Volgorde

Per Batch 2's 7-fasen plan, gemodificeerd door Batch 3B insights:

**Fase 0 — Pre-flight (1d):** branch `redesign/main`, document Plan Mode brief, dry-run install IBM Plex via next/font/google.

**Fase 1 — Foundation (3-5d, single PR):**
- Land `app/styles/tokens.css` met OKLCH scale
- Migrate `app/globals.css` (focus-visible, skip link, scroll-margin-top, reduced-motion)
- Replace Geist met IBM Plex Sans + Mono Variable
- Configure `<ThemeProvider>` met `attribute="data-theme"`, `defaultTheme="system"`
- Verify alle 27 shadcn componenten in beide thema's
- Single deployment

**Fase 2 — Primitives (3-4d):**
- Banner, Card, Button, EmptyState, ProgressCard, SuccessCard, SegmentedControl
- Update bestaande shadcn componenten naar role tokens
- Beauty layer: SVG hexagon asset, opacity tokens, `.bg-hex-pattern` utility

**Fase 3 — Shells & conventions (5-8d):**
- Build `DashboardShell` (CSS grid template areas, sidebar↔drawer↔mobile tab bar)
- Build `MarketingShell` + verify SEO landing pages renderen
- Build `DocsShell` voor `/docs` umbrella
- 8 nieuwe convention files (loading/error/not-found/global-error per matrix)
- `<RouteFocusManager>` + global live region

**Fase 4 — Sidebar & Mobile (3-5d):**
- Sidebar state machine (single trigger, 3 states, persistence)
- Mobile bottom tab bar
- Avatar-drawer voor Account/Settings op mobile

**Fase 5 — Tiptap optimization (3-4d):**
- Read/edit toggle
- BubbleMenu, FloatingMenu, slash commands
- TimestampMark extension first
- Mobile editor (read-only default, edit sheet)

**Fase 6 — Page migrations (7-10d, batched 2-page PRs):**
- PR 6a: Transcribe + Billing
- PR 6b: Library + Library/[id]
- PR 6c: Admin (5 admin pages)
- PR 6d: SEO templates audit (token consumption)

**Fase 7 — Messages, Home, Welcome (3-4d):**
- Build /dashboard/messages
- Expand WelcomeCreditCard / first-run guidance op /dashboard
- Build /support tweezijdig

**Fase 8 — Polish & QA (2-3d):**
- axe-core + Lighthouse op elke route
- Real-device check iPhone Safari + Android Chrome
- Reduced-motion + dark-mode + keyboard-only smoke tests
- VoiceOver / NVDA verify aria-live announcements

**Totaal: ~28-40 dagen** solo dev met Claude Code in Plan Mode.

**Deferred (post-launch v1):**
- Density modes (architecture preserves option)
- RTL UI support (lang/dir on content blijft in scope)
- Command palette `Cmd/Ctrl + K`
- Web Push notifications
- Pull-to-refresh op andere pages dan Library
- Roadmap, status page, public profile

---

## §7 Open vragen voor werksessies

Niet research-shaped, vereist Khidr + Claude in seat:

1. Exacte spacing in cards (8 vs 12px specifiek)
2. Empty state copy specifics (NL/EN mix, voice)
3. Hexagon empty-state illustraties tekenen
4. Side-by-side panels in `/dashboard/library/[id]` — try and see
5. Drag-and-drop voor collections — re-evaluate na launch
6. Command palette scope en contents
7. Pricing page hero specifieke layout
8. Marketing homepage sections beyond "Try it free" CTA
9. Welcome page first-time user flow specifics
10. /support page concrete twee-ingangen layout
11. Messages page reply UX specifics
12. /docs vs /articles final URL keuze (research zegt: behouden bestaande URLs, /docs als umbrella hub)

---

## Referenties

- Principles: `wiki/design/principles.md`
- Audit: `wiki/design/audit-frontend.md`
- Research:
  - `wiki/design/research/batch-1-foundation.md` — typography/theme/color/scale/hexagon
  - `wiki/design/research/batch-2-architecture.md` — tokens/layout/mobile/states/Next.js/a11y
  - `wiki/design/research/batch-3a-ia-naming.md` — sitemap/naming/missing pages
  - `wiki/design/research/batch-3b-ux-aesthetic.md` — sidebar/mobile/Tiptap/beauty/aesthetic
- Decisions log: `wiki/design/decisions/` (per significante keuze)
- Working sessions: `wiki/design/working-sessions/` (per sessie)

---

*Levend document. Versie 1.0 = synthese van research-fase. Versie 1.x = updates uit werksessies. Versie 2.x = updates na launch op basis van usage data.*
