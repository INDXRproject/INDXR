# Beslissing 013: 25 Welcome Credits + Permanent Paid User Status

**Status:** Geaccepteerd (pending implementatie)
**Datum:** 2026-04-14
**Gerelateerde code:** `src/app/actions/credits.ts` (claim_welcome_reward), `src/lib/ratelimit.ts`, `src/app/api/stripe/webhook/route.ts`

---

## Context

Het oude model gaf 5 gratis credits bij registratie. Met de overgang naar 1 credit = 1 minuut (ADR-009) en nieuwe tiers (ADR-012) was 5 credits te weinig om de product-waarde te demonstreren.

Bovendien bestond er geen "paid user" status — een concept dat nodig is voor het export-gate systeem (ADR-015) en minder strikte rate limiting.

---

## Beslissing 1: 25 welcome credits

Nieuwe gebruikers ontvangen **25 gratis credits** bij account-aanmaak.

**Waarom 25:**
- Dekt een kleine playlist volledig: 20-video playlist → 3 gratis + 17 credits → blijven 8 credits voor samenvattingen
- Genoeg voor één echte taak die de productwaarde bewijst
- Niet genoeg voor doorlopend gebruik — een tweede playlist triggert de eerste aankoop
- Competitor benchmark: YouTube-Transcript.io geeft 25 gratis tokens, DownloadYouTubeTranscripts geeft 10

**Implementatie:** `claim_welcome_reward` stored procedure in Supabase updaten van 5 → 25 credits. De dubbele check (applicatielaag + atomische RPC) blijft bestaan.

**Belangrijk:** Welcome credits verlenen GEEN "paid user" status. Die status is voorbehouden aan gebruikers die via Stripe hebben betaald.

---

## Beslissing 2: Paid user status is permanent

Zodra een gebruiker credits heeft gekocht via Stripe (`total_credits_purchased > 0`), heeft die gebruiker permanent **paid user status** — ook als hun creditsaldo 0 is.

**Voordelen paid user:**
- Alle export-formaten (TXT, SRT, VTT, JSON, CSV) — zie ADR-015
- Ontspannen/geen rate limiting
- Grotere library visibility (zie toekomstige ADR-020)

**Rationale:**
- Beloont de eerste aankoop
- Straft gebruikers niet die hun credits hebben opgemaakt maar even wachten
- Ratchet-effect: eenmaal "paid" voelt de gebruiker nooit "downgraded"

**Implementatie:** `total_credits_purchased` bijhouden in `profiles` tabel of afleiden uit `credit_transactions` met `reason LIKE 'Purchased%'`. Alternatief: sla als boolean `has_ever_purchased` op in `profiles`.

---

## Consequenties

- [ ] `claim_welcome_reward` RPC: aanpassen van 5 → 25
- [ ] Stripe webhook: `total_credits_purchased` of `has_ever_purchased` opslaan in `profiles` bij aankoop
- [ ] Auth context (`AuthContext.tsx`): `isPaidUser` property toevoegen
- [ ] Rate limiting middleware: gebruiken van `isPaidUser` check
- [ ] Export logica: gebruiken van `isPaidUser` voor format-gating
