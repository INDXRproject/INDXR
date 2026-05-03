# Strategische principes — Site-architectuur

**Vastgesteld:** 2026-05-03 (op basis van research en beslissingen Werksessie A)  
**Scope:** URL-architectuur, content-strategie, go-to-market structuur

---

## 1. Drie-lagen architectuur

De site is ingedeeld in drie lagen met duidelijke verantwoordelijkheden en URL-grenzen.

**Laag 1 — Marketing + vrije tool (`indxr.ai/`)**  
Conversiemachine: anonieme bezoeker → registratie. Homepage, pricing, vrije tool, auth flows. Alles publiek, geen login vereist.

**Laag 2 — Content (`indxr.ai/docs/*` en `indxr.ai/articles/*`)**  
Twee typen content met aparte URL-hiërarchieën:
- `/docs/*` — productdocumentatie voor bestaande gebruikers (hoe werkt credits, export formats, troubleshooting)
- `/articles/*` — SEO-content voor nieuwe bezoekers (zoekintentie-traffic, tutorials, vergelijkingen)

**Laag 3 — App (`app.indxr.ai/*`)**  
Geauthenticeerde product-interface: dashboard, transcriptie, library, admin. Aparte subdomain creëert harde grens: alles wat login vereist zit op `app.*`, alles wat publiek is op `indxr.ai`.

**Waarom drie lagen?**  
- Heldere mentale modellen voor gebruikers ("de site" vs. "de app")
- SEO: marketing domain heeft alle indexeerbare content, app-subdomain kan volledig worden geblokkeerd voor crawlers
- Toekomstige flexibiliteit: `/docs` en `/articles` kunnen onafhankelijk groeien
- Verkoopbaarheid: `indxr.ai` als marketing presence, `app.indxr.ai` als product

---

## 2. Auth op marketing domain (niet op app-subdomain)

Login, signup, forgot-password, onboarding blijven op `indxr.ai/login` etc.

**Waarom?**  
Dit is het Linear/Vercel/Notion pattern: auth flows horen bij de marketing-funnel, niet bij de app. Technisch voordeel: auth cookies kunnen worden ingesteld op het root-domein en zijn daardoor beschikbaar op zowel `indxr.ai` als `app.indxr.ai`.

**Trigger om te heroverwegen:** als de auth-flow UX fundamenteel verschilt van de marketing-site UX (bijv. multi-tenant, enterprise SSO, custom login portals).

---

## 3. Geen comparison pages (pre-launch)

De vijf `/alternative/*` pagina's (`/alternative/downsub`, etc.) worden verwijderd.

**Waarom?**  
- Comparison pages vereisen actief onderhoud (concurrenten wijzigen features en prijzen)
- Ze trekken traffic aan van mensen die een ander product zoeken — hoge bounce, lage conversie
- Pre-launch is de prioriteit: eigen product zo sterk mogelijk positioneren, niet concurrenten bespreken
- Technische schuld: de pagina's hebben geen index-hub (`/alternative` geeft 404), wat onaf aanvoelt

**Trigger om te heroverwegen:** als INDXR.AI na launch aantoonbaar verliest van specifieke concurrenten in zoekresultaten, en comparison pages bewezen converteren voor die zoektermen.

---

## 4. Geen audience hubs (voor nu)

Er zijn geen aparte secties voor audience-segmenten (bijv. `/for/researchers`, `/for/podcasters`, `/for/educators`).

**Waarom?**  
- Pre-launch: de buyer persona's zijn nog niet bewezen door echte gebruikersdata
- Audience hubs vereisen aparte content per segment — dit versnippert de schrijfinspanning
- De huidige tool-pagina's (`/bulk-youtube-transcript`, `/youtube-playlist-transcript`) bereiken al specifieke use-cases zonder expliciete audience-labeling

**Trigger om te heroverwegen:** als PostHog-data na launch aantoont dat één specifiek segment (bijv. researchers) disproportioneel converteert, én de landing-page copy voor dat segment significant beter zou zijn dan de generieke copy.

---

## 5. Articles als één umbrella (`/articles/*`)

Alle SEO-content (huidige 18 top-level pagina's + 3 blog-artikelen) gaat naar `/articles/[slug]` met een index op `/articles`. Geen aparte `/blog`, geen aparte `/guides`, geen audience-hub splitsing.

**Waarom?**  
- Één URL-hiërarchie is makkelijker te onderhouden en te indexeren
- Verschillende namen voor hetzelfde type content (blog/guide/tutorial) verwarren gebruikers en crawlers
- De huidige `/blog/*` routes zijn al content van hetzelfde type als de tool-pagina's — ze horen bij elkaar

**Technische noot:** de huidige top-level routes (`/youtube-transcript-not-available`, etc.) worden 301-geredirect naar `/articles/[slug]` bij de migratie (Werksessie B). Huidige links, OG-data, en geïndexeerde URLs blijven werken.

---

## 6. Categorische docs structuur

Productdocumentatie is georganiseerd als flat reference met twee subfolders:
- `/docs/[topic]` — flat reference (credits, languages, limits, etc.)
- `/docs/how-to/[slug]` — stap-voor-stap handleidingen
- `/docs/troubleshooting/[slug]` — probleemoplossing per issue

**Waarom?**  
- Flat reference is makkelijk te browsen zonder diep te navigeren
- How-to en troubleshooting hebben duidelijk andere intentie dan reference — aparte subfolder signaleert dat aan gebruikers en zoekmachines
- Geen derde niveau van nesting (bijv. `/docs/export-formats/markdown`) — te diep voor een pre-launch product met beperkte docs-content

---

## 7. llms.txt — low-priority

Er is een `public/llms.txt` aanwezig, maar uitbreiding hiervan is niet prioriteit.

**Waarom?**  
Onderzoek (mei 2026) toont aan dat llms.txt geen bewezen AI-citation lever is. De meeste LLMs gebruiken de standaard sitemap en geïndexeerde content. llms.txt is een emerging standard zonder bewezen ROI voor een pre-launch product.

**Wat wél gedaan (2026-05-03):** prijzen gesynchroniseerd met live Stripe-configuratie en verwijzingen naar verouderde routes (`/how-it-works`) gecorrigeerd.

**Trigger om te heroverwegen:** als er bewijs is dat llms.txt direct bijdraagt aan AI-citaties voor SERP-traffic (bijv. ChatGPT Search, Perplexity), of als er een significant update is aan de spec.

---

## Open onderzoeksvragen (TODO voor na launch)

- Welke audience-segmenten converteren het beste? (Data nodig)
- Zijn comparison pages winstgevend voor specifieke zoektermen? (Data nodig)
- Moet `/articles` een eigen design-template krijgen of gedeeld met `/docs`? (Design beslissing)
- Wanneer is de subdomain-migratie (`app.indxr.ai`) operationeel klaar? (Werksessie C)

---

*Zie `docs/wiki/strategy/decisions/` voor formele ADR's per beslissing.*
