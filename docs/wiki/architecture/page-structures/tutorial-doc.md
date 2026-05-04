# Tutorial doc page-structure (template)

**Universele template voor tutorials en how-to's in /docs.**
**Bijgewerkt:** 2026-05-04 (Batch 1, page-type 4)
**Status:** Strategie vastgesteld — skeleton geïmplementeerd

---

## Doel

Action-oriented. Gebruiker bereikt een concreet doel aan het einde. "Leren door te doen" — niet lezen over iets, maar iets doen.

Van toepassing op: `/docs/getting-started`, toekomstige `/docs/help/how-to/[slug]`.

---

## Sectie-volgorde

### Sectie 1 — Header
Zelfde als marketing.

### Sectie 2 — DocsShell met sidebar

### Sectie 3 — DocsBreadcrumb
Zelfde component als reference docs. BreadcrumbList JSON-LD.

### Sectie 4 — H1
Actiegericht: "Get your first transcript in 3 minutes" niet "Welcome to INDXR".

### Sectie 5 — TutorialOpening
Één paragraaf: narratief, wat bereikt de gebruiker, hoelang duurt het. Concreet.

### Sectie 6 — PrerequisitesBlock
"Before you start" — expliciet lijst. Geen vage aannames.

### Sectie 7 — TutorialStep array
Genummerde stappen. Per stap:
- Heading (actief: "Paste your YouTube URL")
- Action description
- Screenshot slot (placeholder voor nu)
- Verification line ("You should see…")

### Sectie 8 — WhatJustHappened
Kort explanation block, max één paragraaf. "Here's what INDXR did…"

### Sectie 9 — NextStepsBlock
3-5 action-oriented links naar vervolgcontent.

### Sectie 10 — Footer

---

## Componentenlijst

| Component | Pad | Doel |
|-----------|-----|------|
| DocsBreadcrumb | `src/components/docs/DocsBreadcrumb.tsx` | Gedeeld met reference |
| TutorialOpening | `src/components/docs/TutorialOpening.tsx` | Narratief opening |
| PrerequisitesBlock | `src/components/docs/PrerequisitesBlock.tsx` | "Before you start" |
| TutorialStep | `src/components/docs/TutorialStep.tsx` | Genummerde stap |
| WhatJustHappened | `src/components/docs/WhatJustHappened.tsx` | Explanation block |
| NextStepsBlock | `src/components/docs/NextStepsBlock.tsx` | Vervolgcontent links |
| AnchorHeading | `src/components/docs/AnchorHeading.tsx` | Gedeeld met reference |

---

## Schema

HowTo JSON-LD met step-array + BreadcrumbList.

---

## Beslissingen

### Tutorial layout vooruitgenomen voor /docs/getting-started
`/docs/getting-started` is al live als scaffold. Refactor naar Tutorial layout in Batch 1 / page-type 4.

### Verification lines per stap
"You should see…" per stap voorkomt dat gebruikers doorgaan zonder te weten of een stap geslaagd is.

### Geen marketing CTAs in tutorial
Gebruiker is al engaged — CTA's onderbreken de flow.

### "What just happened" max één paragraaf
Tutorials zijn niet de plek voor diepgaande uitleg. Verwijzingen naar reference docs voor wie meer wil weten.

---

## Mobile

Pass later.

---

## Status

- [x] Wiki documentatie (deze file)
- [x] Skeleton implementatie (/docs/getting-started)
- [ ] Claude Design rondje
- [ ] Content writing (stap-voor-stap instructies + screenshots)
- [ ] Mobile pass
