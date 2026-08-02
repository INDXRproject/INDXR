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
**Bijgewerkt:** 2026-07-22 (ADR-075 — Diátaxis: ingedeeld naar wat de lezer komt doen).
URL's weerspiegelen de categorie. Redirect-bron = `apps/marketing/next.config.ts` (nu 2 regels).

De vier categorieën volgen de **intentie** van de lezer: **Getting started (leren) → Guides (doen) →
Reference (opzoeken) → Account**.

### Getting started

| Route | Type | Status | Beschrijving |
|-------|------|--------|--------------|
| `/docs` | SERVER | Live | Hub: DocsHubHero + FeaturedDocsGrid + 4× DocsCategorySection |
| `/docs/quickstart` | SERVER | Live (Tutorial layout) | "Quickstart" — HowTo JSON-LD (verhuisd van getting-started) |
| `/docs/how-indxr-works` | SERVER | Live | "How INDXR works" (was how-indxr-works/overview; map werd één pagina) |
| `/docs/faq` | SERVER | Live | "FAQ" — korte antwoorden + link naar de bezittende doc |

### Guides (doen)

| Route | Type | Status | Beschrijving |
|-------|------|--------|--------------|
| `/docs/guides/single-video` | SERVER | Live | "Single video" — **nieuw** (plakken → captions, AI-toggle, restricties) |
| `/docs/guides/playlists` | SERVER | Live | "Playlists" (verhuisd van using-indxr) |
| `/docs/guides/uploads` | SERVER | Live | "Audio & video uploads" — **nieuw** (formaten, 500 MB, 10 u, kost) |
| `/docs/guides/library` | SERVER | Live | "Library" (verhuisd van using-indxr/your-library) |
| `/docs/guides/summaries` | SERVER | Live | "Summaries" (verhuisd van how-indxr-works) |

### Reference (opzoeken)

| Route | Type | Status | Beschrijving |
|-------|------|--------|--------------|
| `/docs/reference/export-formats` | SERVER | Live | "Export formats" hub (herschreven: per-formaat alinea + tabel) |
| `/docs/reference/export-formats/{txt,markdown,csv,srt,vtt,json}` | SERVER | Live | Per-formaat spec (JSON-pagina bevat RAG-chunkpresets 30/60/90/120s) |
| `/docs/reference/accuracy` | SERVER | Live | "Accuracy and languages" (verhuisd) |
| `/docs/reference/limits` | SERVER | Live | "Limits" (verhuisd) |

### Account

| Route | Type | Status | Beschrijving |
|-------|------|--------|--------------|
| `/docs/account/credits` | SERVER | Live | "Credits" — kosten, reserve-model, refunds (KHIDR-stub) |
| `/docs/account/billing` | SERVER | Live | "Billing and invoices" — kopen, facturen, VAT-scope (KHIDR-stub) |
| `/docs/account/settings` | SERVER | Live | "Settings" — herschreven (e-mail, paginagrootte, RAG-chunkgrootte, account verwijderen → /privacy) |

### Redirects (canoniek in `next.config.ts` — nu exact 2 regels)

Pre-launch, nooit bij Search Console ingediend, geen externe inkomende links → alle redirects uit
eigen herstructureringen zijn **verwijderd** (ADR-075). Interne links wijzen direct naar de echte
route. Alleen deze twee blijven:

| Van | Naar | Type | Reden |
|-----|------|------|-------|
| `/account/credits` | `${APP_URL}/dashboard/account` | 308 | cross-host (functioneel, geen doc-move) |
| `/faq` | `/docs/faq` | 308 | korte URL die mensen intypen |

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
| `/dashboard/settings` | SERVER | Settings | Beveiliging, thema, e-mailvoorkeuren, developer exports, **Danger zone: self-service account-verwijdering** (`DeleteAccountCard` → `POST /api/account/delete`, typ-DELETE-bevestiging, logt uit) |

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
| `/api/account/delete` | POST | Self-service account-verwijdering — verwijdert **uitsluitend de sessie-user** (id uit sessie, niet uit body) via `admin.auth.admin.deleteUser` → cascade + IP-scrub-trigger |
| `/api/admin/*` | GET/POST | Admin CRUD operaties |

---

## Technische bestanden

| Bestand | URL | Status |
|---------|-----|--------|
| `public/robots.txt` | `/robots.txt` | Live |
| ~~`public/llms.txt`~~ | ~~`/llms.txt`~~ | **VERWIJDERD 2026-07-23** (ADR-039 herzien — geen bewezen lever, INDXR heeft geen publieke API) |
| `public/site.webmanifest` | `/site.webmanifest` | Live |
| `src/app/sitemap.ts` | `/sitemap.xml` | Live (bijgewerkt 2026-08-02 — zie hieronder) |
| `src/app/sitemap-lastmod.ts` | — (data voor `sitemap.ts`) | Live (per-route contentdatums, hand-onderhouden) |

### `/sitemap.xml` — generatie & lastmod (bijgewerkt 2026-08-02)

- **Routecount: 47** indexeerbare URL's (7 marketing + 21 docs + 19 articles). `/login` en `/signup` staan er **niet** in — geen zoeklandingspagina's (alleen uit de sitemap gehaald; routes/noindex ongemoeid).
- **Geen `priority`, geen `changefreq`** — Google negeert beide (Search Central, juli 2026).
- **`<lastmod>` = echte contentdatum per pagina**, uit `sitemap-lastmod.ts` (in de repo, niet op buildtijd uit git — Vercel cloont ondiep). Een route zonder entry in die map krijgt **géén** `<lastmod>`; er wordt nooit teruggevallen op de build-datum of `Date.now()`.
  - **Onderhoudsregel:** verander de datum van een route alleen bij een **inhoudelijke** contentwijziging (zichtbare tekst/feiten/structuur), niet bij styling, refactors, dependency-bumps of het toevoegen van metadata (zoals een canonical). Eén uniforme buildstempel op alle URL's maakt het signaal onbruikbaar (zie `docs/LESSONS.md`).
  - Seed (2026-08-02): 5 distinct datums (2026-05-03 t/m 2026-08-01), per route de laatste content-commit van het eigen page.tsx (docs/articles: content-page, niet de gedeelde template; homepage: page.tsx + de marketing-componenten die de copy dragen).
- **URL's = self-referencing canonicals** (geverifieerd live): `baseUrl + route`, geen trailing slash — homepage-canonical is eveneens `https://indxr.ai` zonder slash, dus consistent. `robots.txt` bevat de correcte regel `Sitemap: https://indxr.ai/sitemap.xml`.

---

## Scope-grenzen

- **`/alternative/*`** VERWIJDERD (Werksessie B, 2026-05-03) — ADR-037
- **`/blog/*`** VERWIJDERD (Werksessie B, 2026-05-03) — verhuisd naar `/articles/*`
- **`/support`** HERNOEMD naar `/contact` (Werksessie B, 2026-05-03)
- **`/youtube-transcript-generator`** HERNOEMD naar `/transcribe` (Werksessie B, 2026-05-03)
- **Auth flows** blijven op marketing domain (`indxr.ai/login` etc.) — niet naar `app.indxr.ai` (ADR-036)
- **Subdomain split** (`app.indxr.ai`) is Werksessie C — niet nu (ADR-034)
- **Changelog** — niet pre-launch bouwen (beslissing 2026-04-30)
- **llms.txt** — **VERWIJDERD 2026-07-23** (ADR-039 herzien na externe verificatie: geen bewezen AI-citation lever, Google steunt het niet, INDXR heeft geen publieke API, bestanden logen over de prijs)
