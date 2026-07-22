# Beslissing 073: Docs-shell scaffold afmaken — Help-sectie weg, FAQ top-level, contract-componenten

**Status:** Geaccepteerd
**Datum:** 2026-07-22
**Gerelateerde code:** `apps/marketing/src/components/docs/{SourcesBlock,DocsFigure,DocsCallout,DocsTable,DocsCodeBlock}.tsx`, `docs-config.ts`, `sitemap.ts`, `next.config.ts`, `src/app/docs/{faq,component-preview}/`, `page-structures/{reference-doc,docs-vs-articles-density}.md`

## Context

Het [docs-page-contract](../content/docs-page-contract.md) besliste de eindstructuur van `/docs` en benoemde ontbrekende template-conventies (bron- + figuur-sectie, callout-regel, mobiele degradatie). Deze taak voert dat uit als **vormgeving** (geen content schrijven): structuur afronden + de componenten waarin de pagina's straks landen.

## Beslissing

**Structuur (uit het contract):**
- `/docs/help/how-to` en `/docs/help/troubleshooting` **verwijderd** → 308 naar `/articles` (Workflows- resp. Troubleshooting-categorie dekken ze).
- `/docs/help/faq` **verplaatst** naar `/docs/faq` (308); de `Help`-sectie is uit `docs-config.ts`, FAQ staat top-level (onder "Getting started"). De hele `help/`-map is weg.
- **Twee dakloze FAQ-antwoorden verhuisd** (tekst verplaatst, niet herschreven): VAT-scope ("waarom kan ik niet kopen") → `credits-and-billing` ("Where you can buy"); dedup/"soms instant" → `overview` (één zin in "What happens when you use it"). Beide uit de FAQ verwijderd.
- **Redirect-ketens rechtgetrokken** → één hop: `/docs/credits`, `/docs/accuracy/{auto-captions,ai-transcription}`, `/docs/languages`, `/docs/api` en `/faq` wezen naar inmiddels-verwijderde tussenroutes; nu rechtstreeks naar het eindpunt.

**Componenten (bestaande design-tokens, geen nieuwe kleuren/fonts):**
- **`SourcesBlock`** — onderaan, boven RelatedTopicsList; per bron uitgever + wat het onderbouwt + link, + `verifiedAgainst`-coderegel voor SPEC-pagina's; rendert niets zonder bronnen.
- **`DocsFigure`** — figuur-slot met **verplicht** bijschrift + alt; vaste aspect-ratio-placeholder zodat de layout niet verspringt als screenshots later landen; bijschrift zegt wat het aantoont.
- **`DocsCallout`** — exact drie varianten (`costs-credits`/`careful`/`requires-account`). Regel: een callout bestaat alleen als het missen ervan geld, data of tijd kost; max één per sectie.
- **`DocsTable`** + **`DocsCodeBlock`** — mobiele degradatie, één aanpak project-breed: **horizontaal scrollen met zichtbare affordance** (min-w + mobiele hint + dunne scrollbar), nooit overflow buiten de viewport.

**Dichtheid:** docs ≠ artikelen vastgelegd in [docs-vs-articles-density.md](../architecture/page-structures/docs-vs-articles-density.md) (docs smaller/compacter/tabellen via de gedeelde componenten; artikelen breder/ruimer — niet aangepast). Template (`reference-doc.md`) bijgewerkt: SourcesBlock + DocsFigure in de sectie-volgorde, callout-regel, mobiele tabel-/codeblok-conventie, en Footer = layout-geleverd.

## Rationale

- Dunne/dubbele docs-pagina's (how-to, troubleshooting-hub) dupliceren `/articles`; schrappen = minder onderhoud, geen drift. FAQ top-level want een map met één pagina is overbodig.
- De componenten zijn **server components** (geen interactiviteit) → geen client-bundle-kosten; ze dwingen de contract-conventies af (verplichte alt/caption, callout-regel, mobiele scroll) zodat de schrijfronde niet kan afdwalen.
- Eén-hop-redirects: SEO-waarde lekt niet weg via ketens.

## Consequenties

- **Geverifieerd (live):** alle geschrapte routes geven **één** 308-hop naar hun doel; geen dode links in sidebar/hub/sitemap/llms.txt; de vijf componenten renderen op `/docs/component-preview` op desktop/768px/375px. Build 2/2 groen.
- `/docs/component-preview` is een **noindex, niet-genavigeerde** interne referentie (niet in `docs-config`/`sitemap`) — bewust behouden als levend scaffold voor de schrijfronde.
- **Verhuisde feiten hebben nu een houder** (VAT → credits-and-billing; dedup → overview); de FAQ kan later veilig afslanken zonder ze te verliezen.
- Buiten scope (ongemoeid): artikelen niet gerestyled, geen content geschreven, geen afbeeldingen gemaakt, backend niet aangeraakt. Dubbele footer al eerder gefixt (adedcbd).
