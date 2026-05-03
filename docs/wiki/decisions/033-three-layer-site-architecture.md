# Beslissing 033: Drie-lagen site-architectuur

**Status:** Geaccepteerd  
**Datum:** 2026-05-03  
**Gerelateerde code:** `src/app/sitemap.ts`, `public/robots.txt`, `next.config.ts`

---

## Context

De site had een hybride structuur: marketing-pagina's, SEO-content, docs, dashboard en admin stonden allemaal onder `indxr.ai/*` zonder heldere scheiding. Dit maakte URL-strategie, robots.txt-configuratie, en toekomstige subdomain-beslissingen complex.

---

## Beslissing

De site wordt ingedeeld in drie lagen met duidelijke URL-grenzen:

- **Laag 1** — `indxr.ai/` — marketing, vrije tool, auth flows (publiek)
- **Laag 2** — `indxr.ai/docs/*` en `indxr.ai/articles/*` — content (publiek)
- **Laag 3** — `app.indxr.ai/*` — geauthenticeerde app, dashboard, admin (Werksessie C)

---

## Rationale

- Heldere mentale modellen voor gebruikers ("de site" vs. "de app")
- SEO: marketing domain indexeerbaar, app-subdomain volledig blokkeerbaar voor crawlers
- Auth flows blijven op marketing domain (Linear/Vercel pattern) — zie ADR-036
- Twee content-types (`/docs/*` voor gebruikersdocumentatie, `/articles/*` voor SEO) hebben eigen URL-hiërarchie en groei-traject

Overwogen alternatieven: alles op één domain (eenvoudiger, maar geen heldere grens), twee lagen zonder content-splitsing (mist onderscheid docs vs. SEO-content).

---

## Consequenties

- `/dashboard/*` en `/admin/*` migreren naar `app.indxr.ai` (Werksessie C — zie ADR-034)
- SEO-content verhuist naar `/articles/[slug]` (Werksessie B — zie ADR-035)
- Auth flows blijven op `indxr.ai/login` etc. (zie ADR-036)
- Subdomain vereist DNS-configuratie en Vercel routing aanpassingen
- Herzien wanneer: technische kosten van subdomain-routing structureel hoger zijn dan verwacht, of gebruikersonderzoek toont verwarring aan
