# ADR-S007: llms.txt — low-priority, niet uitbreiden

**Date:** 2026-05-03  
**Status:** Accepted

## Context

`public/llms.txt` bestaat als statisch bestand. De vraag is hoeveel effort we investeren in dit bestand en of het een bewezen ROI heeft voor AI-citaties.

## Decision

llms.txt blijft aanwezig maar is low-priority. We breiden het niet uit, bouwen geen automatische generator, en optimaliseren de content er niet voor. Onderhoud beperkt zich tot correctheidscheck (prijzen, routes) bij grote wijzigingen.

## Alternatives considered

- **Volledig uitbreiden:** gedetailleerde product-documentatie in llms.txt, per-pagina llms.txt, automatisch genereren vanuit content
- **Verwijderen:** verlies van eventuele AI-citatie voordelen

## Consequences

- Geen engineering effort aan llms.txt
- Bestand blijft correct (prijzen/routes gesynced 2026-05-03)
- Als de standard evolueert en bewezen ROI heeft, kan dit worden herzien

## Trigger to reconsider

Als er bewijs is dat llms.txt direct bijdraagt aan AI-citaties in ChatGPT Search, Perplexity, of vergelijkbare tools voor SERP-traffic, of als de [llms.txt spec](https://llmstxt.org/) een significante update krijgt.
