# Beslissing 053: On-demand BTW-facturen voor afgeronde Checkout-betalingen

**Status:** Geaccepteerd
**Datum:** 2026-07-10
**Gerelateerde code:** `apps/app/src/app/api/stripe/invoice/route.ts`, `apps/app/src/lib/stripe-customer.ts`, `apps/app/src/app/api/stripe/checkout/route.ts`, `apps/app/src/components/dashboard/billing/{PurchaseHistoryCard,InvoiceButton}.tsx`, migratie `20260710154218_profiles_stripe_customer_id.sql`
**Gerelateerde docs:** [architecture/credit-system.md](../architecture/credit-system.md), [ADR-052](052-pricing-restructure-4-tiers.md), [database-schema.md](../architecture/database-schema.md)

## Context

Aankopen lopen via Stripe Checkout in `payment`-mode (one-off, EUR, BTW-inclusief). Zo'n betaling maakt een PaymentIntent/Charge maar **geen** Invoice. Klanten (zeker B2B) willen een BTW-factuur die bruikbaar is voor BTW-teruggave. Twee opties:

1. `invoice_creation.enabled` op elke Checkout-sessie → automatische factuur op élke sale (Stripe invoice-fee ~0,4% per sale, ook als niemand de factuur wil).
2. **On-demand**: factuur alleen aanmaken wanneer de klant er op de account-pagina (`/dashboard/account`, betaalhistorie) om vraagt.

We kozen **on-demand** — geen fee op sales waarvoor niemand een factuur nodig heeft.

## Beslissing

Een klant-getriggerde route `POST /api/stripe/invoice` (`{ transactionId }`) maakt retroactief een factuur voor een afgeronde betaling. Stripe biedt **geen** manier om een bestaande PaymentIntent aan een nieuwe Invoice te koppelen, dus de flow is:

1. **Eén Customer per user** — `getOrCreateStripeCustomer` hergebruikt `profiles.stripe_customer_id` (of maakt er één en slaat het op). Checkout hangt de betaling aan diezelfde Customer (`customer: <id>`), en `customer_update: { address, name: auto }` + `tax_id_collection` bewaren adres/bedrijfsnaam/BTW-nummer op de Customer.
2. **Invoice** met `automatic_tax: { enabled: true }`.
3. **InvoiceItem** met `amount = session.amount_total`, `tax_behavior: 'inclusive'`, `tax_code: 'txcd_10000000'` (ADR-052-categorie). Inclusive → Stripe Tax rekent de BTW **eruit terug**: het factuurtotaal blijft exact het betaalde brutobedrag, met een correcte BTW-regel (ex-BTW + tarief/bedrag + totaal).
4. **`finalizeInvoice`** → `hosted_invoice_url` beschikbaar.
5. **`pay(paid_out_of_band: true)`** → markeert als betaald **zonder geldbeweging en zonder nieuwe charge**.
6. `hosted_invoice_url` wordt in `credit_transactions.metadata` gecachet → tweede klik geeft de bestaande factuur (geen dubbele aanmaak → geen dubbele fee).

**BTW-behandeling:** merchant-bedrijfsgegevens + BTW-registratienummer komen automatisch uit de Stripe Tax-accountconfiguratie; de klant-BTW-id uit de Customer (via `tax_id_collection`). Bij een geldig EU-B2B-BTW-nummer past Stripe Tax reverse charge / 0% toe — het totaal blijft gelijk aan het betaalde bedrag (inclusive), zodat het nooit boven de betaling uitkomt.

**Reconciliatie-koppeling:** de factuur-metadata draagt `original_payment_intent`, `stripe_session_id` en `indxr_transaction_id` → de factuur is herkenbaar proof-of-payment en geen losstaande nieuwe omzet.

## Rationale

- **Geen fee op sales zonder factuurbehoefte**; de ~0,4% valt alleen bij daadwerkelijk opgevraagde facturen (gemonitord, zie roadmap-dashboarditem).
- **`paid_out_of_band`** is de enige retroactieve route en veroorzaakt geen dubbele afschrijving — geverifieerd tegen de Stripe-docs (geen charge, geen geldbeweging).
- **Inclusive tax_behavior** is de enige manier om een BTW-uitsplitsing te tonen zónder het totaal boven het reeds betaalde bedrag te tillen.
- **Idempotentie** op drie lagen: metadata-precheck, Stripe idempotency keys (session-gesleuteld) en tolerante finalize/pay met verse retrieve.

## Consequenties

- **Reconciliatie:** de out-of-band factuur verschijnt in Stripe's Billing/invoicing-views náást de oorspronkelijke betaling in Payments. Géén dubbele geldbeweging, wél een tweede administratief record — koppeling via metadata maakt de relatie expliciet.
- **Fee-monitoring:** het aantal opgevraagde facturen bepaalt het omslagpunt naar de eigen €0-fee generator (backlog).
- **Retroactieve limiet:** betalingen van vóór de checkout-customer-attach hebben geen bij-checkout verzameld BTW-nummer; hun factuur is een geldige consumenten-/binnenlandse B2B-factuur maar zonder klant-BTW-id. Nieuwe aankopen leggen het BTW-nummer wél vast.
- **Alternatief (backlog):** eigen VAT-factuurgenerator uit `credit_transactions` + bedrijfsgegevens, €0 fee, eigen nummering.
