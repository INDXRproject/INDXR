# ADR-S003: Geen audience hubs (pre-launch)

**Date:** 2026-05-03  
**Status:** Accepted

## Context

Veel SaaS-sites hebben aparte secties per audience-segment: `/for/researchers`, `/for/educators`, `/for/podcasters`. Dit creëert meer indexeerbare content en personaliseert de boodschap per doelgroep.

## Decision

Geen audience-hub secties bouwen voor launch. De bestaande tool-pagina's bereiken al specifieke use-cases zonder expliciete audience-labeling. Audiencegerichte copy komt in de generieke marketing-pagina's terecht.

## Alternatives considered

- **Audience hubs direct bouwen:** meer content, maar versnippert schrijfinspanning en vereist data over welke segmenten prioriteit verdienen
- **Audience landing pages per campagne:** mogelijk post-launch via `/lp/*` routes, niet als permanente sitemap-structuur

## Consequences

- Minder content op launch, maar content die geschreven is is volledig en van kwaliteit
- PostHog-data na launch bepaalt welke segmenten prioriteit krijgen

## Trigger to reconsider

Als PostHog-data aantoont dat één specifiek segment disproportioneel converteert, én dedicated landing pages voor dat segment aantoonbaar beter zouden presteren.
