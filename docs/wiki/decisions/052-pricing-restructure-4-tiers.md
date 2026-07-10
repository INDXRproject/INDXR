# Beslissing 052: Pricing-herstructurering — 4 tiers, BTW-inclusief, worst-case-geprijsd

**Status:** Geaccepteerd (code gesynct 2026-07-10)
**Datum:** 2026-07-09
**Vervangt:** [ADR-012](012-pricing-tiers.md) (5-tier Try/Basic/Plus/Pro/Power) en de tussenliggende 5-tier-varianten in de wiki
**Gerelateerde code:** `packages/shared/src/lib/pricing.ts` (`PACKAGES`, 4 tiers live sinds 2026-07-10), `apps/app/src/app/api/stripe/checkout/route.ts`, Stripe live-mode producten

> **Naamgeving:** de instaptier heet in productie **Try** (Stripe `try_100`), niet "Test". Een vroege draft van deze ADR gebruikte "Test"; de live Stripe-producten zijn leidend en de wiki is daarop rechtgetrokken (2026-07-10).
**Gerelateerde docs:** [business/pricing.md](../business/pricing.md), [business/unit-economics.md](../business/unit-economics.md), priorities 1.13 / 1.21

---

## Context

Vóór Stripe live-mode moest de prijsstructuur definitief. Het bestaande 5-tier-model (ADR-012: Try €2,49 … Power €49,99) had problemen die pas bij de geverifieerde kostenbasis (unit-economics.md, juli 2026) zichtbaar werden:

1. **Te veel tiers (5)** — Pro en Power lagen dicht bij elkaar; keuze-overload zonder duidelijke ankertier.
2. **Marges op gevoel, niet op worst-case.** De oude €/cr-vloer (~€0,009) en kostprijs-aanname (~€0,0054/cr) waren gemiddelden. De proxy-kost (Decodo) varieert sterk per video; op zware audio liep de werkelijke kost richting €0,010/cr, waardoor de diepste tier bij korting richting break-even zou kunnen.
3. **BTW niet expliciet in het model.** Prijzen werden als "de omzet" behandeld terwijl 21% doorstroom is — dat vertekent elke marge-uitspraak.
4. **Geen expliciet, veilig kortingsbeleid** (oudere docs noemden −30%, wat op de diepste tier niet houdbaar is).
5. **Internationale betalingen** onbeslist (handmatige multi-currency vs. Stripe Adaptive Pricing).

Geverifieerde kostenbasis (juli 2026): AssemblyAI Universal-3.5 Pro €0,0031/cr; Decodo PAYG ~€0,0034/cr bij ~1 MB/min. Marginaal realistisch **~€0,0065/cr**, worst-case **~€0,010/cr**.

---

## Beslissing

**Vier tiers, BTW-inclusief, geprijsd tegen worst-case kost:**

| Tier | Prijs (incl. BTW) | Credits | Bruto €/cr | Netto €/cr (÷1,21) |
|------|-------------------|---------|-----------|--------------------|
| **Try** | €3,49 | 100 | €0,03490 | €0,02884 |
| **Starter** | €9,99 | 400 | €0,02498 | €0,02064 |
| **Plus** ★ | €24,99 | 1.300 | €0,01922 | €0,01589 |
| **Power** | €49,99 | 3.100 | €0,01613 | €0,01333 |

★ = anker ("Meest populair").

Bijbehorende beslissingen:
1. **BTW-inclusief** geprijsd; netto omzet = prijs ÷ 1,21. BTW is doorstroom, geen marge.
2. **Worst-case-geprijsd** (€0,010/cr als ontwerpbasis, niet het gemiddelde).
3. **Power = 3.100 credits** bij €49,99 — bewust minder agressieve volumekorting dan de oude 5.500cr, zodat de zwaarste gebruikers niet gesubsidieerd worden.
4. **Adaptive Pricing met EUR-settlement** voor internationale valuta (klant betaalt 2–4% conversie, marge 100% intact). Geen handmatige multi-currency.
5. **Kortingsbeleid: max −20%, uniform over alle tiers, zeldzaam.** Geen −30%. Stabiele prijs is de norm.
6. **Stripe Tax**, categorie "General – Electronically Supplied Services" (`txcd_10000000`), prijzen inclusief, OSS regelt per-land-BTW.
7. **Credits verlopen nooit** (behouden — *ihsaan*-principe).

---

## Rationale

- **Worst-case pricing garandeert winst in élk scenario.** Netto winst per 100 credits, na −€1,00 worst-case kost én −20% korting, blijft positief voor alle tiers — de dunste cel is Power op **+€0,07/100cr**. Dat is de bewuste vloer. Op realistische kost (€0,65/100cr) zijn de marges ruim (Power ~51% netto op lijstprijs).
- **4 tiers > 5 tiers** voor keuze-helderheid: een instap (Try), een default (Starter), een duidelijk anker (Plus), en een volume-optie (Power). Plus als center-stage anker stuurt de meeste conversie naar de middelste, gezonde marge.
- **BTW expliciet als doorstroom** voorkomt de klassieke fout om 21% als marge te tellen. Input-BTW is verwaarloosbaar: AssemblyAI en Decodo zijn US-leveranciers → reverse-charge.
- **−20% is aantoonbaar veilig**, −30% niet: op Power zou −30% worst-case de winst negatief maken. Uniform kortingspercentage houdt de communicatie en de Stripe-config simpel.
- **Adaptive Pricing** verschuift het valutarisico en de conversiekost naar de klant en houdt onze boekhouding in één munt (EUR), zonder handmatige prijstabellen per land.

---

## Consequenties

- **Code-sync vereist (aparte taak, NIET deze documentatie-taak):**
  - `packages/shared/src/lib/pricing.ts` — `PACKAGES` vervangen door de 4 tiers; `CREDIT_COSTS` blijft ongewijzigd.
  - `src/app/api/stripe/checkout/route.ts` — `PACKAGES` synchroniseren.
  - **Stripe live mode** — 4 producten aanmaken met de nieuwe prijspunten, Stripe Tax aan, categorie `txcd_10000000`, prijzen inclusief, Adaptive Pricing aan, EUR-settlement. Gekoppeld aan priorities **1.13**.
  - Pricing-pagina-componenten en `pricing-source-of-truth.md` reflecteren nu 4 tiers.
- **Plan-strings:** het aantal tiers daalt van 5 naar 4 — de oude plan-keys ('try'/'basic'/'plus'/'pro'/'power') worden vervangen; let bij de sync op dat bestaande `credit_transactions.metadata` (historische aankopen) niet gemigreerd hoeft te worden (audit-log, geen balans).
- **Marge-monitoring hangt op de capture-laag:** worst-case pricing is verdedigd op schatting; om het te **bewijzen** per job zijn proxy-bytes/AssemblyAI-minuten per job nodig. Dit is een launch-blocker en apart geregistreerd in known-issues (per-job cost capture).
- **ADR-012 is superseded** — behouden als historie, met superseded-banner.
- **Documentatie opgeschoond:** alle 5-tier-prijzen, de €0,009-vloer en de €0,0054-kostprijs zijn uit de wiki verwijderd of vervangen (deze taak).
