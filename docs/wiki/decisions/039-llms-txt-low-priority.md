# Beslissing 039: llms.txt — VERWIJDERD (was: low-priority)

**Status:** Geaccepteerd — **herzien 2026-07-23 (na externe verificatie): llms.txt volledig verwijderd**
**Oorspronkelijke datum:** 2026-05-03 · **Herziening:** 2026-07-23
**Gerelateerde code:** ~~`public/llms.txt`, `apps/marketing/public/llms.txt`, `apps/app/public/llms.txt`~~ (alle drie verwijderd, ADR-074-verificatie)

---

## Context

`llms.txt` bestond als statisch bestand (drie kopieën). Het is een *emerging standard* die AI-assistenten zou helpen een site te begrijpen. De oorspronkelijke beslissing (mei 2026) hield het "low-priority, niet uitbreiden, correct houden".

## Beslissing (herzien 2026-07-23)

**Verwijder llms.txt volledig** — alle drie de bestanden (`public/`, `apps/marketing/public/`, `apps/app/public/`) en elke verwijzing ernaar in robots.txt, sitemap, docs en de wiki.

## Rationale (externe verificatie, 2026-07-23)

- **Google steunt het niet.** John Mueller vergeleek llms.txt met de al lang dode **meta-keywords-tag**. Google's AI-gids van **15 juni 2026** stelt expliciet dat zulke bestanden **niet nodig** zijn voor Search, inclusief de generatieve functies.
- **~97% van de llms.txt-bestanden wordt nooit opgehaald** door LLM-crawlers — geen aantoonbaar effect.
- **De enige aantoonbare afnemers zijn coding-agents die API-docs lezen.** INDXR heeft **geen publieke REST API** → die use case bestaat hier niet.
- **De bestanden lógen over het product:** ze stonden op de oude 5-tier-prijzen (Basic/Pro bestaan niet meer) — actief onjuist t.o.v. `pricing.ts`.

Netto: nul bewezen upside, reële downside (verkeerde prijzen naar buiten). Verwijderen is strikt beter dan onderhouden.

## Consequenties

- Drie bestanden + referenties weg. robots.txt/sitemap noemden llms.txt al niet (niets aan te passen daar). Geen enkele marketing- of docs-pagina verwees ernaar.
- De eerdere "low-priority maar correct houden"-stance vervalt.
- Herzien wanneer: de spec ná deze datum aantoonbaar een AI-citation-lever wordt bij grote engines — onwaarschijnlijk gezien Google's positie.
