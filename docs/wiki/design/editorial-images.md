# Editorial images & the articles/docs presentation system

De artikelen (`/articles` + elk artikel) dragen **fotografie**; de docs (`/docs` + de
detailpagina's) dragen een **gegenereerd hexagon-patroon**. Beide gebruiken hetzelfde
kaart-, header- en achtergrondsysteem, zodat het als één geheel leest. Deze pagina legt de
bron, de layout, de naamconventie en de regels vast.

## Gedeelde componenten (één systeem)

| Component | Rol | Gebruikt op |
|-----------|-----|-------------|
| `PageHeader` | Ruime bovenmarge, optionele accent-eyebrow, titel, lead (max-w-2xl), hairline | `/articles`, `/docs` |
| `SectionLabel` | Accent-dot + uppercase label + hairline | `/articles`, `/docs` |
| `ContentCard` | Één kaart: media-slot + titel + omschrijving, hover naar accent | `/articles` (media = foto), `/docs` (media = hexagon-tegel) |
| `EditorialImage` | `<picture>` AVIF→WebP→JPEG, configureerbare aspect, srcset+sizes | artikelkaart + artikel-hero |
| `HexField` | Deterministische honeycomb, seeded op een string | docs-kaart-tegels + artikel-hero-fallback |
| `HexagonPattern` (`@indxr/shared`) | Zeer lichte pagina-achtergrondtextuur | `/articles`, `/docs`, `DocsShell` |

Artikelkaart en docs-kaart zijn **hetzelfde component** (`ContentCard`) — zelfde ratio, radius,
border, hover en spacing; alleen de media verschilt. Geen abstractielaag voor twee gevallen.

## Layout

- **Kaartgrid:** 1 kolom (mobiel) → 2 (`sm`, ≥640px) → **3** (`lg`, ≥1024px), `gap-6`.
  Container `max-w-5xl`. Kaartbeeld rendert ~325px op desktop.
- **Aspect-ratio's:** kaartmedia **16:9** (`aspect-video`); artikel-hero **21:9**
  (`aspect-[21/9]`, een band — niet full-bleed, want de midtoon-zandbeelden zouden een
  dominante horizontale balk worden); docs-kaart-tegel 16:9.
- **Geen layout shift:** alle beeld/tegel/hero-boxen hebben een vaste aspect-ratio; `object-cover`
  cropt in CSS (de bronbestanden zijn 16:9, er zijn geen 21:9-bestanden).
- **Achtergrondtextuur:** `HexagonPattern` uit `packages/shared` (dezelfde die de Library
  gebruikt), `opacity-[0.03] dark:opacity-[0.045]`, achter de content in een `relative` container.
  Werkt in beide thema's (stroke = `--fg`). Eén implementatie, geen tweede variant.

## Categorieën hebben geen eigen kleur

De vier categorieën droegen elk een eigen kleur (amber/amber/groen/paars); die betekenden niets
en concurreerden met het merk-accent. **Alle sectiemarkeringen, eyebrows en hover-randen
gebruiken nu `--accent`.** Onderscheid komt van de sectienaam en de witruimte.

Twee secties hernoemd (volgorde ongewijzigd, **URL-slugs ongewijzigd**; alleen het getoonde
label):

| Interne key (article `category` prop) | Getoond label |
|---------------------------------------|---------------|
| `Export Formats` | **Formats** |
| `Deep Dives` | **AI & RAG** |

De interne keys blijven staan (het zijn identifiers, geen URLs). Doorgevoerd in de UI
(`articles/page.tsx` `CATEGORY_LABEL`, `ArticleHero` `CATEGORY_EYEBROW`) en in
`docs/wiki/business/content-sitemap.md`. De token `--violet` blijft bestaan — die wordt nog
gebruikt door de AI-summary-chips in `apps/app` (`TranscriptList`, admin), dus niet verwijderd.

## Docs = hetzelfde kaartsysteem

`/docs` is een `ContentCard`-grid per sectie, met als media een **seeded hexagon-tegel**
(`HexField`, seeded op de page-href → elke docs-pagina een eigen maar herkenbare variant), in
dezelfde 16:9-box/radius/surface als de artikelkaart. De docs-**detailpagina's** hebben geen
zelfstandige hexagon-banner meer (die las in het lichte thema als een onaffe wireframe); ze
staan op dezelfde lichte `HexagonPattern`-achtergrondtextuur via `DocsShell`.

## Bron — Leonardo (fotografie)

Vaste recept per beeld (reproduceerbaar):

- **Tool:** Leonardo.ai · **Model:** Lucid Realism · **Style:** Cinematic Close-Up
- **Kwaliteit:** Ultra · **Resolutie:** 2752 × 1536 (16:9)
- **Prompt Enhance:** UIT · **Private Mode:** AAN

**Vaste prompt-staart:** cinematische close-up, warm woestijnlicht, lage zon, lange schaduwen,
fijne korrel, ondiepe scherptediepte, één helder onderwerp op zand/steen, geen tekst, geen
mensen, geen logo's.

**Twee kader-varianten:** (1) low viewpoint — camera laag, onderwerp rechtop, lange schaduw;
(2) extreme macro — heel dichtbij op één detail. Het onderwerp is een rekwisiet-metafoor
(typemachine → plain text, sleutel → members-only), niet het artikelonderwerp zelf. De alt-tekst
beschrijft wat zichtbaar is, niet de titel (`lib/editorialAlts.ts`).

## Exportmatrix & naamconventie

Alle non-OG varianten zijn **16:9**.

| Variant | Formaat | Gebruik |
|---------|---------|---------|
| `{slug}-400.avif` / `.webp` | 400px | kaart 1× |
| `{slug}-800.avif` / `.webp` | 800px | kaart 2× + hero 1× |
| `{slug}-1440.avif` / `.webp` | 1440px | hero 2× |
| `{slug}-800.jpg` | 800px | laatste fallback (`<img>`) |
| `{slug}-og.jpg` | **1200×630** | `og:image` + `twitter:image` (absolute URL, `editorialOg`) |

De bestandsnaam **is** de slug (laatste URL-segment). Geen mapping-tabel: het pad wordt afgeleid
uit de slug. Bestanden staan in `apps/marketing/public/editorial/`.

## Regel voor nieuwe artikelen

1. Genereer één beeld volgens het recept, exporteer de volledige matrix, geef elk bestand de
   **slug** als naam, zet ze in `public/editorial/`.
2. Voeg een alt-regel toe in `lib/editorialAlts.ts` (beschrijf wat zichtbaar is, herhaal de
   titel niet). Aanwezigheid van de slug daar = "dit artikel heeft een beeld".
3. Zonder beeld valt de hero terug op het seeded hexagon-veld (`HexField`, accent) en toont de
   kaart een lege surface-tegel.

Zie ook: [hero-images.md](hero-images.md) voor de homepage-hero (aparte fotoketen, licht/donker).
