# Density convention — docs vs. articles

**Bijgewerkt:** 2026-07-22 (ADR-073) · **Scope:** dezelfde design-tokens, twee dichtheden. Geen nieuwe designtaal; dit legt alleen de bestaande verschillen vast zodat ze consistent blijven.

Docs en artikelen delen de tokens (kleuren, fonts, radii) maar **niet de dichtheid**. Docs zijn een **naslagoppervlak** (scannen, opzoeken, tabellen); artikelen zijn een **leesoppervlak** (verhaal, ruimte, beeld). Zet ze niet gelijk.

| Dimensie | Docs (`/docs/*`, reference-doc) | Artikelen (`/articles/*`) |
|---|---|---|
| **Regellengte (measure)** | smaller — content in `max-w-3xl` binnen de DocsShell (`DocsShell.tsx`), naast een sidebar + rechter TOC. | breder — de artikel-templates lopen ruimer, gecentreerd, zonder sidebar. |
| **Regelafstand** | compact — `leading-relaxed` op alinea's, korte alinea's, veel lijsten/tabellen. | ruimer — grotere verticale ritmes tussen alinea's. |
| **Koppenschaal** | ingetogen — `AnchorHeading` h2 = `text-xl`, h3 = `text-base` (compact, scanbaar). | groter/expressiever in de artikel-templates. |
| **Beeld** | alleen functioneel via `DocsFigure` (toont wat tekst niet kan). | verhalend/illustratief toegestaan. |
| **Componenten** | `AnchorHeading`, `InPageTOC`, `DocsTable`, `DocsCodeBlock`, `DocsCallout`, `DocsFigure`, `SourcesBlock`, `RelatedTopicsList`. | eigen artikel-templates (`ToolPageTemplate` e.a.). |
| **Toon** | kaal, feitelijk, geen marketing-CTA's. | verhaal + use-case + conversie. |

**Vuistregel bij het schrijven:** een docs-pagina die begint te lezen als een artikel (lange intro's, brede alinea's, geen tabellen) staat op het verkeerde oppervlak — óf inkorten tot spec, óf het naar een artikel verplaatsen (zie [content/docs-page-contract.md](../../content/docs-page-contract.md) en de docs↔artikel-rolverdeling in [business/content-sitemap.md](../../business/content-sitemap.md)).

**Waar het "staat" (niet ad-hoc per pagina):** de docs-typografie zit in de gedeelde componenten — `DocsShell` (measure `max-w-3xl` + 3-koloms layout), `AnchorHeading` (koppenschaal), `DocsTable`/`DocsCodeBlock` (mobiele degradatie). Nieuwe docs-pagina's gebruiken die componenten en erven de dichtheid; ze zetten geen eigen bredere measure of grotere koppen. Artikelen worden **niet** aangepast.
