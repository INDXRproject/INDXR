# Frontend Design Audit — INDXR.AI V2

**Doel:** Pure inventarisatie als voorbereiding voor volledige redesign met Claude Design (Anthropic Labs).  
**Methode:** Handmatig alle layouts, pagina's, componenten, styling-bestanden en lib-files doorgelezen.  
**Datum:** 2026-04-28  
**Geen aanbevelingen, geen code-wijzigingen.**

---

## 1. Sitemap

Totaal: **47 routes** (11 client, 36 server), 4 layouts, 21 API routes.

### 1.1 Root & Marketing

| Route | Type | Auth | Beschrijving |
|-------|------|------|--------------|
| `/` | SERVER | — | Homepage: hero, FeatureCards, PersonaCard, TestimonialCard, CTA, Footer |
| `/login` | CLIENT | — | E-mail + wachtwoord login; Google OAuth (actief); Apple (uitgeschakeld) |
| `/signup` | CLIENT | — | Google Sign-In (inline SVG); geen e-mail+wachtwoord signup op deze pagina |
| `/forgot-password` | CLIENT | — | E-mailinvoer → bevestigingsview na verzenden |
| `/onboarding` | CLIENT | Ingelogd | 2-kolom stepper: checklist links (verborgen op mobile), Card-form rechts |
| `/pricing` | SERVER | — | Statische prijstabel; verwijst naar billing |
| `/faq` | SERVER | — | Native `<details>` HTML accordion |
| `/how-it-works` | SERVER | — | ArticleTemplate pagina |
| `/support` | SERVER | — | Statische pagina; **dark-only hardcoded kleuren** |
| `/suspended` | SERVER | Auth | Emoji + tekstboodschap, minimaal |

### 1.2 Dashboard

| Route | Type | Auth | Beschrijving |
|-------|------|------|--------------|
| `/dashboard` | SERVER | Ingelogd | 2 stat-kaarten (Total Transcripts, Total Minutes); placeholder "Recent Activity" |
| `/dashboard/transcribe` | CLIENT | Ingelogd | Tabs (Video/Playlist/Audio); WelcomeCreditCard (conditioneel); SaveErrorModal; auto-save |
| `/dashboard/library` | CLIENT | Ingelogd | Suspense-grens; zoek + grid/list-toggle; TranscriptList |
| `/dashboard/library/[id]` | SERVER | Ingelogd | Tab-navigatie via URL-params; TranscriptViewer / AiSummaryView / RagExportView |
| `/dashboard/billing` | SERVER | Ingelogd | Credits-kaart met glow-effect; BillingPurchaseGrid |
| `/dashboard/billing/success` | CLIENT | Ingelogd | Succesmelding; **hardcoded zinc**: `border-zinc-700 hover:bg-zinc-800` |
| `/dashboard/billing/cancel` | CLIENT | Ingelogd | Annuleringsmelding; **hardcoded zinc**: `bg-zinc-100 text-zinc-900 border-zinc-700` |
| `/dashboard/account` | SERVER | Ingelogd | ProfileSettingsCard; TransactionHistoryCard; SentryFeedbackCard |
| `/dashboard/settings` | SERVER | Ingelogd | ProfileSettingsCard; SecuritySettingsCard; DeveloperExportsCard |

### 1.3 Account (buiten dashboard-layout)

| Route | Type | Auth | Beschrijving |
|-------|------|------|--------------|
| `/account/credits` | CLIENT | — | **VEROUDERD**: toont oude pricing (1 credit = 10 min, Starter €9.99, "Coming Soon" knoppen) |

### 1.4 Admin (eigen layout)

| Route | Type | Auth | Beschrijving |
|-------|------|------|--------------|
| `/admin` | SERVER | ADMIN_EMAIL | Overview: 11 metrics, Recent Transcripts, Top Users |
| `/admin/users` | SERVER | ADMIN_EMAIL | Gebruikerslijst met acties (credits, suspend, delete) |
| `/admin/paid-users` | SERVER | ADMIN_EMAIL | Gefilterde lijst betalende gebruikers |
| `/admin/credits` | SERVER | ADMIN_EMAIL | Handmatig credits toewijzen via formulier |
| `/admin/transcripts` | SERVER | ADMIN_EMAIL | Alle transcripten; verwijderactie |
| `/admin/transcripts/[id]` | SERVER | ADMIN_EMAIL | Detail-view enkel transcript |

### 1.5 SEO / Tool Pages (youtube-transcript-generator layout)

#### Unieke tool-pagina (1)

| Route | Type | Bijzonderheid |
|-------|------|---------------|
| `/youtube-transcript-generator` | CLIENT | Bevat het echte free tool (VideoTab/PlaylistTab/AudioTab) + SEO-prose eronder; gebruikt `prose-content` CSS-klasse; enige SEO-pagina die CLIENT is |

#### ToolPageTemplate (10 pagina's)

Structuur: `max-w-3xl mx-auto`, AuthorCard, `prose-content` div, FAQ `<dl>`, Sources `<ul>`, Schema.org SoftwareApplication + FAQPage.

| Route | Template |
|-------|----------|
| `/youtube-to-text` | ToolPageTemplate |
| `/youtube-srt-download` | ToolPageTemplate |
| `/youtube-transcript-csv` | ToolPageTemplate |
| `/youtube-transcript-json` | ToolPageTemplate |
| `/youtube-transcript-markdown` | ToolPageTemplate |
| `/youtube-transcript-obsidian` | ToolPageTemplate |
| `/youtube-transcript-for-rag` | ToolPageTemplate |
| `/bulk-youtube-transcript` | ToolPageTemplate |
| `/audio-to-text` | ToolPageTemplate |
| `/youtube-playlist-transcript` | ToolPageTemplate |

#### ArticleTemplate (10 pagina's)

Identieke structuur aan ToolPageTemplate. Schema.org: Article + FAQPage.

| Route | Template |
|-------|----------|
| `/youtube-transcript-not-available` | ArticleTemplate |
| `/youtube-transcript-without-extension` | ArticleTemplate |
| `/youtube-age-restricted-transcript` | ArticleTemplate |
| `/youtube-members-only-transcript` | ArticleTemplate |
| `/youtube-transcript-non-english` | ArticleTemplate |
| `/alternative/downsub` | ArticleTemplate |
| `/alternative/happyscribe` | ArticleTemplate |
| `/alternative/notegpt` | ArticleTemplate |
| `/alternative/tactiq` | ArticleTemplate |
| `/alternative/turboscribe` | ArticleTemplate |

#### TutorialTemplate (3 pagina's)

Identieke structuur; voegt optioneel Schema.org `HowTo` toe als `steps` prop aanwezig.

| Route | Template |
|-------|----------|
| `/blog/youtube-transcripts-vector-database` | TutorialTemplate |
| `/blog/youtube-channel-knowledge-base` | TutorialTemplate |
| `/blog/chunk-youtube-transcripts-for-rag` | TutorialTemplate |

---

## 2. Layout Shell Inventaris

### 2.1 Root Layout (`src/app/layout.tsx`)

- **Render type:** SERVER
- **Font loading:** Next.js `localFont` voor `geistSans` en `geistMono` — CSS variabelen `--font-geist-sans` en `--font-geist-mono` gezet op `<html>`
- **ThemeProvider:** `next-themes`, `attribute="class"`, `defaultTheme="dark"`, `enableSystem`
- **Provider stack (buiten → binnen):** `ThemeProvider` → `PostHogProvider` → `AuthProvider` (ontvangt `initialUser` van server) → `Header` → `<main>` → `Toaster` (Sonner)
- **Tailwind `bg-background text-foreground`** op `<body>`
- **Metadata:** favicon, apple-touch-icon, web-app-manifest via `metadata` export
- **Geen** `loading.tsx`, `error.tsx`, `not-found.tsx` op root-niveau

### 2.2 Dashboard Layout (`src/app/dashboard/layout.tsx`)

- **Render type:** SERVER
- **Auth guard:** `await supabase.auth.getUser()` → redirect `/login` indien niet ingelogd; redirect `/suspended` indien `profiles.suspended`
- **Structuur:** `SidebarProvider` → `AppSidebar` + `SidebarInset` 
- **Min-height:** `min-h-[calc(100vh-65px)]` op het contentgedeelte
- **Pagina's:** alle `/dashboard/*` routes én `/dashboard/library/[id]`

### 2.3 Admin Layout (`src/app/admin/layout.tsx`)

- **Render type:** SERVER
- **Auth guard:** `admin.auth.admin.getUserById` + vergelijking met `ADMIN_EMAIL` env var → redirect `/` indien geen match
- **Navigatie:** eigen sticky nav (`h-14`, `max-w-7xl`), 5 items: Overview / Users / Paid Users / Credits / Transcripts
- **Geen AppSidebar** — volledig aparte shell van dashboard

### 2.4 YouTube Transcript Generator Layout (`src/app/youtube-transcript-generator/layout.tsx`)

- **Render type:** SERVER
- **Functie:** alleen `generateMetadata` export + `return children` — geen structurele shell
- **Alle 31 SEO/blog/alternatives-pagina's** vallen onder deze layout (of hebben geen expliciete layout en erven van root)

---

## 3. Component Inventaris

### 3.1 Feature Components (`src/components/`)

| Component | Type | Beschrijving |
|-----------|------|--------------|
| `Header.tsx` | CLIENT | Vaste sticky navigatie; transparant→frosted op scroll; desktop 4 items; mobile Sheet (w-[300px]); logo: 2 PNG-paren (mark + wordmark) voor dark/light |
| `Footer.tsx` | SERVER | 3 FooterColumn (Export Formats, Guides, Compare); CSS vars |
| `app-sidebar.tsx` | CLIENT | Collapsible w-14/w-64 (localStorage); drag-drop naar collecties; inline collectie-CRUD; storage-meter (Progress); nav-guard waarschuwingskaart voor actieve playlist-job |
| `TranscriptCard.tsx` | CLIENT | Export-hub: 9 formaten (TXT plain/timestamps, MD/MD+ts, SRT, VTT, CSV, JSON, RAG JSON); DropdownMenu; Reader Mode toggle (Switch); Sign-up nudge banner; RAG modal met chunk-size keuze; credits-check |
| `PlaylistManager.tsx` | CLIENT | URL-invoer, playlist-fetch, checkbox-selectie, availability-check flow, extractie-trigger; inline `formatElapsed`-helper |
| `PlaylistAvailabilitySummary.tsx` | CLIENT | Toont beschikbaarheidsresultaten (has_captions / needs_whisper / unavailable) |
| `AuthModal.tsx` | CLIENT | Dialog; login + signup mode; wachtwoordvalidatie-checklist inline; OAuth-knoppen aanwezig maar disabled ("coming soon"); gebruikt CSS vars (`var(--bg-surface)` etc.) |
| `SaveErrorModal.tsx` | CLIENT | Modal voor save-fouten in de transcribe-flow |
| `CreditBalance.tsx` | CLIENT | `Coins` icon (hardcoded `text-yellow-500`); link naar /pricing; semantische tokens |
| `FeatureCard.tsx` | SERVER | Icon + titel + beschrijving; `dark:shadow-none`; CSS vars |
| `HeroImage.tsx` | CLIENT | `hero-light.jpg` / `hero-dark.jpg` via `dark:hidden` / `hidden dark:block`; gradient-fade naar bg-base |
| `UserAvatar.tsx` | CLIENT | Gebruikersinitialen of User-icon; **hardcoded zinc**: `bg-zinc-800 border-2 border-zinc-700 text-zinc-400 text-zinc-300` |

### 3.2 Library Components (`src/components/library/`)

| Component | Type | Beschrijving |
|-----------|------|--------------|
| `TranscriptList.tsx` | CLIENT | Kaartgrid met thumbnail, Badge (processing method), DropdownMenu (view/download/delete/bulk-download), bulk-selectie via Checkbox; JSZip voor bulk-download; `getRelativeTime` helper |
| `TranscriptViewer.tsx` | CLIENT | **Tiptap** (zie §3.5); transcript als Tiptap JSONContent met `.ts-link` nodes; SearchExtension (custom ProseMirror Plugin + DecorationSet); zoekbalk; Reader Mode toggle |
| `AiSummaryView.tsx` | CLIENT | **Tiptap** (zie §3.5); StarterKit; inline toolbar (Bold/Italic/Underline/BulletList/OrderedList); edit/read-only toggle; slaat HTML op via `editor.getHTML()` |
| `RagExportView.tsx` | CLIENT | Export-history tabel; chunk-size radiobuttons (30/60/90/120s); "Export RAG JSON — Free" knop; gebruikt `var(--bg-surface)` inline |

### 3.3 Free Tool Components (`src/components/free-tool/`)

| Component | Type | Beschrijving |
|-----------|------|--------------|
| `VideoTab.tsx` | CLIENT | URL-invoer; extraction-flow met caption → Whisper cascade; TranscriptCard output; polling via `pollWhisperJob` |
| `AudioTab.tsx` | CLIENT | Bestandsupload; AssemblyAI transcriptie-flow |
| `PlaylistTab.tsx` | CLIENT | PlaylistManager wrapper in free-tool context |

### 3.4 Dashboard Components (`src/components/dashboard/`)

| Component | Type | Beschrijving |
|-----------|------|--------------|
| `WelcomeCreditCard.tsx` | CLIENT | Toont 25 gratis credits aanbieding; 3-kolom uitleg (Video/Playlist/Audio); "Claim 25 Free Credits" + "Buy More Credits"; verdwijnt na claimen of als al geclaimd |
| `billing/BillingPurchaseGrid.tsx` | CLIENT | 5-kolom grid (1 col mobile, 2 tablet, 5 desktop) van PricingCards; fetch POST naar /api/stripe/checkout |
| `settings/ProfileSettingsCard.tsx` | CLIENT | Username/role/avatar-kleur bewerken; avatarkleur kiezer via `bg-red-500`, `bg-orange-500` etc. (hardcoded Tailwind kleuren); ServerAction `updateProfileAction` |
| `settings/SecuritySettingsCard.tsx` | CLIENT | Wachtwoord wijzigen via `<form>` |
| `settings/DeveloperExportsCard.tsx` | CLIENT | RAG chunk-size voorkeur instellen |
| `settings/TransactionHistoryCard.tsx` | CLIENT | Tabel van laatste 20 transacties |
| `settings/SentryFeedbackCard.tsx` | CLIENT | Sentry feedback widget |

### 3.5 Content Components (`src/components/content/`)

| Component | Type | Beschrijving |
|-----------|------|--------------|
| `templates/ToolPageTemplate.tsx` | SERVER | `max-w-3xl mx-auto px-4 py-12`; AuthorCard; `prose-content` div; FAQ `<dl>`; Sources `<ul>`; Schema.org SoftwareApplication + FAQPage |
| `templates/ArticleTemplate.tsx` | SERVER | Identieke structuur aan ToolPageTemplate; Schema.org Article + FAQPage |
| `templates/TutorialTemplate.tsx` | SERVER | Identieke structuur; voegt Schema.org HowTo toe indien `steps` aanwezig |
| `AuthorCard.tsx` | SERVER | Auteur-metadata (naam, rol, avatar); gebruikt `lib/authors.ts` |
| `seo/JsonLd.tsx` | SERVER | `<script type="application/ld+json">` injectie |

### 3.6 UI Primitives (`src/components/ui/`) — 27 bestanden

Shadcn/ui gekopieerd in de codebase (niet npm). Geen externe package.

| Component | Opmerkingen |
|-----------|-------------|
| `button.tsx` | Variants: default / destructive / outline / secondary / ghost / link; heeft `dark:` classes |
| `card.tsx` | `bg-card text-card-foreground`; semantische tokens |
| `empty-state.tsx` | **KRITIEK DARK-ONLY**: hardcoded zinc (`border-zinc-800`, `bg-zinc-900/30`, `text-zinc-500`, `text-white`, `text-zinc-400`) — breekt in light mode |
| `loading-skeleton.tsx` | `bg-muted`; design-system compliant; inline style voor aflopende breedtes |
| `logo.tsx` | SVG bar-chart icoon (5 verticale rechthoeken), `currentColor` — NIET de echte PNG-logo; gebruikt als programmatisch fallback mark |
| `pricing-card.tsx` | SERVER; semantische Tailwind tokens; berekent per-minuut-kosten |
| `credit-balance.tsx` | Alternatieve credit-display component |
| `theme-toggle.tsx` | Sun/Moon icon toggle; heeft `dark:` classes |
| `PasswordInput.tsx` | Input + Eye/EyeOff toggle |
| `alert.tsx` | Heeft `dark:` classes |
| `badge.tsx` | Heeft `dark:` classes |
| `input.tsx` | Heeft `dark:` classes |
| `select.tsx` | Heeft `dark:` classes; extra zinc kleur: `text-zinc-500` |
| `sidebar.tsx` | Uitgebreide Shadcn sidebar primitief; heeft `dark:` classes |
| `progress.tsx` | Gebruikt voor storage-meter in sidebar; heeft extra kleur |
| `dialog.tsx` | Heeft `dark:` classes |
| `dropdown-menu.tsx` | Heeft `dark:` classes |
| `checkbox.tsx` | Heeft `dark:` classes |
| Overige 9 | Standard Shadcn/ui: table, tooltip, alert-dialog, scroll-area, sheet, tabs, switch, label, form |

### 3.7 Tiptap Subsectie (uitgebreid)

**Gebruikte bestanden:** uitsluitend `AiSummaryView.tsx` en `TranscriptViewer.tsx`.

**Package-versies (package.json):**
- `@tiptap/react`
- `@tiptap/starter-kit`
- `@tiptap/core`
- `@tiptap/pm` (ProseMirror bindings)

#### AiSummaryView (`src/components/library/AiSummaryView.tsx`)

| Aspect | Waarde |
|--------|--------|
| `immediatelyRender` | `false` (SSR hydration guard) |
| Extensions | `StarterKit` (bulletList + orderedList geconfigureerd), geen custom extensions |
| Toolbar | Inline floating toolbar: Bold, Italic, Underline, BulletList, OrderedList — 5 knoppen |
| Editor modus | Schakelt via `useEffect → editor.setEditable(true)` bij edit-mode |
| Content opslag | HTML via `editor.getHTML()` → `ai_summary` kolom in Supabase |
| Bubble/floating menu | Geen |
| Styling | `prose`-klasse op container; `.prose ul` en `.prose ol` in globals.css geforceerd met `!important` |
| Mobile-gedrag | Niet gedocumenteerd |

#### TranscriptViewer (`src/components/library/TranscriptViewer.tsx`)

| Aspect | Waarde |
|--------|--------|
| `immediatelyRender` | `false` (SSR hydration guard) |
| Extensions | `StarterKit` + custom `SearchExtension` |
| SearchExtension | ProseMirror Plugin + `DecorationSet`; zoekt door tekst-nodes; bouwt `DecorationSet.create` voor highlight-decoraties |
| Zoekhighlight stijl | Inline style `background-color: var(--color-warning)` op DecorationSet |
| Transcript rendering | Transcript-items omgezet naar Tiptap JSONContent; tijdstempels als `.ts-link` anchor-nodes |
| Content opslag | Niet opgeslagen (read-only viewer); bewerkingen → `edited_content` kolom (JSON) |
| Zoekbalk | Eigen zoek-input boven de editor; `.hide-timestamps` CSS-klasse via `<div className>` |
| Bubble/floating menu | Geen |

---

## 4. Styling Inventaris

### 4.1 CSS Variable Systeem (`src/app/globals.css`, 395 regels)

Bevat één CSS-bestand voor het gehele design system.

**Toplevel structuur:**
1. `@import url(...)` — JetBrains Mono (Google Fonts)
2. `@import 'tailwindcss'`
3. `@custom-variant dark (&:is(.dark *))`
4. `@theme inline { ... }` — Tailwind v4 `@theme` block: koppelt CSS vars aan Tailwind utility names
5. `:root { ... }` — light mode tokens
6. `.dark { ... }` — dark mode tokens
7. `@layer base { ... }` — globale `border-border outline-ring/50`; `bg-background text-foreground` op body
8. Utility CSS-klassen: `.ts-link`, `.hide-timestamps`, `.prose ul/ol/li`, `.read-only-mode`, `.prose-content` (volledige typografie-set)

**Light mode (`:root`):**

| Token | Waarde |
|-------|--------|
| `--bg-base` | `#f8f9fa` |
| `--bg-surface` | `#ffffff` |
| `--bg-elevated` | `#ffffff` |
| `--border` | `#e2e4e8` |
| `--text-primary` | `#111111` |
| `--text-secondary` | `#555555` |
| `--text-muted` | `#888888` |
| `--accent` | `#2563eb` |
| `--accent-hover` | `#1d4ed8` |
| `--color-success` | `#16a34a` |
| `--color-warning` | `#d97706` |
| `--color-error` | `#dc2626` |
| `--radius` | `6px` |
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.1)` |

**Dark mode (`.dark`):**

| Token | Waarde |
|-------|--------|
| `--bg-base` | `#111111` |
| `--bg-surface` | `#1a1a1a` |
| `--bg-elevated` | `#222222` |
| `--border` | `#2a2a2a` |
| `--text-primary` | `#f0f0f0` |
| `--text-secondary` | `#888888` |
| `--text-muted` | `#666666` |
| `--accent` | `#2563eb` (zelfde als light) |

**Semantische mapping (Shadcn/ui compatibel):**
- `--primary` → `var(--accent)`
- `--muted` → `var(--bg-elevated)`
- `--destructive` → `var(--color-error)`
- `--success`, `--warning`, `--info` beschikbaar als tokens

**Sidebar tokens:** aparte set `--sidebar-*` in zowel light als dark.

**Chart colors:** 5 kleuren (blue, green, amber, red, purple); licht en donker hebben iets verschillende hex-waarden.

### 4.2 Tailwind Configuratie (`tailwind.config.ts`)

- **Framework:** Tailwind CSS v4 (plugin-gebaseerd, geen `tailwind.config.js` nodig voor v4 core, maar bestand aanwezig voor backward compat)
- **Content paths:** `./src/pages/**`, `./src/components/**`, `./src/app/**`
- **borderRadius extension:** `lg`, `md`, `sm` via `var(--radius)`
- **fontFamily extension:**
  - `sans`: `SF Pro Display, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif`
  - `mono`: `SF Mono, Menlo, Consolas, monospace`
- **Plugins:** `[]` (leeg — geen plugins)

> **Discrepantie:** `tailwind.config.ts` declareert SF Pro Display, maar `globals.css @theme inline` overschrijft dit met `--font-sans: var(--font-geist-sans), system-ui, sans-serif`. Effectief actief font: **Geist** (Google Fonts via Next.js). De `tailwind.config.ts` fontdeclaraties zijn niet effectief.

### 4.3 PostCSS (`postcss.config.mjs`)

- `@tailwindcss/postcss` plugin — standaard Tailwind v4 PostCSS setup
- Geen custom PostCSS-plugins

### 4.4 Next.js Config (`next.config.ts`)

- **Images:** `remotePatterns` voor `i.ytimg.com`, `yt3.ggpht.com`, `img.youtube.com` (YouTube thumbnails)
- **Server Actions body limit:** `30mb` (audio-upload via preflight)
- **Proxy client max body size:** `30mb`
- **Sentry:** `withSentryConfig` wrapper; org `indxrai`, project `indxr-frontend`
- Geen styling-relevante configuratie

### 4.5 Fonts

| Font | Bron | Gebruik | CSS var |
|------|------|---------|---------|
| Geist Sans | Google Fonts via `next/font/local` | Body, UI tekst | `--font-geist-sans` |
| Geist Mono | Google Fonts via `next/font/local` | Mono tekst | `--font-geist-mono` |
| JetBrains Mono | Google Fonts `@import` in globals.css | Mono override in `@theme inline` | `--font-mono` → `JetBrains Mono, Menlo, Consolas` |

> `--font-mono` in `@theme inline` stelt JetBrains Mono in als `font-mono` Tailwind klasse. `--font-sans` gebruikt Geist.

### 4.6 Hardcoded Kleuren (buiten CSS vars)

| Bestand | Kleur(en) | Context |
|---------|-----------|---------|
| `src/app/signup/page.tsx` | `#4285F4`, `#34A853`, `#FBBC05`, `#EA4335` | Google brand kleuren in SVG logo |
| `src/app/login/page.tsx` | `text-red-500`, `bg-red-500/10` | Error-div inline foutmelding |
| `src/app/forgot-password/page.tsx` | `bg-success/10`, `text-success` | Succes-state na e-mailverzending |
| `src/app/support/page.tsx` | `text-white`, `text-zinc-400`, `bg-zinc-900/50`, `border border-white/10` | Volledige pagina dark-only |
| `src/app/dashboard/billing/success/page.tsx` | `border-zinc-700`, `hover:bg-zinc-800` | Knoppen |
| `src/app/dashboard/billing/cancel/page.tsx` | `bg-zinc-100 text-zinc-900 hover:bg-white`, `border-zinc-700 hover:bg-zinc-800` | Twee knoppen |
| `src/components/ui/empty-state.tsx` | `border-zinc-800`, `bg-zinc-900/30`, `bg-zinc-900`, `text-zinc-500`, `text-white`, `text-zinc-400` | Gehele component dark-only |
| `src/components/UserAvatar.tsx` | `bg-zinc-800`, `border-2 border-zinc-700`, `text-zinc-400`, `text-zinc-300` | Avatar-cirkel |
| `src/components/CreditBalance.tsx` | `text-yellow-500` | Coins-icoon |
| `src/components/dashboard/settings/ProfileSettingsCard.tsx` | `bg-red-500`, `bg-orange-500`, `bg-yellow-500`, `bg-green-500`, `bg-blue-500`, `bg-indigo-500`, `bg-purple-500`, `bg-pink-500` | Avatar-kleur kiezer |
| `src/components/TranscriptCard.tsx` | `border-green-500/25`, `bg-green-500/8` | "Meld je aan" nudge-banner |

### 4.7 Inline Styles

| Bestand | Gebruik |
|---------|---------|
| `src/app/signup/page.tsx` | `style={{ height: '32px', width: 'auto', minWidth: '100px' }}` op logo-img |
| `src/components/library/TranscriptViewer.tsx` | `style={{ background-color: var(--color-warning) }}` op search-decoraties |
| `src/components/ui/loading-skeleton.tsx` | `style={{ width: ... }}` voor aflopende widths |
| `src/components/HeroImage.tsx` | Geen inline styles — gradient via Tailwind classes |

---

## 5. Dark Mode Status

### 5.1 Implementatie

- `next-themes` met `attribute="class"` en `defaultTheme="dark"`
- `.dark` klasse op `<html>` element
- Tailwind `@custom-variant dark (&:is(.dark *))` in globals.css
- `ThemeToggle` component (Sun/Moon) beschikbaar als UI primitive

### 5.2 Globale CSS vars

Beide `:root` en `.dark` volledig ingevuld in globals.css — semantische tokens wisselen correct mee.

### 5.3 Componenten met expliciete `dark:` Tailwind classes

Componenten die expliciete `dark:` classes gebruiken (naast de CSS-var-gebaseerde approach):

| Component | Gebruik van `dark:` |
|-----------|---------------------|
| `Header.tsx` | `dark:bg-black/50` (frosted glasachtig op scroll), logo-afbeelding wisseling |
| `FeatureCard.tsx` | `dark:shadow-none` |
| `HeroImage.tsx` | `dark:hidden` / `hidden dark:block` (alternatieve hero-afbeeldingen) |
| `components/ui/button.tsx` | `dark:` border en hover states |
| `components/ui/alert.tsx` | `dark:` border states |
| `components/ui/badge.tsx` | `dark:` varianten |
| `components/ui/input.tsx` | `dark:` focus states |
| `components/ui/select.tsx` | `dark:` states |
| `components/ui/theme-toggle.tsx` | `dark:rotate-0 dark:scale-100` voor Sun/Moon rotatie |
| `components/ui/checkbox.tsx` | `dark:` varianten |
| `components/ui/dialog.tsx` | `dark:` overlay |
| `components/ui/dropdown-menu.tsx` | `dark:` states |
| `components/ui/sidebar.tsx` | `dark:` states |
| `components/free-tool/VideoTab.tsx` | `dark:` states |

### 5.4 Dark-only hardcoded componenten (breken in light mode)

| Component/Pagina | Probleem |
|-----------------|---------|
| `src/components/ui/empty-state.tsx` | Volledig hardcoded zinc — **geen light mode styling** |
| `src/app/support/page.tsx` | Volledig hardcoded dark — **geen light mode styling** |
| `src/components/UserAvatar.tsx` | Zinc-gekleurde achtergrond en tekst — **zichtbaar in light mode als donkere vlekken** |
| `src/app/dashboard/billing/cancel/page.tsx` | `bg-zinc-100 text-zinc-900` (one button light-only), `border-zinc-700 hover:bg-zinc-800` (one button dark-only) — **inconsistente mix** |

---

## 6. Mobile / Responsive Status

### 6.1 Breakpoints

- `use-mobile.ts`: `MOBILE_BREAKPOINT = 768` — `useIsMobile()` hook
- Tailwind breakpoints in gebruik: `sm:` (640px), `md:` (768px), `lg:` (1024px), `xl:` (1280px), `2xl:` (1536px)

### 6.2 Mobile Navigation

- `Header.tsx`: Sheet component (Shadcn/ui) met breedte `w-[300px]` voor mobile drawer
- AppSidebar: verbergen/tonen op mobile via `SidebarProvider`
- Admin layout: eigen horizontale scrollende nav, geen mobile-drawer

### 6.3 Responsive Patronen per Layout Zone

| Zone | Mobile | Desktop |
|------|--------|---------|
| Dashboard sidebar | Collapsible (button), `w-14` | `w-64` expandable |
| Header | Hamburger → Sheet nav | Inline nav items |
| BillingPurchaseGrid | 1-kolom | 5-kolom (`lg:grid-cols-5`) |
| WelcomeCreditCard | 1-kolom uitleg | 3-kolom grid (`md:grid-cols-3`) |
| Onboarding | Alleen rechter Card | 2-kolom (`md:grid-cols-2`) |
| SEO templates | `max-w-3xl` enkel kolom | Zelfde, max-width centreert op large screens |

### 6.4 Aandachtspunten

- Onboarding stepper (links) is `hidden md:flex` — volledig verborgen op mobile
- TranscriptCard: `flex-col sm:flex-row` op de header-sectie
- PlaylistManager: uitgebreide component, geen expliciete mobile-patronen gedocumenteerd

---

## 7. Cards / States Inventaris

### 7.1 Success States

| Component | Trigger | Weergave |
|-----------|---------|---------|
| `forgot-password/page.tsx` | E-mail verzonden | `bg-success/10` container + tekst |
| `billing/success/page.tsx` | Stripe payment compleet | Eigen pagina met bevestigingstekst |
| `AuthModal.tsx` | Login/signup gelukt | `toast.success()` via Sonner |
| `ProfileSettingsCard.tsx` | Profiel opgeslagen | `toast.success("Profile updated")` |
| `WelcomeCreditCard.tsx` | Credits geclaimd | `toast.success("25 Credits added...")` → kaart verdwijnt |

### 7.2 Error States

| Component | Trigger | Weergave |
|-----------|---------|---------|
| `login/page.tsx` | Auth fout | `text-red-500 bg-red-500/10` error-div (hardcoded) |
| `TranscriptCard.tsx` | Te weinig credits voor RAG | Inline banner `border-destructive/30 bg-destructive/5` |
| `VideoTab.tsx` | Extractie mislukt | `toast.error()` + inline foutmelding in UI |
| `AuthModal.tsx` | Auth mislukt | `toast.error()` |
| `SaveErrorModal.tsx` | Auto-save mislukt | Eigen modal (opent vanuit transcribe pagina) |
| Algemeen | Server fouten | Sonner toast |

### 7.3 Loading States

| Component | Loading Patroon |
|-----------|----------------|
| `TranscriptCard.tsx` | `Loader2` spinner in knoppen |
| `VideoTab.tsx` | `CardSkeleton` (loading-skeleton.tsx) tijdens laden |
| `TranscriptList.tsx` | Suspense boundary + skeleton |
| `BillingPurchaseGrid.tsx` | `loadingPlan` state → knoptekst "Redirecting..." |
| `WelcomeCreditCard.tsx` | `isClaiming` → "Claiming..." knoptekst |
| `ProfileSettingsCard.tsx` | `isSubmitting` → `Loader2` in submit-knop |

### 7.4 Empty States

| Component | Empty State |
|-----------|-------------|
| `src/components/ui/empty-state.tsx` | Centrale leeg-state component (dark-only zinc — zie §5.4) |
| `TranscriptList.tsx` | Eigen lege staat met tekst |
| Admin tables | `text-center text-muted-foreground` cel met "No transcripts yet" |
| `dashboard/page.tsx` | Placeholder "Recent Activity" sectie (geen echte data) |

### 7.5 Warning States

| Component | Warning Patroon |
|-----------|----------------|
| `app-sidebar.tsx` | Nav-guard waarschuwingskaart bij actieve playlist-job (verhindert navigeren) |
| `TranscriptCard.tsx` | Auth-nudge banner (`border-green-500/25 bg-green-500/8`) |
| `TranscriptCard.tsx` | "Not enough credits" banner (`border-destructive/30`) |
| Onboarding | Checklist met voltooiingsstatus |

---

## 8. Iconography

### 8.1 Icon Library

**Primaire library:** `lucide-react`

Unieke gebruikte icons (alfabetisch):

```
AlertCircle, Apple, ArrowLeft, ArrowRight, AudioWaveform, Bold, Check, CheckCircle2, 
CheckIcon, ChevronDown, ChevronDownIcon, ChevronRightIcon, ChevronUp, ChevronUpIcon, 
Chrome, Circle, CircleIcon, Clock, Coins, Copy, CreditCard, Download, ExternalLink, 
Eye, EyeOff, FileAudio, FileCode, FileJson, FileText, FileType, Film, Gift, Info, 
Italic, LayoutDashboard, LayoutGrid, Library, List, ListMusic, ListOrdered, ListVideo, 
Loader2, Lock, LogIn, LogOut, LucideIcon (type), Mail, Menu, Mic, Moon, PanelLeftIcon, 
Plus, Search, SearchIcon, Settings, Sparkles, Sun, Underline, UploadCloud, User, 
Video, X, XCircle, XIcon, Zap
```

Totaal: ~55 unieke icon-namen.

### 8.2 Logo Systeem

**Programmatisch mark:** `src/components/ui/logo.tsx` — SVG met 5 verticale rechthoeken (bar-chart stijl), `currentColor`, schaalt via `className`. NIET de echte merklogo.

**PNG/SVG logo bestanden:** `public/logo/` — 18 bestanden:

| Variant | Formaten | Thema's |
|---------|----------|---------|
| `indxr-mark` | .png, .svg | black-on-white, black-transparent, white-on-black, white-transparent |
| `indxr-wordmark` | .png, .svg | black-on-white, black-transparent, white-on-black, white-transparent |
| `indxr-horizontal` | .png, .svg | black-on-white, black-transparent, white-on-black, white-transparent |

**Gebruik in Header:** `indxr-mark-white-transparent.png` (dark) + `indxr-mark-black-transparent.png` (light) als mark; `indxr-wordmark-white-transparent.png` (dark) + `indxr-wordmark-black-transparent.png` (light) als wordmark. Beide via Next.js `<Image>` met `dark:hidden` / `hidden dark:block`.

**Favicons (`public/`):**
- `favicon.ico`
- `favicon.svg`
- `favicon-96x96.png`
- `apple-touch-icon.png`
- `web-app-manifest-192x192.png`
- `web-app-manifest-512x512.png`
- `site.webmanifest`

**Hero afbeeldingen:** `hero-light.jpg` en `hero-dark.jpg` in `/public/` — gebruikt in `HeroImage.tsx`.

### 8.3 Speciale Iconen

- `Coins` (lucide) in `CreditBalance.tsx` — geel gekleurd (`text-yellow-500`)
- `Sparkles` (lucide) — AI-gerelateerde functionaliteit
- Tiptap toolbar: Bold, Italic, Underline, ListOrdered (lucide icons in editor-toolbar)

---

## 9. Form Patterns

### 9.1 Form Libraries

**Geen react-hook-form of Formik** — alle formulieren gebruiken native HTML `<form>` met React `useState` voor veldwaarden en submitting-state.

Enige uitzondering: `src/components/ui/form.tsx` bestaat (Shadcn/ui FormProvider wrapper voor react-hook-form), maar wordt nergens in de app-code gebruikt.

### 9.2 Patronen per Pagina

| Pagina/Component | Pattern | Actie |
|-----------------|---------|-------|
| `login/page.tsx` | `useState` + `onSubmit` handler | Directe Supabase `signInWithPassword` client-call |
| `signup/page.tsx` | Google OAuth knop | `supabase.auth.signInWithOAuth({ provider: 'google' })` |
| `forgot-password/page.tsx` | `useState` + `onSubmit` | Supabase `resetPasswordForEmail` |
| `AuthModal.tsx` | `useState` + `<form onSubmit>` | Directe Supabase auth client-calls; wachtwoordvalidatie-checklist inline |
| `ProfileSettingsCard.tsx` | `useState` + `<form onSubmit>` | Server Action `updateProfileAction` via `FormData` |
| `SecuritySettingsCard.tsx` | `<form>` | Server Action voor wachtwoord wijzigen |
| `admin/credits/page.tsx` | `<form>` | Server-side form voor admin credits |
| `onboarding/page.tsx` | `useState` + `<form>` | Stappenflow |
| `VideoTab.tsx` | Controlled Input + button click | Geen `<form>`, directe fetch |
| `PlaylistManager.tsx` | Controlled Input + button click | Geen `<form>`, directe fetch |

### 9.3 Wachtwoordvalidatie

- `src/utils/validation.ts` bevat `validatePassword()` functie
- Requirements: min 8 tekens, 1 uppercase, 1 cijfer
- Inline checklist in `AuthModal.tsx` met `Check`/`X` lucide icons en `var(--color-success)` / `var(--text-muted)` kleuren

### 9.4 Stripe Checkout

- `BillingPurchaseGrid.tsx`: `fetch POST /api/stripe/checkout` → `{ url }` → `window.location.href = url` (Stripe Checkout redirect)
- Geen Stripe Elements/embedded form

### 9.5 Validatie

- Supabase auth: server-side validatie; client toont auth-error via `toast.error()`
- Input-validatie in API routes via Zod (server-side)
- Geen client-side Zod gebruik in form-bestanden

---

## 10. Inconsistenties & Tech Debt

### 10.1 Font Mismatch

`tailwind.config.ts` declareert SF Pro Display als `font-sans`, maar `globals.css @theme inline` stelt `--font-sans: var(--font-geist-sans)` in. Effectief actief is **Geist**. De tailwind.config declaraties hebben geen effect.

### 10.2 Verouderde Pagina

`/account/credits` toont de oude pricing-structuur (1 credit = 10 min, Starter €9.99, "Coming Soon" knoppen). Huidige pricing is 5-tier (Try €2.49 tot Power €49.99, 1 credit = 1 minuut). De pagina is niet verwijderd en bereikbaar.

### 10.3 Dark-Only Componenten

Drie bestanden hanteren uitsluitend hardcoded donkere kleuren en zijn niet bruikbaar in light mode:
- `src/components/ui/empty-state.tsx` (zinc-heavy)
- `src/app/support/page.tsx` (volledige pagina)
- `src/components/UserAvatar.tsx` (avatar-cirkel)

### 10.4 Inconsistente Auth Modal vs. Login/Signup Pagina's

- `AuthModal.tsx`: OAuth-knoppen (Google + Apple) aanwezig maar **disabled** met "OAuth providers coming soon"
- `login/page.tsx`: Google OAuth **actief** + Apple **uitgeschakeld**
- `signup/page.tsx`: alleen Google Sign-In (actief), geen e-mail+wachtwoord formulier
- Twee auth-flows naast elkaar met verschillende functionaliteiten

### 10.5 Billing Cancel/Success: Gemengde Token-aanpak

`billing/cancel/page.tsx` gebruikt tegelijk semantische tokens (`bg-primary`) én hardcoded zinc-klassen (`border-zinc-700`, `bg-zinc-100`) voor knoppen op dezelfde pagina.

### 10.6 `src/lib/utils.ts` Minimaal

`utils.ts` bevat uitsluitend `cn()` (clsx + tailwind-merge). Datum-formattering, duration-formatters en credit-formatters zijn inline in de respectievelijke componenten gedefineerd (bijv. `getRelativeTime`, `formatDuration` in `TranscriptList.tsx`; `formatElapsed` in `PlaylistManager.tsx`). Er is geen gedeelde formatter-bibliotheek.

### 10.7 `ui/logo.tsx` vs. PNG logo

`ui/logo.tsx` is een SVG bar-chart mark, niet de echte INDXR-merklogo. De werkelijke logo's zitten in `public/logo/`. De SVG-component wordt ergens als fallback/icoon gebruikt, maar is visueel niet de merkidentiteit.

### 10.8 FAQ: Native `<details>` Element

`/faq` gebruikt native HTML `<details>/<summary>` voor accordion in plaats van een Shadcn/ui Accordion-component. Stijl wordt niet door het design system beheerd.

### 10.9 `prose-content` Klasse Scope

`prose-content` CSS-klasse is gedefinieerd in globals.css (volledige typografie-set), maar `Tiptap`-editors gebruiken de `prose`-klasse met `!important` overrides. De twee prose-systemen bestaan naast elkaar.

### 10.10 Hardcoded Avatar Kleuren in Settings

`ProfileSettingsCard.tsx` gebruikt `AVATAR_COLORS` array met hardcoded Tailwind `bg-{color}-500` klassen. Dit zijn dynamisch gegenereerde classes die Tailwind's JIT-compiler mogelijk niet meeneemt tenzij ze elsewhere in de codebase ook voorkomen (safelist niet ingesteld).

### 10.11 Dubbele `claimed` Check in WelcomeCreditCard

Component heeft twee identieke null-checks voor `claimed` (`if (claimed === null || claimed === true)` gevolgd door `if (claimed === true || claimed === null)`) met een commentaar dat dit aangeeft als technische schuld.

### 10.12 TranscriptViewer: Tiptap JSONContent Schema

Transcript-items worden omgezet naar Tiptap JSONContent in de component zelf (niet via een utility). Geen centrale transformer.

---

## 11. Vragen voor Khidr

Beslissingen die moeten worden genomen vóór het redesign begint:

1. **Font-keuze:** Doorgaan met **Geist** (huidig effectief) of terug naar **SF Pro Display** (tailwind.config declaratie)? Of een derde optie? Dit beïnvloedt alle typografische tokens.

2. **Dark Mode als standaard:** `defaultTheme="dark"` staat nu ingesteld. Blijft dark mode de standaard voor nieuwe gebruikers, of wordt dit "system"?

3. **`/account/credits` pagina:** Verwijderen of updaten naar huidige pricing? De pagina is live en bereikbaar.

4. **Empty State component:** `ui/empty-state.tsx` is volledig dark-only. Wordt dit geherdesigned als onderdeel van de redesign, of tijdelijk gepatcht?

5. **AuthModal vs. login/signup flows:** De AuthModal heeft disabled OAuth-knoppen terwijl de echte login-pagina werkende Google OAuth heeft. Worden de twee flows samengevoegd? Of worden de rollen van AuthModal en login/signup pagina verduidelijkt?

6. **`ui/logo.tsx`:** Wordt de SVG-component (bar-chart mark) vervangen door de echte PNG-logo, of krijgt het een eigen rol als programmatisch icoon?

7. **SEO template uniformiteit:** Alle 31 SEO/blog/alternatives-pagina's gebruiken één van drie templates (Tool/Article/Tutorial) met identieke structuur. Wordt de redesign ook de template-structuur aanpassen, of alleen de stijl?

8. **FAQ accordion:** Wordt de native `<details>` in `/faq` vervangen door Shadcn Accordion tijdens redesign?

9. **`prose-content` vs. Tiptap `prose`:** Twee typografische systemen naast elkaar (globals.css `.prose-content` + Tiptap's `.prose` met `!important` overrides). Worden deze samengevoegd?

10. **Avatar-kleur kiezer:** De `AVATAR_COLORS` array in `ProfileSettingsCard.tsx` gebruikt hardcoded Tailwind-klassen die niet gegarandeerd in de JIT-compiler eindigen. Wordt dit systeem herontworpen of verwijderd?

11. **Sidebar collapsed state (w-14):** Sidebar in collapsed state toont alleen iconen (`w-14`). Is het gedrag in de redesign hetzelfde, of wordt dit een volledig verborgen/overlay sidebar?

12. **`/dashboard` "Recent Activity" placeholder:** De dashboard-startpagina heeft een onvolledige "Recent Activity" sectie. Is dit bewust (post-launch feature) of te implementeren als onderdeel van de redesign?
