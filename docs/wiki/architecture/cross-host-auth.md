# Cross-host authenticatie architectuur

**Status:** Baseline — geeft de huidige werking weer (2026-05-06)  
**Context:** Monorepo migratie gesplitst in twee Vercel projects: `indxr-marketing` (indxr.ai) en `indxr-app` (app.indxr.ai). Auth-gerelateerde code gedeeld via `packages/shared`.

---

## User journeys

### Nieuwe bezoeker
```
indxr.ai → signup → email verificatie → indxr.ai/auth/callback
→ indxr.ai/onboarding (profiel invullen) → app.indxr.ai/dashboard/transcribe
```

### Terugkerende gebruiker (email/password)
```
indxr.ai/login → loginAction (SA) → cookie .indxr.ai gezet
→ redirect(https://app.indxr.ai/dashboard)
```

### Terugkerende gebruiker (Google OAuth)
```
indxr.ai/login → loginWithGoogleAction → Google OAuth
→ indxr.ai/auth/callback?code=... → cookie .indxr.ai gezet
→ redirect(https://app.indxr.ai/dashboard)
```

### Directe app-toegang (unauthenticated)
```
app.indxr.ai/dashboard → app-middleware: geen user
→ redirect(https://indxr.ai/login?next=https://app.indxr.ai/dashboard)
→ login → cookie .indxr.ai → redirect terug naar next-param
```

### Logout
```
Header/AppSidebar sign-out knop
→ supabase.auth.signOut() (client-side)
→ AuthContext SIGNED_OUT event: window.location.href = indxr.ai/login
```

---

## Route inventaris

### indxr.ai (apps/marketing)

| Route | Rol |
|---|---|
| `/login` | Email/password + Google OAuth loginformulier |
| `/signup` | Registratieformulier |
| `/forgot-password` | Wachtwoord-reset formulier |
| `/auth/callback` | Supabase OAuth code-exchange; enige OAuth callback |
| `/onboarding` | Profielinvulling na eerste login |
| `/suspended` | Account-geblokkeerd pagina |
| `/transcribe` | Gratis tool (geen auth vereist) |
| `/pricing` `/docs/**` `/articles/**` | Publieke content |
| `/api/extract` `/api/check-playlist-availability` `/api/video/**` | Free-tool API routes |

### app.indxr.ai (apps/app)

| Route | Rol |
|---|---|
| `/` | Middleware redirect → `/dashboard` |
| `/dashboard/transcribe` | Hoofd-transcriptie tool |
| `/dashboard/library` `/dashboard/library/[id]` | Opgeslagen transcripten |
| `/dashboard/account` `/dashboard/settings` | Gebruikersinstellingen |
| `/dashboard/billing/**` | Credits en Stripe checkout |
| `/dashboard/messages` | Notificaties |
| `/admin/**` | Admin-paneel (vereist ADMIN_EMAIL match) |
| `/api/stripe/**` | Stripe checkout en webhook |
| `/api/ai/summarize` `/api/transcribe/**` `/api/jobs/**` `/api/playlist/**` | Backend-proxy routes |

**Geen `/login` op apps/app.** Directe hit op `app.indxr.ai/login` geeft 404. Middleware beschermt alleen `/dashboard` en `/admin`.  
**⚠️ Open:** `app.indxr.ai/login` zou een 307 redirect naar `indxr.ai/login` moeten zijn. Zie `known-issues.md`.

---

## Cookie strategie

Alle Supabase clients in `packages/shared/src/utils/supabase/` gebruiken hetzelfde patroon:

```typescript
const isProd = process.env.NODE_ENV === 'production'
const cookieDomain = isProd ? '.indxr.ai' : undefined
```

| Eigenschap | Waarde (productie) |
|---|---|
| `domain` | `.indxr.ai` (dekt beide `indxr.ai` en `app.indxr.ai`) |
| `sameSite` | `lax` |
| `secure` | `true` |
| `path` | `/` |

**Effect:** Een sessie-cookie aangemaakt op `indxr.ai` (bij login of OAuth callback) is onmiddellijk beschikbaar op `app.indxr.ai`. De `updateSession()` middleware op de app-host leest de cookie en schrijft hem terug met dezelfde `.indxr.ai` domain scope.

**Session check:** `updateSession()` gebruikt `supabase.auth.getClaims()` (niet `getUser()`). `getClaims()` returnt null bij geen sessie zonder netwerk-calls of retry-loops, waardoor de middleware veilig draait op elke route zonder de PKCE verifier te verstoren.

---

## Auth flow — email/password login

```
1. Browser: POST indxr.ai/_next/action (Server Action loginAction)

2. Server (marketing): packages/shared/src/actions/auth-actions.ts
   a. Rate limit check: limiters.login.limit(ip)
      → packages/shared/src/lib/ratelimit.ts
      → noopLimiter als UPSTASH_REDIS_REST_URL ontbreekt (huidig: actief)
   b. supabase.auth.signInWithPassword({ email, password })
      → packages/shared/src/utils/supabase/server.ts
      → Set-Cookie: sb-access-token + sb-refresh-token
         domain=.indxr.ai, secure, sameSite=lax
   c. Onboarding check: profiles.onboarding_completed
      → false: redirect('/onboarding')  (relatief, blijft op marketing)
      → true: doorgaan
   d. Redirect target resolve:
      rawRedirectTo (uit form) → valideer op app.indxr.ai of localhost
      login/page.tsx passeert altijd redirectTo='/dashboard' → effectief doel is APP_URL/dashboard
      Fallback in auth-actions.ts (nooit bereikt via login-UI): APP_URL + '/dashboard/transcribe'
   e. redirect(finalTarget)  ← absolute cross-origin redirect

3. Browser ontvangt 307 → app.indxr.ai/dashboard
   Cookie .indxr.ai is al aanwezig in browser

4. app.indxr.ai middleware: updateSession() leest cookie → user authenticated
   DashboardLayout: supabase.auth.getUser() → user ✓ → render dashboard
```

**Redirect target validatie** (auth-actions.ts):
- Absolute URL geaccepteerd als hostname is `app.indxr.ai` of `localhost` / `app.localhost`
- Relatief pad (`/...`) geaccepteerd als-is
- Alles anders: fallback naar `APP_URL/dashboard/transcribe`

---

## Auth flow — Google OAuth

```
1. Browser: form submit → loginWithGoogleAction() (Server Action)

2. Server: supabase.auth.signInWithOAuth({ provider: 'google',
     options: { redirectTo: MARKETING_URL + '/auth/callback' }
   })
   → redirect(data.url)  ← naar accounts.google.com

3. Google authenticatie → redirect naar:
   https://indxr.ai/auth/callback?code=<code>

4. apps/marketing/src/app/auth/callback/route.ts:
   a. exchangeCodeForSession(code) → Set-Cookie sb-* domain=.indxr.ai
   b. Disposable email check → signOut + redirect naar login indien positief
   c. Onboarding check → redirect naar indxr.ai/onboarding indien nodig
   d. Success: redirect(APP_URL + '/dashboard')
```

**Enige OAuth callback:** `indxr.ai/auth/callback`. De apps/app heeft géén callback route.

---

## Middleware per host

### indxr.ai (apps/marketing/src/middleware.ts)
Doet uitsluitend `updateSession()` — vernieuwt Supabase cookies op elke request. Geen auth-gating: alle marketing-routes zijn publiek toegankelijk.

`/auth/callback` is **uitgesloten** van de matcher. De callback route handelt zelf de code-exchange af (`exchangeCodeForSession`) en heeft geen session-refresh nodig. Middleware draaien op de callback zou de PKCE code-verifier cookie kunnen verstoren.

### app.indxr.ai (apps/app/src/middleware.ts)
```
updateSession() → auth token refresh

pathname === '/'               → redirect /dashboard
isAppPath && !user             → redirect MARKETING_URL/login?next=<absolute-app-url>
anders                         → pass through
```

`isAppPath` matcht `/dashboard` en `/admin` (en al hun sub-paden).

---

## Cross-host links

`packages/shared/src/lib/cross-host-links.ts`:
```typescript
export function marketingHref(path) { return `${NEXT_PUBLIC_MARKETING_URL}${path}` }
export function appHref(path)       { return `${NEXT_PUBLIC_APP_URL}${path}` }
```

Alle cross-host navigatie gebruikt `<a href={...}>` (niet `<Link>`). `<Link>` veroorzaakt Next.js prefetch-crashes bij cross-origin paden (LESSONS.md 2026-05-04).

| Component | Link type |
|---|---|
| `Header.tsx` (marketing-host only) | Marketing-links → `marketingHref()`, app-links → `appHref()` |
| `AppTopbar.tsx` (app-host only) | Logo/nav → relatieve links `/dashboard/...`, logout → `marketingHref('/login')` |
| `Footer.tsx` | Alle links → `marketingHref()` |
| `AvatarDropdown.tsx` (app-host) | Account/Settings → relatieve links, logout → `marketingHref('/login')` |
| `app-sidebar.tsx` | Logout → `window.location.href = marketingHref('/login')` |
| `AuthContext.tsx` | SIGNED_OUT op app-host → `window.location.href = marketingHref('/login')` |
| Dashboard server components | Niet-ingelogd → `redirect(MARKETING_URL + '/login')` |
| app-middleware | Unauthenticated → `redirect(MARKETING_URL + '/login?next=...')` |

**Opmerking:** Marketing `Header.tsx` wordt NIET geladen op `app.indxr.ai`. De app-host heeft een eigen `AppTopbar` (logo + account controls) zonder marketing navigatie (Pricing/Docs/Articles/Try).

---

## Env var contract

### indxr-marketing (Vercel)

| Var | Waarde (productie) | Gebruik |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://app.indxr.ai` | Post-login redirect target, appHref() |
| `NEXT_PUBLIC_MARKETING_URL` | `https://indxr.ai` | marketingHref(), OAuth callback base |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project>.supabase.co` | Supabase client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Supabase client |

### indxr-app (Vercel)

| Var | Waarde (productie) | Gebruik |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://app.indxr.ai` | appHref(), Stripe success/cancel URL |
| `NEXT_PUBLIC_MARKETING_URL` | `https://indxr.ai` | Auth redirects (middleware, layouts) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project>.supabase.co` | Supabase client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Server-only admin client |

---

## Supabase Dashboard — URL Configuration

Verplicht in Supabase Auth → URL Configuration (handmatig door Khidr):

**Site URL:**
```
https://indxr.ai
```

**Allowed Redirect URLs:**
```
https://indxr.ai/auth/callback
https://app.indxr.ai/dashboard/settings?reset=true
https://indxr.ai/**
https://app.indxr.ai/**
```

Lokale dev (optioneel):
```
http://localhost:3000/auth/callback
http://localhost:3000/**
http://app.localhost:3001/**
```

**Verwijder** eventuele `*.vercel.app` URLs van het oude `indxr` project.

---

## Edge cases en open punten

### `app.indxr.ai/login` → 404 (te fixen)
De apps/app heeft geen `/login` route. Middleware beschermt alleen `/dashboard` en `/admin`. Een directe hit op `app.indxr.ai/login` geeft 404 in plaats van een 307 naar `indxr.ai/login`. Fix: voeg een catch-all redirect toe in apps/app middleware of een dedicated redirect-route.

### Password reset flow (PKCE via callback)
`resetPasswordAction` stuurt de reset-link naar:
```
indxr.ai/auth/callback?next=<encoded: app.indxr.ai/dashboard/settings?reset=true>
```
De callback route wisselt de PKCE code in via `exchangeCodeForSession`, leest dan de `next` param, valideert de hostname (alleen `app.indxr.ai` of `localhost`), en redirect daarheen. De settings-pagina toont altijd het password-update formulier (`SecuritySettingsCard`); `reset=true` is een semantische marker.

**Supabase Allowed Redirect URLs:** `https://indxr.ai/**` dekt de `?next=` variant — geen aparte entry nodig.

### Rate limiting uitgeschakeld (tijdelijk)
`UPSTASH_REDIS_REST_URL` + `_TOKEN` zijn verwijderd uit beide Vercel projects na quota-blow-out (2026-05-06). `noopLimiter` actief — alle rate limit checks retourneren `{ success: true }`. Zie `known-issues.md` → Upstash Redis quota.

### Auth-recovery ping (60s interval, onbekende bron)
Vercel logs toonden elke ~60s een `GET / → [auth-recovery] getUser error` op `indxr.ai`. Architectureel opgelost via getClaims() fix (2026-05-17) — middleware doet geen error-recovery meer. Als de ping na deploy blijft: bron opsporen (externe uptime monitor of Vercel Speed Insights met stale cookie).
