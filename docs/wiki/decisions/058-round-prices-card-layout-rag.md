# Beslissing 058: Ronde prijzen + 3-tier card-layout + RAG 1cr/10min

**Status:** Geaccepteerd & geïmplementeerd (code + Stripe-zijde) — **⏳ end-to-end productie-verificatie staat nog open** (webhook-grant per tier; zie [priorities.md → Pre-launch testen](../roadmap/priorities.md#pre-launch--testen)). Nog **niet** als "opgelost" te markeren.
**Datum:** 2026-07-14
**Supersedet:** [ADR-052](052-pricing-restructure-4-tiers.md) (die op zijn beurt [ADR-012](012-pricing-tiers.md) superseedde)
**Gerelateerde code:** `packages/shared/src/lib/pricing.ts`, `apps/marketing/src/components/pricing/{PricingTierGrid,PricingTierCard,SecondaryTierStrip,CreditCostTable}.tsx`, `apps/marketing/src/app/pricing/page.tsx`, `packages/shared/src/actions/rag-export.ts`, `packages/shared/src/components/TranscriptCard.tsx`, `apps/app/src/components/library/{TranscriptList,TranscriptViewer}.tsx`
**Gerelateerde wiki:** [business/pricing.md](../business/pricing.md), [business/positioning.md](../business/positioning.md)

## Context

Het prijsbesluit volgt op een concurrentie- en pricing-psychologie-analyse. Het vorige model ([ADR-052](052-pricing-restructure-4-tiers.md)) gebruikte `,99`-charmeprijzen (Try €3,49 · Starter €9,99 · Plus €24,99 · Power €49,99) en presenteerde alle tiers als min of meer gelijkwaardige kaarten. Drie problemen:

1. **`,99`-charmeprijzen passen niet bij het product.** Ze zijn een manipulatieve net-onder-de-drempel-nudge (ihsaan-conflict) en het charm-effect is in de literatuur klein/fragiel zonder kwaliteitsvoordeel.
2. **De card-layout had geen duidelijke aanbeveling/anker** — geen center-stage, geen eerlijke "dit is de juiste keuze"-sturing, risico op keuze-overload.
3. **Het RAG-exporttarief (1 cr / 15 min)** was aan de lage kant t.o.v. de werkelijke waarde van een RAG-ready, chunked, deep-linked export.

Randvoorwaarde: **live Stripe-prijzen worden door Khidr apart aangepast**; deze beslissing raakt alleen `pricing.ts`, de frontend, de RAG-formule en de wiki.

## Beslissing

1. **Ronde prijzen, 4 tiers:** Try **€5**/100cr · Starter **€15**/400cr · Plus **€25**/1.000cr · Power **€60**/3.000cr (BTW-inclusief). De per-credit prijs daalt trapsgewijs: Starter −25% vs Try, Plus −33% vs Starter, Power −20% vs Plus (cumulatief −60% Power vs Try).
2. **3-tier card-layout + Try-instap:** drie hoofdkaarten naast elkaar (Starter · **Plus** · Power); Plus staat center-stage, visueel verhoogd/gevuld/geaccentueerd, met badge **"Recommended"**. Try staat als kleinere, subtielere instap-optie ónder de drie kaarten (de-risk-patroon).
3. **RAG-export: 1 cr / 10 min** (`⌈duur/600⌉`, min 1), was 1 cr / 15 min.
4. **`lookup_key`:** ~~aanvankelijk niet hernoemd~~ → **gecorrigeerd 2026-07-14: gesynchroniseerd naar `plus_1000`/`power_3000`** nadat Khidr de live Stripe-lookup_keys hernoemde (zie correctie-noot onder Consequenties).

## Rationale

- **Ronde prijzen (ihsaan + kwaliteitssignaal).** Geen psychologische `,99`-trucs — transparant, eerlijk. Ronde bedragen signaleren een serieus/premium/betrouwbaar product; het charm-effect is klein en fragiel en levert géén kwaliteitsvoordeel. Margeverlies is verwaarloosbaar (de ronde bedragen liggen zelfs iets hóger, wat elke marge optilt: Power worst-case −20% floor gaat van +€0,07 → +€0,32/100cr).
- **Drie zichtbare tiers = veilige zone tegen keuze-overload;** het benadrukte middenkaartje benut het **center-stage-effect** (de middelste, geaccentueerde optie wordt disproportioneel gekozen). Plus is bewust het anker.
- **Try als aparte, kleinere instap = de-risk-patroon** voor twijfelaars die eerst willen proberen, zonder de hoofdvergelijking te vertroebelen met een vierde gelijkwaardige kaart.
- **"Recommended" i.p.v. "Most popular":** een populariteitsclaim is (pre-launch, zonder verkoopdata) niet verifieerbaar en dus oneerlijk. "Recommended" is een eerlijke, verdedigbare aanbeveling.
- **RAG 1cr/10min** brengt de prijs dichter bij de geleverde waarde (chunking, sentence-snap, deep-links, metadata) zonder de export duur te maken (een uur video = 6 cr ≈ €0,15 op Plus).

## Consequenties

- **Prijs komt uit `pricing.ts` via inline `price_data`** (`unit_amount = priceEur*100`); deploy wijzigt direct het afgerekende bedrag. De webhook grant `metadata.credits`. Geen enkele credit- of prijswaarde is elders hardcoded (geverifieerd met grep — alleen doc-comments).
- **Stripe-side (Khidr) — ✅ voltooid (2026-07-14):** de vier live producten staan op **€5 / €15 / €25 / €60**, price-metadata `credits` op **100 / 400 / 1.000 / 3.000**, de product-`description`s zijn gecorrigeerd naar **1 cr / 10 min**, en er zijn **productafbeeldingen** toegevoegd. De `lookup_key`s zijn hernoemd naar `plus_1000`/`power_3000` en gesynchroniseerd in `pricing.ts` (zie correctie-noot hieronder).
- **`lookup_key` (oorspronkelijke beslissing):** `stripeLookupKey`/`stripeProductId` worden nergens in de code gelezen (checkout = inline price_data, webhook = metadata). De keys droegen aanvankelijk nog het oude creditaantal (`plus_1300`/`power_3100`) en werden bewust niet hernoemd, omdat eenzijdig hernoemen in `pricing.ts` de mirror met de live Stripe-Price zou desyncen zonder functioneel voordeel — hernoemen kon alléén samen met een Stripe-side `lookup_key`-transfer.
- **✅ CORRECTIE 2026-07-14 — keys gesynchroniseerd.** Khidr heeft de live Stripe-lookup_keys hernoemd naar **`plus_1000`** en **`power_3000`**. De aanname "Stripe blijft ongewijzigd" waarop de bovenstaande "bewust niet hernoemd"-rationale rustte, geldt daarmee niet meer. `pricing.ts` is bijgewerkt naar `plus_1000`/`power_3000` — de mirror is nu weer in sync met Stripe en de inconsistentie is opgeheven. De LOOKUP_KEY-NOOT in `pricing.ts` is dienovereenkomstig aangepast.
- **RAG-tarief cascadeert:** formule `⌈duur/600⌉` op alle 5 code-plekken (rag-export server action ×2, TranscriptCard, TranscriptList, TranscriptViewer) + alle klant-gerichte "per 15 min"-teksten (pricing-FAQ, artikelen for-rag/json/channel-knowledge-base, tier-descriptions) bijgewerkt naar "per 10 min". De constante heet nu `RAG_JSON_PER_10MIN`.
- **Toekomstige verbetering (niet nu):** de RAG-formule `/600` staat op 5 plekken hardcoded; centraliseren in één helper (`ragCreditCost(seconds)`) in `pricing.ts` zou drift voorkomen. Bewust buiten scope gehouden (chirurgische wijziging).
- **Copy-impact:** "een uur AI-transcriptie < €1" klopt niet meer (Power = €1,20/uur); copy-anchor bijgewerkt.
- **⏳ End-to-end productie-verificatie staat nog open.** Code (pricing.ts inline `price_data`) + Stripe-zijde (prijzen/credits-metadata/descriptions/afbeeldingen) zijn klaar en de deploys zijn groen, **maar de webhook-grant is niet geverifieerd sinds de prijswijziging van 14-07-2026**. Groene deploys + gesynchroniseerde `pricing.ts` zijn géén bewijs dat `metadata.credits` → `add_credits` het juiste aantal toekent. Vereist: een testaankoop per tier via een `@indxr-test.com`-account (€5→100, €15→400, €25→1.000, €60→3.000). Zie de blokkerende taak in [priorities.md → Pre-launch testen](../roadmap/priorities.md#pre-launch--testen). **Tot die verificatie: ADR-058 niet als afgerond/opgelost markeren.**
