# Eindrapport — snelle balie + betaalveiligheid (2026-10-25)

Cold-read voor Khidr. Prompt uit `growth-plan.md` §6.2, uitgevoerd A→F, elk onderdeel los commit +
push + deploy-verificatie. **Addendum onderaan: herstelronde §6.3 (H1-H11), zelfde dag.**

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

---

## Addendum — herstelronde §6.3 (H1-H11, zelfde dag)

Na een eigen anonieme browser-doorloop op `app.indxr.ai/transcribe` vond de piloot 11 gebreken,
vastgelegd in `growth-plan.md` §6.3. H8 wachtte op Khidr's akkoord (§7 punt 7) — **2026-10-25
alsnog akkoord gegeven**, apart uitgevoerd en hieronder toegevoegd.

| # | Punt | Status | Commit(s) |
|---|------|--------|-----------|
| H1 | Webhook-retry-semantiek (financieel-kritiek) | ✅ done | `f293ddf` |
| H2 | Dispatch-garantie per bestand + watchdog | ✅ done | `f293ddf` |
| H3 | Voorproefje pollen + renderen | ✅ done | `46e73b9` |
| H4 | Duur per bestand tonen | ✅ done | `46e73b9` |
| H5 | Eerlijk goedkoopste-pakket-alternatief | ✅ done | `46e73b9` |
| H6 | Dropzone-pariteit met AudioTab + paginatitel | ✅ done | `46e73b9` |
| H7 | Marketing-copy "free" → eerlijk | ✅ done | `46e73b9` |
| H8 | Herroepingsrecht-afstand in checkbox-label + mail | ✅ done (los, na akkoord) | zie commit hieronder |
| H9 | "Claim this account"-knop | ✅ done | `7c941c3` |
| H10 | Ontbrekend migratiebestand + 2 bijkomende versie-driften | ✅ done | `01612c2` |
| H11 | Resend-env-vars + Stripe-configuratie — onderzoek | ✅ done (bevindingen hieronder) | — |

### Bewijs
- **H1/H2:** 4 nieuwe pure-function-tests (`backend/test_quick_quote_dispatch.py`) bewijzen de
  per-bestand-idempotentie; volledige backend-suite 97 passed/6 pre-existing fails (geen
  regressie); `pnpm build:app` groen.
- **H3-H7:** echte Playwright-browserrun tegen `app.indxr.ai` (geautoriseerd door Khidr —
  schrijft een echte `quick_quotes`-rij + één AssemblyAI-call op een 3-seconden testtoon),
  `tests/playwright/specs/06-quick-checkout-anonymous.spec.ts`: mobiel (375px) licht + donker
  liepen de VOLLEDIGE flow door (upload → prijs → "Total" zichtbaar); desktop licht + donker
  toonden de dropzone + foutmelding correct gestyled in beide kleurschema's — de 3e/4e
  offerte-poging vanaf hetzelfde IP werd terecht geblokkeerd door de bestaande misbruik-limiet
  ("max 2 open onbetaalde offertes per IP", al gebouwd in Onderdeel B) — geen bug, bewijst juist
  dat die limiet werkt.
- **H9:** build groen; geen live claim-doorloop (vereist een echte afgeronde aankoop + e-mail,
  niet reproduceerbaar zonder een volledige Stripe-betaling).
- **H10:** `schema_migrations`-rijencount ongewijzigd vóór/na (172) — puur een hernoeming/bestand-
  toevoeging, geen nieuwe DB-wijziging.
- **H11-bevindingen:**
  - `RESEND_API_KEY`/`RESEND_FROM` op Railway: **nog steeds niet verifieerbaar** — de
    `RAILWAY_API_TOKEN` in deze omgeving is dood (`railway whoami` → Unauthorized), onveranderd
    t.o.v. het eerdere rapport. Khidr: controleer handmatig in het Railway-dashboard (api én
    worker-service) of deze twee env-vars gezet zijn — zonder staat de secure-link-e-mail van de
    balie stilzwijgend uit (best-effort, geen crash, maar ook geen e-mail).
  - Stripe-payment-method-configuratie: de LIVE, actieve configuratie (`pmc_1Stnug2Kp4hD6x9KTWldlyPN`,
    `is_default=true`, enige configuratie op het account) toont via de Stripe API
    `ideal=off`, `sepa_debit=off`, `wero=off` — exact zoals in het vorige rapport. Dit is de
    configuratie die Checkout Sessions in deze code daadwerkelijk gebruiken (geen
    `payment_method_types` gezet in `checkout/route.ts`, dus Stripe's dynamic-payment-methods
    volgt deze configuratie). Als het Stripe-Dashboard elders "iDEAL | Wero ingeschakeld" toont,
    is dat waarschijnlijk een ANDERE instellingenpagina (bv. een account-brede
    beschikbaarheids-toggle, niet deze specifieke configuratie se aan/uit-stand) — kan niet
    visueel bevestigd worden zonder browsertoegang tot het Dashboard. Advies: Khidr checkt zelf
    Settings → Payment methods en kijkt specifiek naar de aan/uit-stand van iDEAL/Wero binnen
    deze Default-configuratie.

### Kritieke bevinding (H10-bijvangst, niet in de oorspronkelijke lijst)
Bij het schrijven van het H10-migratiebestand bleek dezelfde versie-drift te bestaan op TWEE
migraties die de piloot zelf eerder op 2026-10-25 aanmaakte (Onderdeel A/B) — hun lokale
bestandsnaam-timestamp kwam niet overeen met de `version` die Supabase's `apply_migration` (MCP)
er daadwerkelijk aan toekende. Beide hernoemd naar hun echte versie; zie `docs/LESSONS.md`
2026-10-25 voor de regel ("controleer na elke apply_migration-call `list_migrations`").

### H8 — toegevoegd na akkoord (los van de H1-H11-commits hierboven)
Checkbox-label op de balie-checkout (`QuickCheckoutPanel.tsx`) bevat nu letterlijk: "I agree to
the Terms of Service and Privacy Policy, and I ask INDXR to start right away. I understand I lose
my 14-day right of withdrawal once my transcript is delivered." Dezelfde instemming herhaald in de
bevestigingsmail (`backend/mailer.py`). `/terms` §7 kreeg een bullet die het per-bestand-pad expliciet
benoemt; `LEGAL_VERSION` → `2026-10-25` (bundelversie-regel, ADR-069). Vastgelegd in ADR-069-addendum
2026-10-25. **Bewust één checkbox met samengestelde tekst, geen tweede apart vinkje** — zie de
rationale in het ADR-addendum.

### Open punten (ongewijzigd of nieuw)
- H11: Resend-env-vars op Railway en de Stripe-payment-method-discrepantie blijven open voor
  Khidr om zelf te bevestigen (zie bevindingen hierboven).
- Geen volledige Stripe-testmodus-betaal-klikdoorloop (zou een echte testkaart-betaling vergen) —
  dus ook H8's checkbox/mail-tekst is niet in een echte browser-aankoop gezien, alleen
  code-/build-geverifieerd.
- `is_guest→false`-claim-flow is nu gebouwd maar niet live doorlopen (zie H9-bewijs).
