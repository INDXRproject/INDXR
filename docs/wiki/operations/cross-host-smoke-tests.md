# Cross-host smoke tests

**Scope:** Post-monorepo migratie validatie van de volledige auth- en navigatieflow op de split-host productieomgeving (`indxr.ai` + `app.indxr.ai`).  
**Gebruik:** Vink elke stap af in productie. Gebruik incognito venster tenzij anders vermeld. Status: `[ ]` = niet getest, `[x]` = geslaagd, `[!]` = mislukt.

---

## Pre-test checklist

Voer dit uit vóór je begint met de tests.

### Vercel env vars — indxr-marketing

| Var | Verwachte waarde |
|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://app.indxr.ai` |
| `NEXT_PUBLIC_MARKETING_URL` | `https://indxr.ai` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` (geen quotes) |
| `PYTHON_BACKEND_URL` | `https://indxr-production.up.railway.app` |
| `BACKEND_API_SECRET` | ingesteld |
| `NEXT_PUBLIC_POSTHOG_KEY` | `phc_...` |
| `ADMIN_EMAIL` | admin email |
| `UPSTASH_REDIS_REST_URL` | **verwijderd** (noopLimiter actief) |
| `UPSTASH_REDIS_REST_TOKEN` | **verwijderd** (noopLimiter actief) |

### Vercel env vars — indxr-app

| Var | Verwachte waarde |
|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://app.indxr.ai` |
| `NEXT_PUBLIC_MARKETING_URL` | `https://indxr.ai` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` (geen quotes) |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (sensitive) |
| `PYTHON_BACKEND_URL` | `https://indxr-production.up.railway.app` |
| `NEXT_PUBLIC_AUDIO_UPLOAD_URL` | `https://indxr-production.up.railway.app` |
| `BACKEND_API_SECRET` | ingesteld |
| `STRIPE_SECRET_KEY` | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` |
| `NEXT_PUBLIC_POSTHOG_KEY` | `phc_...` |
| `ADMIN_EMAIL` | admin email |
| `NEXT_PUBLIC_PYTHON_BACKEND_URL` | **niet aanwezig** (stale var, te verwijderen) |
| `UPSTASH_REDIS_REST_URL` | **verwijderd** (noopLimiter actief) |
| `UPSTASH_REDIS_REST_TOKEN` | **verwijderd** (noopLimiter actief) |

### Supabase Dashboard — Auth → URL Configuration

| Instelling | Vereiste waarde |
|---|---|
| Site URL | `https://indxr.ai` |
| Allowed Redirect URL | `https://indxr.ai/auth/callback` |
| Allowed Redirect URL | `https://app.indxr.ai/dashboard/settings?reset=true` |
| Allowed Redirect URL | `https://indxr.ai/**` |
| Allowed Redirect URL | `https://app.indxr.ai/**` |
| ~~`*.vercel.app`~~ | **verwijderd** (oud project) |

---

## TEST 1 — Cross-host redirects (app.indxr.ai auth-paden)

Verifieer dat auth-paden op de app-host doorsturen naar marketing.

```bash
curl -I https://app.indxr.ai/login
curl -I https://app.indxr.ai/signup
curl -I https://app.indxr.ai/forgot-password
```

| Check | Verwacht | Status |
|---|---|---|
| `app.indxr.ai/login` → 308 `indxr.ai/login` | HTTP 308, Location: `https://indxr.ai/login` | [ ] |
| `app.indxr.ai/signup` → 308 `indxr.ai/signup` | HTTP 308, Location: `https://indxr.ai/signup` | [ ] |
| `app.indxr.ai/forgot-password` → 308 `indxr.ai/forgot-password` | HTTP 308, Location: `https://indxr.ai/forgot-password` | [ ] |

---

## TEST 2 — Email/password login + cross-host redirect

**Browser:** incognito

1. Ga naar `https://indxr.ai/login`
2. Vul geldige credentials in, klik Log In
3. Wacht op redirect

| Check | Verwacht | Status |
|---|---|---|
| Na login: browser URL | `https://app.indxr.ai/dashboard` | [ ] |
| Dashboard rendert correct | Geen foutpagina, sidebar zichtbaar | [ ] |
| Cookie aanwezig (DevTools → Application → Cookies → `.indxr.ai`) | `sb-<project>-auth-token` aanwezig met domain `.indxr.ai` | [ ] |
| Header toont ingelogde staat | Avatar/naam zichtbaar, geen "Login" knop | [ ] |

---

## TEST 3 — Directe app-toegang zonder sessie

**Browser:** incognito (geen cookies)

1. Ga direct naar `https://app.indxr.ai/dashboard`

| Check | Verwacht | Status |
|---|---|---|
| Redirect naar login | Browser gaat naar `https://indxr.ai/login?next=https://app.indxr.ai/dashboard` | [ ] |
| `next`-parameter aanwezig in URL | `?next=https://app.indxr.ai/dashboard` | [ ] |
| Na inloggen: redirect terug | Browser gaat naar `https://app.indxr.ai/dashboard` (het next-pad) | [ ] |

---

## TEST 4 — Navbar links op marketing (indxr.ai)

**Browser:** normaal venster, niet ingelogd

1. Ga naar `https://indxr.ai`
2. Inspecteer navigatielinks in de Header

| Check | Verwacht | Status |
|---|---|---|
| "Pricing" link → `https://indxr.ai/pricing` | Zelfde domein | [ ] |
| "Docs" link → `https://indxr.ai/docs` | Zelfde domein | [ ] |
| "Log in" knop → `https://indxr.ai/login` | Zelfde domein | [ ] |
| "Go to app" / dashboard knop → `https://app.indxr.ai/dashboard` | Gaat naar app subdomain | [ ] |

**Browser:** ingelogd

| Check | Verwacht | Status |
|---|---|---|
| Header toont ingelogde staat | Avatar, geen login-knop | [ ] |
| Dashboard-link in Header → `https://app.indxr.ai/dashboard` | Gaat naar app subdomain | [ ] |

---

## TEST 5 — Navbar links op app (app.indxr.ai)

**Browser:** ingelogd, op `https://app.indxr.ai/dashboard`

| Check | Verwacht | Status |
|---|---|---|
| Logo-link in Header → `https://indxr.ai/` | Gaat naar marketing | [ ] |
| "Pricing" link → `https://indxr.ai/pricing` | Gaat naar marketing | [ ] |
| Sidebar: interne dashboard-links | Blijven op `app.indxr.ai` | [ ] |

---

## TEST 6 — Logout op app.indxr.ai

**Browser:** ingelogd op `https://app.indxr.ai/dashboard`

1. Klik op sign-out (sidebar of Header)

| Check | Verwacht | Status |
|---|---|---|
| Browser gaat naar `https://indxr.ai/login` | Redirect naar marketing login | [ ] |
| Cookie `.indxr.ai` verdwenen (DevTools) | `sb-*` cookies weg of expired | [ ] |
| Terug naar `https://app.indxr.ai/dashboard` zonder inloggen | Redirect naar login (sessie cleared) | [ ] |

---

## TEST 7 — Logout op indxr.ai (marketing Header)

**Browser:** ingelogd, op een marketing-pagina zoals `https://indxr.ai/pricing`

1. Klik op sign-out in de Header

| Check | Verwacht | Status |
|---|---|---|
| Browser gaat naar `https://indxr.ai/login` | Redirect (of page refresh zonder auth) | [ ] |
| Header toont niet-ingelogde staat daarna | Login-knop zichtbaar | [ ] |

---

## TEST 8 — Google OAuth login

**Browser:** incognito

1. Ga naar `https://indxr.ai/login`
2. Klik Google knop

| Check | Verwacht | Status |
|---|---|---|
| Redirect naar Google accounts | `accounts.google.com` in URL | [ ] |
| Na Google auth: callback op marketing | Browser gaat via `https://indxr.ai/auth/callback?code=...` | [ ] |
| Eindbestemming | `https://app.indxr.ai/dashboard` | [ ] |
| Cookie `.indxr.ai` aanwezig | `sb-*` met domain `.indxr.ai` in DevTools | [ ] |

---

## TEST 9 — Signup flow

**Browser:** incognito, nieuw (niet-bestaand) emailadres

1. Ga naar `https://indxr.ai/signup`
2. Vul email + wachtwoord in, submit

| Check | Verwacht | Status |
|---|---|---|
| Verificatie-email ontvangen | Email van Supabase/indxr.ai met bevestigingslink | [ ] |
| Klik verificatielink → `indxr.ai/auth/callback?code=...` | Geen 404, geen error | [ ] |
| Redirect naar onboarding | `https://indxr.ai/onboarding` | [ ] |
| Onboarding invullen → redirect naar app | `https://app.indxr.ai/dashboard` | [ ] |

---

## TEST 10 — Forgot password flow

**Browser:** incognito

1. Ga naar `https://indxr.ai/forgot-password`
2. Vul bekend emailadres in, submit

| Check | Verwacht | Status |
|---|---|---|
| Reset-email ontvangen | Link in email gaat naar `https://app.indxr.ai/dashboard/settings?reset=true` | [ ] |
| Klik link → geen fout | Pagina laadt op app.indxr.ai | [ ] |
| Password reset formulier zichtbaar | Settings-pagina toont reset-optie | [ ] |
| Wachtwoord updaten slaagt | Geen error, bevestiging zichtbaar | [ ] |

---

## TEST 11 — Stripe checkout (eenmalige betaling)

**Vereiste:** Stripe account actief in live mode, Try-pakket (€2.49) aangemaakt.

1. Log in op `app.indxr.ai/dashboard`
2. Ga naar Billing
3. Klik "Try" pakket

| Check | Verwacht | Status |
|---|---|---|
| Stripe Checkout opent | Verwijst naar `checkout.stripe.com` | [ ] |
| Success URL na betaling | `https://app.indxr.ai/dashboard/billing/success` | [ ] |
| Cancel URL | `https://app.indxr.ai/dashboard/billing/cancel` | [ ] |
| Stripe Dashboard → Webhooks → Event deliveries | `checkout.session.completed` → status 200 | [ ] |
| Credits bijgeschreven na betaling | Credit balance verhoogd in dashboard | [ ] |

---

## TEST 12 — Admin route

1. Log in met ADMIN_EMAIL account
2. Ga naar `https://app.indxr.ai/admin`

| Check | Verwacht | Status |
|---|---|---|
| Admin-pagina laadt | Gebruikersoverzicht zichtbaar | [ ] |
| Niet-admin account → admin toegang | Redirect of 403 (geen toegang) | [ ] |

---

## TEST 13 — Vercel function logs controle

Na alle bovenstaande tests:

1. Vercel Dashboard → `indxr-marketing` → Functions → `/login` → logs
2. Vercel Dashboard → `indxr-app` → Functions → `/dashboard` → logs

| Check | Verwacht | Status |
|---|---|---|
| Geen onverwachte 500s in marketing logs | Alleen 200/307 op auth routes | [ ] |
| Geen 500s in app logs na login | Dashboard requests slagen | [ ] |
| `[auth-recovery]` pings nog aanwezig op `indxr.ai/`? | Noteer frequentie als referentie | [ ] |

---

## Resultaten samenvatting

| Test | Beschrijving | Automatisering | Status |
|---|---|---|---|
| TEST 1 | Cross-host redirects (308) | ✓ `redirects.spec.ts` | [ ] |
| TEST 2 | Email/password login + cross-host redirect | ✓ `auth-flow.spec.ts` | [ ] |
| TEST 3 | Directe app-toegang zonder sessie | ✓ `auth-flow.spec.ts` | [ ] |
| TEST 4 | Navbar links op marketing | ✓ `nav.spec.ts` | [ ] |
| TEST 5 | Navbar links op app | ✓ `nav.spec.ts` | [ ] |
| TEST 6 | Logout op app.indxr.ai | ✓ `logout.spec.ts` | [ ] |
| TEST 7 | Logout op indxr.ai | ✓ `logout.spec.ts` | [ ] |
| TEST 8 | Google OAuth login | [Manual] Third-party auth, niet automatiseerbaar | [ ] |
| TEST 9 | Signup flow | [Manual] Vereist echte verificatie-email | [ ] |
| TEST 10 | Forgot password flow | [Manual] Vereist echte reset-email | [ ] |
| TEST 11 | Stripe checkout | [Manual] Third-party + Stripe tax setup pending | [ ] |
| TEST 12 | Admin route | ✓ `admin.spec.ts` | [ ] |
| TEST 13 | Vercel function logs | [Manual] Dashboard-only inspectie | [ ] |

---

## Hoe testen

### Playwright smoke tests (TEST 1–7 + 12)

Vereiste: `tests/test_accounts.json` aanwezig (zie `.gitignore`).

```bash
# Tegen productie (default: https://indxr.ai + https://app.indxr.ai)
pnpm test:smoke

# Headed (zichtbaar browser)
pnpm test:smoke:headed

# Tegen andere omgevingen
BASE_URL_MARKETING=https://indxr.ai BASE_URL_APP=https://app.indxr.ai pnpm test:smoke
```

Config: `playwright.smoke.config.ts`  
Specs: `tests/playwright/specs/cross-host/`

**Auth setup:** De `setup`-project logt eenmalig in met `account1` en slaat cookies op in `tests/playwright/specs/cross-host/.auth.json`. Wordt gereset bij elke `pnpm test:smoke` run.

### Handmatige tests (TEST 8–11 + 13)

Gebruik incognito venster. Volg de stappen per test hierboven. Vink af wanneer geslaagd.
