# Reference doc page-structure (template)

**Universele template voor alle reference docs in /docs.**
**Bijgewerkt:** 2026-05-04 (Batch 1, page-type 4)
**Status:** Strategie vastgesteld — skeleton geïmplementeerd

---

## Doel

Information-oriented. Autoritair antwoord op "what is X", "how does X work", "what are the limits of X". Hoogste AI-citation page-type — definitie-led opening is de primaire AI-snippet-slot.

Van toepassing op: alle `/docs/how-indxr-works/*`, `/docs/account-and-data/*`, `/docs/help/faq`.

---

## Sectie-volgorde

### Sectie 1 — Header
Zelfde als marketing.

### Sectie 2 — DocsShell met sidebar
Alle reference docs renderen via DocsShell. Sidebar via docs-config.ts.

### Sectie 3 — DocsBreadcrumb
3-level breadcrumb: Docs → Categorie → Page. Klikbare links. Genereert ook BreadcrumbList JSON-LD.

### Sectie 4 — H1
Paginatitel. Authoritative, no framing ("YouTube Transcript Export Formats" niet "A guide to...").

### Sectie 5 — DefinitionLeadOpening
40–60 woorden. De AI-citation slot. Schrijf als een Wikipedia-lede: onderwerp, definitie, context. Geen marketing.

### Sectie 6 — Body
Tabellen, lijsten, parameter-blocks, scanbare H2-H3 hiërarchie (elke H2/H3 via `AnchorHeading`). Geen marketing-CTAs.
- **Tabellen:** altijd via `DocsTable`. Mobiele degradatie (project-breed, één aanpak): **horizontaal scrollen met zichtbare affordance** (`min-w` forceert scroll, mobiele hint-regel, dunne scrollbar) — niet stapelen naar definitielijsten.
- **Codeblokken:** altijd via `DocsCodeBlock` — `overflow-x-auto` met zichtbare scrollbar, nooit overflow buiten de viewport.
- **Figuren:** via `DocsFigure`, alleen wanneer een screenshot iets toont dat tekst niet kan (gerenderde output, UI-state). **Verplicht** bijschrift + alt; het reserveert ruimte via een vaste aspect-ratio zodat de layout niet verspringt als de afbeelding later landt. Bijschrift zegt wát de figuur aantoont, niet wat het is. Nooit decoratief.

### Sectie 7 — Callouts (`DocsCallout`, optioneel)
Exact **drie** varianten: `costs-credits` · `careful` · `requires-account`. **Regel:** een callout bestaat alleen als het missen ervan de lezer **geld, data of tijd** kost — anders is het een alinea. **Max één per sectie.** (Vervangt de oude losse EdgeCasesCallout-conventie.)

### Sectie 8 — SourcesBlock (`SourcesBlock`)
Vóór RelatedTopicsList. Per bron: uitgever + wat het onderbouwt + link. **Elke externe feitelijke claim** (taal-tellingen, WER-tiers, subtitle-standaarden, vector-DB-compat) heeft hier een bron. **SPEC-pagina's** voegen een `verifiedAgainst`-coderegel toe (het bestand waaruit de spec is gedestilleerd). Rendert niets als er geen bronnen zijn.

### Sectie 9 — RelatedTopicsList
"See also" — 3-5 links naar verwante reference docs + het artikel dat het verhaal draagt (docs↔artikel-rolverdeling).

### Sectie 10 — Footer
Geleverd door de **root-layout** (`apps/marketing/src/app/layout.tsx`) — pagina's renderen zélf géén `<Footer/>` (dubbele-footer-fix, commit adedcbd).

---

## Componentenlijst

| Component | Pad | Doel | Type |
|-----------|-----|------|------|
| DocsBreadcrumb | `src/components/docs/DocsBreadcrumb.tsx` | 3-level breadcrumb + BreadcrumbList JSON-LD | Server |
| DefinitionLeadOpening | `src/components/docs/DefinitionLeadOpening.tsx` | Styling-wrapper voor definitie-opening | Server |
| ReferenceTable | `src/components/docs/ReferenceTable.tsx` | Tabel met clean styling | Server |
| EdgeCasesCallout | `src/components/docs/EdgeCasesCallout.tsx` | Edge cases block | Server |
| RelatedTopicsList | `src/components/docs/RelatedTopicsList.tsx` | "See also" link cluster | Server |
| AnchorHeading | `src/components/docs/AnchorHeading.tsx` | H2/H3 met click-to-copy anchor | Client |
| InPageTOC | `src/components/docs/InPageTOC.tsx` | Sticky scroll-spy TOC (>300 woorden) | Client |
| DocsTable | `src/components/docs/DocsTable.tsx` | Tabel + mobiele horizontale-scroll-degradatie | Server |
| DocsCodeBlock | `src/components/docs/DocsCodeBlock.tsx` | Codeblok, horizontaal scrollbaar | Server |
| DocsCallout | `src/components/docs/DocsCallout.tsx` | 3 varianten: costs-credits / careful / requires-account | Server |
| DocsFigure | `src/components/docs/DocsFigure.tsx` | Figuur-slot, verplicht bijschrift+alt, aspect-ratio-placeholder | Server |
| SourcesBlock | `src/components/docs/SourcesBlock.tsx` | Bronnen (extern + verified-against), boven RelatedTopicsList | Server |

**Dichtheid:** docs ≠ artikelen — zie [docs-vs-articles-density.md](docs-vs-articles-density.md). `ReferenceTable` uit de oude lijst is vervangen door `DocsTable`.

---

## Schema

Per pagina: TechArticle + BreadcrumbList JSON-LD. Optioneel Dataset voor data-heavy pages.

---

## Beslissingen

### Definition-led opening als content-strategie
AI-zoekmachines citeren vaker definitie-led passages. Dit is geen marketing-keuze maar een SEO/AI-citation keuze.

### Geen FAQ binnen reference pages
FAQ leeft als eigen `/docs/help/faq` pagina. Reference pages beantwoorden één concept grondig — geen Q&A format.

### Geen marketing CTAs
Reference docs zijn informationeel. CTAs zorgen voor lage trust bij technische lezers.

### Anchor links op alle H2/H3
Elke heading is direct linkbaar — essentieel voor AI-citation en support-tickets.

---

## Mobile

Pass later.

---

## Status

- [x] Wiki documentatie (deze file)
- [x] Skeleton implementatie
- [x] **InPageTOC gebouwd** (2026-07-22, ADR-072) — sticky scroll-spy rechterkolom, gevoed door de AnchorHeadings (`#docs-content h2/h3[id]`), zichtbaar op `xl+`, verborgen daaronder; verbergt zichzelf bij <2 headings.
- [x] **Mobile pass gedaan** (2026-07-22, ADR-072) — docs-sidebar bereikbaar op mobiel via `DocsMobileNav` (Sheet-drawer, menu-icoon) in de mobiele nav-rij; header-offset (`pt-16`) klopt op smalle schermen.
- [ ] Claude Design rondje
- [ ] Content writing (DefinitionLeadOpening per pagina)
