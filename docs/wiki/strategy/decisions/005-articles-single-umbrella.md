# ADR-S005: Articles als één umbrella (`/articles/*`)

**Date:** 2026-05-03  
**Status:** Accepted (implementatie: Werksessie B)

## Context

De huidige SEO-content staat op twee plaatsen: 18 top-level routes (`/youtube-transcript-not-available`, etc.) en 3 blog-routes (`/blog/*`). Er is geen index-pagina voor blog (`/blog` geeft 404). De top-level routes zijn ongeorganiseerd — ze horen thematisch bij elkaar maar staan verspreid over de URL-hiërarchie.

## Decision

Alle SEO-content (tool-pagina's, troubleshooting, blog-artikelen, tutorials) verhuist naar `/articles/[slug]` met een index op `/articles`. Geen aparte `/blog`, `/guides`, of audience-hubs.

## Alternatives considered

- **Blog apart houden (`/blog/*`):** aparte identiteit voor editorial content vs. tool-content, maar creëert verwarring over welk type content waar staat
- **Alles onder `/docs/*`:** maakt docs te breed — gebruikersdocumentatie en SEO-content hebben verschillende doelgroepen en update-frequenties
- **Audience-hubs (`/for/researchers/articles/*`):** te complex voor pre-launch volume

## Consequences

- Huidige top-level routes worden 301-geredirect naar `/articles/[slug]`
- `/blog/*` routes worden geredirect naar `/articles/*`
- Alle geïndexeerde URLs blijven werken via redirects
- `/articles` hub-pagina moet worden gebouwd
- `sitemap.ts` moet worden bijgewerkt

## Trigger to reconsider

Als de hoeveelheid articles zo groot wordt dat een hiërachische structuur noodzakelijk is voor navigatie (bijv. 50+ articles in meerdere categorieën).
