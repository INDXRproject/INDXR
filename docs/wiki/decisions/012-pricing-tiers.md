# Beslissing 012: Nieuwe Pricing Tiers — Try/Basic/Plus/Pro/Power

**Status:** Geaccepteerd (pending implementatie)
**Datum:** 2026-04-14
**Vervangt:** de oude Starter/Basic/Plus/Pro/Power tiers
**Gerelateerde code:** `src/app/api/stripe/checkout/route.ts` (PACKAGES object), `/src/app/(public)/pricing/`

---

## Context

De oude tiers (Starter €1.99/15cr t/m Power €49.99/850cr bij 1cr=10min) hadden twee structurele problemen:

1. **Gevaarlijk dunne marges:** De oude Plus had 42% volume-discount, wat bij geoptimaliseerde audio nét boven break-even zat. Power had 56% discount → ~5% bruto marge bij ongeoptimaliseerde audio.
2. **Slechte numerosity:** 15, 50, 130 credits voelt bescheiden. Zie ADR-009 voor de numerosity-rationale.

---

## Beslissing

Vijf nieuwe tiers met psychologische prijsankering:

| Tier | Prijs | Credits | €/credit | Volume-korting |
|------|-------|---------|----------|---------------|
| **Try** | €2.49 | 200 | €0.01245 | — |
| **Basic** | €5.99 | 500 | €0.01198 | 4% |
| **Plus** ★ | €11.99 | 1.100 | €0.01090 | 12% |
| **Pro** | €24.99 | 2.600 | €0.00961 | 23% |
| **Power** | €49.99 | 5.500 | €0.00909 | 27% |

★ = "Meest populair" badge in UI

**Rationale per price point:**
- **€2.49 (Try):** Boven de "is dit iets waard?" drempel van €1.99, maar nog impulsaankoop. "Prijs van een koffie"-anker. 200 credits dekt één middelgrote playlist met ruimte over.
- **€5.99 (Basic):** Onder €6, psychologisch "vijf-en-iets". 500 credits voor een student's examenweek aan college-playlists.
- **€11.99 (Plus):** Center stage — hier moeten de meeste users landen. Onder €12. 1.100 credits voor een serieus onderzoeksproject.
- **€24.99 (Pro):** Onder de €25 psychologische barrière. Professionele gebruikers en onderzoekers. 43+ uur AI-transcriptie.
- **€49.99 (Power):** Onder €50. Zware gebruikers, consultants, kleine teams. 91+ uur AI-transcriptie.

**Volume-korting curve:** 4% → 12% → 23% → 27%. Bewust ondiep in vergelijking met de oude curve (tot 56%), zodat de Power-tier altijd ≥56% bruto marge behoudt op AI-transcriptie.

---

## Margeanalyse (geverifieerd)

COGS aannames: €0.004/min AI-transcriptie (geoptimaliseerde Opus 249 audio), €0.001/video captions, €0.001/samenvatting. IPRoyal kosten: $2.50/GB is schaalprijs — huidige testkosten zijn hoger (€12.50/2GB). Herbereken marges niet op basis van testkosten.

| Tier | Playlist captions | AI transcriptie | Audio upload | AI samenvatting (3cr) |
|------|------------------|----------------|-------------|----------------------|
| Try | 92.0% | 67.9% | 71.9% | 97.3% |
| Basic | 91.7% | 66.6% | 70.8% | 97.2% |
| Plus | 90.8% | 63.3% | 67.9% | 96.9% |
| Pro | 89.6% | 58.4% | 63.6% | 96.5% |
| Power | 89.0% | 56.0% | 61.5% | 96.3% |

**Verificatie Power-tier AI transcriptie:**
Revenue: €0.00909/credit. COGS: €0.004/credit. Profit: €0.00509. Marge: 56.0% ✓

---

## Break-even analyse

Maandelijkse infrastructuurkosten: Railway ($5) + Vercel ($20) + Supabase ($25) = ~€50/maand.

| Scenario | Try (€2.49) | Basic (€5.99) | Plus (€11.99) |
|----------|------------|--------------|--------------|
| 100% AI-transcriptie (worst case) | ~30 klanten | ~14 | ~8 |
| Gemengd (40% caption, 50% AI, 10% summary) | ~22 | ~10 | ~5 |

---

## Consequenties

**Implementatie vereist:**
- [ ] `checkout/route.ts`: PACKAGES object volledig vervangen (nieuwe namen, prijzen, credits)
- [ ] Stripe Dashboard: 5 nieuwe producten aanmaken in live mode (Try, Basic, Plus, Pro, Power)
- [ ] Pricing page: nieuwe tiers + "Meest populair" badge op Plus
- [ ] Pricing page: reële gebruiksvoorbeelden toevoegen ("200 credits = 200 playlist-video's of 3,3 uur AI-transcriptie")
- [ ] Verwijder oude Starter/Plus/Power producten uit Stripe (of archiveer)

**Openstaande vragen:**
- Bestaande testgebruikers met 5 credits onder het oude model: zie ADR-009 voor de migratiestrategie.
- Starter en Power uit het oude model waren nooit aangemaakt in live Stripe — geen actie nodig voor die.

---

## Pricing-evolutie en early-adopter strategie

*(Toegevoegd 2026-04-28)*

Door de architectuur-investeringen na vaststelling van de huidige prijzen — cascade voor extractie-stabiliteit, `master_transcripts` cache als moat, Cloudflare R2 storage, betere observability (Sentry, PostHog, BetterStack) — is het product significant in waarde gestegen. De huidige prijspunten (Try €2.49 / Basic €5.99 / Plus €11.99 / Pro €24.99 / Power €49.99) positioneren INDXR.AI als prijsvechter. Dit reflecteert niet het werkelijke product-niveau.

**Strategische intentie:** prijzen verhogen vóór launch zodat INDXR.AI vanaf dag één een premium-positionering hanteert. Doel: prijzen daarna langdurig stabiel houden (jaren), wat eerlijker is naar later-instromende consumenten dan periodieke verhogingen na lanceringen.

**Early-adopter eerlijkheid (ihsan-gedreven):** Een beta/early-bird fase overwegen waarin de definitieve prijzen met ~10% korting (of vergelijkbare early-adopter benefit) gelden voor een afgebakende periode of de eerste N betalende gebruikers. Dit beloont vroege believers zonder de basisprijsstructuur te ondermijnen.

**Niet nu:** Concrete nieuwe prijspunten worden vastgesteld vlak vóór taak 1.13 (Stripe live-mode activatie). Reden: verdere productiviteit in tussenliggende sprints — cascade afmaken, `master_transcripts` read-logic (1.11), Realtime (1.10) — kan de onderbouwing voor een premium-niveau verder versterken. Beslissing nemen op basis van het complete productpakket, niet gefragmenteerd.

**Gerelateerde taak:** 1.13 in `priorities.md` — bij uitvoering: nieuwe prijzen vaststellen en indien gekozen het early-adopter mechanisme ontwerpen.
