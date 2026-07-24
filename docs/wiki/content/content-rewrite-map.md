# Content rewrite — kickoff & asset-inventaris

Start-punt voor de content-herschrijf (voice/kwaliteit). De **feiten kloppen grotendeels al** en de
prep-docs bestaan — dit blad bindt ze samen en voegt toe wat er nog niet gedocumenteerd stond: de
**locaties van de inline-copy** en de **placeholder/asset-gaten**. Opgesteld 2026-07-24.

## Gebruik deze drie bestaande docs als basis (niet dupliceren)
- **Feiten** → [product-truth.md](product-truth.md) — code-geverifieerde feiten met `bestand:regel`
  (pricing, creditmodel, reserve-model, features, formaten, storage-cap, modelnamen). Actueel
  (Try €5 / Plus €25 / Power €60, 25 welcome credits, Gemini niet DeepSeek). **Als content afwijkt,
  wint dit document.**
- **Hoe schrijven** → [writing-standard.md](writing-standard.md) — dé schrijfregels (opening/koppen/
  FAQ/schema/links/toon), conflictenregister.
- **Wat per pagina** → [../business/content-sitemap.md](../business/content-sitemap.md) — per pagina
  doel/claims/status + docs↔artikel-rolverdeling.

> **Belangrijk:** dit is een **kwaliteit/voice-pass, geen feiten-fix.** De marketing-claims die tegen
> de code gecheckt zijn kloppen + zijn dynamisch (prijs uit `pricing.ts`, "no subscription", "credits
> never expire", "first 3 free / 1 credit/min", "25 welcome credits").

## Waar de inline-copy leeft (niet in losse content-files)
- **Landing `/`** — `apps/marketing/src/app/page.tsx`: hero-headline + subhead + fine-print, én de 5
  "How it works"-blokken (heading + description inline). Ondersecties = aparte componenten:
  `components/marketing/{DifferentiatorStrip,StatsFromTesting,PricingTeaserBlock,ClosingCTASection}.tsx`.
- **/pricing** — de **FAQ (`faqItems`) staat inline** in `app/pricing/page.tsx`; header/blokken in
  `components/pricing/{PricingHero,AlwaysFreeBlock,CreditCostTable,TrustRowCards,VatLine}.tsx`.
- **/about** — `app/about/page.tsx`. **/contact** — `app/contact/page.tsx` (net herschreven, OK).
- **Docs** — `app/docs/**` (structuur `lib/docs-config.ts`). **Artikelen** — `app/articles/**`
  (index-array in `app/articles/page.tsx`). Beide: grootste voice-pass.
- **App-copy** — dashboard-headers/leads (Home/Account/Settings/Transcribe/Billing) recent + kort.

## Placeholder / asset-gaten (nieuw t.o.v. de bestaande docs)
- **Landing-mockups zijn nep**: block 1 = `RemotionLoop` (statische placeholder), block 2–5 =
  `MacbookMockupFrame` met verzonnen in-frame inhoud → echte product-screenshots of bewust-gestileerd.
- **Docs-figuren**: `components/docs/{DocsFigure,TutorialStep}.tsx` renderen "Figure/Screenshot
  placeholder"-vakken → echte screenshots invullen.
- **Onboarding**: `app/onboarding/page.tsx` bevat placeholder "first-run wizard content komt hier" →
  beslis: echte wizard of weg.
- **Testimonials**: geen sectie (de dode `TestimonialPlaceholder`-component is verwijderd) → beslis of
  je social proof wilt en bouw dat dan bewust.
