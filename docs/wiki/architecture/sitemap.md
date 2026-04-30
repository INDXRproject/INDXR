# Sitemap — INDXR.AI V2

**Bron van waarheid voor routestructuur, navigatie, en redirects.**  
**Bijgewerkt:** 2026-04-30 (Grondverf Sessie 2 — structurele refactor)

---

## Route-tree

### Marketing

| Route | Type | Auth | Template / Beschrijving |
|-------|------|------|------------------------|
| `/` | SERVER | — | Homepage: hero, FeatureCards, PersonaCard, TestimonialCard, CTA, Footer |
| `/pricing` | SERVER | — | Statische prijstabel; verwijst naar billing |
| `/youtube-transcript-generator` | CLIENT | — | Publieke gratis tool (eigen layout) |
| `/support` | CLIENT | — | Twee-kaarten layout: hulp + suggestie + contactformulier |

### Auth

| Route | Type | Auth | Beschrijving |
|-------|------|------|--------------|
| `/login` | CLIENT | — | E-mail + wachtwoord; Google OAuth |
| `/signup` | CLIENT | — | Google Sign-In |
| `/forgot-password` | CLIENT | — | E-mailinvoer → bevestigingsview |
| `/onboarding` | CLIENT | Ingelogd | Welcome + 25 credits info + username/role form |
| `/suspended` | SERVER | — | "Account paused" — neutrale copy |

### Docs (nieuw — Grondverf Sessie 2)

Alle doc-routes renderen via `DocsShell` — sidebar links op basis van `src/lib/docs-config.ts`.

| Route | Type | Auth | Beschrijving |
|-------|------|------|--------------|
| `/docs` | SERVER | — | Umbrella landing: sectie-overzicht |
| `/docs/getting-started` | SERVER | — | Welkomstpagina / KHIDR: instructional content |
| `/docs/faq` | SERVER | — | FAQ content (absorbeert `/faq` via 301) |
| `/docs/account` | SERVER | — | Credits en billing uitleg / placeholder |

### SEO / Tool Pages

Alle routes hieronder renderen via `ArticleTemplate`, `ToolPageTemplate`, of `TutorialTemplate`  
— elk automatisch gewrapped in `DocsShell` (sidebar zichtbaar op lg+).

| Categorie | Voorbeeldroutes |
|-----------|----------------|
| Transcriptie | `/youtube-transcript-not-available`, `/youtube-age-restricted-transcript`, `/youtube-members-only-transcript`, `/youtube-transcript-non-english`, `/bulk-youtube-transcript`, `/youtube-playlist-transcript`, `/audio-to-text`, `/youtube-transcript-without-extension` |
| Export | `/youtube-to-text`, `/youtube-transcript-markdown`, `/youtube-transcript-csv`, `/youtube-srt-download`, `/youtube-transcript-json`, `/youtube-transcript-for-rag` |
| Workflows | `/youtube-transcript-obsidian`, `/blog/chunk-youtube-transcripts-for-rag` |
| Compare | `/alternative/downsub`, `/alternative/notegpt`, `/alternative/turboscribe`, `/alternative/tactiq`, `/alternative/happyscribe` |

### Dashboard (auth vereist, no-index)

| Route | Type | Label | Beschrijving |
|-------|------|-------|--------------|
| `/dashboard` | SERVER | **Home** | 5 secties: credits, transcribe CTA, messages preview, recent transcripts, stats |
| `/dashboard/transcribe` | CLIENT | Transcribe | Tabs: Video / Playlist / Audio; WelcomeCreditCard |
| `/dashboard/library` | CLIENT | Library | Zoek + grid/list-toggle; TranscriptList |
| `/dashboard/library/[id]` | SERVER | — | Tab-nav: Transcript / AI Summary / RAG Export |
| `/dashboard/messages` | CLIENT | Messages | Twee-kolom (list/detail); mock data; TODO backend hookup |
| `/dashboard/billing` | SERVER | — | Credits-kaart; BillingPurchaseGrid |
| `/dashboard/billing/success` | CLIENT | — | Succesmelding na aankoop |
| `/dashboard/billing/cancel` | CLIENT | — | Annuleringsmelding |
| `/dashboard/account` | SERVER | Account | Profiel + transactiehistorie + Sentry feedback |
| `/dashboard/settings` | SERVER | Settings | Preferences, notifications, developer exports |

### Admin (eigen layout, ADMIN_EMAIL vereist)

| Route | Beschrijving |
|-------|--------------|
| `/admin` | Overview: 11 metrics, Recent Transcripts, Top Users |
| `/admin/users` | Gebruikerslijst met credits/suspend/delete acties |
| `/admin/paid-users` | Gefilterde lijst betalende gebruikers |
| `/admin/credits` | Handmatig credits toewijzen |
| `/admin/transcripts` | Alle transcripten; verwijderactie |
| `/admin/transcripts/[id]` | Detail-view enkel transcript |

---

## Navigatie

### Marketing top-nav

```
[INDXR logo]   Pricing   Docs   [Try it free ↗]      Log in    Start free
```

- "Try it free" = accent-knop → `/youtube-transcript-generator`
- "Log in" = ghost link → `/login`
- "Start free" = outline knop → `/signup`

### Dashboard sidebar (6 items + credits coin)

```
  Home            (/dashboard)
  Transcribe      (/dashboard/transcribe)
  Library         (/dashboard/library)   [+ collections sub-tree]
  Messages        (/dashboard/messages)  [unread badge]
  ─────────────────────────────
  ◎ [credits]     (/dashboard/billing)
  Account         (/dashboard/account)
  Settings        (/dashboard/settings)
```

### MobileTabBar (< md viewport, 4 tabs)

```
  Home   |   Transcribe   |   Library   |   Messages [badge]
```

Zichtbaar op `< md` (768px). Sidebar `hidden` op `< md`. Tab-bar: `md:hidden fixed bottom-0`.

---

## Redirects

| Van | Naar | Type |
|-----|------|------|
| `/faq` | `/docs/faq` | 301 permanent |
| `/account/credits` | `/dashboard/account` | 301 permanent |
| `/how-it-works` | `/` | 301 permanent |

Gedefinieerd in `next.config.ts` → `async redirects()`.

---

## Scope-grenzen

- **SEO articles** (`/youtube-transcript-csv` etc.) leven op top-level, niet onder `/docs/`. Bereikbaar via DocsShell sidebar (docsConfig hrefs verwijzen naar de werkelijke top-level routes).
- **`/how-it-works`** bestaat nog als bestand (`src/app/how-it-works/page.tsx`) maar is 301-geredirect — niet aanpassen of verwijderen (SEO-veiligheid).
- **`/faq`** idem — bestand blijft, redirect in config.
- **`/account/credits`** is verouderd maar blijft bestaan voor legacy links — redirect naar `/dashboard/account`.
- **Changelog** — niet pre-launch bouwen (Khidr's beslissing, 2026-04-30).
