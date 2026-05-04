# Docs hub page-structure (`/docs`)

**Bron van waarheid voor structuur, componenten, en beslissingen voor /docs hub.**
**Bijgewerkt:** 2026-05-04 (Batch 1, page-type 4)
**Status:** Strategie vastgesteld — skeleton geïmplementeerd

---

## Doel

Navigatie en discovery. Visitor landt op /docs en oriënteert zich snel op beschikbare documentatie. Geen tool-functionaliteit — puur navigatie.

---

## Sectie-volgorde

### Sectie 1 — Header

Zelfde als marketing. Geen wijziging.

### Sectie 2 — DocsHubHero

Compact H1 + één zin subhead. Geen uitgebreide marketing-tekst.

### Sectie 3 — FeaturedDocsGrid

4 prominente cards (anticipatory selection op basis van verwachte user-need pre-launch):
- Quickstart (`/docs/getting-started`)
- How INDXR works — Overview (`/docs/how-indxr-works/overview`)
- How credits work (`/docs/how-indxr-works/credits`)
- Export formats (`/docs/how-indxr-works/export-formats`)

### Sectie 4 — DocsCategorySection (4×)

Één sectie per categorie uit de sidebar:
1. Getting started
2. How INDXR works
3. Account & data
4. Help

Elke sectie: categorie-titel + één intro-zin + lijst van links (uit docs-config.ts).

### Sectie 5 — Footer

Bestaande Footer-component.

---

## Componentenlijst

| Component | Pad | Doel |
|-----------|-----|------|
| DocsHubHero | `src/components/docs/DocsHubHero.tsx` | H1 + subhead |
| FeaturedDocsGrid | `src/components/docs/FeaturedDocsGrid.tsx` | 4 featured cards |
| DocsCategorySection | `src/components/docs/DocsCategorySection.tsx` | Categorie + page-list |

---

## Schema

CollectionPage JSON-LD op `/docs`.

---

## Beslissingen

### Geen search box
MVP — minder dan 30 docs, niet noodzakelijk vóór launch. Zoekfunctionaliteit deferred.

### Featured = anticipated user-need
Pre-launch geen analytics. Featured pages gebaseerd op verwachte onboarding-flow.

### Geen tags of filters
Te vroeg — structuur eerst valideren met echte gebruikers.

---

## Mobile

Pass later.

---

## Status

- [x] Wiki documentatie (deze file)
- [x] Skeleton implementatie
- [ ] Claude Design rondje
- [ ] Content writing
- [ ] Mobile pass
