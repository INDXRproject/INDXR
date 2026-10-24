# Beslissing 107: Snelle balie — guest-accounts via admin-created Supabase users, één grootboek

**Status:** Geaccepteerd
**Datum:** 2026-10-25
**Gerelateerde code:** `supabase/migrations/20261025020000_quick_checkout.sql`, `backend/main.py` (`/api/quote/create`, `/api/quote/{id}`, `/api/quote/{id}/dispatch`), `apps/app/src/app/api/quick-checkout/route.ts`, `apps/app/src/app/api/stripe/webhook/route.ts` (`handleQuickPurchaseSession`), `apps/app/src/app/t/[token]/page.tsx`, `apps/app/src/app/quick/[quoteId]/page.tsx`, `backend/storage.py`, `backend/ratelimit.py`, `backend/mailer.py`

## Context

growth-plan.md §2/§6.2: het product had geen betaalmoment voor de bezoeker die met één bestand
komt, snel een transcript wil, en geen account wil aanmaken. De "snelle balie" (upload → prijs
zien → gratis voorproefje van de eerste 3 minuten → betalen per bestand) moet dat lek dichten,
zonder een tweede credit-/jobsysteem naast het bestaande te bouwen.

De kernvraag: hoe koppel je credits en een transcriptie-job aan iemand die nog geen account
heeft, zonder (a) RLS/`user_credits`/`transcription_jobs` te herbouwen voor een guest-pad, of
(b) een duplicaat-grootboek te introduceren.

## Beslissing

**Een anonieme koper krijgt een ECHTE Supabase Auth-user** (`admin.createUser({email,
email_confirm:true})`, geen wachtwoord), aangemaakt in de Stripe-webhook ná betaling, op het
e-mailadres dat Stripe Checkout verzamelde (`session.customer_details.email`). `profiles.is_guest
= true` markeert dit account als guest (UI-signaal, geen aparte toegangslaag). Credits, jobs en
transcripten gebruiken vanaf dat moment exact de bestaande infrastructuur
(`user_credits`/`add_credits`/`reserve_credits`/`transcription_jobs`) — **één grootboek**, geen
nieuw systeem.

**Canonical-email-dedup hergebruikt ADR-024.** Vóór een nieuwe guest wordt aangemaakt, checkt een
nieuwe SECURITY DEFINER-RPC `find_canonical_account(email)` (dezelfde `normalize_email` als
`claim_welcome_reward`) of er al een account — guest of echt — op dat canonieke adres bestaat. Zo
ja, wordt dát account gecrediteerd. Dit voorkomt een los guest-account per `+tag`-alias en laat een
terugkerende koper (ingelogd of niet) in dezelfde portemonnee landen.

**"Met één klik een account claimen"** = een gewone Supabase-wachtwoord-reset/magic-link naar het
guest-account (het bestaat al — `signUp()` zou falen), niet een nieuwe signup-flow. `is_guest`
wordt losgelaten bij de eerste succesvolle login (buiten scope van deze sessie — nog te bouwen UI;
zie eindrapport).

**Offerte vóór betaling: `quick_quotes`, niet een bestaande tabel.** Een los-aangemaakt bestand
moet een Stripe-redirect overleven. Daarom: bestand direct naar R2 (vóór betaling), duur+prijs
vastgelegd in een nieuwe `quick_quotes`-rij (RLS aan, geen policies — alleen service-role +
een publiek `access_token` voor de status-/offertepagina). Geen RLS-policy op basis van het token
nodig omdat elke client-toegang via een server-side route loopt die het token zelf valideert.

**Secure transcript-link = eigen token-kolom, geen RLS-policy.** `transcripts.guest_access_token`
(32 random bytes, hex) + een server-rendered pagina (`/t/[token]`) die met de service-role-key
leest nadat het token gematcht is. De key verlaat de server nooit; er is geen policy nodig die
"toegang via token" zou moeten uitdrukken (RLS kan dat niet native, een token is geen `auth.uid()`).

**Credits-per-bestand = dezelfde credit-formule als AI-transcriptie** (`ceil(duration/60)`, min 1).
`PER_FILE_EUR_PER_MIN` (€0,10) is daarmee effectief het €/credit-tarief voor de balie — geen
tweede prijsformule, alleen een ander tarief per credit dan de pakketten. Reservering/settlement/
refund per bestand lopen via de BESTAANDE `reserve_credits`/`run_whisper_reservation_aware`-wrapper
(ADR-050) — geen nieuwe financiële primitief.

## Rationale

- **Waarom geen "gast-sessie"-cookie/token-systeem i.p.v. een echte auth-user?** Dat zou een
  parallelle identiteitslaag zijn naast Supabase Auth — elke RLS-policy, elke RPC die op
  `auth.uid()` leunt, zou een guest-tak nodig hebben. Een echte (ongeverifieerde-met-wachtwoord)
  auth-user kost niets extra en hergebruikt alles.
- **Waarom credits toekennen in de webhook, niet in `/api/quote/{id}/dispatch`?** De webhook is
  waar `add_credits` al idempotent is op `stripe_session_id` (Onderdeel A, dit groeiplan) — de
  credit-grant en de guest-user-resolve horen bij elkaar, vóór er ook maar een job bestaat.
  `dispatch` is zelf idempotent op `quick_quotes.status` (een tweede aanroep voor een al-'paid'
  quote doet niets) zodat een webhook-retry na een gelukte eerste dispatch niet dubbel dispatcht.
- **Waarom R2-schrijven vóór betaling, niet na?** Dat is precies het lek dat groeiplan.md §6.1
  noemt ("bestand verdwijnt bij een Stripe-redirect, staat nu alleen in geheugen/`/tmp`"/n.v.t. op
  dit nieuwe pad, maar hetzelfde principe) — het bestand moet bestaan onafhankelijk van de
  browser-sessie zodra de koper naar Stripe wordt doorgestuurd.

## Consequenties

- **Nieuwe architecturale koppeling:** de Stripe-webhook (Next.js) roept nu het backend
  (`/api/quote/{id}/dispatch`, backend-secret) aan — vergelijkbaar met hoe `/api/transcribe/whisper`
  al van Next.js naar Railway gaat, maar nu vanuit de webhook. Backend-secret-protected, nooit
  publiek aanroepbaar.
- **E-mail loopt via de backend** (`backend/mailer.py`, directe Resend-REST-call), niet via
  `apps/app/src/lib/mail.ts`. Bewuste keuze: de backend heeft het completion-signaal (job-status),
  en een backend→Next.js-callback alleen voor een e-mail zou meer koppeling toevoegen dan het
  oplost. **Vereist `RESEND_API_KEY`/`RESEND_FROM` ook op Railway** — zie eindrapport (te
  verifiëren door Khidr of deze al gezet zijn).
- **`is_guest`-claim-UI (wachtwoord instellen, `is_guest→false`) is NIET gebouwd in deze sessie** —
  de guest-account-aanmaak en de dedup zijn er, de "met één klik een account claimen"-knop op de
  secure transcript-pagina is een losse, kleinere vervolgtaak.
- **Juridisch open punt (ongewijzigd van groeiplan.md §6.1):** of een per-bestand-aankoop een
  EIGEN, aparte "ik verlies mijn herroepingsrecht"-bevestiging vereist (los van de Terms-checkbox
  uit ADR-069) is niet door code te beslissen — gerapporteerd als open vraag voor Khidr.
