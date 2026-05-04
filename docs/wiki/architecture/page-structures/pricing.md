# Pricing page-structure (`/pricing`)

**Bron van waarheid voor structuur, componenten, en beslissingen voor /pricing.**
**Bijgewerkt:** 2026-05-04 (Batch 1, page-type 3)
**Status:** Strategie vastgesteld — skeleton geïmplementeerd

---

## Doel

Visitor moet binnen één scroll de drie kernvragen beantwoord krijgen:
1. Hoe vertaalt een credit naar mijn use case?
2. Wat ga ik realistisch betalen?
3. Zit ik vast aan iets?

Samen met reference docs hoogste AI-citation pagina. AggregateOffer + FAQPage schema.

---

## Sectie-volgorde

### Sectie 1 — Header

Zelfde als homepage.

### Sectie 2 — Hero

- H1: "Pay once. Use when you need it."
- Subhead: één paragraaf over pay-per-use model
- Twee trust badges: "Credits never expire" + "25 free credits when you sign up"
- Geen CTA-knoppen

### Sectie 3 — Always-free disclosure

> **Always free:** single video auto-caption extraction (unlimited for registered users), all export formats, 25 welcome credits on signup.

### Sectie 4 — Pricing tier cards (3 prominent)

Basic / **Plus** / Pro met Plus highlighted "Most Popular".

Per card:
- Tier naam
- Prijs EUR + "VAT included" sublabel
- Credit aantal + "X minutes of AI transcription" equivalent
- Per-credit prijs (€0.0X/credit)
- Voorbeeld: "A 1-hour AI transcription costs 60 credits (€X.XX)"
- Audience-beschrijving (één regel)
- Buy CTA (BuyButton client island)

### Sectie 5 — Secundary tiers

Twee compactere cards naast elkaar (Try + Power):
- **Try (€2.49 / 150 credits)** — "Just want to test? Enough for a 25-min AI transcription."
- **Power (€49.99 / 6,000 credits)** — "Power user? Our best per-credit rate."

### Sectie 6 — Credit-cost table met tier-toggle

Client island. Boven tabel: tier-selector (5 buttons), default = Plus.
Click → derde kolom rendert kosten in die tier.

Rijen:
- Single video, auto-captions
- AI Transcription, 30 min
- AI Transcription, 1 hour
- Playlist, 20 videos (auto-captions)
- AI Summary
- RAG JSON export, 1-hour video
- 1-hour AI Transcription + RAG JSON

### Sectie 7 — Trust row

3 cards: One-time purchase / Credits never expire / 25 free credits on signup.

### Sectie 8 — VAT line

> All prices include VAT. Stripe issues a proper invoice on every purchase — VAT-deductible for businesses.

### Sectie 9 — FAQ

10 vragen (7 behouden + 3 nieuw: VAT, invoice, payment methods). FAQAccordion component.

### Sectie 10 — Footer

Zelfde.

---

## Componentenlijst

### Bestaand (hergebruikt)

| Component | Aanpassing |
|-----------|------------|
| Header | Geen |
| Footer | Geen |
| FAQAccordion | Hergebruik vanaf /transcribe |
| JsonLd | AggregateOffer + FAQPage schemas |

### Nieuw (aangemaakt in Batch 1 / page-type 3)

| Component | Pad | Type | Doel |
|-----------|-----|------|------|
| PricingHero | `src/components/pricing/PricingHero.tsx` | Server | H1 + subhead + 2 trust badges |
| AlwaysFreeBlock | `src/components/pricing/AlwaysFreeBlock.tsx` | Server | Always-free disclosure |
| PricingTierCard | `src/components/pricing/PricingTierCard.tsx` | Server | Single tier card (prominent variant via prop) |
| PricingTierGrid | `src/components/pricing/PricingTierGrid.tsx` | Server | 3 prominente cards |
| SecondaryTierStrip | `src/components/pricing/SecondaryTierStrip.tsx` | Server | Try + Power compact cards |
| CreditCostTable | `src/components/pricing/CreditCostTable.tsx` | Client | Tabel met tier-toggle (useState) |
| TrustRowCards | `src/components/pricing/TrustRowCards.tsx` | Server | 3 trust cards |
| VatLine | `src/components/pricing/VatLine.tsx` | Server | VAT + invoice line |
| BuyButton | `src/components/pricing/BuyButton.tsx` | Client | Stripe checkout call per tier |

### Deprecated

`src/components/ui/pricing-card.tsx` — niet verwijderd (mogelijk gebruikt door /dashboard/billing). Niet aangeraakt in deze sessie.

---

## Data-bron

Alle tier-data komt uit `src/lib/pricing.ts` (PACKAGES, CREDIT_COSTS, FREE_TIER, helpers). Zie [pricing-source-of-truth.md](../pricing-source-of-truth.md).

---

## Beslissingen

### Prijzen uit src/lib/pricing.ts single source of truth
Niet hardcoden. Wijzig één getal, hele app volgt.

### 3 prominente + 2 secundary tiers
Beslissingsmoeheid laag, alle opties zichtbaar. Basic/Plus/Pro prominent; Try/Power compact eronder.

### /dashboard/billing aparte sessie
Logged-in billing page krijgt alle 5 cards gelijkwaardig — aparte redesign-sessie later.

### Credit-cost tabel met tier-toggle
Default Plus. Visitor kiest eigen tier, ziet realistische euro-kosten. Ihsan-transparantie.

### Geen B2B/B2C toggle
"All prices include VAT" + Stripe-invoice line dekt B2B-zorg in één regel.

### Geen comparison tabel
Verwijderd: onderhoudslast (competitor-prijzen wijzigen), misleidingsrisico.

### AggregateOffer + FAQPage schema
Hoogste AI-citation leverage voor pricing pages. Gegenereerd uit PACKAGES — automatisch consistent.

### Server component
Volledige pagina server component voor metadata + schema. Alleen CreditCostTable en BuyButton zijn client islands.

---

## Mobile

Pass later.

---

## Status

- [x] Wiki documentatie
- [x] Skeleton implementatie
- [x] src/lib/pricing.ts single source of truth
- [ ] Claude Design rondje (na alle Batch 1 pages)
- [ ] Content writing (FAQ-antwoorden verfijnen)
- [ ] Mobile pass
