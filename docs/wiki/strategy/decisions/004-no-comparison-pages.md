# ADR-S004: Geen comparison pages (pre-launch)

**Date:** 2026-05-03  
**Status:** Accepted

## Context

Er zijn 5 `/alternative/*` pagina's gebouwd (DownSub, NoteGPT, TurboScribe, Tactiq, HappyScribe). Ze trekken branded-search traffic maar vereisen actief onderhoud omdat concurrenten hun features en prijzen wijzigen.

## Decision

De 5 `/alternative/*` pagina's worden verwijderd. Er worden geen nieuwe comparison pages gebouwd voor launch.

## Alternatives considered

- **Comparison pages behouden:** bestaand werk niet weggooien, maar onderhoudslast is structureel
- **Converteren naar `/articles/[slug]`:** mogelijk, maar de intentie ("ik zoek alternatief X") converteert slechter dan directe intent ("ik wil Y transcripteren")

## Consequences

- 5 pagina's verdwijnen uit de sitemap en worden 404 (of geredirect naar `/`)
- Branded-search traffic voor concurrent-namen gaat verloren
- Minder onderhoudslast na launch

## Trigger to reconsider

Als INDXR.AI na launch aantoonbaar verliest van specifieke concurrenten in zoekresultaten voor branded queries, én comparison pages bewezen converteren voor die zoektermen.
