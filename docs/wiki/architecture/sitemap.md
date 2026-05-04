# Sitemap — INDXR.AI V2

**Bron van waarheid voor routestructuur, navigatie, en redirects.**  
**Bijgewerkt:** 2026-05-03 (Werksessie B — drie-lagen architectuur geïmplementeerd)

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

| Route | Type | Auth | Status | Beschrijving |
|-------|------|------|--------|--------------|
| `/` | SERVER | — | Live | Homepage: hero, FeatureCards, PersonaCards, testimonials, CTA, Footer |
| `/pricing` | CLIENT | — | Live | Kredietpakketten; verwijst naar /dashboard/billing |
| `/about` | SERVER | — | Live (scaffold) | Organisatie JSON-LD; content placeholder |
| `/contact` | CLIENT | — | Live | Contactformulier (vervangt /support via 301) |
| `/privacy` | SERVER | — | Live (scaffold) | 7 GDPR-secties; content placeholder |
| `/terms` | SERVER | — | Live (scaffold) | 7 secties; content placeholder |

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
| `/transcribe` | CLIENT | Optioneel | Gratis extractietool; eigen layout.tsx met metadata-override (was `/youtube-transcript-generator`, 301 redirect actief) |

---

## Laag 2A — Productdocumentatie (`indxr.ai/docs/*`)

Alle doc-routes renderen via `DocsShell` — sidebar via `src/lib/docs-config.ts`.
**Bijgewerkt:** 2026-05-04 (Batch 1, page-type 4 — hernest van flat naar categorische structuur)

### Hub

| Route | Type | Status | Beschrijving |
|-------|------|--------|--------------|
| `/docs` | SERVER | Live | Hub: DocsHubHero + FeaturedDocsGrid + 4× DocsCategorySection |

### Getting started

| Route | Type | Status | Beschrijving |
|-------|------|--------|--------------|
| `/docs/getting-started` | SERVER | Live (Tutorial layout) | Quickstart — HowTo JSON-LD |

### How INDXR works

| Route | Type | Status | Beschrijving |
|-------|------|--------|--------------|
| `/docs/how-indxr-works/overview` | SERVER | Live (scaffold) | High-level overzicht van het product |
| `/docs/how-indxr-works/credits` | SERVER | Live (scaffold) | Credits systeem |
| `/docs/how-indxr-works/accuracy` | SERVER | Live (scaffold) | Nauwkeurigheid hub |
| `/docs/how-indxr-works/accuracy/auto-captions` | SERVER | Live (scaffold) | Auto-captions nauwkeurigheid |
| `/docs/how-indxr-works/accuracy/ai-transcription` | SERVER | Live (scaffold) | AI transcriptie nauwkeurigheid |
| `/docs/how-indxr-works/export-formats` | SERVER | Live (scaffold) | Export-formaten hub |
| `/docs/how-indxr-works/export-formats/txt` | SERVER | Live (scaffold) | TXT export |
| `/docs/how-indxr-works/export-formats/markdown` | SERVER | Live (scaffold) | Markdown export |
| `/docs/how-indxr-works/export-formats/csv` | SERVER | Live (scaffold) | CSV export |
| `/docs/how-indxr-works/export-formats/srt` | SERVER | Live (scaffold) | SRT export |
| `/docs/how-indxr-works/export-formats/vtt` | SERVER | Live (scaffold) | VTT export |
| `/docs/how-indxr-works/export-formats/json` | SERVER | Live (scaffold) | JSON/RAG export |
| `/docs/how-indxr-works/languages` | SERVER | Live (scaffold) | Ondersteunde talen |
| `/docs/how-indxr-works/limits` | SERVER | Live (scaffold) | Rate limits en bestandslimieten |
| `/docs/how-indxr-works/api` | SERVER | Live (scaffold) | API referentie |

### Account & data

| Route | Type | Status | Beschrijving |
|-------|------|--------|--------------|
| `/docs/account-and-data/credits-and-billing` | SERVER | Live | Credits en billing (verhuisd van /docs/account) |
| `/docs/account-and-data/data-handling` | SERVER | Live (scaffold) | Hoe data verwerkt wordt (verhuisd van /docs/privacy-handling) |

### Help

| Route | Type | Status | Beschrijving |
|-------|------|--------|--------------|
| `/docs/help/faq` | SERVER | Live | Veelgestelde vragen (verhuisd van /docs/faq) |
| `/docs/help/how-to` | SERVER | Live (scaffold) | How-to handleidingen hub |
| `/docs/help/troubleshooting` | SERVER | Live (scaffold) | Probleemoplossing hub |

### Redirects (docs hernesting 2026-05-04)

| Van | Naar | Type |
|-----|------|------|
| `/faq` | `/docs/help/faq` | 308 |
| `/docs/credits` | `/docs/how-indxr-works/credits` | 308 |
| `/docs/accuracy` | `/docs/how-indxr-works/accuracy` | 308 |
| `/docs/accuracy/auto-captions` | `/docs/how-indxr-works/accuracy/auto-captions` | 308 |
| `/docs/accuracy/ai-transcription` | `/docs/how-indxr-works/accuracy/ai-transcription` | 308 |
| `/docs/export-formats` | `/docs/how-indxr-works/export-formats` | 308 |
| `/docs/export-formats/txt` | `/docs/how-indxr-works/export-formats/txt` | 308 |
| `/docs/export-formats/markdown` | `/docs/how-indxr-works/export-formats/markdown` | 308 |
| `/docs/export-formats/csv` | `/docs/how-indxr-works/export-formats/csv` | 308 |
| `/docs/export-formats/srt` | `/docs/how-indxr-works/export-formats/srt` | 308 |
| `/docs/export-formats/vtt` | `/docs/how-indxr-works/export-formats/vtt` | 308 |
| `/docs/export-formats/json` | `/docs/how-indxr-works/export-formats/json` | 308 |
| `/docs/languages` | `/docs/how-indxr-works/languages` | 308 |
| `/docs/limits` | `/docs/how-indxr-works/limits` | 308 |
| `/docs/api` | `/docs/how-indxr-works/api` | 308 |
| `/docs/account` | `/docs/account-and-data/credits-and-billing` | 308 |
| `/docs/privacy-handling` | `/docs/account-and-data/data-handling` | 308 |
| `/docs/how-to` | `/docs/help/how-to` | 308 |
| `/docs/troubleshooting` | `/docs/help/troubleshooting` | 308 |
| `/docs/faq` | `/docs/help/faq` | 308 |

---

## Laag 2B — Articles (`indxr.ai/articles/*`)

> **Status (2026-05-03, Werksessie B):** alle 18 SEO-pagina's verhuisd naar `/articles/[slug]`. Top-level routes + `/blog/*` verwijderd; 301 redirects actief.

### Actieve routes

| Route | Status | Beschrijving |
|-------|--------|--------------|
| `/articles` | Live | Index van alle articles (gecategoriseerd) |
| `/articles/youtube-transcript-not-available` | Live | Troubleshooting: captions unavailable |
| `/articles/youtube-age-restricted-transcript` | Live | Troubleshooting: age-gated video |
| `/articles/youtube-members-only-transcript` | Live | Troubleshooting: members-only video |
| `/articles/youtube-transcript-non-english` | Live | Troubleshooting: niet-Engelstalige video |
| `/articles/youtube-transcript-without-extension` | Live | Troubleshooting: geen browser extension |
| `/articles/bulk-youtube-transcript` | Live | Workflow: bulk extractie |
| `/articles/youtube-playlist-transcript` | Live | Workflow: playlist extractie |
| `/articles/audio-to-text` | Live | Workflow: audio naar tekst |
| `/articles/youtube-transcript-obsidian` | Live | Workflow: Obsidian integratie |
| `/articles/youtube-to-text` | Live | Export: plain TXT |
| `/articles/youtube-transcript-markdown` | Live | Export: Markdown |
| `/articles/youtube-transcript-csv` | Live | Export: CSV |
| `/articles/youtube-srt-download` | Live | Export: SRT |
| `/articles/youtube-transcript-json` | Live | Export: JSON/RAG |
| `/articles/youtube-transcript-for-rag` | Live | Export: RAG workflows |
| `/articles/chunk-youtube-transcripts-for-rag` | Live | Deep dive: chunking voor RAG |
| `/articles/youtube-channel-knowledge-base` | Live | Deep dive: channel knowledge base |
| `/articles/youtube-transcripts-vector-database` | Live | Deep dive: vector database |

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

**Logged-out:**
```
[INDXR logo]   Pricing   Docs   Articles   [Try it free]      ☀  Log in   Sign up
```

**Logged-in:**
```
[INDXR logo]   Pricing   Docs   Articles   [Try it free]      ☀  [Go to app]
```

- "Pricing" → `/pricing`
- "Docs" → `/docs`
- "Articles" → `/articles` *(nieuw, Batch 1)*
- "Try it free" → `/transcribe`
- "Log in" → `/login` (logged-out only)
- "Sign up" → `/signup` (logged-out only, accent button; was "Start free")
- "Go to app" → `/dashboard` (logged-in only, accent button; later `app.indxr.ai/` na Werksessie C)

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

### Footer (Werksessie B)

```
  Kolommen: Product | Export Formats | Learn | Legal
  Export Formats: /articles/* links
  Learn: /docs, /articles, /pricing
  Legal: /privacy, /terms, /contact
  Bottom strip: /about, /privacy, /terms, /contact
```

---

## Redirects

| Van | Naar | Type |
|-----|------|------|
| `/faq` | `/docs/faq` | 301 permanent |
| `/account/credits` | `/dashboard/account` | 301 permanent |
| `/how-it-works` | `/` | 301 permanent |
| `/youtube-transcript-generator` | `/transcribe` | 301 permanent |
| `/support` | `/contact` | 301 permanent |
| `/youtube-transcript-not-available` | `/articles/youtube-transcript-not-available` | 301 permanent |
| `/youtube-age-restricted-transcript` | `/articles/youtube-age-restricted-transcript` | 301 permanent |
| `/youtube-members-only-transcript` | `/articles/youtube-members-only-transcript` | 301 permanent |
| `/youtube-transcript-non-english` | `/articles/youtube-transcript-non-english` | 301 permanent |
| `/youtube-transcript-without-extension` | `/articles/youtube-transcript-without-extension` | 301 permanent |
| `/bulk-youtube-transcript` | `/articles/bulk-youtube-transcript` | 301 permanent |
| `/youtube-playlist-transcript` | `/articles/youtube-playlist-transcript` | 301 permanent |
| `/audio-to-text` | `/articles/audio-to-text` | 301 permanent |
| `/youtube-transcript-obsidian` | `/articles/youtube-transcript-obsidian` | 301 permanent |
| `/youtube-to-text` | `/articles/youtube-to-text` | 301 permanent |
| `/youtube-transcript-markdown` | `/articles/youtube-transcript-markdown` | 301 permanent |
| `/youtube-transcript-csv` | `/articles/youtube-transcript-csv` | 301 permanent |
| `/youtube-srt-download` | `/articles/youtube-srt-download` | 301 permanent |
| `/youtube-transcript-json` | `/articles/youtube-transcript-json` | 301 permanent |
| `/youtube-transcript-for-rag` | `/articles/youtube-transcript-for-rag` | 301 permanent |
| `/blog/chunk-youtube-transcripts-for-rag` | `/articles/chunk-youtube-transcripts-for-rag` | 301 permanent |
| `/blog/youtube-channel-knowledge-base` | `/articles/youtube-channel-knowledge-base` | 301 permanent |
| `/blog/youtube-transcripts-vector-database` | `/articles/youtube-transcripts-vector-database` | 301 permanent |

Gedefinieerd in `next.config.ts` → `async redirects()`. Totaal: 23 regels.

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
| `src/app/sitemap.ts` | `/sitemap.xml` | Live (bijgewerkt 2026-05-03, Werksessie B) |

---

## Scope-grenzen

- **`/alternative/*`** VERWIJDERD (Werksessie B, 2026-05-03) — ADR-037
- **`/blog/*`** VERWIJDERD (Werksessie B, 2026-05-03) — verhuisd naar `/articles/*`
- **`/support`** HERNOEMD naar `/contact` (Werksessie B, 2026-05-03)
- **`/youtube-transcript-generator`** HERNOEMD naar `/transcribe` (Werksessie B, 2026-05-03)
- **Auth flows** blijven op marketing domain (`indxr.ai/login` etc.) — niet naar `app.indxr.ai` (ADR-036)
- **Subdomain split** (`app.indxr.ai`) is Werksessie C — niet nu (ADR-034)
- **Changelog** — niet pre-launch bouwen (beslissing 2026-04-30)
- **llms.txt** — low-priority, geen AI-citation lever (onderzoek 2026-05-03, ADR-039); behouden maar niet uitbreiden
