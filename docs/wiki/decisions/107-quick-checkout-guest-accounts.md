# Beslissing 107: Snelle balie — guest-accounts via admin-created Supabase users, één grootboek

**Status:** Geaccepteerd — **herstelronde (H1/H2/H9) toegevoegd 2026-10-25, zie addendum**
**Datum:** 2026-10-25
**Gerelateerde code:** `supabase/migrations/20261024233643_quick_checkout.sql`, `backend/main.py` (`/api/quote/create`, `/api/quote/{id}`, `/api/quote/{id}/dispatch`, `_pending_quick_quote_file_indices`), `backend/worker.py` (`watchdog_stuck_quick_quotes`), `apps/app/src/app/api/quick-checkout/route.ts`, `apps/app/src/app/api/stripe/webhook/route.ts` (`handleQuickPurchaseSession`, `grantCreditsForSession`), `apps/app/src/app/t/[token]/page.tsx`, `apps/app/src/app/quick/[quoteId]/page.tsx`, `apps/app/src/components/ClaimAccountButton.tsx`, `backend/storage.py`, `backend/ratelimit.py`, `backend/mailer.py`

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
- **Juridisch open punt (ongewijzigd van groeiplan.md §6.1):** of een per-bestand-aankoop een
  EIGEN, aparte "ik verlies mijn herroepingsrecht"-bevestiging vereist (los van de Terms-checkbox
  uit ADR-069) is niet door code te beslissen — gerapporteerd als open vraag voor Khidr.

## Addendum 2026-10-25 — herstelronde (growth-plan.md §6.3 H1/H2/H9)

Een anonieme browser-doorloop na de eerste bouw vond drie structurele gaten; gerepareerd in
dezelfde sessie, los gecommit:

- **H1 (webhook-retry-semantiek).** `grantCreditsForSession`/`handleQuickPurchaseSession` gaven bij
  élke fout stilzwijgend `200` terug — idempotentie (Onderdeel A) maakt een retry VEILIG, maar
  onderdrukte retries betekenen dat een tijdelijke DB-hik "betaald, nooit geleverd" wordt. Beide
  functies retourneren nu een `boolean`: permanent-onherstelbaar/succes → `true` (200), tijdelijke
  fout → `false` (500, Stripe retryt).
- **H2 (dispatch-garantie).** De dispatch-aanroep was gated op `!alreadyProcessed`, dus een retry na
  een MISLUKTE eerste dispatch-poging probeerde nooit opnieuw. `dispatch_quick_quote` (backend) is
  nu per-bestand-idempotent op `job_id` (`_pending_quick_quote_file_indices`), niet op
  `quick_quotes.status` — een herhaalde aanroep pakt precies de ontbrekende bestanden op. Nieuwe
  watchdog-cron `watchdog_stuck_quick_quotes` (worker.py, elke 2 min) als laatste vangnet voor
  betaalde offertes die na 5 min nog niet volledig gedispatcht zijn.
- **H9 (claim-account-UI).** De "met één klik een account claimen"-knop ontbrak, beloofd in de
  balie-copy maar niet gebouwd. Nu: `ClaimAccountButton` op `/t/[token]` stuurt een standaard
  wachtwoord-reset-link naar het guest-e-mailadres (zelfde `/auth/callback?recovery=1`-pad als de
  normale forgot-password-flow); `reset-password/page.tsx` zet `is_guest=false` na een succesvolle
  wachtwoord-set.

**Bijvangst (H10):** de `welcome_credits_50_to_10`-migratie bleek al toegepast maar nooit lokaal
weggeschreven — en bij het repareren bleek dezelfde versie-drift te bestaan op de twee migraties
die deze ADR aanmaakte (`credit_transactions_session_idempotency`, `quick_checkout`): hun
bestandsnaam-timestamp kwam niet overeen met de `version` die Supabase's `apply_migration` er
zelf aan toekende. Alle drie hernoemd naar hun echte versie (zie `docs/LESSONS.md` 2026-10-25).

**Live browser-geverifieerd** (Playwright, `tests/playwright/specs/06-quick-checkout-anonymous.spec.ts`,
tegen `app.indxr.ai`, geautoriseerd door Khidr): 375px + desktop, licht + donker. De volledige
offerte-flow (upload → prijs → "Total") slaagde op mobiel; op desktop blokkeerde de bestaande
misbruik-limiet ("max 2 open onbetaalde offertes per IP") de 3e/4e poging vanaf hetzelfde
testmachine-IP — correct gedrag, geen bug, en de dropzone/foutmelding-UI was in beide
kleurschema's op desktop-breedte zichtbaar correct gestyled.

## Addendum 2026-10-25 (later die dag) — koper-mail in huisstijl

`backend/mailer.py`'s `send_quick_checkout_ready_email` stuurde tot nu toe platte tekst — de enige
transactionele e-mail in de codebase zonder de huisstijl uit `docs/email-templates/` (zelfde
tabel-layout/inline-styles/hex-brandkleuren als `confirm-signup.html`/`reset-password.html` en
`apps/app/src/lib/mail.ts`'s `renderBroadcastEmailHtml`). Nu: een `_render_html`/`_render_text`-
paar in `mailer.py` die exact dezelfde structuur hergebruiken (donkere headerbalk met het witte
wordmark, amber accentstreepje, sentence-case kop, `#141414`-knoppen) — **één knop per transcript**
(niet één knop met alle links erin, want de balie kan meerdere bestanden in één aankoop bevatten).
De herroepingsrecht-bevestiging (H8, hierboven) staat nog steeds in zowel de HTML- als de
tekstversie. `httpx.post`'s payload kreeg een `html`-veld naast het bestaande `text`-veld (Resend
accepteert beide tegelijk — `text` is de fallback voor clients die HTML niet renderen).
**Getest:** `py_compile` groen, een lokale render-smoke-test met 2 bestanden (2 knoppen, geen
exceptions), en een echte testmail naar `contact@indxr.ai` via `railway run` tegen de live
Railway-omgeving (geen foutlog → Resend accepteerde de payload).
