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
Tabellen, lijsten, parameter-blocks, scanbare H2-H3 hiërarchie. Geen marketing-CTAs.

### Sectie 7 — EdgeCasesCallout (optioneel)
Subtiel afgebakend block voor grensgevallen, "what happens if…" scenarios, uitzonderingen. Weglaten als er geen zinvolle edge cases zijn.

### Sectie 8 — RelatedTopicsList
"See also" — 3-5 links naar verwante reference docs.

### Sectie 9 — Footer

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
- [ ] Claude Design rondje
- [ ] Content writing (DefinitionLeadOpening per pagina)
- [ ] Mobile pass
