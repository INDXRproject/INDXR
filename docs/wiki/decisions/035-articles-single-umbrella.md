# Beslissing 035: Articles als één umbrella (`/articles/*`)

**Status:** Geaccepteerd (implementatie: Werksessie B)  
**Datum:** 2026-05-03  
**Gerelateerde code:** `src/app/sitemap.ts`, `next.config.ts`, `src/app/`

---

## Context

SEO-content stond op twee plaatsen: 18 top-level routes (`/youtube-transcript-not-available`, etc.) en 3 blog-routes (`/blog/*`). Er was geen index-pagina voor `/blog` (404). De routes zijn URL-gewijs ongeorganiseerd maar horen thematisch bij elkaar.

---

## Beslissing

Alle SEO-content (tool-pagina's, troubleshooting, blog-artikelen) verhuist naar `/articles/[slug]` met een index op `/articles`. Geen aparte `/blog`, geen aparte `/guides`, geen audience-hub splitsing.

---

## Rationale

- Één URL-hiërarchie is makkelijker te onderhouden en door crawlers te indexeren
- `ArticleTemplate`, `ToolPageTemplate`, en `TutorialTemplate` produceren hetzelfde type content — ze horen op één locatie
- `/blog` en top-level routes zijn functioneel identiek qua template en audience
- Audience-hubs (zie ADR-033) zijn post-launch

Overwogen alternatieven: blog apart houden (aparte identiteit, maar verwarrend), alles onder `/docs/*` (te breed — docs en SEO-content hebben verschillende doelgroepen).

---

## Consequenties

- 18 top-level routes worden 301-geredirect naar `/articles/[slug]`
- `/blog/*` routes worden geredirect naar `/articles/*`
- Alle geïndexeerde URLs blijven werken via redirects
- `sitemap.ts` en `docsConfig` moeten worden bijgewerkt
- `/articles` hub-pagina moet worden gebouwd
- Herzien wanneer: 50+ articles in meerdere categorieën waarvoor een hiërarchie noodzakelijk is
