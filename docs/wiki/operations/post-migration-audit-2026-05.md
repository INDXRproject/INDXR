# Post-migratie cross-host link audit

**Datum:** 2026-05-18  
**Scope:** Alle link-, redirect- en navigatiepatronen in apps/app, apps/marketing en packages/shared  
**Uitvoerder:** Claude Code  
**Contract:** `packages/shared/src/lib/cross-host-links.ts`

---

## Link-contract (referentie)

| Helper | Host | Env var | Productie URL |
|--------|------|---------|---------------|
| `marketingHref(path)` | Marketing | `NEXT_PUBLIC_MARKETING_URL` | `https://indxr.ai` |
| `appHref(path)` | App | `NEXT_PUBLIC_APP_URL` | `https://app.indxr.ai` |

**Marketing-paden** (op indxr.ai): `/`, `/pricing`, `/transcribe`, `/login`, `/signup`, `/forgot-password`, `/about`, `/contact`, `/privacy`, `/terms`, `/suspended`, `/onboarding`, `/docs/*`, `/articles/*`, `/auth/*`  
**App-paden** (op app.indxr.ai): `/dashboard/*`, `/admin/*`

---

## Categorie A — `<Link href="/">` in apps/app

Alle hits wijzen naar `/dashboard/*` of `/admin/*` — same-host op app.indxr.ai.

| Bestand | Regel | Pad | Classificatie |
|---------|-------|-----|---------------|
| `apps/app/src/components/AppTopbar.tsx` | 21 | `/dashboard` | ✅ OK — same host |
| `apps/app/src/components/library/TranscriptList.tsx` | 262 | `/dashboard/transcribe` | ✅ OK — same host |
| `apps/app/src/components/library/TranscriptViewer.tsx` | 726 | `/dashboard/library` | ✅ OK — same host |
| `apps/app/src/components/library/TranscriptViewer.tsx` | 763 | `/dashboard/library` | ✅ OK — same host |
| `apps/app/src/app/dashboard/page.tsx` | 90 | `/dashboard/billing` | ✅ OK — same host |
| `apps/app/src/app/dashboard/page.tsx` | 110 | `/dashboard/transcribe` | ✅ OK — same host |
| `apps/app/src/app/dashboard/page.tsx` | 124 | `/dashboard/messages` | ✅ OK — same host |
| `apps/app/src/app/dashboard/page.tsx` | 154 | `/dashboard/library` | ✅ OK — same host |
| `apps/app/src/app/dashboard/page.tsx` | 196 | `/dashboard/library` | ✅ OK — same host |
| `apps/app/src/app/dashboard/billing/cancel/page.tsx` | 29 | `/dashboard` | ✅ OK — same host |
| `apps/app/src/app/dashboard/billing/success/page.tsx` | 51 | `/dashboard` | ✅ OK — same host |
| `apps/app/src/app/dashboard/billing/success/page.tsx` | 56 | `/dashboard/library` | ✅ OK — same host |
| `apps/app/src/app/admin/layout.tsx` | 29–60 | `/admin`, `/admin/users`, `/admin/credits`, `/admin/transcripts`, `/admin/paid-users`, `/dashboard` | ✅ OK — same host |

**Bevinding:** Geen cross-host `<Link>` problemen in apps/app.

---

## Categorie B — `<Link href="/dashboard|/admin">` in apps/marketing

Geen resultaten.

**Bevinding:** ✅ OK — apps/marketing bevat geen `<Link>` naar app-paden.

---

## Categorie C — `<a href="/">` in packages/shared

Geen resultaten.

**Bevinding:** ✅ OK — packages/shared gebruikt geen plain `<a href="/pad">`.

> Noot: packages/shared/src/components/free-tool/VideoTab.tsx bevat wél `<Link href="/dashboard/...">` (behandeld onder Categorie D/aparte analyse hieronder).

---

## Categorie D — `window.location` navigatie

### apps/app (altijd app-host context)

| Bestand | Regel | Expressie | Classificatie |
|---------|-------|-----------|---------------|
| `apps/app/src/components/AvatarDropdown.tsx` | 20 | `window.location.href = marketingHref("/login")` | ✅ OK — cross-host, gebruikt helper |
| `apps/app/src/components/dashboard/WelcomeCreditCard.tsx` | 129 | `window.location.href = marketingHref('/pricing')` | ✅ OK — cross-host, gebruikt helper |
| `apps/app/src/components/app-sidebar.tsx` | 105 | `new URLSearchParams(window.location.search)` | ✅ OK — leest params, geen navigatie |
| `apps/app/src/components/app-sidebar.tsx` | 190 | `window.location.href = marketingHref('/login')` | ✅ OK — cross-host, gebruikt helper |
| `apps/app/src/components/dashboard/billing/BillingPurchaseGrid.tsx` | 28 | `window.location.href = url` | ✅ OK — `url` is absolute Stripe-checkout URL |
| `apps/app/src/app/admin/transcripts/TranscriptDeleteButton.tsx` | 40 | `window.location.reload()` | ✅ OK — reload same page |
| `apps/app/src/app/admin/users/UsersTable.tsx` | 194 | `window.location.reload()` | ✅ OK — reload same page |

### apps/marketing (altijd marketing-host context)

| Bestand | Regel | Expressie | Classificatie |
|---------|-------|-----------|---------------|
| `apps/marketing/src/components/pricing/BuyButton.tsx` | 46 | `window.location.href = url` | ✅ OK — absolute Stripe-checkout URL |
| `apps/marketing/src/app/onboarding/page.tsx` | 46 | `window.location.href = appHref('/dashboard')` | ✅ OK — cross-host, gebruikt helper |
| `apps/marketing/src/app/login/page.tsx` | 32 | `window.location.hostname === 'localhost'` | ✅ OK — leest hostname, geen navigatie |

### packages/shared (rendert op beide hosts)

| Bestand | Regel | Expressie | Classificatie |
|---------|-------|-----------|---------------|
| `packages/shared/src/components/Header.tsx` | 23 | `window.location.href = marketingHref('/login')` | ✅ OK — cross-host, gebruikt helper |
| `packages/shared/src/components/Header.tsx` | 230 | `window.location.href = marketingHref('/login')` | ✅ OK — cross-host, gebruikt helper |
| `packages/shared/src/components/PlaylistManager.tsx` | 472 | `window.location.href = appHref('/dashboard/library')` | ✅ OK — cross-host, gebruikt helper |
| `packages/shared/src/contexts/AuthContext.tsx` | 144 | `window.location.hostname` | ✅ OK — leest hostname |
| `packages/shared/src/contexts/AuthContext.tsx` | 147 | `` window.location.href = `${marketingUrl}/login` `` | ✅ OK — absolute URL via context-var |
| **`packages/shared/src/components/free-tool/VideoTab.tsx`** | **163** | **`window.location.href = '/dashboard/library'`** | **🔴 BUG** |

**BUG-1 — VideoTab.tsx:163:**  
Relatief pad `/dashboard/library` in een component die op **beide** hosts rendert:
- Op `app.indxr.ai/dashboard/transcribe` → navigeert naar `app.indxr.ai/dashboard/library` ✅ werkt
- Op `indxr.ai/transcribe` (marketing) → navigeert naar `indxr.ai/dashboard/library` → **404** (route bestaat niet op marketing)

Correcte fix: `window.location.href = appHref('/dashboard/library')`

---

## VideoTab `<Link>` analyse (aanvullend — packages/shared)

VideoTab bevat ook twee `<Link href={...}>` die dynamic transcript-IDs linken naar de library:

| Bestand | Regel | Expressie | Classificatie |
|---------|-------|-----------|---------------|
| **`packages/shared/src/components/free-tool/VideoTab.tsx`** | **1110** | **`` <Link href={`/dashboard/library/${existingTranscriptId}`}> ``** | **🔴 BUG** |
| **`packages/shared/src/components/free-tool/VideoTab.tsx`** | **1142** | **`` <Link href={`/dashboard/library/${existingTranscriptId}`}> ``** | **🔴 BUG** |

**BUG-2 — VideoTab.tsx:1110, 1142:**  
Dubbel-transcript banner toont "View in Library" link. Wanneer VideoTab op `indxr.ai/transcribe` rendert, navigeert `<Link href="/dashboard/library/[id]">` naar `indxr.ai/dashboard/library/[id]` → **404**.

Correcte fix: vervang `<Link href={...}>` door `<a href={appHref(\`/dashboard/library/${existingTranscriptId}\`)}>` (analoog aan regels 1158 en 1324 in hetzelfde bestand, die dit al correct doen).

> Context: VideoTab wordt geïmporteerd in zowel `apps/marketing/src/app/transcribe/page.tsx` als `apps/app/src/app/dashboard/transcribe/page.tsx`. Op de app-host zijn alle drie de bugs harmless; ze breken alleen op de marketing-host.

---

## Categorie E — `redirect()` server-side calls

### apps/app

| Bestand | Regel | Expressie | Classificatie |
|---------|-------|-----------|---------------|
| `apps/app/src/middleware.ts` | 23 | `NextResponse.redirect(dashboardUrl)` | ✅ OK — relatief `/dashboard`, same-host (app) |
| `apps/app/src/middleware.ts` | 31 | `NextResponse.redirect(loginUrl)` | ✅ OK — `new URL('/login', MARKETING_URL)`, cross-host via env |
| `apps/app/src/app/admin/layout.tsx` | 18 | `redirect("/dashboard")` | ✅ OK — same-host (app), `/dashboard` bestaat |
| `apps/app/src/app/dashboard/billing/page.tsx` | 20 | `` redirect(`${NEXT_PUBLIC_MARKETING_URL}/login`) `` | ✅ OK — absolute URL via env |
| `apps/app/src/app/dashboard/settings/page.tsx` | 11 | `` redirect(`${NEXT_PUBLIC_MARKETING_URL}/login`) `` | ✅ OK |
| `apps/app/src/app/dashboard/layout.tsx` | 22 | `` redirect(`${MARKETING_URL}/login`) `` | ✅ OK |
| `apps/app/src/app/dashboard/layout.tsx` | 32 | `` redirect(`${MARKETING_URL}/suspended`) `` | ✅ OK |
| `apps/app/src/app/dashboard/library/[id]/page.tsx` | 31 | `` redirect(`${NEXT_PUBLIC_MARKETING_URL}/login`) `` | ✅ OK |
| `apps/app/src/app/dashboard/account/page.tsx` | 12 | `` redirect(`${NEXT_PUBLIC_MARKETING_URL}/login`) `` | ✅ OK |

### apps/marketing

| Bestand | Regel | Expressie | Classificatie |
|---------|-------|-----------|---------------|
| `apps/marketing/src/app/auth/callback/route.ts` | 23 | `` NextResponse.redirect(`${MARKETING_URL}/login?error=...`) `` | ✅ OK — same-host |
| `apps/marketing/src/app/auth/callback/route.ts` | 35 | `` NextResponse.redirect(`${MARKETING_URL}/onboarding`) `` | ✅ OK — same-host |
| `apps/marketing/src/app/auth/callback/route.ts` | 43 | `NextResponse.redirect(nextUrl)` | ✅ OK — `nextUrl` is validated, hostname whitelist op app.indxr.ai/localhost |
| `apps/marketing/src/app/auth/callback/route.ts` | 50 | `` NextResponse.redirect(`${APP_URL}/dashboard`) `` | ✅ OK — cross-host, absolute via env |
| `apps/marketing/src/app/auth/callback/route.ts` | 55 | `` NextResponse.redirect(`${APP_URL}/dashboard`) `` | ✅ OK |

**Bevinding:** Alle server-side `redirect()` calls zijn correct.

---

## Categorie F — `router.push` calls

### apps/app

| Bestand | Regel | Expressie | Classificatie |
|---------|-------|-----------|---------------|
| `apps/app/src/components/app-sidebar.tsx` | 114 | `router.push(href)` | ✅ OK — `href` zijn altijd app dashboard-paden |
| `apps/app/src/components/app-sidebar.tsx` | 260 | `router.push("/dashboard/library")` | ✅ OK — same-host |
| `apps/app/src/components/app-sidebar.tsx` | 638 | `router.push(pendingNavHref)` | ✅ OK — app sidebar navigatie |
| `apps/app/src/components/library/TranscriptViewer.tsx` | 671 | `router.push("/dashboard/library")` | ✅ OK — same-host |
| `apps/app/src/app/dashboard/library/page.tsx` | 125 | `router.push("/dashboard/library")` | ✅ OK — same-host |

### apps/marketing

| Bestand | Regel | Expressie | Classificatie |
|---------|-------|-----------|---------------|
| `apps/marketing/src/components/pricing/BuyButton.tsx` | 28 | `router.push(\`/login?next=/pricing\`)` | ✅ OK — `/login` bestaat op marketing-host |
| `apps/marketing/src/app/signup/page.tsx` | 54 | `router.push('/login?message=...')` | ✅ OK — `/login` bestaat op marketing-host |

**Bevinding:** Geen cross-host `router.push` patronen gevonden.

---

## Sitemap-routes check

### Routes in sitemap maar zonder page.tsx
Geen gevonden. Alle 55 routes in `sitemap.ts` hebben een overeenkomend `page.tsx` bestand.

### Pages zonder sitemap-vermelding (intentioneel uitgesloten)
| Pad | Reden |
|-----|-------|
| `/forgot-password` | Auth-stroom, geen SEO-waarde — OK |
| `/onboarding` | Post-signup stroom, geen SEO-waarde — OK |
| `/suspended` | Error-state pagina — OK |

**Bevinding:** ✅ Sitemap volledig en consistent met filesystem.

---

## Redirect-consistentie (next.config.ts)

### apps/app/next.config.ts
| Source | Destination | Classificatie |
|--------|-------------|---------------|
| `/login` | `${MARKETING_URL}/login` | ✅ OK — cross-host, absolute URL |
| `/signup` | `${MARKETING_URL}/signup` | ✅ OK |
| `/forgot-password` | `${MARKETING_URL}/forgot-password` | ✅ OK |

### apps/marketing/next.config.ts
| Source | Destination | Classificatie |
|--------|-------------|---------------|
| `/faq` | `/docs/help/faq` | ✅ OK — same-host, route bestaat |
| **`/account/credits`** | **`/dashboard/account`** | **🔴 BUG** |
| `/how-it-works` | `/` | ✅ OK |
| `/youtube-transcript-generator` | `/transcribe` | ✅ OK |
| `/support` | `/contact` | ✅ OK |
| Alle 13 article-redirects | `/articles/...` | ✅ OK — bestaan allemaal |
| Alle 17 docs-redirects | `/docs/...` | ✅ OK — bestaan allemaal |

**BUG-3 — marketing next.config.ts `/account/credits` redirect:**  
Destination `/dashboard/account` is een relatief pad → Next.js houdt de origin → `indxr.ai/dashboard/account`. Dat pad bestaat **niet** op de marketing-host → **404**.  
Dit was waarschijnlijk een pre-split redirect naar het account-dashboard. Na de monorepo-split moet de destination absoluut verwijzen naar de app-host.  
Correcte fix: `destination: \`${APP_URL}/dashboard/account\`` (waarbij `APP_URL` uit `process.env.NEXT_PUBLIC_APP_URL` komt in next.config.ts).

---

## TypeScript compilatie

```
apps/app:       0 errors  ✅
apps/marketing: 0 errors  ✅
```

---

## Samenvatting

| Categorie | BUG | WARN | OK |
|-----------|-----|------|----|
| A — `<Link>` in apps/app | 0 | 0 | 13 |
| B — `<Link>` in apps/marketing → app-paden | 0 | 0 | 0 (geen hits) |
| C — `<a href>` in packages/shared | 0 | 0 | 0 (geen hits) |
| D — window.location | ~~2~~ → 0 ✅ | 0 | 14 |
| E — server redirect() | 0 | 0 | 14 |
| F — router.push | 0 | 0 | 7 |
| Sitemap | 0 | 0 | 55 routes |
| next.config.ts redirects | ~~1~~ → 0 ✅ | 0 | 36 |
| **Totaal** | **~~4~~ → 0 ✅** | **0** | **~139** |

### Bugs — opgelost 2026-05-18

| # | Bestand | Regel(s) | Probleem | Status |
|---|---------|----------|----------|--------|
| BUG-1 | `packages/shared/src/components/free-tool/VideoTab.tsx` | 163 | `window.location.href = '/dashboard/library'` — relatief pad, breekt op marketing-host | ✅ Opgelost 2026-05-18 — vervangen door `appHref('/dashboard/library')` |
| BUG-2a | `packages/shared/src/components/free-tool/VideoTab.tsx` | 1110 | `` <Link href={`/dashboard/library/${id}`}> `` — cross-host op marketing/transcribe → 404 | ✅ Opgelost 2026-05-18 — vervangen door `<a href={appHref(...)}>` |
| BUG-2b | `packages/shared/src/components/free-tool/VideoTab.tsx` | 1142 | Zelfde patroon als BUG-2a | ✅ Opgelost 2026-05-18 — vervangen door `<a href={appHref(...)}>` |
| BUG-3 | `apps/marketing/next.config.ts` | redirect `/account/credits` | Destination `/dashboard/account` is relatief → `indxr.ai/dashboard/account` → 404 | ✅ Opgelost 2026-05-18 — destination is nu `${APP_URL}/dashboard/account` (absolute URL via `NEXT_PUBLIC_APP_URL`) |

**Build verificatie:** `pnpm turbo run build` — 2 successful, 0 errors ✅
