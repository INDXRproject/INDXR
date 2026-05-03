# Beslissing 034: App-subdomain (`app.indxr.ai`)

**Status:** Geaccepteerd (implementatie: Werksessie C)  
**Datum:** 2026-05-03  
**Gerelateerde code:** `next.config.ts`, Vercel DNS-configuratie

---

## Context

De geauthenticeerde app-interface (dashboard, transcriptie, library, admin) staat op `indxr.ai/dashboard/*` en `indxr.ai/admin/*`. Dit vermengt de marketing-identity met de product-interface en maakt robots.txt-configuratie suboptimaal.

---

## Beslissing

Dashboard- en admin-routes verhuizen naar `app.indxr.ai`. De marketing-site (`indxr.ai`) behoudt alle publieke content. Auth flows blijven op `indxr.ai` (zie ADR-036).

---

## Rationale

- Heldere visuele en URL-scheiding: "de site" vs. "de app"
- `indxr.ai` robots.txt wordt eenvoudiger: geen `/dashboard/` disallow meer nodig
- Pattern gevolgd door Linear, Vercel, Notion

Overwogen alternatieven: subpath behouden (eenvoudiger, geen DNS, maar geen visuele scheiding), eigen domein `app.indxr.io` (onnodige complexiteit).

---

## Consequenties

- Vercel-configuratie: twee deployments of één met subdomain-routing
- Supabase auth cookies worden gezet op root-domein (`.indxr.ai`) voor sharing over subdomains
- Bestaande links naar `indxr.ai/dashboard/*` worden 301-geredirect
- Herzien wanneer: Supabase-auth cookie sharing problemen geeft, of DNS/Vercel-setup significant complexer is dan verwacht
