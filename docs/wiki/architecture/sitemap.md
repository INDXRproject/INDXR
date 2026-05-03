# Sitemap — INDXR.AI V2

**Bron van waarheid voor routestructuur, navigatie, en redirects.**  
**Bijgewerkt:** 2026-05-03 (Werksessie A — drie-lagen architectuur vastgesteld)

---

## Drie-lagen architectuur

De INDXR.AI site is ingedeeld in drie lagen met duidelijke URL-grenzen en verantwoordelijkheden:

| Laag | URL-prefix | Doel | Auth |
|------|-----------|------|------|
| **1 — Marketing + vrije tool** | `indxr.ai/` | Publieke marketing, vrije tool, auth flows | Geen (optioneel) |
| **2A — Productdocumentatie** | `indxr.ai/docs/*` | Gebruikershandleidingen, FAQ, referentie | Geen |
| **2B — Articles** | `indxr.ai/articles/*` | SEO-content, vergelijkingen, blogs | Geen |
| **3 — Authenticated app** | `app.indxr.ai/*` | Dashboard, transcriptie, library, admin | Vereist |

> **Laag 3 (app.indxr.ai):** subdomain-migratie van `/dashboard/*` en `/admin/*` gepland voor Werksessie C. Op dit moment nog op `indxr.ai/dashboard/*` en `indxr.ai/admin/*`.

---

## Laag 1 — Marketing + vrije tool (`indxr.ai/`)

### Marketing

| Route | Type | Auth | Beschrijving |
|-------|------|------|--------------|
| `/` | SERVER | — | Homepage: hero, FeatureCards, PersonaCards, testimonials, CTA, Footer |
| `/pricing` | CLIENT | — | Kredietpakketten; verwijst naar /dashboard/billing |
| `/support` | CLIENT | — | Contactformulier (form submit nog niet geïmplementeerd) |
| `/about` | — | — | **GEPLAND** — nog niet gebouwd |
| `/privacy` | — | — | **GEPLAND** — nog niet gebouwd |
| `/terms` | — | — | **GEPLAND** — nog niet gebouwd |

### Auth flows (blijven op marketing domain)

| Route | Type | Auth | Beschrijving |
|-------|------|------|--------------|
| `/login` | CLIENT | — | E-mail + wachtwoord; Google OAuth |
| `/signup` | CLIENT | — | Registratie |
| `/forgot-password` | CLIENT | — | E-mailinvoer → bevestigingsview |
| `/onboarding` | CLIENT | Ingelogd | Username/role form → 25 welcome credits |
| `/suspended` | SERVER | — | "Account paused" foutpagina |
| `/auth/callback` | API route | — | Supabase OAuth callback |

### Vrije tool

| Route | Type | Auth | Beschrijving |
|-------|------|------|--------------|
| `/youtube-transcript-generator` | CLIENT | Optioneel | Gratis extractietool; eigen layout.tsx met metadata-override |

---

## Laag 2A — Productdocumentatie (`indxr.ai/docs/*`)

Alle doc-routes renderen via `DocsShell` — sidebar via `src/lib/docs-config.ts`.

### Hub + flat referentie

| Route | Type | Status | Beschrijving |
|-------|------|--------|--------------|
| `/docs` | SERVER | Live | Hub: sectie-overzicht |
| `/docs/getting-started` | SERVER | Live (content placeholder) | Onboarding en eerste stappen |
| `/docs/faq` | SERVER | Live | Veelgestelde vragen (absorbeert `/faq` via 301) |
| `/docs/account` | SERVER | Live | Credits en billing uitleg |
| `/docs/credits` | — | Gepland | Credits systeem uitleg |
| `/docs/accuracy` | — | Gepland | Transcriptie-nauwkeurigheid (hub + sub-pages) |
| `/docs/export-formats` | — | Gepland | Export-formaten hub + 6 sub-pages |
| `/docs/api` | — | Gepland (placeholder) | API-documentatie toekomstig |
| `/docs/limits` | — | Gepland | Rate limits, bestandslimieten |
| `/docs/privacy-handling` | — | Gepland | Hoe data verwerkt wordt |
| `/docs/languages` | — | Gepland | Ondersteunde talen |

### Subfolders

| Route | Status | Beschrijving |
|-------|--------|--------------|
| `/docs/how-to/[slug]` | Gepland | How-to handleidingen |
| `/docs/troubleshooting/[slug]` | Gepland | Probleemoplossing per issue |

---

## Laag 2B — Articles (`indxr.ai/articles/*`)

> **Huidige situatie (2026-05-03):** de 18 SEO-pagina's staan nog op top-level (`/youtube-transcript-not-available`, etc.) en 3 blog-artikelen onder `/blog/*`. Verhuizing naar `/articles/[slug]` is gepland voor Werksessie B.

### Gepland na Werksessie B

| Route | Status | Beschrijving |
|-------|--------|--------------|
| `/articles` | Gepland | Index van alle articles |
| `/articles/[slug]` | Gepland | Individuele article (huidige SEO-pagina's verhuizen hier) |

### Huidige tijdelijke locaties (worden `/articles/*` na Werksessie B)

**Transcriptie (8 routes, top-level):**

| Route | Template |
|-------|----------|
| `/youtube-transcript-not-available` | ToolPageTemplate |
| `/youtube-age-restricted-transcript` | ArticleTemplate |
| `/youtube-members-only-transcript` | ArticleTemplate |
| `/youtube-transcript-non-english` | ToolPageTemplate |
| `/bulk-youtube-transcript` | ToolPageTemplate |
| `/youtube-playlist-transcript` | ToolPageTemplate |
| `/audio-to-text` | ToolPageTemplate |
| `/youtube-transcript-without-extension` | ToolPageTemplate |

**Export (6 routes, top-level):**

| Route | Template |
|-------|----------|
| `/youtube-to-text` | ToolPageTemplate |
| `/youtube-transcript-markdown` | ToolPageTemplate |
| `/youtube-transcript-csv` | ToolPageTemplate |
| `/youtube-srt-download` | ToolPageTemplate |
| `/youtube-transcript-json` | ToolPageTemplate |
| `/youtube-transcript-for-rag` | ToolPageTemplate |

**Workflows (1 route, top-level):**

| Route | Template |
|-------|----------|
| `/youtube-transcript-obsidian` | ToolPageTemplate |

**Blog-artikelen (3 routes, onder `/blog/*`):**

| Route | Template |
|-------|----------|
| `/blog/chunk-youtube-transcripts-for-rag` | ArticleTemplate |
| `/blog/youtube-channel-knowledge-base` | ArticleTemplate |
| `/blog/youtube-transcripts-vector-database` | ArticleTemplate |

**Vergelijkingspagina's (5 routes onder `/alternative/*`) — worden VERWIJDERD:**

| Route | Status |
|-------|--------|
| `/alternative/downsub` | Live — te verwijderen |
| `/alternative/notegpt` | Live — te verwijderen |
| `/alternative/turboscribe` | Live — te verwijderen |
| `/alternative/tactiq` | Live — te verwijderen |
| `/alternative/happyscribe` | Live — te verwijderen |

---

## Laag 3 — Authenticated app (tijdelijk op `indxr.ai/dashboard/*` en `/admin/*`)

Auth-guard: `dashboard/layout.tsx` — redirect `/login` als geen user; redirect `/suspended` als `profile.suspended`.

### Dashboard

| Route | Type | Label | Beschrijving |
|-------|------|-------|--------------|
| `/dashboard` | SERVER | **Home** | Credits, transcribe CTA, messages preview, recent transcripts, stats |
| `/dashboard/transcribe` | CLIENT | Transcribe | Tabs: Video / Playlist / Audio; WelcomeCreditCard |
| `/dashboard/library` | CLIENT | Library | Zoek + grid/list-toggle; TranscriptList |
| `/dashboard/library/[id]` | SERVER | — | Tab-nav: Transcript / AI Summary / RAG Export |
| `/dashboard/messages` | SERVER | Messages | Berichten van admin (mock data — backend pending) |
| `/dashboard/billing` | SERVER | — | Credits-kaart; BillingPurchaseGrid |
| `/dashboard/billing/success` | CLIENT | — | Succesmelding na aankoop (geen auth-guard) |
| `/dashboard/billing/cancel` | CLIENT | — | Annuleringsmelding (geen auth-guard) |
| `/dashboard/account` | SERVER | Account | Profiel + transactiehistorie + Sentry feedback |
| `/dashboard/settings` | SERVER | Settings | Beveiliging, thema, developer exports |

### Admin (eigen layout, ADMIN_EMAIL vereist)

| Route | Beschrijving |
|-------|--------------|
| `/admin` | Overview: metrics, Recent Transcripts, Top Users |
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

- "Try it free" → `/youtube-transcript-generator`
- "Docs" → `/docs`
- "Log in" → `/login`
- "Start free" → `/signup`

### Dashboard sidebar

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

---

## Redirects

| Van | Naar | Type |
|-----|------|------|
| `/faq` | `/docs/faq` | 301 permanent |
| `/account/credits` | `/dashboard/account` | 301 permanent |
| `/how-it-works` | `/` | 301 permanent |

Gedefinieerd in `next.config.ts` → `async redirects()`.

---

## API routes (Next.js)

| Route | Methode | Beschrijving |
|-------|---------|--------------|
| `/api/extract` | POST | Caption-extractie (client-facing) |
| `/api/transcribe/whisper` | POST | Start Whisper-transcriptie-job |
| `/api/transcribe/preflight` | POST | Auth/rate-check vóór upload |
| `/api/video/metadata/[videoId]` | GET | Video titel + duur |
| `/api/playlist/extract` | POST | Start playlist-job |
| `/api/playlist/info` | GET/POST | Playlist metadata |
| `/api/playlist/jobs/[jobId]` | GET | Poll playlist-job status |
| `/api/jobs/[job_id]` | GET | Poll transcriptie-job status |
| `/api/check-playlist-availability` | POST | Captions vs. Whisper check |
| `/api/stripe/checkout` | POST | Stripe Checkout Session aanmaken |
| `/api/stripe/webhook` | POST | Stripe webhook (credits toewijzen) |
| `/api/ai/summarize` | POST | AI samenvatting (DeepSeek) |
| `/api/admin/*` | GET/POST | Admin CRUD operaties |

---

## Technische bestanden

| Bestand | URL | Status |
|---------|-----|--------|
| `public/robots.txt` | `/robots.txt` | Live |
| `public/llms.txt` | `/llms.txt` | Live (prijzen gesynchroniseerd 2026-05-03) |
| `public/site.webmanifest` | `/site.webmanifest` | Live |
| `src/app/sitemap.ts` | `/sitemap.xml` | Live (bijgewerkt 2026-05-03) |

---

## Scope-grenzen

- **`/alternative/*`** wordt VERWIJDERD per beslissing 2026-05-03 (geen comparison pages pre-launch)
- **Auth flows** blijven op marketing domain (`indxr.ai/login` etc.) — niet naar `app.indxr.ai` (Linear/Vercel pattern)
- **Subdomain split** (`app.indxr.ai`) is Werksessie C — niet nu
- **`/blog`** heeft geen index-pagina — 404 bij directe navigatie (known issue)
- **`/alternative`** heeft geen index-pagina — 404 bij directe navigatie (known issue, wordt opgelost bij verwijdering)
- **Changelog** — niet pre-launch bouwen (beslissing 2026-04-30)
- **llms.txt** — low-priority, geen AI-citation lever (onderzoek 2026-05-03); behouden maar niet uitbreiden
