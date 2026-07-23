# Editorial images — articles & docs presentation

De artikelen (`/articles` + elk artikel) dragen **fotografie**; de docs dragen een
**gegenereerd hexagon-patroon**. Beide delen dezelfde ratio (16:9), radius (`rounded-xl`) en
border, zodat het als één systeem leest. Deze pagina legt de bron, de exportmatrix, de
naamconventie en de fallback-regel vast.

## Waar het landt

| Plek | Beeld | Component | Bron-widths |
|------|-------|-----------|-------------|
| Kaart op `/articles` | foto boven de tekst | `EditorialImage` in `articles/page.tsx` | 400 / 800 |
| Hero bovenaan elk artikel | foto, dan eyebrow + titel eronder | `ArticleHero` (vervangt de oude `ArticleBanner`) | 800 / 1440 |
| OG / Twitter | `{slug}-og.jpg` (1200×630) | `editorialOg(slug)` uit `lib/editorialMeta.ts` | — |
| Docs-masthead | seeded hexagon-veld (géén foto) | `DocsHexBanner` → `HexField`, in `DocsShell` | — |

De foto op de hero is bewust dezelfde als op de indexkaart — anders zie je het beeld alleen op
de index. De hero-titel staat **onder** de foto (leesbaarheid boven willekeurige beelden), met
de per-categorie eyebrow-accent (`--warning` / `--accent` / `--success` / `--violet`) voor
samenhang met de index.

## Bron — Leonardo

Vaste recept per beeld (reproduceerbaar):

- **Tool:** Leonardo.ai
- **Model:** **Lucid Realism**
- **Style:** **Cinematic Close-Up**
- **Kwaliteit:** **Ultra**
- **Resolutie:** **2752 × 1536** (16:9)
- **Prompt Enhance:** **UIT**
- **Private Mode:** **AAN**

**Vaste prompt-staart** (achter het onderwerp aangeplakt, elk beeld gelijk): cinematische
close-up, warm woestijnlicht, lage zon, lange schaduwen, fijne korrel, ondiepe scherptediepte,
één objecthelder onderwerp op zand/steen, geen tekst, geen mensen, geen logo's.

**Twee kader-varianten** (kies er één per onderwerp):
1. **Low viewpoint** — camera laag bij de grond, onderwerp rechtop, lange schaduw over het zand.
2. **Extreme macro** — heel dichtbij op één detail/textuur van het onderwerp.

Het onderwerp is een **rekwisiet-metafoor** voor het artikel (bv. typemachine → plain text,
sleutel → members-only, filmstrip → SRT), niet het artikelonderwerp zelf. De alt-tekst
beschrijft **wat zichtbaar is**, niet de titel (`lib/editorialAlts.ts`).

## Exportmatrix

Alle non-OG varianten zijn **16:9** — de ratio ligt vast in CSS (`aspect-video`), dus geen
layout shift.

| Variant | Formaat | Gebruik |
|---------|---------|---------|
| `{slug}-400.avif` / `.webp` | 400px breed | kaart 1× |
| `{slug}-800.avif` / `.webp` | 800px breed | kaart 2× + hero 1× |
| `{slug}-1440.avif` / `.webp` | 1440px breed | hero 2× |
| `{slug}-800.jpg` | 800px breed | laatste fallback (`<img>` in `<picture>`) |
| `{slug}-og.jpg` | **1200×630** | `og:image` + `twitter:image` |

- Fallback-volgorde per `<picture>`: **AVIF → WebP → JPEG**. Kaart-srcset draagt alleen 400/800
  (nooit 1440); hero-srcset draagt 800/1440. `sizes` is afgestemd op de echte kolombreedte
  (kaart ~356px, hero ~720px) zodat de browser de juiste variant kiest.
- Bestanden staan in `apps/marketing/public/editorial/`.

## Naamconventie = slug

De bestandsnaam **is** de artikel-slug (de laatste URL-segment, bv.
`/articles/youtube-to-text` → `youtube-to-text-800.avif`). Geen mapping-tabel: het pad wordt
afgeleid uit de slug in `EditorialImage` en `editorialOg`.

## Regel voor nieuwe artikelen

1. Genereer één beeld volgens het recept hierboven, exporteer de volledige matrix, geef elk
   bestand de **slug** als naam, zet ze in `public/editorial/`.
2. Voeg een alt-regel toe in `lib/editorialAlts.ts` (beschrijf wat zichtbaar is, herhaal de
   titel niet). De **aanwezigheid van de slug** in dat bestand is de bron van waarheid voor
   "dit artikel heeft een beeld".
3. Zonder beeld valt de hero automatisch terug op het **seeded hexagon-veld** (`HexField`),
   getint met de categorie-accent — hetzelfde patroon-systeem als de docs. De kaart toont dan
   geen beeld (alleen tekst).

## Docs-masthead (geen fotografie)

Docs krijgen géén foto maar een **inline SVG hexagon-veld** (`HexField`), **seeded op het
pathname**: dezelfde pagina levert altijd hetzelfde patroon (deterministische PRNG, geen
`Math.random`/`Date`, dus geen hydration-mismatch). Outlines in `--border`, seeded accent-cellen
in `--accent` — beweegt mee met light/dark. Zelfde 16:9, radius en border als de artikel-hero,
maar zonder beeldbestand of extra netwerk-request. Gerenderd één keer in `DocsShell`, boven de
content.

Zie ook: [hero-images.md](hero-images.md) voor de homepage-hero (aparte fotoketen, licht/donker).
