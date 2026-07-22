# Beslissing 072: Docs how-indxr-works 15 → 11 pagina's + Overview-content + header-fix

**Status:** Geaccepteerd
**Datum:** 2026-07-22
**Gerelateerde code:** `apps/marketing/src/lib/docs-config.ts`, `src/app/sitemap.ts`, `next.config.ts`, `src/components/docs/{DocsShell,FeaturedDocsGrid,AnchorHeading}.tsx`, `src/app/docs/how-indxr-works/*`

## Context

De `how-indxr-works`-docs telden 15 pagina's met dunne/dubbele slots, en de `/docs/*`-header was zichtbaar kapot (marketing-header overlapte de sidebar-titel + breadcrumb, plus een dubbele breadcrumb-render). Vanuit docs was er bovendien geen route naar `/articles` (content-sitemap schrijft docs↔artikel-kruislinking voor).

## Beslissing

**Structuur 15 → 11** (`docs-config.ts` + `sitemap.ts`, met 301's in `next.config.ts`):
- `credits` → **weg** (dubbeling met `/pricing` + `/docs/account-and-data/credits-and-billing`); 301 → credits-and-billing.
- `accuracy/auto-captions` + `accuracy/ai-transcription` + `languages` → **samengevoegd** in `accuracy` (nu "Accuracy and languages" — bij AssemblyAI is nauwkeurigheid per taal, één onderwerp; WER-tiers behouden). 301's → `accuracy`.
- `api` → **op in** `limits` (één zin "geen publieke REST API"); 301 → `limits`.
- `summaries` → **nieuw** (AI-samenvatting = aparte taak, 3 credits; Overview linkt ernaar).
- `export-formats` + 6 kindpagina's ongewijzigd.

De 11: overview, accuracy, export-formats (+txt/markdown/csv/srt/vtt/json), summaries, limits.

**Overview-content** geplaatst (reference-doc-template: DocsBreadcrumb → H1 → DefinitionLeadOpening → body met `AnchorHeading` op élke H2/H3 → RelatedTopicsList, geen marketing-CTA's). Volatiele getallen (welcome-credits, 1cr/min, 3cr summary, 1cr/10min RAG, gratis-3) renderen uit `pricing.ts`/`models.ts` — nooit hardcoded. Nieuwe `AnchorHeading`-component (client, click-to-copy, `scroll-mt` clear't de fixed header).

**Header-fix (`DocsShell`):** oorzaak = de marketing-`<Header>` is `fixed top-0 h-16 z-50` (transparant tot scroll) terwijl DocsShell op `top-0` begon → overlap. Fix: `pt-16` op de shell + sidebar `sticky top-16 h-[calc(100vh-4rem)]`. De **dubbele breadcrumb** (DocsShell rende zelf één + elke pagina rendert `<DocsBreadcrumb>`) opgelost door de shell-breadcrumb te verwijderen; de per-pagina `DocsBreadcrumb` blijft (draagt de BreadcrumbList JSON-LD). `/articles`-link toegevoegd in de sidebar-kop én de mobiele nav-rij.

## Rationale

- Eén gebruikersvraag ("hoe accuraat is dit?") hoort niet over 3 pagina's; dunne pagina's (api, credits-duplicaat) scoren slecht en driften. Consolidatie = minder onderhoud, geen drift.
- Getallen uit de single-source-constanten voorkomen dat de Overview uit sync loopt met pricing.
- De header-fix raakt alleen de docs-shell-positionering + de duplicaat-breadcrumb (header/nav-scope), niet de bredere styling.

## Consequenties

- Elke verwijderde route geeft **301** naar zijn vervanger (geverifieerd); geen dode links in sidebar, hub (`FeaturedDocsGrid` "How credits work" → "Credits and billing"), sitemap of bestaande content (interne links in export-formats/limits/json/getting-started/credits-and-billing/transcribe rechtgetrokken).
- `accuracy` behoudt minimaal de inhoud van de drie samengevoegde pagina's (auto-captions/ai-transcription/languages), nu met AnchorHeadings + WER-bron.
- **Gerapporteerd, niet gefixt (buiten header/nav-scope):** veel marketing-pagina's renderen een eigen `<Footer/>` terwijl de root-layout er óók één rendert — site-breed patroon, niet docs-specifiek. `transcribe/page.tsx` FAQ blijft een `[placeholder]` met "67 talen" (Khidr's herschrijf) — de link erin is wél rechtgetrokken naar `/accuracy`.
