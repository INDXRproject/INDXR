# Beslissing 009: Credit Granulariteit — 1 Credit = 1 Minuut

**Status:** Geaccepteerd en geïmplementeerd
**Datum:** 2026-04-14
**Vervangt:** [006-credit-model.md](006-credit-model.md) (1 credit = 10 minuten)
**Gerelateerde code:** `backend/credit_manager.py:35-55`, `src/app/api/stripe/checkout/route.ts`

---

## Context

Het oude model (ADR-006) gebruikte 1 credit = 10 minuten. Dit had twee problemen:

1. **Slechte numerosity:** "Koop 20 credits" voelt goedkoop aan. "Koop 200 credits" voelt genereuzer, ook al zijn ze equivalent.
2. **Grovere granulariteit:** Een 7-minuten video kost 1 credit, maar verbruikt maar 70% van de "waarde" — de gebruiker "verspilt" 3 minuten.

---

## Beslissing

Switch van 1 credit = 10 minuten naar **1 credit = 1 minuut** voor AI-transcriptie.

Nieuwe formule (`backend/credit_manager.py`):
```python
credits = math.ceil(duration_seconds / 60.0)
minimum = 1
```

Tegelijk: alle credit-pakketten krijgen 10× meer credits (maar zijn duurder in prijs), zodat de effectieve kosten per minuut gelijk blijven.

---

## Rationale

**Numerosity heuristic:** 200 credits bij €2.49 voelt waardevoller dan 20 credits bij €2.49, ook bij equivalente waarde per minuut. SaaS-norm: Pixverse 1.200/mo, Abacus 20.000/mo, Airtable 500–25.000.

**Conversion prompts:** "Je hebt 72 credits nodig. Koop 200 voor €2.49" is overtuigender dan "Je hebt 8 credits nodig. Koop 20 voor €2.49."

**Margezekerheid:** Met het nieuwe tiers-systeem (ADR-012) blijft de marge op Power-tier ≥56% ook bij niet-geoptimaliseerde audio.

---

## Consequenties

**Implementatie voltooid:**
- [x] `backend/credit_manager.py`: formule `/60.0` — geïmplementeerd
- [x] `src/app/api/stripe/checkout/route.ts`: PACKAGES object bijgewerkt (Try/Basic/Plus/Pro/Power)
- [x] `claim_welcome_reward` RPC: 25 credits (handmatig bijgewerkt in Supabase)
- [x] Frontend UI: creditsaldo en kosten-indicaties bijgewerkt
- [ ] Supabase migrations: migratie voor `claim_welcome_reward` 25-credits nog niet aangemaakt als .sql bestand

**Backward compatibility:** Bestaande gebruikers met het oude credit-saldo hoeven niet geconverteerd te worden — hun credits zijn al opgeslagen als transacties. De nieuwe formule geldt alleen voor nieuwe AI-transcriptie verzoeken.

**Open vraag:** Bestaande gebruikers met bijv. 50 credits onder het oude model (= 500 minuten waarde) hebben straks 50 credits onder het nieuwe model (= 50 minuten waarde). Beslis: krijgen zij een eenmalige 10× vermenigvuldiging, of wordt dit geaccepteerd als een granulariteitstransitie? Gezien er nog geen betalende gebruikers zijn, is dit pas relevant bij migratie van testaccounts.
