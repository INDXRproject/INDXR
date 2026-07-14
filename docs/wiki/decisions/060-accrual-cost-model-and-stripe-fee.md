# Beslissing 060: Accrual-kostenmodel (entered vs measured OPEX) + Stripe-fee = measured OPEX

**Status:** Geaccepteerd
**Datum:** 2026-07-15
**Gerelateerde code:** `supabase/migrations/20260714225432_opex_expenses_accrual_model.sql`, `20260714225506_opex_accrual_fn.sql`, `20260714225726_admin_finance_summary_fn.sql`, `20260714230120_admin_finance_summary_amsterdam_dategrain.sql`, `apps/app/src/lib/stripe-fees.ts`, `apps/app/src/app/api/admin/reconcile-stripe-fees/route.ts`

## Context

De OPEX-kant van de Finance-tab moest twee bronnen scheiden en Stripe's kosten sluitend maken:

- **MEASURED** OPEX komt uit de capture-laag (funnel logged-in/anon, goodwill, payment processing) — niet bewerkbaar.
- **ENTERED** OPEX komt van Khidr (infra, ads, eenmalig) — bewerkbaar, met eigen datums.

En: de Stripe-fee bleef in productie leeg (webhook-capture is best-effort; de `balance_transaction` is op checkout-moment vaak nog niet settled).

## Beslissing

**Accrual-model op `opex_expenses`.** Eén rij = één **reeks** met levensduur `[effective_from, effective_to]` (`NULL` = lopend). Het occurrence-venster wordt daaruit afgeleid: `recurrence='none'` → één occurrence; `recurrence='monthly'` → één per kalendermaand. `spread='evenly'` (dagtarief) of `'single'` (ankerdag). `opex_accrual(from,to)` snijdt door de periode: monthly evenly = `amount/dagen_in_kalendermaand`, none evenly = `amount/dagen_in_occurrence`.

**Prijswijziging herschrijft GEEN geschiedenis.** Een bedragwijziging op een lopende maandregel = **oude reeks afsluiten** (`effective_to` = laatste dag lopende maand) **+ nieuwe reeks starten** (`effective_from` = 1e volgende maand). UI biedt dit als **"changed from this month"** (default); een echte foutcorrectie (in-place, raakt álle occurrences) is een bewuste, aparte keuze.

**Entered = EXTERNAL-ONLY.** `opex_accrual` is scope-loos en wordt alleen op de external-P&L opgeteld; de test/intern-toggle voegt alleen de internal-*measured*-economie toe. Zo tellen infra/ads nooit dubbel.

**Stripe-fee: boek Stripe's tarievenlijst NIET na in code.** Geen hardcoded 1,5% / €0,25 / 0,4%. We lezen Stripe's eigen **`balance_transaction.fee_details`** (self-describing: type+amount+currency per component); `balance_transaction.fee` (totaal) is leidend voor de P&L. Ook vastgelegd: `payment_method_details.type` (forward-only dimensie — kaart vs iDEAL lopen sterk uiteen) en `net_settlement`. Reconcile-pad (`/api/admin/reconcile-stripe-fees`) backf't rijen zonder fee vanuit `PaymentIntent→charge→balance_transaction`.

**Plaatsing.** De Stripe-fee is **ÉÉN measured OPEX-regel "Payment processing"** op de **verkoopdatum** (charge-settlement), **NOOIT in COR** — de fee valt bij de sale, niet bij levering maanden later. De on-demand invoicing-fee (ADR-053: `pay(paid_out_of_band)` → geen charge → niet in `fee_details`) wordt apart gefactureerd → **ENTERED** OPEX-regel, niet stilzwijgend €0.

## Rationale

- Reeks/occurrence-scheiding maakt "€300/maand" ondubbelzinnig én laat de view door de regels snijden zonder history te herschrijven.
- Stripe's rates verouderen en verschillen per methode/herkomst; `fee_details` is de enige bron die altijd klopt.
- De fee is een verkoop-kost, geen leverings-kost → OPEX op verkoopdatum, niet COR.

## Consequenties

- Geverifieerd: accrual €300/maand → 135,48 (1–14 jul) / 19,35 (13–14 jul) / 300 (hele maand); CSV single-dag ankert correct; recurrence-history (changed-from-this-month: juni 0 / juli 300 ongewijzigd / aug 400); external-only (intern entered = 0). `bump`-bewijs voor de echte Stripe-`fee_details` volgt uit het reconcile-pad in productie (lokaal alleen `sk_test_`).
- `admin_finance_summary(from,to)` levert per scope: flows, stocks, bankbrug, cache-savings, deferred-schatting, honest `vat_computed`. Dag-grain = Europe/Amsterdam (consistent met de snapshot).
- Bestaande `opex_expenses.eur`/`period` blijven staan (oude `admin_geld_summary` leest nog `sum(eur)`); nieuwe kolommen additief.
