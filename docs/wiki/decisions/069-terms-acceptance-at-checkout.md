# Beslissing 069: Terms-acceptatie + vastlegging bij checkout (incorporatie + grondslag voor §7 herroeping)

**Status:** Geaccepteerd
**Datum:** 2026-07-20
**Gerelateerde code:** `apps/app/src/app/api/stripe/checkout/route.ts`, `apps/app/src/components/dashboard/billing/BillingPurchaseGrid.tsx`, `packages/shared/src/lib/legal.ts`, `supabase/migrations/20260720120000_terms_acceptances.sql`

## Context
De Terms (`/terms`) en Privacy Policy (`/privacy`) zijn gepubliceerd (2026-07-20). Voor juridische **incorporatie** moeten ze vóór de aankoop **geaccepteerd én bereikbaar** zijn — anders binden ze de koper niet. Bovendien stelt Terms §7 dat de koper bij het gebruiken van een credit ons vraagt **direct te beginnen** en daarmee het 14-daagse herroepingsrecht op die aankoop verliest; die clausule is alleen houdbaar als ze op een **aanvaard contract** rust. Er was geen acceptatiestap: de checkout ging direct van koopknop → Stripe Checkout, inclusief een marketing-deeplink (`?checkout=<plan>`) die de betaling **automatisch** startte.

## Beslissing
Een **verplicht acceptatie-vinkje** vóór de betaling: *"I agree to the Terms of Service and Privacy Policy"*, met `/terms` en `/privacy` als klikbare links (naar de marketing-host via `marketingHref`, in een nieuw tabblad). Geen extra refund-/waivertekst in de box — die staat in de Terms zelf (§7); de box incorporeert de Terms per referentie.

**Gekozen mechanisme: app-UI-vinkje met server-side gate + eigen vastlegging** — *niet* Stripe's ingebouwde `consent_collection.terms_of_service`.
- Stripe's `consent_collection` legt acceptatie + timestamp weliswaar automatisch op de session vast, maar ondersteunt **één** ToS-URL (uit het Dashboard) en een **vaste** checkbox-tekst — het kan géén tweede klikbare link (Privacy Policy) of de exacte gecombineerde formulering tonen (geverifieerd tegen de actuele Stripe-docs, 2026-07-20). De eis (beide docs klikbaar, exacte tekst, bereikbaar vóór betaling) sluit die route uit.
- Het app-UI-vinkje haalt die eis wél, en we leggen het bewijs zelf betrouwbaar vast op het moment van sessie-aanmaak.

**Handhaving is server-side** (niet enkel de UI): de checkout-route weigert met `400 "Terms acceptance required"` als de body geen `termsAccepted: true` bevat. Zo kan noch een directe POST, noch de marketing-auto-checkout de gate omzeilen. De marketing-deeplink **redirect niet langer automatisch** naar betaling; hij onthoudt het gekozen plan en vraagt eerst om acceptatie.

**Vastlegging (accountability):** een nieuwe tabel `terms_acceptances` (RLS: user leest/schrijft eigen rij) krijgt bij elke sessie-aanmaak één rij: `user_id`, `accepted_at` (default `now()`), `terms_version` (de "Last updated"-datum uit `LEGAL_VERSION`), `documents` (`{terms,privacy}`), `stripe_session_id`, `plan`. Daarnaast staat `termsVersion` in de Stripe-`session.metadata` als duurzame, aan de betaling gekoppelde kopie (blijft op Stripe's 7-jaars financiële records, ook nadat de rij bij account-verwijdering cascadeert).

## Rationale
- **Twee klikbare docs + exacte tekst + bereikbaar vóór betaling** → alleen het app-UI-vinkje voldoet.
- **Onomzeilbaar** → de gate zit server-side, dus geldt óók voor de auto-checkout en directe POSTs.
- **Betrouwbaar bewijs** → de rij wordt als de ingelogde (RLS-gebonden) user weggeschreven op sessie-aanmaak; de Stripe-metadata is een tweede, aan de betaling gekoppelde kopie. Insert-falen wordt gelogd maar blokkeert de betaling niet (het betaal-/creditpad mag niet vallen op een audit-log-write; de metadata-kopie blijft dan alsnog).
- **Privacy** → `ON DELETE CASCADE` op `user_id` houdt de belofte "account verwijderen wist je persoonsgegevens"; het aan-de-betaling-gekoppelde bewijs blijft bij Stripe.

## Consequenties
- De marketing→app "koop direct door"-flow heeft nu een expliciete extra stap (vinkje + Buy). Dit is juridisch vereist en bewust.
- `LEGAL_VERSION` moet **meebewegen** met elke wijziging aan `/terms` of `/privacy`, anders legt de rij een verkeerde versie vast.
- `terms_acceptances` staat **buiten** de finance-keten (geen finance-RPC/`cost_config`/credit-ledger raakt het) → de audit-tally blijft 31/0/0.
- **Restpunt (juridisch, buiten code):** de box incorporeert §7 per referentie. Of een strikte lezing van art. 16(m) CRD / 6:230p BW een **aparte, expliciete** "ik ga akkoord met directe uitvoering en verlies mijn herroepingsrecht"-bevestiging vereist (los van de Terms-acceptatie), is een vraag voor juridisch advies vóór launch. De huidige implementatie legt in elk geval aanvaarding van de Terms (met §7 erin) aantoonbaar vast.
