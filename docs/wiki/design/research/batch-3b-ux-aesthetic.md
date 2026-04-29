# Batch 3B — UX Patterns, Sidebar/Mobile, Tiptap Strategy, Beauty Layer & Aesthetic Direction

**Status:** Final research batch before synthesis to `wiki/design/system.md` and Claude-Code-led working sessions.
**Calibration note carried forward:** Prior batches drifted toward over‑minimalism. The principle in force here is **Husn that carries meaning is functional, not Israf.** Empty states, error pages, suspended pages, and decorative micro‑moments are the *exact* surfaces where Itqan-in-the-Invisible applies and where beauty is required, not optional. Working surfaces (Transcribe form, Library list, in-place editor) remain quiet — coherence is preserved by *placing* beauty thoughtfully, not by removing it everywhere.

---

## 1 · Sidebar / Dashboard Navigation Redesign

### 1.1 Why dashboards develop two collapse buttons

The "two collapse buttons" pattern in INDXR's current dashboard is a known artifact of bolting two separate ideas onto one chrome:

1. A **mini‑variant toggle** (expanded ↔ icon-only ~64 px rail) — common in Material/MUI templates and most admin dashboards (Inspinia, MDB Bootstrap "slim sidenav").
2. A **full off‑canvas / hamburger toggle** (visible ↔ hidden), inherited from mobile‑first responsive boilerplates.

Each control was designed in isolation; together they produce three states (full / mini / hidden) but five visible affordances (two open buttons, two close buttons, plus a hamburger). Linear, Vercel's new dashboard, Notion, Stripe Dashboard, Anthropic Console, Supabase Studio, and Cursor all converge on **a single trigger with a state machine**, never two competing buttons.

### 1.2 Canonical 2025–2026 SaaS pattern

Concretely:

| Product | Trigger | Shortcut | States |
|---|---|---|---|
| Linear | click sidebar border, or `[` | `[` | full / fully hidden (no mini) |
| Vercel (new dash) | sidebar-rail icon | — | full / collapsed-rail |
| Notion | toggle in sidebar header | `Cmd ⌘ \` | full / hidden |
| shadcn/ui `Sidebar` | `SidebarTrigger` component | `Cmd ⌘ B` (Mac) / `Ctrl B` | `offcanvas` *or* `icon` (one variant per app) / `none` |
| Stripe Dashboard | hover-rail at edge | — | full / mini-rail |
| Anthropic Console | single trigger | — | full / hidden |
| Cursor | command palette + `Cmd ⌘ B` | `Cmd ⌘ B` | full / hidden |

The shadcn/ui sidebar (Khidr's primitive base) is explicit: **pick ONE collapsible mode** (`offcanvas` *or* `icon`) per `<Sidebar>` instance; do not stack them. INDXR's bug was using both modes simultaneously.

### 1.3 RECOMMENDATION FOR INDXR — Sidebar architecture

**Adopt a 3-state-but-1-trigger model:**

| Breakpoint | Default | On trigger | Persistence |
|---|---|---|---|
| `≥ lg` (1024 px) | **expanded** (240 px) | toggles to **icon-rail** (64 px) | `localStorage` per user |
| `md` (768–1023 px) | **icon-rail** | toggles to **expanded overlay** (240 px, drops shadow over content) | session only |
| `< md` (< 768 px) | **hidden** | toggles to **off-canvas drawer** (full height, 80 % width or 320 px, scrim) | always returns to hidden |

**Single trigger, single shortcut:** `Cmd ⌘ B` / `Ctrl B` (the shadcn default; matches Cursor and VS Code muscle memory, avoids Notion's `Cmd \` which collides with Linear). Trigger placement: a `PanelLeft` Lucide icon in the top-left of the dashboard topbar. **Remove the second collapse button entirely.**

**Layout zones:**

```
┌─ Sidebar (expanded 240 px / rail 64 px) ────┐
│ [hex logo]  INDXR        ░ pattern fades    │   ← header zone, hexagon background
│                                              │     opacity 0.04 light / 0.06 dark
│ ─────                                       │
│ ◐ Home                                      │   ← navigation zone
│ ◉ Transcribe                                │
│ ▤ Library                                   │
│ ✉ Messages         · 2                      │   ← unread dot, not a toast
│ ⊙ Account                                   │
│ ⚙ Settings                                  │
│                                              │
│ ─────                                       │
│ ◇ 247 credits                               │   ← persistent credit-coin
│ ☼ Theme · Auto                              │   ← inline, no dropdown noise
│ ? Docs                                       │
└──────────────────────────────────────────────┘
```

**State details:**

- **Expanded:** label + icon + (where relevant) badge.
- **Rail (64 px):** icon centered, label removed, **tooltip on hover** with `delayDuration={500}`. Credit pill becomes a vertical hexagon-coin showing the integer only ("247"); tooltip on hover reveals "247 credits remaining".
- **Off-canvas drawer:** full-width hit targets ≥ 48 px, focus trap, dismisses on backdrop click + `Esc`. Always re-renders expanded view (never rail) — rail-on-mobile fails WCAG 2.5.5 target size.

**Sub-navigation behaviour:** Library has implicit sub-views (collections). Do **not** nest collapsibles in the sidebar — collapse-while-open creates the exact awkwardness Khidr already feels. Instead, push collections to an in-page secondary nav (filter chips at the top of `/dashboard/library`). Keep the sidebar flat.

**Credit-balance home:** bottom of sidebar, above the user/help row. This matches Linear's pattern (account at bottom). The credit-coin icon is the same hexagon used in the logo — a Level A+ functional reuse, satisfying Coherence.

**Icon set — Lucide (already in stack), one weight, 1.75-px stroke:**

| Item | Icon | Reasoning |
|---|---|---|
| Home | `Home` | universal house glyph; not `LayoutDashboard` (too generic) |
| Transcribe | `AudioLines` | speech/audio is the primary action; `Mic` connotes recording-from-device which INDXR is not |
| Library | `Library` | exists in Lucide, fits the metaphor better than `Folder` or `Grid` |
| Messages | `Inbox` *visual* with **label "Messages"** | the inbox glyph is universally read; Khidr disliked the *word* "Inbox", not the *icon* — separating glyph from label is fine and inherits user mental models |
| Account | `CircleUser` | distinguished from `Settings` cog; a person, not gears |
| Settings | `Settings` | the cog, no ambiguity |
| Trigger | `PanelLeft` | the canonical Lucide sidebar-toggle glyph |
| Credit | hexagon SVG (custom, from logo motif) | Honest Materiality — the coin is the brand |

**Persistence rules:**
- Desktop expand/collapse persisted in `localStorage` (`indxr.sidebar.collapsed = 'true'|'false'`).
- Default on first visit: **expanded** (helps discoverability; rail is power-user opt-in).
- Mobile drawer state never persists.
- If user resizes browser from `lg` → `md`, sidebar transitions from "expanded" to "rail" without animating to hidden (avoids flash).

**Test against ihsan principles:**
- ✓ Honest Materiality — the credit hexagon is functional, not decorative.
- ✓ Itqan in the Invisible — tooltips, focus-trap, persistence rules all handled.
- ✓ Husn — hexagon pattern subtly tints the sidebar header (see §5).
- ✓ Quiet Quality — one trigger, no toasts, inline badge for unread.
- ✓ Inclusive — `aria-expanded`, `aria-controls`, ≥ 48 px mobile targets, visible focus ring.
- ✓ Coherence — single state machine, single shortcut, single trigger glyph.
- ✓ No Israf — every pixel earns its place.

---

## 2 · Mobile UX Patterns — INDXR-specific

### 2.1 The bottom-tab vs hamburger vs drawer decision

Industry consensus (Material, HIG, Sevensquaretech mobile nav studies, Designmonks 2025): **bottom tab bars cap at 5 items**. Above 5, options are:

1. 4 primary + "More" sheet (Twitter, Instagram pre-2023).
2. 5 primary, secondary inside a profile/account screen.
3. Hamburger (drawer) with full nav — works but hides primary actions; not recommended for content apps.

INDXR has 6 sidebar items but they are **not equally hot on mobile**. Realistic mobile usage frequency:

| Item | Mobile frequency | Mobile primacy |
|---|---|---|
| Home | High — daily landing | **must be tab** |
| Transcribe | Highest — reason to open app | **must be tab** |
| Library | High — review work | **must be tab** |
| Messages | Medium — reactive when badge | **should be tab** |
| Account | Low — set-and-forget | overflow OK |
| Settings | Low — set-and-forget | overflow OK |

### 2.2 RECOMMENDATION FOR INDXR — Mobile chrome

**Bottom tab bar with 4 + drawer for the rest:**

```
┌─────────────────────────────────────────────┐
│  Home    Transcribe   Library   Messages·2  │
│   ◐         ◉           ▤          ✉        │
└─────────────────────────────────────────────┘
                 safe-area-inset-bottom
```

- 4 tabs at the bottom; 56 px tall + safe-area inset (matches iOS Tab Bar spec, accommodates the home indicator).
- Active state: filled icon + label color shifts to amber accent + 2-px top border on the tab cell (not the icon underline; cleaner).
- Account & Settings reachable via:
  - Tap on user avatar in the top-right of the topbar → drawer slides from right with: Account, Settings, Theme, Sign out.
  - The top-right avatar **doubles as the entry point** — replaces the marketing "avatar dropdown that navigates to dashboard" (which is gone post-Batch 3A) with an in-dashboard avatar that opens the secondary-nav drawer.
- Unread indicator on Messages: 6 px filled dot in the top-right of the icon; if count ≥ 1 show the integer (capped at "9+"). No red — use the amber accent at full saturation; reserves red for destructive only.

Why this beats 5+1: the symmetry of 4 tabs reads more clearly on small screens, and pairing Account + Settings together in a secondary surface reflects how they're actually used (in sequence: "go to Account, then maybe Settings"). It also keeps the chosen-by-Khidr Account/Settings split intact without forcing it into the primary chrome.

### 2.3 Per-route mobile recommendations

**Mobile `/dashboard` (Home):**
- Stack vertically, single column. Top-priority order: (1) Credit balance card with big numerals + "Buy more" ghost button, (2) "Transcribe a video" primary button (full-width, sticky to bottom of viewport above the tab bar until first scroll), (3) Last messages preview (max 2, compact rows), (4) Recent transcripts (3-row preview), (5) Library stats card.
- The sticky CTA dissolves into the page after the first scroll gesture; on scroll-up it doesn't reappear (avoids the iOS Safari toolbar flicker pattern). This is a Quiet Quality choice.

**Mobile `/dashboard/transcribe`:**
- URL input is the hero — large, paste-friendly, with a `Paste from clipboard` ghost button that appears above the keyboard via the Web Clipboard API where available. (Critical for mobile YouTube transcript flows: users open YouTube, copy URL, switch back. The paste button removes 3 taps.)
- File upload below the URL input, not in a tab. Mobile users almost never upload audio files; secondary placement is correct.
- Persistent inline progress card (Batch 2 decision) renders **as a sticky banner at the top of the page** while transcribing, including when user navigates to `/dashboard` or `/dashboard/library`. Stays visible across mobile route changes.
- Form labels above inputs (not floating); helper text below. Larger inputs (44 px height min, 48 px ideal).

**Mobile `/dashboard/library`:**
- Cards-as-rows from Batch 2, refined: 72-px row height, thumbnail (16:9, 96 × 54 px) on the left, two-line title (truncated), one-line metadata (`source · duration · date`).
- Search: persistent at the top, sticky on scroll (collapses to a 36-px bar with magnifier when scrolled past 200 px).
- Sort/filter: small "Filter" chip at the top opens a **bottom sheet** (Radix `Sheet` with `side="bottom"`), not a dropdown. Bottom sheet patterns (>50% adoption in 2025 mobile UX research) win on thumb reachability.
- Bulk actions: long-press a row → enters multi-select; floating action bar slides up from the bottom (above the tab bar). Mobile multi-select is a power-user need but worth supporting given INDXR's RAG/AI-developer audience.
- Pull-to-refresh: yes, with a hexagonal spinner (custom) — Itqan moment.

**Mobile `/dashboard/library/[id]`:**
- Tabs (Transcript / AI Summary / RAG Export) become a **segmented control** at the top of the content area, not full tabs. Horizontal segmented control reads better on narrow screens than scrolling tabs and aligns with the iOS HIG. Three segments fit in a 320-px width with no truncation.
- Tiptap is **read-only by default on mobile** (Batch 2). The "Edit" affordance is a small ghost button in the top-right that swaps the editor into edit mode and pulls up the keyboard; the toolbar appears as a **floating bubble menu** (no fixed toolbar) — mobile screen real estate is precious. Exit-edit on tap-outside or a "Done" pill in the topbar.
- Export menu: bottom sheet listing format options (TXT, SRT, VTT, JSON, Markdown, Notion-flavored MD, Obsidian wikilinks). Each format gets a one-line description. This is a deliberate Itqan moment — the export UI is a working surface but it's also where journalists and researchers will judge the product.
- Metadata (URL, source, duration, language) collapses behind a "Details" disclosure; expanded by default on first visit, remembered per-user.

**Mobile `/dashboard/messages`:**
- Two-pane on desktop becomes single-pane stack: list view → tap → message detail (full-screen replacement, not bottom sheet). Bottom sheet for messages would force scrolling-while-pinned, which is awkward for long admin replies.
- Back arrow returns to list, preserving scroll position.
- Reply / archive: visible buttons at the bottom of the message detail. **No swipe-to-delete** — Inclusive-by-Default principle: hidden gestures fail discoverability and motor-accessibility.
- If admin reply included a credit grant, the message renders a small inline credit-coin badge: "+10 credits added" — Itqan moment, Honest Materiality.

**Mobile `/dashboard/account` & `/settings`:**
- Long-form list pages, dense rows with `>` chevrons. iOS-conventional. Group with `<SectionHeader>` labels.

### 2.4 Cross-cutting mobile concerns

- **Safe areas:** `padding-bottom: env(safe-area-inset-bottom)` on the tab bar, `padding-top: env(safe-area-inset-top)` on the topbar.
- **Keyboard handling:** `interactive-widget=resizes-content` viewport meta + `field-sizing: content` on the URL input prevents the keyboard from punching the tab bar into view.
- **Deep links:** `/dashboard/library/[id]` routes work standalone; if user lands here without auth, redirect to `/login?next=...`. iOS Universal Links friendly.
- **Pull-to-refresh:** library only. Home and Messages should poll/SWR-revalidate on focus; PtR there would feel redundant.
- **Swipe back:** rely on browser/OS gesture, do not implement custom; works correctly with App Router's native nav.
- **No bottom sheet on Account-paused / 404 / error pages:** these are full-screen reflective moments — see §5.

**Test against ihsan principles:**
- ✓ Inclusive — visible buttons over hidden gestures, ≥ 48 px targets.
- ✓ Itqan — sticky inline progress, paste-from-clipboard helper, hexagonal pull-to-refresh spinner, credit-grant badge.
- ✓ No Israf — 4 tabs not 6; only essential mobile-only patterns added.
- ✓ Honest Materiality — segmented control instead of fake-tabs; bottom sheet for filters which are toggles, not navigation.

---

## 3 · Tiptap — Optimize, Not Replace

### 3.1 What INDXR actually needs from a rich-text editor

A sober inventory:

1. **Render** transcripts with formatting + timestamps + (eventually) speaker labels.
2. **Light edit** — typo correction, deleting filler, adding inline notes; **not** full document authoring.
3. **AI summary view** — structured rich text from server-generated summary (read mostly).
4. **RAG export view** — formatted preview of what will be exported.
5. **Search-in-transcript** — already implemented as a custom `SearchExtension`.
6. **Multi-script** — Arabic, CJK, Devanagari, Thai must all render and edit cleanly.
7. **Multi-format export** — TXT, MD, JSON, SRT, VTT, etc.

INDXR is **not** Notion, **not** Google Docs, **not** a collaborative editor. The honest baseline is a viewer with light editing. Pushing toward Notion-clone territory would be Israf.

### 3.2 Comparative landscape (Liveblocks 2025 framework comparison + Velt 2026 + Nutrient + Tiptap docs synthesis)

| Editor | Architecture | Mobile/CJK/RTL | Bundle | INDXR fit |
|---|---|---|---|---|
| **Tiptap (current)** | Headless React wrapper over ProseMirror | ProseMirror has battle-tested CJK/Android via MutationObserver; RTL via `dir`; Tiptap exposes both | ~70 KB gz with StarterKit | ★★★★★ — already in stack, incremental optimization possible |
| **Lexical** (Meta) | Lower-level, node tree, no decorations | Strong Android handling but Liveblocks 2025: collaboration is hard, no pure decorations (decoration nodes mutate document — bad for SearchExtension) | ~50 KB gz | ★★★ — would require rewriting SearchExtension; pure decorations matter for search-highlight |
| **BlockNote** | UI-rich layer on top of Tiptap | Same as Tiptap underneath | ~120 KB gz | ★★ — abstraction-on-abstraction; loses Tiptap's primitives Khidr already uses; some packages paid for closed-source |
| **Plate** (Slate) | Headless on Slate | Slate has documented Android/CJK weaknesses (Liveblocks: "Android is a second-class citizen"); risky for INDXR's multi-script audience | ~80 KB gz | ★★ — multi-script weakness disqualifies |
| **Slate** raw | Lower-level | Same Android/CJK issue | ~40 KB gz | ★ |
| **ProseMirror direct** | Bypass Tiptap | Same as Tiptap (Tiptap is a wrapper) | ~50 KB gz | ★★★ — strictly more code for marginal wins |
| **Edra** | Newer, opinionated | Limited info, small ecosystem | n/a | ★ — too immature for solo dev |
| **CKEditor / TinyMCE** | Enterprise WYSIWYG | Heavy, separate license burden | ~300+ KB gz | ★ — tonal mismatch + bundle |

**Headless vs UI-included** (Nutrient's framing): INDXR wants headless because the visual brand language must be enforced via tokens and shadcn primitives. BlockNote's pre-built UI fights this. Tiptap is correctly headless.

**Key technical evidence:**
- ProseMirror's MutationObserver-based Android handling is currently the gold standard for non-Latin scripts (cited by Liveblocks 2025 + Velt 2026). Switching off ProseMirror is a real regression for INDXR's Arabic/CJK/Devanagari users.
- Tiptap's `BubbleMenu` and `FloatingMenu` work in **read-only mode** with `shouldShow` callbacks (confirmed in Tiptap GitHub Discussion #3127), enabling rich selection-actions even when editing is off.
- Tiptap publishes ready-made Toolbar primitives (`@tiptap/ui-components/primitives/toolbar`) and has 50+ official extensions covering everything INDXR could plausibly want.

### 3.3 RECOMMENDATION FOR INDXR — Stay with Tiptap, optimize aggressively

**Decision: Keep Tiptap. Migration cost (1–3 weeks dev time) for marginal wins (or net regressions on multi-script) is unjustified given Khidr's solo-dev constraint and Plan-Mode workflow.**

**Tiptap optimization roadmap (in priority order, working-session ready):**

1. **Replace fixed 5-button toolbar with role-aware menu system:**
 - **Read mode (default):** no toolbar visible. A `BubbleMenu` appears on text selection with: Copy, Copy with timestamp, Highlight, Search-from-selection (uses existing SearchExtension), Ask AI (deferred — placeholder), Open at timestamp (jumps video player if embedded).
 - **Edit mode (toggled):** **fixed top toolbar** with 8–10 buttons grouped into 3 segments — `Bold | Italic | Strike` · `H2 | H3 | List` · `Undo | Redo`. Clean separators, no overflow menu (transcripts don't need tables/images/code blocks). The `FloatingMenu` on empty lines offers `Heading 2` and `Bullet list` only.
 - **Slash commands:** `/` triggers a lightweight popover with 5 options: Heading 2, Heading 3, Bullet list, Ordered list, Divider. No more — transcripts are not docs.
2. **Custom extensions to add (ranked):**
 - **TimestampMark** (highest value): wraps `[mm:ss]` patterns into clickable spans that scrub the (eventual) embedded player or copy a deep link. Matches what Tiptap's research shows users want from transcripts (SoScripted "link directly to the moment the expert makes a key point" pattern, citing 44% AI-citation share for first 30% of articles).
 - **SpeakerBlock**: a node-level wrapper for "Speaker A: ..." with a colored side-bar. Node, not mark, so it survives copy-paste cleanly.
 - **InlineNote**: user-added side notes (yellow-tinted span) — distinct from highlights; valuable for journalists/researchers.
 - **SearchExtension v2:** already exists; extend to support regex toggle and "find in selection".
3. **Keep StarterKit, remove unused nodes:** drop Image, CodeBlock, HorizontalRule from StarterKit if not exposed in toolbar — bundle savings ~15 KB gz.
4. **Use Tiptap's official `@tiptap/ui-components/primitives` Toolbar** instead of custom buttons — matches shadcn token system via CSS variables.
5. **AI features (deferred to post-launch):** Tiptap Pro offers AI Generation/Suggestion extensions. Not worth the per-month subscription pre-launch given Khidr's pricing model and that AI summary is server-generated, not in-editor. Re-evaluate when DAU > some threshold.
6. **Mobile editor:** read-only by default (Batch 2 decision). When `Edit` is tapped: hide top toolbar, rely on BubbleMenu (selection) + FloatingMenu (empty line) which are touch-friendly when sized at ≥ 40 px.

**Test against ihsan principles:**
- ✓ Honest Materiality — toolbar shape matches actual user actions (transcripts are read mostly, edit lightly).
- ✓ Itqan — TimestampMark, SpeakerBlock, InlineNote treat invisible details (timestamps, speakers) with care.
- ✓ Husn — bubble menu's pop animation is one Itqan motion moment; no more.
- ✓ Coherence — Tiptap's primitives use the same tokens as the rest of the system via CSS variables.
- ✓ No Israf — no migration; reuse what works.

---

## 4 · /docs vs /articles — SEO Investigation

### 4.1 What the data actually says

Across the SEO sources reviewed (Stan Ventures, Vazoola, Techmagnate, 1Byte, Cognitiveseo, Feather subdomain study) the consensus is consistent and worth stating plainly:

- **Google does not assign ranking weight based on the literal slug `/docs` vs `/blog` vs `/learn` vs `/articles`.** The path is one of many minor signals; what matters is content quality, internal linking, click-depth, and topical authority of the surrounding cluster.
- **Subdirectories (`example.com/docs/...`) consistently outperform subdomains** for content that should pool authority with the main brand. INDXR is small; subdirectory is correct.
- **URL stability matters far more than URL prefix.** The cost of changing 31 ranking articles' URLs is significantly higher than any plausible upside.

### 4.2 Competitor URL patterns

| Product | Content path | Style | Notes |
|---|---|---|---|
| Tactiq | `/learn/[slug]` | blog-like | flat structure, no `/docs` |
| Otter.ai | `/blog/[slug]` | blog | conventional |
| Descript | `/blog/[slug]` + `/help/...` | split | help center for product, blog for content marketing |
| Happy Scribe | `/blog/[slug]` | blog | conventional |
| Stripe | `/docs/[product]/[slug]` + `/guides` + `/blog` | three-tier | docs is for *integrators*, blog is marketing, guides is mid-funnel |
| Riverside | `/blog/[slug]` | blog | flat |
| Firecrawl | `/blog/[slug]` | blog | flat |

**Two patterns dominate:**
1. **Single `/blog`** (Tactiq/Otter/Descript/Riverside) — for content-marketing-driven SEO articles.
2. **`/docs` as separate from `/blog`** (Stripe) — when the audience truly needs reference documentation.

INDXR's 31 existing articles are mostly **buyer-intent content marketing** (e.g., "how to extract YouTube transcripts," "best YouTube transcript tools"), not API/integration documentation. They are blog-shaped, not docs-shaped.

### 4.3 RECOMMENDATION FOR INDXR — `/docs` as umbrella, but with template variants

Khidr's Batch 3A decision is **`/docs` as umbrella with all existing URLs preserved**. Hold this as final. Concretely:

- **Do NOT migrate existing article URLs.** Whatever they currently are (`/articles/[slug]`, `/blog/[slug]`, or flat `/[slug]`), keep them and let `/docs` be a *navigation hub* that links to them. Zero 301s, zero risk.
- The `/docs` page itself is a **directory/landing page** under `https://indxr.ai/docs` with categorized links to all 31 articles plus a sidebar listing categories. Add `<link rel="canonical">` only if there's a duplication concern — and there isn't, because `/docs` is a hub, not a duplicate of any article.
- **Two visual templates inside `/docs`:**
 1. **Stripe-style docs template** for `/docs/getting-started`, `/docs/faq`, and any future how-to-use-INDXR reference content. Three-column (left nav, content, optional right meta), denser typography, table of contents, sticky in-page anchors.
 2. **Notion-style article template** for the existing 31 SEO articles. Single column, generous line-height, hero image optional, related-articles footer, social share. This is what currently converts well in content-marketing benchmarks.
- The `/faq` → `/docs/faq` 301 is the only redirect. One redirect, low risk.
- Rename "Integrations" category to **"Workflows"** (Khidr's preferred name; "Use cases" is fine but "Workflows" reads more action-oriented and more accurately captures "use INDXR's exports in other tools").

**SEO additions worth mentioning:**
- Use `BreadcrumbList` JSON-LD schema for each article's hierarchy.
- Use `Article` schema (not `BlogPosting`) for the SEO articles — it ranks identically and avoids the editorial-content connotation.
- For `/docs/getting-started`, use `HowTo` schema where steps apply.
- Link densely between articles — Google reads structure from links, not URL shape (1Byte 2025 SEO synthesis).

**Test against ihsan principles:**
- ✓ Honest Materiality — content type matches template (reference vs article).
- ✓ Itqan — preserving 31 URLs respects existing readers and bots; not breaking what works is invisible care.
- ✓ Coherence — single `/docs` umbrella ties everything.
- ✓ No Israf — no risky migration.

---

## 5 · Beauty Layer — Hexagon Patterns & Geometric Ornamentation

This is where Khidr's "more weight to husn" calibration matters most. The goal: produce a concrete map.

### 5.1 The hexagon's place in INDXR

The 7-hexagon honeycomb logo is already the brand. The hexagon is a regular polygon that **tessellates the plane** alongside only the triangle and square (Lightisdark 2025 hexagon-in-art synthesis; Bridges Math/Art Journal 2025 girih research). Its 6-fold symmetry sits inside the broader Islamic geometric tradition (Lu et al., girih hexagonal-tessellation literature), making it a structurally honest motif for a product whose creator finds meaning there.

**The honest line we'll hold:** hexagon patterns are **not Islamic motifs** in INDXR. They are **structurally related** to 6-fold symmetry traditions. INDXR inherits the *principle* (tessellation, symmetry, restraint) without forcing the *motif*. This avoids both cultural appropriation concerns and watering-down — and matches Khidr's Level A+ position from Batch 1.

### 5.2 Where hexagons SHOULD appear

A specific surface-by-surface map:

| Surface | Density | Opacity (light / dark) | Pattern | Reasoning |
|---|---|---|---|---|
| **Marketing homepage hero** | low (cells ~120 px wide) | 0.05 / 0.07 | honeycomb tessellation, fades to transparent at edges | brand introduction, sets tone |
| **Pricing page hero** | low | 0.04 / 0.06 | same | continuity |
| **Login / signup page** | medium | 0.06 / 0.08 | full-bleed honeycomb behind the form card | reflective moment, Itqan-in-the-Invisible |
| **404 / not-found** | medium-high | 0.08 / 0.10 | scattered hexagons, slight rotation | error pages deserve more care, not less |
| **Loading.tsx (full-page)** | low + animated | 0.05 / 0.07 | single hex at center, slow rotation | branded waiting state |
| **error.tsx (boundary)** | medium | 0.07 / 0.09 | static hexagon array | reflective, communicates stability |
| **Empty-state Library** | low | 0.04 / 0.06 | central hex with small illustration inside | first-use moment |
| **Empty-state Messages** | low | 0.04 / 0.06 | same family | coherence |
| **Account-paused page** | medium | 0.06 / 0.08 | calm honeycomb | a moment that deserves dignity |
| **`/docs` landing** | very low | 0.03 / 0.05 | edge-only fade | reference page; not distracting |
| **Welcome / first-login page** | medium | 0.06 / 0.08 | honeycomb with a single highlighted (amber-tinted) cell | warm welcome |
| **Footer** | very low | 0.03 / 0.04 | thin border-row of hexagons above footer text | section-divider use |
| **Sidebar header (in dashboard)** | very low | 0.04 / 0.06 | small hex pattern behind logo only | brand reinforcement, doesn't distract from nav |

**Where hexagons must NOT appear:**
- Transcribe form working area
- Library list rows (cards)
- Transcript editor canvas
- Settings forms
- Any data table or dense tabular surface
- Modals (the modal is already a focal moment; pattern would compete)

**Implementation specifics (CSS / Tailwind v4 tokens):**

```css
/* token */
--pattern-hex-opacity-light: 0.05;
--pattern-hex-opacity-dark: 0.07;
--pattern-hex-cell: 96px;

/* utility */
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

Per the Cassidy James Blaede 2025 light/dark SVG patterns: embed `prefers-color-scheme` rules **inside the SVG file** so the pattern stroke color shifts with theme automatically. Use a single SVG asset for both modes. Hero Patterns library (Steve Schoger's free repository) provides battle-tested honeycomb SVGs as a reference, but INDXR should use a **custom hexagon SVG** that matches the logo's hexagon proportions exactly (Coherence).

**Density / cell-size research (Pacgie 2025 + svgbackgrounds.com synthesis):**
- Below 64-px cell: too dense, reads as texture/noise.
- 96–128-px cell: legible as honeycomb without overwhelming.
- Above 160-px cell: too sparse, reads as occasional shapes, not pattern.
- INDXR target: **96 px** primary, **128 px** for marketing hero (more breathing room).

**Opacity research:**
- Below 0.03: invisible on common monitors, wasted bytes.
- 0.04–0.08: subtle, brand-reinforcing — the safe band for working surfaces' adjacent areas.
- 0.08–0.12: present, decorative — for reflective surfaces (404, login, empty states).
- Above 0.15: distracting, fights content — never use.

### 5.3 Other beauty mechanisms beyond hexagons

The hexagon should not be the only beauty mechanism. **Coherence-Over-Local-Optimization** says the system needs a small vocabulary of beauty moves used consistently:

1. **Warm gradient washes** — using the OKLCH amber accent at 0.04 opacity on top of the warm-tinted neutral background. Subtle radial gradients behind hero sections; never linear-gradient skew (avoid the AI-slop purple-gradient cliché Anthropic's Frontend-Design skill explicitly warns against).
2. **Section dividers as thin geometric accents** — a 32-px-wide hexagon icon centered between major sections in marketing pages and in `/docs` landing.
3. **Drop caps in long-form `/docs` articles** — the first letter of an article styled in IBM Plex Sans 600, ~3.5em, with 4-px right padding, slightly amber-tinted. Single Itqan moment per article.
4. **Empty-state illustrations** — simple, monochromatic line illustrations (Linear / Notion / Carbon Design pattern). One illustration per empty state (Library, Messages, Account-paused), each ~160 × 120 px, drawn around the hexagon. **Reverse my prior advice:** these illustrations DO go in empty states. Empty states are exactly where Itqan-in-the-Invisible applies. They must be there.
5. **Card corners** — 8-px radius (consistent with Batch 2 alignment grid). No bigger; bigger feels app-store-toy. Subtle 1-px border in `--color-border-subtle`, no shadow (shadows are reserved for elevation, see §6).
6. **Animation** — see §6.4.
7. **Cursor on the brand mark** — when hovering the logo on marketing pages, a subtle 0.6s rotation (~12°). One playful Itqan moment; nothing more.
8. **Hexagonal pull-to-refresh spinner** — rotating hexagon, not a circle. Cohesive use of the brand mark.
9. **Honeycomb loading skeleton** — instead of standard rectangular shimmer for library cards, use a hex-corner-clipped placeholder. Subtle but recognizable.

### 5.4 The line between Husn and Israf

A useful test: **does this beauty serve coherence, brand identity, or invisible care (Itqan)?** If yes, it's functional beauty. If it's there only to be seen, it's Israf.

Examples:
- Hexagon pattern on login page background → **Husn** (coherence + reflective dignity).
- Hexagon pattern on Library list → **Israf** (competes with content).
- Hexagonal spinner → **Husn** (replaces a generic with a brand element).
- Hexagonal spinner with rainbow gradient → **Israf** (decoration that broke restraint).
- Drop cap in `/docs` article → **Husn** (typographic care, signals editorial quality).
- Drop cap on every dashboard heading → **Israf** (working surfaces should be quiet).

**Test against ihsan principles:**
- ✓ Honest Materiality — hexagon is the brand; pattern is consistent extension.
- ✓ Itqan — empty states, 404s, loading get more, not less, care.
- ✓ Husn — concrete map, opacity ranges, density, cell sizes specified.
- ✓ Quiet Quality — pattern is absent on working surfaces.
- ✓ Coherence — single SVG asset, single token vocabulary.
- ✓ No Israf — surface-by-surface decision, not blanket addition.

---

## 6 · Aesthetic Direction — What INDXR Looks Like

### 6.1 The triangulation

Five reference points to plot INDXR against — **not to copy, to position**:

| Reference | Borrow | Reject |
|---|---|---|
| **Linear** | quiet density, keyboard-shortcut respect, sidebar restraint, monochrome empty-state illustrations, spec for `[` collapse | dark-only default; Linear's reduced color → INDXR has more warmth |
| **Anthropic Claude.ai** | warm cream backdrops, restrained accent palette, considered emptiness, conversational tone in copy | the soft "AI assistant" voice — INDXR is a tool, not a persona |
| **Stripe** | three-column docs template, BreadcrumbList care, premium-without-shouting marketing | Stripe's blue-gray clinicality; INDXR's amber reads warmer |
| **Notion** | empty-state illustrations, minimal monochrome line work, slash commands restraint | Notion's playful tone in error states; INDXR's tone is more grounded |
| **Resend** | developer-considered marketing, generous whitespace, brand monoline icon style, careful typography | Resend's stark monochrome — INDXR has more color/warmth |
| **Vercel new dash** | sidebar-rail pattern, spec card densities, design-engineer attention to detail | Vercel's geometric-precision-over-warmth tone |
| **Supabase Studio** | compact tabular density, monospace for technical data | green palette and brutalist edges |

**INDXR's position:** *warm, considered, technical, restrained.* Closer to Anthropic and Resend on the warmth axis than Linear; closer to Linear and Stripe on the density axis than Notion; closer to Resend on the developer-respect axis than any of them.

### 6.2 Concrete aesthetic decisions

- **Visual rhythm:** medium density. Marketing pages breathe (60–70 ch text width, generous vertical rhythm at 1.5–1.75 line-height); dashboard is compact (1.4 line-height in tables, 1.5 in body). Avoid Notion-level whitespace on the dashboard — it would read as soft for a paid tool.
- **Imagery:**
 - **No stock photography.** Stock photos uniformly read as low-trust in 2026 SaaS.
 - **No 3D illustrations** (Spline-style). Falls into "AI slop" aesthetic per Anthropic's Frontend-Design skill.
 - **Custom geometric illustrations** for empty states and feature highlights — drawn with 1.5-px stroke matching Lucide icon weight. Monochromatic with single amber-tinted highlight.
 - **No Lottie animations** for marketing. Static beats motion-loaded for performance and trust.
 - **Photographs of users / case studies** allowed sparingly (testimonial sections), small (≤ 64 px circle), B&W or duotone in amber/cream.
- **Animation philosophy** (one paragraph the working sessions can return to):
 - **Itqan motion serves**: state transitions (sidebar collapse 200 ms ease-out), focus rings (60 ms in, 120 ms out), accordion expand (180 ms cubic-bezier(0.4, 0, 0.2, 1)), bubble menu fade (120 ms), pull-to-refresh hexagon (1.2 s linear loop).
 - **Itqan motion does NOT serve**: hover-jump on cards (no), parallax (no), scroll-driven character animation in headlines (no), loaded-page staggered reveal-everything (no — the Anthropic skill explicitly warns against it as AI-slop).
 - Default duration scale: 60, 120, 180, 240, 320 ms. Default easing: `cubic-bezier(0.4, 0, 0.2, 1)` for movement, `cubic-bezier(0, 0, 0.2, 1)` for entrances. Use `prefers-reduced-motion: reduce` to drop all non-essential animation to 0 duration.
- **Marketing tone vs dashboard tone:** **same system, different density and surface treatment.** Same fonts, same color tokens, same hexagon family. Marketing has more whitespace, larger type scale at the top end (uses sizes `t6`, `t7`), more hexagon presence. Dashboard uses `t1`–`t5`, less hexagon, more functional density.
- **The 7-hexagon logo:**
 - **Top-left of marketing topbar:** full color, ~32 px.
 - **Top-left of sidebar header (dashboard):** full color, ~28 px.
 - **As favicon / PWA icon:** simplified to a single hexagon outline + amber fill.
 - **As watermark on PDF/HTML exports:** small, bottom-right corner, ~24 px at 0.4 opacity.
 - **As loading spinner:** the central hexagon rotates while the surrounding 6 fade in sequence.
 - **As background hero element on `/welcome`:** large (~280 px), slightly off-center-right, very low opacity (0.08), cropped by the viewport edge.
- **Shadows:** sparingly used. One elevation token: `--shadow-card` for cards (`0 1px 2px rgba(0,0,0,0.04), 0 1px 1px rgba(0,0,0,0.02)`), one for popovers (`0 8px 24px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)`). No more. Shadows in dark mode: invert to subtle inset highlight on top edge instead — 2025 dark-mode best practice.
- **Borders over shadows for separation** wherever possible. Borders are honest; shadows are dramatic. INDXR is restrained.

### 6.3 A one-line aesthetic statement

> **INDXR is a quiet, warm, technical tool — restrained but not barren, geometric but not clinical, considered in the moments most products neglect.**

This sentence is the test. When a working session generates a screen, ask: does this feel quiet? warm? technical? restrained-but-not-barren? geometric-but-not-clinical? considered? If any answer is "no," iterate.

**Test against ihsan principles:**
- ✓ All seven, by construction.

---

## 7 · Library & Transcript View — Patterns, Not Redesigns

Per the brief, Batch 3B provides patterns for working sessions, not full redesigns.

### 7.1 Library page patterns

**View modes:**
- Two views: **Rows** (default, dense, mobile-friendly) and **Cards** (richer thumbnails for visual scanning). Toggle in the top-right of the page header. Persist per-user.
- **No grid view**. Notion-database-style grids are valuable when the data has many fields to compare at once; transcripts have ~6 fields and are better in rows.

**Sort/filter UX:**
- **Top-bar pattern** on desktop (Linear-issue-list inspired): persistent toolbar above the list with a search input, a "Sort by ..." button (opens popover), and chip-style filter buttons (Source, Status, Collection, Date range).
- **Bottom-sheet** on mobile (per §2.3).
- Active filters render as removable chips between the toolbar and the list — same pattern as Linear, Notion database filters, Airtable. Honest about state.

**Search bar:**
- Inline at the left of the toolbar, 280 px wide on desktop.
- `Cmd/Ctrl + K` opens a global command palette (deferred to working session) for power-user search across everything; the inline search is library-scoped.
- Empty search results: hexagon-centered illustration + "Nothing matches '[query]'. Try fewer words, or [clear search]."

**Empty states (full Library is empty):**
- Hexagonal central illustration with a small play-button icon at center.
- Headline: "Geen transcripts nog" / "No transcripts yet" — bilingual where appropriate.
- Sub: "Plak een YouTube-URL om je eerste transcript te maken."
- Primary button: "Transcribe a video" → `/dashboard/transcribe`.
- Secondary link: "Bekijk hoe het werkt" → `/docs/getting-started`.

**Bulk actions:**
- Multi-select via row checkbox (visible on hover desktop, always-visible mobile after long-press).
- Floating action bar appears at the bottom of the page when ≥ 1 selected, with: Add to collection, Export, Delete.
- Selection survives page changes (paginated lists); cleared on route change.

**Collections (playlists) UX:**
- Filter chip "Collection: [name]" in the toolbar.
- Collection management lives at `/dashboard/library/collections` (sibling route, not a tab) — Khidr can decide in working session whether this needs a separate dedicated screen.
- A transcript can belong to multiple collections (tag-like). Drag-and-drop is **deferred**; not worth the implementation cost in a solo-dev pre-launch sprint. Multi-select + "Add to collection" covers the workflow.
- No sidebar tree of collections — keeps the sidebar flat (per §1.3).

**Card design — at-a-glance fields (in priority order):**
1. Thumbnail (16:9, 96 × 54 in row mode, 240 × 135 in card mode)
2. Title (truncated to 2 lines)
3. Source badge (YouTube logo, "Audio file", "URL") — small, subtle
4. Duration (e.g., "12:34") — monospace via Plex Mono
5. Status (only if ≠ Done — "Processing", "Failed")
6. Date (relative — "2 hours ago", "Yesterday")
7. Collection badges (max 2 visible, "+N" if more)

Right edge: `MoreHorizontal` icon → context menu (Open, Export, Add to collection, Rename, Delete).

### 7.2 Transcript detail view patterns

**Tabs vs alternatives:**
- The current Tabs (Transcript / AI Summary / RAG Export) are **navigation**, not filtering — they switch between completely different views with different content. **Keep tabs** (per Mews/Lyft 2025 segmented-control vs tabs research: tabs for distinct views, segmented control for same-content alternative-presentation).
- On desktop ≥ `xl`, consider a **side-by-side panels** mode: editor left (60% width), AI Summary collapsible right (40%). Toggle in the topbar. **Defer to working session** — the panel-resize affordance has many small choices.
- Mobile: segmented control as in §2.3, three segments.

**Reading mode vs editing mode:**
- **Read** is default. Editor is loaded with `editable: false`.
- **Edit toggle** in the topbar (a `Pencil` ghost icon-button). Toggles `editable: true`, reveals the fixed top toolbar.
- **No auto-save during edit** — explicit "Save" in topbar (or `Cmd/Ctrl + S`) writes to backend, with inline persistent status state ("Saved 2s ago" — per Khidr's no-toast hard rule). Auto-save without a visible save event is uncomfortable for editing transcripts where users may want to revert.
- Discard-changes confirm dialog if `Esc` pressed with dirty state.

**Export menu placement:**
- Topbar, far-right: `Download` icon → popover on desktop, bottom sheet on mobile.
- Lists 6–8 formats, each with a one-line description and a "Copy to clipboard" alternative for short formats.
- "Copy markdown for Notion" and "Copy with Obsidian wikilinks" are first-class entries — INDXR's audience explicitly includes Notion/Obsidian users.

**Metadata display:**
- A compact metadata strip below the title: source · duration · language · transcribed-at.
- "Details" disclosure expands to show: source URL (with copy button), word count, character count, file size if applicable, processing model used.

**Search-within-transcript UI (already implemented as Tiptap extension; UI patterns to amplify):**
- Persistent search affordance: a small `Search` icon-button in the topbar (right of the Edit toggle). Click → opens a slim search bar in the topbar (not a modal), with prev/next match navigation arrows and a match counter ("3 / 17").
- Cmd/Ctrl + F intercepted to open this bar (only when transcript view is focused; falls back to browser find otherwise via shift+ modifier).
- Highlighted matches use the amber accent at 0.30 alpha; current match at 0.55 alpha. Coherent with the rest of the system.

**Test against ihsan principles:**
- ✓ Honest Materiality — tabs for navigation, segmented control where it would be wrong.
- ✓ Itqan — Notion/Obsidian copy as first-class export, "Saved 2s ago" inline state, search match counter.
- ✓ Quiet Quality — no auto-save toasts, no animation noise.
- ✓ Coherence — same patterns as Library page (chip filters, bottom sheets on mobile).
- ✓ No Israf — drag-and-drop and side-by-side panels deferred until needed.

---

## 8 · Cross-Cutting — What This Enables for Synthesis & Working Sessions

### 8.1 How Batch 3B composes with prior batches

- **Batch 1 (identity):** colors, fonts, hexagon — Batch 3B *uses* these (hexagon pattern map §5, drop caps in §5.3, hex spinner) without redefining them.
- **Batch 2 (architecture):** tokens, breakpoints, shadcn primitives — Batch 3B *operates within* these (sidebar uses shadcn `Sidebar`, mobile patterns use Radix `Sheet`, animations use the duration scale, beauty utilities are CSS variables).
- **Batch 3A (IA & naming):** 6 sidebar items, two-way support, `/docs` umbrella — Batch 3B *concretizes* these (icon assignments, mobile tab mapping, `/docs` template variants).

No conflicts. Batch 3B inherits all prior decisions and instantiates them.

### 8.2 Implementation order (for the 7-phase Batch 2 rollout)

The natural sequence for working sessions:

1. **Token system (Batch 2).** Already planned phase 1.
2. **Sidebar redesign (§1.3).** Single trigger, three states, persistence. This is a foundation other things assume.
3. **Mobile chrome (§2.2).** Bottom tab bar + drawer for Account/Settings. Can ship in parallel with sidebar after tokens are live.
4. **Beauty layer infrastructure (§5).** SVG hexagon asset, opacity tokens, `.bg-hex-pattern` utility. Cheap to install; everything downstream uses it.
5. **Empty-state and error/loading components (§5.2 + §7.1).** These are templates the working sessions can compose.
6. **Tiptap optimization (§3.3).** Read/edit toggle, BubbleMenu, FloatingMenu, slash commands, then custom extensions (TimestampMark first).
7. **Library and Transcript-view refinements (§7).** Working-session work; patterns from Batch 3B feed direct decisions.
8. **Marketing pages, /docs landing, public tool page.** Larger surface but lower complexity once design system is settled.

### 8.3 What to defer to working sessions

Decisions that are not research-shaped — they're pixel-level or workflow-level and need Khidr in the seat with Claude:

- Exact spacing inside cards (8 vs 12 px).
- Specific copy in empty states (Dutch/English mix, voice).
- Specific illustrations — drawn during a session, not researched.
- Side-by-side panels in `/dashboard/library/[id]` — try it, see if it adds value.
- Drag-and-drop for collections — re-evaluate after launch with usage data.
- Command palette `Cmd/Ctrl + K` scope and contents.
- Pricing page hero specific layout.
- Marketing homepage sections beyond the "Try it free" CTA hand-off to `/youtube-transcript-generator`.
- Welcome-page first-time-user flow specifics.

### 8.4 What `wiki/design/system.md` needs to contain

A complete synthesis document, ordered so working sessions can navigate it like a reference:

1. **Identity** (from Batch 1): typography stack with multi-script notes, color palette in OKLCH with light/dark token names, hexagon mark usage rules, the one-line aesthetic statement (§6.3).
2. **Tokens** (from Batch 2): full token table with names, values, semantic mappings; the `@theme inline` block; spacing, breakpoint, animation duration scales.
3. **Components — primitives** (Batch 2): shadcn primitives in use, which are kept as-is, which are role-token-rewired.
4. **Components — composed** (new in 3B):
 - `Sidebar` config and state machine (§1.3).
 - `MobileTabBar` (§2.2).
 - `BubbleMenu` / `FloatingMenu` / `Toolbar` config for Tiptap (§3.3).
 - `EmptyState` template with hexagon central illustration (§5.2 + §7.1).
 - `ErrorPage` and `NotFound` page templates (§5.2).
 - `Loading` skeleton and full-page hexagon spinner (§5.3).
 - `SegmentedControl` vs `Tabs` decision matrix (§7.2).
5. **Patterns** (3B):
 - Beauty surface map (§5.2 table).
 - Mobile route patterns (§2.3).
 - Library list patterns (§7.1).
 - Transcript view patterns (§7.2).
 - `/docs` template variants (§4.3).
6. **The seven ihsan principles** restated, with concrete examples drawn from this batch.
7. **Animation reference**: durations, easings, when to animate, when not to.
8. **Accessibility checklist**: WCAG 2.2 AA targets per surface, AAA where free.
9. **Implementation order** (§8.2).
10. **Open questions / deferred to working sessions** (§8.3).

### 8.5 The transition from research → working sessions

Research can settle "what kind of thing this is." Working sessions settle "what this specific instance looks like." After Batches 1, 2, 3A, 3B, the open questions left should all be of the second kind:

- **Settled by research:** what an empty state contains, what density Library uses, what animation philosophy is, where hexagons appear, that we keep Tiptap, that we have one sidebar trigger.
- **For working sessions:** what specific copy "Geen transcripts nog" reads better than "Niets hier nog," whether the welcome card on Home is 2 columns or 1, what the exact hex-illustration for the Library empty state looks like, how the side-by-side panel resize handle behaves.

If Khidr and Claude in working sessions find themselves stuck on a *first-kind* question, that's a signal a research gap was missed and worth flagging back. From the four batches taken together, no major gap is visible.

---

## Closing — calibration verification

The brief asked specifically: **prior batches leaned too minimal; reconsider where research said "no decoration."** This batch deliberately reverses three earlier overcorrections:

1. **Empty states get illustrations.** Not "minimal text only." Hexagonal illustrations, drawn with care, central. (§5.2, §7.1)
2. **404, error, account-paused, login pages get hexagon backgrounds at higher opacity.** These are the Itqan-in-the-Invisible surfaces; they earn more beauty, not less. (§5.2)
3. **Drop caps, hex spinner, hex pull-to-refresh, hex-corner skeletons, divider-row hexagons in footer.** Five additional small Husn moments that, taken together, give INDXR character without bloating any single surface. (§5.3)

What the batch deliberately did **not** add:
- Pattern on working surfaces (Library list, Transcribe form, editor canvas).
- Multiple animation flourishes per page.
- Large hero illustrations on marketing.
- Heavy shadow / glassmorphism / 3D elements.

The line is held: **beauty that carries meaning, placed where it serves Itqan or coherence — quiet on the surfaces where the user is working.**

Batch 3B is complete. The synthesis to `wiki/design/system.md` and the working sessions can begin.