# Sitemap Audit — INDXR.AI V2

> **📌 Momentopname (2026-05-03).** De artikelstructuur is op **2026-08-08** geconsolideerd (18 → 10 artikelen; de oude `/articles/*`-slugs die dit document noemt bestaan niet meer, elk 308 → eindpunt). Actuele artikelset: [../business/content-sitemap.md](../business/content-sitemap.md).

> **⚠️ GEARCHIVEERD — punt-in-tijd-audit (2026-05-03).** Vervangen door de doorlopende bron van
> waarheid `architecture/sitemap.md` (bijgewerkt voor ADR-072/073/074) en `content/content-sitemap.md`.
> Dit is een momentopname van de codebase op 2026-05-03; niet meer bijwerken en niet als actuele
> routestructuur gebruiken. Blijft staan als historisch record (writing-standard §E).

**Datum:** 2026-05-03  
**Bron van waarheid:** codebase (`src/app/`)  
**Methode:** directe inspectie van alle route-bestanden, componenten, en configuratiebestanden  
**Scope:** alle routes, componenten, metadata, placeholders, en inconsistenties — geen aanbevelingen

---

## Secties

1. [Route-overzicht](#1-route-overzicht)
2. [Pagina-type categorisatie](#2-pagina-type-categorisatie)
3. [Pagina-anatomie per type](#3-pagina-anatomie-per-type)
4. [Component-inventaris](#4-component-inventaris)
5. [Auth-state differentiatie](#5-auth-state-differentiatie)
6. [SEO/metadata audit](#6-seometadata-audit)
7. [Mogelijk ontbrekende routes](#7-mogelijk-ontbrekende-routes)
8. [Bekende issues en placeholder markers](#8-bekende-issues-en-placeholder-markers)
9. [Inconsistenties](#9-inconsistenties)
10. [Voor de research-fase](#10-voor-de-research-fase)

---

## 1. Route-overzicht

Inventaris van alle routes in `src/app/`. Statussen: **live** (functioneel), **redirect-ghost** (bestand bestaat, maar 301-redirect in `next.config.ts`), **dev-artifact** (niet bedoeld voor productie), **empty-stub** (directory bestaat, geen `page.tsx`).

### 1.1 Marketing

| Route | Bestand | Type | Auth | Status |
|-------|---------|------|------|--------|
| `/` | `(marketing)/page.tsx` | Server | Geen | Live |
| `/pricing` | `pricing/page.tsx` | **Client** (`"use client"`) | Geen | Live |
| `/support` | `support/page.tsx` | Server | Geen | Live (form submit niet geïmplementeerd) |
| `/test-tokens` | `test-tokens/page.tsx` | Client | Geen | Dev-artifact |

### 1.2 Auth flow

| Route | Bestand | Type | Auth | Status |
|-------|---------|------|------|--------|
| `/login` | `login/page.tsx` | Client | Geen | Live |
| `/signup` | `signup/page.tsx` | Client | Geen | Live |
| `/forgot-password` | `forgot-password/page.tsx` | Client | Geen | Live |
| `/onboarding` | `onboarding/page.tsx` | Client | `useAuth()` | Live |
| `/suspended` | `suspended/page.tsx` | Server | Geen | Live |
| `/auth/callback` | `auth/callback/route.ts` | API route | — | Live |

### 1.3 Redirect-ghosts (bestanden bestaan, worden 301-geredirect)

| Route | Bestand | Redirect naar | Reden |
|-------|---------|---------------|-------|
| `/faq` | `faq/page.tsx` | `/docs/faq` | URL-consolidatie |
| `/how-it-works` | `how-it-works/page.tsx` | `/` | Beslissing 2026-04-30 |
| `/account/credits` | `account/` | `/dashboard/account` | Legacy URL |

### 1.4 Vrije tool

| Route | Bestand | Type | Auth | Status |
|-------|---------|------|------|--------|
| `/youtube-transcript-generator` | `youtube-transcript-generator/page.tsx` | Client | Optioneel (enhanced als ingelogd) | Live |

Eigen `layout.tsx` met volledige metadata-override (title, description, keywords, OG, Twitter).

### 1.5 Docs (via DocsShell)

| Route | Bestand | Type | Auth | Status |
|-------|---------|------|------|--------|
| `/docs` | `docs/page.tsx` | Server | Geen | Live |
| `/docs/getting-started` | `docs/getting-started/page.tsx` | Server | Geen | Live (content placeholder — Khidr schrijft) |
| `/docs/faq` | `docs/faq/page.tsx` | Server | Geen | Live |
| `/docs/account` | `docs/account/page.tsx` | Server | Geen | Live |

### 1.6 SEO/tool-pagina's (top-level, via DocsShell sidebar)

**Transcriptie (8 routes):**

| Route | Bestand | Type | Auth | Status |
|-------|---------|------|------|--------|
| `/youtube-transcript-not-available` | `youtube-transcript-not-available/page.tsx` | Server | Geen | Live |
| `/youtube-age-restricted-transcript` | `youtube-age-restricted-transcript/page.tsx` | Server | Geen | Live |
| `/youtube-members-only-transcript` | `youtube-members-only-transcript/page.tsx` | Server | Geen | Live |
| `/youtube-transcript-non-english` | `youtube-transcript-non-english/page.tsx` | Server | Geen | Live |
| `/bulk-youtube-transcript` | `bulk-youtube-transcript/page.tsx` | Server | Geen | Live |
| `/youtube-playlist-transcript` | `youtube-playlist-transcript/page.tsx` | Server | Geen | Live |
| `/audio-to-text` | `audio-to-text/page.tsx` | Server | Geen | Live |
| `/youtube-transcript-without-extension` | `youtube-transcript-without-extension/page.tsx` | Server | Geen | Live |

**Export (6 routes):**

| Route | Bestand | Type | Auth | Status |
|-------|---------|------|------|--------|
| `/youtube-to-text` | `youtube-to-text/page.tsx` | Server | Geen | Live |
| `/youtube-transcript-markdown` | `youtube-transcript-markdown/page.tsx` | Server | Geen | Live |
| `/youtube-transcript-csv` | `youtube-transcript-csv/page.tsx` | Server | Geen | Live |
| `/youtube-srt-download` | `youtube-srt-download/page.tsx` | Server | Geen | Live |
| `/youtube-transcript-json` | `youtube-transcript-json/page.tsx` | Server | Geen | Live |
| `/youtube-transcript-for-rag` | `youtube-transcript-for-rag/page.tsx` | Server | Geen | Live |

**Workflows (1 route):**

| Route | Bestand | Type | Auth | Status |
|-------|---------|------|------|--------|
| `/youtube-transcript-obsidian` | `youtube-transcript-obsidian/page.tsx` | Server | Geen | Live |

**Vergelijkingen (5 routes):**

| Route | Bestand | Type | Auth | Status |
|-------|---------|------|------|--------|
| `/alternative/downsub` | `alternative/downsub/page.tsx` | Server | Geen | Live |
| `/alternative/notegpt` | `alternative/notegpt/page.tsx` | Server | Geen | Live |
| `/alternative/turboscribe` | `alternative/turboscribe/page.tsx` | Server | Geen | Live |
| `/alternative/tactiq` | `alternative/tactiq/page.tsx` | Server | Geen | Live |
| `/alternative/happyscribe` | `alternative/happyscribe/page.tsx` | Server | Geen | Live |

**Undocumented stub (1 route):**

| Route | Bestand | Type | Auth | Status |
|-------|---------|------|------|--------|
| `/youtube-transcript-downloader` | `youtube-transcript-downloader/` (leeg) | — | — | **Empty-stub** (directory bestaat, geen `page.tsx`) |

### 1.7 Blog (3 routes)

| Route | Bestand | Type | Auth | Status |
|-------|---------|------|------|--------|
| `/blog/chunk-youtube-transcripts-for-rag` | `blog/chunk-youtube-transcripts-for-rag/page.tsx` | Server | Geen | Live |
| `/blog/youtube-channel-knowledge-base` | `blog/youtube-channel-knowledge-base/page.tsx` | Server | Geen | Live |
| `/blog/youtube-transcripts-vector-database` | `blog/youtube-transcripts-vector-database/page.tsx` | Server | Geen | Live |

### 1.8 Dashboard (auth vereist)

Auth-guard: `dashboard/layout.tsx` — redirect naar `/login` als geen user; redirect naar `/suspended` als `profile.suspended`.

| Route | Bestand | Type | Auth | Status |
|-------|---------|------|------|--------|
| `/dashboard` | `dashboard/page.tsx` | Server | Vereist | Live (messages-sectie: mock data) |
| `/dashboard/transcribe` | `dashboard/transcribe/page.tsx` | Client | Vereist | Live |
| `/dashboard/library` | `dashboard/library/page.tsx` | Client | Vereist | Live |
| `/dashboard/library/[id]` | `dashboard/library/[id]/page.tsx` | Server | Vereist | Live |
| `/dashboard/messages` | `dashboard/messages/page.tsx` | Server | Vereist | Live (mock data, backend hookup pending) |
| `/dashboard/billing` | `dashboard/billing/page.tsx` | Server | Vereist | Live |
| `/dashboard/billing/success` | `dashboard/billing/success/page.tsx` | Client | Geen | Live |
| `/dashboard/billing/cancel` | `dashboard/billing/cancel/page.tsx` | Server | Geen | Live |
| `/dashboard/account` | `dashboard/account/page.tsx` | Server | Vereist | Live |
| `/dashboard/settings` | `dashboard/settings/page.tsx` | Server | Vereist | Live ("Custom themes coming soon" placeholder) |

### 1.9 Admin (admin-email vereist)

Auth-guard: `admin/layout.tsx` — `if (!user || user.email !== process.env.ADMIN_EMAIL) redirect("/dashboard")`.

| Route | Bestand | Type | Auth | Status |
|-------|---------|------|------|--------|
| `/admin` | `admin/page.tsx` | Server | Admin email | Live |
| `/admin/users` | `admin/users/page.tsx` | Server | Admin email | Live |
| `/admin/paid-users` | `admin/paid-users/page.tsx` | Server | Admin email | Live |
| `/admin/credits` | `admin/credits/page.tsx` | Server | Admin email | Live |
| `/admin/transcripts` | `admin/transcripts/page.tsx` | Server | Admin email | Live |
| `/admin/transcripts/[id]` | `admin/transcripts/[id]/page.tsx` | Server | Admin email | Live |

### 1.10 API routes

| Route | Methode | Bestand |
|-------|---------|---------|
| `/api/extract` | POST | `api/extract/route.ts` |
| `/api/transcribe/whisper` | POST | `api/transcribe/whisper/route.ts` |
| `/api/transcribe/preflight` | POST | `api/transcribe/preflight/route.ts` |
| `/api/video/metadata/[videoId]` | GET | `api/video/metadata/[videoId]/route.ts` |
| `/api/playlist/extract` | POST | `api/playlist/extract/route.ts` |
| `/api/playlist/info` | GET/POST | `api/playlist/info/route.ts` |
| `/api/playlist/jobs/[jobId]` | GET | `api/playlist/jobs/[jobId]/route.ts` |
| `/api/jobs/[job_id]` | GET | `api/jobs/[job_id]/route.ts` |
| `/api/check-playlist-availability` | POST | `api/check-playlist-availability/route.ts` |
| `/api/stripe/checkout` | POST | `api/stripe/checkout/route.ts` |
| `/api/stripe/webhook` | POST | `api/stripe/webhook/route.ts` |
| `/api/ai/summarize` | POST | `api/ai/summarize/route.ts` |
| `/api/admin/add-credits` | POST | `api/admin/add-credits/route.ts` |
| `/api/admin/delete-transcript` | POST | `api/admin/delete-transcript/route.ts` |
| `/api/admin/delete-user` | POST | `api/admin/delete-user/route.ts` |
| `/api/admin/suspend-user` | POST | `api/admin/suspend-user/route.ts` |
| `/api/admin/user-detail` | GET | `api/admin/user-detail/route.ts` |
| `/api/auth/callback` | GET | `auth/callback/route.ts` |

### 1.11 Technische bestanden (statisch in `public/`)

| Bestand | URL | Status |
|---------|-----|--------|
| `public/robots.txt` | `/robots.txt` | Live |
| `public/llms.txt` | `/llms.txt` | Live |
| `public/site.webmanifest` | `/site.webmanifest` | Live |
| `src/app/sitemap.ts` | `/sitemap.xml` (dynamisch gegenereerd) | Live |

### 1.12 Redirects (next.config.ts)

| Van | Naar | Type |
|-----|------|------|
| `/faq` | `/docs/faq` | 301 permanent |
| `/account/credits` | `/dashboard/account` | 301 permanent |
| `/how-it-works` | `/` | 301 permanent |

---

## 2. Pagina-type categorisatie

Zeven categorieën geïdentificeerd op basis van paginadoel, audience, en template-gebruik.

### Categorie A — Marketing

**Routes:** `/` (1)  
**Doel:** Eerste indruk, conversie naar tool of aanmelding  
**Audience:** Anonieme bezoeker  
**Template:** Inline (geen gedeeld template) — `(marketing)/page.tsx` rendert sectie-componenten direct  
**Content density:** Medium — hero, 4 feature cards, 5 persona cards, 3 testimonials, bottom CTA  
**Auth-staat:** Anoniem; header toont "Log in" + "Start free"  
**Update frequency:** Semi-statisch (copy wijzigt per campagne, structuur stabiel)  
**robots.index:** Niet expliciet ingesteld → erft root (index: true)  

### Categorie B — Auth flow

**Routes:** `/login`, `/signup`, `/forgot-password`, `/onboarding`, `/suspended` (5)  
**Doel:** Gebruiker aan- of afmelden; accountstatus communiceren  
**Audience:** Anoniem (login/signup/forgot-password), ingelogd (onboarding)  
**Template:** Geen gedeeld template — elk pagina heeft eigen inline layout  
**Content density:** Light — één formulier of één statusmelding  
**Auth-staat:** Login/signup: redirect naar dashboard als al ingelogd; onboarding: `useAuth()` vereist  
**robots.index:** `/suspended` heeft expliciet `robots: { index: false }`  
**Update frequency:** Statisch  

### Categorie C — Vrije tool

**Routes:** `/youtube-transcript-generator` (1)  
**Doel:** Gratis extractietool voor anonieme en ingelogde gebruikers  
**Audience:** Anoniem en ingelogd  
**Template:** Geen — eigen `page.tsx` + eigen `layout.tsx` (metadata override)  
**Content density:** Heavy — tabbed interface (Video / Playlist / Audio) + SEO-content eronder  
**Auth-staat:** Functioneel anoniem; opslaan naar library vereist login (AuthModal verschijnt)  
**robots.index:** Erft root (index: true); eigen layout.tsx heeft expliciete OG/Twitter metadata  
**Update frequency:** Semi-statisch (tool statisch, SEO-copy kan wijzigen)  

### Categorie D — Docs / SEO hybrid

**Routes:** `/docs` (hub), `/docs/getting-started`, `/docs/faq`, `/docs/account` (4 docs-routes) + 20 SEO/tool-pagina's op top-level (8 transcriptie, 6 export, 1 workflow, 5 alternatief) + 3 blog-artikelen = **27 routes totaal**  
**Doel:** Dubbel: gebruikersdocumentatie (docs/*) en SEO-traffic via zoekintentie (top-level routes)  
**Audience:** Anonieme bezoeker (primair); ingelogde gebruiker als secondary  
**Template:** `ToolPageTemplate` (tool-pagina's), `ArticleTemplate` (vergelijkings- en blogpagina's), `TutorialTemplate` (tutorials) — alle drie gerenderd binnen `DocsShell`  
**Content density:** Heavy — lange artikelen met FAQs, sources, schemas  
**Auth-staat:** Volledig publiek; geen auth-gating  
**robots.index:** Niet expliciet — erft root (index: true); `/docs` heeft expliciet `robots: { index: true, follow: true }`  
**Update frequency:** Semi-statisch (content geschreven per sessie)  
**Structurele noot:** SEO-pagina's leven op top-level (`/audio-to-text`, niet `/docs/audio-to-text`), maar zijn via `docsConfig` opgenomen in de `DocsShell`-sidebar. Dit is een hybride: navigatief onderdeel van docs, maar URL-gewijs los daarvan.

### Categorie E — Dashboard

**Routes:** `/dashboard`, `/dashboard/transcribe`, `/dashboard/library`, `/dashboard/library/[id]`, `/dashboard/messages`, `/dashboard/billing`, `/dashboard/billing/success`, `/dashboard/billing/cancel`, `/dashboard/account`, `/dashboard/settings` (10)  
**Doel:** Gebruikerstool voor transcriptie, bibliotheek, account en billing  
**Audience:** Ingelogde, niet-gesuspendeerde gebruiker  
**Template:** Geen gedeeld content-template — elke pagina heeft eigen layout binnen `DashboardLayout` (AppSidebar + MobileTabBar)  
**Content density:** Varieert — `/dashboard/transcribe` (heavy, tabbed workflow), `/dashboard/library/[id]` (heavy, tab-nav transcript viewer), `/dashboard` home (medium, dashboard cards), `/dashboard/settings` (light)  
**Auth-staat:** Vereist; layout-level redirect  
**robots.index:** Niet expliciet — worden gecrawled tenzij actief geblokkeerd. `robots.txt` blokkeert `/dashboard/` voor bots. Geen `robots: { index: false }` op pagina-niveau gevonden voor alle dashboard-routes.  
**Update frequency:** Dynamisch (data uit Supabase)  

### Categorie F — Admin

**Routes:** `/admin`, `/admin/users`, `/admin/paid-users`, `/admin/credits`, `/admin/transcripts`, `/admin/transcripts/[id]` (6)  
**Doel:** Interne tooling voor gebruikersbeheer, credit-toewijzing, transcript-moderatie  
**Audience:** Admin (één specifiek e-mailadres)  
**Template:** Geen gedeeld template — eigen admin-layout met navigatie  
**Content density:** Medium — tabellen, metrics, actieformulieren  
**Auth-staat:** Admin-email check; redirect naar `/dashboard` als niet admin  
**robots.index:** `robots.txt` blokkeert `/admin/` voor alle bots  
**Update frequency:** Dynamisch  

### Categorie G — Error/state pagina's en dev-artifacts

**Routes:** `/suspended`, `/test-tokens`, plus `/dashboard/billing/success`, `/dashboard/billing/cancel` (4)  
**Doel:** Foutafhandeling, betalingsbevestiging, designtoken-testpagina  
**Audience:** Gesuspendeerde gebruiker (`/suspended`); post-checkout bezoeker (billing succes/cancel); ontwikkelaar (`/test-tokens`)  
**Template:** Geen gedeeld template  
**Content density:** Light  
**Auth-staat:** `billing/success` en `billing/cancel` vereisen geen auth; `/suspended` en `/test-tokens` open  
**robots.index:** `/suspended` heeft `robots: { index: false }`; `/test-tokens` geen expliciete instelling  

---

### Overzichtstabel

| Categorie | Aantal routes | Template | Audience | Auth |
|-----------|--------------|----------|----------|------|
| A — Marketing | 1 | Inline | Anoniem | Geen |
| B — Auth flow | 5 | Inline | Anoniem / ingelogd | Variabel |
| C — Vrije tool | 1 | Inline + eigen layout | Anoniem / ingelogd | Optioneel |
| D — Docs/SEO hybrid | 27 | ToolPageTemplate / ArticleTemplate / TutorialTemplate | Anoniem | Geen |
| E — Dashboard | 10 | DashboardLayout (AppSidebar) | Ingelogd | Vereist |
| F — Admin | 6 | AdminLayout | Admin | Admin-email |
| G — Error/state/dev | 4 | Inline | Variabel | Variabel |

---

## 3. Pagina-anatomie per type

Hieronder de component-sequentie voor elk type. Bedoeld als input voor Claude Design: welke `<Component>` staat waar, met welke variaties.

### 3A — Marketing (`/`)

```
<RootLayout>
  <Header user={user} />            ← server: auth-aware, desktop nav + mobile hamburger
  <LandingPage>
    <section hero>
      <HeroImage />                  ← statische afbeelding/animatie
      <h1> + <p> + CTA-knoppen       ← inline, geen component
      <Link href="/youtube-transcript-generator">  ← accent-knop
      <Link href="/pricing">         ← outline-knop
    </section>
    <section features>
      <FeatureCard /> × 4            ← grid 1→2→4 kolommen
    </section>
    <section personas>
      <PersonaCard /> × 5            ← inline helper, grid 1→2→3 kolommen
    </section>
    <section testimonials>
      <TestimonialCard /> × 3        ← inline helper, grid 1→3 kolommen
    </section>
    <section bottom-cta>
      CTA-knop + "How it works" link ← inline
    </section>
  </LandingPage>
  <Footer />
```

**Variaties:** Geen; één instance.

---

### 3B — Auth flow (`/login`, `/signup`, `/forgot-password`)

```
<RootLayout>
  <Header user={null} />             ← geen auth-dropdown, ghost state
  <auth-page>
    <centered card>
      <Logo/brand>
      <h1> (paginanaam)
      <form> (e-mail + wachtwoord)
      <OAuth-knop> (Google)
      <link> (naar andere auth-route)
    </centered card>
  </auth-page>
                                     ← geen Footer op auth-pagina's
```

**Onboarding-variant (`/onboarding`):**
```
<RootLayout>
  <Header />
  <onboarding-page>
    <centered card>
      <progress checklist>           ← visuele stappen (1-2-3)
      <username-form>
      <role-select>
      <submit> → redirect /dashboard/transcribe
    </centered card>
  </onboarding-page>
```

---

### 3C — Vrije tool (`/youtube-transcript-generator`)

```
<youtube-transcript-generator/layout.tsx>  ← metadata override (OG, Twitter, keywords)
  <RootLayout>
    <Header />
    <main>
      <Tabs> (Video / Playlist / Audio)
        <VideoTab />                 ← URL input, transcript output, export options
        <PlaylistTab />              ← playlist URL, availability check, cost preview
        <AudioTab />                 ← file upload, credit estimate
      </Tabs>
      <AuthModal />                  ← trigger bij save-actie als niet ingelogd
      <SEO-content section>          ← statische tekst eronder (niet in scrollview)
    </main>
    <Footer />
```

---

### 3D — Docs/SEO hybrid

**3D-i: ToolPageTemplate (meeste SEO-pagina's)**
```
<DocsShell>
  <DocsSidebar />                    ← links op basis van docsConfig, sticky, lg+ zichtbaar
  <main>
    <ToolPageTemplate
      title, metaDescription, publishedAt, updatedAt, author, faqs[], sources?>
      <JsonLd schemas=[SoftwareApp, FAQPage] />  ← in <head>
      <AuthorCard />                 ← byline, datums
      <article>{children}</article>  ← H1, body tekst, code-blokken, tabellen
      <FAQSection faqs[] />          ← accordeon of statische Q&A
      <SourcesSection sources[] />   ← optioneel, externe links
    </ToolPageTemplate>
  </main>
```

**3D-ii: ArticleTemplate (vergelijkings- en blogpagina's)**
```
<DocsShell>
  <DocsSidebar />
  <main>
    <ArticleTemplate
      title, metaDescription, publishedAt, updatedAt, author, faqs[], sources[]>
      <JsonLd schemas=[Article, FAQPage] />
      <AuthorCard />
      <article>{children}</article>
      <FAQSection />
      <SourcesSection />
    </ArticleTemplate>
  </main>
```

**3D-iii: Docs hub (`/docs`)**
```
<RootLayout>
  <Header />
  <main>
    <docs-grid>                      ← sectie-overzicht op basis van docsConfig
      <section-card × N />           ← per docsConfig.section
    </docs-grid>
  </main>
  <Footer />
```

**3D-iv: Docs-pagina's (`/docs/getting-started`, `/docs/faq`, `/docs/account`)**
```
<DocsShell>
  <DocsSidebar />
  <main>
    <h1> (paginatitel)
    {children}                       ← statische MDX/JSX content
    [rechter rail: placeholder — table of contents nog niet geïmplementeerd]
  </main>
```

---

### 3E — Dashboard

**3E-i: Dashboard home (`/dashboard`)**
```
<DashboardLayout>
  <AppSidebar collapsible />         ← linker sidebar (verborgen < md)
  <MobileTabBar />                   ← tab-bar (zichtbaar < md, vast onderaan)
  <main>
    <credits-card />                 ← balance + link naar /dashboard/billing
    <transcribe-CTA card />          ← link naar /dashboard/transcribe
    <messages-preview />             ← MOCK_MESSAGES (backend pending)
    <recent-transcripts-list />      ← 3 meest recente (live data)
    <library-stats />                ← count + collecties (live data)
  </main>
```

**3E-ii: Transcribe (`/dashboard/transcribe`)**
```
<DashboardLayout>
  <AppSidebar />
  <MobileTabBar />
  <main>
    <WelcomeCreditCard />            ← zichtbaar bij eerste gebruik
    <ActiveJobsIndicator />          ← polling-indicator
    <Tabs> (Video / Playlist / Audio)
      <VideoTab />
      <PlaylistTab />
      <AudioTab />
    </Tabs>
    <SaveErrorModal />               ← foutdialoog bij save-failure
  </main>
```

**3E-iii: Library (`/dashboard/library`)**
```
<DashboardLayout>
  <AppSidebar>
    <Library-tree>                   ← collecties + transcripts in sidebar
    </Library-tree>
  </AppSidebar>
  <MobileTabBar />
  <main>
    <search-input />
    <view-toggle />                  ← grid / list
    <TranscriptList />
  </main>
```

**3E-iv: Transcript detail (`/dashboard/library/[id]`)**
```
<DashboardLayout>
  <AppSidebar />
  <MobileTabBar />
  <main>
    <tab-nav> (Transcript / AI Summary / RAG Export / Developer)
      <TranscriptViewer />           ← rich text editor (Tiptap, immediatelyRender: false)
      <AiSummaryView />
      <RagExportView />
      <developer-tab />
    </tab-nav>
  </main>
```

**3E-v: Settings (`/dashboard/settings`)**
```
<DashboardLayout>
  <main>
    <SecuritySettingsCard />         ← wachtwoord wijzigen
    <preferences-card>
      <ThemeToggle />                ← light/dark
      "Custom themes coming soon."   ← placeholder
    </preferences-card>
    <DeveloperExportsCard>           ← RAG chunk size instelling
    </DeveloperExportsCard>
  </main>
```

---

### 3F — Admin

```
<AdminLayout>
  <admin-nav>                        ← links: Overview / Users / Credits / Transcripts / Paid Users
  <main>
    {per-pagina content — tabellen, MetricCards, actieknoppen}
  </main>
```

---

## 4. Component-inventaris

Structurele componenten in `src/components/` (geen Shadcn/ui primitives).

### 4.1 Layout & navigatie

| Component | Bestand | Doel | Hergebruik | Props / variaties |
|-----------|---------|------|------------|-------------------|
| `Header` | `components/Header.tsx` | Globale top-nav (sticky op scroll); logo, desktop-nav (Pricing/Docs/CTA), user auth-dropdown, mobile hamburger sheet | Alle publieke pagina's (~35 routes) | `user` prop (auth-aware) — desktop: nav-links; mobile: hamburger + Sheet |
| `Footer` | `components/Footer.tsx` | Footer met 3 kolommen (Export Formats, Learn, Compare) + copyright | Marketing + docs + SEO/tool-pagina's; NIET op dashboard of admin | Statisch, geen props |
| `DocsShell` | `components/docs/DocsShell.tsx` | Layout-wrapper voor docs + SEO-pagina's: linker sidebar (verborgen < lg), breadcrumb, main content, rechter rail (placeholder) | ~27 routes (docs/* + alle top-level SEO/tool-pagina's) | `children: ReactNode`; breadcrumb via `findPageInDocs()` |
| `DocsSidebar` | `components/docs/DocsSidebar.tsx` | Navigatieboom vanuit `docsConfig`; zoekbalk (niet-functioneel placeholder); auto-open huidige sectie | 1 instance (in DocsShell) | Lees `docsConfig.sections`; geen directe props |
| `AppSidebar` | `components/app-sidebar.tsx` | Dashboard-sidebar (Shadcn Sidebar base); collapsible via localStorage; Home/Transcribe/Messages nav; Library + collecties-subtree (create/rename/delete/drag-drop); footer-nav (Account/Settings/SignOut); credit-counter; storage-meter | ~10 dashboard routes | `collapsed` state; `collections[]`; `transcripts[]`; `guardedNavigate()` voor actieve job-bescherming; placeholder: hexagon SVG logo (regel 664) |
| `MobileTabBar` | `components/dashboard/MobileTabBar.tsx` | Bodem-navigatiebalk voor dashboard (< md viewport); 4 tabs (Home/Transcribe/Library/Messages); unread badge op Messages | Dashboard-pagina's op mobiel | `messagesUnread?: number` |

### 4.2 Content-templates

| Component | Bestand | Doel | Hergebruik | JSON-LD schema |
|-----------|---------|------|------------|----------------|
| `ArticleTemplate` | `components/content/templates/ArticleTemplate.tsx` | Wrapper voor langlopende artikelen (vergelijkingen, blog); AuthorCard + FAQs + Sources | ~8 routes (alternative/*, blog/*) | `Article` + `FAQPage` |
| `ToolPageTemplate` | `components/content/templates/ToolPageTemplate.tsx` | Wrapper voor tool-landingspagina's; SoftwareApplication schema + prijsaanbieding | ~14 routes (transcriptie + export tool-pagina's) | `SoftwareApplication` + `FAQPage` |
| `TutorialTemplate` | `components/content/templates/TutorialTemplate.tsx` | Wrapper voor stap-voor-stap tutorials; HowTo schema met steps-array | ~1–2 routes (toekomstige tutorials) | `Article` + `FAQPage` + `HowTo` (optioneel) |

Props gedeeld door alle drie templates: `title, metaDescription, publishedAt, updatedAt, author, children, faqs[], sources[]`; ToolPageTemplate voegt `offers` toe; TutorialTemplate voegt `steps[]` toe.

### 4.3 SEO-hulpcomponenten

| Component | Bestand | Doel | Hergebruik |
|-----------|---------|------|------------|
| `JsonLd` | `components/seo/JsonLd.tsx` | Server component; injecteert JSON-LD structured data schemas via `<script type="application/ld+json">` | Alle template-pages (~22 routes) |
| `AuthorCard` | `components/content/AuthorCard.tsx` | Byline met auteursnaam, gepubliceerd/bijgewerkt-datums | Alle template-pagina's |

### 4.4 Auth & gebruikersstatus

| Component | Bestand | Doel | Hergebruik |
|-----------|---------|------|------------|
| `AuthModal` | `components/AuthModal.tsx` | Login/signup-modal; triggered bij save-actie als niet ingelogd | `/youtube-transcript-generator` |
| `CreditBalance` | `components/CreditBalance.tsx` | Toont credit-count (Coins icon); alleen voor ingelogde gebruikers; link naar `/pricing` | Header (ingelogde staat) |
| `UserAvatar` | `components/UserAvatar.tsx` | Gebruikersinitaal in gekleurde cirkel; leest `profile.avatar_color` en `profile.username` | Header auth-dropdown |

### 4.5 Marketing

| Component | Bestand | Doel | Hergebruik |
|-----------|---------|------|------------|
| `FeatureCard` | `components/FeatureCard.tsx` | Kaart voor marketing feature-grid (4-kolommen op landing) | `(marketing)/page.tsx` |
| `HeroImage` | `components/HeroImage.tsx` | Hero-afbeelding/animatie op landing | `(marketing)/page.tsx` |

### 4.6 Dashboard-features

| Component | Bestand | Doel |
|-----------|---------|------|
| `ActiveJobsIndicator` | `components/dashboard/ActiveJobsIndicator.tsx` | Status van lopende transcriptie/extractie-jobs |
| `WelcomeCreditCard` | `components/dashboard/WelcomeCreditCard.tsx` | Onboarding-kaart die credit-systeem uitlegt aan nieuwe gebruikers |
| `BillingPurchaseGrid` | `components/dashboard/billing/BillingPurchaseGrid.tsx` | Credit-aankoop kaarten-grid |
| `SecuritySettingsCard` | `components/dashboard/settings/SecuritySettingsCard.tsx` | Wachtwoord wijzigen |
| `DeveloperExportsCard` | `components/dashboard/settings/DeveloperExportsCard.tsx` | RAG chunk-size instelling |
| `TransactionHistoryCard` | `components/dashboard/settings/TransactionHistoryCard.tsx` | Transactiehistorie (20 meest recente) |
| `SentryFeedbackCard` | `components/dashboard/settings/SentryFeedbackCard.tsx` | Sentry feedback-widget |
| `ProfileSettingsCard` | `components/dashboard/settings/ProfileSettingsCard.tsx` | Profielinstellingen |

### 4.7 Library & transcript

| Component | Bestand | Doel |
|-----------|---------|------|
| `TranscriptViewer` | `components/library/TranscriptViewer.tsx` | Tiptap rich-text editor; `immediatelyRender: false` |
| `TranscriptList` | `components/library/TranscriptList.tsx` | Lijstweergave van transcripts in collectie |
| `AiSummaryView` | `components/library/AiSummaryView.tsx` | AI-samenvatting weergave |
| `RagExportView` | `components/library/RagExportView.tsx` | RAG-optimized JSON preview en export |
| `TranscriptCard` | `components/TranscriptCard.tsx` | Kaartweergave voor individueel transcript (library grid) |

### 4.8 Vrije-tool componenten

| Component | Bestand | Doel |
|-----------|---------|------|
| `VideoTab` | `components/free-tool/VideoTab.tsx` | URL-input + transcript-output voor enkele video |
| `PlaylistTab` | `components/free-tool/PlaylistTab.tsx` | Playlist URL, availability-check, cost preview |
| `AudioTab` | `components/free-tool/AudioTab.tsx` | File-upload, credit-schatting |
| `PlaylistManager` | `components/PlaylistManager.tsx` | Playlist-job state management |
| `TranscriptionProgress` | `components/transcription/TranscriptionProgress.tsx` | Voortgangsbalk/ETA voor lopende transcriptie |

### 4.9 Utility

| Component | Bestand | Doel |
|-----------|---------|------|
| `SaveErrorModal` | `components/SaveErrorModal.tsx` | Foutdialoog bij save-failure |
| `theme-provider` | `components/theme-provider.tsx` | Next-Themes provider wrapper |

---

## 5. Auth-state differentiatie

### 5.1 Header

| Element | Uitgelogd | Ingelogd |
|---------|-----------|----------|
| Logo | Zichtbaar | Zichtbaar |
| "Pricing" nav-link | Zichtbaar | Zichtbaar |
| "Docs" nav-link | Zichtbaar | Zichtbaar |
| "Try it free ↗" CTA | Zichtbaar → `/youtube-transcript-generator` | Zichtbaar → `/youtube-transcript-generator` |
| "Log in" link | Zichtbaar → `/login` | Verborgen |
| "Start free" knop | Zichtbaar → `/signup` | Verborgen |
| `<CreditBalance>` | Niet gerenderd | Gerenderd (credit-count + link naar `/pricing`) |
| `<UserAvatar>` dropdown | Niet gerenderd | Gerenderd (avatar → dropdown: Dashboard / Account / Sign Out) |

### 5.2 Publieke pagina's (/, /pricing, /docs/*, SEO-pagina's)

| Element | Uitgelogd | Ingelogd |
|---------|-----------|----------|
| Body content | Identiek | Identiek |
| CTAs in body | "Sign up" / "Get started" → `/signup` | Zelfde links (geen personalisatie) |
| Save-acties | Niet aanwezig (publieke pagina's) | Niet aanwezig |

### 5.3 `/youtube-transcript-generator`

| Element | Uitgelogd | Ingelogd |
|---------|-----------|----------|
| VideoTab, PlaylistTab, AudioTab | Beschikbaar | Beschikbaar |
| Caption-extractie (gratis) | Werkt, transcript getoond | Werkt, transcript automatisch opgeslagen naar library |
| AI-transcriptie | Werkt (credits vereist, maar geen account) | Werkt; opgeslagen naar library |
| Export-opties | Beschikbaar | Beschikbaar |
| "Save to Library" actie | Triggert `<AuthModal>` | Slaat direct op |

### 5.4 Dashboard routes

Alle `/dashboard/*` routes zijn geblokkeerd voor uitgelogde gebruikers via `dashboard/layout.tsx`:
- Uitgelogd → redirect `/login` (met `?redirectTo=/dashboard/...`)
- Gesuspendeerd → redirect `/suspended`

Ingelogde gebruiker ziet:
- `AppSidebar` met persoonlijke collecties en transcripts
- Credit-balance in sidebar footer
- Alle dashboard-functionaliteit

### 5.5 Specifieke route-gedragingen

| Route | Uitgelogd | Ingelogd |
|-------|-----------|----------|
| `/onboarding` | Functioneel (geen expliciete auth-guard, maar `useAuth()` nodig voor submit) | Beschikbaar; submit → `/dashboard/transcribe` |
| `/dashboard/billing/success` | Beschikbaar (geen auth-guard) | Beschikbaar; triggert credit-refresh via `useAuth()` |
| `/dashboard/billing/cancel` | Beschikbaar (geen auth-guard) | Beschikbaar |
| `/admin/*` | Redirect naar `/dashboard` | Redirect naar `/dashboard` (tenzij admin-email) |
| `/suspended` | Beschikbaar (foutpagina) | Beschikbaar |

---

## 6. SEO/metadata audit

### 6.1 Wat gecontroleerd is

Gecontroleerd per pagina-type: `title`, `description`, `keywords`, `openGraph` (title, description, type, url, image), `twitter` (card, title, description, image), JSON-LD structured data (type, volledigheid), `robots` directive, canonical URL.

Niet gecontroleerd: `hreflang` (geen meertalige implementatie aanwezig), `article:published_time` etc. (worden via template-props doorgegeven, niet als Next.js metadata export).

### 6.2 Per pagina-type

| Pagina-type | Title | Description | Keywords | OG title | OG description | OG image | Twitter card | JSON-LD | robots |
|-------------|-------|-------------|----------|----------|----------------|----------|--------------|---------|--------|
| Root fallback (layout.tsx) | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | default |
| Homepage (`/`) | ✓ (fallback) | ✓ (fallback) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | default (index) |
| `/youtube-transcript-generator` (layout.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ (summary_large_image) | ✓ (via template) | default |
| SEO/tool-pagina's (page.tsx) | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ (via template) | default |
| `/docs` | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | index: true, follow: true |
| `/docs/*` individueel | ✗ (fallback) | ✗ (fallback) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | default |
| `/pricing` | ✗ (fallback) | ✗ (fallback) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | default |
| Dashboard-pagina's | ✓ (meeste) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | n.v.t. (robots.txt blokkeert) |
| `/suspended` | ✗ (fallback) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | index: false |
| Admin-pagina's | ✗ (fallback) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | n.v.t. (robots.txt blokkeert) |

### 6.3 Structured data (JSON-LD) — wat aanwezig is

| Schema type | Aanwezig op | Geïmplementeerd via |
|-------------|-------------|---------------------|
| `SoftwareApplication` | SEO tool-pagina's (ToolPageTemplate) | `JsonLd` component in ToolPageTemplate |
| `FAQPage` | SEO-pagina's met FAQs (alle drie templates) | `JsonLd` component in templates |
| `Article` | Vergelijkings- en blogpagina's (ArticleTemplate) | `JsonLd` component in ArticleTemplate |
| `HowTo` | Tutorial-pagina's (TutorialTemplate, als `steps[]` aangeleverd) | `JsonLd` component in TutorialTemplate |
| `Organization` | ✗ — niet geïmplementeerd | — |
| `WebApplication` | ✗ — niet geïmplementeerd | — |
| `BreadcrumbList` | ✗ — niet geïmplementeerd | — |
| `Offer` / pricing data | Aanwezig in SoftwareApplication schema (ToolPageTemplate) | Inline in template |

### 6.4 Routes met ontbrekende essentials

**Hoge impact (hoge traffic, publiek, index: true):**

| Route | Ontbreekt |
|-------|-----------|
| `/` | OG tags, Twitter card, JSON-LD (SoftwareApplication / Organization), eigen metadata (erft root) |
| `/pricing` | Alle metadata (erft root), OG, Twitter, JSON-LD (Offer schema) |
| `/docs/getting-started` | Eigen title/description, OG, Twitter |
| `/docs/faq` | Eigen title/description, OG, Twitter, JSON-LD (FAQPage) |
| `/docs/account` | Eigen title/description, OG, Twitter |
| Alle SEO/tool-pagina's | OG description, OG image, Twitter card, Twitter image |
| `/youtube-transcript-generator` | OG image, Twitter image |

**Geen afbeeldings-URL in OG/Twitter op enige route:** Geen enkele pagina heeft een `og:image` of `twitter:image` URL gedefinieerd.

**Canonical URL:** Niet expliciet ingesteld op enige route. Next.js 14+ genereert automatisch canonicals via `metadataBase`, maar `metadataBase` is niet geconfigureerd in de root `layout.tsx` — canonical URLs worden dan relatief of ontbreken.

### 6.5 Sitemap.xml (`src/app/sitemap.ts`) — wat erin zit

De sitemap bevat 28 routes. Wat erin zit vs. wat niet:

**WEL in sitemap.ts:**
- `/`, `/pricing`, `/faq` (→ redirect!), `/support`, `/login`, `/signup`
- `/youtube-transcript-generator`, `/youtube-to-text`, `/youtube-playlist-transcript`, `/bulk-youtube-transcript`, `/audio-to-text`, `/how-it-works` (→ redirect!), `/youtube-transcript-without-extension`
- Alle feature-pagina's (9), alle alternative-pagina's (5), alle blog-pagina's (3)

**NIET in sitemap.ts:**
- `/docs`, `/docs/getting-started`, `/docs/faq`, `/docs/account`
- `/youtube-transcript-non-english`
- `/youtube-transcript-downloader` (empty stub — correct om weg te laten)

**In sitemap.ts maar redirect naar andere URL:**
- `/faq` (301 → `/docs/faq`) — verwijst crawler naar redirect-URL
- `/how-it-works` (301 → `/`) — verwijst crawler naar redirect-URL

### 6.6 robots.txt (in `public/robots.txt`)

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /dashboard/
Disallow: /admin/
Disallow: /transcribe/
Disallow: /library/

User-agent: ClaudeBot, ClaudeSearchBot, Claude-User, GPTBot, OAI-SearchBot, ChatGPT-User,
            PerplexityBot, Googlebot, Bingbot — Allow: /

User-agent: CCBot, Meta-ExternalAgent — Disallow: /

Sitemap: https://indxr.ai/sitemap.xml
```

Geïmplementeerd conform het plan in `INDXR-SITEMAP.md`.

### 6.7 llms.txt (in `public/llms.txt`)

Bestaat als statisch bestand. Bevat product-beschrijving, functionaliteitsoverzicht, prijsinformatie, RAG JSON export details, en key pages. Geïmplementeerd conform het plan in `INDXR-SITEMAP.md`. Specifieke prijzen in het bestand (`€6.99`, `€13.99`, `€27.99`) komen uit het plan — zijn niet gevalideerd tegen de live Stripe-configuratie in `checkout/route.ts` (die gebruikt `€5.99`, `€11.99`, `€24.99`).

---

## 7. Mogelijk ontbrekende routes

### 7.1 In codebase aanwezig maar gedocumenteerd als lege stub

| Route | Status | Opmerking |
|-------|--------|-----------|
| `/youtube-transcript-downloader` | **Empty stub** — directory aanwezig, geen `page.tsx` | In `INDXR-SITEMAP.md` gepland als "Download YouTube Transcripts — 8 Formats, One Click" |

### 7.2 Gepland in INDXR-SITEMAP.md maar niet gebouwd

| Route | Plan-prioriteit | Status in codebase |
|-------|----------------|---------------------|
| `/blog/youtube-transcript-obsidian-workflow` | P1 blog-artikel | Niet aanwezig; `/youtube-transcript-obsidian` (top-level) bestaat wel |

### 7.3 Standaard SaaS-pagina's die ontbreken

Vergelijking met standaard SaaS-website conventie:

| Route | Aanwezig? | Opmerking |
|-------|-----------|-----------|
| `/about` | ✗ | Niet gepland in enige sitemap-doc |
| `/privacy` | ✗ | Geen link in footer gevonden; niet in sitemap-docs |
| `/terms` | ✗ | Geen link in footer gevonden; niet in sitemap-docs |
| `/changelog` | ✗ | Expliciet besloten niet te bouwen voor launch (Khidr's beslissing 2026-04-30, gedocumenteerd in sitemap.md) |
| `/blog` (index-pagina) | ✗ | Blog-artikelen bestaan maar geen `/blog/page.tsx` hub |
| `/alternative` (index-pagina) | ✗ | Alternatief-pagina's bestaan maar geen `/alternative/page.tsx` hub |
| `/sitemap` (HTML-versie) | ✗ | Alleen `/sitemap.xml` (machine-readable) |
| Contactpagina | Gedeeltelijk | `/support` bestaat maar form submit is niet geïmplementeerd |

### 7.4 Routes in SEO-plan maar niet gerealiseerd

Van de geplande pagina's in `INDXR-SITEMAP.md`:

| Gepland in INDXR-SITEMAP.md | Status |
|-----------------------------|--------|
| `/youtube-transcript-downloader` | Empty stub (directory bestaat, geen page.tsx) |
| `/blog/youtube-transcript-obsidian-workflow` | Niet gebouwd |
| `/how-it-works` | Gebouwd maar 301-geredirect naar `/`; content niet live |
| Internationale routes (`/id/`, `/tr/`, `/pt/`) | Post-launch — niet begonnen |

---

## 8. Bekende issues en placeholder markers

### 8.1 Backend hookup TODOs (ontwikkelaar moet API integreren)

| Bestand | Regel | Omschrijving |
|---------|-------|--------------|
| `src/app/dashboard/page.tsx` | 13 | `MOCK_MESSAGES` — fetch van Messages API (admin messages table) ontbreekt |
| `src/app/dashboard/messages/MessagesClient.tsx` | 3 | Vervang mock data met fetch van admin messages API |
| `src/app/dashboard/messages/MessagesClient.tsx` | 4 | Mark-read: `POST /api/messages/[id]/read` — niet geïmplementeerd |
| `src/app/dashboard/messages/MessagesClient.tsx` | 5 | Archive: `POST /api/messages/[id]/archive` — niet geïmplementeerd |
| `src/app/support/page.tsx` | 3 | Form submit: `POST /api/support` — niet geïmplementeerd |
| `src/app/support/page.tsx` | 4 | E-mail routing via categorie-selectie — niet geïmplementeerd |
| `src/app/api/stripe/checkout/route.ts` | 5 | Alle 5 Stripe-producten aanmaken in live mode vóór launch |

### 8.2 Design placeholders (visueel werk nodig)

| Bestand | Regel | Omschrijving |
|---------|-------|--------------|
| `src/components/app-sidebar.tsx` | 664 | Logo-placeholder: vervang door custom hexagon SVG van logo-motief |
| `src/components/docs/DocsShell.tsx` | 68 | Related articles placeholder — `relatedArticles` veld toevoegen aan `DocsPage` type in docs-config.ts |
| `src/components/docs/DocsShell.tsx` | 72 | Right rail placeholder — table of contents (parse headings uit content) |
| `src/components/dashboard/MobileTabBar.tsx` | 8 | Account + Settings toegang via avatar-tap rechtsboven → drawer slide van rechts (Claude Design fase) |
| `src/app/dashboard/settings/page.tsx` | 42 | "Custom themes coming soon." — Preferences-sectie is placeholder |

### 8.3 Content placeholders (Khidr schrijft copy)

| Route | Status |
|-------|--------|
| `/docs/getting-started` | Content aanwezig als placeholder — `sitemap.md` vermeldt "KHIDR: instructional content" |
| `/` (homepage) | Gedeeltelijk — huidige copy beschrijft product maar is door `INDXR-SITEMAP.md` aangemerkt als te herschrijven (hero-URL-balk, pricing-sectie, FAQ-sectie ontbreken) |
| `/pricing` | Gedeeltelijk — `INDXR-SITEMAP.md` markeert als "volledig herschrijven" (nieuwe tier-structuur, calculator) |

### 8.4 Cleanup needed (debug code)

| Bestand | Regels | Context |
|---------|--------|---------|
| `src/app/api/stripe/webhook/route.ts` | 11, 46, 79 | `console.log` — "Webhook endpoint hit", "Processing checkout.session.completed", "Successfully added credits" |
| `src/components/app-sidebar.tsx` | 289, 305 | `console.log` — transcript move debug |
| `src/components/library/TranscriptViewer.tsx` | 354 | `console.log` — view status update |
| `src/contexts/AuthContext.tsx` | 123 | `console.log` — auth state change |

### 8.5 Mock data (live data vervangt mock)

| Bestand | Omschrijving |
|---------|--------------|
| `src/app/dashboard/page.tsx` | `MOCK_MESSAGES` constante — 3 dummy berichten op dashboard home |
| `src/app/dashboard/messages/MessagesClient.tsx` | `MOCK_MESSAGES` array — volledige mock berichten-lijst voor Messages-pagina |

---

## 9. Inconsistenties

### 9A — Codebase vs. `docs/wiki/architecture/sitemap.md`

| # | Wat sitemap.md zegt | Wat codebase toont |
|---|--------------------|--------------------|
| 1 | `/pricing` — type: SERVER | Codebase: `"use client"` (client component) |
| 2 | `/youtube-transcript-downloader` — niet vermeld | Codebase: lege directory aanwezig in `src/app/` |
| 3 | `/test-tokens` — niet vermeld | Codebase: volledig geïmplementeerde design-token testpagina |
| 4 | `sitemap.md` vermeldt `/dashboard/settings` zonder inhoudsbeschrijving | Codebase: bevat SecuritySettingsCard, DeveloperExportsCard (RAG chunk size), ThemeToggle, "Custom themes coming soon" placeholder |
| 5 | Scope-grens: "SEO articles leven op top-level, bereikbaar via DocsShell sidebar" | Correct — maar sitemap.md beschrijft de docs-pagina's (`/docs/*`) en SEO-pagina's als apart, terwijl ze in de sidebar unified zijn via `docsConfig` |

### 9B — Codebase vs. `docs/wiki/business/INDXR-SITEMAP.md`

| # | Wat INDXR-SITEMAP.md plant | Wat codebase toont |
|---|---------------------------|--------------------|
| 1 | `/youtube-transcript-downloader` — volledig artikel, H1: "Download YouTube Transcripts — 8 Formats, One Click" | Empty stub (directory, geen page.tsx) |
| 2 | `/blog/youtube-transcript-obsidian-workflow` — volledig blog-artikel | Niet aanwezig; `/youtube-transcript-obsidian` (top-level SEO-pagina) bestaat wel, maar is een ander URL-pad |
| 3 | `llms.txt` en `robots.txt` als "te bouwen" items | Beide geïmplementeerd in `public/` als statische bestanden |
| 4 | Prijzen in `llms.txt` template: Basic €6.99, Plus €13.99, Pro €27.99 | `checkout/route.ts` PACKAGES object: Try €2.49, Basic €5.99, Plus €11.99, Pro €24.99, Power €49.99 — de `llms.txt` in `public/` bevat afwijkende prijzen (€6.99, €13.99, €27.99) |
| 5 | `/how-it-works` gepland als P0-pagina met volledige inhoud | Gebouwd (bestand bestaat) maar 301-geredirect naar `/`; content is niet live toegankelijk |

### 9C — Interne inconsistenties binnen de codebase

| # | Inconsistentie | Locaties |
|---|---------------|---------|
| 1 | **Sitemap.ts bevat redirect-URLs:** `/faq` en `/how-it-works` staan in `sitemap.ts` met priority 0.6 / 0.7, maar beide worden 301-geredirect in `next.config.ts`. Crawlers die de sitemap volgen, worden naar redirects gestuurd. | `src/app/sitemap.ts` vs `next.config.ts` |
| 2 | **`/docs/*` ontbreekt in sitemap.ts:** De vier docs-routes (`/docs`, `/docs/getting-started`, `/docs/faq`, `/docs/account`) zijn publieke, geïndexeerde pagina's maar niet opgenomen in de XML-sitemap. | `src/app/sitemap.ts` |
| 3 | **`/youtube-transcript-non-english` ontbreekt in sitemap.ts:** Route bestaat en is live maar staat niet in `sitemap.ts`. | `src/app/sitemap.ts` vs `src/app/youtube-transcript-non-english/` |
| 4 | **DocsShell wrapping: docs vs. SEO-pagina's door elkaar:** `DocsShell` wordt gebruikt voor zowel `/docs/*` routes als alle top-level SEO-routes (`/audio-to-text`, `/youtube-to-text`, etc.). URL-structuur en navigatierstructuur zijn ontkoppeld: de sidebar-navigatie (docsConfig) groepeert routes als "Transcribe", "Export", etc., maar de URL-paden volgen geen hiërarchie. | `src/lib/docs-config.ts`, `src/components/docs/DocsShell.tsx` |
| 5 | **`/blog` heeft geen index-pagina:** Drie blog-artikelen bestaan onder `/blog/*`, maar er is geen `/blog/page.tsx`. Navigeren naar `/blog` geeft 404. | `src/app/blog/` |
| 6 | **`/alternative` heeft geen index-pagina:** Vijf vergelijkingspagina's bestaan onder `/alternative/*`, maar er is geen `/alternative/page.tsx`. Navigeren naar `/alternative` geeft 404. | `src/app/alternative/` |
| 7 | **Prijsafwijking tussen llms.txt en checkout:** Prijzen in `public/llms.txt` (€6.99 / €13.99 / €27.99) komen niet overeen met de live Stripe PACKAGES-definitie in `api/stripe/checkout/route.ts` (€5.99 / €11.99 / €24.99). | `public/llms.txt` vs `src/app/api/stripe/checkout/route.ts` |
| 8 | **`/dashboard/billing/success` en `/dashboard/billing/cancel` zijn toegankelijk zonder auth:** Ze staan onder de `/dashboard/` namespace (geblokkeerd in `robots.txt` voor bots), maar de dashboard-layout-guard geldt niet voor success/cancel. Beide pagina's zijn functioneel voor niet-ingelogde bezoekers. | `src/app/dashboard/billing/success/page.tsx`, `src/app/dashboard/billing/cancel/page.tsx` |
| 9 | **Footer verwijst naar routes via docsConfig-labels maar verwijst niet naar `/docs`:** Footer-kolommen (Export Formats, Learn, Compare) linken naar SEO-pagina's op top-level (`/youtube-to-text`, etc.) maar niet naar de docs-hub `/docs` zelf of naar `/docs/faq`. | `src/components/Footer.tsx` |

---

## 10. Voor de research-fase

### 10.1 Open vragen die de audit oproept

1. **Categorie D is één hybride:** 27 routes vallen onder "Docs/SEO hybrid". Is dit één content-tier of twee? Docs-pagina's (`/docs/*`) en SEO-pagina's (top-level) hebben een gedeelde sidebar maar verschillende URL-structuur, metadata-volledigheid, en update-frequency. Hoe moet een toekomstige content-strategie dit onderscheid behandelen?

2. **DocsShell als universele shell:** `DocsShell` omwrappelt zowel gebruikersdocumentatie als SEO-content. De rechter-rail (table of contents) is een placeholder. Als de rechter-rail wordt geïmplementeerd, geldt dat dan voor alle 27 routes, of alleen voor docs-routes (`/docs/*`)?

3. **`/pricing` is client-component zonder metadata:** De pricing-pagina is een `"use client"` component en heeft geen eigen `metadata` export. Metadata-exports werken niet in client components — ze moeten in een server component of in een wrapper zitten. Hoe wordt metadata voor `/pricing` gestuurd?

4. **Geen blog-index, geen alternative-index:** Bezoekers die navigeren naar `/blog` of `/alternative` krijgen 404. Is dit intentioneel? Zijn er plannen voor hubs?

5. **`/test-tokens` in productie:** De design-token testpagina is live op `indxr.ai/test-tokens`. Wordt dit verwijderd of verborgen voor launch?

6. **`/dashboard/messages` is mock:** De volledige messages-feature draait op mock data. Is dit een pre-launch feature of een post-launch feature?

7. **`/support` form is niet functioneel:** Het contactformulier heeft geen submit-endpoint. Is dit een pre-launch blocker?

8. **Prijsafwijking llms.txt vs. checkout:** De prijzen in `llms.txt` kloppen niet met de live Stripe-configuratie. Welke set is de intentionele set?

### 10.2 Strategische beslissingen die research moet beantwoorden

1. **Docs vs. SEO content-tier:** Moeten `/docs/*` en top-level SEO-pagina's als één geünificeerde content-structuur worden behandeld (één URL-hiërarchie, één template-set), of als twee aparte tiers met eigen URL-patronen, navigatie, en metadata-strategieën?

2. **`/how-it-works` is 301 maar het plan beschreef het als P0-pagina:** De URL `/how-it-works` is weggeleid naar `/`. De geplande content (uitgebreide product-uitleg, HowTo schema) bestaat niet. Vervalt deze pagina, of wordt de content elders (bijv. `/` hero of `/docs/getting-started`) geïntegreerd?

3. **Homepage structuur:** Het `INDXR-SITEMAP.md` plan beschrijft een homepage met URL-invoerbalk als hero, pricing-sectie, FAQs, en schema markup. De huidige homepage heeft deze elementen niet. Dit is een inhoudsbeslissing die het hero-component, de landing-page copy, en de metadata raakt.

4. **`/pricing` server vs. client:** De huidige client component blokkeert Next.js metadata-export. Als metadata voor `/pricing` nodig is (Offer schema, OG tags), moet de pagina worden omgezet naar server component of een server/client split worden gebruikt.

### 10.3 Open architectuurkeuzes

1. **`metadataBase` ontbreekt:** Geen `metadataBase` in root `layout.tsx`. Canonical URLs en absolute OG/Twitter image URLs kunnen niet correct worden gegenereerd. Dit is een technische keuze die vóór het implementeren van afbeeldings-metadata moet worden gemaakt.

2. **Sitemap-structuur:** `sitemap.ts` is één flat bestand met handmatig bijgehouden routes. Het plan in `INDXR-SITEMAP.md` beschrijft gesegmenteerde sitemaps (`sitemap-pages.xml`, `sitemap-features.xml`, etc.). De huidige implementatie bevat ook redirect-URLs en mist `/docs/*` en `/youtube-transcript-non-english`. De vraag is of de sitemap wordt gesegmenteerd en automatisch gegenereerd vanuit `docsConfig`, of handmatig bijgehouden blijft.

3. **`/dashboard/billing/success` en `/cancel` buiten auth-guard:** Dit is een bewuste architectuurkeuze (Stripe redirect kan landing buiten auth-sessie), maar het betekent dat deze pagina's technisch toegankelijk zijn voor iedereen. De huidige implementatie veronderstelt dat de `session_id` in de URL de enige benodigde context is — geen gebruikersdata wordt getoond zonder actieve auth.

---

*Audit voltooid: 2026-05-03*  
*Bron: directe inspectie van codebase — geen aannames*
