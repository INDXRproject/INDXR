# Auth & Security

## Authenticatie

### Providers

INDXR.AI ondersteunt twee auth-methoden via Supabase Auth:
- **Email + wachtwoord** (standaard)
- **Google OAuth** (gecontroleerd via `NEXT_PUBLIC_ENABLE_OAUTH=true`)

### Server-Side First

Auth volgt het Supabase SSR patroon:

```
1. Root layout (server component):
   └─ const { data: { user } } = await supabase.auth.getUser()
   └─ Stuurt user door als prop naar <AuthProvider initialUser={user}>

2. AuthProvider (client component, src/contexts/AuthContext.tsx):
   └─ Accepteert initialUser — geen loading state voor eerste render
   └─ Abonneert op supabase.auth.onAuthStateChange() voor updates
   └─ Haalt credits + profile op via RPC en profiles tabel
   └─ Bij SIGNED_OUT op app.indxr.ai: redirect naar indxr.ai/login

3. Middleware (src/middleware.ts):
   └─ updateSession() op elke request → vernieuwt Supabase session cookie
   └─ Hostname-aware routing (zie subdomain-routing hieronder)
   └─ Matcher: alle routes behalve static assets

4. Client components: useAuth() hook voor user/credits/loading
```

---

## Subdomain Routing

Zie ADR-034 (app-subdomain) en ADR-036 (auth-on-marketing-domain).

### Domein-indeling

| Domein | Wat |
|--------|-----|
| `indxr.ai` | Marketing, login, signup, docs, /transcribe |
| `app.indxr.ai` | Dashboard, admin (authenticated app) |

### Middleware hostname routing (`src/middleware.ts`)

| Verzoek | Actie |
|---------|-------|
| `indxr.ai/dashboard/*` | 308 → `app.indxr.ai/dashboard/*` |
| `indxr.ai/admin/*` | 308 → `app.indxr.ai/admin/*` |
| `app.indxr.ai/` | redirect → `/dashboard` |
| `app.indxr.ai/dashboard` (ingelogd) | passthrough |
| `app.indxr.ai/dashboard` (niet ingelogd) | redirect → `indxr.ai/login?next=https://app.indxr.ai/dashboard` |
| `app.indxr.ai/login` | 308 → `indxr.ai/login` |
| `app.indxr.ai/pricing` | 308 → `indxr.ai/pricing` |
| `localhost:3000/*` | local dev passthrough (old auth bewaard) |

### Cookie cross-subdomain sharing

Supabase session cookies worden gezet op root-domain `.indxr.ai`, zodat `indxr.ai` (login) en `app.indxr.ai` (app) dezelfde sessie lezen.

```typescript
const cookieDomain = isProd ? '.indxr.ai' : undefined
// undefined = current host in local dev (geen cross-subdomain nodig)
```

Geconfigureerd in: `src/utils/supabase/server.ts`, `client.ts`, `middleware.ts` (supabase util).

### Login redirect flow (na implementatie subdomain split)

1. `app.indxr.ai/dashboard` zonder sessie → middleware redirect naar `indxr.ai/login?next=https://app.indxr.ai/dashboard`
2. Login form roept `loginAction` (Server Action) aan — client pass `resolvePostLoginTarget()` als `redirectTo` via formData
3. `loginAction` valideert `redirectTo` hostname (app.indxr.ai / localhost / app.localhost) en roept `redirect(finalTarget)` aan — Next.js stuurt 303, geen client-side navigatie
4. Fallback target: `NEXT_PUBLIC_APP_URL + '/dashboard/transcribe'`

> **Waarom Server Action redirect, niet `window.location.href`:** Next.js GitHub #81377 — browser aborteert RSC action-response stream zodra `window.location.href` navigeert; RSC parser gooit "Error in input stream" + "Application error" flash. `redirect()` in de action is atomisch en heeft dit probleem niet.

### Auth callback (`src/app/auth/callback/route.ts`)

Na OAuth code exchange: redirect naar `NEXT_PUBLIC_APP_URL/dashboard/transcribe` (niet `${origin}/...`).

### Nieuwe env vars

| Var | Local dev | Productie |
|-----|-----------|-----------|
| `NEXT_PUBLIC_APP_URL` | `http://app.localhost:3000` | `https://app.indxr.ai` |
| `NEXT_PUBLIC_MARKETING_URL` | `http://localhost:3000` | `https://indxr.ai` |

### PostHog Identificatie

Bij elke login/token-refresh identificeert de frontend de gebruiker in PostHog:
```typescript
posthog.identify(session.user.id, {
    email: session.user.email,
    source: session.user.app_metadata.provider, // 'google' | 'email'
    created_at: session.user.created_at
})
```
Bij logout: `posthog.reset()`.

---

## Rate Limiting

Geconfigureerd in `packages/shared/src/lib/ratelimit.ts` via Upstash Redis (sliding window):

| Tier | Limiet | Venster | Key |
|------|--------|---------|-----|
| Anonymous | 10 requests | 24 uur | IP-adres |
| Free user | 50 requests | 1 uur | user_id |
| Premium user | Onbeperkt | — | Bypass |
| Login pogingen | 10 | 15 minuten | IP |
| Registraties | 5 | 1 uur | IP |

**Fallback:** Als `UPSTASH_REDIS_REST_URL` en `UPSTASH_REDIS_REST_TOKEN` niet geconfigureerd zijn, retourneert alle rate limit checks `{success: true}`. Werkt lokaal zonder Redis.

**Premium check:** `isPremium` flag wordt bepaald in de Extract API route op basis van de user's role of credits-pakket.

---

## Row-Level Security (RLS)

Alle 6 user-facing tabellen hebben RLS ingeschakeld. Gebruikers kunnen **alleen hun eigen data** lezen/schrijven, zelfs bij een bug in de applicatielogica.

| Tabel | RLS Policy |
|-------|-----------|
| `profiles` | `auth.uid() = id` |
| `transcripts` | `auth.uid() = user_id` |
| `collections` | `auth.uid() = user_id` |
| `credit_transactions` | `auth.uid() = user_id` |
| `playlist_extraction_jobs` | `auth.uid() = user_id` |
| `transcription_jobs` | `auth.uid() = user_id` |

**Service Role Key:** Alleen de Python backend heeft de Service Role Key (bypass RLS). Next.js API routes gebruiken de anon key met de user's JWT. De Service Role Key staat nooit in de browser.

### RPC EXECUTE-privileges (2026-07-11, ADR-054)

SECURITY DEFINER-RPC's bypassen RLS — hun **EXECUTE-grant** is dus de enige toegangscontrole. Tot 2026-07-11 waren de credit-muterende RPC's `EXECUTE`-baar door `anon`+`authenticated` (via PUBLIC), waardoor een ingelogde user zichzelf via een directe `rpc()`-call credits kon geven. Gelockt via migratie `20260711170300_lock_credit_rpcs`:

| RPC | Toegestane rol(len) | Reden |
|---|---|---|
| `add_credits`, `reserve_credits`, `settle_credits`, `refund_credits`, `refund_credits_flat`, `update_playlist_video_progress` | **service_role only** | credit-muterend; alleen de Python-backend (of de service-role Stripe-webhook) roept ze aan |
| `deduct_credits_atomic` | `authenticated` + `service_role` | RAG-export server-action trekt de **eigen** credits van de user af (geen exploit); backend gebruikt service_role |
| `claim_welcome_reward` | `authenticated` + `service_role` | server-action; 1× per account (`welcome_reward_claimed`) **én** 1× per canoniek e-mailadres (`normalize_email`-dedup, migratie 20260712220428) |
| `get_user_credits` | `authenticated` + `service_role` (anon+PUBLIC verwijderd) | read-only; `auth.uid()` forceert eigen id voor authenticated callers, service_role mag `p_user_id` (zie hieronder) |
| `submit_support_ticket` | `authenticated` + `service_role` | was al gelockt (geen anon/PUBLIC) |

Alle SECURITY DEFINER-credit-RPC's hebben nu `search_path` gepind (`public, pg_temp`) tegen search_path-hijacking. **Regel:** een nieuwe credit-MUTERENDE RPC krijgt standaard **service_role-only** EXECUTE; alleen een RPC die de eigen data van de aanroepende user muteert (of read-only is) mag `authenticated` behouden — verifieer per RPC tegen de caller-map (frontend+backend grep) vóór je een grant verbreedt.

**Privacy-lek GEDICHT (pre-launch, 2026-07-12, migratie `20260712204359_get_user_credits_own_only`):** `get_user_credits(p_user_id)` accepteerde een willekeurige user-id → een ingelogde user kon via een directe `rpc('get_user_credits', andermans-id)`-call het creditsaldo van een **andere** user lezen (bewezen: user A las 1.339 cr van user B). Dit stond eerder ten onrechte als "post-launch hardening" — het is een privacy-lek en is vóór launch gedicht.

Fix in de functie-body: een `authenticated` caller krijgt `v_target := auth.uid()` en `p_user_id` wordt genegeerd — een user leest dus **alleen zijn eigen** saldo. Alleen `service_role` (Python-backend/admin; `auth.uid()` IS NULL) mag nog een andere user lezen via `p_user_id` — dat is het bewuste service-pad. `anon` en `PUBLIC` verloren `EXECUTE` (waren ongebruikt: alle frontend-callers staan achter `if (user)` en geven de eigen `user.id` mee).

Bewijs (gerolde-back SQL-simulaties tegen productie, 2026-07-12):

| Scenario | Rol | Vraagt op | Resultaat |
|---|---|---|---|
| Pre-fix repro | authenticated A | saldo van B | **1.339** (B's saldo) — lek |
| Post-fix (kritiek) | authenticated A | saldo van B | **1.005** (A's eigen) — dicht |
| Eigen read | authenticated A | eigen saldo | 1.005 ✓ (frontend ongebroken) |
| Backend-pad | service_role | saldo van B | 1.339 ✓ (Python-backend werkt) |
| Anon | anon | saldo van B | `permission denied` ✓ |

---

## Account Suspension

Gebruikers kunnen gesuspendeerd worden via het admin dashboard.

**`profiles.suspended` boolean:**
- `true` = account geblokkeerd
- Gecheckt bij: Extract API, Stripe checkout, AI summarization
- Geen soft-delete: het account bestaat nog, data blijft bewaard
- Gesuspendeerde gebruiker ziet `/suspended` pagina

**Stripe checkout blokkering** (`checkout/route.ts:51-58`):
```typescript
if (profile?.suspended) {
    return new NextResponse('Account suspended. Contact support@indxr.ai', { status: 403 })
}
```

---

## CORS

Python backend accepteert alleen requests van vertrouwde origins (`main.py:97-108`):
```python
allow_origins=[
    "http://localhost:3000",
    "http://localhost:3001",
    "https://indxr.ai",
    "https://www.indxr.ai",
    "https://app.indxr.ai",
    "https://indxr.vercel.app",
]
```

---

## Backend API Secret

De Next.js → Python backend communicatie is beveiligd via `BACKEND_API_SECRET`. Elke API route die de Python backend aanroept, stuurt dit als header. De Python backend valideert dit.

Vereist in Railway environment variables.

---

## Email Verificatie

Supabase email verificatie staat **AAN** (`mailer_autoconfirm=false` — geverifieerd 2026-07-15 via Management API `/config/auth`). Nieuwe email/password-signups gebruiken de **PKCE**-flow: de verificatielink (`.../auth/v1/verify?token=…&type=signup&redirect_to=…`) redirect na klik naar `/auth/callback?code=…&next=…`, waar `exchangeCodeForSession` de sessie zet. De redirect-URL-allowlist accepteert query-strings via `https://indxr.ai/**`, dus een `redirect_to` met `?next=<billing target>` blijft intact (E2E-geverifieerd: nieuwe-koper-funnel signup → verify → onboarding → billing → Stripe). De ingebouwde mailer heeft `rate_limit_email_sent=2`/uur (geen custom SMTP — zie priorities 1.30).

---

## Wegwerpemails

`src/utils/disposable-email.ts` filtert bekende wegwerp-email providers bij registratie om spam-accounts te voorkomen.

## Welkomst-credits anti-abuse (canoniek-e-mail-dedup)

De 25 welkomst-credits waren misbruikbaar via de Gmail-alias-truc: `naam+test1@`, `naam+test2@`,
`na.am@` … wijzen naar dezelfde inbox (Gmail negeert alles na `+` en negeert puntjes), maar Supabase
Auth ziet ze als losse accounts → elk kreeg een eigen 25-credit-grant (~€0,60 echte kost elk).
Feitelijk aangetoond: `contact+test1@indxr.ai` naast `contact@indxr.ai`, elk met eigen grant.

**Fix (migratie `20260712220428`, grant-level):** `claim_welcome_reward` normaliseert het e-mailadres
via `normalize_email(text)` (strip `+tag`; voor `gmail.com`/`googlemail.com` ook puntjes uit het
local-part + domein-canonicalisatie) en verleent de grant **max één keer per canoniek adres**
(`pg_advisory_xact_lock` op het canonieke adres = race-veilig). Aliassen van een reeds-beloond adres
worden geweigerd maar blijven geldige accounts (inloggen + gratis captions). Bewust grant-level i.p.v.
signup-block: breekt geen bestaande accounts en geen legitieme `+addressing`-gebruikers. De RPC blijft
`authenticated`+`service_role`-only (zie RPC EXECUTE-tabel hierboven). Detail + credit-flow in
[credit-system.md](credit-system.md#welcome-reward).

**Eerlijke, geaccepteerde grens:** dit stopt de `+`/puntjes-truc, **niet** tien écht verschillende
mailadressen — inherent aan een gratis-instapmodel zonder betaalmuur. Zwaardere lagen
(device-fingerprint / betaalmethode-vereiste, ADR-024) zijn bewust **niet** nu gebouwd → backlog.
