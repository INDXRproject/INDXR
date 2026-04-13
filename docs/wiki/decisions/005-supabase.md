# Beslissing 005: Supabase als Auth + Database Platform

**Status:** Geaccepteerd  
**Datum:** 2025-01  
**Gerelateerde code:** `src/utils/supabase/`, `src/contexts/AuthContext.tsx`, `supabase/migrations/`

---

## Context

INDXR.AI heeft drie fundamentele infrastructuur-behoeften:
1. **Authenticatie** — email/wachtwoord + Google OAuth
2. **Database** — opslag van transcripten, credits, gebruikers
3. **Autorisatie** — gebruikers mogen alleen hun eigen data zien

De keuze van database/auth platform bepaalt de architectuur voor de komende jaren.

---

## Beslissing

**Supabase** gebruiken als geïntegreerd platform voor auth, PostgreSQL database, en Row-Level Security.

- Auth: `@supabase/supabase-js` + `@supabase/ssr`
- Database: PostgreSQL via Supabase SDK + directe RPC calls
- Autorisatie: RLS policies op alle 6 user-facing tabellen
- Service Role Key: uitsluitend op de Python backend (niet in de browser)

---

## Rationale

**Waarom niet custom auth (NextAuth, Clerk, Auth0)?**

| Factor | Custom/NextAuth | Clerk | Supabase |
|--------|----------------|-------|----------|
| OAuth providers | Zelf configureren | Managed | Managed |
| Database integratie | Handmatig | Handmatig | Ingebouwd |
| RLS | Handmatig | Niet van toepassing | Ingebouwd in PostgreSQL |
| Kosten | Variabel | Duur bij schaal | Genereus gratis tier |
| Vendor lock-in | Laag | Hoog | Matig (PostgreSQL is open) |

Supabase's integratie van auth + database in één platform elimineert een hele klasse van syncing-problemen (auth state vs. database state). De `auth.users` tabel is direct gekoppeld aan onze `profiles` tabel via foreign key.

**RLS als security layer:**
Row-Level Security in PostgreSQL garandeert dat zelfs als er een bug in de applicatielogica zit, een gebruiker nooit andermans transcripten kan lezen. Dit is een defense-in-depth benadering. Audit gedocumenteerd in STATUS.md (6 tabellen gereviewd).

**Service Role Key isolatie:**
De service role key (bypass RLS) zit uitsluitend in de Python backend, nooit in de browser. Next.js API routes gebruiken de anon key met de user's JWT. Dit voorkomt dat een XSS-aanval volledige database-toegang geeft.

---

## Consequenties

**Voordelen:**
- OAuth (Google) out-of-the-box
- RLS elimineert een klasse van authorization bugs
- PostgreSQL met RPC functions voor atomic operations (credits)
- Supabase migraties zijn versie-beheerd in `supabase/migrations/`

**Trade-offs:**
- Vendor lock-in op Supabase's auth infrastructure
- Supabase SSR vereist specifieke client-setup (`src/utils/supabase/server.ts` vs `client.ts`)
- Email verification uitgeschakeld tijdens development (checklist: re-enablen voor productie)
- Supabase free tier heeft limieten (database grootte, bandwidth, auth users)

**Gotcha's:**
- Middleware (`src/middleware.ts`) moet `updateSession()` aanroepen om de cookie te refreshen
- `createClient()` verschilt per context: server component, client component, route handler, middleware — elk heeft zijn eigen import pad
