# Beslissing 037: Geen comparison pages (pre-launch)

**Status:** Geaccepteerd  
**Datum:** 2026-05-03  
**Gerelateerde code:** `src/app/alternative/` (te verwijderen in Werksessie B)

---

## Context

Er zijn 5 `/alternative/*` pagina's gebouwd (DownSub, NoteGPT, TurboScribe, Tactiq, HappyScribe). Ze trekken branded-search traffic maar vereisen actief onderhoud omdat concurrenten hun features en prijzen wijzigen. Er is geen `/alternative` index-pagina, waardoor directe navigatie naar `/alternative` een 404 geeft.

---

## Beslissing

De 5 `/alternative/*` pagina's worden verwijderd in Werksessie B. Geen nieuwe comparison pages voor launch.

---

## Rationale

- Comparison pages vereisen actief onderhoud — concurrenten wijzigen features en prijzen
- Ze trekken traffic van mensen die een ander product zoeken — hoge bounce, lage conversie
- Pre-launch prioriteit: eigen product zo sterk mogelijk positioneren
- Technische schuld: geen index-pagina, 404 op `/alternative`

Overwogen alternatieven: comparison pages converteren naar `/articles/[slug]` (mogelijke 301-redirect, maar de branded-search intentie converteert zwak).

---

## Consequenties

- 5 pagina's verdwijnen — 301-redirect naar `/` of `/youtube-transcript-generator` (Werksessie B)
- Branded-search traffic voor concurrent-namen gaat verloren
- Minder onderhoudslast na launch
- Herzien wanneer: PostHog-data na launch toont aantoonbaar verlies op branded queries voor specifieke concurrenten, én comparison pages bewezen converteren voor die zoektermen
