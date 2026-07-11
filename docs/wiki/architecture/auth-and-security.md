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
| `claim_welcome_reward` | `authenticated` + `service_role` | server-action; 1× per user (`welcome_reward_claimed`-guard) |
| `get_user_credits` | ACL ongemoeid (anon+authenticated) | read-only; geen balans-mutatie |
| `submit_support_ticket` | `authenticated` + `service_role` | was al gelockt (geen anon/PUBLIC) |

Alle SECURITY DEFINER-credit-RPC's hebben nu `search_path` gepind (`public, pg_temp`) tegen search_path-hijacking. **Regel:** een nieuwe credit-MUTERENDE RPC krijgt standaard **service_role-only** EXECUTE; alleen een RPC die de eigen data van de aanroepende user muteert (of read-only is) mag `authenticated` behouden — verifieer per RPC tegen de caller-map (frontend+backend grep) vóór je een grant verbreedt.

**Openstaand (post-launch hardening):** `get_user_credits(p_user_id)` accepteert een willekeurige user-id → een user kan andermans saldo lezen (minor info-leak, geen credit-diefstal). Harden door `auth.uid()` te gebruiken i.p.v. de parameter.

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

Supabase email verificatie is **uitgeschakeld** tijdens development. Checklist item voor productie: re-enablen in Supabase Dashboard → Auth → Settings.

---

## Wegwerpemails

`src/utils/disposable-email.ts` filtert bekende wegwerp-email providers bij registratie om spam-accounts te voorkomen.
