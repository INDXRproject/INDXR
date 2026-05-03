# ADR-S002: App-subdomain (`app.indxr.ai`)

**Date:** 2026-05-03  
**Status:** Accepted (implementatie: Werksessie C)

## Context

De geauthenticeerde app-interface (dashboard, transcriptie, library, admin) staat op `indxr.ai/dashboard/*` en `indxr.ai/admin/*`. Dit maakt het moeilijk om via robots.txt een heldere grens te trekken, en het vermengt de marketing-identity met de product-interface.

## Decision

De dashboard- en admin-routes verhuizen naar `app.indxr.ai`. De marketing-site (`indxr.ai`) behoudt alle publieke content. Auth flows blijven op `indxr.ai` (zie ADR-S006).

## Alternatives considered

- **Subpath behouden (`indxr.ai/dashboard`):** eenvoudiger, geen DNS-configuratie, maar geen heldere visuele/URL-scheiding
- **Eigen domein (`app.indxr.io`):** onnodige complexiteit, verwarrend voor gebruikers

## Consequences

- Vercel-configuratie: twee deployments (of één met subdomain routing)
- Auth: Supabase cookies moeten gedeeld worden via root-domein cookie scope
- Existing links naar `indxr.ai/dashboard/*` moeten worden geredirect
- robots.txt op `indxr.ai` kan simpeler (geen `/dashboard/` disallow meer nodig)

## Trigger to reconsider

Als Supabase-auth cookie sharing over subdomains problemen geeft, of als de DNS/Vercel setup significant complexer is dan verwacht.
