# ADR-S001: Drie-lagen site-architectuur

**Date:** 2026-05-03  
**Status:** Accepted

## Context

De huidige site heeft een hybride structuur: marketing-pagina's, SEO-content, docs, dashboard en admin staan allemaal onder `indxr.ai/*`. Er is geen heldere scheiding tussen wat publiek is en wat app-functionaliteit is. Dit maakt URL-strategie, robots.txt-configuratie, en toekomstige subdomain-beslissingen complex.

## Decision

De site wordt ingedeeld in drie lagen met duidelijke URL-grenzen:
- **Laag 1:** `indxr.ai/` — marketing, vrije tool, auth flows
- **Laag 2:** `indxr.ai/docs/*` en `indxr.ai/articles/*` — content
- **Laag 3:** `app.indxr.ai/*` — geauthenticeerde app (dashboard, admin)

## Alternatives considered

- **Alles op één domain:** eenvoudiger technisch, maar geen heldere grens voor gebruikers en crawlers
- **Twee lagen (marketing + app):** mist de heldere scheiding tussen productdocumentatie en SEO-content

## Consequences

- `/dashboard/*` en `/admin/*` migreren naar `app.indxr.ai` (Werksessie C)
- SEO-content verhuist naar `/articles/[slug]` (Werksessie B)
- Auth flows blijven op `indxr.ai/` (zie ADR-S006)
- Subdomain vereist DNS-configuratie en Vercel/Railway routing aanpassingen

## Trigger to reconsider

Als de technische kosten van subdomain-routing structureel hoger zijn dan verwacht, of als gebruikersonderzoek aantoont dat de scheiding verwarring oplevert.
