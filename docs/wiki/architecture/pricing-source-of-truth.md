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

## Content-helpers — prijzen/credits in artikelen & pagina's (2026-07-10)

Alle **getoonde** prijzen en euro-kostenvoorbeelden in klant-gerichte content (artikelen, FAQ's, pricing-pagina, teaser, kostentabellen) worden **berekend uit `pricing.ts`** — nul hardcoded bedragen. Repricing = alleen `PACKAGES` wijzigen; alle content volgt automatisch.

**De bron = deze helpers in `packages/shared/src/lib/pricing.ts`:**

| Helper | Levert | Gebruik |
|--------|--------|---------|
| `cheapestPackage()` | goedkoopste tier | "Starting at €X" (teaser, pricing-metadata) |
| `tierPriceCredits(id)` | `"€3.49 / 100 credits"` | tier inline noemen (bv. Try in pricing-FAQ) |
| `creditCostEur(credits, pkg?)` | `"€1.15"` | euro-kost van N credits (default anker = Plus) — kostentabellen |
| `creditCostPhrase(credits, pkg?)` | `"~€1.15 at Plus pricing"` | voorbeeld-frase in prozaïsche tekst |
| `anchorPerCreditText()` | `"€0.019/credit"` | prijs-per-credit voorbeeld |
| `getAnchorPackage()` / `ANCHOR_TIER_ID` | Plus-tier | ankertier voor alle euro-voorbeelden |

**Conventies:**
- **Credits-first.** Credit-aantallen (stabiel bij repricing) staan als tekst; euro-bedragen worden altijd berekend.
- **Ankertier = Plus** (`ANCHOR_TIER_ID = "plus"`, €24,99/1.300). Alle "at Plus pricing"-voorbeelden komen hier vandaan. Repricing van Plus herrekent elk voorbeeld.
- **Geen "Basic"/"Pro" meer** — die tiers bestaan niet (ADR-052). Oude twee-koloms kostentabellen ("Cost at Basic" + "Cost at Plus") zijn gereduceerd tot één berekende Plus-kolom.
- **Credit-RATES** ("1 credit per minute", "3 credits per summary", "1 credit / 15 min") staan als proza — dat zijn stabiele productconstanten uit `CREDIT_COSTS`, geen prijzen; ze wijzigen niet bij repricing.

**Vind elke pricing-plek met één grep:**
```bash
grep -rn "@indxr/shared/lib/pricing" apps/
```
Elk klant-gericht bestand dat prijs/credit-content toont importeert uit deze module. Bestanden die pricing renderen (2026-07-10): `apps/marketing/src/app/pricing/page.tsx`, `components/pricing/*`, `components/marketing/PricingTeaserBlock.tsx`, en de artikelen `audio-to-text`, `youtube-transcript-json`, `youtube-channel-knowledge-base`, `youtube-playlist-transcript`, `bulk-youtube-transcript`, `youtube-srt-download`, `youtube-transcript-markdown`, `youtube-members-only-transcript`, `youtube-transcripts-vector-database`, `youtube-age-restricted-transcript`, `youtube-transcript-for-rag`, `youtube-transcript-non-english`.

---

## Historische discrepantie (opgelost 2026-05-04)

Bij introductie van pricing.ts werden drie inconsistente bronnen gevonden:
- `src/app/api/stripe/checkout/route.ts` — correcte EUR-prijzen, incorrecte credit-counts
- `src/app/pricing/page.tsx` — hogere EUR-prijzen, deels incorrecte credits
- Geen enkele bron klopte volledig

Na migratie naar pricing.ts is één bron authoritative. Na monorepo-split (2026-05-05) leeft die bron in `packages/shared/src/lib/pricing.ts`.

> **✅ 2026-07-10 — 4-tier-model live in `pricing.ts` (ADR-052).** `pricing.ts` bevat nu de 4 tiers, BTW-inclusief, exact gekoppeld aan de live Stripe-producten: **Try €3,49/100cr (`prod_UrNkT2na9l2iPA`, `try_100`) · Starter €9,99/400cr (`prod_UrNnnbtllIVRtd`, `starter_400`) · Plus €24,99/1.300cr (`prod_UrNoFwMCKp8OOB`, `plus_1300`) · Power €49,99/3.100cr (`prod_UrNpeuGzIiVMf5`, `power_3100`)** ([ADR-052](../decisions/052-pricing-restructure-4-tiers.md), [pricing.md](../business/pricing.md)). Elke tier draagt `stripeProductId` + `stripeLookupKey` + een klant-gerichte `description`. De credit-counts matchen 1-op-1 de Stripe price-metadata `credits`. Het 5-tier-model in de tabel hieronder is **historie**. NB: de instaptier heet **Try** (niet "Test" zoals een vroege ADR-052-draft) — de live Stripe-producten zijn leidend.

### Migration history — volledige discrepantie-tabel (historisch, pre-ADR-052)

| Pakket | Stripe checkout route (was) | Pricing page (was) | pricing.ts (5-tier, pre-052) |
|--------|-----------------------------|--------------------|-------------------------------|
| Try    | €2.49 / 200 credits         | €2.99 / 150 credits | €2.49 / 150 credits          |
| Basic  | €5.99 / 500 credits         | €6.99 / 500 credits | €5.99 / 500 credits          |
| Plus   | €11.99 / 1100 credits       | €13.99 / 1200 credits | €11.99 / 1200 credits      |
| Pro    | €24.99 / 2600 credits       | €27.99 / 2800 credits | €24.99 / 2800 credits      |
| Power  | €49.99 / 5500 credits       | €54.99 / 6000 credits | €49.99 / 6000 credits      |

**Impact:** De Stripe checkout route verwerkte correct EUR (live Stripe-producten hadden de juiste prijs), maar kende minder credits toe dan de pricing page suggereerde. Na `pricing.ts` refactor kloppen beide.

**Actie voor Khidr:** Verifieer dat live Stripe-producten de juiste credit-aantallen in de `metadata.credits` webhook-payload hebben na deploy. Check via Stripe Dashboard → Webhook logs → `checkout.session.completed` → `metadata.credits`.
