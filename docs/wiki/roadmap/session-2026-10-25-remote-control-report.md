# Eindrapport — snelle balie + betaalveiligheid (2026-10-25)

Cold-read voor Khidr. Prompt uit `growth-plan.md` §6.2, uitgevoerd A→F, elk onderdeel los commit +
push + deploy-verificatie.

## Per onderdeel

| # | Onderdeel | Status | Commit(s) | Deploy / verificatie |
|---|-----------|--------|-----------|----------------------|
| A | Webhook-idempotentie + payment_status | ✅ done | `f34a923` | Railway api+worker + Vercel beide groen; DB-proof (BEGIN/ROLLBACK) |
| B | Snelle balie (quote → preview → betalen) | ✅ done | `0258bbe` | alle 4 deploys groen; `/api/quote/*` live getest (422, niet 404) |
| C | Welkomstcredits 50 → 10 | ✅ done | `15292a5` | alle 4 deploys groen; DB-proof (+10, niet +50) |
| D | Meting (via/kw, PostHog, Ads-conversie) | ✅ done | `ab60f01` | alle 4 deploys groen |
| E | SEO-hygiëne + **kritieke B-correctie** | ✅ done | `8bc782e` | alle 4 deploys groen (één deploy "cancelled" door snelle F-push erna, geen echte fout) |
| F | Omgedraaide rate-limit-melding | ✅ done | `3348b75` | Vercel + Railway api groen; worker-deploy nog niet bevestigd op moment van dit rapport |

## Kritieke bevinding tijdens Onderdeel E

De opdracht eist expliciet: "Controleer dat de homepage-tekst nog klopt." Bij die controle bleek
**Onderdeel B's balie onbereikbaar voor echte anonieme bezoekers**: `AudioTab` (met de nieuwe
`QuickCheckoutPanel`) rendert alleen op `/dashboard/transcribe`, en `middleware.ts` gate't élk
`/dashboard/*`-pad achter auth — een anonieme bezoeker werd vóór de pagina ooit laadt al naar
`/login` geredirect. Gefixt met een nieuwe publieke pagina `apps/app/src/app/transcribe/page.tsx`
(buiten `/dashboard`, bevestigd niet-gegate't met een directe test van de middleware-logica) —
letterlijk het pad dat de opdracht noemt ("upload ... op `/transcribe`"). Live bevestigd:
`https://app.indxr.ai/transcribe` → HTTP 200 (niet de login-redirect).

## Verificatiebewijs (kort)

- **A:** live Stripe-API-call bevestigt `ideal`/`sepa_debit` beide `off` — geen delayed-payment-
  methods actief vandaag (de fix is dus defensief). Idempotentie bewezen: `add_credits` tweemaal
  met dezelfde `stripe_session_id` → saldo +10 eerste keer, ongewijzigd tweede keer
  (`already_processed:true`), binnen een gerollbackte transactie (geen blijvende mutatie).
- **B:** backend-tests 93 passed/6 pre-existing fails (identiek aan de baseline vóór deze sessie —
  geen regressie); `pnpm build` 2/2 groen; `check-playlist-invariants.sh` ALL_PASS; live
  `/api/quote/create` → 422 (bestaat, valideert) i.p.v. 404.
- **C:** DB-proof identiek aan A's patroon: `claim_welcome_reward` geeft nu +10 i.p.v. +50,
  gerollbackt.
- **D/E/F:** build groen per commit; E/F zijn copy-/routing-fixes zonder financiële impact.

## OVERGESLAGEN / open punten — beslissingen voor Khidr

1. **Juridische vraag (ADR-069 §7, herhaald uit groeiplan.md §6.1):** vereist een per-bestand-
   aankoop een EIGEN, expliciete "ik verlies mijn herroepingsrecht"-bevestiging, los van de
   bestaande Terms-checkbox? Niet door code te beslissen.
2. **Geen live Stripe-testmodus-klikdoorloop uitgevoerd.** Deze sessie had geen browser — alle
   verificatie liep via directe API/SQL-calls (curl, Supabase MCP) en build/test-suites, niet via
   een echte browser-aankoop. De 5 scenario's uit "Klaar als" (anoniem 2 bestanden, ingelogd met
   credits, ingelogd met te weinig saldo, dubbele webhook, mislukte job) zijn **logisch** gedekt
   door de code/architectuur, maar niet end-to-end doorlopen in een browser.
3. **`is_guest → false`-claim-UI niet gebouwd.** De guest-account-aanmaak + canonical-email-dedup
   zijn klaar; de knop "met één klik een account claimen" op de secure transcript-pagina (wachtwoord
   instellen, `is_guest` loslaten) is een kleinere, nog te bouwen vervolgtaak.
4. **`RESEND_API_KEY`/`RESEND_FROM` op Railway niet verifieerbaar vanuit deze sessie** — de
   secure-link-e-mail (`backend/mailer.py`) heeft deze env-vars nodig; of ze al op Railway staan
   (ze staan al op Vercel voor de app) is niet gecontroleerd.
5. **Mobiel/licht/donker visuele QA niet gedaan** — geen browser beschikbaar in deze sessie.
6. **Bekende pre-existing drift, niet gefixt (gemeld, niet verwijderd):**
   `docs/wiki/business/content-sitemap.md` noemt nog "25"/"50 welkomstcredits" op twee plekken
   (audit-snapshot-doc, geen live-gerenderde tekst, was al stale vóór deze sessie).

## Buiten scope (zoals opgedragen)

Geen wijzigingen aan creditpakketten/-prijzen/landenblokkade, geen nieuwe loginproviders, geen
playlist/YouTube-padwijzigingen. Google Ads-campagne staat nog UIT (gaat pas aan na Khidr's
expliciete akkoord, groeiplan.md §3).
