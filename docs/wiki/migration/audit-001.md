# Monorepo Migratie Audit 001

**Datum:** 2026-05-05  
**Doel:** Read-only audit ter voorbereiding op pnpm workspaces monorepo-migratie (apps/marketing + apps/app + packages/shared)  
**Restore-checkpoint:** commit `1fc0589`  
**Referentie ADR:** `docs/wiki/decisions/045-two-vercel-projects-decision.md`

---

## SECTIE 1: HOSTNAME-ROUTING IN MIDDLEWARE

Bestand: `src/middleware.ts` (116 regels totaal)

### Blok A — Helper-functies (regels 7–17)
`isAppHost(hostname)` detecteert `app.indxr.ai` of `app.localhost*`; `isMarketingHost(hostname)` detecteert `indxr.ai`, `www.indxr.ai`, en `localhost*` zonder `app.`-prefix.

### Blok B — Constanten en padlijsten (regels 4–30)
`APP_PATHS = ['/dashboard', '/admin']` en `MARKETING_AUTH_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password', '/onboarding', '/auth', '/suspended']` definiëren welke paden bij welke host horen.

### Blok C — Local dev passthrough (regels 44–57)
Op `localhost:3000` (zonder `app.`-prefix): geen cross-host routing, maar beschermt dashboard/admin met een **same-host** redirect naar `/login` als de gebruiker niet ingelogd is.

### Blok D — Marketing host: app-paden redirecten naar app subdomain (regels 59–70)
Als `isMarketingHost` en het pad is een app-pad (`/dashboard/*` of `/admin/*`): **308-redirect** naar `APP_URL + pathname`. Dit blok valt weg na migratie (twee aparte Vercel-projecten kennen elkaars routes niet meer).

### Blok E — App host: auth-paden redirecten naar marketing (regels 72–79)
Als `isAppHost` en het pad is een auth-pad: **308-redirect** naar `MARKETING_URL + pathname`. Dit blok valt weg na migratie.

### Blok F — App host: root → dashboard (regels 82–85)
`/` op app-host: 308-redirect naar `/dashboard`. Blijft relevant; in `apps/app/` kan dit als Next.js `page.tsx`-redirect of middleware.

### Blok G — App host: niet-app-pad → marketing (regels 88–92)
Elk pad dat niet in `APP_PATHS` zit op de app-host: **308-redirect** naar `MARKETING_URL`. Dit blok valt weg na migratie (marketing-routes bestaan niet in `apps/app/`).

### Blok H — App host: auth-guard (regels 94–101)
Niet-ingelogde gebruiker op app-pad: redirect naar `MARKETING_URL/login?next=<absolute-app-url>`. Blijft nodig in `apps/app/` middleware (maar `APP_URL` en `MARKETING_URL` komen beide uit env vars).

### Conclusie na migratie
Blokken D, E, G verdwijnen volledig. Blokken F, H worden vereenvoudigd voor `apps/app/`-only middleware. `apps/marketing/` heeft nog minimale middleware nodig (updateSession + strip www-redirect).

---

## SECTIE 2: CROSS-HOST LINK HELPERS — USAGE INVENTARIS

### 2.1 Bestand
`src/lib/cross-host-links.ts` bestaat. Exporteert:
- `marketingHref(path: string): string` — prefixed met `NEXT_PUBLIC_MARKETING_URL`
- `appHref(path: string): string` — prefixed met `NEXT_PUBLIC_APP_URL`

Beide lezen uit `process.env` op module-laadtijd (client-side safe omdat het `NEXT_PUBLIC_*` variabelen zijn).

### 2.2 `appHref(` aanroepen in src/

| File | Hits | Voorbeeld |
|------|------|-----------|
| `src/components/Header.tsx` | 5 | `<a href={appHref('/dashboard')}` (regel 40) |
| `src/app/docs/account-and-data/credits-and-billing/page.tsx` | 1 | `<a href={appHref('/dashboard/account')}>` (regel 62) |

### 2.3 `marketingHref(` aanroepen in src/

| File | Hits | Voorbeeld |
|------|------|-----------|
| `src/components/Footer.tsx` | 7 | `href={marketingHref(link.href)}` (regel 32) |
| `src/components/Header.tsx` | 14 | `<a href={marketingHref('/')}` (regel 90) |
| `src/components/TranscriptCard.tsx` | 3 | `href={marketingHref('/signup')}` (regel 257) |
| `src/components/free-tool/PlaylistTab.tsx` | 1 | `<a href={marketingHref('/pricing')}>` (regel 548) |
| `src/components/dashboard/WelcomeCreditCard.tsx` | 1 | `window.location.href = marketingHref('/pricing')` (regel 129) |
| `src/components/docs/DocsShell.tsx` | 3 | `href={marketingHref('/docs')}` (regel 24) |
| `src/components/library/TranscriptViewer.tsx` | 1 | `<a href={marketingHref('/pricing')}` (regel 823) |
| `src/components/PlaylistAvailabilitySummary.tsx` | 1 | `<a href={marketingHref('/pricing')}>` (regel 353) |
| `src/components/free-tool/AudioTab.tsx` | 4 | `<a href={marketingHref('/login')}` (regel 220) |
| `src/components/free-tool/VideoTab.tsx` | 1 | `<a href={marketingHref('/pricing')}` (regel 1219) |
| `src/components/app-sidebar.tsx` | 1 | `window.location.href = marketingHref('/login')` (regel 190) |
| `src/app/(app)/dashboard/billing/cancel/page.tsx` | 1 | `<a href={marketingHref('/pricing')}>` (regel 24) |
| `src/app/(app)/dashboard/transcribe/page.tsx` | 1 | `<a href={marketingHref('/docs')}` (regel 381) |

---

## SECTIE 3: LEKKENDE LINKS — POTENTIËLE RESIDU

### Grep A — `<Link href="/dashboard` of `<Link href="/admin` buiten `(app)/`

Deze components worden gerenderd op marketing-host (via `src/app/transcribe/page.tsx`) of zijn shared. Na migratie naar twee aparte Vercel-projecten breken deze links als ze op de marketing-host renderen.

| File | Regel | Exacte regel |
|------|-------|--------------|
| `src/components/library/TranscriptList.tsx` | 262 | `<Link href="/dashboard/transcribe">` |
| `src/components/library/TranscriptViewer.tsx` | 726 | `<Link href="/dashboard/library">` |
| `src/components/library/TranscriptViewer.tsx` | 763 | `<Link href="/dashboard/library">` |
| `src/components/free-tool/AudioTab.tsx` | 673 | `<Link href="/dashboard/library">` |
| `src/components/free-tool/VideoTab.tsx` | 1160 | `<Link href="/dashboard/library" ...>` |
| `src/components/free-tool/VideoTab.tsx` | 1291 | `<Link href="/dashboard/billing" ...>` |
| `src/components/free-tool/VideoTab.tsx` | 1328 | `<Link href="/dashboard/library">` |
| `src/components/free-tool/VideoTab.tsx` | 1345 | `<Link href="/dashboard/library">` |
| `src/components/TranscriptCard.tsx` | 428 | `<a href="/dashboard/billing" ...>` (geen `appHref`!) |
| `src/app/contact/page.tsx` | 161 | `<a href="/dashboard/messages" ...>` (geen `appHref`!) |

**Opmerking:** `TranscriptCard.tsx` regel 428 en `contact/page.tsx` regel 161 gebruiken nog niet eens `appHref` — ze hebben een absolute raw relatieve URL. Dit zijn twee niet-gerepareerde instances bovenop de `<Link>`-gevallen.

### Grep B — `<Link href="/login|signup|pricing|about|blog` of root-`/` in `src/app/(app)/`

Geen hits gevonden. De app-routes zijn correct opgeschoond.

---

## SECTIE 4: ROUTE GROEP STRUCTUUR — VERHUISKAART

### 4.1 Files in `src/app/(app)/` → allen naar `apps/app/`

```
src/app/(app)/admin/credits/CreditsCsvExport.tsx          → apps/app/
src/app/(app)/admin/credits/page.tsx                       → apps/app/
src/app/(app)/admin/layout.tsx                             → apps/app/
src/app/(app)/admin/page.tsx                               → apps/app/
src/app/(app)/admin/paid-users/page.tsx                    → apps/app/
src/app/(app)/admin/transcripts/[id]/page.tsx              → apps/app/
src/app/(app)/admin/transcripts/page.tsx                   → apps/app/
src/app/(app)/admin/transcripts/TranscriptDeleteButton.tsx → apps/app/
src/app/(app)/admin/users/page.tsx                         → apps/app/
src/app/(app)/admin/users/UsersTable.tsx                   → apps/app/
src/app/(app)/dashboard/account/page.tsx                   → apps/app/
src/app/(app)/dashboard/billing/cancel/page.tsx            → apps/app/
src/app/(app)/dashboard/billing/page.tsx                   → apps/app/
src/app/(app)/dashboard/billing/success/page.tsx           → apps/app/
src/app/(app)/dashboard/layout.tsx                         → apps/app/
src/app/(app)/dashboard/library/[id]/page.tsx              → apps/app/
src/app/(app)/dashboard/library/page.tsx                   → apps/app/
src/app/(app)/dashboard/messages/MessagesClient.tsx        → apps/app/
src/app/(app)/dashboard/messages/page.tsx                  → apps/app/
src/app/(app)/dashboard/page.tsx                           → apps/app/
src/app/(app)/dashboard/settings/page.tsx                  → apps/app/
src/app/(app)/dashboard/transcribe/page.tsx                → apps/app/
```

### 4.2 Directories in `src/app/` — bestemming

| Directory | Bestemming |
|-----------|-----------|
| `src/app/(app)/` | → `apps/app/` |
| `src/app/(marketing)/` | → `apps/marketing/` (root home page) |
| `src/app/about/` | → `apps/marketing/` |
| `src/app/actions/` | → `apps/app/` (credits.ts + rag-export.ts zijn app-functies) |
| `src/app/api/admin/` | → `apps/app/` (vereist ADMIN_EMAIL auth) |
| `src/app/api/ai/` | → `apps/app/` (summarize, gebruikt door dashboard) |
| `src/app/api/check-playlist-availability/` | → `apps/app/` (called from free-tool → shared) of `apps/marketing/` — zie vraag 1 |
| `src/app/api/extract/` | → `apps/marketing/` (free tool) of beide — zie vraag 1 |
| `src/app/api/jobs/` | → `apps/app/` (polling voor dashboard transcription) |
| `src/app/api/playlist/` | → `apps/app/` (playlist jobs) |
| `src/app/api/stripe/` | → `apps/app/` (checkout + webhook) |
| `src/app/api/transcribe/` | → `apps/app/` (preflight + whisper) |
| `src/app/api/video/` | → `apps/marketing/` of beide (metadata ook voor free tool) |
| `src/app/articles/` | → `apps/marketing/` |
| `src/app/auth/` | → `apps/marketing/` (login actions, callback) |
| `src/app/contact/` | → `apps/marketing/` |
| `src/app/docs/` | → `apps/marketing/` |
| `src/app/forgot-password/` | → `apps/marketing/` |
| `src/app/login/` | → `apps/marketing/` |
| `src/app/onboarding/` | → `apps/marketing/` |
| `src/app/pricing/` | → `apps/marketing/` |
| `src/app/privacy/` | → `apps/marketing/` |
| `src/app/signup/` | → `apps/marketing/` |
| `src/app/suspended/` | → `apps/marketing/` |
| `src/app/terms/` | → `apps/marketing/` |
| `src/app/transcribe/` | → `apps/marketing/` (de free tool landing page) |
| `src/app/styles/` | → dupliceren in beide of `packages/shared/` |
| `src/app/layout.tsx` | → **dupliceren**: marketing-layout + app-layout (beide hebben eigen providers) |
| `src/app/sitemap.ts` | → `apps/marketing/` (bevat alleen marketing-URLs) |

---

## SECTIE 5: AUTH FLOW LOCATIES

| File | Doel | Bestemming |
|------|------|-----------|
| `src/app/login/page.tsx` | Login-formulier (email + Google OAuth), roept Server Actions aan | → `apps/marketing/` |
| `src/app/signup/page.tsx` | Signup-formulier (email + Google OAuth) | → `apps/marketing/` |
| `src/app/auth/actions.ts` | Server Actions: `signIn`, `signUp`, `signInWithGoogle`, `resetPassword`, `signOut`. Post-login redirect gaat naar `NEXT_PUBLIC_APP_URL/dashboard/transcribe`. | → `apps/marketing/` |
| `src/app/auth/callback/route.ts` | OAuth code-exchange, disposable-email check, onboarding-redirect. Redirectt naar `APP_URL/dashboard/transcribe` na succes. | → `apps/marketing/` (auth-callback hoort bij marketing host per ADR-045) |
| `src/app/forgot-password/page.tsx` | Forgot-password formulier | → `apps/marketing/` |

Er is geen `src/app/reset-password/` directory. De reset-wachtwoord flow verloopt via Supabase magic-link die terugstuurt naar `NEXT_PUBLIC_SITE_URL/dashboard/settings?reset=true` (zie auth/actions.ts regel 222). Dit is een inconsistentie: `NEXT_PUBLIC_SITE_URL` is niet gedefinieerd in `.env.example` en de target `/dashboard/settings` is een app-route. Zie Sectie 12 voor observatie.

---

## SECTIE 6: SHARED COMPONENT KANDIDATEN

Legenda: **[shared]** = beide apps, **[app-only]** = alleen apps/app/, **[mkt-only]** = alleen apps/marketing/, **[unused]** = nergens geïmporteerd

### Top-level components (`src/components/`)

| Component | Rubricering | Toelichting |
|-----------|------------|------------|
| `app-sidebar.tsx` | **[app-only]** | Alleen in `dashboard/layout.tsx` |
| `AuthModal.tsx` | **[unused]** | Nergens geïmporteerd |
| `CreditBalance.tsx` | **[unused]** | Nergens geïmporteerd (ui/credit-balance.tsx bestaat ook — zie ui/) |
| `FeatureCard.tsx` | **[unused]** | Nergens geïmporteerd |
| `Footer.tsx` | **[shared]** | Marketing layouts (32 files) én importeert `marketingHref` → gaat naar `packages/shared/` |
| `Header.tsx` | **[shared]** | 4 marketing-layout imports + bevat `appHref`/`marketingHref` → `packages/shared/` |
| `HeroImage.tsx` (root) | **[unused]** | Nergens geïmporteerd (shaduw van `marketing/HeroImage.tsx`) |
| `PlaylistAvailabilitySummary.tsx` | **[mkt-only]** | Via `PlaylistManager` → `PlaylistTab` → `src/app/transcribe/page.tsx` en `dashboard/transcribe` |
| `PlaylistManager.tsx` | **[shared]** | Gebruikt in `PlaylistTab` die in zowel marketing-transcribe als app-dashboard staat |
| `SaveErrorModal.tsx` | **[app-only]** | Alleen in `dashboard/transcribe/page.tsx` |
| `theme-provider.tsx` | **[mkt-only]** | In `src/app/layout.tsx` (wordt gedupliceerd naar beide layout.tsx) |
| `TranscriptCard.tsx` | **[shared]** | Gebruikt door `free-tool/VideoTab` en `AudioTab`, die in beide apps worden gebruikt |
| `UserAvatar.tsx` | **[app-only]** | Alleen in `Header.tsx` en `app-sidebar.tsx` (Header is shared maar UserAvatar alleen app-relevant) |

### `src/components/content/` — **[mkt-only]**
`ArticleTemplate`, `TutorialTemplate`, `ToolPageTemplate`, `AuthorCard` — alleen in `src/app/articles/`.

### `src/components/dashboard/` — **[app-only]**
`ActiveJobsIndicator`, `BillingPurchaseGrid`, `MobileTabBar`, `WelcomeCreditCard`, plus settings-kaarten — alleen in `(app)/dashboard/`.

### `src/components/docs/` — **[mkt-only]**
`DocsShell`, `DocsBreadcrumb`, `DocsHubHero`, `FeaturedDocsGrid`, `DocsCategorySection` etc. — alleen in `src/app/docs/`.

### `src/components/free-tool/` — **[shared]**
`VideoTab`, `AudioTab`, `PlaylistTab` — geïmporteerd in zowel `src/app/transcribe/page.tsx` (marketing) als `src/app/(app)/dashboard/transcribe/page.tsx` (app).

### `src/components/library/` — **[app-only]**
`TranscriptList`, `TranscriptViewer`, `AiSummaryView`, `RagExportView` — alleen in `(app)/dashboard/library/`.

### `src/components/marketing/` — **[mkt-only]**
`ClosingCTASection`, `DifferentiatorStrip`, `FAQAccordion`, `FrictionConversionCard`, `HeroImage`, `HowItWorksBlock`, `MacbookMockupFrame`, `MicroTrustRow`, `PricingTeaserBlock`, `RemotionLoop`, `StatsFromTesting`, `TestimonialPlaceholder` — alleen in marketing-routes.

### `src/components/pricing/` — **[mkt-only]**
`BuyButton`, `AlwaysFreeBlock`, `CreditCostTable`, `PricingHero`, `PricingTierCard`, `PricingTierGrid`, `SecondaryTierStrip`, `TrustRowCards`, `VatLine` — alleen in `src/app/pricing/page.tsx`.

### `src/components/seo/` — **[mkt-only]**
`JsonLd` — alleen in marketing-routes (pricing, about, docs).

### `src/components/transcription/` — **[shared]**
`TranscriptionProgress` — geïmporteerd in zowel `free-tool/AudioTab` als `free-tool/VideoTab`, die beide shared zijn.

### `src/components/ui/` — **[shared]**
Alle Shadcn/ui primitives worden gebruikt in zowel app- als marketing-routes. → `packages/shared/` of dupliceren in beide apps. Zie vraag 3.

---

## SECTIE 7: SUPABASE UTILS LOCATIES

### 7.1 Bestanden

`src/utils/supabase/`:
- `client.ts` — browser-client
- `server.ts` — server-component client
- `middleware.ts` — `updateSession()` voor Next.js middleware

`src/lib/`:
- `cross-host-links.ts` — `marketingHref`/`appHref` helpers
- `admin.ts` — (leeg/niet gevonden bij audit)
- `stripe.ts` — Stripe instantie
- `ratelimit.ts` — Upstash rate limiter
- `utils.ts` — (niet gelezen, vermoedelijk cn() helper)
- `pricing.ts`, `authors.ts`, `docs-config.ts`, `eta.ts`, `pollingBackoff.ts`

### 7.2 Per bestand

| File | Doel | Env vars | Bestemming |
|------|------|----------|-----------|
| `src/utils/supabase/client.ts` | Browser-side Supabase client; setzt cookie domain op `.indxr.ai` in prod | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NODE_ENV` | → `packages/shared/` |
| `src/utils/supabase/server.ts` | Server-component Supabase client; zelfde cookie-config | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NODE_ENV` | → `packages/shared/` |
| `src/utils/supabase/middleware.ts` | `updateSession()`: vernieuwt session-cookie in middleware | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NODE_ENV` | → `packages/shared/` |
| `src/lib/cross-host-links.ts` | `appHref`/`marketingHref` URL-builders | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_MARKETING_URL` | → `packages/shared/` |
| `src/lib/stripe.ts` | Stripe SDK instantie | `STRIPE_SECRET_KEY` | → `apps/app/` only (marketing heeft geen Stripe server-calls) |
| `src/lib/ratelimit.ts` | Upstash sliding-window rate limiter | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | → `apps/marketing/` only (auth rate limiting is in marketing; API routes die rate-limited worden staan ook in marketing) |

---

## SECTIE 8: MANIFEST + ROBOTS + SITEMAP

### 8.1 `src/app/layout.tsx` — metadata manifest
```ts
export const metadata: Metadata = {
  metadataBase: new URL('https://indxr.ai'),
  // ...
  manifest: "/site.webmanifest",
};
```
`metadataBase` is hardgecodeerd op `https://indxr.ai`. Na migratie: de `apps/app/` layout moet `metadataBase` aanpassen naar `https://app.indxr.ai`.

### 8.2 `public/robots.txt`
Bestand is statisch (geen .ts variant). Bevat:
```
Disallow: /dashboard/
Disallow: /admin/
Disallow: /transcribe/
Disallow: /library/
Sitemap: https://indxr.ai/sitemap.xml
```
Na migratie: `apps/marketing/public/robots.txt` behoudt deze regels (dashboard/admin bestaan niet op marketing host — de Disallow-regels zijn dan redundant maar onschadelijk). `apps/app/` heeft een eigen `robots.txt` nodig met `Disallow: /` (app is niet publiek indexeerbaar).

### 8.3 `src/app/sitemap.ts`
Exporteert `default function sitemap(): MetadataRoute.Sitemap`. Bevat uitsluitend marketing-URLs (geen `/dashboard`, geen `/admin`). Hardgecodeerde `baseUrl = "https://indxr.ai"`.  
→ `apps/marketing/` — geen aanpassing nodig behalve import-path.

### 8.4 `public/site.webmanifest`
```json
{
  "name": "INDXR.AI",
  "short_name": "INDXR",
  "icons": [...],
  "theme_color": "#ffffff",
  "background_color": "#ffffff",
  "display": "standalone"
}
```
Geen `start_url` ingesteld. Na migratie: kopieer naar `apps/marketing/public/` (manifest hoort bij marketing host); `apps/app/` kan eigen manifest krijgen met `start_url: "/dashboard"`.

---

## SECTIE 9: ENV VAR USAGE — MATRIX

### Next.js (src/)

| Variabele | Gebruikt in | Scope |
|-----------|------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `src/utils/supabase/` (lib) | NEXT_PUBLIC — beide apps |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `src/utils/supabase/` (lib) | NEXT_PUBLIC — beide apps |
| `NEXT_PUBLIC_APP_URL` | `src/lib/cross-host-links.ts`, `src/app/api/` (marketing API routes), `src/app/auth/actions.ts` | NEXT_PUBLIC — beide apps |
| `NEXT_PUBLIC_MARKETING_URL` | `src/lib/cross-host-links.ts`, `src/middleware.ts`, `src/app/(app)/dashboard/` (5 files), API routes | NEXT_PUBLIC — beide apps |
| `NEXT_PUBLIC_POSTHOG_KEY` | `src/providers/PostHogProvider.tsx`, `src/app/api/stripe/webhook/route.ts` | NEXT_PUBLIC — beide apps |
| `NEXT_PUBLIC_POSTHOG_HOST` | `src/providers/PostHogProvider.tsx`, `src/app/api/stripe/webhook/route.ts` | NEXT_PUBLIC — beide apps |
| `NEXT_PUBLIC_POSTHOG_PROJECT_ID` | `src/app/(app)/admin/` (app-only: UsersTable, paid-users/page) | NEXT_PUBLIC — apps/app/ only |
| `NEXT_PUBLIC_PYTHON_BACKEND_URL` | `src/components/free-tool/AudioTab.tsx` (regel 349) | NEXT_PUBLIC — stale variabele, **niet in .env.example** |
| `NEXT_PUBLIC_SITE_URL` | `src/app/auth/actions.ts` (regels 113, 146, 222, 243) | NEXT_PUBLIC — apps/marketing/ (auth flows); **niet in .env.example** |
| `PYTHON_BACKEND_URL` | `src/app/api/` marketing-API-routes (9 files: extract, transcribe, etc.) | Server-only — apps/marketing/ (proxy routes) én apps/app/ (als die API routes er ook in zitten) |
| `ADMIN_EMAIL` | `src/app/(app)/admin/layout.tsx` (app), `src/app/api/admin/` routes (marketing API) | Server-only — beide apps |
| `BACKEND_API_SECRET` | `src/app/api/` routes (9 files — nog niet geïmplementeerd) | Server-only — beide apps |
| `STRIPE_SECRET_KEY` | `src/lib/stripe.ts` | Server-only — apps/app/ (checkout, webhook) |
| `STRIPE_WEBHOOK_SECRET` | `src/app/api/stripe/webhook/route.ts` | Server-only — apps/app/ |
| `SUPABASE_SERVICE_ROLE_KEY` | `src/lib/admin.ts` (via RPC bypass) | Server-only — apps/app/ |
| `UPSTASH_REDIS_REST_URL` | `src/lib/ratelimit.ts` | Server-only — apps/marketing/ (auth rate limiting) |
| `UPSTASH_REDIS_REST_TOKEN` | `src/lib/ratelimit.ts` | Server-only — apps/marketing/ |
| `NODE_ENV` | `src/utils/supabase/` (cookie domain bepaling) | Impliciet — beide apps |

### Backend (backend/)

| Variabele | Gebruikt in |
|-----------|------------|
| `POSTHOG_API_KEY` | `backend/main.py` regel 33 |
| `UPSTASH_REDIS_REST_URL` | `backend/main.py` regels 60–61 |
| `UPSTASH_REDIS_REST_TOKEN` | `backend/main.py` regels 60–61 |
| `UPSTASH_REDIS_URL` | `backend/main.py` regel 121 (anders dan REST URL) |
| `LOG_LEVEL` | `backend/main.py` regel 97 |
| `SENTRY_DSN_BACKEND` | `backend/main.py` regel 113 |
| `RAILWAY_ENVIRONMENT` | `backend/main.py` regel 116 |
| `BACKEND_API_SECRET` | `backend/main.py` regel 135 |
| `DEEPSEEK_API_KEY` | `backend/main.py` regel 910 |
| `ASSEMBLYAI_API_KEY` | `backend/assemblyai_client.py` regel 7 |
| `SUPABASE_URL` | `backend/credit_manager.py` regels 23–24 |
| `SUPABASE_SERVICE_ROLE_KEY` | `backend/credit_manager.py` regel 24 |

---

## SECTIE 10: PYTHON BACKEND CORS

Bestand: `backend/main.py`, regels 148–161.

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://indxr.ai",
        "https://www.indxr.ai",
        "https://indxr.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**`https://app.indxr.ai` is AFWEZIG** in de `allow_origins`-lijst.

Na migratie: API-aanroepen vanuit `apps/app/` (app.indxr.ai) naar de Railway-backend zullen geblokkeerd worden door CORS. Dit moet gefixed worden vóór launch.

---

## SECTIE 11: EXTERNAL DEPENDENCIES — POTENTIËLE SHARED-PACKAGE-DEPS

Uit `package.json`:

| Dependency | Versie | Gebruik |
|-----------|--------|---------|
| `@supabase/ssr` | ^0.8.0 | Beide apps (auth, session management) |
| `@supabase/supabase-js` | ^2.90.1 | Beide apps (via `@supabase/ssr`) |
| `@radix-ui/react-avatar` | ^1.1.11 | Beide (UserAvatar, Avatar primitive) |
| `@radix-ui/react-checkbox` | ^1.3.3 | Beide (ui/checkbox) |
| `@radix-ui/react-dialog` | ^1.1.15 | Beide (ui/dialog, modals) |
| `@radix-ui/react-dropdown-menu` | ^2.1.16 | Beide (ui/dropdown-menu) |
| `@radix-ui/react-label` | ^2.1.8 | Beide (ui/label, form) |
| `@radix-ui/react-scroll-area` | ^1.2.10 | Beide |
| `@radix-ui/react-select` | ^2.2.6 | Beide |
| `@radix-ui/react-separator` | ^1.1.8 | Beide |
| `@radix-ui/react-slider` | ^1.3.6 | App (AudioTab slider) |
| `@radix-ui/react-slot` | ^1.2.4 | Beide (Button, etc.) |
| `@radix-ui/react-switch` | ^1.2.6 | App (settings) |
| `@radix-ui/react-tabs` | ^1.1.13 | Beide (ui/tabs) |
| `@radix-ui/react-tooltip` | ^1.2.8 | Beide |
| `lucide-react` | ^0.562.0 | Beide |
| `clsx` | ^2.1.1 | Beide (cn() helper) |
| `tailwind-merge` | ^3.4.0 | Beide (cn() helper) |
| `class-variance-authority` | ^0.7.1 | Beide (button variants) |
| `zod` | ^4.3.5 | Beide (API-route validatie, ook marketing-API) |
| `next-themes` | ^0.4.6 | Beide (ThemeProvider in beide layouts) |
| `react-hook-form` | ^7.71.1 | Marketing (login/signup forms) |
| `@hookform/resolvers` | ^5.2.2 | Marketing (samen met react-hook-form) |

---

## SECTIE 12: LOSSE OBSERVATIES

### 1. `NEXT_PUBLIC_SITE_URL` — inconsistente URL voor password reset
`src/app/auth/actions.ts` regels 113, 146, 222, 243 gebruiken `NEXT_PUBLIC_SITE_URL` als base URL voor auth-callbacks en password-reset redirect. De redirect op regel 222 stuurt naar `NEXT_PUBLIC_SITE_URL/dashboard/settings?reset=true`, wat een app-route is. `NEXT_PUBLIC_SITE_URL` is niet gedocumenteerd in `.env.example`. Na migratie moet dit `NEXT_PUBLIC_APP_URL` worden voor de `/dashboard/settings`-redirect en `NEXT_PUBLIC_MARKETING_URL` voor `/auth/callback`.

### 2. `NEXT_PUBLIC_PYTHON_BACKEND_URL` — stale variabele
`src/components/free-tool/AudioTab.tsx` regel 349 leest `process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'http://localhost:8000'`. Alle andere backend-aanroepen gaan via `PYTHON_BACKEND_URL` (server-side). Deze client-side variabele is niet in `.env.example` gedocumenteerd en resulteert in directe client→Railway aanroep (omzeilt Next.js proxy). Mogelijk Werksessie C residu.

### 3. `TranscriptCard.tsx` regel 428 — raw `/dashboard/billing` link
Gebruikt `<a href="/dashboard/billing"` zonder `appHref()`. TranscriptCard wordt op marketing-host gebruikt (via VideoTab/AudioTab op `src/app/transcribe/page.tsx`). Na migratie faalt deze link.

### 4. `src/app/contact/page.tsx` regel 161 — raw `/dashboard/messages` link
Gebruikt `<a href="/dashboard/messages"` zonder `appHref()`. Contact-pagina is marketing-only; deze link verwijst naar app-host. Na migratie faalt deze link.

### 5. `admin/layout.tsx` regel 16 — relatieve redirect naar `/dashboard`
`redirect("/dashboard")` voor niet-admin users is een relatief pad. Op app-host (`app.indxr.ai`) is dit correct — het resolveert naar `app.indxr.ai/dashboard`. Geen probleem.

### 6. Root-level `src/components/HeroImage.tsx` — dode code
Nergens geïmporteerd. `src/components/marketing/HeroImage.tsx` is de actieve versie. Root HeroImage is dode code die voor verwarring kan zorgen.

### 7. `src/components/AuthModal.tsx`, `CreditBalance.tsx`, `FeatureCard.tsx` — ongebruikte components
Geen enkele import gevonden. Mogelijk overblijfselen van een eerdere iteratie.

### 8. `src/components/PlaylistManager.tsx` regels 474, 675, 686 — raw relatieve links
`window.location.href = '/dashboard/library'` (regel 474) en `href={'/dashboard/library/${...}'}` (regels 675, 686). PlaylistManager is shared (gebruikt op marketing-host via PlaylistTab). Na migratie falen deze zonder `appHref()`.

### 9. `app-sidebar.tsx` regels 375, 653 — relatieve href strings (niet `<Link>`)
`href="/dashboard/library"` (regel 375) en `href="/dashboard/billing"` (regel 653) in app-sidebar zijn pure `href`-attributes op anchor-tags of `Link`-componenten. App-sidebar is app-only, dus relatieve paden zijn correct. Geen probleem.

### 10. `billing/success/page.tsx` regels 51, 56 — `<Link href="/dashboard">` en `<Link href="/dashboard/library">`
Dit is een app-route (`(app)/dashboard/billing/success`) op de app-host. Relatieve links zijn hier correct. Geen probleem.

### 11. `src/app/auth/actions.ts` regel 50 — `redirect('/onboarding')` is relatief
In de `signIn` Server Action wordt `redirect('/onboarding')` aangeroepen als `onboarding_completed` false is. Dit is een relatief redirect vanuit de marketing-host Server Action. Na migratie: de marketing-host heeft `/onboarding`, dus dit is correct.

### 12. CORS-probleem is een harde blocker (zie Sectie 10)
`https://app.indxr.ai` ontbreekt in `backend/main.py` `allow_origins`. Dit is een **blocker** voor launch op de app-subdomain.

### 13. `src/app/(marketing)/page.tsx` gebruikt `import Link from "next/link"` (regel 1)
De marketing home-page importeert `Link` voor interne marketing-links (niet cross-host). Dit is correct voor een marketing-only page en geen probleem, zolang geen link naar app-routes bestaat. Ter verificatie: geen `<Link href="/dashboard` of app-paden gevonden.

---

## FINALE SECTIES

### Migratie-impact samenvatting

**a) Files naar `apps/app/`**  
~22 route-files (`src/app/(app)/`) + api/admin (5), api/ai (1), api/jobs (1), api/playlist (3), api/stripe (2), api/transcribe (2) = **~36 route-files**.  
Components: app-sidebar, SaveErrorModal, UserAvatar, alle dashboard/, library/, transcription/-components = **~20 component-files**.  
Totaal schatting: **~56 files**.

**b) Files naar `apps/marketing/`**  
~54 route-files (niet-app-routes, excl. API en layout) + api/extract (1), api/check-playlist-availability (1), api/video (1) = **~57 route-files**.  
Components: Header, Footer, TranscriptCard, PlaylistManager, PlaylistAvailabilitySummary, alle content/, docs/, marketing/, pricing/, seo/, free-tool/ = **~45 component-files**.  
Totaal schatting: **~102 files**.

**c) Files naar `packages/shared/`**  
- `src/utils/supabase/client.ts`
- `src/utils/supabase/server.ts`
- `src/utils/supabase/middleware.ts`
- `src/lib/cross-host-links.ts`
- `src/lib/utils.ts` (cn() helper)
- Alle `src/components/ui/` primitives (33 files)
- `src/components/theme-provider.tsx`

Totaal schatting: **~38 files** (33 ui + 5 utilities).

**d) Gedupliceerde files (in beide apps, niet shared-waardig)**  
- `src/app/globals.css` / design tokens → dupliceren naar beide apps
- `src/app/layout.tsx` → nieuwe variant per app (marketing-layout met Footer, app-layout zonder Footer)
- `tailwind.config` → elke app heeft eigen Tailwind config (verwijst naar shared voor design tokens)
- `src/providers/PostHogProvider.tsx` → dupliceren (beide apps gebruiken PostHog)
- `src/contexts/AuthContext.tsx` → dupliceren of shared (afhankelijk van keuze)

Totaal: **~5–7 files** om te dupliceren.

**e) Te deleten regels/blokken in middleware**  
Na migratie vervallen blokken D, E, G uit `src/middleware.ts` (zie Sectie 1). Dat zijn de complete blokken op regels 59–70 en 76–92 (plus de bijbehorende helper-functies `isMarketingHost`, `isAppHost`, `APP_PATHS`, `MARKETING_AUTH_PATHS`). Schatting: **~50 van de 115 regels** worden gedeleted; resterende ~65 regels worden gesplitst in twee aparte middleware-files.

**f) Werksessie C residu dat GEFIXED moet zijn vóór migratie start**

| # | Item | Bestand | BLOCKER? |
|---|------|---------|---------|
| 1 | `TranscriptCard.tsx` regel 428: `<a href="/dashboard/billing">` zonder `appHref()` | `src/components/TranscriptCard.tsx` | **BLOCKER** — gebruikt op marketing-host |
| 2 | `contact/page.tsx` regel 161: `<a href="/dashboard/messages">` zonder `appHref()` | `src/app/contact/page.tsx` | **BLOCKER** — marketing pagina |
| 3 | `PlaylistManager.tsx` regels 474, 675, 686: `'/dashboard/library'` zonder `appHref()` | `src/components/PlaylistManager.tsx` | **BLOCKER** — gebruikt op marketing-host via PlaylistTab |
| 4 | `NEXT_PUBLIC_SITE_URL` in `auth/actions.ts` regels 113, 146, 222, 243: moet worden opgesplitst naar marketing-URL (voor `/auth/callback`) en app-URL (voor `/dashboard/settings?reset=true`) | `src/app/auth/actions.ts` | **BLOCKER** — password reset redirect gaat naar foute host |
| 5 | `NEXT_PUBLIC_PYTHON_BACKEND_URL` in `AudioTab.tsx` regel 349: client-side directe backend-aanroep; moet via Next.js proxy (server-side `PYTHON_BACKEND_URL`) | `src/components/free-tool/AudioTab.tsx` | **BLOCKER** — CORS en security issue |
| 6 | CORS `allow_origins` in `backend/main.py` mist `https://app.indxr.ai` | `backend/main.py` regel 151–157 | **BLOCKER** — app.indxr.ai aanroepen naar Railway worden geblokkeerd |
| 7 | `MobileTabBar.tsx` en `billing/success/page.tsx` gebruiken `<Link href="/dashboard...">` — veilig omdat ze app-only zijn, maar moeten `Link` (relatief) behouden, geen `appHref` | `src/components/dashboard/MobileTabBar.tsx`, `src/app/(app)/dashboard/billing/success/page.tsx` | Geen blocker — app-only components op app-host |

---

### Vragen voor Khidr

**1. API-routes: split of dupliceren?**  
Routes zoals `src/app/api/extract/route.ts`, `api/video/metadata/`, en `api/check-playlist-availability/` worden aangeroepen door `free-tool/` components die in **beide** apps staan. Moeten deze API-routes gedupliceerd worden in beide Vercel-projecten, of gaat de marketing-app de app-API cross-host aanroepen (met CORS-headers), of wordt de marketing-transcribe-pagina volledig verplaatst naar de app-host?

**2. `src/app/transcribe/` — marketing of app?**  
De `/transcribe`-pagina (de free tool) gebruikt `VideoTab`, `AudioTab`, `PlaylistTab` die allemaal ook `/dashboard/library`- en `/dashboard/billing`-links bevatten. Wordt `/transcribe` volledig naar `app.indxr.ai` verplaatst, zodat de `<Link href="/dashboard/...">` relatief correct zijn? Of blijft het op marketing-host met alle links omgezet naar `appHref()`?

**3. `packages/shared/` voor `src/components/ui/`?**  
Alle 33 Shadcn/ui primitives in `src/components/ui/` zijn ingekopieerde source-files (geen npm). Gaan deze naar `packages/shared/` (met imports via `@indxr/shared/ui/button` etc.), of worden ze **gedupliceerd** in beide apps? Gezien Shadcn-bestanden soms app-specifiek gecustomized worden, is dupliceren veiliger maar minder DRY.

**4. `src/contexts/AuthContext.tsx` en `src/providers/PostHogProvider.tsx`**  
`AuthContext` wordt gebruikt in beide apps (Header is shared, dashboard-routes zijn app). Gaat `AuthContext` naar `packages/shared/`, of krijgt elke app een eigen kopie? (Risico bij shared: build-time dependency op React context tussen packages.)

**5. Stripe webhook op marketing of app host?**  
`src/app/api/stripe/webhook/route.ts` staat momenteel in de marketing-codebase (buiten `(app)/`). Het webhook-endpoint `https://indxr.ai/api/stripe/webhook` is geregistreerd in Stripe. Na migratie: blijft webhook op `indxr.ai` (marketing app), of verhuist het naar `app.indxr.ai`? Als het verhuist, moet het Stripe-dashboard worden geüpdated.
