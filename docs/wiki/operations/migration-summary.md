# Migratie & recente sprint — snel overzicht

**Bijgewerkt:** 2026-05-17  
**Doel:** 5 minuten lezen → volledig begrip van huidige staat, wat gedaan is, wat resteert.

---

## 1. Huidige staat

| Aspect | Staat |
|---|---|
| **Monorepo** | pnpm workspaces + Turborepo: `apps/marketing`, `apps/app`, `packages/shared` |
| **Vercel** | 2 projecten: `indxr-marketing` (indxr.ai) en `indxr-app` (app.indxr.ai) |
| **Auth** | Cross-host cookies op `.indxr.ai` — sessie aangemaakt op `indxr.ai`, geldig op `app.indxr.ai` |
| **Marketing host** | `indxr.ai` (canonical) — `www.indxr.ai` 301 → apex |
| **App host** | `app.indxr.ai` — dedicated `AppTopbar` + `AppSidebar` (geen marketing Header/Footer) |
| **Stripe webhook** | Live op `app.indxr.ai/api/stripe/webhook`; eerste betaling nog niet getest |
| **Rate limiting** | `noopLimiter` actief — Upstash vars verwijderd na quota blow-out (2026-05-06) |
| **Build** | `pnpm build` → 2/2 apps slagen, Turborepo cache actief |

---

## 2. Wat is gedaan (chronologisch)

### Pre-migratie (vóór 2026-05-05)
- Codebase cleanup (A1–A1b): stale files verwijderd, credit-formule, export-consolidatie, BACKEND_API_SECRET
- Supabase email verificatie re-enabled

### Monorepo setup (2026-05-05)
- **B0.8:** pnpm workspace + Turborepo scaffolded; `packages/shared` aangemaakt; alle shared imports herschreven naar relatieve paden
- **B1.1:** `vercel.json` minimized (zero-config Turborepo integratie)

### Vercel + domeinen (2026-05-06)
- **B1.2/B2:** Twee Vercel projecten aangemaakt; 15 + 18 env vars gemigreerd
- **B3:** Custom domains overgedragen — `indxr.ai` op `indxr-marketing`, `app.indxr.ai` op `indxr-app`. Curl-verificatie ✓
- **B4:** A-record update `indxr.ai` → `216.150.1.1` (Vercel IP range). Badge verdwenen ✓
- **B5:** Stripe webhook geregistreerd op `app.indxr.ai/api/stripe/webhook`. `STRIPE_WEBHOOK_SECRET` in Vercel ✓
- Cross-host 308 redirects voor `app.indxr.ai/login|signup|forgot-password` → `indxr.ai/...`

### App-host skelet refactor (2026-05-06/07)
- Marketing `Header` verwijderd uit apps/app root layout
- Nieuw: `AppTopbar.tsx` (logo + ThemeToggle + Messages + Credits + AvatarDropdown)
- Nieuw: `AvatarDropdown.tsx` (app-host variant met relatieve links)
- Sidebar: `variant="inset"` → `collapsible="none"` (flex flow, geen fixed positioning)
- Dashboard layout: `AppTopbar` buiten `SidebarProvider`, `flex-1 overflow-hidden` structuur
- Post-login routing: `/dashboard/transcribe` → `/dashboard`

### 15 visuele fixes (2026-05-07, drie batches)
- Batch 1 (9 fixes): page layouts (home centering, library dubbele padding, billing max-width), VideoTab width, sidebar Progress CSS-cycle, ThemeToggle Moon, AppTopbar credits hoogte
- Batch 2 (3 fixes): ThemeToggle JS-driven (useState mounted), VideoTab input flex layout, hint tekst boven input
- Batch 3 (3 fixes): VideoTab Search icon verwijderd, PlaylistManager ListOrdered icon verwijderd, AppTopbar Messages baseline gelijkgetrokken

### Upstash quota incident (2026-05-05/06)
- 500K requests in 5 dagen door stale Supabase cookie + refresh-loop + onbekende 60s ping
- Fix: `UPSTASH_REDIS_REST_URL` + `_TOKEN` verwijderd uit beide Vercel projects; `noopLimiter` actief

### B6 smoke tests + auth fixes (2026-05-17)
- **getClaims() fix (TEST 8):** `updateSession()` in middleware gebruikt nu `getClaims()` ipv `getUser()` — geen netwerk-calls bij geen sessie, geen retry-loop, geen cookie-clearing. Verwijderd: `clearAuthCookies` (wiste PKCE code-verifier, brak OAuth en password-reset flows). `/auth/callback` uitgesloten van marketing middleware matcher (defense-in-depth).
- **TEST 9 (onboarding redirect):** `router.push('/dashboard/transcribe')` in `onboarding/page.tsx` navigeerde naar `indxr.ai/dashboard/transcribe` → 404. Fix: `window.location.href = appHref('/dashboard')`.
- **TEST 10 (password reset PKCE):** `resetPasswordForEmail` stuurde reset-link direct naar `app.indxr.ai/dashboard/settings` — PKCE code nooit ingewisseld → `otp_expired`. Fix: `redirectTo` via `indxr.ai/auth/callback?next=<encoded settings URL>`; callback wisselt code in en redirect naar `next` met hostname-validatie.
- TEST 8/9/10 PASS in productie ✓

---

## 3. Wat resteert voor launch

### Blokkeerders
- [x] Playwright smoke tests (TEST 1–7 + 12) ✓ 2026-05-08
- [x] Auth smoke tests handmatig (TEST 8/9/10) ✓ 2026-05-17
- [ ] **Custom SMTP (Resend)** — Supabase built-in rate limit 2/h blokkeert productie-email. Resend gekozen (native Supabase integratie). Setup: Resend account → DNS verificatie → Supabase Dashboard → Authentication → SMTP Settings.
- [ ] **Stripe eerste echte betaling** — Try-pakket €2.49; uitgesteld door Khidr (tax setup)
- [ ] **Stripe webhook delivery verifiëren** — `checkout.session.completed` → status 200 in Stripe Dashboard
- [ ] **Upstash quota strategie** — quota plan beslissen; env vars opnieuw toevoegen na beslissing (refresh-loop architectureel opgelost via getClaims())

### Openstaand (niet-blokkerend)
- [ ] B7: Oud `indxr` Vercel project verwijderen (al gedisconnect van GitHub)
- [ ] `NEXT_PUBLIC_PYTHON_BACKEND_URL` verwijderen uit Vercel dashboard (stale var)
- [ ] "Automatically skip unnecessary deployments" inschakelen in beide Vercel projects (Project Settings → Git)
- [ ] Supabase database backups configureren
- [ ] `LOG_LEVEL=WARNING` in Railway
- [ ] `has_ever_purchased` implementeren in Stripe webhook
- [ ] Messages page: `MOCK_MESSAGES` vervangen door echte API of verwijderen
- [ ] Welkomstmessage bij signup implementeren (Supabase trigger of webhook)
- [ ] Marketing host redesign: `/login`, landing page nav (gepland, geen deadline)

Volledig overzicht: `docs/wiki/operations/known-issues.md` → Pre-Launch Checklist.

---

## 4. Key decisions gedocumenteerd

| Document | Onderwerp |
|---|---|
| `docs/wiki/architecture/app-host-skeleton.md` | UI structuur app-host, layout beslissingen, visuele punten |
| `docs/wiki/architecture/cross-host-auth.md` | Cookie strategie, auth flows, env var contract, middleware |
| `docs/wiki/operations/cross-host-smoke-tests.md` | 13 smoke tests, 8 geautomatiseerd |
| `docs/wiki/operations/known-issues.md` | Pre-launch checklist, actieve bugs, beperkingen |
| ADR-019 t/m ADR-031 | Technische beslissingen backend, polling, watchdog, proxy |

---

## 5. Key files & locaties

| File | Wat |
|---|---|
| `apps/app/src/components/AppTopbar.tsx` | Topbar (logo + controls) |
| `apps/app/src/components/AvatarDropdown.tsx` | Avatar dropdown (app-host variant) |
| `apps/app/src/components/app-sidebar.tsx` | Sidebar (713 regels, custom collapse state) |
| `apps/app/src/app/dashboard/layout.tsx` | Skelet wrapper (SidebarProvider + flex structuur) |
| `apps/marketing/src/app/login/page.tsx` | Login pagina, stuurt `redirectTo=/dashboard` |
| `apps/marketing/src/app/auth/callback/route.ts` | OAuth callback, redirects naar `/dashboard` |
| `packages/shared/src/actions/auth-actions.ts` | Server Action login; fallback `/dashboard/transcribe` (nooit bereikt via UI) |
| `packages/shared/src/components/free-tool/VideoTab.tsx` | Single video tool (shared) |
| `packages/shared/src/components/ui/theme-toggle.tsx` | ThemeToggle (JS-driven, useState mounted) |
| `packages/shared/src/lib/ratelimit.ts` | noopLimiter actief (Upstash vars weg) |
| `tests/playwright/specs/cross-host/` | Smoke tests (TEST 1–7 + 12) |
| `playwright.smoke.config.ts` | Smoke test config (productie URLs) |
