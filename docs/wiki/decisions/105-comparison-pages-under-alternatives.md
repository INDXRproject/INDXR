# Beslissing 105: Comparison pages toegestaan onder `/alternatives/` (herziet ADR-037)

**Status:** Geaccepteerd
**Datum:** 2026-09-07
**Gerelateerde code:** `apps/marketing/src/app/alternatives/otter-ai/page.tsx`, `apps/marketing/src/app/sitemap.ts`, `apps/marketing/src/app/sitemap-lastmod.ts`, `apps/marketing/src/app/pricing/page.tsx`
**Herziet:** [ADR-037](037-no-comparison-pages.md) (gedeeltelijk)

---

## Context

[ADR-037](037-no-comparison-pages.md) (2026-05-03) verwijderde de 5 bestaande `/alternative/*`-pagina's en legde vast: geen nieuwe comparison pages. De rationale was onderhoudslast (concurrenten wijzigen prijzen), zwakke branded-search-conversie, en pre-launch-focus op het eigen product.

Sinds die beslissing draait er een Google Ads-campagne (ADR-101, ADR-087) die onder meer op audio/video-upload-termen biedt. Advertentieklikken op concurrent-termen hebben een landingsbestemming nodig die de vraag van de zoeker beantwoordt — een generieke homepage doet dat niet en verlaagt de landing-page-experience (Ad Rank, CPC). De concrete aanleiding: **"otter alternative" heeft ~390 zoekopdrachten per maand in de VS met +23% jaar-op-jaar.** Dat is een bestaande, groeiende vraag met een duidelijke intentie (iemand betaalt al voor transcriptie of overweegt het) die nu op niets uitkomt.

---

## Beslissing

Comparison pages mogen **wel** onder een eigen route-namespace `/alternatives/`. Dit is een aparte, commerciële ruimte, **niet** onder `/articles/` (dat blijft de redactionele ruimte met SourcesBlock-conventies, `ToolPageTemplate` en de "INDXR Editorial"-byline).

Vergelijkings**artikelen** onder `/articles/` blijven verboden, precies zoals ADR-037 bepaalde. Alleen het onderdeel "geen comparison pages überhaupt" wordt herzien.

Eerste pagina: `/alternatives/otter-ai` (INDXR vs Otter.ai).

Twee vaste ontwerpregels voor deze namespace:

1. **Concurrentcijfers handmatig, gecontroleerd-op-datum. Geen scraper.** Elke pagina toont zichtbaar "checked on <datum>" met een bronlink. Concurrentprijzen worden met de hand overgenomen en op de pagina gedateerd — er komt **geen** automatische prijsscraper. Een scraper breekt stil (layoutwijziging, bot-block, valuta) en publiceert dan een verkeerde prijs over een genoemde concurrent zonder dat iemand het merkt. Een verkeerd getal over een concurrent is juridisch het echte risico op zo'n pagina. Handmatig-met-datum maakt de bron en de leeftijd van het cijfer expliciet en verplaatst de verantwoordelijkheid naar een bewuste update.
2. **Geen concurrentlogo's.** Alleen de naam als gewone tekst (nominatief gebruik). Een logo suggereert goedkeuring/affiliatie en is het enige echte juridische risico buiten de cijfers.

Aanvullend, overgenomen van de bestaande productregels: alle eigen (INDXR-)getallen — credits, prijzen, formaten, limieten — renderen uit levende code (`pricing.ts`, `limits.ts`, `uploadFormats.ts`), nooit hardcoded in de paginatekst. En elke pagina bevat verplicht een eerlijke sectie over waar de concurrent beter is; een pagina die alleen wint leest als verkoopblad en verliest vertrouwen.

### Wig van de Otter-pagina (herzien 2026-09-07)

De eerste versie zette de **uploadlimiet** centraal. Herzien: de wig is het **abonnementsmodel** zelf. Onderzoek naar wat gebruikers werkelijk aan Otter storend vinden (G2/Trustpilot/Reddit-syntheses 2026) laat zien dat de uploadlimiet niet de hoofdklacht is; de grootste klachten zijn (a) de zichtbare bot die niet-instemmende deelnemers opneemt, (b) een maandelijkse toewijzing die achteraf werd verlaagd zonder prijsverlaging, en (c) facturatieverrassingen. Klacht (a) komt van vergadergebruikers — die bedienen wij niet en willen we niet trekken (de pagina zegt daarom **prominent en vroeg** dat INDXR géén live meeting-notitietool is, zodat die zoeker binnen seconden wegklikt: bespaarde ad-spend + geen teleurstelling). Klacht (b) en (c) zijn prijsmodel-klachten, en dáár heeft INDXR een structureel antwoord op: credits die je koopt zijn van jou, verlopen niet, en er is geen maandelijkse toewijzing die de aanbieder kan wijzigen. De uploadlimiet blijft op de pagina, maar als **voorbeeld** van datzelfde patroon (met het scherpe detail dat Otter's gratis laag geen bot heeft → gratis gebruikers moeten uploaden → muur na 3 bestanden).

**Bewust NIET op de pagina** (harde regels bovenop de "geen scraper"-regel): geen niet-verifieerbare bewering over een verlaging van Otter's Pro-minuten (komt van review-sites, geen primaire Otter-bron → precies het risico dat deze pagina niet mag lopen); de wig wordt positief geformuleerd vanuit onze eigen eigenschap (credits verlopen niet, geen maandelijkse toewijzing) en de lezer die het meemaakte herkent het zelf. Ook de lopende rechtszaak tegen Otter wordt **niet** genoemd — onbeslist, en marketing bouwen op een lopende procedure past niet bij de rest van de site.

Twee nieuwe verplichte secties op deze (en toekomstige) pagina's waar van toepassing: **"Where INDXR is the better choice"** (direct bóven de "Where the competitor is better"-sectie, zodat de pagina eindigt op de toepasbare regel) en een **privacy-/dataverwerkingssectie**. Voor privacy geldt een aparte harde regel: **elke claim wordt geverifieerd tegen de werkelijke configuratie** (code/endpoints/provider-API), niet tegen de wiki, en alleen bevestigde claims worden opgeschreven — een onjuiste privacyclaim op een pagina die een concurrent noemt is het enige echte risico daar. Verificatie per dienst gelogd in [privacy-claims-verification.md](../operations/privacy-claims-verification.md).

---

## Rationale

- **De vraag is echt en groeit.** ~390/maand US, +23% j-o-j voor "otter alternative". Dat verkeer bestaat ongeacht of wij een bestemming hebben.
- **De campagne heeft een bestemming nodig.** Klikken op concurrent-termen die op de homepage landen matchen de zoekintentie niet → slechtere landing-page-experience → hogere CPC. Een pagina die de vraag ("wat is het alternatief, en waarom") beantwoordt converteert beter en scoort beter op Ad Rank.
- **De oorspronkelijke onderhoudsbezwaren van ADR-037 zijn beheersbaar gemaakt, niet genegeerd.** De "checked on <datum>"-regel + bronlink maakt veroudering zichtbaar in plaats van stil; de scope is één namespace met een handvol pagina's, niet een wildgroei.
- **De redactionele ruimte blijft schoon.** Door comparison pages in een aparte namespace te zetten blijft `/articles/` puur redactioneel (ADR-035, ADR-040, ADR-043) en vermijden we dat een commerciële vergelijking de artikelconventies moet dragen.
- **Waarom geen scraper (expliciet, zodat een volgende sessie het niet alsnog automatiseert).** Stille breuk + verkeerde prijs over een genoemde concurrent = het grootste risico. De bewuste keuze is handmatig met een gecontroleerd-op-datum. Dit is geen tijdgebrek maar een ontwerpbeslissing.

---

## Consequenties

- Nieuwe route-namespace `/alternatives/` bestaat; eerste pagina `/alternatives/otter-ai` live in de sitemap (met `lastmod`) en gelinkt vanaf `/pricing`.
- Per comparison page moet iemand periodiek de concurrentcijfers herzien en de "checked on"-datum + de cijfers bijwerken. Dit is de bewust geaccepteerde onderhoudslast; er is geen alert die eraan herinnert.
- ADR-037 is **gedeeltelijk vervangen**: het verbod op comparison pages vervalt voor de `/alternatives/`-namespace; het verbod op vergelijkings*artikelen* onder `/articles/` blijft staan.
- Toekomstige concurrentpagina's (bv. andere transcriptietools) volgen ditzelfde stramien: eigen `/alternatives/`-route, handmatige gedateerde cijfers, geen logo, verplichte eerlijke sectie, INDXR-getallen uit code.
- Herzien wanneer: PostHog/Ads-data laat zien dat de namespace niet converteert, of de onderhoudslast van handmatige cijfers niet opweegt tegen het verkeer.
