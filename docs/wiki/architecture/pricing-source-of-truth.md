# Pricing source of truth

**Alle prijzen, credit-costs, en free-tier limits leven in `packages/shared/src/lib/pricing.ts`.**

Wijzig daar, en de hele applicatie volgt automatisch:
- /pricing tier cards
- /pricing credit-cost tabel
- /dashboard/billing tier cards
- Stripe checkout route (prijzen via `pkg.priceEur * 100` in cents)
- AggregateOffer JSON-LD schema
- /docs/credits content
- Free tool welcome-credits messaging
- API credit-aftrek logic (CREDIT_COSTS)

**Niet** hardcoden in:
- Page components
- API routes
- Email templates
- Markdown content

Importeer altijd via `@indxr/shared/lib/pricing` (resolveert naar `packages/shared/src/lib/pricing.ts`). Geen lokale kopieën in `apps/*/src/lib/`.

---

## Historische discrepantie (opgelost 2026-05-04)

Bij introductie van pricing.ts werden drie inconsistente bronnen gevonden:
- `src/app/api/stripe/checkout/route.ts` — correcte EUR-prijzen, incorrecte credit-counts
- `src/app/pricing/page.tsx` — hogere EUR-prijzen, deels incorrecte credits
- Geen enkele bron klopte volledig

Na migratie naar pricing.ts is één bron authoritative. Na monorepo-split (2026-05-05) leeft die bron in `packages/shared/src/lib/pricing.ts`.

### Migration history — volledige discrepantie-tabel

| Pakket | Stripe checkout route (was) | Pricing page (was) | pricing.ts (nu authoritative) |
|--------|-----------------------------|--------------------|-------------------------------|
| Try    | €2.49 / 200 credits         | €2.99 / 150 credits | €2.49 / 150 credits          |
| Basic  | €5.99 / 500 credits         | €6.99 / 500 credits | €5.99 / 500 credits          |
| Plus   | €11.99 / 1100 credits       | €13.99 / 1200 credits | €11.99 / 1200 credits      |
| Pro    | €24.99 / 2600 credits       | €27.99 / 2800 credits | €24.99 / 2800 credits      |
| Power  | €49.99 / 5500 credits       | €54.99 / 6000 credits | €49.99 / 6000 credits      |

**Impact:** De Stripe checkout route verwerkte correct EUR (live Stripe-producten hadden de juiste prijs), maar kende minder credits toe dan de pricing page suggereerde. Na `pricing.ts` refactor kloppen beide.

**Actie voor Khidr:** Verifieer dat live Stripe-producten de juiste credit-aantallen in de `metadata.credits` webhook-payload hebben na deploy. Check via Stripe Dashboard → Webhook logs → `checkout.session.completed` → `metadata.credits`.
