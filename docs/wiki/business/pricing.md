# Pricing

**Herzien: 2026-07-14.** 4-tier-model met **ronde prijzen**, BTW-inclusief, worst-case-geprijsd. Vervangt het ,99-prijsmodel (Try €3,49 … Power €49,99). Zie [ADR-058](../decisions/058-round-prices-card-layout-rag.md) voor de volledige rationale; [ADR-052](../decisions/052-pricing-restructure-4-tiers.md) is hierdoor superseded (dat superseedde op zijn beurt [ADR-012](../decisions/012-pricing-tiers.md)).

INDXR.AI verkoopt credits als **eenmalige** aankopen (geen abonnement). **Credits verlopen nooit** — een bewust *ihsaan*-principe (geen verval-druk, geen "use it or lose it"). Behoud dit; het is een expliciet verkoopargument én de premie-rechtvaardiging (zie [positioning.md](positioning.md)).

---

## Waarom ronde prijzen (ihsaan + kwaliteitssignaal)

De overstap van `,99`-charmeprijzen naar **ronde bedragen** (€5 / €15 / €25 / €60) is een bewuste keuze op twee gronden:

1. **Ihsaan — geen psychologische trucs.** Charm-pricing (`,99`) is een manipulatieve nudge die net-onder-de-drempel-suggereert. Dat past niet bij een eerlijk product. Ronde prijzen zijn transparant: wat je ziet is wat je betaalt.
2. **Kwaliteitssignaal / vertrouwen.** Het charm-effect is in de literatuur **klein en fragiel** en biedt géén kwaliteitsvoordeel; ronde prijzen worden juist geassocieerd met een serieus, premium, betrouwbaar product (en met producten die "op gevoel/kwaliteit" gekocht worden i.p.v. puur op deal-jacht). Voor een SaaS dat op nauwkeurigheid en betrouwbaarheid concurreert, is dat het juiste signaal.

Netto-effect op de marge is verwaarloosbaar (zie matrix) — het is een positionerings- en principe-keuze, geen omzet-optimalisatie.

---

## Credit-pakketten (4 tiers)

Alle prijzen zijn **BTW-inclusief** (EU B2C, 21% NL-tarief als referentie; OSS regelt het werkelijke per-land-tarief — zie Tax).

| Tier | Prijs (incl. BTW) | Credits | Bruto €/cr | Netto €/cr (÷1,21) | UI-rol |
|------|-------------------|---------|-----------|--------------------|--------|
| **Try** | €5 | 100 | €0,05000 | €0,04132 | Instap-optie (kleiner, onder de 3 kaarten) |
| **Starter** | €15 | 400 | €0,03750 | €0,03099 | Hoofdkaart (links) |
| **Plus** ★ | €25 | 1.000 | €0,02500 | €0,02066 | **Anker** (center-stage, badge "Recommended") |
| **Power** | €60 | 3.000 | €0,02000 | €0,01653 | Hoofdkaart (rechts) |

★ = center-stage anker in de UI. De tier heet **Try** (live Stripe-product + `pricing.ts` `name`), niet "Test".

**BTW is doorstroom, geen marge.** De klant betaalt de lijstprijs incl. BTW; wij dragen de BTW af. De **netto omzet = prijs ÷ 1,21**. Alle marge-/winstberekeningen hieronder rekenen op de **netto** €/cr, nooit op de bruto lijstprijs. Input-BTW is verwaarloosbaar: onze zwaarste leveranciers (AssemblyAI, Decodo) zijn US-bedrijven → **reverse-charge**, geen NL-input-BTW om te verrekenen.

### Kortingsstructuur (volume-ladder per credit)

De €/credit daalt trapsgewijs — elke grotere tier is goedkoper per credit dan de vorige:

| Stap | €/cr-korting t.o.v. vorige tier |
|------|--------------------------------|
| Starter vs Try | **−25 %** (€0,0375 vs €0,05) |
| Plus vs Starter | **−33 %** (€0,025 vs €0,0375) |
| Power vs Plus | **−20 %** (€0,020 vs €0,025) |

Cumulatief is Power **−60 %** per credit t.o.v. Try (€0,020 vs €0,050). Dit is een échte volume-beloning, niet een tijdelijke "sale" — de prijzen zijn stabiel (zie Kortingsbeleid voor het aparte campagne-kortingsplafond van −20 %).

---

## Kostenbasis (juli 2026)

Geprijsd tegen **worst-case**, niet gemiddeld — zo blijft elke tier winstgevend ook op de duurste video's en met korting. Kosten zijn onafhankelijk van de prijs en dus **ongewijzigd** t.o.v. het vorige model.

| Component | Kost/credit | Bron / aanname |
|-----------|-------------|----------------|
| AssemblyAI (Universal-3.5 Pro) | €0,0031/cr | Transcriptie-minuut; 1 cr = 1 min |
| Decodo (residentiële proxy, PAYG) | ~€0,0042/cr | ~1 MB/min-schatting; varieert per video (PAYG $4,00/GB per 2026-07-20; was $3,25) |
| **Marginaal — realistisch** | **~€0,0073/cr** | = **€0,73 / 100 cr** |
| **Marginaal — worst-case** | **~€0,010/cr** | = **€1,00 / 100 cr** (grote/zware audio, ongunstige proxy-route) |

> De proxy-kost is de grootste variabele en de minst voorspelbare (bytes per video verschillen sterk). Daarom: worst-case als ontwerpbasis. Per-job meten gebeurt inmiddels via de capture-laag ([ADR-054](../decisions/054-cost-usage-capture-layer.md)).

### Vaste infra bij launch (~€70–90/maand)

| Dienst | Plan | Waarom |
|--------|------|--------|
| Railway | Pro | Worker + API, container-Redis voor ARQ |
| Vercel | Pro | Twee projecten (marketing + app) |
| Supabase | Pro | Backups + 8 GB DB (los van Railway — backup-onafhankelijkheid) |
| Resend | Free | Transactioneel + broadcast; Pro pas nodig bij >3.000/mnd of 100/dag-piek |
| Cloudflare R2 | Free tier | Audio/transcript-opslag; **egress gratis** → verwaarloosbaar |
| Upstash | PAYG | Rate-limiter + caption-cache (sporadische serverless calls) |

Vaste infra wordt gedekt door de marge, niet per credit doorbelast. Zie [unit-economics.md](unit-economics.md).

---

## Netto winst per 100 credits

Netto omzet per 100 cr = (bruto €/cr ÷ 1,21) × 100. Winst = netto omzet − kost. Bij **−20% korting** schaalt de netto omzet mee met 0,8 (BTW is proportioneel).

| Tier | Netto omzet /100cr | **Realistisch** (−€0,65) | idem **−20%** | **Worst-case** (−€1,00) | idem **−20%** |
|------|--------------------|--------------------------|---------------|-------------------------|---------------|
| Try | €4,132 | +€3,482 | +€2,656 | +€3,132 | +€2,306 |
| Starter | €3,099 | +€2,449 | +€1,829 | +€2,099 | +€1,479 |
| Plus | €2,066 | +€1,416 | +€1,003 | +€1,066 | +€0,653 |
| Power | €1,653 | +€1,003 | +€0,672 | +€0,653 | **+€0,322** |

**Kernclaim:** elke tier houdt winst in **élk** scenario — óók de duurste tier (Power), tegen worst-case kost, mét de maximale korting. Power worst-case −20% = **+€0,32/100cr**, de dunste cel in de matrix en ruim positief (bijna 5× de vorige €0,07-vloer — de ronde prijzen tillen elke marge op).

Netto-marge% op netto omzet, worst-case kost: Try ~76% · Starter ~68% · Plus ~52% · Power ~40%. Op realistische kost: ~84% / ~79% / ~69% / ~61%.

---

## Pricing-card structuur (UI)

De `/pricing`-pagina toont de tiers als **één vergelijking + een aparte instap**:

- **Drie hoofdkaarten naast elkaar:** Starter (links) · **Plus (midden)** · Power (rechts). Ze lezen als één keuze-set.
- **Plus = center-stage anker:** visueel verhoogd/gevuld/geaccentueerd (accent-subtle vulling, accent-ring, elevatie, lichte lift) met badge **"Recommended"**. Bewust géén "Most popular" — die claim is (pre-launch) niet verifieerbaar; "Recommended" is eerlijk. Drie zichtbare tiers = de veilige zone tegen keuze-overload; het centrale, benadrukte middenkaartje benut het center-stage-effect.
- **Try = kleinere instap-optie onder de drie kaarten:** compacte, subtielere kaart met kleiner kopje en de lead-in "Just want to try it on a single project first?" — een de-risk-patroon voor twijfelaars, duidelijk secundair, niet gelijkwaardig aan de drie hoofdkaarten.

Bron: `apps/marketing/src/components/pricing/{PricingTierGrid,PricingTierCard,SecondaryTierStrip}.tsx`. De vlag `mostPopular` in `pricing.ts` stuurt de "Recommended"-highlight (interne naam behouden; alleen de UI-tekst is "Recommended").

---

## Kortingsbeleid (campagnes)

- **Maximaal −20%**, **uniform over alle tiers**. Nooit dieper. (Dit staat los van de structurele volume-ladder hierboven.)
- **Zeldzaam** ingezet (gerichte campagne, win-back). **Stabiele prijs is de norm** — geen permanente "sale"-sfeer (past bij ronde prijzen + ihsaan).
- −20% is veilig by design: in élk scenario blijft de winst positief (zie matrix; Power worst-case −20% = +€0,32/100cr).
- **Geen −30%.** Elke −30%-referentie in oudere docs is achterhaald.

---

## Valuta & internationale betalingen

- **EUR** is zowel integration- als settlement-currency. Eén valuta, geen handmatige multi-currency-tabellen.
- **USD en overige valuta lopen via Stripe Adaptive Pricing:** de klant ziet en betaalt in de eigen valuta; Stripe rekent de **2–4% conversie door aan de klant**, niet aan ons. Onze **marge blijft 100% intact** in EUR.
- Geen handmatig onderhouden prijzen per land/valuta.

---

## Tax (Stripe Tax)

- **Categorie:** "General – Electronically Supplied Services" (`txcd_10000000`).
- **Prijzen zijn inclusief** belasting ingesteld — de klant ziet de all-in prijs.
- **Stripe Tax OSS** (One-Stop-Shop) regelt automatisch het **per-land-BTW-tarief** binnen de EU; wij dragen via één OSS-aangifte af.
- BTW blijft **doorstroom**: netto omzet = lijstprijs ÷ (1 + lokaal tarief). De marges hierboven gebruiken 21% als conservatieve referentie.

---

## Credit-formule (per feature)

```
AI-transcriptie:        ⌈video_duur_seconden / 60⌉ credits, minimum 1   (1 credit = 1 minuut)
Playlist (auto-caption): 1 credit per video, ná de eerste 3 gratis
Playlist (Whisper-video): ⌈duur / 60⌉ credits, min 1, GEEN gratis-korting
AI-samenvatting:         3 credits flat
RAG JSON-export:         ⌈video_duur_seconden / 600⌉ credits, min 1 (1 cr / 10 min), eerste 3 exports gratis
Caption-extractie (los): 0 credits — altijd gratis
```

**RAG-tarief herzien 2026-07-14: 1 cr / 10 min** (was 1 cr / 15 min) — [ADR-058](../decisions/058-round-prices-card-layout-rag.md). Formule `⌈duur/600⌉`.

| Video-duur | AI-transcriptie (cr) | RAG-export (cr) |
|-----------|----------------------|-----------------|
| 0–1 min | 1 | 1 |
| 5 min | 5 | 1 |
| 10 min | 10 | 1 |
| 15 min | 15 | 2 |
| 30 min | 30 | 3 |
| 1 uur | 60 | 6 |

**Caption-extractie van één video is gratis** (~90% van video's heeft YouTube-captions), ook anoniem (10/dag). **Eerste 3 playlist-video's altijd gratis** (auto-captions, gelabeld "FREE" in UI).

---

## Reële gebruikswaarde per tier

| Tier | Credits | AI-transcriptie | Playlist-video's (captions) | AI-samenvattingen (3cr) |
|------|---------|-----------------|-----------------------------|--------------------------|
| Try | 100 | ~1,7 uur | 100 | 33 |
| Starter | 400 | ~6,7 uur | 400 | 133 |
| Plus | 1.000 | ~16,7 uur | 1.000 | 333 |
| Power | 3.000 | ~50 uur | 3.000 | 1.000 |

---

## Gratis tier

- **25 gratis credits** bij registratie (Welcome Reward) — genoeg voor ~25 min AI-transcriptie of een kleine playlist.
- Caption-extractie (losse video): onbeperkt gratis (ook anoniem, 10/dag).
- Playlist-metadata preview: onbeperkt (ook anoniem).
- Playlist-extractie, AI-transcriptie, audio-upload: vereisen account + credits.

**Paid-user-status:** gratis credits verlenen **geen** paid-status. Betaalde status is permanent na de eerste Stripe-aankoop. Zie [ADR-013](../decisions/013-welcome-credits-freemium.md).

---

## Stripe-configuratie

Geïmplementeerd als **Checkout Sessions** (niet Payment Links):
- **Prijs komt uit `pricing.ts`.** De checkout-route bouwt een **inline `price_data`** met `unit_amount = pkg.priceEur * 100` (cents) — er wordt géén vooraf-aangemaakt Stripe Price-object of `lookup_key` gebruikt. De webhook grant credits uit `session.metadata.credits` (= `pkg.credits`). Deploy van de nieuwe `priceEur`-waarden wijzigt dus direct het afgerekende bedrag.
- `stripeLookupKey` / `stripeProductId` in `pricing.ts` worden **nergens in de code gelezen** — ze mirrorren alleen de live Stripe-producten. **Gesynchroniseerd 2026-07-14:** Khidr hernoemde de Stripe-lookup_keys naar `plus_1000` / `power_3000`; `pricing.ts` is overgenomen → de mirror is weer in sync (de eerdere "bewust niet hernoemd"-inconsistentie is opgeheven). Zie ADR-058 (correctie-noot).
- **Pakket-afbeelding op de betaalpagina (2026-07-14):** `product_data.images` = `[${NEXT_PUBLIC_APP_URL}${pkg.image}]`. Het pad staat als `image`-veld in `pricing.ts` (single source of truth), de checkout-route maakt er met de bestaande `appUrl`-var een absolute https-URL van. Bestanden: `apps/app/public/packages/{try-100,starter-400,plus-1000,power-3000}.webp` → geserveerd op `https://app.indxr.ai/packages/…`. Stripe rendert alleen absolute, publiek bereikbare URL's (localhost/relatief werkt niet). Raakt prijs/credits niet.
- **Twee pricing-oppervlakken, één bron (2026-07-15):** marketing `indxr.ai/pricing` én app `app.indxr.ai/dashboard/billing` renderen dezelfde kaarten via de gedeelde `packages/shared/src/components/pricing/PricingTiers.tsx` (3 prominente kaarten + Try-strip, pakket-afbeelding, alles uit `pricing.ts`). De **actie** verschilt en komt als `renderCta`-prop binnen: app = directe checkout-fetch (same-origin); marketing = auth-aware navigatie. **Beide moeten samen gewijzigd worden** — een redesign op één oppervlak is per definitie incompleet.
- **Marketing-koopknop-bedrading:** de checkout-route bestaat alléén op de app-host, en de Supabase auth-cookie (`SameSite=Lax`) reist niet mee op cross-origin fetch. Daarom navigeert de marketing-knop (top-level) naar `app.indxr.ai/dashboard/billing?checkout=<plan>`: ingelogd → direct (cookie is `.indxr.ai`-breed) → `BillingPurchaseGrid` auto-start checkout; uitgelogd → `login?next=<die app-URL>` → na auth land je daar → auto-checkout. Zo werkt de knop in beide auth-states en blijft de checkout-POST same-origin. (Bug vóór 2026-07-15: marketing-knop deed een relatieve `fetch('/api/stripe/checkout')` → 404 op de marketing-host → dode knop bij ingelogde users.)
- **Nieuwe-user-funnel — checkout-intent overleeft de onboarding-gate (2026-07-15):** een net-geregistreerde koper verloor het gekozen pakket omdat `loginAction`/`auth/callback` un-onboarded users naar `/onboarding` stuurden en onboarding-completion hardcoded naar `/dashboard` ging. Nu wordt het doel door de héle auth-flow gethread: `loginAction` + `signupAction` (`emailRedirectTo`) + `loginWithGoogleAction` (OAuth `redirectTo`) → `/auth/callback?next=` → `/onboarding?next=` → onboarding-completion honoreert `next`; login/signup-pagina's dragen `next` door (signup-link + Google-form). Open-redirect-guard: `packages/shared/src/lib/safe-redirect.ts` (alleen `app.indxr.ai`/localhost, anders `/dashboard`). E-mailverificatie staat AAN, dus de e-mailflow van signup draagt `next` in de verificatie-link. Geverifieerd op productie: pricing → Plus → signup/login → onboarding → `billing?checkout=plus` → Stripe met Plus €25.
- **Betaalmethoden zijn Dashboard-gestuurd (2026-07-15):** de Checkout Session geeft **geen** `payment_method_types` en **geen** `payment_method_configuration` mee → Stripe gebruikt **dynamic payment methods** met de account-**Default** payment method configuration (live: `pmc_1StnuTRrwT3Uo6wS…`). Een betaalmethode toevoegen/verwijderen (iDEAL, Bancontact, Klarna, …) is vanaf nu **alleen een Dashboard-toggle — geen code-wijziging meer nodig**. LET OP: een hardcoded `payment_method_types`-array (bv. `["card"]`) OVERSCHRIJFT de Dashboard-config en blokkeert bank-redirects zoals iDEAL (kaart-rail-methodes als Apple Pay/Link komen er wél doorheen — die bewijzen dus niets; test altijd met iDEAL). Geverifieerd 2026-07-15: sessie €25/EUR met dynamic PM → `["card","bancontact","eps","ideal","klarna","link","amazon_pay"]`.
- `mode: 'payment'` (eenmalig), `billing_address_collection: 'required'` (EU-factuurverplichting).
- Integration- + settlement-currency: **EUR**; internationale valuta via **Adaptive Pricing**.
- **Stripe Tax** aan, categorie `txcd_10000000`, prijzen inclusief, OSS.

> ⚠️ **Stripe-side actie (Khidr, buiten deze code-taak):** de live Stripe-productprijzen aanpassen naar €5 / €15 / €25 / €60 en de price-metadata `credits` naar 100 / 400 / 1.000 / 3.000. Optioneel de `lookup_key`s naar `plus_1000` / `power_3000` transferren (dan óók in `pricing.ts` bijwerken). Deze code-taak raakt Stripe niet aan.

---

## Marketing copy anchors (voor pricing-pagina)

| Angle | Copy |
|-------|------|
| Tijdsbesparing | "Extract een 50-video playlist in 60 seconden. Handmatig? Dat is 3+ uur kopiëren." |
| Per-unit framing | "Een uur AI-transcriptie ≈ €1,20 op Power." |
| No-subscription | "Koop credits eenmalig. Gebruik wanneer je wil. Ze verlopen nooit." |
| Nauwkeurigheid | "YouTube auto-captions: ~60% nauwkeurig. Onze AI-transcriptie: ~99%." |
| No-extension | "Werkt in elke browser. Geen extensie. Plak een URL, krijg een transcript." |
| Anchoring | "Een VA zou €50+ rekenen voor hetzelfde werk." |

Effectieve **bruto** prijs per minuut AI-transcriptie (= bruto €/cr, want 1 cr = 1 min): Try €0,050 · Starter €0,0375 · Plus €0,025 · Power €0,020. Gebruik Plus/Power voor "vanaf"-copy.

---

## Openstaande vragen

1. **Storage-upgrades:** library-visibility-upgrades met credits of aparte Stripe-aankoop? (`library_bytes_cap` bestaat als meter, niet gehandhaafd — [ADR-054](../decisions/054-cost-usage-capture-layer.md).)
2. **Referral:** "5+5 credits" waarschijnlijke structuur; canoniek-e-mail-dedup al aanwezig op grant-niveau.
3. **Rate limiting:** momenteel no-op in productie (Upstash vars verwijderd) — configureren vóór tier-gebaseerde limits.
